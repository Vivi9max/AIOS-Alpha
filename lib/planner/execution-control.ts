import type {
  PlannerAdaptiveMode,
  PlannerAdaptiveStrategy,
} from "@/lib/planner/runtime";

import type {
  Task,
  TaskStatus,
} from "@/lib/task/types";

export type PlannerControlCode =
  | "PLANNER_NEW_TASKS_PAUSED"
  | "PLANNER_CONCURRENCY_LIMIT";

export interface PlannerTaskControl {
  mode:
    PlannerAdaptiveMode;

  title:
    string;

  reason:
    string;

  primaryAction:
    string;

  maxConcurrentTasks:
    number;

  doingCount:
    number;

  activeCount:
    number;

  queuedCount:
    number;

  allowNewTasks:
    boolean;

  canCreateTask:
    boolean;

  canStartTask:
    boolean;

  generatedAt:
    number;
}

export interface PlannerControlDecision {
  allowed:
    boolean;

  code:
    PlannerControlCode |
    null;

  message:
    string;

  action:
    string;
}

export function buildPlannerTaskControl(
  tasks:
    Task[],

  strategy:
    PlannerAdaptiveStrategy
): PlannerTaskControl {
  const doingCount =
    tasks.filter(
      (task) =>
        task.status ===
        "doing"
    ).length;

  const activeCount =
    tasks.filter(
      (task) =>
        task.status !==
        "done"
    ).length;

  const queuedCount =
    tasks.filter(
      (task) =>
        task.status ===
        "todo"
    ).length;

  const maxConcurrentTasks =
    Math.max(
      1,
      Math.floor(
        strategy.maxConcurrentTasks
      )
    );

  return {
    mode:
      strategy.mode,

    title:
      strategy.title,

    reason:
      strategy.reason,

    primaryAction:
      strategy.primaryAction,

    maxConcurrentTasks,

    doingCount,

    activeCount,

    queuedCount,

    allowNewTasks:
      strategy.allowNewTasks,

    canCreateTask:
      strategy.allowNewTasks,

    canStartTask:
      doingCount <
      maxConcurrentTasks,

    generatedAt:
      strategy.generatedAt,
  };
}

export function evaluatePlannerTaskCreation(
  control:
    PlannerTaskControl
): PlannerControlDecision {
  if (
    control.canCreateTask
  ) {
    return {
      allowed:
        true,

      code:
        null,

      message:
        "Planner allows a new task.",

      action:
        control.primaryAction,
    };
  }

  return {
    allowed:
      false,

    code:
      "PLANNER_NEW_TASKS_PAUSED",

    message:
      "Planner 已暂停新增任务，请先完成或整理当前执行队列。",

    action:
      control.primaryAction,
  };
}

export function evaluatePlannerTaskStatusChange(
  tasks:
    Task[],

  taskId:
    string,

  nextStatus:
    TaskStatus |
    undefined,

  control:
    PlannerTaskControl
): PlannerControlDecision {
  if (
    nextStatus !==
    "doing"
  ) {
    return {
      allowed:
        true,

      code:
        null,

      message:
        "Task transition allowed.",

      action:
        control.primaryAction,
    };
  }

  const currentTask =
    tasks.find(
      (task) =>
        task.id ===
        taskId
    );

  if (
    currentTask?.status ===
    "doing" ||
    control.canStartTask
  ) {
    return {
      allowed:
        true,

      code:
        null,

      message:
        "Planner allows this task to start.",

      action:
        control.primaryAction,
    };
  }

  return {
    allowed:
      false,

    code:
      "PLANNER_CONCURRENCY_LIMIT",

    message:
      `Planner 当前最多允许 ${control.maxConcurrentTasks} 项任务同时执行。`,

    action:
      control.primaryAction,
  };
}
