import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketRiskReassessmentBridge,
} from "@/lib/runtime/market/market-risk-reassessment-bridge-runtime";

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

function isMarket(
  value: unknown,
): value is
  | "us"
  | "hk"
  | "cn"
  | "jp"
  | "global" {
  return (
    value === "us" ||
    value === "hk" ||
    value === "cn" ||
    value === "jp" ||
    value === "global"
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

    const symbol =
      typeof body?.symbol ===
      "string"
        ? body.symbol
        : "";

    const market =
      isMarket(
        body?.market,
      )
        ? body.market
        : "us";

    const result =
      await runMarketRiskReassessmentBridge({
        symbol,
        market,
        query:
          typeof body?.query ===
          "string"
            ? body.query
            : null,
        previousRecord:
          body?.previousRecord ??
          null,
        currentRecord:
          body?.currentRecord ??
          null,
      });

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
          "C147_18_RISK_REASSESSMENT_BRIDGE_INSUFFICIENT",
        error:
          error instanceof Error
            ? error.message
            : "Risk reassessment bridge failed.",
        humanReviewRequired:
          true,
        automatedExecutionStarted:
          false,
        plannerDispatched:
          false,
        tradingExecuted:
          false,
        mutationPerformed:
          false,
      },
      {
        status: 500,
      },
    );
  }
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

  return NextResponse.json({
    success: true,
    code:
      "C147_18_RISK_REASSESSMENT_BRIDGE_READY",
    runtime:
      "market-risk-reassessment-bridge-runtime",
    version:
      "C147.18",
    upstream:
      "C147.17+C147.8",
    flow: [
      "Market Risk Control",
      "Risk Change",
      "Decision Reassessment",
      "Human Review",
    ],
    mutationPerformed:
      false,
    humanReviewRequired:
      true,
    automatedExecutionStarted:
      false,
    plannerDispatched:
      false,
    tradingExecuted:
      false,
  });
}
