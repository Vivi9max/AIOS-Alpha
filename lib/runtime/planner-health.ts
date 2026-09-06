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
    pendingOutcomes: number;
    activeOutcomes: number;
    completedOutcomes: number;
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

    const pendingOutcomes =
      outcomes.filter(
        (item) =>
          item.status === "pending",
      ).length;

    const activeOutcomes =
      outcomes.filter(
        (item) =>
          item.status === "active",
      ).length;

    const completedOutcomes =
      outcomes.filter(
        (item) =>
          item.status === "completed",
      ).length;

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

    const outcomeStateValid =
      pendingOutcomes +
        activeOutcomes +
        completedOutcomes <=
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
            ? "Planner outcome states are structurally valid."
            : "Planner contains outcomes with invalid or unknown states.",

        details: {
          total:
            outcomes.length,

          pending:
            pendingOutcomes,

          active:
            activeOutcomes,

          completed:
            completedOutcomes,
        },
      },
    );

    const taskStateValid =
      todoTasks +
        doingTasks +
        doneTasks ===
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

    const activeWork =
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
      const activeWorkConsistent =
        activeOutcomes > 0 ||
        todoTasks === 0 &&
          doingTasks === 0;

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
              ? "Planner contains a consistent active or completed workload."
              : "Planner contains queued work without an active outcome.",

          details: {
            activeOutcomes,
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

        pendingOutcomes,

        activeOutcomes,

        completedOutcomes,

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
        pendingOutcomes: 0,
        activeOutcomes: 0,
        completedOutcomes: 0,
        totalTasks: 0,
        todoTasks: 0,
        doingTasks: 0,
        doneTasks: 0,
      },

      timestamp,
    };
  }
}
