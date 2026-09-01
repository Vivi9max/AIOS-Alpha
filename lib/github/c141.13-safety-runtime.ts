import "server-only";

import type { GitHubTaskRequest } from "./task-dispatch";
import type { FounderDevelopmentContract } from "./founder-development-contract";
import { evaluateFounderAutonomousSafety } from "./founder-autonomous-safety-gate";

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
 * C141.13 Runtime Adapter.
 *
 * Hard pre-write boundary for Founder autonomous GitHub writes.
 * Delegates to the canonical Founder Autonomous Safety Gate.
 */
export async function assertC14113AutonomousSafetyBeforeWrite(
  ctx: C14113SafetyCheckContext,
): Promise<C14113SafetyResult> {
  const audit = evaluateFounderAutonomousSafety({
    repository: ctx.repository,
    branch: ctx.branch,
    path: ctx.path,
    currentContent: ctx.existingContent ?? "",
    proposedContent: ctx.request.content ?? "",
    objective: ctx.contract.objective,
  });

  if (audit.decision !== "allow") {
    return {
      allowed: false,
      reason:
        `C141.13 Safety Gate denied autonomous write: ` +
        `${audit.blockers.join(", ") || "safety-gate-deny"}`,
    };
  }

  return {
    allowed: true,
    reason: "C141.13 Safety Gate passed",
  };
}
