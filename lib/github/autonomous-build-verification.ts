import "server-only";

const VERCEL_API_BASE = "https://api.vercel.com";
const DEFAULT_POLL_INTERVAL_MS = 4000;
const DEFAULT_TIMEOUT_MS = 180000;
const DEFAULT_LOG_LIMIT = 160;

export type VercelBuildVerificationStatus =
  | "PASS"
  | "FAIL"
  | "NOT_CONFIGURED"
  | "TIMEOUT";

export interface VercelBuildVerificationResult {
  status: VercelBuildVerificationStatus;
  configured: boolean;
  deploymentId?: string;
  deploymentUrl?: string;
  commitSha?: string;
  readyState?: string;
  errorCode?: string;
  errorMessage?: string;
  buildLogs?: string;
  reason: string;
}

type VercelDeployment = {
  uid?: string;
  id?: string;
  url?: string;
  readyState?: string;
  state?: string;
  createdAt?: number;
  gitSource?: {
    sha?: string;
    ref?: string;
  };
  meta?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
};

function getConfig(): { token: string; projectId: string; teamId?: string } | null {
  const token = process.env.VERCEL_AUTONOMOUS_BUILD_TOKEN?.trim() || process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim() || process.env.VERCEL_ORG_ID?.trim();

  if (!token || !projectId) return null;
  return { token, projectId, teamId };
}

function withTeamId(url: URL, teamId?: string): URL {
  if (teamId) url.searchParams.set("teamId", teamId);
  return url;
}

async function vercelFetch<T>(
  path: string,
  config: { token: string; teamId?: string },
  options?: RequestInit,
): Promise<T> {
  const url = new URL(`${VERCEL_API_BASE}${path}`);
  withTeamId(url, config.teamId);

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/json",
      ...(options?.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = await response.text();
  let parsed: unknown = null;
  try {
    parsed = body ? JSON.parse(body) : null;
  } catch {
    parsed = body;
  }

  if (!response.ok) {
    const message =
      typeof parsed === "object" && parsed !== null && "error" in parsed
        ? JSON.stringify((parsed as { error: unknown }).error)
        : body.slice(0, 1200);
    throw new Error(`VERCEL_API_${response.status}: ${message}`);
  }

  return parsed as T;
}

function deploymentMatchesCommit(
  deployment: VercelDeployment,
  commitSha: string,
): boolean {
  const target =
    commitSha.trim().toLowerCase();

  if (!target) {
    return false;
  }

  const candidates = [
    deployment.gitSource?.sha,
    typeof deployment.meta?.githubCommitSha === "string"
      ? deployment.meta.githubCommitSha
      : undefined,
    typeof deployment.meta?.gitCommitSha === "string"
      ? deployment.meta.gitCommitSha
      : undefined,
  ]
    .map((value) =>
      typeof value === "string"
        ? value.trim().toLowerCase()
        : "",
    )
    .filter(Boolean);

  return candidates.some(
    (value) => value === target,
  );
}
const target = commitSha.toLowerCase();
  const candidates = [
    deployment.gitSource?.sha,
    typeof deployment.meta?.githubCommitSha === "string" ? deployment.meta.githubCommitSha : undefined,
    typeof deployment.meta?.gitCommitSha === "string" ? deployment.meta.gitCommitSha : undefined,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return candidates.some((value) => value === target || target.startsWith(value) || value.startsWith(target));
}

function deploymentId(deployment: VercelDeployment): string | undefined {
  return deployment.uid || deployment.id;
}

async function listDeployments(
  config: { token: string; projectId: string; teamId?: string },
): Promise<VercelDeployment[]> {
  const url = new URL(`${VERCEL_API_BASE}/v6/deployments`);
  url.searchParams.set("projectId", config.projectId);
  url.searchParams.set("limit", "20");
  withTeamId(url, config.teamId);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`VERCEL_DEPLOYMENT_LIST_${response.status}: ${body.slice(0, 1200)}`);
  }

  const parsed = JSON.parse(body) as { deployments?: VercelDeployment[] };
  return Array.isArray(parsed.deployments) ? parsed.deployments : [];
}

