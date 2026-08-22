import { NextRequest, NextResponse } from "next/server";
import {
  getStorageHealth,
  getStorageMode,
  getWorkspaceId,
  storage,
} from "@/lib/server-storage";
import { listEvolutionTargets } from "@/lib/evolution/heartbeat";
import { createUserStorageKey } from "@/lib/storage/data-scope";
import { runWithUserContext } from "@/lib/runtime/request-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EvolutionStatus = {
  success: boolean;
  timestamp: number;

  evolution: {
    enabled: boolean;
    schedulerConfigured: boolean;
    cronSecretConfigured: boolean;
    storageMode: "redis" | "memory";
    persistentStorageReady: boolean;
    targetCount: number;
    workspaceId: string;
  };

  lastHeartbeat: {
    available: boolean;
    heartbeatId: string | null;
    timestamp: number | null;
    healthScore: number | null;
    nextAction: string | null;
  };

  autonomy: {
    ready: boolean;
    level: "blocked" | "observation" | "autonomous";
    blockers: string[];
    recommendations: string[];
  };
};

type StoredHeartbeat = {
  heartbeatId?: string;
  timestamp?: number;
  healthScore?: number;
  nextAction?: string;
};

function isCronConfigured() {
  return Boolean(process.env.CRON_SECRET?.trim());
}

function buildAutonomyState(
  storageMode: "redis" | "memory",
  cronSecretConfigured: boolean,
  targetCount: number,
  lastHeartbeatAvailable: boolean,
) {
  const blockers: string[] = [];
  const recommendations: string[] = [];

  if (storageMode !== "redis") {
    blockers.push(
      "Persistent Redis storage is not configured. Autonomous state may not survive serverless instance changes.",
    );

    recommendations.push(
      "Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for persistent Evolution state.",
    );
  }

  if (!cronSecretConfigured) {
    blockers.push(
      "CRON_SECRET is not configured. The Evolution heartbeat scheduler cannot be securely invoked.",
    );

    recommendations.push(
      "Configure CRON_SECRET in the Vercel Production environment.",
    );
  }

  if (targetCount === 0) {
    blockers.push("No Evolution target is registered.");

    recommendations.push(
      "Register the active AIOS workspace through /api/evolution/register.",
    );
  }

  if (!lastHeartbeatAvailable) {
    blockers.push(
      "No Evolution Heartbeat result has been recorded yet.",
    );

    recommendations.push(
      "Run the authenticated Evolution Heartbeat once after target registration.",
    );
  }

  if (blockers.length === 0) {
    return {
      ready: true,
      level: "autonomous" as const,
      blockers,
      recommendations,
    };
  }

  if (storageMode === "memory" && targetCount === 0) {
    return {
      ready: false,
      level: "blocked" as const,
      blockers,
      recommendations,
    };
  }

  return {
    ready: false,
    level: "observation" as const,
    blockers,
    recommendations,
  };
}

export async function GET(_request: NextRequest) {
  const timestamp = Date.now();

  const storageHealth = await getStorageHealth();
  const storageMode = getStorageMode();
  const workspaceId = getWorkspaceId();
  const targets = await listEvolutionTargets();
  const cronSecretConfigured = isCronConfigured();

  /*
   * C139.1:
   *
   * Evolution Heartbeat executes against registered targets.
   * The status endpoint must read the same target-scoped
   * persistent state.
   *
   * Do not create a new anonymous browser identity here.
   */
  const targetUserId = targets[0] ?? "system";

  const lastHeartbeat = await runWithUserContext(
    targetUserId,
    async () =>
      storage.get<StoredHeartbeat>(
        createUserStorageKey(
          "evolution-last-heartbeat",
        ),
      ),
  );

  const autonomy = buildAutonomyState(
    storageMode,
    cronSecretConfigured,
    targets.length,
    Boolean(lastHeartbeat),
  );

  const result: EvolutionStatus = {
    success: storageHealth.success,
    timestamp,

    evolution: {
      enabled: true,
      schedulerConfigured: true,
      cronSecretConfigured,
      storageMode,
      persistentStorageReady:
        storageMode === "redis" &&
        storageHealth.success,
      targetCount: targets.length,
      workspaceId,
    },

    lastHeartbeat: {
      available: Boolean(lastHeartbeat),
      heartbeatId:
        lastHeartbeat?.heartbeatId ??
        null,
      timestamp:
        lastHeartbeat?.timestamp ??
        null,
      healthScore:
        typeof lastHeartbeat?.healthScore ===
        "number"
          ? lastHeartbeat.healthScore
          : null,
      nextAction:
        lastHeartbeat?.nextAction ??
        null,
    },

    autonomy,
  };

  return NextResponse.json(result);
}
