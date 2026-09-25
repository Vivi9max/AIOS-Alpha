import type {
  BrokerBoundaryBlockReason,
  BrokerIntegrationBoundaryRequest,
  BrokerIntegrationBoundaryResult,
  BrokerOrderIntent,
} from "./broker-integration-boundary-types";

function normalizeOrder(
  order:
    | BrokerOrderIntent
    | null
    | undefined,
): BrokerOrderIntent | null {
  if (!order) {
    return null;
  }

  const symbol =
    order.symbol
      .trim()
      .toUpperCase();

  const quantity =
    typeof order.quantity ===
      "number" &&
    Number.isFinite(
      order.quantity,
    )
      ? Math.floor(
          order.quantity,
        )
      : 0;

  if (
    !symbol ||
    quantity <= 0 ||
    (
      order.side !== "buy" &&
      order.side !== "sell"
    )
  ) {
    return null;
  }

  return {
    symbol,

    market:
      order.market === "us" ||
      order.market === "hk" ||
      order.market === "cn"
        ? order.market
        : null,

    side:
      order.side,

    quantity,

    limitPrice:
      typeof order.limitPrice ===
        "number" &&
      Number.isFinite(
        order.limitPrice,
      ) &&
      order.limitPrice > 0
        ? order.limitPrice
        : null,

    reason:
      typeof order.reason ===
        "string" &&
      order.reason.trim()
        ? order.reason.trim()
        : null,
  };
}

function safetyBoundary() {
  return {
    founderOnly:
      true,

    simulationRequiredBeforeLive:
      true,

    humanReviewRequired:
      true,

    brokerVerificationRequired:
      true,

    executionAdapterRequired:
      true,

    liveExecutionEnabled:
      false,

    automaticExecutionAllowed:
      false,

    personalizedAdvice:
      false,
  } as const;
}

function methodology() {
  return {
    purpose:
      "Define a controlled broker-integration boundary without connecting a broker or placing live orders.",

    requiredSequence: [
      "Research",
      "Selection",
      "Valuation",
      "Backtest",
      "Paper Trade",
      "Human Review",
      "Live Trading Boundary",
      "Broker Integration Boundary",
      "Execution Readiness",
      "Live Trade",
    ],

    currentStage:
      "C153" as const,

    nextStage:
      "C154" as const,

    excludedFromDecision: [
      "No broker credentials are accepted as proof of connection.",
      "No exchange connection is established.",
      "No live order is submitted.",
      "No automatic execution is enabled.",
      "No Planner dispatch is performed.",
      "No personalized investment advice is produced.",
    ],
  };
}

function execution() {
  return {
    tradingExecuted:
      false,

    liveOrderPlaced:
      false,

    brokerOrderId:
      null,

    plannerDispatched:
      false,
  } as const;
}

export function evaluateBrokerIntegrationBoundary(
  request:
    BrokerIntegrationBoundaryRequest,
): BrokerIntegrationBoundaryResult {
  const orderIntent =
    normalizeOrder(
      request.order,
    );

  if (
    request.order &&
    !orderIntent
  ) {
    return {
      success:
        false,

      code:
        "C153_INVALID_REQUEST",

      stage:
        "C153",

      status:
        "blocked",

      readyForBrokerExecution:
        false,

      orderIntent:
        null,

      broker: {
        provider:
          request.provider ??
          "unconfigured",

        connectionStatus:
          "disconnected",

        connectionVerified:
          false,

        adapterAvailable:
          false,

        executionStatus:
          "unavailable",
      },

      gates: {
        paperTradingVerified:
          request.paperTradingVerified ===
          true,

        humanReviewApproved:
          request.humanReviewApproved ===
          true,

        executionRequested:
          request.executionRequested ===
          true,
      },

      blockedReasons: [
        "INVALID_ORDER",
      ],

      execution:
        execution(),

      safetyBoundary:
        safetyBoundary(),

      methodology:
        methodology(),

      generatedAt:
        new Date().toISOString(),

      error:
        "Invalid broker order intent.",
    };
  }

  const paperTradingVerified =
    request.paperTradingVerified ===
    true;

  const humanReviewApproved =
    request.humanReviewApproved ===
    true;

  const executionRequested =
    request.executionRequested ===
    true;

  const blockedReasons:
    BrokerBoundaryBlockReason[] =
    [];

  if (
    !paperTradingVerified
  ) {
    blockedReasons.push(
      "PAPER_TRADING_NOT_VERIFIED",
    );
  }

  if (
    !humanReviewApproved
  ) {
    blockedReasons.push(
      "HUMAN_REVIEW_REQUIRED",
    );
  }

  const provider =
    request.provider ??
    "unconfigured";

  if (
    provider ===
    "unconfigured"
  ) {
    blockedReasons.push(
      "BROKER_PROVIDER_NOT_CONFIGURED",
    );
  }

  /*
   * C153 deliberately does not trust
   * caller-supplied connectionVerified=true.
   *
   * A future adapter must establish this
   * state through a real provider health
   * check using server-side credentials.
   */
  blockedReasons.push(
    "BROKER_CONNECTION_NOT_VERIFIED",
  );

  /*
   * No real broker execution adapter exists
   * in C153.
   */
  blockedReasons.push(
    "EXECUTION_ADAPTER_NOT_IMPLEMENTED",
  );

  blockedReasons.push(
    "LIVE_EXECUTION_DISABLED",
  );

  return {
    success:
      true,

    code:
      "C153_BROKER_BOUNDARY_BLOCKED",

    stage:
      "C153",

    status:
      "blocked",

    readyForBrokerExecution:
      false,

    orderIntent,

    broker: {
      provider,

      connectionStatus:
        provider ===
        "unconfigured"
          ? "disconnected"
          : "diagnostic-only",

      connectionVerified:
        false,

      adapterAvailable:
        false,

      executionStatus:
        "unavailable",
    },

    gates: {
      paperTradingVerified,

      humanReviewApproved,

      executionRequested,
    },

    blockedReasons,

    execution:
      execution(),

    safetyBoundary:
      safetyBoundary(),

    methodology:
      methodology(),

    generatedAt:
      new Date().toISOString(),
  };
}
