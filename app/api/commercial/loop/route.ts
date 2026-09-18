import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  ensureCommercialOperatingLoop,
} from "@/lib/commercial/operating-loop";

import {
  APP_CONFIG,
} from "@/lib/config/app";

function runtimeIdentity() {
  return {
    runtime:
      APP_CONFIG.runtimeId,

    runtimeVersion:
      APP_CONFIG.version,

    release:
      APP_CONFIG.release,
  };
}

function response(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(
    {
      ...body,
      ...runtimeIdentity(),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(
  request: NextRequest,
) {
  const startedAt =
    Date.now();

  try {
    const body =
      (await request.json()) as {
        objectiveId?: unknown;
      };

    const objectiveId =
      typeof body.objectiveId ===
      "string"
        ? body.objectiveId.trim()
        : "";

    if (!objectiveId) {
      return response(
        {
          success: false,
          error:
            "COMMERCIAL_OBJECTIVE_ID_REQUIRED",
        },
        400,
      );
    }

    const result =
      await ensureCommercialOperatingLoop(
        objectiveId,
      );

    return response(
      {
        success: true,

        code:
          "C143_11_COMMERCIAL_OPERATING_LOOP_READY",

        latencyMs:
          Date.now() - startedAt,

        loop:
          result,
      },
      200,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Commercial operating loop failed.";

    const status =
      message ===
      "COMMERCIAL_OBJECTIVE_NOT_FOUND"
        ? 404
        : 500;

    return response(
      {
        success: false,

        code:
          "C143_11_COMMERCIAL_OPERATING_LOOP_FAILED",

        error:
          message,

        latencyMs:
          Date.now() - startedAt,
      },
      status,
    );
  }
}
