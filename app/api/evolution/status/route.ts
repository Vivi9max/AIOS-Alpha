import { NextRequest, NextResponse } from "next/server";
import {
  getStorageHealth,
  getStorageMode,
  getWorkspaceId,
  storage,
} from "@/lib/server-storage";
import { createUserStorageKey } from "@/lib/storage/data-scope";
import { listEvolutionTargets } from "@/lib/evolution/heartbeat";
import { runWithUserContext } from "@/lib/runtime/request-context";
import { evaluateAutonomyGate } from "@/lib/evolution/autonomy-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type StoredHeartbeat = {
  heartbeatId?: string;
  timestamp?: number;
  healthScore?: number;
  nextAction?: string;
};

export async function GET(_request: NextRequest) {
  const timestamp = Date.now();

  const storageHealth = await getStorageHealth();
  const storageMode = getStorageMode();
  const workspaceId = getWorkspaceId();
  const targets = await listEvolutionTargets();
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET?.trim());
  const targetUserId = targets[0] ?? null;

  const lastHeartbeat = targetUserId
    ? await runWithUserContext(targetUserId, async () =>
        storage.get<StoredHeartbeat>(
          createUserStorageKey("evolution-last-heartbeat"),
        ),
      )
    : null;

  const autonomyGate = await evaluateAutonomyGate();

  const blockers = autonomyGate.blockers;
  const recommendations = autonomyGate.recommendations;

  return NextResponse.json(
    {
      success: storageHealth.success,
      timestamp,
      evolution: {
        enabled: true,
        schedulerConfigured: true,
        cronSecretConfigured,
        storageMode,
        persistentStorageReady:
          storageMode === "redis" && storageHealth.success,
        targetCount: targets.length,
        workspaceId,
      },
      lastHeartbeat: {
        available: Boolean(lastHeartbeat),
        heartbeatId: lastHeartbeat?.heartbeatId ?? null,
        timestamp: lastHeartbeat?.timestamp ?? null,
        healthScore:
          typeof lastHeartbeat?.healthScore === "number"
            ? lastHeartbeat.healthScore
            : null,
        nextAction: lastHeartbeat?.nextAction ?? null,
      },
      autonomy: {
        ready: autonomyGate.ready,
        level: autonomyGate.level,
        decision: autonomyGate.decision,
        reason: autonomyGate.reason,
        blockers,
        recommendations,
        candidateTask: autonomyGate.candidateTask,
        checks: autonomyGate.checks,
      },
    },
    {
      status: storageHealth.success ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
