import type {
  Task,
} from "@/lib/task/types";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const RECENT_WINDOW_MS = 7 * DAY_MS;
const STALE_TASK_MS = 24 * HOUR_MS;

export type PlannerLearningHealth =
  | "insufficient-data"
  | "healthy"
  | "attention"
  | "blocked";

export interface PlannerLearningMetrics {
  total: number;
  completed: number;
  active: number;
  stale: number;
  completionRate: number;
  recentCompleted: number;
  averageCycleHours: number | null;
  executionVelocity: number;
}

export interface PlannerLearningInsight {
  id: string;
  type:
    | "progress"
    | "velocity"
    | "stale"
    | "focus"
    | "next-cycle";
  severity:
    | "info"
    | "success"
    | "warning"
    | "critical";
  title: string;
  description: string;
  action: string;
}

export interface PlannerLearningSnapshot {
  health: PlannerLearningHealth;
  confidence: number;
  metrics: PlannerLearningMetrics;
  insights: PlannerLearningInsight[];
  recommendation: string;
  generatedAt: number;
}

function safeTimestamp(
  value: unknown
): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
    ? value
    : null;
}

function normalizeTasks(
  tasks: Task[]
): Task[] {
  const unique = new Map<string, Task>();

  for (const task of tasks) {
    if (!task || typeof task.id !== "string") {
      continue;
    }

    const id = task.id.trim();
    const title = task.title?.trim();
    const createdAt = safeTimestamp(task.createdAt);
    const updatedAt = safeTimestamp(task.updatedAt);

    if (!id || !title || !createdAt || !updatedAt) {
      continue;
    }

    if (
      task.status !== "todo" &&
      task.status !== "doing" &&
      task.status !== "done"
    ) {
      continue;
    }

    const normalized: Task = {
      ...task,
      id,
      title,
      description: task.description?.trim() ?? "",
      createdAt,
      updatedAt: Math.max(createdAt, updatedAt),
    };

    const existing = unique.get(id);

    if (!existing || normalized.updatedAt >= existing.updatedAt) {
      unique.set(id, normalized);
    }
  }

  return [...unique.values()];
}

function percentage(
  value: number,
  total: number
): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function averageCycleHours(
  completedTasks: Task[]
): number | null {
  if (completedTasks.length === 0) {
    return null;
  }

  const totalHours = completedTasks.reduce(
    (sum, task) =>
      sum + Math.max(0, task.updatedAt - task.createdAt) / HOUR_MS,
    0
  );

  return Math.round((totalHours / completedTasks.length) * 10) / 10;
}

function createInsights(
  tasks: Task[],
  metrics: PlannerLearningMetrics,
  generatedAt: number
): PlannerLearningInsight[] {
  const insights: PlannerLearningInsight[] = [];
  const doing = tasks.filter((task) => task.status === "doing");

  if (metrics.total === 0) {
    return [
      {
        id: "learning-start",
        type: "next-cycle",
        severity: "info",
        title: "等待第一轮执行数据",
        description: "Planner 需要至少一项任务及其状态变化，才能形成可靠的学习结论。",
        action: "创建第一项可验证任务并开始执行",
      },
    ];
  }

  if (metrics.completed > 0) {
    insights.push({
      id: "completion-progress",
      type: "progress",
      severity: metrics.completionRate >= 70 ? "success" : "info",
      title: `已形成 ${metrics.completed} 项完成记录`,
      description: `当前整体完成率为 ${metrics.completionRate}%，Planner 已具备基础结果样本。`,
      action: "继续为完成任务保留明确结果与验证证据",
    });
  }

  if (metrics.stale > 0) {
    insights.push({
      id: "stale-work",
      type: "stale",
      severity: metrics.stale >= 2 ? "critical" : "warning",
      title: `${metrics.stale} 项执行任务超过 24 小时未更新`,
      description: "停滞任务会降低执行连续性，并使下一步优先级失真。",
      action: "先确认阻碍、更新状态，或将无效任务重新拆分",
    });
  }

  if (doing.length > 2) {
    insights.push({
      id: "focus-limit",
      type: "focus",
      severity: "warning",
      title: "并行执行任务过多",
      description: `当前有 ${doing.length} 项任务同时进行，注意力可能被分散。`,
      action: "保留最多两项 doing，其余任务返回 todo 队列",
    });
  }

  if (metrics.recentCompleted > 0) {
    insights.push({
      id: "recent-velocity",
      type: "velocity",
      severity: "success",
      title: `近 7 天完成 ${metrics.recentCompleted} 项任务`,
      description: `当前执行速度约为每天 ${metrics.executionVelocity} 项。`,
      action: "下一周期保持相同节奏，并优先复用已验证路径",
    });
  } else if (metrics.active > 0) {
    insights.push({
      id: "velocity-zero",
      type: "velocity",
      severity: "warning",
      title: "近 7 天尚未形成完成记录",
      description: "当前存在执行任务，但尚未闭环为可验证成果。",
      action: "选择最接近完成的一项任务，优先完成并记录结果",
    });
  }

  const oldestActive = tasks
    .filter((task) => task.status !== "done")
    .sort((first, second) => first.updatedAt - second.updatedAt)[0];

  if (
    oldestActive &&
    generatedAt - oldestActive.updatedAt >= STALE_TASK_MS
  ) {
    insights.push({
      id: "next-cycle-priority",
      type: "next-cycle",
      severity: "warning",
      title: "下一轮应先解除最久停滞点",
      description: `“${oldestActive.title}”是当前最久未推进的活动任务。`,
      action: `检查并推进“${oldestActive.title}”`,
    });
  }

  return insights.slice(0, 5);
}

