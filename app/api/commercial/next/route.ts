import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  ensureCommercialNextAction,
} from "@/lib/commercial/gap-engine";

const RUNTIME =
  "aios-alpha";

const RUNTIME_VERSION =
  "0.5";

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
      return NextResponse.json(
        {
          success: false,
          code:
            "COMMERCIAL_OBJECTIVE_ID_REQUIRED",
          runtime: RUNTIME,
          runtimeVersion:
            RUNTIME_VERSION,
        },
        {
          status: 400,
        },
      );
    }

    const result =
      await ensureCommercialNextAction(
        objectiveId,
      );

    return NextResponse.json(
      {
        success: true,
        code:
          "C143_13_COMMERCIAL_NEXT_ACTION_READY",
        runtime: RUNTIME,
        runtimeVersion:
          RUNTIME_VERSION,
        latencyMs:
          Date.now() -
          startedAt,
        result,
      },
      {
        status: 200,
      },
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

    return NextResponse.json(
      {
        success: false,
        code:
          "C143_13_COMMERCIAL_NEXT_ACTION_FAILED",
        error: message,
        runtime: RUNTIME,
        runtimeVersion:
          RUNTIME_VERSION,
        latencyMs:
          Date.now() -
          startedAt,
      },
      {
        status,
      },
    );
  }
}
