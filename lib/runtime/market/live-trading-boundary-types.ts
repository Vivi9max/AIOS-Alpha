export type LiveTradingSide =
  | "buy"
  | "sell";

export type LiveTradingBoundaryStatus =
  | "blocked"
  | "ready-for-review";

export type LiveTradingBlockReason =
  | "PAPER_TRADING_NOT_VERIFIED"
  | "HUMAN_REVIEW_REQUIRED"
  | "BROKER_NOT_CONNECTED"
  | "LIVE_EXECUTION_ADAPTER_NOT_IMPLEMENTED"
  | "INVALID_ORDER";

export interface LiveTradingOrderIntent {
  symbol: string;

  market?:
    | "us"
    | "hk"
    | "cn"
    | null;

  side: LiveTradingSide;

  quantity: number;

  limitPrice?: number | null;

  reason?: string | null;
}

export interface LiveTradingBoundaryRequest {
  order?:
    | LiveTradingOrderIntent
    | null;

  /**
   * C151 must be independently verified
   * before a live order can reach a
   * future broker boundary.
   */
  paperTradingVerified?: boolean;

  /**
   * Explicit human approval is mandatory.
   */
  humanReviewApproved?: boolean;

  /**
   * Diagnostic input only.
   *
   * C152 never establishes a broker
   * connection from this field.
   */
  brokerConnected?: boolean;

  /**
   * Explicit request to cross the
   * live-execution boundary.
   *
   * C152 v1 always blocks this because
   * no broker adapter exists.
   */
  liveExecutionRequested?: boolean;
}

export interface LiveTradingBoundaryResult {
  success: boolean;

  code:
    | "C152_LIVE_TRADING_BLOCKED"
    | "C152_LIVE_TRADING_READY_FOR_REVIEW"
    | "C152_INVALID_REQUEST";

  stage: "C152";

  status:
    | "blocked"
    | "ready-for-review";

  /**
   * C152 never declares actual live
   * execution readiness.
   */
  readyForLiveExecution: false;

  orderIntent:
    | LiveTradingOrderIntent
    | null;

  gates: {
    paperTradingVerified: boolean;

    humanReviewApproved: boolean;

    brokerConnected: false;

    liveExecutionRequested: boolean;

    brokerAdapterAvailable: false;
  };

  blockedReasons:
    LiveTradingBlockReason[];

  execution: {
    tradingExecuted: false;

    liveOrderPlaced: false;

    brokerOrderId: null;

    plannerDispatched: false;
  };

  safetyBoundary: {
    founderOnly: true;

    simulationRequiredBeforeLive: true;

    humanReviewRequired: true;

    brokerConnectionRequired: true;

    executionAdapterRequired: true;

    automaticExecutionAllowed: false;

    personalizedAdvice: false;
  };

  methodology: {
    purpose: string;

    requiredSequence: string[];

    currentStage: "C152";

    nextStage: "C153";

    excludedFromDecision: string[];
  };

  generatedAt: string;

  error?: string;
}
