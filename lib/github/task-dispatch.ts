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

import { assertC14113AutonomousSafetyBeforeWrite } from "./c141.13-safety-runtime";

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

function normalizePath(path: string): string {
  return path.trim().replace(/^\/+/, "");
}

function isSafePath(path: string): boolean {
  if (!path) {
    return false;
  }

  if (path.includes("..")) {
    return false;
  }

  if (path.startsWith("/")) {
    return false;
  }

  if (path.includes("\\") || path.includes("\0")) {
    return false;
  }

  return true;
}

function getRepository(repo?: string): string {
  const repository = repo?.trim() || DEFAULT_REPOSITORY;

  if (repository !== DEFAULT_REPOSITORY) {
    throw new Error(
      "Repository is outside the Founder GitHub development boundary.",
    );
  }

  return repository;
}

function getBranch(branch?: string): string {
  const targetBranch = branch?.trim() || DEFAULT_BRANCH;

  if (targetBranch !== DEFAULT_BRANCH) {
    throw new Error(
      "Branch is outside the Founder GitHub development boundary.",
    );
  }

  return targetBranch;
}

function assertSafeWritePath(path: string): void {
  const normalizedPath = normalizePath(path);

  if (!isSafePath(normalizedPath)) {
    throw new Error("Unsafe GitHub write path.");
  }

  const blockedPaths = [
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
    ".env.preview",
    "node_modules/",
    ".git/",
  ];

  if (
    blockedPaths.some(
      (blockedPath) =>
        normalizedPath === blockedPath ||
        normalizedPath.startsWith(blockedPath),
    )
  ) {
    throw new Error(
      "Target path is blocked by the Founder GitHub write boundary.",
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
    action: request.action,
    repository,
    branch,
    path,
  };

  enforceFounderContract(task);
}

export async function dispatchGitHubTask(
  request: GitHubTaskRequest,
): Promise<GitHubTaskResult> {
  let repository: string;
  let branch: string;

  try {
    repository = getRepository(request.repo);
    branch = getBranch(request.branch);
  } catch (error) {
    return {
      success: false,
      action: request.action,
      repository: request.repo?.trim() || DEFAULT_REPOSITORY,
      branch: request.branch?.trim() || DEFAULT_BRANCH,
      path: normalizePath(request.path),
      code: "GITHUB_TARGET_REJECTED",
      error:
        error instanceof Error
          ? error.message
          : "GitHub target rejected.",
    };
  }

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
   * Founder Contract Runtime Gate.
   *
   * Contract enforcement must happen before any GitHub I/O.
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
  try {
    assertSafeWritePath(path);
  } catch (error) {
    return {
      success: false,
      action: request.action,
      repository,
      branch,
      path,
      code: "UNSAFE_GITHUB_WRITE_PATH",
      error:
        error instanceof Error
          ? error.message
          : "Unsafe GitHub write path.",
    };
  }

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
   * This establishes the pre-write state and obtains
   * the SHA required by GitHub for an update.
   */
  const existing =
    await readGitHubFile({
      repo: repository,
      path,
      ref: branch,
    });

  /*
   * C141.13 Autonomous Safety Runtime Gate.
   *
   * This gate must execute before writeGitHubFile.
   */
  const safetyCheck =
    await assertC14113AutonomousSafetyBeforeWrite({
      request,
      repository,
      branch,
      path,
      existingFileSha:
        existing.success && existing.data
          ? existing.data.sha
          : undefined,
      existingContent:
        existing.success && existing.data
          ? existing.data.content
          : undefined,
      contract: request.contract,
    });

  if (!safetyCheck.allowed) {
    return {
      success: false,
      action: request.action,
      repository,
      branch,
      path,
      code: "AUTONOMOUS_SAFETY_GATE_DENIED",
      error: safetyCheck.reason,
    };
  }

  const commitMessage =
    request.commitMessage?.trim() ||
    "feat(C141.10): founder contract governed GitHub write";

  /*
   * Real GitHub write.
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
   * REAL READBACK VERIFICATION.
   *
   * Do not report a verified write until the file is
   * read again from the target branch and content matches.
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
