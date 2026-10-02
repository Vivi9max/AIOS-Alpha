import "server-only";

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const DEFAULT_TIMEOUT_MS = 180000;
const DEFAULT_POLL_INTERVAL_MS = 4000;
const DEFAULT_WORKFLOW_NAME = "AIOS Alpha CI";

export type AutonomousCIVerificationStatus =
  | "PASS"
  | "FAIL"
  | "TIMEOUT"
  | "NOT_CONFIGURED";

export interface AutonomousCIVerificationResult {
  status: AutonomousCIVerificationStatus;
  configured: boolean;
  repository: string;
  commitSha: string;
  branch?: string;
  workflowName: string;
  runId?: number;
  runUrl?: string;
  conclusion?: string | null;
  completedAt?: string;
  reason: string;
}

type WorkflowRun = {
  id?: number;
  name?: string;
  display_title?: string;
  status?: string;
  conclusion?: string | null;
  html_url?: string;
  head_sha?: string;
  head_branch?: string;
  event?: string;
  created_at?: string;
  updated_at?: string;
};

type WorkflowRunsResponse = {
  total_count?: number;
  workflow_runs?: WorkflowRun[];
};

function getConfig(): {
  token: string;
} | null {
  const token =
    process.env.GITHUB_TOKEN?.trim() ||
    process.env.GITHUB_AUTONOMOUS_DEVELOPMENT_TOKEN?.trim();

  if (!token) {
    return null;
  }

  return {
    token,
  };
}

function normalizeRepository(
  value?: string,
): string {
  const repository =
    (
      value ||
      process.env.GITHUB_REPOSITORY ||
      "Vivi9max/AIOS-Alpha"
    ).trim();

  if (
    !/^[^/]+\/[^/]+$/.test(
      repository,
    )
  ) {
    throw new Error(
      "AIOS_CI_REPOSITORY_INVALID",
    );
  }

  return repository;
}

