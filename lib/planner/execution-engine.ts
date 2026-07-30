import type { Task } from "@/lib/task/types";

export type MilestoneStatus =
  | "pending"
  | "active"
  | "completed";

export interface Milestone {
  id: string;
  title: string;
  description: string;
  order: number;
  status: MilestoneStatus;
  taskIds: string[];
}

export interface Outcome {
  id: string;
  title: string;
  description: string;
  successCriteria: string;

  status:
    | "planned"
    | "active"
    | "blocked"
    | "completed"
    | "archived";

  priority:
    | "low"
    | "normal"
    | "high"
    | "critical";

  progress: number;

  milestones: Milestone[];

  taskIds: string[];
}

export interface ExecutionPlan {
  outcomeId: string;

  progress: number;

  completedTasks: number;

  remainingTasks: number;

  nextTask?: Task;

  currentMilestone?: Milestone;

  queue: Task[];
}

function statusWeight(status: string) {
  switch (status) {
    case "doing":
      return 0;

    case "todo":
      return 1;

    case "done":
      return 2;

    default:
      return 3;
  }
}

export function buildExecutionPlan(
  outcome: Outcome,
  tasks: Task[]
): ExecutionPlan {
  const queue = [...tasks].sort((a, b) => {
    const diff =
      statusWeight(a.status) -
      statusWeight(b.status);

    if (diff !== 0) return diff;

    return (
      a.createdAt -
      b.createdAt
    );
  });

  const completed = tasks.filter(
    (t) => t.status === "done"
  ).length;

  const remaining = tasks.filter(
    (t) => t.status !== "done"
  ).length;

  const progress =
    tasks.length === 0
      ? 0
      : Math.round(
          (completed / tasks.length) * 100
        );

  const currentMilestone =
    outcome.milestones.find(
      (m) => m.status === "active"
    ) ??
    outcome.milestones.find(
      (m) => m.status === "pending"
    );

  const nextTask =
    queue.find((t) => t.status === "doing") ??
    queue.find((t) => t.status === "todo");

  return {
    outcomeId: outcome.id,

    progress,

    completedTasks: completed,

    remainingTasks: remaining,

    nextTask,

    currentMilestone,

    queue,
  };
}

export function getNextAction(
  plan: ExecutionPlan
) {
  if (!plan.nextTask) {
    return {
      type: "idle",

      title: "所有任务已完成",

      description: "可以进入下一阶段。",
    };
  }

  return {
    type: "execute",

    title: plan.nextTask.title,

    description:
      plan.nextTask.description || "",
  };
}

export function calculateOutcomeProgress(
  tasks: Task[]
) {
  if (tasks.length === 0) return 0;

  const completed = tasks.filter(
    (t) => t.status === "done"
  ).length;

  return Math.round(
    (completed / tasks.length) * 100
  );
}

export function activateNextMilestone(
  milestones: Milestone[]
) {
  const copy = milestones.map((m) => ({
    ...m,
  }));

  const active = copy.find(
    (m) => m.status === "active"
  );

  if (active) return copy;

  const pending = copy.find(
    (m) => m.status === "pending"
  );

  if (pending) {
    pending.status = "active";
  }

  return copy;
}

export function completeMilestone(
  milestones: Milestone[],
  milestoneId: string
) {
  return milestones.map((m) => {
    if (m.id !== milestoneId) return m;

    return {
      ...m,

      status: "completed",
    };
  });
}

export function plannerSummary(
  plan: ExecutionPlan
) {
  return {
    outcomeId: plan.outcomeId,

    progress: plan.progress,

    completedTasks: plan.completedTasks,

    remainingTasks: plan.remainingTasks,

    queueSize: plan.queue.length,

    nextTaskId:
      plan.nextTask?.id ?? null,

    milestoneId:
      plan.currentMilestone?.id ?? null,
  };
}