import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  getMarketPreTradeRiskPolicy,
  evaluateMarketPreTradeRisk,
} from "@/lib/runtime/market/market-pretrade-risk";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

type DiagnosticOrder = {
  symbol: string;
  market: "us" | "hk" | "cn";
  side: "buy" | "sell";
  quantity: number;
  limitPrice: number | null;
  reason: string;
};

function jsonResponse(
  body: unknown,
  status = 200,
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control":
          "no-store",
        "Content-Type":
          "application/json; charset=utf-8",
      },
    },
  );
}

function unauthorized() {
  return jsonResponse(
    {
      success: false,
      code:
        "FOUNDER_AUTH_REQUIRED",
      error:
        "Founder authentication required.",
    },
    401,
  );
}

function normalizeMarket(
  value: string | null,
): "us" | "hk" | "cn" | null {
  const normalized =
    value?.trim().toLowerCase();

  if (
    normalized === "us" ||
    normalized === "hk" ||
    normalized === "cn"
  ) {
    return normalized;
  }

  return null;
}

function normalizeSide(
  value: string | null,
): "buy" | "sell" | null {
  const normalized =
    value?.trim().toLowerCase();

  if (
    normalized === "buy" ||
    normalized === "sell"
  ) {
    return normalized;
  }

  return null;
}

function parsePositiveNumber(
  value: string | null,
): number | null {
  if (
    value === null ||
    value.trim() === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
}

function buildDiagnosticOrder(
  request: NextRequest,
): DiagnosticOrder | null {
  const symbol =
    request.nextUrl.searchParams
      .get("symbol")
      ?.trim()
      .toUpperCase() ||
    "";

  const market =
    normalizeMarket(
      request.nextUrl.searchParams.get(
        "market",
      ),
    );

  const side =
    normalizeSide(
      request.nextUrl.searchParams.get(
        "side",
      ),
    );

  const quantity =
    parsePositiveNumber(
      request.nextUrl.searchParams.get(
        "quantity",
      ),
    );

  const rawLimitPrice =
    request.nextUrl.searchParams.get(
      "limitPrice",
    );

  const limitPrice =
    rawLimitPrice === null ||
    rawLimitPrice.trim() === ""
      ? null
      : parsePositiveNumber(
          rawLimitPrice,
        );

  const reason =
    request.nextUrl.searchParams
      .get("reason")
      ?.trim() ||
    "Founder pre-trade risk diagnostic.";

  if (
    !symbol ||
    !market ||
    !side ||
    quantity === null
  ) {
    return null;
  }

  if (
    rawLimitPrice !== null &&
    rawLimitPrice.trim() !== "" &&
    limitPrice === null
  ) {
    return null;
  }

  return {
    symbol,
    market,
    side,
    quantity,
    limitPrice,
    reason,
  };
}

function buildPolicySummary(
  policy: ReturnType<
    typeof getMarketPreTradeRiskPolicy
  >,
) {
  return {
    enabled:
      policy.enabled,

    version:
      policy.version,

    allowedMarkets:
      policy.allowedMarkets,

    maxOrderQuantity:
      policy.maxOrderQuantity,

    maxOrderNotional:
      policy.maxOrderNotional,

    requireLimitPrice:
      policy.requireLimitPrice,

    allowMarketOrders:
      policy.allowMarketOrders,

    reviewRequiredAboveNotional:
      policy.reviewRequiredAboveNotional,
  };
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
    const policy =
      getMarketPreTradeRiskPolicy();

    const diagnosticOrder =
      buildDiagnosticOrder(
        request,
      );

    const diagnostic =
      diagnosticOrder
        ? evaluateMarketPreTradeRisk(
            diagnosticOrder,
          )
        : null;

    const policySummary =
      buildPolicySummary(
        policy,
      );

    return jsonResponse({
      success:
        true,

      code:
        "C167_5_29_PRETRADE_RISK_DIAGNOSTICS",

      stage:
        "C167.5.29",

      policy:
        policySummary,

      policyBoundary: {
        serverSide:
          true,

        requiredBeforeBrokerEvaluation:
          true,

        callerCanOverride:
          false,

        callerCanBypass:
          false,

        automaticRiskApproval:
          false,

        automaticRiskOverride:
          false,

        liveExecutionEnabled:
          false,
      },

      diagnosticOrder,

      diagnostic,

      readiness: {
        policyConfigured:
          policy.enabled,

        policyVersion:
          policy.version,

        riskGateAvailable:
          true,

        independentGate:
          true,

        reviewThresholdConfigured:
          Number.isFinite(
            policy.reviewRequiredAboveNotional,
          ),

        quantityLimitConfigured:
          Number.isFinite(
            policy.maxOrderQuantity,
          ),

        notionalLimitConfigured:
          Number.isFinite(
            policy.maxOrderNotional,
          ),
      },

      decisionPolicy: {
        pass:
          "Order satisfies configured pre-trade risk policy and does not cross the configured human-review threshold.",

        reviewRequired:
          "Order satisfies hard limits but crosses the configured notional review threshold.",

        blocked:
          "Order violates one or more hard risk constraints or the risk policy is disabled.",

        humanReviewStillRequired:
          true,

        brokerAdapterStillRequired:
          true,

        liveExecutionStillDisabled:
          true,
      },

      controlChainPosition: {
        previous:
          [
            "Research",
            "Technical Provider",
            "Commercial Authorization",
          ],

        current:
          "Pre-Trade Risk",

        next:
          [
            "Persistent Human Review",
            "Broker Adapter",
            "Execution Review",
          ],
      },

      safetyBoundary: {
        founderOnly:
          true,

        ordinaryUserTrading:
          false,

        automaticOrderPlacement:
          false,

        liveOrderPlacement:
          false,

        tradingExecuted:
          false,

        riskPolicyCanBeBypassed:
          false,

        riskPolicyCanBeOverriddenByRequest:
          false,

        riskDecisionIsExecutionAuthorization:
          false,

        humanApprovalStillRequired:
          true,

        brokerVerificationStillRequired:
          true,
      },

      generatedAt:
        new Date().toISOString(),
    });
  } catch (
    error
  ) {
    return jsonResponse(
      {
        success:
          false,

        code:
          "C167_5_29_PRETRADE_RISK_DIAGNOSTICS_ERROR",

        stage:
          "C167.5.29",

        error:
          error instanceof Error
            ? error.message
            : "Pre-trade risk diagnostics failed.",

        safetyBoundary: {
          automaticOrderPlacement:
            false,

          liveOrderPlacement:
            false,

          tradingExecuted:
            false,

          riskPolicyCanBeBypassed:
            false,

          humanApprovalStillRequired:
            true,

          brokerVerificationStillRequired:
            true,
        },
      },
      500,
    );
  }
}
