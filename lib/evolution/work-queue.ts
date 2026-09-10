import {
  listOutcomes,
  updateOutcome,
  updateOutcomeMilestone,
} from "@/lib/outcome/store";

import {
  createPersistentTask,
  findDuplicateActiveTask,
  listPersistentTasks,
} from "@/lib/task/server-store";

import type {
  Task,
} from "@/lib/task/types";

export type AutonomousWorkQueueStatus =
  | "ready"
  | "created"
  | "idle";

export interface AutonomousWorkQueueResult {
  status: AutonomousWorkQueueStatus;
  taskId: string | null;
  taskTitle: string | null;
  outcomeId: string | null;
  milestoneId: string | null;
  created: boolean;
  message: string;
}

function findTaskById(
  tasks: Task[],
  taskId: string,
): Task | null {
  return (
    tasks.find(
      (task) => task.id === taskId,
    ) ?? null
  );
}

/**
 * C142.11 — Bounded Autonomous Work Queue
 *
 * Purpose:
 * - provide Heartbeat with exactly one valid next work item
 * - continue an already active Outcome
 * - never invent arbitrary autonomous work
 * - preserve the single-doing-task boundary
 * - advance completed milestones before materializing the next one
 *
 * Queue priority:
 *
 * 1. existing doing task
 * 2. existing todo task
 * 3. completed linked milestone -> mark completed
 * 4. next pending milestone -> materialize one task
 * 5. otherwise idle
 *
 * This deliberately does NOT create a new Outcome.
 * A future evolution layer may propose new Outcomes from
 * verified evidence, explicit commercial objectives, or user intent.
 */
export async function ensureAutonomousWorkQueue(): Promise<
  AutonomousWorkQueueResult
> {
  let tasks = await listPersistentTasks();

  /*
   * Hard safety boundary:
   * never create another task while one is already executing.
   */
  const existingDoing = tasks.find(
    (task) =>
      task.status === "doing",
  );

  if (existingDoing) {
    return {
      status: "ready",
      taskId: existingDoing.id,
      taskTitle: existingDoing.title,
      outcomeId: null,
      milestoneId: null,
      created: false,
      message:
        "An autonomous task is already running. The single-doing-task boundary is preserved.",
    };
  }

  /*
   * Existing todo work always wins over generating new work.
   */
  const existingTodo = tasks.find(
    (task) =>
      task.status === "todo",
  );

  if (existingTodo) {
    return {
      status: "ready",
      taskId: existingTodo.id,
      taskTitle: existingTodo.title,
      outcomeId: null,
      milestoneId: null,
      created: false,
      message:
        "An eligible todo task already exists; no new autonomous work was created.",
    };
  }

  const outcomes = await listOutcomes();

  /*
   * Only an already-active Outcome can provide autonomous work.
   * This prevents the queue from becoming an unlimited self-task generator.
   */
  const activeOutcomes = outcomes
    .filter(
      (outcome) =>
        outcome.status === "active",
    )
    .sort(
      (first, second) =>
        first.createdAt -
        second.createdAt,
    );

  if (activeOutcomes.length === 0) {
    return {
      status: "idle",
      taskId: null,
      taskTitle: null,
      outcomeId: null,
      milestoneId: null,
      created: false,
      message:
        "No active Outcome currently provides an eligible autonomous work item.",
    };
  }

  /*
   * Reconcile milestone state against persistent task state.
   *
   * A milestone may have been materialized by a previous queue cycle
   * and its task may subsequently have completed.
   *
   * The queue therefore closes completed milestone -> task relationships
   * before selecting the next pending milestone.
   */
  for (const outcome of activeOutcomes) {
    for (const milestone of outcome.milestones) {
      if (
        milestone.status !== "active" ||
        milestone.taskIds.length === 0
      ) {
        continue;
      }

      const linkedTasks = milestone.taskIds
        .map(
          (taskId) =>
            findTaskById(
              tasks,
              taskId,
            ),
        )
        .filter(
          (
            task,
          ): task is Task =>
            task !== null,
        );

      if (
        linkedTasks.length > 0 &&
        linkedTasks.every(
          (task) =>
            task.status === "done",
        )
      ) {
        await updateOutcomeMilestone(
          outcome.id,
          milestone.id,
          {
            status: "completed",
          },
        );
      }
    }
  }

  /*
   * Refresh task state after milestone reconciliation.
   */
  tasks = await listPersistentTasks();

  /*
   * Refresh outcomes as milestone statuses may have changed.
   */
  const refreshedOutcomes =
    await listOutcomes();

  const refreshedActiveOutcomes =
    refreshedOutcomes
      .filter(
        (outcome) =>
          outcome.status === "active",
      )
      .sort(
        (first, second) =>
          first.createdAt -
          second.createdAt,
      );

  for (const activeOutcome of refreshedActiveOutcomes) {
    /*
     * Select strictly the earliest unmaterialized pending milestone.
     *
     * Ordering is deterministic and bounded:
     * exactly ONE milestone becomes a task per queue invocation.
     */
    const pendingMilestone = [
      ...activeOutcome.milestones,
    ]
      .sort(
        (first, second) =>
          first.order -
          second.order,
      )
      .find(
        (milestone) =>
          milestone.status === "pending" &&
          milestone.taskIds.length === 0,
      );

    if (!pendingMilestone) {
      continue;
    }

    const taskTitle =
      pendingMilestone.title.trim();

    if (!taskTitle) {
      continue;
    }

    /*
     * Re-check duplicate work immediately before creation.
     */
    const duplicate =
      await findDuplicateActiveTask(
        taskTitle,
      );

    const task =
      duplicate ??
      (await createPersistentTask(
        taskTitle,
        [
          pendingMilestone.description,
          "",
          `Outcome: ${activeOutcome.title}`,
          `Outcome ID: ${activeOutcome.id}`,
          `Milestone ID: ${pendingMilestone.id}`,
          `Execution order: ${pendingMilestone.order}`,
          activeOutcome.successCriteria
            ? `Success criteria: ${activeOutcome.successCriteria}`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
      ));

    /*
     * Link the milestone to exactly one persistent task.
     *
     * Do not append multiple task IDs for one milestone.
     * This keeps milestone -> execution deterministic.
     */
    await updateOutcomeMilestone(
      activeOutcome.id,
      pendingMilestone.id,
      {
        taskIds: [
          task.id,
        ],
        status: "active",
      },
    );

    /*
     * Keep the Outcome's aggregate task index synchronized.
     */
    await updateOutcome(
      activeOutcome.id,
      {
        status: "active",
        taskIds: Array.from(
          new Set([
            ...activeOutcome.taskIds,
            task.id,
          ]),
        ),
      },
    );

    return {
      status: "created",
      taskId: task.id,
      taskTitle: task.title,
      outcomeId: activeOutcome.id,
      milestoneId:
        pendingMilestone.id,
      created:
        duplicate === null,
      message:
        duplicate !== null
          ? "A pending milestone was linked to an existing unfinished task."
          : "One pending Outcome milestone was materialized into the autonomous work queue.",
    };
  }

  /*
   * All active Outcomes are either:
   * - waiting on existing work
   * - fully materialized
   * - fully completed
   * - or have no valid pending milestone.
   *
   * Do not invent work.
   */
  return {
    status: "idle",
    taskId: null,
    taskTitle: null,
    outcomeId:
      refreshedActiveOutcomes[0]?.id ??
      null,
    milestoneId: null,
    created: false,
    message:
      "The active Outcomes have no unmaterialized pending milestone. AIOS will wait instead of inventing new work.",
  };
}
