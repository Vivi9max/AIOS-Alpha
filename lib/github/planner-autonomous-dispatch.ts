import "server-only";

import {
  listPersistentTasks,
} from "@/lib/task/server-store";

import type {
  Task,
} from "@/lib/task/types";

import {
  buildPlannerSnapshot,
} from "@/lib/planner/engine";

import {
  createAutonomousDevelopmentTask,
  claimAutonomousDevelopmentTask,
} from "@/lib/github/autonomous-development-control-plane";

const ALLOWED_REPOSITORY =
  "Vivi9max/AIOS-Alpha";

const ALLOWED_BRANCH =
  "main";

const MAX_OBJECTIVE_LENGTH =
  1000;

const MAX_TARGET_PATH_LENGTH =
  240;

export type PlannerDevelopmentEligibility =
  | "eligible"
  | "blocked"
  | "no-task";

export interface PlannerDevelopmentDispatchResult {
  success: boolean;

  code:
    | "PLANNER_TASK_ELIGIBLE"
    | "PLANNER_NO_ELIGIBLE_TASK"
    | "PLANNER_TASK_BLOCKED";

  eligibility:
    PlannerDevelopmentEligibility;

  repository:
    string;

  branch:
    string;

  plannerTask?: {
    id: string;
    title: string;
    description: string;
    status: Task["status"];
  };

  objective?: string;

  targetPaths?: string[];

  autonomousTask?: {
    id: string;
    status: string;
  };

  reason?: string;
}

function cleanText(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizePath(
  value: string,
): string {
  return value
    .trim()
    .replace(/^\/+/, "");
}

function isSafeTargetPath(
  path: string,
): boolean {
  if (!path) {
    return false;
  }

  if (
    path.length >
    MAX_TARGET_PATH_LENGTH
  ) {
    return false;
  }

  if (
    path.startsWith("/") ||
    path.includes("..") ||
    path.includes("\0") ||
    path.startsWith(".git/") ||
    path === ".git" ||
    path.startsWith(".env")
  ) {
    return false;
  }

  return true;
}

/*
 * Planner tasks must explicitly identify the
 * repository file that autonomous development
 * is allowed to operate on.
 *
 * Supported forms:
 *
 * Target Path: lib/example.ts
 * Target Path: app/example/route.ts
 * File: lib/example.ts
 * File: app/example/route.ts
 */
function extractTargetPaths(
  description: string,
): string[] {
  const matches = [
    ...description.matchAll(
      /(?:Target\s*Path|TargetPath|File)\s*:\s*([^\s\n\r,，；;]+)/gi,
    ),
  ];

  const paths = matches
    .map((match) =>
      normalizePath(
        match[1] ?? "",
      ),
    )
    .filter(isSafeTargetPath);

  return Array.from(
    new Set(paths),
  );
}

function buildObjective(
  task: Task,
): string {
  const title =
    cleanText(task.title);

  const description =
    cleanText(task.description);

  const objective =
    description
      ? `${title}: ${description}`
      : title;

  return objective.slice(
    0,
    MAX_OBJECTIVE_LENGTH,
  );
}

function isPlannerTaskEligible(
  task: Task,
): boolean {
  if (
    task.status !== "todo"
  ) {
    return false;
  }

  if (
    !cleanText(task.title)
  ) {
    return false;
  }

  const targetPaths =
    extractTargetPaths(
      cleanText(
        task.description,
      ),
    );

  return (
    targetPaths.length > 0
  );
}

function selectPlannerTask(
  tasks: Task[],
): Task | null {
  const snapshot =
    buildPlannerSnapshot(
      tasks,
    );

  const eligibleIds =
    new Set(
      snapshot.queue
        .filter(
          (item) =>
            item.status ===
            "todo",
        )
        .map(
          (item) =>
            item.id,
        ),
    );

  const eligible =
    tasks
      .filter(
        (task) =>
          eligibleIds.has(
            task.id,
          ),
      )
      .filter(
        isPlannerTaskEligible,
      )
      .sort(
        (a, b) =>
          b.updatedAt -
          a.updatedAt,
      );

  return (
    eligible[0] ??
    null
  );
}

export async function dispatchNextPlannerDevelopmentTask(): Promise<PlannerDevelopmentDispatchResult> {
  const tasks =
    await listPersistentTasks();

  const plannerTask =
    selectPlannerTask(
      tasks,
    );

  if (!plannerTask) {
    return {
      success: false,

      code:
        "PLANNER_NO_ELIGIBLE_TASK",

      eligibility:
        "no-task",

      repository:
        ALLOWED_REPOSITORY,

      branch:
        ALLOWED_BRANCH,

      reason:
        "No Planner todo task currently satisfies the autonomous development eligibility requirements.",
    };
  }

  const targetPaths =
    extractTargetPaths(
      cleanText(
        plannerTask.description,
      ),
    );

  if (
    targetPaths.length === 0
  ) {
    return {
      success: false,

      code:
        "PLANNER_TASK_BLOCKED",

      eligibility:
        "blocked",

      repository:
        ALLOWED_REPOSITORY,

      branch:
        ALLOWED_BRANCH,

      plannerTask: {
        id:
          plannerTask.id,

        title:
          plannerTask.title,

        description:
          plannerTask.description ??
          "",

        status:
          plannerTask.status,
      },

      reason:
        "Planner task does not contain an explicit safe Target Path or File declaration.",
    };
  }

  const objective =
    buildObjective(
      plannerTask,
    );

  if (!objective) {
    return {
      success: false,

      code:
        "PLANNER_TASK_BLOCKED",

      eligibility:
        "blocked",

      repository:
        ALLOWED_REPOSITORY,

      branch:
        ALLOWED_BRANCH,

      plannerTask: {
        id:
          plannerTask.id,

        title:
          plannerTask.title,

        description:
          plannerTask.description ??
          "",

        status:
          plannerTask.status,
      },

      reason:
        "Planner task does not contain a valid development objective.",
    };
  }

  const autonomousTask =
    createAutonomousDevelopmentTask({
      objective,

      targetPaths,
    });

  const claimed =
    claimAutonomousDevelopmentTask(
      autonomousTask.id,
    );

  return {
    success: true,

    code:
      "PLANNER_TASK_ELIGIBLE",

    eligibility:
      "eligible",

    repository:
      ALLOWED_REPOSITORY,

    branch:
      ALLOWED_BRANCH,

    plannerTask: {
      id:
        plannerTask.id,

      title:
        plannerTask.title,

      description:
        plannerTask.description ??
        "",

      status:
        plannerTask.status,
    },

    objective,

    targetPaths,

    autonomousTask: {
      id:
        claimed.id,

      status:
        claimed.status,
    },
  };
}