async function getDeployment(
  config: { token: string; teamId?: string },
  id: string,
): Promise<VercelDeployment> {
  return vercelFetch<VercelDeployment>(`/v13/deployments/${encodeURIComponent(id)}`, config);
}

async function getBuildLogs(
  config: { token: string; teamId?: string },
  id: string,
): Promise<string> {
  const url = new URL(`${VERCEL_API_BASE}/v3/deployments/${encodeURIComponent(id)}/events`);
  url.searchParams.set("direction", "backward");
  url.searchParams.set("limit", String(DEFAULT_LOG_LIMIT));
  withTeamId(url, config.teamId);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/json, application/stream+json, text/plain",
    },
    cache: "no-store",
  });

  const body = await response.text();
  if (!response.ok) return `Vercel build log request failed: HTTP ${response.status}\n${body.slice(0, 4000)}`;

  const lines = body.split(/\r?\n/).filter(Boolean);
  const normalized: string[] = [];
  for (const line of lines) {
    try {
      const event = JSON.parse(line) as Record<string, unknown>;
      const text =
        typeof event.text === "string"
          ? event.text
          : typeof event.payload === "string"
            ? event.payload
            : typeof event.message === "string"
              ? event.message
              : JSON.stringify(event);
      normalized.push(text);
    } catch {
      normalized.push(line);
    }
  }

  return normalized.slice(-DEFAULT_LOG_LIMIT).join("\n").slice(-30000);
}

export async function verifyVercelBuildForCommit(input: {
  commitSha: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}): Promise<VercelBuildVerificationResult> {
  const config = getConfig();
  if (!config) {
    return {
      status: "NOT_CONFIGURED",
      configured: false,
      commitSha: input.commitSha,
      reason: "Vercel autonomous build verification requires VERCEL_PROJECT_ID and VERCEL_AUTONOMOUS_BUILD_TOKEN or VERCEL_TOKEN.",
    };
  }

  const timeoutMs = Math.max(30000, input.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const pollIntervalMs = Math.max(1500, input.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS);
  const startedAt = Date.now();
  let deployment: VercelDeployment | undefined;

  try {
    while (Date.now() - startedAt < timeoutMs) {
      const deployments = await listDeployments(config);
      deployment = deployments.find((item) => deploymentMatchesCommit(item, input.commitSha));

      if (deployment) {
        const id = deploymentId(deployment);
        if (!id) throw new Error("VERCEL_DEPLOYMENT_ID_MISSING");

        const current = await getDeployment(config, id);
        const state = current.readyState || current.state || "UNKNOWN";

        if (state === "READY") {
          return {
            status: "PASS",
            configured: true,
            deploymentId: id,
            deploymentUrl: current.url ? `https://${current.url}` : undefined,
            commitSha: input.commitSha,
            readyState: state,
            reason: "Vercel deployment reached READY for the committed SHA.",
          };
        }

        if (["ERROR", "CANCELED"].includes(state)) {
          const buildLogs = await getBuildLogs(config, id);
          return {
            status: "FAIL",
            configured: true,
            deploymentId: id,
            deploymentUrl: current.url ? `https://${current.url}` : undefined,
            commitSha: input.commitSha,
            readyState: state,
            errorCode: current.errorCode,
            errorMessage: current.errorMessage,
            buildLogs,
            reason: `Vercel deployment ended in ${state}.`,
          };
        }
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    const id = deployment ? deploymentId(deployment) : undefined;
    const buildLogs = id ? await getBuildLogs(config, id) : "";
    return {
      status: "TIMEOUT",
      configured: true,
      deploymentId: id,
      deploymentUrl: deployment?.url ? `https://${deployment.url}` : undefined,
      commitSha: input.commitSha,
      readyState: deployment?.readyState || deployment?.state,
      buildLogs,
      reason: "Timed out waiting for the Vercel deployment for the committed SHA.",
    };
  } catch (error) {
    return {
      status: "FAIL",
      configured: true,
      deploymentId: deployment ? deploymentId(deployment) : undefined,
      deploymentUrl: deployment?.url ? `https://${deployment.url}` : undefined,
      commitSha: input.commitSha,
      readyState: deployment?.readyState || deployment?.state,
      errorMessage: error instanceof Error ? error.message : "Vercel verification failed.",
      reason: "Vercel build verification request failed.",
    };
  }
}
