import "server-only";

import {
  getCommercialObjective,
} from "@/lib/commercial/operating-layer";

import {
  recordCommercialResult,
} from "@/lib/commercial/result-loop";

import {
  listPersistentTasks,
} from "@/lib/task/server-store";

export type LiveCommercialResultStatus =
  | "recorded"
  | "blocked"
  | "already-recorded";

export interface LiveCommercialResultInput {
  objectiveId: string;
  taskId: string;

  verified: boolean;

  revenue?: number;
  customers?: number;
  cost?: number;

  note?: string;
}

export interface LiveCommercialResultBridge {
  success: boolean;

  status: LiveCommercialResultStatus;

  objectiveId: string;
  taskId: string;

  outcomeId?: string;

  verified: boolean;

  revenueAdded: number;
  customersAdded: number;
  costAdded: number;

  revenueActual?: number;
  customerActual?: number;
  costActual?: number;

  outcomeProgress?: number;

  taskCompleted: boolean;
  milestoneCompleted: boolean;

  conclusion: string;
  nextStep: string;

  note?: string;

  timestamp: number;
}

function normalizeMoney(
  value: unknown,
): number {
  const number =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(number * 100) / 100,
  );
}

function normalizeCount(
  value: unknown,
): number {
  const number =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(number),
  );
}

/**
 * Records a verified commercial result
 * into the existing Commercial Result Loop.
 *
 * This function never fabricates verification
 * or commercial actuals.
 */
