import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  evaluateMarketProviderCommercialGate,
} from "@/lib/runtime/market/market-provider-commercial-gate";

import {
  getPrimaryMarketDataProvider,
  getPrimaryMarketProviderCapabilities,
  getPrimaryMarketProviderStatus,
} from "@/lib/runtime/market/market-data-provider";

import {
  evaluateBrokerExecutionAdapter,
  getBrokerExecutionAdapterCapabilities,
  getBrokerExecutionAdapterId,
  isBrokerExecutionAdapterConfigured,
  isBrokerExecutionAdapterReady,
} from "@/lib/runtime/market/broker-execution-adapter";

import {
  createMarketHumanReviewRequest,
  evaluateMarketHumanReview,
  getMarketHumanReviewPolicy,
} from "@/lib/runtime/market/market-human-review";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

type MarketRegion =
  | "us"
  | "hk"
  | "cn";

type OrderSide =
  | "buy"
  | "sell";

interface TradingControlChainBody {
  symbol?: unknown;
  market?: unknown;
  side?: unknown;
  quantity?: unknown;
  limitPrice?: unknown;
  reason?: unknown;
  requestHumanReview?: unknown;
}

interface OrderIntent {
  symbol: string;
  market: MarketRegion;
  side: OrderSide;
  quantity: number;
  limitPrice: number | null;
  reason: string;
}

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

