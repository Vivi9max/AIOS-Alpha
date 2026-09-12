import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  APP_CONFIG,
} from "@/lib/config/app";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  requiresWebIntelligence,
  retrieveWebEvidence,
} from "@/lib/web-intelligence";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

const VERIFICATION_PROMPT =
  "What is the latest major news about OpenAI today? Verify the current information using reliable external web sources.";

function buildFailureMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : "Web Intelligence verification failed.";
}

export async function GET(
  request: NextRequest,
) {
  const startedAt =
    Date.now();

  /*
   * Founder-only verification endpoint.
   *
   * Ordinary users do NOT receive access
   * to this diagnostic route.
   *
   * Ordinary users use Web Intelligence
   * transparently through /api/chat.
   */
  if (!isFounderRequest(request)) {
    return NextResponse.json(
      {
        success: false,
        verified: false,
        code:
          "FOUNDER_AUTH_REQUIRED",
        message:
          "Founder authentication is required.",
        runtime:
          APP_CONFIG.runtimeId,
        runtimeVersion:
          APP_CONFIG.version,
        timestamp:
          Date.now(),
        latencyMs:
          Date.now() -
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
    const apiKeyConfigured =
      Boolean(
        process.env
          .BRAVE_SEARCH_API_KEY?.trim(),
      );

    if (!apiKeyConfigured) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          stage:
            "configuration",
          code:
            "BRAVE_SEARCH_API_KEY_MISSING",
          message:
            "BRAVE_SEARCH_API_KEY is not configured.",
          runtime:
            APP_CONFIG.runtimeId,
          runtimeVersion:
            APP_CONFIG.version,
          timestamp:
            Date.now(),
          latencyMs:
            Date.now() -
            startedAt,
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

    const required =
      requiresWebIntelligence(
        VERIFICATION_PROMPT,
      );

    if (!required) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          stage:
            "intent-detection",
          code:
            "WEB_INTELLIGENCE_NOT_TRIGGERED",
          message:
            "The verification prompt did not trigger Web Intelligence.",
          prompt:
            VERIFICATION_PROMPT,
          runtime:
            APP_CONFIG.runtimeId,
          runtimeVersion:
            APP_CONFIG.version,
          timestamp:
            Date.now(),
          latencyMs:
            Date.now() -
            startedAt,
        },
        {
          status: 500,
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    const evidence =
      await retrieveWebEvidence(
        VERIFICATION_PROMPT,
      );

    const verified =
      evidence.success &&
      evidence.verified;

    return NextResponse.json(
      {
        success:
          verified,

        verified,

        stage:
          "external-evidence",

        code:
          verified
            ? "WEB_INTELLIGENCE_VERIFIED"
            : "WEB_INTELLIGENCE_FAILED",

        prompt:
          VERIFICATION_PROMPT,

        sourceCount:
          evidence.sourceCount,

        sourceHosts:
          evidence.sourceHosts,

        evidence:
          evidence.evidence,

        error:
          evidence.error,

        runtime:
          APP_CONFIG.runtimeId,

        runtimeVersion:
          APP_CONFIG.version,

        timestamp:
          Date.now(),

        latencyMs:
          Date.now() -
          startedAt,
      },
      {
        status:
          verified
            ? 200
            : 503,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    const message =
      buildFailureMessage(
        error,
      );

    console.error(
      "[C143.3 Web Intelligence Verification]",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        verified: false,
        stage:
          "runtime",
        code:
          "WEB_INTELLIGENCE_VERIFICATION_ERROR",
        error:
          message,
        runtime:
          APP_CONFIG.runtimeId,
        runtimeVersion:
          APP_CONFIG.version,
        timestamp:
          Date.now(),
        latencyMs:
          Date.now() -
          startedAt,
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}
