import "server-only";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

import {
  runWithUserContext,
} from "@/lib/runtime/request-context";

import {
  isFounderConfigured,
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runFounderAutonomousLiveTest,
} from "@/lib/github/founder-autonomous-live-test";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function json(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

export async function GET(
  request: NextRequest,
) {
  const configured =
    isFounderConfigured();

  const authenticated =
    configured &&
    isFounderRequest(request);

  return json({
    success: true,

    code:
      "C141_12_E_READY",

    endpoint:
      "/api/founder/autonomous-development",

    method:
      "POST",

    founderOnly:
      true,

    authorizationConfigured:
      configured,

    authenticated,

    pipeline: [
      "FOUNDER_AUTH",
      "ALPHA_IDENTITY",
      "READ",
      "ANALYZE",
      "PLAN",
      "WRITE",
      "COMMIT",
      "READBACK",
      "VERIFY",
    ],
  });
}

export async function POST(
  request: NextRequest,
) {
  /*
   * ------------------------------------------------
   * C141.12-E.1
   *
   * Reuse the existing Founder Authentication
   * Contract used by C141 Live Verification.
   *
   * DO NOT use AlphaIdentity as Founder authorization.
   * ------------------------------------------------
   */

  if (!isFounderConfigured()) {
    return json(
      {
        success: false,

        code:
          "FOUNDER_NOT_CONFIGURED",

        error:
          "Founder access is not configured.",
      },
      503,
    );
  }

  if (!isFounderRequest(request)) {
    return json(
      {
        success: false,

        code:
          "FOUNDER_UNAUTHORIZED",

        error:
          "Founder authorization failed.",
      },
      401,
    );
  }

  const startedAt =
    Date.now();

  try {
    /*
     * AlphaIdentity remains responsible only
     * for runtime user isolation.
     */
    const identity =
      resolveAlphaIdentity(
        request,
      );

    const result =
      await runWithUserContext(
        identity.userId,
        async () =>
          runFounderAutonomousLiveTest(),
      );

    return json(
      {
        ...result,

        founderAuthenticated:
          true,

        userId:
          identity.userId,

        identityMode:
          "founder-alpha",

        latencyMs:
          Date.now() -
          startedAt,
      },
      result.success
        ? 200
        : 500,
    );
  } catch (error) {
    console.error(
      "[C141.12-E] Founder autonomous development failed",
      error,
    );

    return json(
      {
        success: false,

        code:
          "FOUNDER_AUTONOMOUS_RUNTIME_ERROR",

        error:
          error instanceof Error
            ? error.message
            : "Founder autonomous development failed.",

        latencyMs:
          Date.now() -
          startedAt,
      },
      500,
    );
  }
}
