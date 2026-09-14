import "server-only";

import type {
  LiveDecision,
} from "@/lib/runtime/live-decision";

import {
  bridgeLiveCommercialExecution,
  isLiveCommercialExecutionBridgeReady,
  type LiveCommercialExecutionBridgeResult,
} from "@/lib/runtime/live-commercial-execution-bridge";

import {
  startLiveCommercialTaskExecution,
  isLiveCommercialTaskExecutionStarted,
  type LiveCommercialTaskExecutionResult,
} from "@/lib/runtime/live-commercial-task-execution";

import {
  recordLiveCommercialResult,
  isLiveCommercialResultRecorded,
  type LiveCommercialResultBridge,
  type LiveCommercialResultInput,
} from "@/lib/runtime/live-commercial-result-bridge";

export type LiveCommercialRuntimeStatus =
  | "ready"
  | "blocked"
  | "task-started"
  | "already-running"
  | "result-recorded"
  | "already-recorded";

export interface LiveCommercialRuntimeInput {
  objectiveId: string;
  decision: LiveDecision;

  result?: LiveCommercialResultInput;
}

export interface LiveCommercialRuntimeResult {
  success: boolean;

  status: LiveCommercialRuntimeStatus;

  objectiveId: string;

  bridge:
    | LiveCommercialExecutionBridgeResult
    | null;

  execution:
    | LiveCommercialTaskExecutionResult
    | null;

  result:
    | LiveCommercialResultBridge
    | null;

  taskId: string | null;

  outcomeId: string | null;

  milestoneId: string | null;

  conclusion: string;

  nextStep: string;

  timestamp: number;
}

/**
 * Unified commercial runtime.
 *
 * Pipeline:
 *
 * Live Intelligence
 *       ↓
 * Decision
 *       ↓
 * Commercial Objective
 *       ↓
 * Execution Bridge
 *       ↓
 * Persistent Task
 *       ↓
 * Verified Result
 *
 * This runtime does not fabricate external business
 * actions or commercial results.
 *
 * External actions remain outside this layer until
 * a real execution adapter is connected.
 */
export async function executeLiveCommercialRuntime(
  input: LiveCommercialRuntimeInput,
): Promise<LiveCommercialRuntimeResult> {
  const timestamp = Date.now();

  const bridge =
    await bridgeLiveCommercialExecution(
      input.objectiveId,
      input.decision,
    );

  if (
    !isLiveCommercialExecutionBridgeReady(
      bridge,
    )
  ) {
    return {
      success: false,
      status: "blocked",
      objectiveId:
        input.objectiveId,
      bridge,
      execution: null,
      result: null,
      taskId:
        bridge.operatingLoop?.taskId ??
        null,
      outcomeId:
        bridge.operatingLoop?.outcomeId ??
        null,
      milestoneId:
        bridge.operatingLoop?.milestoneId ??
        null,
      conclusion:
        bridge.conclusion,
      nextStep:
        bridge.nextStep,
      timestamp,
    };
  }

  const execution =
    await startLiveCommercialTaskExecution(
      input.objectiveId,
      input.decision,
    );

  if (
    !isLiveCommercialTaskExecutionStarted(
      execution,
    )
  ) {
    return {
      success: false,
      status: "blocked",
      objectiveId:
        input.objectiveId,
      bridge,
      execution,
      result: null,
      taskId:
        execution.taskId,
      outcomeId:
        execution.outcomeId,
      milestoneId:
        execution.milestoneId,
      conclusion:
        execution.conclusion,
      nextStep:
        execution.nextStep,
      timestamp,
    };
  }

  /*
   * No result supplied means the internal AIOS
   * execution task is ready/active, but the real
   * external commercial action has not yet been
   * verified.
   */
  if (!input.result) {
    const status =
      execution.status ===
      "already-running"
        ? "already-running"
        : "task-started";

    return {
      success: true,
      status,
      objectiveId:
        input.objectiveId,
      bridge,
      execution,
      result: null,
      taskId:
        execution.taskId,
      outcomeId:
        execution.outcomeId,
      milestoneId:
        execution.milestoneId,
      conclusion:
        execution.conclusion,
      nextStep:
        "Perform the external commercial action and submit only the verified business result.",
      timestamp,
    };
  }

  /*
   * A supplied result must belong to the same
   * objective and active task.
   */
  if (
    input.result.objectiveId !==
    input.objectiveId
  ) {
    return {
      success: false,
      status: "blocked",
      objectiveId:
        input.objectiveId,
      bridge,
      execution,
      result: null,
      taskId:
        execution.taskId,
      outcomeId:
        execution.outcomeId,
      milestoneId:
        execution.milestoneId,
      conclusion:
        "The supplied commercial result belongs to a different objective.",
      nextStep:
        "Submit the verified result against the active commercial objective.",
      timestamp,
    };
  }

  if (
    execution.taskId &&
    input.result.taskId !==
      execution.taskId
  ) {
    return {
      success: false,
      status: "blocked",
      objectiveId:
        input.objectiveId,
      bridge,
      execution,
      result: null,
      taskId:
        execution.taskId,
      outcomeId:
        execution.outcomeId,
      milestoneId:
        execution.milestoneId,
      conclusion:
        "The supplied commercial result does not belong to the active execution task.",
      nextStep:
        "Use the task ID created by the commercial runtime.",
      timestamp,
    };
  }

  const result =
    await recordLiveCommercialResult(
      input.result,
    );

  if (
    !isLiveCommercialResultRecorded(
      result,
    )
  ) {
    return {
      success: false,
      status: "blocked",
      objectiveId:
        input.objectiveId,
      bridge,
      execution,
      result,
      taskId:
        execution.taskId,
      outcomeId:
        execution.outcomeId,
      milestoneId:
        execution.milestoneId,
      conclusion:
        result.conclusion,
      nextStep:
        result.nextStep,
      timestamp,
    };
  }

  const status =
    result.status ===
    "already-recorded"
      ? "already-recorded"
      : "result-recorded";

  return {
    success: true,
    status,
    objectiveId:
      input.objectiveId,
    bridge,
    execution,
    result,
    taskId:
      result.taskId,
    outcomeId:
      result.outcomeId ??
      execution.outcomeId,
    milestoneId:
      execution.milestoneId,
    conclusion:
      result.conclusion,
    nextStep:
      result.nextStep,
    timestamp:
      result.timestamp,
  };
}

