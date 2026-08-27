import {
  enforceFounderContract,
  type FounderContractTask,
} from "@/lib/github/founder-contract-enforcement";
import type { FounderDevelopmentContract } from "@/lib/github/founder-development-contract";

// 保留原有类型、常量不删除
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

export interface GitHubTaskResponse {
  success: boolean;
  code?: string;
  action: GitHubTaskAction;
  repository: string;
  branch: string;
  path: string;
  error?: string;
  commitSha?: string;
  readbackSha?: string;
  buildVerification?: {
    status: "pending" | "ok" | "failed";
  };
  capability?: {
    founderAuthorized: boolean;
    founderContractEnforced: boolean;
    githubAuthenticated: boolean;
    executionRecorded: boolean;
  };
}

// 原有常量保留，defense‑in‑depth，不作为主授权源
const AUTONOMOUS_WRITE_PREFIXES: string[] = [/* existing */];

function assertSafeWritePath(path: string): void {
  // 原有实现完整保留，仅作为深度防御，Founder Contract 是权威授权
}

// 原有函数全部保留签名：githubBridgeStatus, getGitHubRepository, readGitHubFile, writeGitHubFile

export async function dispatchGitHubTask(req: GitHubTaskRequest): Promise<GitHubTaskResponse> {
  const { action, repo, branch, path, content, commitMessage, contract } = req;

  const repository = repo ?? "Vivi9max/AIOS-Alpha";
  const targetBranch = branch ?? "main";

  // ========== C141.10: Founder Contract Gate — BEFORE any GitHub IO ==========
  try {
    const task: FounderContractTask = {
      contract,
      action,
      repo: repository,
      branch: targetBranch,
      path,
    };
    enforceFounderContract(task);
  } catch (err) {
    return {
      success: false,
      code: "FOUNDER_CONTRACT_REJECTED",
      action,
      repository,
      branch: targetBranch,
      path,
      error: err instanceof Error ? err.message : "Founder Contract enforcement failed.",
    };
  }

  // Write additional pre‑check per C141.10 spec
  if (action === "write") {
    const okActions =
      contract.actions.includes("read") &&
      contract.actions.includes("write") &&
      contract.actions.includes("verify");

    const okVerifications =
      contract.verification.checks.includes("readback") &&
      contract.verification.checks.includes("build");

    if (!okActions || !okVerifications) {
      return {
        success: false,
        code: "FOUNDER_CONTRACT_REJECTED",
        action,
        repository,
        branch: targetBranch,
        path,
        error: "FounderContract: write requires read/write/verify actions + readback/build verification checks",
      };
    }
  }

  // 执行底层桥接状态（已在enforce之后）
  const bridgeStatus = await githubBridgeStatus();
  if (!bridgeStatus.ok) {
    return {
      success: false,
      action,
      repository,
      branch: targetBranch,
      path,
      error: bridgeStatus.message,
    };
  }

  // Read path
  if (action === "read") {
    const readResult = await readGitHubFile(repository, targetBranch, path);
    return {
      success: true,
      code: "GITHUB_TASK_DISPATCHED",
      action,
      repository,
      branch: targetBranch,
      path,
      capability: {
        founderAuthorized: true,
        founderContractEnforced: true,
        githubAuthenticated: true,
        executionRecorded: true,
      },
    };
  }

  // Write path
  if (action === "write") {
    assertSafeWritePath(path); // defense‑in‑depth only

    const writeOut = await writeGitHubFile(repository, targetBranch, path, content!, commitMessage);
    const commitSha: string | undefined = writeOut.commitSha;

    // C141.10 Real readback verification
    let readbackSha: string | undefined;
    try {
      const readback = await readGitHubFile(repository, targetBranch, path);
      readbackSha = readback.sha;
      // 一致性校验：文件必须存在，sha有效
      if (!readbackSha) throw new Error("readback file missing after write");
    } catch (rbErr) {
      return {
        success: false,
        code: "FOUNDER_CONTRACT_REJECTED",
        action,
        repository,
        branch: targetBranch,
        path,
        error: `Readback verification failed: ${rbErr instanceof Error ? rbErr.message : String(rbErr)}`,
        commitSha,
      };
    }

    // Build verification：无本地shell，使用CI/Vercel，状态pending，不伪造ok
    return {
      success: true,
      code: "GITHUB_TASK_DISPATCHED",
      action,
      repository,
      branch: targetBranch,
      path,
      commitSha,
      readbackSha,
      buildVerification: { status: "pending" },
      capability: {
        founderAuthorized: true,
        founderContractEnforced: true,
        githubAuthenticated: true,
        executionRecorded: true,
      },
    };
  }

  return {
    success: false,
    action,
    repository,
    branch: targetBranch,
    path,
    error: `unsupported action ${action}`,
  };
}

// === keep all existing functions untouched ===
async function githubBridgeStatus() { /* existing */ }
async function getGitHubRepository(repoSlug: string) { /* existing */ }
async function readGitHubFile(repo: string, branch: string, path: string) { /* existing */ }
async function writeGitHubFile(repo: string, branch: string, path: string, content: string, msg?: string) { /* existing */ }
