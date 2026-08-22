import { NextRequest, NextResponse } from "next/server";
import {
  listEvolutionTargets,
  runEvolutionHeartbeat,
} from "@/lib/evolution/heartbeat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return false;
  }

  const authorization =
    request.headers.get("authorization");

  if (
    authorization ===
    `Bearer ${secret}`
  ) {
    return true;
  }

  /*
   * Vercel Cron requests can also expose
   * the x-vercel-cron header.
   *
   * Keep CRON_SECRET configured as the
   * production security requirement.
   */
  const vercelCron =
    request.headers.get("x-vercel-cron");

  if (
    vercelCron === "1" &&
    process.env.VERCEL === "1"
  ) {
    return true;
  }

  return false;
}

export async function GET(
  request: NextRequest,
) {
  const startedAt = Date.now();

  if (!isAuthorized(request)) {
    console.error(
      "[EVOLUTION_HEARTBEAT_UNAUTHORIZED]",
      {
        timestamp: startedAt,
        vercel:
          process.env.VERCEL === "1",
        hasCronSecret:
          Boolean(
            process.env.CRON_SECRET?.trim(),
          ),
        hasAuthorization:
          Boolean(
            request.headers.get(
              "authorization",
            ),
          ),
        hasVercelCronHeader:
          Boolean(
            request.headers.get(
              "x-vercel-cron",
            ),
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
        "No Evolution target is registered yet.",
      timestamp: Date.now(),
    });
  }

  const results = [];

  for (const userId of targets) {
    const targetStartedAt =
      Date.now();

    console.info(
      "[EVOLUTION_HEARTBEAT_TARGET_STARTED]",
      {
        userId,
        timestamp:
          targetStartedAt,
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

      results.push({
        success: true,
        userId,
        heartbeatId:
          result.heartbeatId,
        healthScore:
          result.healthScore,
        nextAction:
          result.nextAction,
      });
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
        success: false,
        userId,
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
      successfulTargets:
        results.filter(
          (item) =>
            item.success,
        ).length,
      failedTargets:
        results.filter(
          (item) =>
            !item.success,
        ).length,
      durationMs,
      timestamp:
        Date.now(),
    },
  );

  return NextResponse.json({
    success: true,
    ran: true,
    targetCount:
      targets.length,
    results,
    durationMs,
    timestamp:
      Date.now(),
  });
}
