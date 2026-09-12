import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  ensureCommercialOperatingLoop,
} from "@/lib/commercial/operating-loop";

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
          error:
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
      await ensureCommercialOperatingLoop(
        objectiveId,
      );

    return NextResponse.json(
      {
        success: true,
        code:
          "C143_11_COMMERCIAL_OPERATING_LOOP_READY",
        runtime: RUNTIME,
        runtimeVersion:
          RUNTIME_VERSION,
        latencyMs:
          Date.now() - startedAt,
        loop: result,
      },
      {
        status: 200,
      },
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

    return NextResponse.json(
      {
        success: false,
        code:
          "C143_11_COMMERCIAL_OPERATING_LOOP_FAILED",
        error: message,
        runtime: RUNTIME,
        runtimeVersion:
          RUNTIME_VERSION,
        latencyMs:
          Date.now() - startedAt,
      },
      {
        status,
      },
    );
  }
}