export async function recordLiveCommercialResult(
  input: LiveCommercialResultInput,
): Promise<LiveCommercialResultBridge> {
  const timestamp = Date.now();

  const revenue =
    normalizeMoney(
      input.revenue,
    );

  const customers =
    normalizeCount(
      input.customers,
    );

  const cost =
    normalizeMoney(
      input.cost,
    );

  if (!input.verified) {
    return {
      success: false,
      status: "blocked",
      objectiveId:
        input.objectiveId,
      taskId:
        input.taskId,
      verified: false,
      revenueAdded:
        revenue,
      customersAdded:
        customers,
      costAdded:
        cost,
      taskCompleted:
        false,
      milestoneCompleted:
        false,
      conclusion:
        "Commercial result was not verified, so no business actuals were mutated.",
      nextStep:
        "Verify the real commercial result before recording revenue, customers, or cost.",
      note:
        input.note,
      timestamp,
    };
  }

  const objective =
    await getCommercialObjective(
      input.objectiveId,
    );

  if (!objective) {
    return {
      success: false,
      status: "blocked",
      objectiveId:
        input.objectiveId,
      taskId:
        input.taskId,
      verified: true,
      revenueAdded:
        revenue,
      customersAdded:
        customers,
      costAdded:
        cost,
      taskCompleted:
        false,
      milestoneCompleted:
        false,
      conclusion:
        "The commercial objective could not be found.",
      nextStep:
        "Create or restore the commercial objective before recording the result.",
      note:
        input.note,
      timestamp,
    };
  }

  if (
    !objective.outcomeId ||
    !objective.taskId
  ) {
    return {
      success: false,
      status: "blocked",
      objectiveId:
        objective.id,
      taskId:
        input.taskId,
      verified: true,
      revenueAdded:
        revenue,
      customersAdded:
        customers,
      costAdded:
        cost,
      taskCompleted:
        false,
      milestoneCompleted:
        false,
      conclusion:
        "The commercial operating loop is not linked to an Outcome and execution Task.",
      nextStep:
        "Link the commercial objective to its operating loop before recording the result.",
      note:
        input.note,
      timestamp,
    };
  }

  if (
    objective.taskId !==
    input.taskId
  ) {
    return {
      success: false,
      status: "blocked",
      objectiveId:
        objective.id,
      taskId:
        input.taskId,
      outcomeId:
        objective.outcomeId,
      verified: true,
      revenueAdded:
        revenue,
      customersAdded:
        customers,
      costAdded:
        cost,
      taskCompleted:
        false,
      milestoneCompleted:
        false,
      conclusion:
        "The supplied task does not belong to the commercial objective.",
      nextStep:
        "Use the execution task linked to this commercial objective.",
      note:
        input.note,
      timestamp,
    };
  }

  const tasks =
    await listPersistentTasks();

  const task =
    tasks.find(
      (item) =>
        item.id ===
        input.taskId,
    );

  if (!task) {
    return {
      success: false,
      status: "blocked",
      objectiveId:
        objective.id,
      taskId:
        input.taskId,
      outcomeId:
        objective.outcomeId,
      verified: true,
      revenueAdded:
        revenue,
      customersAdded:
        customers,
      costAdded:
        cost,
      taskCompleted:
        false,
      milestoneCompleted:
        false,
      conclusion:
        "The execution task could not be found.",
      nextStep:
        "Restore or recreate the execution task before recording the result.",
      note:
        input.note,
      timestamp,
    };
  }

  /*
   * A completed task already represents
   * a recorded commercial result.
   */
  if (task.status === "done") {
    return {
      success: true,
      status: "already-recorded",
      objectiveId:
        objective.id,
      taskId:
        input.taskId,
      outcomeId:
        objective.outcomeId,
      verified: true,
      revenueAdded: 0,
      customersAdded: 0,
      costAdded: 0,
      revenueActual:
        objective.revenueActual,
      customerActual:
        objective.customerActual,
      costActual:
        objective.costActual,
      taskCompleted: true,
      milestoneCompleted: true,
      conclusion:
        "The commercial execution task has already been completed and its result has already been recorded.",
      nextStep:
        "Continue with the next commercial milestone instead of recording the same result again.",
      note:
        input.note,
      timestamp,
    };
  }

  try {
    const result =
      await recordCommercialResult({
        objectiveId:
          objective.id,
        taskId:
          input.taskId,
        verified: true,
        revenue,
        customers,
        cost,
        note:
          input.note,
      });

    return {
      success:
        result.success,
      status:
        result.success
          ? "recorded"
          : "blocked",
      objectiveId:
        result.objectiveId,
      taskId:
        result.taskId,
      outcomeId:
        result.outcomeId,
      verified:
        result.verified,
      revenueAdded:
        result.revenueAdded,
      customersAdded:
        result.customersAdded,
      costAdded:
        result.costAdded,
      revenueActual:
        result.revenueActual,
      customerActual:
        result.customerActual,
      costActual:
        result.costActual,
      outcomeProgress:
        result.outcomeProgress,
      taskCompleted:
        result.taskCompleted,
      milestoneCompleted:
        result.milestoneCompleted,
      conclusion:
        "The verified commercial result has been recorded in the AIOS operating loop.",
      nextStep:
        result.milestoneCompleted
          ? "Move to the next commercial milestone and execute the next validated action."
          : "Continue the current commercial objective and verify the next result.",
      note:
        input.note,
      timestamp:
        result.timestamp,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "COMMERCIAL_RESULT_RECORD_FAILED";

    return {
      success: false,
      status: "blocked",
      objectiveId:
        objective.id,
      taskId:
        input.taskId,
      outcomeId:
        objective.outcomeId,
      verified: true,
      revenueAdded:
        revenue,
      customersAdded:
        customers,
      costAdded:
        cost,
      taskCompleted:
        false,
      milestoneCompleted:
        false,
      conclusion:
        `The verified commercial result could not be recorded: ${message}.`,
      nextStep:
        "Inspect the commercial operating loop and retry only after the persistence issue is resolved.",
      note:
        input.note,
      timestamp,
    };
  }
}

export function isLiveCommercialResultRecorded(
  result:
    LiveCommercialResultBridge,
): boolean {
  return (
    result.success === true &&
    (
      result.status ===
        "recorded" ||
      result.status ===
        "already-recorded"
    ) &&
    result.verified === true &&
    result.taskCompleted === true
  );
}

export function buildLiveCommercialResultContext(
  result:
    LiveCommercialResultBridge,
): string {
  const lines = [
    "LIVE COMMERCIAL RESULT",
    `Status: ${result.status}`,
    `Verified: ${result.verified ? "YES" : "NO"}`,
    `Objective: ${result.objectiveId}`,
    `Task: ${result.taskId}`,
  ];

  if (result.outcomeId) {
    lines.push(
      `Outcome: ${result.outcomeId}`,
    );
  }

  lines.push(
    `Revenue Added: ${result.revenueAdded}`,
    `Customers Added: ${result.customersAdded}`,
    `Cost Added: ${result.costAdded}`,
  );

  if (
    typeof result.revenueActual ===
    "number"
  ) {
    lines.push(
      `Revenue Actual: ${result.revenueActual}`,
    );
  }

  if (
    typeof result.customerActual ===
    "number"
  ) {
    lines.push(
      `Customer Actual: ${result.customerActual}`,
    );
  }

  if (
    typeof result.costActual ===
    "number"
  ) {
    lines.push(
      `Cost Actual: ${result.costActual}`,
    );
  }

  if (
    typeof result.outcomeProgress ===
    "number"
  ) {
    lines.push(
      `Outcome Progress: ${result.outcomeProgress}%`,
    );
  }

  lines.push(
    `Task Completed: ${result.taskCompleted ? "YES" : "NO"}`,
    `Milestone Completed: ${result.milestoneCompleted ? "YES" : "NO"}`,
    `Conclusion: ${result.conclusion}`,
    `Next Step: ${result.nextStep}`,
  );

  if (result.note) {
    lines.push(
      `Note: ${result.note}`,
    );
  }

  return lines.join("\n");
}
