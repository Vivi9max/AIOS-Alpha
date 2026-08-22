import { NextRequest, NextResponse } from "next/server";
import {
  listEvolutionTargets,
  runEvolutionHeartbeat,
} from "@/lib/evolution/heartbeat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();

  return (
    Boolean(secret) &&
    request.headers.get("authorization") ===
      `Bearer ${secret}`
  );
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();

  if (!authorized(request)) {
    console.error(
      "[EVOLUTION_HEARTBEAT_UNAUTHORIZED]",
      {
        timestamp: startedAt,
        hasCronSecret:
          Boolean(
            process.env.CRON_SECRET?.trim(),
          ),
      },
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized.",
        timestamp: startedAt,
      },
      { status: 401 },
    );
  }

  console.info(
    "[EVOLUTION_HEARTBEAT_STARTED]",
    {
      timestamp: startedAt,
    },
  );

  const targets =
    await listEvolutionTargets();

  if (targets.length === 0) {
    console.warn(
      "[EVOLUTION_HEARTBEAT_NO_TARGET]",
      {
        timestamp: Date.now(),
      },
    );

    return NextResponse.json({
      success: true,
      ran: false,
      reason:
        "No Evolution target is registered yet. Open /api/evolution/register once from the AIOS workspace.",
      timestamp: Date.now(),
    });
  }

  const results = [];

  for (const userId of targets) {
    const targetStartedAt = Date.now();

    console.info(
      "[EVOLUTION_HEARTBEAT_TARGET_STARTED]",
      {
        userId,
        timestamp: targetStartedAt,
      },
    );

    try {
      const result =
        await runEvolutionHeartbeat(
          userId,
        );

      console.info(
        "[EVOLUTION_HEARTBEAT_TARGET_COMPLETED]",
        {
          userId,
          heartbeatId:
            result.heartbeatId,
          healthScore:
            result.healthScore,
          storageMode:
            result.storageMode,
          durationMs:
            Date.now() -
            targetStartedAt,
        },
      );

      results.push(result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Evolution heartbeat failed.";

      console.error(
        "[EVOLUTION_HEARTBEAT_TARGET_FAILED]",
        {
          userId,
          error: message,
          durationMs:
            Date.now() -
            targetStartedAt,
        },
      );

      results.push({
        userId,
        success: false,
        error: message,
      });
    }
  }

  const durationMs =
    Date.now() - startedAt;

  console.info(
    "[EVOLUTION_HEARTBEAT_COMPLETED]",
    {
      targetCount:
        targets.length,
      durationMs,
      timestamp: Date.now(),
      successfulTargets:
        results.filter(
          (item) =>
            "heartbeatId" in item &&
            Boolean(item.heartbeatId),
        ).length,
      failedTargets:
        results.filter(
          (item) =>
            "success" in item &&
            item.success === false,
        ).length,
    },
  );

  return NextResponse.json({
    success: true,
    ran: true,
    targetCount: targets.length,
    results,
    durationMs,
    timestamp: Date.now(),
  });
}