function resolveHealth(
  metrics: PlannerLearningMetrics
): PlannerLearningHealth {
  if (metrics.total < 2) {
    return "insufficient-data";
  }

  if (metrics.stale >= 2) {
    return "blocked";
  }

  if (
    metrics.stale > 0 ||
    (metrics.active > 0 && metrics.recentCompleted === 0)
  ) {
    return "attention";
  }

  return "healthy";
}

function resolveRecommendation(
  metrics: PlannerLearningMetrics
): string {
  if (metrics.total === 0) {
    return "创建第一项可验证任务，启动 Planner Learning 数据闭环。";
  }

  if (metrics.stale > 0) {
    return "暂停增加新任务，先处理停滞任务并更新真实执行状态。";
  }

  if (metrics.active > 0 && metrics.recentCompleted === 0) {
    return "优先完成最接近结果的一项任务，形成新的可验证成果。";
  }

  if (metrics.active === 0) {
    return "根据已完成成果创建下一阶段目标，开启新的执行周期。";
  }

  return "保持当前执行节奏，并把有效路径沉淀为下一轮可复用步骤。";
}

export function buildPlannerLearningSnapshot(
  tasks: Task[],
  generatedAt = Date.now()
): PlannerLearningSnapshot {
  const safeGeneratedAt =
    safeTimestamp(generatedAt) ?? Date.now();
  const safeTasks = normalizeTasks(tasks);
  const completedTasks = safeTasks.filter(
    (task) => task.status === "done"
  );
  const activeTasks = safeTasks.filter(
    (task) => task.status !== "done"
  );
  const staleTasks = safeTasks.filter(
    (task) =>
      task.status === "doing" &&
      safeGeneratedAt - task.updatedAt >= STALE_TASK_MS
  );
  const recentCompleted = completedTasks.filter(
    (task) =>
      safeGeneratedAt - task.updatedAt <= RECENT_WINDOW_MS
  ).length;

  const metrics: PlannerLearningMetrics = {
    total: safeTasks.length,
    completed: completedTasks.length,
    active: activeTasks.length,
    stale: staleTasks.length,
    completionRate: percentage(completedTasks.length, safeTasks.length),
    recentCompleted,
    averageCycleHours: averageCycleHours(completedTasks),
    executionVelocity: Math.round((recentCompleted / 7) * 100) / 100,
  };

  return {
    health: resolveHealth(metrics),
    confidence: Math.min(100, safeTasks.length * 12 + completedTasks.length * 8),
    metrics,
    insights: createInsights(safeTasks, metrics, safeGeneratedAt),
    recommendation: resolveRecommendation(metrics),
    generatedAt: safeGeneratedAt,
  };
}
