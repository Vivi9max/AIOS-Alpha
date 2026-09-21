import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketDecisionRecord,
} from "@/lib/runtime/market/market-decision-record-runtime";

export async function POST(
  request: NextRequest,
) {
  if (
    !isFounderRequest(request)
  ) {
    return NextResponse.json(
      {
        success: false,
        code:
          "FOUNDER_AUTH_REQUIRED",
        error:
          "Founder authentication required.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const rawBody =
      await request.json();

    const body =
      rawBody &&
      typeof rawBody === "object"
        ? rawBody
        : {};

    const result =
      await runMarketDecisionRecord(
        body,
      );

    return NextResponse.json(
      result,
      {
        status:
          result.success
            ? 200
            : 422,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        code:
          "C147_7_DECISION_RECORD_ERROR",

        error:
          error instanceof Error
            ? error.message
            : "Decision record runtime failed.",
      },
      {
        status: 500,
      },
    );
  }
}
