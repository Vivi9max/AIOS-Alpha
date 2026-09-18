import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  ensureCommercialNextAction,
} from "@/lib/commercial/gap-engine";

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
          code:
            "COMMERCIAL_OBJECTIVE_ID_REQUIRED",
        },
        400,
      );
    }

    const result =
      await ensureCommercialNextAction(
        objectiveId,
      );

    return response(
      {
        success: true,

        code:
          "C143_13_COMMERCIAL_NEXT_ACTION_READY",

        latencyMs:
          Date.now() -
          startedAt,

        result,
      },
      200,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Commercial next action failed.";

    const status =
      message ===
      "COMMERCIAL_OBJECTIVE_NOT_FOUND"
        ? 404
        : 500;

    return response(
      {
        success: false,

        code:
          "C143_13_COMMERCIAL_NEXT_ACTION_FAILED",

        error:
          message,

        latencyMs:
          Date.now() -
          startedAt,
      },
      status,
    );
  }
}
