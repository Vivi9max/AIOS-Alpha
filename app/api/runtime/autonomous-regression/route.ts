import {
  NextResponse,
} from "next/server";

import {
  runAutonomousLoopRegression,
} from "@/lib/runtime/autonomous-loop-regression";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

export async function GET() {
  try {
    const result =
      await runAutonomousLoopRegression();

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
        : "Autonomous loop regression failed.";

    console.error(
      "[AIOS Autonomous Loop Regression]",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        status:
          "failed",

        score:
          0,

        checks: [
          {
            id:
              "regression-runtime",

            status:
              "fail",

            message,
          },
        ],

        summary: {
          passed:
            0,
          warnings:
            0,
          failed:
            1,
          total:
            1,
        },

        timestamp:
          Date.now(),
      },
      {
        status:
          503,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}
