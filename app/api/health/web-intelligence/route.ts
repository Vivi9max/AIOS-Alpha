import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  retrieveWebEvidence,
} from "@/lib/web-intelligence";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

export const maxDuration =
  30;

const HEALTH_PROMPT =
  "What is the latest major news about OpenAI today? Verify the current information using reliable external web sources.";

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
  const startedAt =
    Date.now();

  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        success: false,
        code:
          "WEB_INTELLIGENCE_HEALTH_UNAUTHORIZED",
        error:
          "Unauthorized.",
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

    const passed =
      evidence.success === true &&
      evidence.verified === true &&
      evidence.sourceCount >= 2 &&
      new Set(
        evidence.sourceHosts,
      ).size >= 2;

    const latencyMs =
      Date.now() - startedAt;

    if (!passed) {
      console.error(
        "[WEB_INTELLIGENCE_HEALTH_FAILED]",
        {
          success:
            evidence.success,
          verified:
            evidence.verified,
          sourceCount:
            evidence.sourceCount,
          sourceHosts:
            evidence.sourceHosts,
          error:
            evidence.error,
          latencyMs,
          timestamp:
            Date.now(),
        },
      );

      return NextResponse.json(
        {
          success: false,
          verified:
            evidence.verified,
          code:
            "C143_8_WEB_INTELLIGENCE_HEALTH_FAILED",
          stage:
            "web-intelligence",
          provider:
            evidence.provider,
          sourceCount:
            evidence.sourceCount,
          sourceHosts:
            evidence.sourceHosts,
          error:
            evidence.error ??
            "Web Intelligence health verification failed.",
          latencyMs,
          runtime:
            "aios-alpha",
          runtimeVersion:
            "0.5",
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

    console.info(
      "[WEB_INTELLIGENCE_HEALTH_PASS]",
      {
        sourceCount:
          evidence.sourceCount,
        sourceHosts:
          evidence.sourceHosts,
        latencyMs,
        timestamp:
          Date.now(),
      },
    );

    return NextResponse.json(
      {
        success: true,
        verified: true,
        code:
          "C143_8_WEB_INTELLIGENCE_HEALTH_PASS",
        stage:
          "web-intelligence",
        provider:
          evidence.provider,
        sourceCount:
          evidence.sourceCount,
        sourceHosts:
          evidence.sourceHosts,
        independentHosts:
          new Set(
            evidence.sourceHosts,
          ).size,
        latencyMs,
        runtime:
          "aios-alpha",
        runtimeVersion:
          "0.5",
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
      Date.now() - startedAt;

    console.error(
      "[WEB_INTELLIGENCE_HEALTH_ERROR]",
      {
        error: message,
        latencyMs,
        timestamp:
          Date.now(),
      },
    );

    return NextResponse.json(
      {
        success: false,
        verified: false,
        code:
          "C143_8_WEB_INTELLIGENCE_HEALTH_ERROR",
        stage:
          "web-intelligence",
        error: message,
        latencyMs,
        runtime:
          "aios-alpha",
        runtimeVersion:
          "0.5",
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
