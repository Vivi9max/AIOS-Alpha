import "server-only";

import {
  getPersistentAutonomousDevelopmentTask,
  persistAutonomousDevelopmentTasks,
} from "@/lib/github/autonomous-development-control-plane";

export type AutonomousDevelopmentFinalizationResult = {
  ok: boolean;
  taskId: string;
  status:
    | "todo"
    | "running"
    | "completed"
    | "failed"
    | "blocked";
  phase:
    | "QUEUED"
    | "DISCOVERING"
    | "PLANNING"
    | "READING"
    | "GENERATING"
    | "WRITING"
    | "READBACK"
    | "BUILD"
    | "REPAIR"
    | "COMPLETED"
    | "BLOCKED";
  terminal: boolean;
  commitSha?: string;
  readbackVerified: boolean;
  verificationPassed: boolean;
  reason?: string;
};

const TERMINAL_STATUSES =
  new Set([
    "completed",
    "failed",
    "blocked",
  ]);

function isTerminalStatus(
  status: string,
): boolean {
  return TERMINAL_STATUSES.has(
    status,
  );
}

function buildResult(
  task: NonNullable<
    Awaited<
      ReturnType<
        typeof getPersistentAutonomousDevelopmentTask
      >
    >
  >,
  overrides?: {
    ok?: boolean;
    reason?: string;
  },
): AutonomousDevelopmentFinalizationResult {
  const terminal =
    isTerminalStatus(
      task.status,
    );

  return {
    ok:
      overrides?.ok ??
      terminal,
    taskId:
      task.id,
    status:
      task.status,
    phase:
      task.phase,
    terminal,
    commitSha:
      task.result?.commitSha ??
      task.commitSha,
    readbackVerified:
      task.result?.readbackVerified ===
      true,
    verificationPassed:
      task.result?.verificationPassed ===
      true,
    reason:
      overrides?.reason ??
      task.result?.reason ??
      task.reason,
  };
}

/**
 * Finalizes the durable state of an autonomous
 * development task.
 *
 * The Agent remains responsible for the actual
 * development execution and terminal transition.
 *
 * This module is responsible for:
 *
 * 1. Reading the authoritative persistent task.
 * 2. Persisting the latest merged state.
 * 3. Reading the state back from persistence.
 * 4. Refusing to report successful finalization
 *    while the task is still active.
 */
export async function finalizeAutonomousDevelopmentTask(
  taskId: string,
): Promise<AutonomousDevelopmentFinalizationResult> {
  const normalizedTaskId =
    taskId.trim();

  if (!normalizedTaskId) {
    return {
      ok: false,
      taskId: "",
      status: "failed",
      phase: "BLOCKED",
      terminal: true,
      readbackVerified: false,
      verificationPassed: false,
      reason:
        "AUTONOMOUS_DEVELOPMENT_TASK_ID_REQUIRED",
    };
  }

  const task =
    await getPersistentAutonomousDevelopmentTask(
      normalizedTaskId,
    );

  if (!task) {
    return {
      ok: false,
      taskId:
        normalizedTaskId,
      status: "failed",
      phase: "BLOCKED",
      terminal: true,
      readbackVerified: false,
      verificationPassed: false,
      reason:
        "AUTONOMOUS_DEVELOPMENT_TASK_NOT_FOUND",
    };
  }

  /*
   * The persistent control plane has already merged
   * the latest local and durable state.
   *
   * Force one awaited persistence boundary before
   * reading the final state back.
   */
  await persistAutonomousDevelopmentTasks();

  const finalizedTask =
    await getPersistentAutonomousDevelopmentTask(
      normalizedTaskId,
    );

  if (!finalizedTask) {
    return {
      ok: false,
      taskId:
        normalizedTaskId,
      status: "failed",
      phase: "BLOCKED",
      terminal: true,
      readbackVerified: false,
      verificationPassed: false,
      reason:
        "AUTONOMOUS_DEVELOPMENT_FINAL_STATE_UNAVAILABLE",
    };
  }

  /*
   * Never convert an active task into a successful
   * terminal receipt merely because persistence worked.
   *
   * This protects the distinction between:
   *
   * persisted = durable
   * terminal = execution finished
   */
  if (
    !isTerminalStatus(
      finalizedTask.status,
    )
  ) {
    return buildResult(
      finalizedTask,
      {
        ok: false,
        reason:
          "AUTONOMOUS_DEVELOPMENT_FINALIZATION_NON_TERMINAL",
      },
    );
  }

  return buildResult(
    finalizedTask,
  );
}

/**
 * Finalizes the execution after an Agent failure.
 *
 * The route may already have transitioned the task
 * to blocked. This function never invents a terminal
 * result and never upgrades a non-terminal task.
 */
export async function finalizeAutonomousDevelopmentFailure(
  taskId: string,
): Promise<AutonomousDevelopmentFinalizationResult> {
  const result =
    await finalizeAutonomousDevelopmentTask(
      taskId,
    );

  if (
    result.ok &&
    result.status ===
      "completed"
  ) {
    return {
      ...result,
      ok: false,
      reason:
        "AUTONOMOUS_DEVELOPMENT_FAILURE_FINALIZATION_FOUND_COMPLETED_TASK",
    };
  }

  return result;
}
