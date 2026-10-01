import "server-only";

import {
  getGitHubBridgeConfig,
  resolveGitHubBridgeAuth,
} from "@/lib/github/bridge";

const DEFAULT_REPOSITORY = "Vivi9max/AIOS-Alpha";
const DEFAULT_BRANCH = "main";
const GITHUB_API_VERSION = "2022-11-28";
const STAGING_PREFIX = "c167-28-5-ad-";

export interface AutonomousStagingFile {
  path: string;
  content: string;
}

export interface AutonomousStagingSnapshot {
  repository: string;
  baseBranch: string;
  baseSha: string;
  stagingBranch: string;
  treeSha?: string;
  commitSha?: string;
  changedPaths: string[];
}

export interface AutonomousStagingResult {
  success: boolean;
  code: string;
  reason: string;
  snapshot?: AutonomousStagingSnapshot;
}

interface GitHubApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

interface GitHubRefResponse {
  ref?: string;
  object?: {
    sha?: string;
    type?: string;
    url?: string;
  };
}

interface GitHubCommitResponse {
  sha?: string;
  commit?: {
    tree?: {
      sha?: string;
    };
  };
}

interface GitHubTreeResponse {
  sha?: string;
  tree?: Array<{
    path?: string;
    mode?: string;
    type?: string;
    sha?: string;
  }>;
}

interface GitHubBlobResponse {
  sha?: string;
}

interface GitHubCompareResponse {
  status?: string;
  ahead_by?: number;
  behind_by?: number;
  merge_base_commit?: {
    sha?: string;
  };
  commits?: Array<{
    sha?: string;
  }>;
}

function normalizeRepository(
  repository?: string,
): string {
  return (
    repository?.trim() ||
    process.env.GITHUB_REPOSITORY?.trim() ||
    DEFAULT_REPOSITORY
  )
    .replace(/^\/+|\/+$/g, "");
}

function normalizeBranch(
  branch?: string,
): string {
  return (
    branch?.trim() ||
    process.env.GITHUB_DEFAULT_BRANCH?.trim() ||
    DEFAULT_BRANCH
  );
}

function normalizePath(
  path: string,
): string {
  return path
    .trim()
    .replace(/^\/+|\/+$/g, "");
}

function isSafeStagingPath(
  path: string,
): boolean {
  const normalized = normalizePath(path);

  if (!normalized) {
    return false;
  }

  if (normalized.includes("..")) {
    return false;
  }

  if (normalized.startsWith(".git/")) {
    return false;
  }

  if (normalized.startsWith(".github/")) {
    return false;
  }

  if (
    normalized === "package.json" ||
    normalized === "package-lock.json" ||
    normalized === "pnpm-lock.yaml" ||
    normalized === "yarn.lock" ||
    normalized === "vercel.json"
  ) {
    return false;
  }

  return (
    /^(app|components|docs|lib|scripts|tests|test|public|styles)\//.test(
      normalized,
    )
  );
}

