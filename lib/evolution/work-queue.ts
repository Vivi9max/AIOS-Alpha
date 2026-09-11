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
 * C142.11.4 — Bounded Autonomous Work Queue
 *
 * Purpose:
 * - provide Heartbeat with exactly one valid next work item
 * - continue an already active Outcome
 * - materialize the currently active Milestone
 * - never invent arbitrary autonomous work
 * - preserve the single-doing-task boundary
 * - advance completed milestones before materializing the next one
 *
 * Queue priority:
 *
 * 1. existing doing task
 * 2. existing todo task
 * 3. completed linked milestone -> mark completed
 * 4. active/pending unmaterialized milestone -> materialize one task
 * 5. otherwise idle
 *
 * This deliberately does NOT create a new Outcome.
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
   * Refresh persisted state after milestone reconciliation.
   */
  tasks = await listPersistentTasks();

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
     * IMPORTANT:
     *
     * The Outcome store intentionally creates the first Milestone
     * with status "active" and later Milestones with status "pending".
     *
     * Therefore both "active" and "pending" are valid states here,
     * provided the milestone has not yet been materialized into a Task.
     *
     * This is the C142.11.4 correction.
     */
    const nextMilestone = [
      ...activeOutcome.milestones,
    ]
      .sort(
        (first, second) =>
          first.order -
          second.order,
      )
      .find(
        (milestone) =>
          (
            milestone.status === "active" ||
            milestone.status === "pending"
          ) &&
          milestone.taskIds.length === 0,
      );

    if (!nextMilestone) {
      continue;
    }

    const taskTitle =
      nextMilestone.title.trim();

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
          nextMilestone.description,
          "",
          `Outcome: ${activeOutcome.title}`,
          `Outcome ID: ${activeOutcome.id}`,
          `Milestone ID: ${nextMilestone.id}`,
          `Execution order: ${nextMilestone.order}`,
          activeOutcome.successCriteria
            ? `Success criteria: ${activeOutcome.successCriteria}`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
      ));

    /*
     * Bind exactly one Task to this Milestone.
     */
    await updateOutcomeMilestone(
      activeOutcome.id,
      nextMilestone.id,
      {
        taskIds: [
          task.id,
        ],
        status: "active",
      },
    );

    /*
     * Keep Outcome aggregate task index synchronized.
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
        nextMilestone.id,
      created:
        duplicate === null,
      message:
        duplicate !== null
          ? "An active or pending milestone was linked to an existing unfinished task."
          : "One active or pending Outcome milestone was materialized into the autonomous work queue.",
    };
  }

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
      "The active Outcomes have no unmaterialized active or pending milestone. AIOS will wait instead of inventing new work.",
  };
}
