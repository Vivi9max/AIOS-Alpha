import {
  NextResponse,
} from "next/server";

import {
  verifyAISystem,
} from "@/lib/runtime/system-self-verification";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

export async function GET() {
  try {
    const result =
      await verifyAISystem();

    return NextResponse.json(
      result,
      {
        status:
          result.status ===
          "FAILED"
            ? 503
            : result.status ===
                "DEGRADED"
              ? 200
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
        : "AIOS System Verification failed.";

    console.error(
      "[AIOS System Verification]",
      error,
    );

    return NextResponse.json(
      {
        verified:
          false,

        status:
          "FAILED",

        score:
          0,

        checks: [
          {
            id:
              "system-verification-runtime",

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
      },
    );
  }
}