async function githubFetch<T>(
  path: string,
  token: string,
): Promise<T> {
  const response =
    await fetch(
      `${GITHUB_API_BASE}${path}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept:
            "application/vnd.github+json",
          Authorization:
            `Bearer ${token}`,
          "X-GitHub-Api-Version":
            GITHUB_API_VERSION,
        },
      },
    );

  const body =
    await response.text();

  let parsed: unknown = null;

  if (body) {
    try {
      parsed =
        JSON.parse(body);
    } catch {
      parsed = body;
    }
  }

  if (!response.ok) {
    const message =
      typeof parsed === "object" &&
      parsed !== null &&
      "message" in parsed &&
      typeof (
        parsed as {
          message?: unknown;
        }
      ).message === "string"
        ? (
            parsed as {
              message: string;
            }
          ).message
        : `GitHub Actions API request failed with HTTP ${response.status}.`;

    throw new Error(
      `AIOS_CI_GITHUB_API_${response.status}: ${message}`,
    );
  }

  return parsed as T;
}

function encodeRepository(
  repository: string,
): string {
  return repository
    .split("/")
    .map((part) =>
      encodeURIComponent(part),
    )
    .join("/");
}

function encodeQuery(
  value: string,
): string {
  return encodeURIComponent(
    value,
  );
}

function selectWorkflowRun(
  runs: WorkflowRun[],
  commitSha: string,
  workflowName: string,
): WorkflowRun | null {
  const targetSha =
    commitSha.toLowerCase();

  const matching =
    runs
      .filter((run) => {
        const runSha =
          run.head_sha?.toLowerCase();

        if (
          !runSha ||
          runSha !== targetSha
        ) {
          return false;
        }

        if (
          run.name &&
          run.name !== workflowName
        ) {
          return false;
        }

        if (
          run.event &&
          run.event !== "push"
        ) {
          return false;
        }

        return true;
      })
      .sort(
        (a, b) => {
          const aTime =
            a.created_at
              ? new Date(
                  a.created_at,
                ).getTime()
              : 0;

          const bTime =
            b.created_at
              ? new Date(
                  b.created_at,
                ).getTime()
              : 0;

          return bTime - aTime;
        },
      );

  return (
    matching[0] ||
    null
  );
}

export async function verifyGitHubActionsForCommit(
  input: {
    repository?: string;
    commitSha: string;
    workflowName?: string;
    timeoutMs?: number;
    pollIntervalMs?: number;
  },
): Promise<AutonomousCIVerificationResult> {
  const repository =
    normalizeRepository(
      input.repository,
    );

  const workflowName =
    (
      input.workflowName ||
      DEFAULT_WORKFLOW_NAME
    ).trim();

  const commitSha =
    input.commitSha.trim();

  if (!commitSha) {
    return {
      status: "FAIL",
      configured: true,
      repository,
      commitSha,
      workflowName,
      reason:
        "AIOS_CI_COMMIT_SHA_MISSING",
    };
  }

  const config =
    getConfig();

  if (!config) {
    return {
      status:
        "NOT_CONFIGURED",
      configured: false,
      repository,
      commitSha,
      workflowName,
      reason:
        "GitHub CI verification requires GITHUB_TOKEN or GITHUB_AUTONOMOUS_DEVELOPMENT_TOKEN.",
    };
  }

  const timeoutMs =
    Math.max(
      30000,
      input.timeoutMs ??
        DEFAULT_TIMEOUT_MS,
    );

  const pollIntervalMs =
    Math.max(
      1500,
      input.pollIntervalMs ??
        DEFAULT_POLL_INTERVAL_MS,
    );

  const repositoryPath =
    encodeRepository(
      repository,
    );

  const headSha =
    encodeQuery(
      commitSha,
    );

  const startedAt =
    Date.now();

  let latestRun:
    | WorkflowRun
    | null = null;

  try {
    while (
      Date.now() -
        startedAt <
      timeoutMs
    ) {
      const result =
        await githubFetch<WorkflowRunsResponse>(
          `/repos/${repositoryPath}/actions/runs?head_sha=${headSha}&per_page=50`,
          config.token,
        );

      const runs =
        Array.isArray(
          result.workflow_runs,
        )
          ? result.workflow_runs
          : [];

      latestRun =
        selectWorkflowRun(
          runs,
          commitSha,
          workflowName,
        );

      if (latestRun) {
        const status =
          latestRun.status ||
          "unknown";

        const conclusion =
          latestRun.conclusion;

        if (
          status ===
            "completed" &&
          conclusion ===
            "success"
        ) {
          return {
            status: "PASS",
            configured: true,
            repository,
            commitSha,
            branch:
              latestRun.head_branch,
            workflowName,
            runId:
              latestRun.id,
            runUrl:
              latestRun.html_url,
            conclusion,
            completedAt:
              latestRun.updated_at,
            reason:
              "GitHub Actions CI completed successfully for the exact staging commit.",
          };
        }

        if (
          status ===
            "completed" &&
          conclusion !==
            "success"
        ) {
          return {
            status: "FAIL",
            configured: true,
            repository,
            commitSha,
            branch:
              latestRun.head_branch,
            workflowName,
            runId:
              latestRun.id,
            runUrl:
              latestRun.html_url,
            conclusion,
            completedAt:
              latestRun.updated_at,
            reason:
              `GitHub Actions CI completed with conclusion: ${conclusion || "unknown"}.`,
          };
        }
      }

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            pollIntervalMs,
          ),
      );
    }

    return {
      status: "TIMEOUT",
      configured: true,
      repository,
      commitSha,
      branch:
        latestRun?.head_branch,
      workflowName,
      runId:
        latestRun?.id,
      runUrl:
        latestRun?.html_url,
      conclusion:
        latestRun?.conclusion,
      reason:
        latestRun
          ? "Timed out waiting for the exact GitHub Actions CI run to complete."
          : "Timed out waiting for GitHub Actions to create a CI run for the exact staging commit.",
    };
  } catch (error) {
    return {
      status: "FAIL",
      configured: true,
      repository,
      commitSha,
      branch:
        latestRun?.head_branch,
      workflowName,
      runId:
        latestRun?.id,
      runUrl:
        latestRun?.html_url,
      conclusion:
        latestRun?.conclusion,
      reason:
        error instanceof Error
          ? error.message
          : "AIOS GitHub CI verification failed.",
    };
  }
}