function buildStagingBranchName(
  taskId?: string,
): string {
  const normalized = (taskId || `task-${Date.now()}`)
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${STAGING_PREFIX}${normalized || `task-${Date.now()}`}`;
}

async function githubRequest<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<GitHubApiResult<T>> {
  const config =
    getGitHubBridgeConfig();

  const token =
    accessToken ||
    config.token;

  if (!token) {
    return {
      success: false,
      error:
        "GitHub authentication is not configured.",
      status: 503,
    };
  }

  const response =
    await fetch(
      `${config.apiBaseUrl}${path}`,
      {
        ...options,
        cache: "no-store",
        headers: {
          Accept:
            "application/vnd.github+json",
          Authorization:
            `Bearer ${token}`,
          "X-GitHub-Api-Version":
            GITHUB_API_VERSION,
          ...(options.body
            ? {
                "Content-Type":
                  "application/json",
              }
            : {}),
          ...(options.headers || {}),
        },
      },
    );

  const body =
    await response.text();

  let data:
    | unknown
    | undefined;

  if (body) {
    try {
      data = JSON.parse(body);
    } catch {
      data = body;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (
        data as {
          message?: unknown;
        }
      ).message === "string"
        ? (
            data as {
              message: string;
            }
          ).message
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

async function getBranchHead(
  repository: string,
  branch: string,
  accessToken: string,
): Promise<string> {
  const result =
    await githubRequest<GitHubRefResponse>(
      `/repos/${repository}/git/ref/heads/${encodeURIComponent(branch)}`,
      {},
      accessToken,
    );

  if (
    !result.success ||
    !result.data?.object?.sha
  ) {
    throw new Error(
      result.error ||
        `AIOS_STAGING_BASE_REF_READ_FAILED: ${branch}`,
    );
  }

  return result.data.object.sha;
}

async function getCommitTree(
  repository: string,
  commitSha: string,
  accessToken: string,
): Promise<string> {
  const result =
    await githubRequest<GitHubCommitResponse>(
      `/repos/${repository}/git/commits/${encodeURIComponent(commitSha)}`,
      {},
      accessToken,
    );

  const treeSha =
    result.data?.commit?.tree?.sha;

  if (
    !result.success ||
    !treeSha
  ) {
    throw new Error(
      result.error ||
        `AIOS_STAGING_BASE_TREE_READ_FAILED: ${commitSha}`,
    );
  }

  return treeSha;
}

async function createBlob(
  repository: string,
  content: string,
  accessToken: string,
): Promise<string> {
  const result =
    await githubRequest<GitHubBlobResponse>(
      `/repos/${repository}/git/blobs`,
      {
        method: "POST",
        body: JSON.stringify({
          content,
          encoding: "utf-8",
        }),
      },
      accessToken,
    );

  if (
    !result.success ||
    !result.data?.sha
  ) {
    throw new Error(
      result.error ||
        "AIOS_STAGING_BLOB_CREATE_FAILED",
    );
  }

  return result.data.sha;
}

async function createTree(
  repository: string,
  baseTreeSha: string,
  entries: Array<{
    path: string;
    mode: "100644";
    type: "blob";
    sha: string;
  }>,
  accessToken: string,
): Promise<string> {
  const result =
    await githubRequest<GitHubTreeResponse>(
      `/repos/${repository}/git/trees`,
      {
        method: "POST",
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: entries,
        }),
      },
      accessToken,
    );

  if (
    !result.success ||
    !result.data?.sha
  ) {
    throw new Error(
      result.error ||
        "AIOS_STAGING_TREE_CREATE_FAILED",
    );
  }

  return result.data.sha;
}

async function createCommit(
  repository: string,
  message: string,
  treeSha: string,
  parentSha: string,
  accessToken: string,
): Promise<string> {
  const result =
    await githubRequest<GitHubCommitResponse>(
      `/repos/${repository}/git/commits`,
      {
        method: "POST",
        body: JSON.stringify({
          message,
          tree: treeSha,
          parents: [parentSha],
        }),
      },
      accessToken,
    );

  if (
    !result.success ||
    !result.data?.sha
  ) {
    throw new Error(
      result.error ||
        "AIOS_STAGING_COMMIT_CREATE_FAILED",
    );
  }

  return result.data.sha;
}

async function createOrUpdateBranch(
  repository: string,
  branch: string,
  sha: string,
  accessToken: string,
): Promise<void> {
  const createResult =
    await githubRequest<unknown>(
      `/repos/${repository}/git/refs`,
      {
        method: "POST",
        body: JSON.stringify({
          ref: `refs/heads/${branch}`,
          sha,
        }),
      },
      accessToken,
    );

  if (createResult.success) {
    return;
  }

  if (
    createResult.status !== 422
  ) {
    throw new Error(
      createResult.error ||
        "AIOS_STAGING_BRANCH_CREATE_FAILED",
    );
  }

  const updateResult =
    await githubRequest<unknown>(
      `/repos/${repository}/git/refs/heads/${encodeURIComponent(branch)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          sha,
          force: false,
        }),
      },
      accessToken,
    );

  if (
    !updateResult.success
  ) {
    throw new Error(
      updateResult.error ||
        "AIOS_STAGING_BRANCH_UPDATE_FAILED",
    );
  }
}

