import type {
  BrokerOrderIntent,
} from "./broker-integration-boundary-types";

export type BrokerExecutionAdapterId =
  | "unconfigured"
  | "custom";

export type BrokerExecutionAdapterStatus =
  | "unavailable"
  | "diagnostic-only"
  | "ready-for-review"
  | "disabled";

export type BrokerExecutionFailureCode =
  | "BROKER_ADAPTER_NOT_CONFIGURED"
  | "BROKER_ADAPTER_NOT_VERIFIED"
  | "BROKER_CREDENTIALS_NOT_VERIFIED"
  | "BROKER_ACCOUNT_NOT_VERIFIED"
  | "MARKET_NOT_SUPPORTED"
  | "ORDER_NOT_SUPPORTED"
  | "EXECUTION_DISABLED"
  | "HUMAN_REVIEW_REQUIRED"
  | "PAPER_TRADING_REQUIRED"
  | "INVALID_ORDER"
  | "UNKNOWN";

export interface BrokerExecutionAdapterContext {
  founderAuthenticated: boolean;

  paperTradingVerified: boolean;

  humanReviewApproved: boolean;

  brokerConnectionVerified: boolean;

  brokerCredentialsVerified: boolean;

  brokerAccountVerified: boolean;

  executionRequested: boolean;

  liveExecutionEnabled: boolean;
}

export interface BrokerExecutionAdapterCapabilities {
  adapterId:
    BrokerExecutionAdapterId;

  available: boolean;

  connectionVerified: boolean;

  credentialsVerified: boolean;

  accountVerified: boolean;

  supportsLiveOrders: boolean;

  supportsPaperOrders: boolean;

  supportsCancelOrders: boolean;

  supportsOrderStatus: boolean;

  supportedMarkets: Array<
    "us" |
    "hk" |
    "cn"
  >;

  executionEnabled: boolean;
}

export interface BrokerExecutionAdapterResult {
  success: boolean;

  adapterId:
    BrokerExecutionAdapterId;

  status:
    BrokerExecutionAdapterStatus;

  orderIntent:
    BrokerOrderIntent |
    null;

  readyForExecution:
    false;

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

  blockedReasons:
    BrokerExecutionFailureCode[];

  capabilities:
    BrokerExecutionAdapterCapabilities;

  safetyBoundary: {
    founderOnly:
      true;

    humanReviewRequired:
      true;

    paperTradingRequired:
      true;

    brokerConnectionRequired:
      true;

    brokerCredentialsRequired:
      true;

    brokerAccountVerificationRequired:
      true;

    automaticExecutionAllowed:
      false;

    liveExecutionEnabled:
      false;
  };

  generatedAt:
    string;
}

const DEFAULT_CAPABILITIES:
  BrokerExecutionAdapterCapabilities = {
    adapterId:
      "unconfigured",

    available:
      false,

    connectionVerified:
      false,

    credentialsVerified:
      false,

    accountVerified:
      false,

    supportsLiveOrders:
      false,

    supportsPaperOrders:
      false,

    supportsCancelOrders:
      false,

    supportsOrderStatus:
      false,

    supportedMarkets:
      [],

    executionEnabled:
      false,
  };

function normalizeOrder(
  order:
    | BrokerOrderIntent
    | null
    | undefined,
): BrokerOrderIntent | null {
  if (
    !order
  ) {
    return null;
  }

  const symbol =
    typeof order.symbol ===
      "string"
      ? order.symbol
          .trim()
          .toUpperCase()
      : "";

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
    symbol.length ===
      0 ||
    quantity <=
      0 ||
    (
      order.side !==
        "buy" &&
      order.side !==
        "sell"
    )
  ) {
    return null;
  }

  const market =
    order.market ===
      "us" ||
    order.market ===
      "hk" ||
    order.market ===
      "cn"
      ? order.market
      : null;

  const limitPrice =
    typeof order.limitPrice ===
      "number" &&
    Number.isFinite(
      order.limitPrice,
    ) &&
    order.limitPrice >
      0
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
        "string" &&
      order.reason.trim()
        ? order.reason.trim()
        : null,
  };
}

function getConfiguredAdapterId():
  BrokerExecutionAdapterId {
  const configured =
    process.env
      .BROKER_EXECUTION_ADAPTER
      ?.trim()
      .toLowerCase();

  if (
    configured ===
      "custom"
  ) {
    return "custom";
  }

  return "unconfigured";
}

function buildCapabilities(
  adapterId:
    BrokerExecutionAdapterId,
): BrokerExecutionAdapterCapabilities {
  if (
    adapterId ===
    "custom"
  ) {
    /*
     * C167.5.14 defines the adapter
     * contract but does not claim that
     * a real broker implementation exists.
     *
     * A future broker adapter must replace
     * these diagnostic values after its
     * server-side connection and account
     * verification have completed.
     */
    return {
      adapterId,

      available:
        false,

      connectionVerified:
        false,

      credentialsVerified:
        false,

      accountVerified:
        false,

      supportsLiveOrders:
        false,

      supportsPaperOrders:
        false,

      supportsCancelOrders:
        false,

      supportsOrderStatus:
        false,

      supportedMarkets:
        [],

      executionEnabled:
        false,
    };
  }

  return {
    ...DEFAULT_CAPABILITIES,
  };
}

