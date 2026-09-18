import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  retrieveWebEvidence,
} from "@/lib/web-intelligence";

import {
  saveWebIntelligenceHealth,
} from "@/lib/web-intelligence/health";

import {
  APP_CONFIG,
} from "@/lib/config/app";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

export const maxDuration =
  30;

const HEALTH_PROMPT =
  "What is the latest major news about OpenAI today? Verify the current information using reliable external web sources.";

function runtimeMeta() {
  return {
    runtime:
      APP_CONFIG.runtimeId,

    runtimeVersion:
      APP_CONFIG.version,

    release:
      APP_CONFIG.release,
  };
}

function isAuthorized(
  request: NextRequest,
) {
  const secret =
    process.env.CRON_SECRET?.trim();

  if (!secret) {
    return false;
  }

  const authorization =
    request.headers.get(
      "authorization",
    );

  if (
    authorization ===
    `Bearer ${secret}`
  ) {
    return true;
  }

  const vercelCron =
    request.headers.get(
      "x-vercel-cron",
    );

  return (
    vercelCron === "1" &&
    process.env.VERCEL === "1"
  );
}

async function persistHealth(
  state: Parameters<
    typeof saveWebIntelligenceHealth
  >[0],
): Promise<boolean> {
  try {
    await saveWebIntelligenceHealth(
      state,
    );

    return true;
  } catch (error) {
    console.error(
      "[WEB_INTELLIGENCE_HEALTH_PERSIST_FAILED]",
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to persist Web Intelligence health.",
        timestamp:
          Date.now(),
      },
    );

    return false;
  }
}

export async function GET(
  request: NextRequest,
) {
  const startedAt =
    Date.now();

  if (
    !isAuthorized(request)
  ) {
    return NextResponse.json(
      {
        success: false,

        code:
          "WEB_INTELLIGENCE_HEALTH_UNAUTHORIZED",

        error:
          "Unauthorized.",

        ...runtimeMeta(),

        timestamp:
          startedAt,
      },
      {
        status: 401,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }

  try {
    const evidence =
      await retrieveWebEvidence(
        HEALTH_PROMPT,
      );

    const independentHosts =
      new Set(
        evidence.sourceHosts,
      ).size;

    const passed =
      evidence.success === true &&
      evidence.verified === true &&
      evidence.sourceCount >= 2 &&
      independentHosts >= 2;

    const latencyMs =
      Date.now() -
      startedAt;

    const healthState = {
      success:
        passed,

      verified:
        evidence.verified,

      sourceCount:
        evidence.sourceCount,

      independentHosts,

      provider:
        evidence.provider,

      latencyMs,

      code:
        passed
          ? "C143_9_WEB_INTELLIGENCE_HEALTH_PASS"
          : "C143_9_WEB_INTELLIGENCE_HEALTH_FAILED",

      timestamp:
        Date.now(),
    };

    const persisted =
      await persistHealth(
        healthState,
      );

    if (!passed) {
      return NextResponse.json(
        {
          success: false,

          verified:
            evidence.verified,

          code:
            "C143_9_WEB_INTELLIGENCE_HEALTH_FAILED",

          stage:
            "web-intelligence",

          provider:
            evidence.provider,

          sourceCount:
            evidence.sourceCount,

          sourceHosts:
            evidence.sourceHosts,

          independentHosts,

          persisted,

          error:
            evidence.error ??
            "Web Intelligence health verification failed.",

          latencyMs,

          ...runtimeMeta(),

          timestamp:
            Date.now(),
        },
        {
          status: 503,
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    if (!persisted) {
      return NextResponse.json(
        {
          success: false,
          verified: true,

          code:
            "C143_9_WEB_INTELLIGENCE_HEALTH_PERSIST_FAILED",

          stage:
            "web-intelligence",

          provider:
            evidence.provider,

          sourceCount:
            evidence.sourceCount,

          sourceHosts:
            evidence.sourceHosts,

          independentHosts,

          persisted: false,

          error:
            "Web Intelligence passed, but the health state could not be persisted.",

          latencyMs,

          ...runtimeMeta(),

          timestamp:
            Date.now(),
        },
        {
          status: 503,
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        verified: true,

        code:
          "C143_9_WEB_INTELLIGENCE_HEALTH_PASS",

        stage:
          "web-intelligence",

        provider:
          evidence.provider,

        sourceCount:
          evidence.sourceCount,

        sourceHosts:
          evidence.sourceHosts,

        independentHosts,

        persisted: true,

        latencyMs,

        ...runtimeMeta(),

        timestamp:
          Date.now(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Web Intelligence health check failed.";

    const latencyMs =
      Date.now() -
      startedAt;

    const healthState = {
      success: false,
      verified: false,
      sourceCount: 0,
      independentHosts: 0,
      provider: "brave",
      latencyMs,

      code:
        "C143_9_WEB_INTELLIGENCE_HEALTH_ERROR",

      timestamp:
        Date.now(),
    };

    const persisted =
      await persistHealth(
        healthState,
      );

    return NextResponse.json(
      {
        success: false,
        verified: false,

        code:
          "C143_9_WEB_INTELLIGENCE_HEALTH_ERROR",

        stage:
          "web-intelligence",

        persisted,

        error: message,

        latencyMs,

        ...runtimeMeta(),

        timestamp:
          Date.now(),
      },
      {
        status: 503,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}
