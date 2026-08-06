import type { PlannerLearningSnapshot } from "@/lib/planner/learning";

export const MAX_PLANNER_LEARNING_HISTORY = 30;
export const PLANNER_HISTORY_INTERVAL_MS = 6 * 60 * 60 * 1000;

export type PlannerLearningTrend =
  | "insufficient-data"
  | "improving"
  | "stable"
  | "declining";

export interface PlannerLearningHistoryPoint {
  generatedAt: number;
  health: PlannerLearningSnapshot["health"];
  confidence: number;
  completionRate: number;
  executionVelocity: number;
  stale: number;
  completed: number;
  active: number;
}

export interface PlannerLearningHistory {
  trend: PlannerLearningTrend;
  previous: PlannerLearningHistoryPoint | null;
  current: PlannerLearningHistoryPoint;
  sampleCount: number;
  completionRateChange: number;
  velocityChange: number;
  staleChange: number;
}

export type PlannerAdaptiveMode =
  | "baseline"
  | "accelerate"
  | "focus"
  | "recover";

export interface PlannerAdaptiveStrategy {
  mode: PlannerAdaptiveMode;
  title: string;
  reason: string;
  maxConcurrentTasks: number;
  allowNewTasks: boolean;
  primaryAction: string;
  actions: string[];
  generatedAt: number;
}

export function toPlannerHistoryPoint(
  learning: PlannerLearningSnapshot
): PlannerLearningHistoryPoint {
  return {
    generatedAt: learning.generatedAt,
    health: learning.health,
    confidence: learning.confidence,
    completionRate: learning.metrics.completionRate,
    executionVelocity: learning.metrics.executionVelocity,
    stale: learning.metrics.stale,
    completed: learning.metrics.completed,
    active: learning.metrics.active,
  };
}

export function isPlannerHistoryPoint(
  value: unknown
): value is PlannerLearningHistoryPoint {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<PlannerLearningHistoryPoint>;
  return [
    point.generatedAt,
    point.confidence,
    point.completionRate,
    point.executionVelocity,
    point.stale,
    point.completed,
    point.active,
  ].every((item) => typeof item === "number" && Number.isFinite(item));
}

export function buildPlannerLearningHistory(
  current: PlannerLearningHistoryPoint,
  stored: unknown
): { history: PlannerLearningHistoryPoint[]; result: PlannerLearningHistory; changed: boolean } {
  const history = (Array.isArray(stored) ? stored : [])
    .filter(isPlannerHistoryPoint)
    .sort((first, second) => first.generatedAt - second.generatedAt)
    .slice(-MAX_PLANNER_LEARNING_HISTORY);
  const previous = history.at(-1) ?? null;
  const metricsChanged = !previous ||
    previous.completionRate !== current.completionRate ||
    previous.executionVelocity !== current.executionVelocity ||
    previous.stale !== current.stale ||
    previous.completed !== current.completed ||
    previous.active !== current.active;
  const intervalReached = !previous ||
    current.generatedAt - previous.generatedAt >= PLANNER_HISTORY_INTERVAL_MS;
  const changed = metricsChanged || intervalReached;

  if (changed) history.push(current);
  const score = previous
    ? current.completionRate - previous.completionRate +
      (current.executionVelocity - previous.executionVelocity) * 10 -
      (current.stale - previous.stale) * 15
    : 0;
  const trend: PlannerLearningTrend = !previous
    ? "insufficient-data"
    : score >= 5
      ? "improving"
      : score <= -5
        ? "declining"
        : "stable";
  const round = (value: number) => Math.round(value * 100) / 100;

  return {
    history: history.slice(-MAX_PLANNER_LEARNING_HISTORY),
    changed,
    result: {
      trend,
      previous,
      current,
      sampleCount: Math.min(MAX_PLANNER_LEARNING_HISTORY, history.length),
      completionRateChange: round(current.completionRate - (previous?.completionRate ?? current.completionRate)),
      velocityChange: round(current.executionVelocity - (previous?.executionVelocity ?? current.executionVelocity)),
      staleChange: current.stale - (previous?.stale ?? current.stale),
    },
  };
}

export function buildPlannerAdaptiveStrategy(
  learning: PlannerLearningSnapshot,
  history: PlannerLearningHistory
): PlannerAdaptiveStrategy {
  const metrics = learning.metrics;
  const generatedAt = learning.generatedAt;

  if (history.trend === "declining" || learning.health === "blocked") {
    return {
      mode: "recover",
      title: "恢复执行连续性",
      reason: metrics.stale > 0
        ? `${metrics.stale} 项任务已停滞，先解除阻碍。`
        : "执行指标下降，当前周期需要缩小范围。",
      maxConcurrentTasks: 1,
      allowNewTasks: false,
      primaryAction: "暂停新增任务，先完成或重新拆分最久未推进的任务。",
      actions: ["确认真实阻碍", "拆成当前周期可验证的步骤", "完成并记录结果后恢复队列"],
      generatedAt,
    };
  }

  if (history.trend === "improving" && learning.health === "healthy") {
    return {
      mode: "accelerate",
      title: "复用有效执行路径",
      reason: "完成率或执行速度正在改善，可以延续当前节奏。",
      maxConcurrentTasks: 2,
      allowNewTasks: metrics.active < 2,
      primaryAction: "复用最近成功路径，完成下一项最接近结果的任务。",
      actions: ["最多两项并行", "复用已验证步骤", "保留成果证据"],
      generatedAt,
    };
  }

  if (history.trend === "stable" || learning.health === "attention") {
    return {
      mode: "focus",
      title: "聚焦单一可验证结果",
      reason: metrics.recentCompleted === 0
        ? "存在活动任务，但近期没有新的完成记录。"
        : "趋势稳定，应减少切换并提高闭环速度。",
      maxConcurrentTasks: 1,
      allowNewTasks: metrics.active === 0,
      primaryAction: "选择最接近完成的一项任务，集中推进到可验证结果。",
      actions: ["只保留一个主任务", "明确本轮完成标准", "验证后再启动下一项"],
      generatedAt,
    };
  }

  return {
    mode: "baseline",
    title: "建立执行基线",
    reason: "历史样本不足，先完成一个真实任务周期。",
    maxConcurrentTasks: 1,
    allowNewTasks: metrics.active === 0,
    primaryAction: metrics.total === 0
      ? "创建一项具有明确完成标准的任务并开始执行。"
      : "推进当前优先任务，并在完成后记录真实结果。",
    actions: ["保持任务范围清晰", "记录状态变化", "完成周期后比较趋势"],
    generatedAt,
  };
}