function buildBlockedReasons(
  context:
    BrokerExecutionAdapterContext,
  order:
    BrokerOrderIntent |
    null,
  capabilities:
    BrokerExecutionAdapterCapabilities,
): BrokerExecutionFailureCode[] {
  const reasons:
    BrokerExecutionFailureCode[] =
    [];

  if (
    !order
  ) {
    reasons.push(
      "INVALID_ORDER",
    );
  }

  if (
    !context.founderAuthenticated
  ) {
    reasons.push(
      "HUMAN_REVIEW_REQUIRED",
    );
  }

  if (
    !context.paperTradingVerified
  ) {
    reasons.push(
      "PAPER_TRADING_REQUIRED",
    );
  }

  if (
    !context.humanReviewApproved
  ) {
    reasons.push(
      "HUMAN_REVIEW_REQUIRED",
    );
  }

  if (
    !capabilities.available
  ) {
    reasons.push(
      "BROKER_ADAPTER_NOT_CONFIGURED",
    );
  }

  if (
    !capabilities.connectionVerified
  ) {
    reasons.push(
      "BROKER_ADAPTER_NOT_VERIFIED",
    );
  }

  if (
    !capabilities.credentialsVerified ||
    !context.brokerCredentialsVerified
  ) {
    reasons.push(
      "BROKER_CREDENTIALS_NOT_VERIFIED",
    );
  }

  if (
    !capabilities.accountVerified ||
    !context.brokerAccountVerified
  ) {
    reasons.push(
      "BROKER_ACCOUNT_NOT_VERIFIED",
    );
  }

  if (
    !context.brokerConnectionVerified
  ) {
    reasons.push(
      "BROKER_ADAPTER_NOT_VERIFIED",
    );
  }

  if (
    !context.executionRequested
  ) {
    reasons.push(
      "EXECUTION_DISABLED",
    );
  }

  if (
    !context.liveExecutionEnabled
  ) {
    reasons.push(
      "EXECUTION_DISABLED",
    );
  }

  if (
    !capabilities.executionEnabled
  ) {
    reasons.push(
      "EXECUTION_DISABLED",
    );
  }

  return Array.from(
    new Set(
      reasons,
    ),
  );
}

function buildSafetyBoundary() {
  return {
    founderOnly:
      true,

    humanReviewRequired:
      true,

    paperTradingRequired:
      true,

    brokerConnectionRequired:
      true,

    brokerCredentialsRequired:
      true,

    brokerAccountVerificationRequired:
      true,

    automaticExecutionAllowed:
      false,

    liveExecutionEnabled:
      false,
  } as const;
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

/**
 * C167.5.14
 *
 * Defines the server-side contract for a future
 * broker execution adapter.
 *
 * This function intentionally does not place
 * orders, connect to a broker, or accept caller
 * supplied flags as proof of execution readiness.
 */
export function evaluateBrokerExecutionAdapter(
  order:
    | BrokerOrderIntent
    | null
    | undefined,
  context:
    BrokerExecutionAdapterContext,
): BrokerExecutionAdapterResult {
  const normalizedOrder =
    normalizeOrder(
      order,
    );

  const adapterId =
    getConfiguredAdapterId();

  const capabilities =
    buildCapabilities(
      adapterId,
    );

  const blockedReasons =
    buildBlockedReasons(
      context,
      normalizedOrder,
      capabilities,
    );

  return {
    success:
      true,

    adapterId,

    status:
      capabilities.available
        ? "diagnostic-only"
        : "unavailable",

    orderIntent:
      normalizedOrder,

    readyForExecution:
      false,

    execution:
      buildExecution(),

    blockedReasons,

    capabilities,

    safetyBoundary:
      buildSafetyBoundary(),

    generatedAt:
      new Date().toISOString(),
  };
}

export function getBrokerExecutionAdapterCapabilities():
  BrokerExecutionAdapterCapabilities {
  return buildCapabilities(
    getConfiguredAdapterId(),
  );
}

export function isBrokerExecutionAdapterConfigured():
  boolean {
  return (
    getConfiguredAdapterId() !==
    "unconfigured"
  );
}

export function isBrokerExecutionAdapterReady():
  false {
  /*
   * C167.5.14 deliberately returns
   * false. A future real adapter must
   * establish readiness through actual
   * server-side broker verification.
   */
  return false;
}

export function getBrokerExecutionAdapterId():
  BrokerExecutionAdapterId {
  return getConfiguredAdapterId();
}