export function isLiveCommercialRuntimeReady(
  result: LiveCommercialRuntimeResult,
): boolean {
  if (!result.success) {
    return false;
  }

  if (
    result.status ===
      "task-started" ||
    result.status ===
      "already-running"
  ) {
    return (
      Boolean(result.taskId) &&
      Boolean(result.outcomeId) &&
      result.execution !== null
    );
  }

  if (
    result.status ===
      "result-recorded" ||
    result.status ===
      "already-recorded"
  ) {
    return (
      Boolean(result.taskId) &&
      Boolean(result.outcomeId) &&
      result.result !== null &&
      result.result.verified === true &&
      result.result.taskCompleted === true
    );
  }

  return false;
}

export function buildLiveCommercialRuntimeContext(
  result: LiveCommercialRuntimeResult,
): string {
  const lines = [
    "AIOS LIVE COMMERCIAL RUNTIME",
    "",
    "PIPELINE:",
    "LIVE INTELLIGENCE -> DECISION -> OBJECTIVE -> TASK -> VERIFIED RESULT",
    "",
    `STATUS: ${result.status}`,
    `SUCCESS: ${result.success ? "YES" : "NO"}`,
    `OBJECTIVE ID: ${result.objectiveId}`,
    `TASK ID: ${result.taskId ?? "NOT LINKED"}`,
    `OUTCOME ID: ${result.outcomeId ?? "NOT LINKED"}`,
    `MILESTONE ID: ${result.milestoneId ?? "NOT LINKED"}`,
    "",
    `CONCLUSION: ${result.conclusion}`,
    `NEXT STEP: ${result.nextStep}`,
  ];

  if (result.bridge) {
    lines.push(
      "",
      `EXECUTION BRIDGE: ${result.bridge.status}`,
      `EVIDENCE COUNT: ${
        result.bridge.plan?.evidenceCount ??
        0
      }`,
      `DECISION VERIFIED: ${
        result.bridge.plan?.verified
          ? "YES"
          : "NO"
      }`,
    );
  }

  if (result.execution) {
    lines.push(
      "",
      `TASK EXECUTION: ${result.execution.status}`,
      `TASK STATUS: ${
        result.execution.taskStatus ??
        "UNKNOWN"
      }`,
    );
  }

  if (result.result) {
    lines.push(
      "",
      `RESULT STATUS: ${result.result.status}`,
      `RESULT VERIFIED: ${
        result.result.verified
          ? "YES"
          : "NO"
      }`,
      `REVENUE ADDED: ${result.result.revenueAdded}`,
      `CUSTOMERS ADDED: ${result.result.customersAdded}`,
      `COST ADDED: ${result.result.costAdded}`,
      `TASK COMPLETED: ${
        result.result.taskCompleted
          ? "YES"
          : "NO"
      }`,
      `MILESTONE COMPLETED: ${
        result.result.milestoneCompleted
          ? "YES"
          : "NO"
      }`,
    );
  }

  return lines.join("\n");
}
