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

const TERMINAL_STATUSES = new Set([
  "completed",
  "failed",
  "blocked",
]);

function buildResult(
  task: NonNullable<
    Awaited<
      ReturnType<
        typeof getPersistentAutonomousDevelopmentTask
      >
    >
  >,
): AutonomousDevelopmentFinalizationResult {
  const terminal =
    TERMINAL_STATUSES.has(
      task.status,
    );

  return {
    ok: true,
    taskId: task.id,
    status: task.status,
    phase: task.phase,
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
      task.result?.reason ??
      task.reason,
  };
}

/**
 * Re-hydrates the task from the persistent control plane
 * and forces the latest in-memory terminal state to storage.
 *
 * This is intentionally separate from the large Agent.
 * The Agent remains responsible for execution and terminal
 * state transitions; this helper is responsible only for
 * making the final state durable before the background
 * execution finishes.
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
   * The persistent control plane has already merged the
   * newest local task state against durable storage.
   *
   * Persist one final awaited snapshot so the caller can
   * safely finish the background execution after this point.
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

  return buildResult(
    finalizedTask,
  );
}

/**
 * Finalizes the execution after an Agent failure.
 *
 * The route may already have transitioned the task to
 * blocked. This helper never invents a new terminal result.
 * It only persists and reads back the authoritative state.
 */
export async function finalizeAutonomousDevelopmentFailure(
  taskId: string,
): Promise<AutonomousDevelopmentFinalizationResult> {
  return finalizeAutonomousDevelopmentTask(
    taskId,
  );
}
