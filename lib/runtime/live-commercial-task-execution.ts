import "server-only";

import {
  updatePersistentTask,
  listPersistentTasks,
} from "@/lib/task/server-store";

import {
  bridgeLiveCommercialExecution,
  isLiveCommercialExecutionBridgeReady,
  type LiveCommercialExecutionBridgeResult,
} from "@/lib/runtime/live-commercial-execution-bridge";

import type {
  LiveDecision,
} from "@/lib/runtime/live-decision";

export type LiveCommercialTaskExecutionStatus =
  | "started"
  | "already-running"
  | "blocked"
  | "task-not-found"
  | "execution-failed";

export interface LiveCommercialTaskExecutionResult {
  success: boolean;

  status:
    | LiveCommercialTaskExecutionStatus;

  objectiveId: string;

  taskId: string | null;

  outcomeId: string | null;

  milestoneId: string | null;

  taskStatus:
    | "todo"
    | "doing"
    | "done"
    | null;

  bridge:
    | LiveCommercialExecutionBridgeResult
    | null;

  conclusion: string;

  nextStep: string;

  timestamp: number;
}

async function getTask(
  taskId: string,
) {
  const tasks =
    await listPersistentTasks();

  return (
    tasks.find(
      (task) =>
        task.id === taskId,
    ) ?? null
  );
}

export async function startLiveCommercialTaskExecution(
  objectiveId: string,
  decision: LiveDecision,
): Promise<LiveCommercialTaskExecutionResult> {
  const bridge =
    await bridgeLiveCommercialExecution(
      objectiveId,
      decision,
    );

  if (
    !isLiveCommercialExecutionBridgeReady(
      bridge,
    )
  ) {
    return {
      success: false,
      status: "blocked",
      objectiveId,
      taskId:
        bridge.operatingLoop?.taskId ??
        null,
      outcomeId:
        bridge.operatingLoop?.outcomeId ??
        null,
      milestoneId:
        bridge.operatingLoop?.milestoneId ??
        null,
      taskStatus: null,
      bridge,
      conclusion:
        bridge.conclusion,
      nextStep:
        bridge.nextStep,
      timestamp: Date.now(),
    };
  }

  /*
   * The readiness helper validates the
   * operating loop at runtime, but TypeScript
   * does not infer that property narrowing.
   *
   * Re-check explicitly before dereferencing.
   */
  const operatingLoop =
    bridge.operatingLoop;

  if (!operatingLoop) {
    return {
      success: false,
      status: "blocked",
      objectiveId,
      taskId: null,
      outcomeId: null,
      milestoneId: null,
      taskStatus: null,
      bridge,
      conclusion:
        "The commercial execution bridge reported ready, but no operating loop was available.",
      nextStep:
        "Repair the commercial operating loop link before execution.",
      timestamp: Date.now(),
    };
  }

  const taskId =
    operatingLoop.taskId;

  const task =
    await getTask(
      taskId,
    );

  if (!task) {
    return {
      success: false,
      status: "task-not-found",
      objectiveId,
      taskId,
      outcomeId:
        operatingLoop.outcomeId,
      milestoneId:
        operatingLoop.milestoneId,
      taskStatus: null,
      bridge,
      conclusion:
        "The commercial execution chain exists, but its persistent task could not be found.",
      nextStep:
        "Repair the persistent task link before execution.",
      timestamp: Date.now(),
    };
  }

  if (
    task.status === "done"
  ) {
    return {
      success: true,
      status: "already-running",
      objectiveId,
      taskId,
      outcomeId:
        operatingLoop.outcomeId,
      milestoneId:
        operatingLoop.milestoneId,
      taskStatus: "done",
      bridge,
      conclusion:
        "The linked commercial task has already been completed.",
      nextStep:
        "Record or verify the commercial result instead of executing the task again.",
      timestamp: Date.now(),
    };
  }

  if (
    task.status === "doing"
  ) {
    return {
      success: true,
      status: "already-running",
      objectiveId,
      taskId,
      outcomeId:
        operatingLoop.outcomeId,
      milestoneId:
        operatingLoop.milestoneId,
      taskStatus: "doing",
      bridge,
      conclusion:
        "The linked commercial task is already in execution.",
      nextStep:
        "Complete the external commercial action and return a verified result.",
      timestamp: Date.now(),
    };
  }

  try {
    const updatedTask =
      await updatePersistentTask(
        taskId,
        {
          status: "doing",
        },
      );

    if (!updatedTask) {
      return {
        success: false,
        status: "execution-failed",
        objectiveId,
        taskId,
        outcomeId:
          operatingLoop.outcomeId,
        milestoneId:
          operatingLoop.milestoneId,
        taskStatus: null,
        bridge,
        conclusion:
          "The commercial task could not be moved into execution.",
        nextStep:
          "Retry the task execution transition.",
        timestamp: Date.now(),
      };
    }

    return {
      success: true,
      status: "started",
      objectiveId,
      taskId,
      outcomeId:
        operatingLoop.outcomeId,
      milestoneId:
        operatingLoop.milestoneId,
      taskStatus: "doing",
      bridge,
      conclusion:
        "The verified commercial decision has been converted into an active execution task.",
      nextStep:
        "Perform the external commercial action and record only the verified business result.",
      timestamp: Date.now(),
    };
  } catch {
    return {
      success: false,
      status: "execution-failed",
      objectiveId,
      taskId,
      outcomeId:
        operatingLoop.outcomeId,
      milestoneId:
        operatingLoop.milestoneId,
      taskStatus:
        task.status,
      bridge,
      conclusion:
        "The commercial task exists but could not be started.",
      nextStep:
        "Retry the execution transition after the task store is available.",
      timestamp: Date.now(),
    };
  }
}

export function isLiveCommercialTaskExecutionStarted(
  result: LiveCommercialTaskExecutionResult,
): boolean {
  return (
    result.success === true &&
    (
      result.status === "started" ||
      result.status === "already-running"
    ) &&
    Boolean(result.taskId) &&
    (
      result.taskStatus === "doing" ||
      result.taskStatus === "done"
    )
  );
}

export function buildLiveCommercialTaskExecutionContext(
  result: LiveCommercialTaskExecutionResult,
): string {
  return [
    "AIOS LIVE COMMERCIAL TASK EXECUTION",
    "",
    `STATUS: ${result.status}`,
    `OBJECTIVE ID: ${result.objectiveId}`,
    `TASK ID: ${result.taskId ?? "NOT LINKED"}`,
    `OUTCOME ID: ${result.outcomeId ?? "NOT LINKED"}`,
    `MILESTONE ID: ${result.milestoneId ?? "NOT LINKED"}`,
    `TASK STATUS: ${result.taskStatus ?? "UNKNOWN"}`,
    "",
    `CONCLUSION: ${result.conclusion}`,
    `NEXT STEP: ${result.nextStep}`,
  ].join("\n");
}
