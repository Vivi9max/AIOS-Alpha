import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  getVideoVisionStatus,
} from "@/lib/runtime/video-vision-status-runtime";

export const runtime = "nodejs";

export const dynamic =
  "force-dynamic";

export async function GET(
  request: NextRequest,
) {
  const startedAt =
    Date.now();

  if (
    !isFounderRequest(
      request,
    )
  ) {
    return NextResponse.json(
      {
        success: false,

        verified: false,

        code:
          "FOUNDER_AUTH_REQUIRED",

        message:
          "Founder authentication is required.",

        runtime:
          "aios-alpha",

        runtimeVersion:
          "0.5",

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

  const status =
    getVideoVisionStatus();

  return NextResponse.json(
    {
      success:
        status.success,

      verified:
        true,

      code:
        status.code,

      runtime:
        "aios-alpha",

      runtimeVersion:
        "0.5",

      timestamp:
        Date.now(),

      latencyMs:
        Date.now() -
        startedAt,

      vision:
        status,
    },
    {
      status: 200,

      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}
