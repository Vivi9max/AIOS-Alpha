import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketRiskReassessmentBridgeRegression,
} from "@/lib/runtime/market/market-risk-reassessment-bridge-regression-runtime";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function unauthorized() {
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

export async function GET(
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
    const result =
      await runMarketRiskReassessmentBridgeRegression();

    return NextResponse.json(
      result,
      {
        status:
          result.verified
            ? 200
            : 422,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        verified: false,
        code:
          "C147_18_1_RISK_REASSESSMENT_BRIDGE_REGRESSION_PARTIAL",
        stage:
          "C147.18.1",
        passed: 0,
        failed: 1,
        checks: [
          {
            name:
              "LIVE_REGRESSION_RUNTIME",
            passed: false,
            detail:
              error instanceof Error
                ? error.message
                : "Live regression failed.",
          },
        ],
        safety: {
          humanReviewRequired:
            true,
          mutationPerformed:
            false,
          plannerDispatched:
            false,
          tradingExecuted:
            false,
        },
        runtime: {
          name:
            "market-risk-reassessment-bridge-regression-runtime",
          version:
            "C147.18.1",
          upstream:
            "C147.18+C147.8",
          generatedAt:
            new Date().toISOString(),
          latencyMs: 0,
        },
      },
      {
        status: 500,
      },
    );
  }
}