function asRecord(
  value: unknown,
): Record<string, unknown> {
  if (
    value !== null &&
    typeof value === "object"
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return {};
}

function cleanText(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeMarket(
  value: unknown,
): MarketRegion | null {
  const normalized =
    cleanText(value).toLowerCase();

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
  value: unknown,
): OrderSide | null {
  const normalized =
    cleanText(value).toLowerCase();

  if (
    normalized === "buy" ||
    normalized === "sell"
  ) {
    return normalized;
  }

  return null;
}

function normalizePositiveNumber(
  value: unknown,
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  ) {
    return value;
  }

  if (
    typeof value === "string"
  ) {
    const parsed =
      Number(value.trim());

    if (
      Number.isFinite(parsed) &&
      parsed > 0
    ) {
      return parsed;
    }
  }

  return null;
}

function normalizeOrder(
  body: TradingControlChainBody,
): {
  order: OrderIntent | null;
  error: string | null;
} {
  const symbol =
    cleanText(body.symbol).toUpperCase();

  const market =
    normalizeMarket(body.market);

  const side =
    normalizeSide(body.side);

  const quantity =
    normalizePositiveNumber(
      body.quantity,
    );

  const limitPrice =
    body.limitPrice === null ||
    body.limitPrice === undefined ||
    body.limitPrice === ""
      ? null
      : normalizePositiveNumber(
          body.limitPrice,
        );

  const reason =
    cleanText(body.reason);

  if (!symbol) {
    return {
      order: null,
      error:
        "symbol is required.",
    };
  }

  if (!market) {
    return {
      order: null,
      error:
        "market must be us, hk or cn.",
    };
  }

  if (!side) {
    return {
      order: null,
      error:
        "side must be buy or sell.",
    };
  }

  if (quantity === null) {
    return {
      order: null,
      error:
        "quantity must be greater than zero.",
    };
  }

  if (
    body.limitPrice !== null &&
    body.limitPrice !== undefined &&
    body.limitPrice !== "" &&
    limitPrice === null
  ) {
    return {
      order: null,
      error:
        "limitPrice must be greater than zero when supplied.",
    };
  }

  if (!reason) {
    return {
      order: null,
      error:
        "reason is required.",
    };
  }

  return {
    order: {
      symbol,
      market,
      side,
      quantity,
      limitPrice,
      reason,
    },
    error: null,
  };
}

function toBrokerOrder(
  order: OrderIntent,
) {
  return {
    symbol: order.symbol,
    market: order.market,
    side: order.side,
    quantity: order.quantity,
    limitPrice: order.limitPrice,
    reason: order.reason,
  };
}

export async function POST(
  request: NextRequest,
) {
  if (
    !isFounderRequest(
      request,
    )
  ) {
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

  let body: TradingControlChainBody;

  try {
    body =
      (await request.json()) as TradingControlChainBody;
  } catch {
    return jsonResponse(
      {
        success: false,
        code:
          "C167_5_20_INVALID_JSON",
        error:
          "Request body must contain valid JSON.",
      },
      400,
    );
  }

  const normalized =
    normalizeOrder(body);

  if (
    !normalized.order
  ) {
    return jsonResponse(
      {
        success: false,
        code:
          "C167_5_20_INVALID_ORDER_INTENT",
        error:
          normalized.error ||
          "Invalid order intent.",
      },
      400,
    );
  }

  const order =
    normalized.order;

  const requestHumanReview =
    body.requestHumanReview === true;

  try {
    const [
      provider,
      providerStatus,
      providerCapabilities,
      brokerCapabilities,
    ] = await Promise.all([
      getPrimaryMarketDataProvider(),
      getPrimaryMarketProviderStatus(),
      getPrimaryMarketProviderCapabilities(),
      Promise.resolve(
        getBrokerExecutionAdapterCapabilities(),
      ),
    ]);

    const commercialGate =
      evaluateMarketProviderCommercialGate();

    const adapterId =
      getBrokerExecutionAdapterId();

    const adapterConfigured =
      isBrokerExecutionAdapterConfigured();

    const adapterReady =
      isBrokerExecutionAdapterReady();

    const brokerOrder =
      toBrokerOrder(order);

    const brokerDiagnostic =
      evaluateBrokerExecutionAdapter(
        {
          order: brokerOrder,
          founderAuthenticated: true,
          humanApproval: false,
          paperTradingVerified: false,
          brokerConnected:
            adapterConfigured,
          credentialsVerified: false,
          accountVerified: false,
          executionEnabled:
            adapterReady,
        },
      );

    const humanReviewRequest =
      requestHumanReview
        ? createMarketHumanReviewRequest(
            order,
          )
        : null;

    const humanReview =
      evaluateMarketHumanReview(
        humanReviewRequest,
      );

    const humanReviewPolicy =
      getMarketHumanReviewPolicy();

    const providerRecord =
      asRecord(provider);

    const providerStatusRecord =
      asRecord(providerStatus);

    const providerCapabilitiesRecord =
      asRecord(
        providerCapabilities,
      );

    const commercialGateOpen =
      commercialGate.gateOpen ===
      true;

    const providerReady =
      Boolean(
        providerRecord &&
        providerRecord.id,
      ) &&
      Boolean(
        providerStatusRecord &&
        (
          providerStatusRecord.status ===
            "eligible" ||
          providerStatusRecord.commercialStatus ===
            "eligible"
        ),
      );

    const technicalProviderReady =
      Object.keys(
        providerCapabilitiesRecord,
      ).length > 0;

    const brokerDiagnosticReady =
      brokerDiagnostic.readyForExecution;

    const allGatesPassed =
      providerReady &&
      commercialGateOpen &&
      adapterReady &&
      brokerDiagnosticReady &&
      humanReview.approved;

    /*
     * The current broker adapter deliberately exposes
     * readyForExecution as literal false.
     *
     * Human approval can satisfy the human gate,
     * but it cannot override broker safety.
     */
    const executionReady =
      allGatesPassed &&
      brokerDiagnosticReady;

    const blockedReasons: string[] = [];

    if (!providerReady) {
      blockedReasons.push(
        "Market provider is not commercially ready.",
      );
    }

    if (!technicalProviderReady) {
      blockedReasons.push(
        "Technical market provider capability is unavailable.",
      );
    }

    if (!commercialGateOpen) {
      blockedReasons.push(
        "Commercial authorization gate is not open.",
      );
    }

    if (!adapterConfigured) {
      blockedReasons.push(
        "Broker execution adapter is not configured.",
      );
    }

    if (!adapterReady) {
      blockedReasons.push(
        "Broker execution adapter is not ready for execution.",
      );
    }

    if (!humanReviewRequest) {
      blockedReasons.push(
        "Human review has not been requested.",
      );
    } else if (!humanReview.approved) {
      blockedReasons.push(
        "Explicit human approval has not been granted.",
      );
    }

    if (!brokerDiagnosticReady) {
      blockedReasons.push(
        "Live execution remains disabled by the broker adapter safety contract.",
      );
    }

    return jsonResponse({
      success: true,
      code:
        "C167_5_20_TRADING_CONTROL_CHAIN",
      stage:
        "C167.5.20",

      order,

      controlDecision: {
        executionReady,
        decision:
          executionReady
            ? "execution-review-ready"
            : "blocked",
        blockedReasons,
        automaticExecution:
          false,
        orderPlaced:
          false,
        tradingExecuted:
          false,
      },

      controlChain: {
        research:
          "founder-market-research",
        provider:
          providerReady
            ? "passed"
            : "blocked",
        commercial:
          commercialGateOpen
            ? "passed"
            : "blocked",
        brokerAdapter:
          brokerDiagnosticReady
            ? "passed"
            : "blocked",
        humanReview:
          humanReview.approved
            ? "approved"
            : "blocked",
        execution:
          executionReady
            ? "ready"
            : "blocked",
      },

      provider: {
        id:
          providerRecord.id ??
          null,
        status:
          providerStatusRecord.status ??
          providerStatusRecord.commercialStatus ??
          null,
        technicalReady:
          technicalProviderReady,
        commercialReady:
          commercialGateOpen,
      },

      commercialAuthorization: {
        decision:
          commercialGate.decision,
        status:
          commercialGate.status,
        authorized:
          commercialGate.authorized,
        gateOpen:
          commercialGateOpen,
        source:
          commercialGate.source,
        verifiedAt:
          commercialGate.verifiedAt,
        verifiedBy:
          commercialGate.verifiedBy,
        reason:
          commercialGate.reason,
      },

      brokerAdapter: {
        id: adapterId,
        configured:
          adapterConfigured,
        ready:
          adapterReady,
        capabilities:
          brokerCapabilities,
        diagnostic:
          brokerDiagnostic,
      },

      humanReview: {
        requested:
          Boolean(
            humanReviewRequest,
          ),
        request:
          humanReviewRequest,
        evaluation:
          humanReview,
        policy:
          humanReviewPolicy,
      },

      gates: {
        researchGate:
          providerReady,
        technicalProviderGate:
          technicalProviderReady,
        commercialGate:
          commercialGateOpen,
        brokerAdapterGate:
          adapterReady &&
          brokerDiagnosticReady,
        humanReviewGate:
          humanReview.approved,
        executionGate:
          executionReady,
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
        humanApprovalRequired:
          true,
        brokerConnectionRequired:
          true,
        paperTradingRequired:
          true,
        commercialAuthorizationRequired:
          true,
        executionAdapterRequired:
          true,
        currentLiveExecutionEnabled:
          false,
      },

      runtimeState: {
        providerReady,
        technicalProviderReady,
        commercialGateOpen,
        adapterConfigured,
        adapterReady,
        humanReviewRequested:
          Boolean(
            humanReviewRequest,
          ),
        humanReviewApproved:
          humanReview.approved,
        executionReady,
      },

      nextRequirements:
        blockedReasons.length > 0
          ? blockedReasons
          : [
              "All control gates passed. External execution review remains required.",
            ],
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        code:
          "C167_5_20_TRADING_CONTROL_CHAIN_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Trading control chain evaluation failed.",
        boundary: {
          humanDecisionRequired:
            true,
          decisionAutomaticallyGenerated:
            false,
          brokerConnected:
            false,
          liveOrderPlaced:
            false,
          tradingExecuted:
            false,
          executionEnabled:
            false,
        },
      },
      500,
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

  return jsonResponse({
    success: true,
    code:
      "C167_5_20_TRADING_CONTROL_CHAIN_READY",
    stage:
      "C167.5.20",
    pipeline: [
      "Research",
      "Provider",
      "Commercial Authorization",
      "Broker Adapter",
      "Human Review",
      "Execution Review",
    ],
    boundaries: {
      ordinaryUserTrading:
        false,
      automaticExecution:
        false,
      liveOrderPlacement:
        false,
      tradingExecuted:
        false,
    },
    humanReview: {
      required: true,
      approvalIsNonAutomatic:
        true,
      approvalDoesNotEnableExecution:
        true,
    },
    brokerExecution: {
      currentEnabled:
        false,
      externalAdapterRequired:
        true,
    },
  });
}
