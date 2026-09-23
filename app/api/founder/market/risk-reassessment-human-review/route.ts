import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketRiskReassessmentHumanReview,
} from "@/lib/runtime/market/market-risk-reassessment-human-review-runtime";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function unauthorized() {
  return NextResponse.json(
    {
      success:
        false,

      code:
        "FOUNDER_AUTH_REQUIRED",

      error:
        "Founder authentication required.",
    },
    {
      status:
        401,
    },
  );
}

export async function POST(
  request: NextRequest,
) {
  if (
    !isFounderRequest(
      request,
    )
  ) {
    return unauthorized();
  }

  try {
    const body =
      await request.json();

    const result =
      await runMarketRiskReassessmentHumanReview(
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
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        success:
          false,

        code:
          "C147_19_RISK_REASSESSMENT_HUMAN_REVIEW_ERROR",

        error:
          error instanceof Error
            ? error.message
            : "C147.19 human-review runtime failed.",

        automatedExecutionStarted:
          false,

        plannerDispatched:
          false,

        tradingExecuted:
          false,
      },
      {
        status:
          500,
      },
    );
  }
}
