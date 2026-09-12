import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  recordCommercialResult,
} from "@/lib/commercial/result-loop";

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
        taskId?: unknown;
        verified?: unknown;

        revenue?: unknown;
        customers?: unknown;
        cost?: unknown;

        note?: unknown;
      };

    const objectiveId =
      typeof body.objectiveId ===
      "string"
        ? body.objectiveId.trim()
        : "";

    const taskId =
      typeof body.taskId ===
      "string"
        ? body.taskId.trim()
        : "";

    const verified =
      body.verified === true;

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

    if (!taskId) {
      return NextResponse.json(
        {
          success: false,
          code:
            "COMMERCIAL_TASK_ID_REQUIRED",
          runtime: RUNTIME,
          runtimeVersion:
            RUNTIME_VERSION,
        },
        {
          status: 400,
        },
      );
    }

    if (!verified) {
      return NextResponse.json(
        {
          success: false,
          code:
            "COMMERCIAL_RESULT_NOT_VERIFIED",
          error:
            "Commercial actuals require an explicitly verified result.",
          runtime: RUNTIME,
          runtimeVersion:
            RUNTIME_VERSION,
        },
        {
          status: 422,
        },
      );
    }

    const result =
      await recordCommercialResult({
        objectiveId,
        taskId,
        verified,

        revenue:
          typeof body.revenue ===
          "number"
            ? body.revenue
            : Number(
                body.revenue ?? 0,
              ),

        customers:
          typeof body.customers ===
          "number"
            ? body.customers
            : Number(
                body.customers ?? 0,
              ),

        cost:
          typeof body.cost ===
          "number"
            ? body.cost
            : Number(
                body.cost ?? 0,
              ),

        note:
          typeof body.note ===
          "string"
            ? body.note
            : undefined,
      });

    return NextResponse.json(
      {
        success: true,
        code:
          "C143_12_COMMERCIAL_RESULT_RECORDED",
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
        : "Commercial result recording failed.";

    const notFoundErrors =
      new Set([
        "COMMERCIAL_OBJECTIVE_NOT_FOUND",
        "COMMERCIAL_OUTCOME_NOT_FOUND",
        "COMMERCIAL_TASK_NOT_FOUND",
      ]);

    const conflictErrors =
      new Set([
        "COMMERCIAL_OPERATING_LOOP_NOT_LINKED",
        "COMMERCIAL_TASK_NOT_LINKED",
      ]);

    const status =
      notFoundErrors.has(
        message,
      )
        ? 404
        : conflictErrors.has(
              message,
            )
          ? 409
          : 500;

    return NextResponse.json(
      {
        success: false,
        code:
          "C143_12_COMMERCIAL_RESULT_FAILED",
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
