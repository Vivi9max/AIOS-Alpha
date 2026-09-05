import {
  NextResponse,
} from "next/server";

import {
  verifyRuntimeCore,
} from "@/lib/runtime/core-verification";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

export async function GET() {
  try {
    const result =
      await verifyRuntimeCore();

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
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Runtime Core Verification failed.";

    console.error(
      "[AIOS Core Verification]",
      error
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
              "verification-runtime",

            status:
              "fail",

            message,
          },
        ],

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
      }
    );
  }
}
