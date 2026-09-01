// lib/github/c141.13-safety-runtime.ts
import type { GitHubTaskRequest } from "./task-dispatch";
import type { FounderDevelopmentContract } from "./founder-development-contract";

// 导入已存在的C141.13 Safety Gate，假设导出函数：evaluateFounderAutonomousSafety
import { evaluateFounderAutonomousSafety } from "./c141.13-safety-gate";

export type C14113SafetyCheckContext = {
  request: GitHubTaskRequest;
  repository: string;
  branch: string;
  path: string;
  existingFileSha?: string;
  existingContent?: string;
  contract: FounderDevelopmentContract;
};

export type C14113SafetyResult = {
  allowed: boolean;
  reason: string;
};

/**
 * C141.13 Runtime Adapter
 * 仅用于 write 路径，在 writeGitHubFile 之前执行硬拦截
 */
export async function assertC14113AutonomousSafetyBeforeWrite(
  ctx: C14113SafetyCheckContext
): Promise<C14113SafetyResult> {
  const gateResult = await evaluateFounderAutonomousSafety(ctx);

  if (!gateResult.allowed) {
    return {
      allowed: false,
      reason: gateResult.reason ?? "C141.13 Autonomous Safety Gate denied write operation",
    };
  }

  return { allowed: true, reason: "C141.13 Safety Gate passed" };
}
