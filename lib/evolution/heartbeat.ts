import { storage, getStorageHealth } from "@/lib/server-storage";
import { createUserStorageKey } from "@/lib/storage/data-scope";
import { getPersistentExecutionMemory } from "@/lib/memory/execution-memory";
import { listOutcomes } from "@/lib/outcome/store";
import { listPersistentTasks } from "@/lib/task/server-store";
import { runWithUserContext } from "@/lib/runtime/request-context";

export type EvolutionPriority = "low" | "medium" | "high" | "critical";

export interface EvolutionInsight {
  id: string;
  createdAt: number;
  userId: string;
  priority: EvolutionPriority;
  category: "execution" | "planner" | "recovery" | "memory" | "stability";
  title: string;
  observation: string;
  recommendation: string;
  evidence: Record<string, number | string | boolean>;
  status: "open" | "observed";
}

export interface EvolutionHeartbeatResult {
  heartbeatId: string;
  userId: string;
  timestamp: number;
  storageMode: string;
  healthScore: number;
  execution: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
    recentCount: number;
    recentFailures: number;
    averageLatencyMs: number | null;
  };
  planner: {
    activeOutcomes: number;
    plannedOutcomes: number;
    doingTasks: number;
    todoTasks: number;
    doneTasks: number;
  };
  insights: EvolutionInsight[];
  nextAction: string;
}

const MAX_INSIGHTS = 100;
const TARGETS_KEY = "aios:evolution:targets";
const HEARTBEAT_INDEX_KEY = "aios:evolution:heartbeat-index";

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildInsights(
  userId: string,
  memory: Awaited<ReturnType<typeof getPersistentExecutionMemory>>,
  outcomes: Awaited<ReturnType<typeof listOutcomes>>,
  tasks: Awaited<ReturnType<typeof listPersistentTasks>>,
): EvolutionInsight[] {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = memory.filter((item) => item.createdAt >= cutoff);
  const failures = recent.filter((item) => !item.success);
  const executionFailures = failures.filter(
    (item) => item.eventType === "execution-failed",
  );

  const insights: EvolutionInsight[] = [];
  const activeOutcomes = outcomes.filter((o) => o.status === "active").length;
  const doingTasks = tasks.filter((t) => t.status === "doing").length;
  const todoTasks = tasks.filter((t) => t.status === "todo").length;

  if (executionFailures.length > 0) {
    insights.push({
      id: makeId("evolution"),
      createdAt: Date.now(),
      userId,
      priority: executionFailures.length >= 3 ? "high" : "medium",
      category: "recovery",
      title: "Execution failures detected",
      observation: `${executionFailures.length} execution failure event(s) were recorded in the last 7 days.`,
      recommendation: "Prioritize retry/recovery verification before increasing autonomous execution volume.",
      evidence: { recentFailures: failures.length, executionFailures: executionFailures.length },
      status: "open",
    });
  }

  if (activeOutcomes > 0 && todoTasks > 0 && doingTasks === 0) {
    insights.push({
      id: makeId("evolution"),
      createdAt: Date.now(),
      userId,
      priority: "medium",
      category: "planner",
      title: "Planner queue is waiting",
      observation: "An active Outcome has executable todo tasks but no task is currently running.",
      recommendation: "Next evolution step: safely select one eligible Planner task for execution.",
      evidence: { activeOutcomes, todoTasks, doingTasks },
      status: "open",
    });
  }

  if (memory.length > 0 && recent.length >= 3 && failures.length === 0) {
    insights.push({
      id: makeId("evolution"),
      createdAt: Date.now(),
      userId,
      priority: "low",
      category: "execution",
      title: "Stable execution streak",
      observation: "Recent execution memory contains no failure events.",
      recommendation: "Preserve the current runtime path and increase automation only through verified, reversible steps.",
      evidence: { recentCount: recent.length, failures: 0 },
      status: "observed",
    });
  }

  if (memory.length === 0) {
    insights.push({
      id: makeId("evolution"),
      createdAt: Date.now(),
      userId,
      priority: "low",
      category: "memory",
      title: "Evolution baseline not established",
      observation: "No persistent execution-memory events are available yet.",
      recommendation: "Continue recording execution, verification and recovery events before enabling more autonomous actions.",
      evidence: { executionMemoryRecords: 0 },
      status: "open",
    });
  }

  return insights;
}

