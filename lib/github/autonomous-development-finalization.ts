import "server-only";

import {
  getPersistentAutonomousDevelopmentTask,
  persistAutonomousDevelopmentTasks,
} from "@/lib/github/autonomous-development-control-plane";
import {
  buildAutonomousDevelopmentReceipt,
  getAutonomousDevelopmentReceiptFailureReason,
} from "@/lib/github/autonomous-development-receipt";

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
  receiptValid: boolean;
  commitSha?: string;
  resultCommitSha?: string;
  readbackVerified: boolean;
  verificationPassed: boolean;
  commitShaConsistent: boolean;
  missingEvidence: string[];
  reason?: string;
};

type PersistentTask = NonNullable<
  Awaited<
    ReturnType<
      typeof getPersistentAutonomousDevelopmentTask
    >
  >
>;

function getReceiptState(
  task: PersistentTask,
) {
  const taskCommitSha =
    task.commitSha?.trim() ||
    undefined;

  const resultCommitSha =
    task.result?.commitSha?.trim() ||
    undefined;

  const commitSha =
    taskCommitSha ??
    resultCommitSha;

  const readbackVerified =
    task.result?.readbackVerified ===
    true;

  const verificationPassed =
    task.result?.verificationPassed ===
    true;

  return buildAutonomousDevelopmentReceipt({
    status:
      task.status,
    commitSha,
    resultCommitSha,
    readbackVerified,
    verificationPassed,
  });
}

function buildResult(
  task: PersistentTask,
  overrides?: {
    ok?: boolean;
    reason?: string;
  },
): AutonomousDevelopmentFinalizationResult {
  const receipt =
    getReceiptState(task);

  const canonicalFailureReason =
    getAutonomousDevelopmentReceiptFailureReason(
      receipt,
    );

  const reason =
    overrides?.reason ??
    task.result?.reason ??
    task.reason ??
    canonicalFailureReason;

  return {
    ok:
      overrides?.ok ??
      receipt.successful,

    taskId:
      task.id,

    status:
      task.status,

    phase:
      task.phase,

    terminal:
      receipt.terminal,

    receiptValid:
      receipt.valid,

    commitSha:
      receipt.commitSha,

    resultCommitSha:
      receipt.resultCommitSha,

    readbackVerified:
      receipt.readbackVerified,

    verificationPassed:
      receipt.verificationPassed,

    commitShaConsistent:
      receipt.commitShaConsistent,

    missingEvidence:
      receipt.missingEvidence,

    reason,
  };
}

/**
 * Finalizes the durable state of an autonomous
 * development task.
 *
 * The Agent remains responsible for:
 *
 * - repository discovery
 * - planning
 * - patch generation
 * - safety validation
 * - GitHub write
 * - commit
 * - readback
 * - Vercel verification
 *
 * This module is the final evidence boundary.
 *
 * Successful completion requires the canonical receipt:
 *
 * completed +
 * valid 40-character Git commit SHA +
 * result commit SHA evidence +
 * matching commit evidence +
 * GitHub readback PASS +
 * final verification PASS
 *
 * Persistence alone never becomes proof of completion.
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
      receiptValid: false,
      readbackVerified: false,
      verificationPassed: false,
      commitShaConsistent: false,
      missingEvidence: [
        "taskId",
      ],
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
      receiptValid: false,
      readbackVerified: false,
      verificationPassed: false,
      commitShaConsistent: false,
      missingEvidence: [
        "task",
      ],
      reason:
        "AUTONOMOUS_DEVELOPMENT_TASK_NOT_FOUND",
    };
  }

  /*
   * Establish an awaited persistence boundary before
   * reading the final task state back.
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
      receiptValid: false,
      readbackVerified: false,
      verificationPassed: false,
      commitShaConsistent: false,
      missingEvidence: [
        "finalTask",
      ],
      reason:
        "AUTONOMOUS_DEVELOPMENT_FINAL_STATE_UNAVAILABLE",
    };
  }

  /*
   * Persistence is not completion.
   *
   * An active task must remain non-terminal even when
   * its latest state has been durably persisted.
   */
  if (
    !isTerminalTaskStatus(
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

  const result =
    buildResult(
      finalizedTask,
    );

  /*
   * A completed task with incomplete evidence is never
   * promoted to a successful receipt.
   */
  if (
    finalizedTask.status ===
      "completed" &&
    !result.receiptValid
  ) {
    return {
      ...result,
      ok: false,
    };
  }

  /*
   * Failed and blocked tasks are terminal, but they are
   * never successful receipts.
   */
  if (
    finalizedTask.status !==
    "completed"
  ) {
    return {
      ...result,
      ok: false,
      receiptValid: false,
    };
  }

  return result;
}

/**
 * Finalizes execution after an Agent failure.
 *
 * A failure finalization can confirm a failed/blocked
 * terminal state, but it can never reinterpret a genuinely
 * completed task as a failure.
 */
export async function finalizeAutonomousDevelopmentFailure(
  taskId: string,
): Promise<AutonomousDevelopmentFinalizationResult> {
  const result =
    await finalizeAutonomousDevelopmentTask(
      taskId,
    );

  if (
    result.status ===
      "completed"
  ) {
    return {
      ...result,
      ok: false,
      receiptValid:
        result.receiptValid,
      reason:
        result.receiptValid
          ? "AUTONOMOUS_DEVELOPMENT_FAILURE_FINALIZATION_FOUND_COMPLETED_TASK"
          : result.reason ??
            "AUTONOMOUS_DEVELOPMENT_COMPLETED_RECEIPT_INVALID",
    };
  }

  return {
    ...result,
    ok: false,
    receiptValid: false,
  };
}

function isTerminalTaskStatus(
  status: PersistentTask["status"],
) {
  return (
    status === "completed" ||
    status === "failed" ||
    status === "blocked"
  );
}
