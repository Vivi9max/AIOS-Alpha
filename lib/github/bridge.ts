import "server-only";

export interface GitHubBridgeConfig {
  token: string;
  apiBaseUrl: string;
  defaultRepo: string;
  defaultBranch: string;
}

export interface GitHubBridgeResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

function getConfig(): GitHubBridgeConfig {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error("GITHUB_TOKEN is not configured.");
  }

  return {
    token,
    apiBaseUrl: process.env.GITHUB_API_URL?.trim() || "https://api.github.com",
    defaultRepo:
      process.env.GITHUB_REPOSITORY?.trim() ||
      "Vivi9max/AIOS-Alpha",
    defaultBranch:
      process.env.GITHUB_DEFAULT_BRANCH?.trim() || "main",
  };
}

async function githubFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<GitHubBridgeResult<T>> {
  const config = getConfig();

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let data: unknown = undefined;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : `GitHub API request failed with ${response.status}.`;

    return {
      success: false,
      error: message,
      status: response.status,
    };
  }

  return {
    success: true,
    data: data as T,
    status: response.status,
  };
}

function encodePath(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function encodeRepo(repo: string): string {
  return repo
    .trim()
    .replace(/^\/+|\/+$/g, "");
}

export async function githubBridgeStatus() {
  const config = getConfig();

  const identity = await githubFetch<{
    login: string;
    id: number;
    type: string;
  }>("/user");

  if (!identity.success || !identity.data) {
    return {
      success: false,
      tokenConfigured: true,
      repository: config.defaultRepo,
      branch: config.defaultBranch,
      error: identity.error || "GitHub authentication failed.",
      status: identity.status,
    };
  }

  return {
    success: true,
    tokenConfigured: true,
    authenticated: true,
    account: {
      login: identity.data.login,
      id: identity.data.id,
      type: identity.data.type,
    },
    repository: config.defaultRepo,
    branch: config.defaultBranch,
  };
}

export async function readGitHubFile(options: {
  repo?: string;
  path: string;
  ref?: string;
}) {
  const config = getConfig();
  const repo = encodeRepo(options.repo || config.defaultRepo);
  const ref = encodeURIComponent(options.ref || config.defaultBranch);
  const path = encodePath(options.path);

  const result = await githubFetch<{
    type: string;
    name: string;
    path: string;
    sha: string;
    size: number;
    encoding?: string;
    content?: string;
    html_url?: string;
  }>(`/repos/${repo}/contents/${path}?ref=${ref}`);

  if (!result.success || !result.data) return result;

  let content = result.data.content || "";
  if (result.data.encoding === "base64") {
    content = Buffer.from(content.replace(/\s/g, ""), "base64").toString("utf8");
  }

  return {
    success: true,
    data: {
      repo,
      ref: options.ref || config.defaultBranch,
      path: result.data.path,
      sha: result.data.sha,
      size: result.data.size,
      content,
      htmlUrl: result.data.html_url,
    },
  };
}

export async function writeGitHubFile(options: {
  repo?: string;
  path: string;
  content: string;
  message: string;
  branch?: string;
  sha?: string;
}) {
  const config = getConfig();
  const repo = encodeRepo(options.repo || config.defaultRepo);
  const branch = options.branch || config.defaultBranch;
  const path = encodePath(options.path);

  if (!options.message.trim()) {
    return {
      success: false,
      error: "Commit message is required.",
      status: 400,
    };
  }

  const body: Record<string, string> = {
    message: options.message.trim(),
    content: Buffer.from(options.content, "utf8").toString("base64"),
    branch,
  };

  if (options.sha) body.sha = options.sha;

  return githubFetch<{
    commit: {
      sha: string;
      html_url?: string;
    };
    content?: {
      path: string;
      sha: string;
      html_url?: string;
    };
  }>(`/repos/${repo}/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function listGitHubPath(options: {
  repo?: string;
  path?: string;
  ref?: string;
}) {
  const config = getConfig();
  const repo = encodeRepo(options.repo || config.defaultRepo);
  const ref = encodeURIComponent(options.ref || config.defaultBranch);
  const path = options.path ? `/${encodePath(options.path)}` : "";

  return githubFetch<
    Array<{
      type: string;
      name: string;
      path: string;
      sha: string;
      size: number;
      html_url?: string;
    }>
  >(`/repos/${repo}/contents${path}?ref=${ref}`);
}

export async function getGitHubRepository(options?: {
  repo?: string;
}) {
  const config = getConfig();
  const repo = encodeRepo(options?.repo || config.defaultRepo);

  return githubFetch<{
    full_name: string;
    private: boolean;
    default_branch: string;
    html_url: string;
    permissions?: {
      admin?: boolean;
      push?: boolean;
      pull?: boolean;
    };
  }>(`/repos/${repo}`);
}
