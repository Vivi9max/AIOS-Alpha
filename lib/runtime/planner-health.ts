import {
  listOutcomes,
} from "@/lib/outcome/store";

import {
  listPersistentTasks,
} from "@/lib/task/server-store";

export type PlannerHealthCheckStatus =
  | "pass"
  | "warn"
  | "fail";

export interface PlannerHealthCheck {
  id: string;
  status: PlannerHealthCheckStatus;
  message: string;
  details?: Record<string, unknown>;
}

export interface PlannerHealthResult {
  success: boolean;

  status:
    | "healthy"
    | "idle"
    | "degraded"
    | "failed";

  score: number;

  checks: PlannerHealthCheck[];

  summary: {
    passed: number;
    warnings: number;
    failed: number;
    total: number;
  };

  planner: {
    outcomes: number;
    plannedOutcomes: number;
    activeOutcomes: number;
    blockedOutcomes: number;
    completedOutcomes: number;
    archivedOutcomes: number;
    totalTasks: number;
    todoTasks: number;
    doingTasks: number;
    doneTasks: number;
  };

  timestamp: number;
}

function pushCheck(
  checks: PlannerHealthCheck[],
  check: PlannerHealthCheck,
): void {
  checks.push(check);
}

export async function verifyPlannerHealth(): Promise<PlannerHealthResult> {
  const timestamp = Date.now();

  try {
    const [
      outcomes,
      tasks,
    ] = await Promise.all([
      listOutcomes(),
      listPersistentTasks(),
    ]);

    /*
     * OutcomeStatus is intentionally evaluated against
     * the real Outcome contract:
     *
     * planned | active | blocked | completed | archived
     *
     * Do not use task states here.
     */
    const plannedOutcomes =
      outcomes.filter(
        (item) =>
          item.status === "planned",
      ).length;

    const activeOutcomes =
      outcomes.filter(
        (item) =>
          item.status === "active",
      ).length;

    const blockedOutcomes =
      outcomes.filter(
        (item) =>
          item.status === "blocked",
      ).length;

    const completedOutcomes =
      outcomes.filter(
        (item) =>
          item.status === "completed",
      ).length;

    const archivedOutcomes =
      outcomes.filter(
        (item) =>
          item.status === "archived",
      ).length;

    /*
     * Persistent task state is a separate contract:
     *
     * todo | doing | done
     */
    const todoTasks =
      tasks.filter(
        (item) =>
          item.status === "todo",
      ).length;

    const doingTasks =
      tasks.filter(
        (item) =>
          item.status === "doing",
      ).length;

    const doneTasks =
      tasks.filter(
        (item) =>
          item.status === "done",
      ).length;

    const checks: PlannerHealthCheck[] = [];

    /*
     * Every real OutcomeStatus must belong to exactly
     * one of the known states.
     */
    const classifiedOutcomes =
      plannedOutcomes +
      activeOutcomes +
      blockedOutcomes +
      completedOutcomes +
      archivedOutcomes;

    const outcomeStateValid =
      classifiedOutcomes ===
      outcomes.length;

    pushCheck(
      checks,
      {
        id:
          "outcome-state-contract",

        status:
          outcomeStateValid
            ? "pass"
            : "fail",

        message:
          outcomeStateValid
            ? "Planner outcome states are fully classified."
            : "Planner contains outcomes with an unknown state.",

        details: {
          total:
            outcomes.length,

          planned:
            plannedOutcomes,

          active:
            activeOutcomes,

          blocked:
            blockedOutcomes,

          completed:
            completedOutcomes,

          archived:
            archivedOutcomes,
        },
      },
    );

    /*
     * Every persistent task must belong to exactly
     * one of the known task states.
     */
    const classifiedTasks =
      todoTasks +
      doingTasks +
      doneTasks;

    const taskStateValid =
      classifiedTasks ===
      tasks.length;

    pushCheck(
      checks,
      {
        id:
          "task-state-contract",

        status:
          taskStateValid
            ? "pass"
            : "fail",

        message:
          taskStateValid
            ? "Planner task states are fully classified."
            : "Planner contains tasks with an unknown state.",

        details: {
          total:
            tasks.length,

          todo:
            todoTasks,

          doing:
            doingTasks,

          done:
            doneTasks,
        },
      },
    );

    /*
     * The current execution contract allows at most
     * one task to be actively executing at a time.
     */
    const doingTaskContract =
      doingTasks <= 1;

    pushCheck(
      checks,
      {
        id:
          "single-doing-task-contract",

        status:
          doingTaskContract
            ? "pass"
            : "fail",

        message:
          doingTaskContract
            ? "Planner execution queue has at most one active task."
            : "Planner has multiple simultaneously executing tasks.",

        details: {
          doingTasks,
        },
      },
    );

    const idle =
      outcomes.length === 0 &&
      tasks.length === 0;

    /*
     * Work is considered active when the planner has
     * planned/active outcomes or queued/executing tasks.
     */
    const activeWork =
      plannedOutcomes > 0 ||
      activeOutcomes > 0 ||
      todoTasks > 0 ||
      doingTasks > 0;

    if (idle) {
      pushCheck(
        checks,
        {
          id:
            "planner-idle-state",

          status:
            "pass",

          message:
            "Planner is healthy and currently idle.",

          details: {
            outcomes:
              outcomes.length,

            tasks:
              tasks.length,
          },
        },
      );
    } else {
      /*
       * Queued work is valid when there is either a planned
       * or active outcome, or when there is already an
       * executing task.
       *
       * A standalone todo queue is reported as a warning
       * rather than a hard failure because task materialization
       * and execution may legitimately be between stages.
       */
      const activeWorkConsistent =
        plannedOutcomes > 0 ||
        activeOutcomes > 0 ||
        doingTasks > 0;

      pushCheck(
        checks,
        {
          id:
            "planner-active-state",

          status:
            activeWorkConsistent
              ? "pass"
              : "warn",

          message:
            activeWorkConsistent
              ? "Planner contains a consistent active workload."
              : "Planner contains queued work without an active outcome.",

          details: {
            plannedOutcomes,
            activeOutcomes,
            blockedOutcomes,
            completedOutcomes,
            archivedOutcomes,
            todoTasks,
            doingTasks,
            doneTasks,
            activeWork,
          },
        },
      );
    }

    const passed =
      checks.filter(
        (check) =>
          check.status === "pass",
      ).length;

    const warnings =
      checks.filter(
        (check) =>
          check.status === "warn",
      ).length;

    const failed =
      checks.filter(
        (check) =>
          check.status === "fail",
      ).length;

    const total =
      checks.length;

    const score =
      total > 0
        ? Math.round(
            (
              passed +
              warnings * 0.5
            ) /
              total *
              100,
          )
        : 0;

    const status =
      failed > 0
        ? "failed"
        : idle
          ? "idle"
          : warnings > 0
            ? "degraded"
            : "healthy";

    return {
      success:
        failed === 0,

      status,

      score,

      checks,

      summary: {
        passed,
        warnings,
        failed,
        total,
      },

      planner: {
        outcomes:
          outcomes.length,

        plannedOutcomes,

        activeOutcomes,

        blockedOutcomes,

        completedOutcomes,

        archivedOutcomes,

        totalTasks:
          tasks.length,

        todoTasks,

        doingTasks,

        doneTasks,
      },

      timestamp,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Planner health verification failed.";

    return {
      success: false,

      status: "failed",

      score: 0,

      checks: [
        {
          id:
            "planner-runtime",

          status:
            "fail",

          message,
        },
      ],

      summary: {
        passed: 0,
        warnings: 0,
        failed: 1,
        total: 1,
      },

      planner: {
        outcomes: 0,
        plannedOutcomes: 0,
        activeOutcomes: 0,
        blockedOutcomes: 0,
        completedOutcomes: 0,
        archivedOutcomes: 0,
        totalTasks: 0,
        todoTasks: 0,
        doingTasks: 0,
        doneTasks: 0,
      },

      timestamp,
    };
  }
}
