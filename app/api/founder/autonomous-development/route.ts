import "server-only";

import { NextRequest, NextResponse } from "next/server";

import {
  AIOS_USER_COOKIE,
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

const FOUNDER_ROLE = "founder";

function isFounderIdentity(
  identity: unknown,
): boolean {
  if (!identity || typeof identity !== "object") {
    return false;
  }

  const candidate =
    identity as {
      role?: unknown;
      isFounder?: unknown;
    };

  return (
    candidate.role === FOUNDER_ROLE ||
    candidate.isFounder === true
  );
}

export async function POST(
  request: NextRequest,
) {
  try {
    const cookie =
      request.cookies.get(
        AIOS_USER_COOKIE,
      )?.value;

    const identity =
      resolveAlphaIdentity(cookie);

    if (!isFounderIdentity(identity)) {
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

    return await runWithUserContext(
      identity,
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

export async function GET() {
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

      purpose:
        "Execute the Founder-only C141.12 autonomous development live test.",

      pipeline: [
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
