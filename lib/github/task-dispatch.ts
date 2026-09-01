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

// ==== C141.13 新增导入 ====
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

// ……… 原有全部常量、工具函数（normalizePath / isSafePath / getRepository / getBranch / assertSafeWritePath / enforceContract）保持原样不变 ………

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

  // ===================== C141.13 安全门接入点 START =====================
  // 【关键】在 writeGitHubFile 调用之前执行；已有文件信息传入安全门
  const safetyCheck = await assertC14113AutonomousSafetyBeforeWrite({
    request,
    repository,
    branch,
    path,
    existingFileSha: existing.success && existing.data ? existing.data.sha : undefined,
    existingContent: existing.success && existing.data ? existing.data.content : undefined,
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
  // ===================== C141.13 安全门接入点 END =====================

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
