import "server-only";

import {
  getGitHubRepository,
  githubBridgeStatus,
  readGitHubFile,
  writeGitHubFile,
} from "@/lib/github/bridge";

import {
  enforceFounderContract,
  type FounderContractTask,
} from "@/lib/github/founder-contract-enforcement";

import type { FounderDevelopmentContract } from "@/lib/github/founder-development-contract";

export type GitHubTaskAction = "read" | "write";

export interface GitHubTaskRequest {
  action: GitHubTaskAction;
  repo?: string;
  branch?: string;
  path: string;
  content?: string;
  commitMessage?: string;
  contract: FounderDevelopmentContract;
}

export interface GitHubTaskResult {
  success: boolean;
  action: GitHubTaskAction;
  repository: string;
  branch: string;
  path: string;
  code?: string;
  read?: {
    sha: string;
    size: number;
    content?: string;
  };
  write?: {
    sha?: string;
    commitSha: string;
    commitUrl?: string;
    readbackVerified?: boolean;
  };
  error?: string;
}

const DEFAULT_REPOSITORY = "Vivi9max/AIOS-Alpha";
const DEFAULT_BRANCH = "main";

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
    .replace(/\\/g, "/");
}

function isSafePath(path: string): boolean {
  if (!path) return false;
  if (path.includes("..")) return false;
  if (path.startsWith(".git/")) return false;
  if (path.includes("\0")) return false;
  if (path.startsWith(".env")) return false;
  return true;
}

function getRepository(value?: string): string {
  const repo = value?.trim() || DEFAULT_REPOSITORY;

  if (repo !== DEFAULT_REPOSITORY) {
    throw new Error(
      `Founder self-development is restricted to ${DEFAULT_REPOSITORY}.`,
    );
  }

  return repo;
}

function getBranch(value?: string): string {
  const branch = value?.trim() || DEFAULT_BRANCH;

  if (branch !== DEFAULT_BRANCH) {
    throw new Error(
      "Founder self-development is restricted to the main branch.",
    );
  }

  return branch;
}

function assertSafeWritePath(path: string): void {
  const allowed = AUTONOMOUS_WRITE_PREFIXES.some((prefix) =>
    path.startsWith(prefix),
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

function enforceContract(
  request: GitHubTaskRequest,
  repository: string,
  branch: string,
  path: string,
): void {
  const task: FounderContractTask = {
    contract: request.contract,
    action:
      request.action === "read"
        ? "read"
        : "write",
    repo: repository,
    branch,
    path,
  };

  enforceFounderContract(task);
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
      code: "UNSAFE_GITHUB_PATH",
      error: "Unsafe GitHub path.",
    };
  }

  /*
   * C141.10 Founder Contract Runtime Gate.
   *
   * Contract enforcement MUST happen before any GitHub I/O.
   */
  try {
    enforceContract(
      request,
      repository,
      branch,
      path,
    );
  } catch (error) {
    return {
      success: false,
      action: request.action,
      repository,
      branch,
      path,
      code: "FOUNDER_CONTRACT_REJECTED",
      error:
        error instanceof Error
          ? error.message
          : "Founder Development Contract rejected the operation.",
    };
  }

  /*
   * The actual GitHub bridge remains the single source
   * of GitHub authentication and API access.
   */
  const status = await githubBridgeStatus();

  if (!status.success) {
    return {
      success: false,
      action: request.action,
      repository,
      branch,
      path,
      code: "GITHUB_BRIDGE_UNAVAILABLE",
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
      code: "GITHUB_REPOSITORY_ACCESS_FAILED",
      error:
        repositoryResult.error ||
        "GitHub repository access failed.",
    };
  }

  /*
   * READ
   */
  if (request.action === "read") {
    const result =
      await readGitHubFile({
        repo: repository,
        path,
        ref: branch,
      });

    if (!result.success || !result.data) {
      const readError =
        "error" in result &&
        typeof result.error === "string"
          ? result.error
          : "GitHub read failed.";

      return {
        success: false,
        action: request.action,
        repository,
        branch,
        path,
        code: "GITHUB_READ_FAILED",
        error: readError,
      };
    }

    return {
      success: true,
      action: "read",
      repository,
      branch,
      path,
      code: "GITHUB_READ_SUCCESS",
      read: {
        sha: result.data.sha,
        size: result.data.size,
        content: result.data.content,
      },
    };
  }

  /*
   * WRITE
   */
  assertSafeWritePath(path);

  if (typeof request.content !== "string") {
    return {
      success: false,
      action: request.action,
      repository,
      branch,
      path,
      code: "WRITE_CONTENT_REQUIRED",
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
      code: "WRITE_PAYLOAD_TOO_LARGE",
      error:
        "Autonomous write payload exceeds the 200000 character limit.",
    };
  }

  /*
   * Read existing content first.
   * This provides the SHA required by GitHub for updates
   * and establishes the pre-write state.
   */
  const existing =
    await readGitHubFile({
      repo: repository,
      path,
      ref: branch,
    });

  const commitMessage =
    request.commitMessage?.trim() ||
    "feat(C141.10): founder contract governed GitHub write";

  /*
   * Real GitHub write.
   *
   * This returns the actual commit SHA from lib/github/bridge.ts.
   */
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
      code: "GITHUB_WRITE_FAILED",
      error:
        write.error ||
        "GitHub write failed.",
    };
  }

  const commitSha = write.data.commit.sha;
  const commitUrl = write.data.commit.html_url;
  const contentSha = write.data.content?.sha;

  /*
   * C141.10 REAL READBACK VERIFICATION
   *
   * Do not report a verified write until the file can be
   * read again from the target branch and its content matches.
   */
  const readback =
    await readGitHubFile({
      repo: repository,
      path,
      ref: branch,
    });

  if (!readback.success || !readback.data) {
    return {
      success: false,
      action: request.action,
      repository,
      branch,
      path,
      code: "READBACK_VERIFICATION_FAILED",
      error:
        "GitHub write succeeded, but readback verification failed.",
      write: {
        sha: contentSha,
        commitSha,
        commitUrl,
        readbackVerified: false,
      },
    };
  }

  const readbackContent =
    typeof readback.data.content === "string"
      ? readback.data.content
      : undefined;

  if (readbackContent !== request.content) {
    return {
      success: false,
      action: request.action,
      repository,
      branch,
      path,
      code: "READBACK_CONTENT_MISMATCH",
      error:
        "GitHub write succeeded, but readback content does not match the requested content.",
      write: {
        sha: contentSha,
        commitSha,
        commitUrl,
        readbackVerified: false,
      },
    };
  }

  return {
    success: true,
    action: "write",
    repository,
    branch,
    path,
    code: "GITHUB_WRITE_VERIFIED",
    write: {
      sha: contentSha,
      commitSha,
      commitUrl,
      readbackVerified: true,
    },
  };
}
