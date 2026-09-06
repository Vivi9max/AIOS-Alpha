import {
  NextResponse,
} from "next/server";

import {
  verifyPlannerHealth,
} from "@/lib/runtime/planner-health";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

export async function GET() {
  try {
    const result =
      await verifyPlannerHealth();

    return NextResponse.json(
      result,
      {
        status:
          result.status ===
          "failed"
            ? 503
            : 200,

        headers: {
          "Cache-Control":
            "no-store",

          "Content-Type":
            "application/json; charset=utf-8",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Planner health verification failed.";

    console.error(
      "[AIOS Planner Health]",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        status:
          "failed",

        score: 0,

        checks: [
          {
            id:
              "planner-runtime",

            status:
              "fail",

            message,
          },
        ],

        summary: {
          passed: 0,
          warnings: 0,
          failed: 1,
          total: 1,
        },

        timestamp:
          Date.now(),
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
}
