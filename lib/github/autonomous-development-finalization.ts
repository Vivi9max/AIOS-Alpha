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
  receiptValid: boolean;
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

function hasUsableCommitSha(
  commitSha?: string,
): boolean {
  const value =
    commitSha?.trim() ?? "";

  return /^[0-9a-f]{40}$/i.test(
    value,
  );
}

function getReceiptState(
  task: NonNullable<
    Awaited<
      ReturnType<
        typeof getPersistentAutonomousDevelopmentTask
      >
    >
  >,
) {
  const commitSha =
    task.result?.commitSha ??
    task.commitSha;

  const readbackVerified =
    task.result?.readbackVerified ===
    true;

  const verificationPassed =
    task.result?.verificationPassed ===
    true;

  const terminal =
    isTerminalStatus(
      task.status,
    );

  /*
   * A successful autonomous development receipt
   * requires all three independent execution proofs:
   *
   * 1. A real 40-character Git commit SHA.
   * 2. GitHub readback confirmation.
   * 3. Final build/deployment verification.
   *
   * Failed/blocked tasks remain terminal, but they
   * must never be represented as a successful receipt.
   */
  const receiptValid =
    terminal &&
    task.status ===
      "completed" &&
    hasUsableCommitSha(
      commitSha,
    ) &&
    readbackVerified &&
    verificationPassed;

  return {
    terminal,
    receiptValid,
    commitSha,
    readbackVerified,
    verificationPassed,
  };
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
  const receipt =
    getReceiptState(task);

  let reason =
    overrides?.reason ??
    task.result?.reason ??
    task.reason;

  if (
    !overrides?.reason &&
    task.status ===
      "completed" &&
    !receipt.receiptValid
  ) {
    const missing: string[] =
      [];

    if (
      !hasUsableCommitSha(
        receipt.commitSha,
      )
    ) {
      missing.push(
        "commitSha",
      );
    }

    if (
      !receipt.readbackVerified
    ) {
      missing.push(
        "readbackVerified",
      );
    }

    if (
      !receipt.verificationPassed
    ) {
      missing.push(
        "verificationPassed",
      );
    }

    reason =
      `AUTONOMOUS_DEVELOPMENT_COMPLETED_RECEIPT_INVALID:${missing.join(
        ",",
      )}`;
  }

  return {
    ok:
      overrides?.ok ??
      receipt.receiptValid,
    taskId:
      task.id,
    status:
      task.status,
    phase:
      task.phase,
    terminal:
      receipt.terminal,
    receiptValid:
      receipt.receiptValid,
    commitSha:
      receipt.commitSha,
    readbackVerified:
      receipt.readbackVerified,
    verificationPassed:
      receipt.verificationPassed,
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
 * A task can only receive:
 *
 * successful terminal receipt =
 * completed + valid commit SHA +
 * readback PASS + verification PASS
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

  const result =
    buildResult(
      finalizedTask,
    );

  /*
   * A completed task with incomplete evidence is not
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
   * Failed and blocked tasks are valid terminal states,
   * but they are never successful receipts.
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
 * Finalizes the execution after an Agent failure.
 *
 * A failure finalization can confirm a failed/blocked
 * terminal state, but it can never downgrade or reinterpret
 * a genuinely completed task as a failure.
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
