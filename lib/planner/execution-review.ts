import type { ExecutionLedgerEntry } from "@/lib/planner/execution-ledger";

export type ExecutionHealth = "insufficient-data" | "healthy" | "watch" | "blocked";
export type ExecutionTrend = "insufficient-data" | "improving" | "stable" | "declining";

export interface ExecutionReview {
  health: ExecutionHealth;
  trend: ExecutionTrend;
  score: number;
  sampleSize: number;
  allowedRate: number;
  completionRate: number;
  primaryBlockCode: string | null;
  headline: string;
  insight: string;
  priorityAction: string;
  generatedAt: number;
}

function rate(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

function allowedRate(entries: ExecutionLedgerEntry[]): number {
  return rate(entries.filter((entry) => entry.decision === "allowed").length, entries.length);
}

function resolveTrend(entries: ExecutionLedgerEntry[]): ExecutionTrend {
  if (entries.length < 6) return "insufficient-data";
  const midpoint = Math.floor(entries.length / 2);
  const recent = allowedRate(entries.slice(0, midpoint));
  const previous = allowedRate(entries.slice(midpoint));
  if (recent >= previous + 15) return "improving";
  if (recent <= previous - 15) return "declining";
  return "stable";
}

function primaryBlock(entries: ExecutionLedgerEntry[]): string | null {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (entry.decision !== "blocked") continue;
    const code = entry.code ?? "PLANNER_BLOCKED";
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function actionFor(code: string | null, completionRate: number): string {
  if (code === "PLANNER_NEW_TASKS_PAUSED") return "先完成当前进行中的任务，再创建新任务。";
  if (code === "PLANNER_CONCURRENCY_LIMIT") return "把并行任务收敛到 Planner 上限以内。";
  if (code) return "处理最近重复出现的阻止原因，再继续扩展执行。";
  if (completionRate < 30) return "选择一项最接近完成的任务并立即收口。";
  return "保持当前节奏，完成唯一主行动后再接受新任务。";
}

export function buildExecutionReview(entries: ExecutionLedgerEntry[]): ExecutionReview {
  const sample = entries.slice(0, 50);
  const allowed = sample.filter((entry) => entry.decision === "allowed").length;
  const completed = sample.filter((entry) => entry.action === "task-complete" && entry.decision === "allowed").length;
  const started = sample.filter((entry) => entry.action === "task-start" && entry.decision === "allowed").length;
  const allowedPercent = rate(allowed, sample.length);
  const completionPercent = rate(completed, Math.max(1, started + completed));
  const score = sample.length < 3 ? 0 : Math.round(allowedPercent * 0.6 + completionPercent * 0.4);
  const health: ExecutionHealth = sample.length < 3 ? "insufficient-data" : score >= 70 ? "healthy" : score >= 45 ? "watch" : "blocked";
  const trend = resolveTrend(sample);
  const blockCode = primaryBlock(sample);

  const headline = health === "insufficient-data"
    ? "正在建立执行基线"
    : health === "healthy"
      ? "执行系统运行健康"
      : health === "watch"
        ? "执行节奏需要收敛"
        : "执行受到持续阻塞";

  const insight = sample.length < 3
    ? "至少完成 3 次任务操作后，系统会生成可靠复盘。"
    : `最近 ${sample.length} 条证据中，允许率 ${allowedPercent}%，完成转化率 ${completionPercent}%。`;

  return {
    health,
    trend,
    score,
    sampleSize: sample.length,
    allowedRate: allowedPercent,
    completionRate: completionPercent,
    primaryBlockCode: blockCode,
    headline,
    insight,
    priorityAction: actionFor(blockCode, completionPercent),
    generatedAt: Date.now(),
  };
}
