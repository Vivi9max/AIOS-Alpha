import {
  getCommercialObjective,
  updateCommercialObjective,
} from "@/lib/commercial/operating-layer";

import {
  getOutcome,
  updateOutcomeMilestone,
} from "@/lib/outcome/store";

import {
  listPersistentTasks,
  updatePersistentTask,
} from "@/lib/task/server-store";

export interface CommercialResultInput {
  objectiveId: string;
  taskId: string;

  verified: boolean;

  revenue?: number;
  customers?: number;
  cost?: number;

  note?: string;
}

export interface CommercialResult {
  success: boolean;

  objectiveId: string;
  taskId: string;
  outcomeId: string;

  verified: boolean;

  revenueAdded: number;
  customersAdded: number;
  costAdded: number;

  revenueActual: number;
  customerActual: number;
  costActual: number;

  outcomeProgress: number;

  taskCompleted: boolean;
  milestoneCompleted: boolean;

  timestamp: number;
}

function normalizeMoney(
  value: unknown,
): number {
  const number =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(number)
  ) {
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

  if (
    !Number.isFinite(number)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(number),
  );
}

export async function recordCommercialResult(
  input: CommercialResultInput,
): Promise<CommercialResult> {
  if (!input.verified) {
    throw new Error(
      "COMMERCIAL_RESULT_NOT_VERIFIED",
    );
  }

  const objective =
    await getCommercialObjective(
      input.objectiveId,
    );

  if (!objective) {
    throw new Error(
      "COMMERCIAL_OBJECTIVE_NOT_FOUND",
    );
  }

  if (
    !objective.outcomeId ||
    !objective.taskId
  ) {
    throw new Error(
      "COMMERCIAL_OPERATING_LOOP_NOT_LINKED",
    );
  }

  if (
    objective.taskId !==
    input.taskId
  ) {
    throw new Error(
      "COMMERCIAL_TASK_NOT_LINKED",
    );
  }

  const outcome =
    await getOutcome(
      objective.outcomeId,
    );

  if (!outcome) {
    throw new Error(
      "COMMERCIAL_OUTCOME_NOT_FOUND",
    );
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
    throw new Error(
      "COMMERCIAL_TASK_NOT_FOUND",
    );
  }

  const revenueAdded =
    normalizeMoney(
      input.revenue,
    );

  const customersAdded =
    normalizeCount(
      input.customers,
    );

  const costAdded =
    normalizeMoney(
      input.cost,
    );

  /*
   * A verified result is the only point
   * where commercial actuals are mutated.
   */
  const updatedObjective =
    await updateCommercialObjective(
      objective.id,
      {
        revenueActual:
          objective.revenueActual +
          revenueAdded,

        customerActual:
          objective.customerActual +
          customersAdded,

        costActual:
          objective.costActual +
          costAdded,
      },
    );

  if (!updatedObjective) {
    throw new Error(
      "COMMERCIAL_RESULT_PERSIST_FAILED",
    );
  }

  /*
   * Mark the execution task as completed.
   */
  const completedTask =
    await updatePersistentTask(
      input.taskId,
      {
        status: "done",
      },
    );

  if (!completedTask) {
    throw new Error(
      "COMMERCIAL_TASK_COMPLETION_FAILED",
    );
  }

  /*
   * Complete the milestone that owns
   * this task.
   *
   * The Outcome store automatically
   * recalculates Outcome progress.
   */
  const milestone =
    outcome.milestones.find(
      (item) =>
        item.taskIds.includes(
          input.taskId,
        ),
    );

  let updatedOutcome =
    outcome;

  let milestoneCompleted =
    false;

  if (milestone) {
    const result =
      await updateOutcomeMilestone(
        outcome.id,
        milestone.id,
        {
          status:
            "completed",
        },
      );

    if (!result) {
      throw new Error(
        "COMMERCIAL_MILESTONE_COMPLETION_FAILED",
      );
    }

    updatedOutcome =
      result;

    milestoneCompleted =
      true;
  }

  return {
    success: true,

    objectiveId:
      objective.id,

    taskId:
      input.taskId,

    outcomeId:
      outcome.id,

    verified:
      true,

    revenueAdded,
    customersAdded,
    costAdded,

    revenueActual:
      updatedObjective.revenueActual,

    customerActual:
      updatedObjective.customerActual,

    costActual:
      updatedObjective.costActual,

    outcomeProgress:
      updatedOutcome.progress,

    taskCompleted:
      completedTask.status ===
      "done",

    milestoneCompleted,

    timestamp:
      Date.now(),
  };
}
