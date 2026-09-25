export type BrokerProvider =
  | "unconfigured"
  | "custom";

export type BrokerConnectionStatus =
  | "disconnected"
  | "diagnostic-only"
  | "connected";

export type BrokerExecutionStatus =
  | "unavailable"
  | "not-ready"
  | "ready-for-review";

export type BrokerBoundaryBlockReason =
  | "PAPER_TRADING_NOT_VERIFIED"
  | "HUMAN_REVIEW_REQUIRED"
  | "BROKER_PROVIDER_NOT_CONFIGURED"
  | "BROKER_CONNECTION_NOT_VERIFIED"
  | "EXECUTION_ADAPTER_NOT_IMPLEMENTED"
  | "LIVE_EXECUTION_DISABLED"
  | "INVALID_ORDER";

export interface BrokerOrderIntent {
  symbol: string;

  market?:
    | "us"
    | "hk"
    | "cn"
    | null;

  side:
    | "buy"
    | "sell";

  quantity: number;

  limitPrice?:
    | number
    | null;

  reason?:
    | string
    | null;
}

export interface BrokerIntegrationBoundaryRequest {
  order?:
    | BrokerOrderIntent
    | null;

  paperTradingVerified?:
    boolean;

  humanReviewApproved?:
    boolean;

  provider?:
    BrokerProvider;

  connectionVerified?:
    boolean;

  executionRequested?:
    boolean;
}

export interface BrokerIntegrationBoundaryResult {
  success: boolean;

  code:
    | "C153_BROKER_BOUNDARY_BLOCKED"
    | "C153_BROKER_BOUNDARY_READY_FOR_REVIEW"
    | "C153_INVALID_REQUEST";

  stage:
    "C153";

  status:
    | "blocked"
    | "ready-for-review";

  readyForBrokerExecution:
    false;

  orderIntent:
    | BrokerOrderIntent
    | null;

  broker: {
    provider:
      BrokerProvider;

    connectionStatus:
      BrokerConnectionStatus;

    connectionVerified:
      false;

    adapterAvailable:
      false;

    executionStatus:
      BrokerExecutionStatus;
  };

  gates: {
    paperTradingVerified:
      boolean;

    humanReviewApproved:
      boolean;

    executionRequested:
      boolean;
  };

  blockedReasons:
    BrokerBoundaryBlockReason[];

  execution: {
    tradingExecuted:
      false;

    liveOrderPlaced:
      false;

    brokerOrderId:
      null;

    plannerDispatched:
      false;
  };

  safetyBoundary: {
    founderOnly:
      true;

    simulationRequiredBeforeLive:
      true;

    humanReviewRequired:
      true;

    brokerVerificationRequired:
      true;

    executionAdapterRequired:
      true;

    liveExecutionEnabled:
      false;

    automaticExecutionAllowed:
      false;

    personalizedAdvice:
      false;
  };

  methodology: {
    purpose:
      string;

    requiredSequence:
      string[];

    currentStage:
      "C153";

    nextStage:
      "C154";

    excludedFromDecision:
      string[];
  };

  generatedAt:
    string;

  error?:
    string;
}