export async function runEvolutionHeartbeat(userId: string): Promise<EvolutionHeartbeatResult> {
  return runWithUserContext(userId, async () => {
    const timestamp = Date.now();
    const [memory, outcomes, tasks, storageHealth] = await Promise.all([
      getPersistentExecutionMemory(),
      listOutcomes(),
      listPersistentTasks(),
      getStorageHealth(),
    ]);

    const recent = memory.filter(
      (item) => item.createdAt >= timestamp - 7 * 24 * 60 * 60 * 1000,
    );
    const successful = memory.filter((item) => item.success).length;
    const failed = memory.filter((item) => !item.success).length;
    const successRate = memory.length
      ? Math.round((successful / memory.length) * 100)
      : 100;
    const recentFailures = recent.filter((item) => !item.success).length;
    const latencyValues = memory
      .map((item) => item.metrics.latencyMs)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const averageLatencyMs = latencyValues.length
      ? Math.round(latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length)
      : null;

    const planner = {
      activeOutcomes: outcomes.filter((o) => o.status === "active").length,
      plannedOutcomes: outcomes.filter((o) => o.status === "planned").length,
      doingTasks: tasks.filter((t) => t.status === "doing").length,
      todoTasks: tasks.filter((t) => t.status === "todo").length,
      doneTasks: tasks.filter((t) => t.status === "done").length,
    };

    let healthScore = 100;
    if (!storageHealth.success) healthScore -= 35;
    if (recentFailures > 0) healthScore -= Math.min(35, recentFailures * 10);
    if (planner.activeOutcomes > 0 && planner.todoTasks > 0 && planner.doingTasks === 0) {
      healthScore -= 10;
    }
    healthScore = Math.max(0, Math.min(100, healthScore));

    const insights = buildInsights(userId, memory, outcomes, tasks);
    const insightKey = createUserStorageKey("evolution-insights");
    const previous = (await storage.get<EvolutionInsight[]>(insightKey)) ?? [];
    await storage.set(insightKey, [...previous, ...insights].slice(-MAX_INSIGHTS));

    const nextAction =
      recentFailures > 0
        ? "Investigate and recover failed executions before increasing autonomy."
        : planner.activeOutcomes > 0 && planner.todoTasks > 0
          ? "Select the next eligible Planner task for safe autonomous execution."
          : "Observe execution, consolidate memory, and wait for the next verified opportunity.";

    const result: EvolutionHeartbeatResult = {
      heartbeatId: makeId("heartbeat"),
      userId,
      timestamp,
      storageMode: storageHealth.mode,
      healthScore,
      execution: {
        total: memory.length,
        successful,
        failed,
        successRate,
        recentCount: recent.length,
        recentFailures,
        averageLatencyMs,
      },
      planner,
      insights,
      nextAction,
    };

    const index = (await storage.get<Array<{
      heartbeatId: string;
      userId: string;
      timestamp: number;
      healthScore: number;
      nextAction: string;
    }>>(HEARTBEAT_INDEX_KEY)) ?? [];

    await storage.set(
      HEARTBEAT_INDEX_KEY,
      [...index, {
        heartbeatId: result.heartbeatId,
        userId,
        timestamp,
        healthScore,
        nextAction,
      }].slice(-100),
    );

    await storage.set(createUserStorageKey("evolution-last-heartbeat"), result);
    return result;
  });
}

export async function registerEvolutionTarget(userId: string) {
  const targets = (await storage.get<string[]>(TARGETS_KEY)) ?? [];
  if (!targets.includes(userId)) {
    await storage.set(TARGETS_KEY, [...targets, userId].slice(-100));
  }
  return {
    registered: true,
    userId,
    targetCount: targets.includes(userId) ? targets.length : targets.length + 1,
  };
}

export async function listEvolutionTargets() {
  return (await storage.get<string[]>(TARGETS_KEY)) ?? [];
}
