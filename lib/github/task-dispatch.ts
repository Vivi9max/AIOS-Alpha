import "server-only";

import {
  getGitHubRepository,
  githubBridgeStatus,
  readGitHubFile,
  writeGitHubFile,
} from "@/lib/github/bridge";

export type GitHubTaskAction =
  | "read"
  | "write";

export interface GitHubTaskRequest {
  action: GitHubTaskAction;
  repo?: string;
  branch?: string;
  path: string;
  content?: string;
  commitMessage?: string;
}

export interface GitHubTaskResult {
  success: boolean;
  action: GitHubTaskAction;
  repository: string;
  branch: string;
  path: string;
  read?: {
    sha: string;
    size: number;
    content?: string;
  };
  write?: {
    sha?: string;
    commitSha: string;
    commitUrl?: string;
  };
  error?: string;
}

const DEFAULT_REPOSITORY =
  "Vivi9max/AIOS-Alpha";

const DEFAULT_BRANCH = "main";

/**
 * C141.7 Founder Self-Development boundary.
 *
 * The Founder-authenticated GitHub bridge may read the repository
 * and write approved project areas directly. This removes the
 * previous docs/runtime-only ceiling while keeping repository,
 * branch and path traversal restrictions explicit.
 *
 * The bridge is still Founder-only at the route boundary.
 */
const AUTONOMOUS_WRITE_PREFIXES = [
  "app/",
  "components/",
  "docs/",
  "lib/",
  "scripts/",
  "tests/",
  "test/",
  "public/",
  "styles/",
];

function normalizePath(path: string): string {
  return path
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/");
}

function isSafePath(path: string): boolean {
  if (!path) return false;
  if (path.includes("..")) return false;
  if (path.startsWith(".git/")) return false;
  if (path.includes("\0")) return false;
  return true;
}

function getRepository(value?: string): string {
  const repo =
    value?.trim() ||
    DEFAULT_REPOSITORY;

  if (repo !== DEFAULT_REPOSITORY) {
    throw new Error(
      `Founder self-development is restricted to ${DEFAULT_REPOSITORY}.`,
    );
  }

  return repo;
}

function getBranch(value?: string): string {
  const branch =
    value?.trim() ||
    DEFAULT_BRANCH;

  if (branch !== DEFAULT_BRANCH) {
    throw new Error(
      "Founder self-development is restricted to the main branch.",
    );
  }

  return branch;
}

function assertSafeWritePath(path: string): void {
  const allowed =
    AUTONOMOUS_WRITE_PREFIXES.some(
      (prefix) => path.startsWith(prefix),
    );

  if (!allowed) {
    throw new Error(
      `Founder self-development writes are restricted to approved project areas: ${AUTONOMOUS_WRITE_PREFIXES.join(", ")}`,
    );
  }

  if (
    path === "package.json" ||
    path === "package-lock.json" ||
    path === "pnpm-lock.yaml" ||
    path === "yarn.lock" ||
    path === "vercel.json" ||
    path.startsWith(".github/") ||
    path.startsWith(".env")
  ) {
    throw new Error(
      "Protected project configuration cannot be modified by autonomous self-development.",
    );
  }
}

export async function dispatchGitHubTask(
  request: GitHubTaskRequest,
): Promise<GitHubTaskResult> {
  const repository = getRepository(request.repo);
  const branch = getBranch(request.branch);
  const path = normalizePath(request.path);

  if (!isSafePath(path)) {
    return {
      success: false,
      action: request.action,
      repository,
      branch,
      path,
      error: "Unsafe GitHub path.",
    };
  }

  const status = await githubBridgeStatus();

  if (!status.success) {
    return {
      success: false,
      action: request.action,
      repository,
      branch,
      path,
      error:
        status.error ||
        "GitHub authentication failed.",
    };
  }

  const repositoryResult =
    await getGitHubRepository({
      repo: repository,
    });

  if (!repositoryResult.success) {
    return {
      success: false,
      action: request.action,
      repository,
      branch,
      path,
      error:
        repositoryResult.error ||
        "GitHub repository access failed.",
    };
  }

  if (request.action === "read") {
    const result =
      await readGitHubFile({
        repo: repository,
        path,
        ref: branch,
      });

    if (!result.success || !result.data) {
      return {
        success: false,
        action: request.action,
        repository,
        branch,
        path,
        error:
          result.error ||
          "GitHub read failed.",
      };
    }

    return {
      success: true,
      action: "read",
      repository,
      branch,
      path,
      read: {
        sha: result.data.sha,
        size: result.data.size,
        content: result.data.content,
      },
    };
  }

  assertSafeWritePath(path);

  if (typeof request.content !== "string") {
    return {
      success: false,
      action: request.action,
      repository,
      branch,
      path,
      error: "Write content is required.",
    };
  }

  if (request.content.length > 200_000) {
    return {
      success: false,
      action: request.action,
      repository,
      branch,
      path,
      error:
        "Autonomous write payload exceeds the 200000 character limit.",
    };
  }

  const existing =
    await readGitHubFile({
      repo: repository,
      path,
      ref: branch,
    });

  const commitMessage =
    request.commitMessage?.trim() ||
    "feat(c141.7): founder self-development GitHub bridge";

  const write =
    await writeGitHubFile({
      repo: repository,
      path,
      content: request.content,
      message: commitMessage,
      branch,
      sha:
        existing.success && existing.data
          ? existing.data.sha
          : undefined,
    });

  if (!write.success || !write.data) {
    return {
      success: false,
      action: request.action,
      repository,
      branch,
      path,
      error:
        write.error ||
        "GitHub write failed.",
    };
  }

  return {
    success: true,
    action: "write",
    repository,
    branch,
    path,
    write: {
      sha: write.data.content?.sha,
      commitSha: write.data.commit.sha,
      commitUrl: write.data.commit.html_url,
    },
  };
}
