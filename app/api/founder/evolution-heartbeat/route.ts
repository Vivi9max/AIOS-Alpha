import "server-only";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderConfigured,
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

import {
  runWithUserContext,
} from "@/lib/runtime/request-context";

import {
  listEvolutionTargets,
  runEvolutionHeartbeat,
} from "@/lib/evolution/heartbeat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

function json(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(
    {
      ...body,
      timestamp: Date.now(),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type":
          "application/json; charset=utf-8",
      },
    },
  );
}

export async function POST(
  request: NextRequest,
) {
  const startedAt = Date.now();

  if (!isFounderConfigured()) {
    return json(
      {
        success: false,
        service:
          "AIOS Founder Evolution Heartbeat",
        status: "not-configured",
        error:
          "Founder Access Key is not configured.",
      },
      503,
    );
  }

  if (!isFounderRequest(request)) {
    return json(
      {
        success: false,
        service:
          "AIOS Founder Evolution Heartbeat",
        status: "unauthorized",
        error: "Founder authentication required.",
      },
      401,
    );
  }

  try {
    const identity =
      resolveAlphaIdentity(request);

    const targets =
      await listEvolutionTargets();

    const registered =
      targets.includes(identity.userId);

    if (!registered) {
      return json(
        {
          success: false,
          service:
            "AIOS Founder Evolution Heartbeat",
          status: "not-registered",
          userId: identity.userId,
          targetCount: targets.length,
          error:
            "Current Founder workspace is not registered for Evolution Heartbeats.",
        },
        409,
      );
    }

    const result =
      await runWithUserContext(
        identity.userId,
        () =>
          runEvolutionHeartbeat(
            identity.userId,
          ),
      );

    return json(
      {
        success: true,
        service:
          "AIOS Founder Evolution Heartbeat",
        status: "executed",
        mode: "founder-manual-trigger",
        identity: {
          userId: identity.userId,
          isolated: true,
        },
        target: {
          registered: true,
          targetCount: targets.length,
        },
        heartbeat: {
          heartbeatId:
            result.heartbeatId,
          healthScore:
            result.healthScore,
          storageMode:
            result.storageMode,
          nextAction:
            result.nextAction,
        },
        durationMs:
          Date.now() - startedAt,
      },
    );
  } catch (error) {
    return json(
      {
        success: false,
        service:
          "AIOS Founder Evolution Heartbeat",
        status: "failed",
        error:
          error instanceof Error
            ? error.message
            : "Founder Evolution Heartbeat failed.",
        durationMs:
          Date.now() - startedAt,
      },
      500,
    );
  }
}

export async function GET(
  request: NextRequest,
) {
  return json(
    {
      success: true,
      service:
        "AIOS Founder Evolution Heartbeat",
      status: "online",
      mode: "read-only",
      endpoint:
        "/api/founder/evolution-heartbeat",
      execution: {
        method: "POST",
        founderOnly: true,
        bounded: true,
      },
      hint:
        "Use an authenticated POST request to trigger one bounded Evolution Heartbeat.",
    },
  );
}
