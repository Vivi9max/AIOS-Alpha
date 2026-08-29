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
  runFounderAutonomousLiveTest,
} from "@/lib/github/founder-autonomous-live-test";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getFounderAccessKey(
  request: NextRequest,
): string {
  return (
    request.headers.get(
      "x-founder-access-key",
    )?.trim() ?? ""
  );
}

function isFounderAuthorized(
  request: NextRequest,
): boolean {
  const configuredKey =
    process.env.FOUNDER_ACCESS_KEY?.trim();

  if (!configuredKey) {
    return false;
  }

  const suppliedKey =
    getFounderAccessKey(request);

  return (
    suppliedKey.length > 0 &&
    suppliedKey === configuredKey
  );
}

export async function POST(
  request: NextRequest,
) {
  try {
    /*
     * Founder authorization is intentionally
     * independent from the normal AlphaIdentity.
     *
     * AlphaIdentity identifies a runtime user.
     * It does NOT represent Founder privileges.
     */
    if (!isFounderAuthorized(request)) {
      return NextResponse.json(
        {
          success: false,

          code:
            "FOUNDER_AUTONOMOUS_ACCESS_DENIED",

          error:
            "Founder authorization is required.",
        },
        {
          status: 403,
        },
      );
    }

    const identity =
      resolveAlphaIdentity(request);

    return await runWithUserContext(
      identity.userId,
      async () => {
        const result =
          await runFounderAutonomousLiveTest();

        return NextResponse.json(
          result,
          {
            status:
              result.success
                ? 200
                : 500,
          },
        );
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        code:
          "FOUNDER_AUTONOMOUS_RUNTIME_ERROR",

        error:
          error instanceof Error
            ? error.message
            : "Unknown runtime error.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function GET(
  request: NextRequest,
) {
  const configured =
    Boolean(
      process.env.FOUNDER_ACCESS_KEY?.trim(),
    );

  return NextResponse.json(
    {
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

      pipeline: [
        "FOUNDER_AUTH",
        "READ",
        "ANALYZE",
        "PLAN",
        "WRITE",
        "COMMIT",
        "READBACK",
        "VERIFY",
      ],
    },
    {
      status: 200,
    },
  );
}
