import {
  getStorageHealth,
  getStorageMode,
  getWorkspaceId,
  storage,
} from "@/lib/server-storage";
import { createUserStorageKey } from "@/lib/storage/data-scope";
import { getPersistentExecutionMemory } from "@/lib/memory/execution-memory";
import { listOutcomes } from "@/lib/outcome/store";
import { listPersistentTasks } from "@/lib/task/server-store";
import { runWithUserContext } from "@/lib/runtime/request-context";
import { listEvolutionTargets } from "@/lib/evolution/heartbeat";

export type AutonomyGateLevel = "blocked" | "observation" | "autonomous";
export type AutonomyGateDecision = "hold" | "observe" | "execute-one";

export interface AutonomyGateResult {
  success: boolean;
  timestamp: number;
  workspaceId: string;
  targetUserId: string | null;
  level: AutonomyGateLevel;
  ready: boolean;
  decision: AutonomyGateDecision;
  reason: string;
  blockers: string[];
  recommendations: string[];
  checks: {
    persistentStorageReady: boolean;
    cronSecretConfigured: boolean;
    targetRegistered: boolean;
    heartbeatAvailable: boolean;
    heartbeatFresh: boolean;
    healthScore: number | null;
    recentFailures: number;
    activeOutcomes: number;
    doingTasks: number;
    todoTasks: number;
  };
  candidateTask: {
    id: string;
    title: string;
    description: string;
  } | null;
}

interface StoredHeartbeat {
  heartbeatId?: string;
  timestamp?: number;
  healthScore?: number;
  nextAction?: string;
}

const HEARTBEAT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MIN_AUTONOMY_HEALTH_SCORE = 90;

export async function evaluateAutonomyGate(): Promise<AutonomyGateResult> {
  const timestamp = Date.now();
  const storageHealth = await getStorageHealth();
  const storageMode = getStorageMode();
  const workspaceId = getWorkspaceId();
  const targets = await listEvolutionTargets();
  const targetUserId = targets[0] ?? null;
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET?.trim());

  const blockers: string[] = [];
  const recommendations: string[] = [];

  if (storageMode !== "redis" || !storageHealth.success) {
    blockers.push("Persistent Redis storage is not ready.");
    recommendations.push(
      "Configure and verify UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN before autonomous execution.",
    );
  }

  if (!cronSecretConfigured) {
    blockers.push("CRON_SECRET is not configured.");
    recommendations.push(
      "Configure CRON_SECRET in the Vercel Production environment.",
    );
  }

  if (!targetUserId) {
    blockers.push("No Evolution target is registered.");
    recommendations.push(
      "Register the active AIOS workspace through /api/evolution/register.",
    );
  }

  let heartbeat: StoredHeartbeat | null = null;
  let recentFailures = 0;
  let activeOutcomes = 0;
  let doingTasks = 0;
  let todoTasks = 0;
  let candidateTask: AutonomyGateResult["candidateTask"] = null;

  if (targetUserId) {
    await runWithUserContext(targetUserId, async () => {
      heartbeat = await storage.get<StoredHeartbeat>(
        createUserStorageKey("evolution-last-heartbeat"),
      );

      const [memory, outcomes, tasks] = await Promise.all([
        getPersistentExecutionMemory(),
        listOutcomes(),
        listPersistentTasks(),
      ]);

      const recentCutoff = timestamp - 24 * 60 * 60 * 1000;
      recentFailures = memory.filter(
        (item) => item.createdAt >= recentCutoff && !item.success,
      ).length;

      activeOutcomes = outcomes.filter((item) => item.status === "active").length;
      doingTasks = tasks.filter((item) => item.status === "doing").length;
      todoTasks = tasks.filter((item) => item.status === "todo").length;

      const firstTodo = tasks.find((item) => item.status === "todo");
      if (firstTodo) {
        candidateTask = {
          id: firstTodo.id,
          title: firstTodo.title,
          description: firstTodo.description,
        };
      }
    });
  }

  const heartbeatAvailable = Boolean(heartbeat?.heartbeatId);
  const heartbeatFresh =
    heartbeatAvailable &&
    typeof heartbeat?.timestamp === "number" &&
    timestamp - heartbeat.timestamp <= HEARTBEAT_MAX_AGE_MS;

  if (!heartbeatAvailable) {
    blockers.push("No Evolution Heartbeat result is available.");
    recommendations.push(
      "Run the authenticated Evolution Heartbeat before enabling autonomous actions.",
    );
  } else if (!heartbeatFresh) {
    blockers.push("The latest Evolution Heartbeat is stale.");
    recommendations.push(
      "Run the Evolution Heartbeat again before allowing autonomous actions.",
    );
  }

  const healthScore =
    typeof heartbeat?.healthScore === "number"
      ? heartbeat.healthScore
      : null;

  if (healthScore !== null && healthScore < MIN_AUTONOMY_HEALTH_SCORE) {
    blockers.push(
      `Heartbeat health score ${healthScore} is below the autonomy threshold ${MIN_AUTONOMY_HEALTH_SCORE}.`,
    );
    recommendations.push(
      "Resolve recent execution or planner instability before increasing autonomy.",
    );
  }

  if (recentFailures > 0) {
    blockers.push(`${recentFailures} execution failure(s) occurred in the last 24 hours.`);
    recommendations.push(
      "Investigate failed executions and verify recovery before autonomous execution.",
    );
  }

  if (activeOutcomes > 0 && doingTasks === 0 && todoTasks > 0) {
    // This is the only queue shape C140 considers eligible for one safe action.
  } else if (todoTasks === 0) {
    recommendations.push("Wait for a Planner task to enter the todo queue.");
  } else if (doingTasks > 0) {
    recommendations.push(
      "Wait for the currently running task to complete before dispatching another autonomous task.",
    );
  }

  const queueEligible =
    activeOutcomes > 0 &&
    doingTasks === 0 &&
    todoTasks > 0 &&
    candidateTask !== null;

  if (!queueEligible && blockers.length === 0) {
    blockers.push("No safe autonomous task is currently eligible.");
  }

  const ready = blockers.length === 0 && queueEligible;
  const level: AutonomyGateLevel = ready
    ? "autonomous"
    : blockers.some((item) =>
        item.includes("Persistent") ||
        item.includes("CRON_SECRET") ||
        item.includes("No Evolution target"),
      )
      ? "blocked"
      : "observation";

  const decision: AutonomyGateDecision = ready
    ? "execute-one"
    : heartbeatAvailable
      ? "observe"
      : "hold";

  const reason = ready
    ? "All autonomy checks passed. Exactly one eligible Planner task may be dispatched."
    : decision === "observe"
      ? "AIOS is healthy enough to observe, but the autonomy gate is not permitting execution."
      : "AIOS must remain blocked until the required runtime prerequisites are satisfied.";

  return {
    success: storageHealth.success,
    timestamp,
    workspaceId,
    targetUserId,
    level,
    ready,
    decision,
    reason,
    blockers,
    recommendations,
    checks: {
      persistentStorageReady:
        storageMode === "redis" && storageHealth.success,
      cronSecretConfigured,
      targetRegistered: Boolean(targetUserId),
      heartbeatAvailable,
      heartbeatFresh,
      healthScore,
      recentFailures,
      activeOutcomes,
      doingTasks,
      todoTasks,
    },
    candidateTask,
  };
}
