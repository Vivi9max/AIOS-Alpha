import type {
  LiveTradingBoundaryRequest,
  LiveTradingBoundaryResult,
  LiveTradingOrderIntent,
} from "./live-trading-boundary-types";

function normalizeOrder(
  order:
    | LiveTradingOrderIntent
    | null
    | undefined,
): LiveTradingOrderIntent | null {
  if (!order) {
    return null;
  }

  const symbol =
    order.symbol
      .trim()
      .toUpperCase();

  const quantity =
    typeof order.quantity === "number" &&
    Number.isFinite(
      order.quantity,
    )
      ? Math.floor(
          order.quantity,
        )
      : 0;

  if (
    symbol.length === 0 ||
    quantity <= 0 ||
    (
      order.side !== "buy" &&
      order.side !== "sell"
    )
  ) {
    return null;
  }

  const market =
    order.market === "us" ||
    order.market === "hk" ||
    order.market === "cn"
      ? order.market
      : null;

  const limitPrice =
    typeof order.limitPrice ===
      "number" &&
    Number.isFinite(
      order.limitPrice,
    ) &&
    order.limitPrice > 0
      ? order.limitPrice
      : null;

  return {
    symbol,

    market,

    side:
      order.side,

    quantity,

    limitPrice,

    reason:
      typeof order.reason ===
        "string"
        ? (
            order.reason
              .trim()
              .length > 0
              ? order.reason.trim()
              : null
          )
        : null,
  };
}

function buildSafetyBoundary() {
  return {
    founderOnly:
      true,

    simulationRequiredBeforeLive:
      true,

    humanReviewRequired:
      true,

    brokerConnectionRequired:
      true,

    executionAdapterRequired:
      true,

    automaticExecutionAllowed:
      false,

    personalizedAdvice:
      false,
  } as const;
}

function buildMethodology() {
  return {
    purpose:
      "Establish an explicit human-reviewed boundary between paper trading and any future broker execution.",

    requiredSequence: [
      "Research",
      "Selection",
      "Valuation",
      "Backtest",
      "Paper Trade",
      "Human Review",
      "Live Trading Boundary",
      "Live Trade",
    ],

    currentStage:
      "C152" as const,

    nextStage:
      "C153" as const,

    excludedFromDecision: [
      "No broker connection.",
      "No exchange connection.",
      "No live order placement.",
      "No automatic execution.",
      "No Planner dispatch.",
      "No personalized investment advice.",
    ],
  };
}

function buildExecution() {
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

export function evaluateLiveTradingBoundary(
  request: LiveTradingBoundaryRequest,
): LiveTradingBoundaryResult {
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
        "C152_INVALID_REQUEST",

      stage:
        "C152",

      status:
        "blocked",

      readyForLiveExecution:
        false,

      orderIntent:
        null,

      gates: {
        paperTradingVerified:
          Boolean(
            request.paperTradingVerified,
          ),

        humanReviewApproved:
          Boolean(
            request.humanReviewApproved,
          ),

        brokerConnected:
          false,

        liveExecutionRequested:
          Boolean(
            request.liveExecutionRequested,
          ),

        brokerAdapterAvailable:
          false,
      },

      blockedReasons: [
        "INVALID_ORDER",
      ],

      execution:
        buildExecution(),

      safetyBoundary:
        buildSafetyBoundary(),

      methodology:
        buildMethodology(),

      generatedAt:
        new Date().toISOString(),

      error:
        "Invalid live-trading order intent.",
    };
  }

  const paperTradingVerified =
    request.paperTradingVerified ===
    true;

  const humanReviewApproved =
    request.humanReviewApproved ===
    true;

  const liveExecutionRequested =
    request.liveExecutionRequested ===
    true;

  const blockedReasons:
    LiveTradingBoundaryResult[
      "blockedReasons"
    ] = [];

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

  /*
   * C152 never accepts caller-provided
   * brokerConnected=true as proof of an
   * actual broker connection.
   */
  blockedReasons.push(
    "BROKER_NOT_CONNECTED",
  );

  /*
   * C152 intentionally contains no
   * broker execution adapter.
   */
  blockedReasons.push(
    "LIVE_EXECUTION_ADAPTER_NOT_IMPLEMENTED",
  );

  const status:
    | "blocked"
    | "ready-for-review" =
    blockedReasons.length === 0 &&
    liveExecutionRequested
      ? "ready-for-review"
      : "blocked";

  /*
   * Because the broker connection and
   * execution adapter are intentionally
   * unavailable, this branch should never
   * be reached in C152.
   *
   * It remains explicit so future C153
   * work has a clear boundary.
   */
  const code =
    status === "blocked"
      ? "C152_LIVE_TRADING_BLOCKED"
      : "C152_LIVE_TRADING_READY_FOR_REVIEW";

  return {
    success:
      true,

    code,

    stage:
      "C152",

    status,

    readyForLiveExecution:
      false,

    orderIntent,

    gates: {
      paperTradingVerified,

      humanReviewApproved,

      /*
       * Deliberately hard-coded false.
       */
      brokerConnected:
        false,

      liveExecutionRequested,

      brokerAdapterAvailable:
        false,
    },

    blockedReasons,

    execution:
      buildExecution(),

    safetyBoundary:
      buildSafetyBoundary(),

    methodology:
      buildMethodology(),

    generatedAt:
      new Date().toISOString(),
  };
}
