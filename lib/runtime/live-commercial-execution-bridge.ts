import "server-only";

import {
  getCommercialObjective,
} from "@/lib/commercial/operating-layer";

import {
  ensureCommercialOperatingLoop,
  type CommercialOperatingLoopResult,
} from "@/lib/commercial/operating-loop";

import {
  buildLiveCommercialExecutionPlan,
  isLiveCommercialExecutionReady,
  type LiveCommercialExecutionPlan,
} from "@/lib/runtime/live-commercial-execution";

import type {
  LiveDecision,
} from "@/lib/runtime/live-decision";

export interface LiveCommercialExecutionBridgeResult {
  success: boolean;

  status:
    | "linked"
    | "blocked"
    | "objective-not-found"
    | "execution-loop-failed";

  objectiveId: string;

  plan: LiveCommercialExecutionPlan | null;

  operatingLoop:
    | CommercialOperatingLoopResult
    | null;

  conclusion: string;

  nextStep: string;

  timestamp: number;
}

export async function bridgeLiveCommercialExecution(
  objectiveId: string,
  decision: LiveDecision,
): Promise<LiveCommercialExecutionBridgeResult> {
  const objective =
    await getCommercialObjective(
      objectiveId,
    );

  if (!objective) {
    return {
      success: false,
      status: "objective-not-found",
      objectiveId,
      plan: null,
      operatingLoop: null,
      conclusion:
        "The commercial objective could not be found.",
      nextStep:
        "Create or select a valid commercial objective before execution.",
      timestamp: Date.now(),
    };
  }

  const plan =
    buildLiveCommercialExecutionPlan(
      objective,
      decision,
    );

  if (
    !isLiveCommercialExecutionReady(
      plan,
    )
  ) {
    return {
      success: false,
      status: "blocked",
      objectiveId,
      plan,
      operatingLoop: null,
      conclusion:
        plan.conclusion,
      nextStep:
        plan.nextStep,
      timestamp: Date.now(),
    };
  }

  let operatingLoop:
    | CommercialOperatingLoopResult
    | null = null;

  try {
    operatingLoop =
      await ensureCommercialOperatingLoop(
        objective.id,
      );
  } catch {
    return {
      success: false,
      status: "execution-loop-failed",
      objectiveId,
      plan,
      operatingLoop: null,
      conclusion:
        "The live commercial decision is ready, but the commercial execution loop could not be linked.",
      nextStep:
        "Retry the commercial execution bridge after the Objective, Outcome and Task stores are available.",
      timestamp: Date.now(),
    };
  }

  if (
    !operatingLoop.success ||
    !operatingLoop.outcomeId ||
    !operatingLoop.taskId
  ) {
    return {
      success: false,
      status: "execution-loop-failed",
      objectiveId,
      plan,
      operatingLoop,
      conclusion:
        "The commercial execution plan is valid, but the execution chain was not successfully linked.",
      nextStep:
        "Retry the commercial operating loop linkage.",
      timestamp: Date.now(),
    };
  }

  return {
    success: true,
    status: "linked",
    objectiveId,
    plan,
    operatingLoop,
    conclusion:
      "Verified live intelligence has been converted into a persistent commercial execution chain.",
    nextStep:
      "Execute the linked commercial task and record the verified business result.",
    timestamp: Date.now(),
  };
}

export function isLiveCommercialExecutionBridgeReady(
  result: LiveCommercialExecutionBridgeResult,
): boolean {
  return (
    result.success === true &&
    result.status === "linked" &&
    result.plan !== null &&
    result.operatingLoop !== null &&
    result.operatingLoop.success === true &&
    Boolean(
      result.operatingLoop.outcomeId,
    ) &&
    Boolean(
      result.operatingLoop.taskId,
    )
  );
}

export function buildLiveCommercialExecutionBridgeContext(
  result: LiveCommercialExecutionBridgeResult,
): string {
  if (!result.plan) {
    return [
      "AIOS LIVE COMMERCIAL EXECUTION BRIDGE",
      "",
      `STATUS: ${result.status}`,
      `OBJECTIVE ID: ${result.objectiveId}`,
      "",
      `CONCLUSION: ${result.conclusion}`,
      `NEXT STEP: ${result.nextStep}`,
    ].join("\n");
  }

  return [
    "AIOS LIVE COMMERCIAL EXECUTION BRIDGE",
    "",
    `STATUS: ${result.status}`,
    `OBJECTIVE ID: ${result.objectiveId}`,
    `OBJECTIVE: ${result.plan.objectiveTitle}`,
    `STAGE: ${result.plan.stage}`,
    `VERIFIED: ${result.plan.verified ? "YES" : "NO"}`,
    `EVIDENCE COUNT: ${result.plan.evidenceCount}`,
    "",
    `CONCLUSION: ${result.conclusion}`,
    "",
    `PRIMARY ACTION: ${
      result.plan.action?.action ??
      "NONE"
    }`,
    "",
    `OUTCOME ID: ${
      result.operatingLoop?.outcomeId ??
      "NOT LINKED"
    }`,
    `TASK ID: ${
      result.operatingLoop?.taskId ??
      "NOT LINKED"
    }`,
    `MILESTONE ID: ${
      result.operatingLoop?.milestoneId ??
      "NOT LINKED"
    }`,
    "",
    `NEXT STEP: ${result.nextStep}`,
  ].join("\n");
}
