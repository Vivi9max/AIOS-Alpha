import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  isFounderRequest,
} from "@/lib/founder/auth";
import {
  runMarketRiskControlRegression,
} from "@/lib/runtime/market/market-risk-control-regression-runtime";
export const dynamic =
  "force-dynamic";
export const runtime =
  "nodejs";
export async function GET(
  request: NextRequest,
) {
  const startedAt =
    Date.now();
  if (
    !isFounderRequest(
      request,
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        code:
          "FOUNDER_AUTH_REQUIRED",
        error:
          "Founder access required.",
      },
      {
        status: 401,
      },
    );
  }
  try {
    const result =
      await runMarketRiskControlRegression();
    return NextResponse.json(
      {
        ...result,
        runtime: {
          ...result.runtime,
          latencyMs:
            Date.now() -
            startedAt,
        },
      },
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
          "C147_17_1_MARKET_RISK_CONTROL_REGRESSION_PARTIAL",
        stage:
          "C147.17.1",
        error:
          error instanceof Error
            ? error.message
            : "Market risk-control regression failed.",
        plannerDispatched:
          false,
        tradingExecuted:
          false,
        mutationPerformed:
          false,
        humanReviewRequired:
          true,
        runtime: {
          name:
            "market-risk-control-regression-route",
          version:
            "C147.17.1",
          generatedAt:
            new Date().toISOString(),
          latencyMs:
            Date.now() -
            startedAt,
        },
      },
      {
        status: 500,
      },
    );
  }
}