async function updateBranch(
  repository: string,
  branch: string,
  sha: string,
  force: boolean,
  accessToken: string,
): Promise<void> {
  const result =
    await githubRequest<unknown>(
      `/repos/${repository}/git/refs/heads/${encodeURIComponent(branch)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          sha,
          force,
        }),
      },
      accessToken,
    );

  if (
    !result.success
  ) {
    throw new Error(
      result.error ||
        `AIOS_STAGING_REF_UPDATE_FAILED: ${branch}`,
    );
  }
}

async function compareBranches(
  repository: string,
  base: string,
  head: string,
  accessToken: string,
): Promise<GitHubCompareResponse> {
  const result =
    await githubRequest<GitHubCompareResponse>(
      `/repos/${repository}/compare/${encodeURIComponent(
        base,
      )}...${encodeURIComponent(head)}`,
      {},
      accessToken,
    );

  if (
    !result.success ||
    !result.data
  ) {
    throw new Error(
      result.error ||
        "AIOS_STAGING_COMPARE_FAILED",
    );
  }

  return result.data;
}

function validateFiles(
  files: AutonomousStagingFile[],
): void {
  if (
    files.length === 0
  ) {
    throw new Error(
      "AIOS_STAGING_NO_FILES",
    );
  }

  if (
    files.length > 6
  ) {
    throw new Error(
      "AIOS_STAGING_FILE_LIMIT_EXCEEDED",
    );
  }

  const seen =
    new Set<string>();

  for (
    const file of files
  ) {
    const path =
      normalizePath(
        file.path,
      );

    if (
      !isSafeStagingPath(
        path,
      )
    ) {
      throw new Error(
        `AIOS_STAGING_PATH_REJECTED: ${path}`,
      );
    }

    if (
      seen.has(path)
    ) {
      throw new Error(
        `AIOS_STAGING_DUPLICATE_PATH: ${path}`,
      );
    }

    seen.add(path);

    if (
      file.content.length >
      200000
    ) {
      throw new Error(
        `AIOS_STAGING_FILE_TOO_LARGE: ${path}`,
      );
    }

    if (
      !file.content.trim()
    ) {
      throw new Error(
        `AIOS_STAGING_EMPTY_FILE: ${path}`,
      );
    }
  }
}

export async function createAutonomousStaging(
  input: {
    objective: string;
    taskId?: string;
    repository?: string;
    baseBranch?: string;
    files: AutonomousStagingFile[];
    accessToken?: string;
  },
): Promise<AutonomousStagingResult> {
  const repository =
    normalizeRepository(
      input.repository,
    );

  const baseBranch =
    normalizeBranch(
      input.baseBranch,
    );

  validateFiles(
    input.files,
  );

  const auth =
    input.accessToken
      ? {
          accessToken:
            input.accessToken,
        }
      : await resolveGitHubBridgeAuth();

  if (
    !auth.accessToken
  ) {
    return {
      success: false,
      code:
        "AIOS_STAGING_AUTH_UNAVAILABLE",
      reason:
        "AIOS does not have an authenticated GitHub execution context.",
    };
  }

  try {
    const baseSha =
      await getBranchHead(
        repository,
        baseBranch,
        auth.accessToken,
      );

    const baseTreeSha =
      await getCommitTree(
        repository,
        baseSha,
        auth.accessToken,
      );

    const stagingBranch =
      buildStagingBranchName(
        input.taskId,
      );

    await createOrUpdateBranch(
      repository,
      stagingBranch,
      baseSha,
      auth.accessToken,
    );

    const treeEntries: Array<{
      path: string;
      mode: "100644";
      type: "blob";
      sha: string;
    }> = [];

    for (
      const file of input.files
    ) {
      const path =
        normalizePath(
          file.path,
        );

      const blobSha =
        await createBlob(
          repository,
          file.content,
          auth.accessToken,
        );

      treeEntries.push({
        path,
        mode: "100644",
        type: "blob",
        sha: blobSha,
      });
    }

    const treeSha =
      await createTree(
        repository,
        baseTreeSha,
        treeEntries,
        auth.accessToken,
      );

    const normalizedObjective =
      input.objective
        .replace(
          /[^a-zA-Z0-9 _-]+/g,
          " ",
        )
        .trim()
        .replace(
          /\s+/g,
          " ",
        )
        .slice(
          0,
          72,
        );

    const summary =
      normalizedObjective
        .replace(
          /\s+/g,
          "-",
        )
        .toLowerCase();

    const commitMessage =
      `feat(C167.28.5): autonomous atomic development${
        summary
          ? ` ${summary}`
          : ""
      }`;

    const commitSha =
      await createCommit(
        repository,
        commitMessage,
        treeSha,
        baseSha,
        auth.accessToken,
      );

    await updateBranch(
      repository,
      stagingBranch,
      commitSha,
      false,
      auth.accessToken,
    );

    const stagingHead =
      await getBranchHead(
        repository,
        stagingBranch,
        auth.accessToken,
      );

    if (
      stagingHead !==
      commitSha
    ) {
      throw new Error(
        "AIOS_STAGING_COMMIT_READBACK_FAILED",
      );
    }

    return {
      success: true,
      code:
        "AIOS_STAGING_COMMIT_READY",
      reason:
        "AIOS created one atomic Git tree and one commit on the staging branch.",
      snapshot: {
        repository,
        baseBranch,
        baseSha,
        stagingBranch,
        treeSha,
        commitSha,
        changedPaths:
          input.files.map(
            (file) =>
              normalizePath(
                file.path,
              ),
          ),
      },
    };
  } catch (error) {
    return {
      success: false,
      code:
        "AIOS_STAGING_FAILED",
      reason:
        error instanceof Error
          ? error.message
          : "AIOS staging operation failed.",
    };
  }
}

export async function promoteAutonomousStaging(
  input: {
    repository?: string;
    baseBranch?: string;
    stagingBranch: string;
    expectedBaseSha: string;
    stagingCommitSha: string;
    accessToken?: string;
  },
): Promise<AutonomousStagingResult> {
  const repository =
    normalizeRepository(
      input.repository,
    );

  const baseBranch =
    normalizeBranch(
      input.baseBranch,
    );

  const auth =
    input.accessToken
      ? {
          accessToken:
            input.accessToken,
        }
      : await resolveGitHubBridgeAuth();

  if (
    !auth.accessToken
  ) {
    return {
      success: false,
      code:
        "AIOS_PROMOTION_AUTH_UNAVAILABLE",
      reason:
        "AIOS does not have an authenticated GitHub execution context.",
    };
  }

  try {
    const currentBaseSha =
      await getBranchHead(
        repository,
        baseBranch,
        auth.accessToken,
      );

    if (
      currentBaseSha !==
      input.expectedBaseSha
    ) {
      return {
        success: false,
        code:
          "AIOS_PROMOTION_BASE_MOVED",
        reason:
          "The main branch changed after staging was created. AIOS refused promotion to prevent overwriting newer work.",
        snapshot: {
          repository,
          baseBranch,
          baseSha:
            currentBaseSha,
          stagingBranch:
            input.stagingBranch,
          commitSha:
            input.stagingCommitSha,
          changedPaths: [],
        },
      };
    }

    const comparison =
      await compareBranches(
        repository,
        baseBranch,
        input.stagingBranch,
        auth.accessToken,
      );

    const mergeBase =
      comparison
        .merge_base_commit
        ?.sha;

    if (
      mergeBase &&
      mergeBase !==
        input.expectedBaseSha
    ) {
      return {
        success: false,
        code:
          "AIOS_PROMOTION_BASELINE_MISMATCH",
        reason:
          "The staging branch is no longer based on the expected main commit.",
        snapshot: {
          repository,
          baseBranch,
          baseSha:
            input.expectedBaseSha,
          stagingBranch:
            input.stagingBranch,
          commitSha:
            input.stagingCommitSha,
          changedPaths: [],
        },
      };
    }

    if (
      comparison.ahead_by !==
      undefined &&
      comparison.ahead_by < 1
    ) {
      return {
        success: false,
        code:
          "AIOS_PROMOTION_NO_NEW_COMMIT",
        reason:
          "The staging branch does not contain a new commit to promote.",
      };
    }

    if (
      comparison.behind_by !==
        undefined &&
      comparison.behind_by > 0
    ) {
      return {
        success: false,
        code:
          "AIOS_PROMOTION_STAGING_BEHIND",
        reason:
          "The staging branch is behind main and cannot be promoted.",
      };
    }

    await updateBranch(
      repository,
      baseBranch,
      input.stagingCommitSha,
      false,
      auth.accessToken,
    );

    const promotedSha =
      await getBranchHead(
        repository,
        baseBranch,
        auth.accessToken,
      );

    if (
      promotedSha !==
      input.stagingCommitSha
    ) {
      throw new Error(
        "AIOS_PROMOTION_READBACK_FAILED",
      );
    }

    return {
      success: true,
      code:
        "AIOS_ATOMIC_PROMOTION_COMPLETED",
      reason:
        "AIOS promoted the verified staging commit to main using a non-forced fast-forward update.",
      snapshot: {
        repository,
        baseBranch,
        baseSha:
          input.expectedBaseSha,
        stagingBranch:
          input.stagingBranch,
        commitSha:
          input.stagingCommitSha,
        changedPaths: [],
      },
    };
  } catch (error) {
    return {
      success: false,
      code:
        "AIOS_PROMOTION_FAILED",
      reason:
        error instanceof Error
          ? error.message
          : "AIOS atomic promotion failed.",
    };
  }
}
