import {
  evaluateMarketProviderCommercialGate,
} from "./market-provider-commercial-gate";
import {
  getPrimaryMarketDataProvider,
  getPrimaryMarketProviderCapabilities,
  getPrimaryMarketProviderStatus,
} from "./market-data-provider";
import {
  evaluateMarketPreTradeRisk,
  type MarketPreTradeRiskDecision,
} from "./market-pretrade-risk";
import {
  getMarketHumanReview,
} from "./market-human-review-runtime";
import type {
  MarketHumanReviewRecord,
} from "./market-human-review-types";
import {
  evaluateBrokerConnectionVerification,
} from "./broker-connection-verification";
import {
  getBrokerExecutionAdapterCapabilities,
  getBrokerExecutionAdapterId,
  isBrokerExecutionAdapterConfigured,
  isBrokerExecutionAdapterReady,
} from "./broker-execution-adapter";

export type MarketExecutionReadinessDecision =
  | "ready"
  | "blocked"
  | "review-required"
  | "not-configured"
  | "unknown";

export type MarketExecutionReadinessFailureCode =
  | "PROVIDER_NOT_READY"
  | "PROVIDER_COMMERCIAL_GATE_CLOSED"
  | "PRETRADE_RISK_BLOCKED"
  | "PRETRADE_RISK_REVIEW_REQUIRED"
  | "HUMAN_REVIEW_REQUIRED"
  | "HUMAN_REVIEW_NOT_ACCEPTED"
  | "BROKER_CONNECTION_NOT_VERIFIED"
  | "BROKER_CREDENTIALS_NOT_VERIFIED"
  | "BROKER_ACCOUNT_NOT_VERIFIED"
  | "BROKER_VERIFICATION_INCOMPLETE"
  | "BROKER_ADAPTER_NOT_CONFIGURED"
  | "BROKER_ADAPTER_NOT_READY"
  | "EXECUTION_DISABLED";

export interface MarketExecutionReadinessOrder {
  symbol: string;
  market: "us" | "hk" | "cn";
  side: "buy" | "sell";
  quantity: number;
  limitPrice: number | null;
  reason: string;
}

export interface MarketExecutionReadinessResult {
  success: boolean;
  decision: MarketExecutionReadinessDecision;
  executionReady: boolean;
  order: MarketExecutionReadinessOrder;

  provider: {
    id: string | null;
    technicalReady: boolean;
    commercialGateOpen: boolean;
    commercialDecision: string;
    commercialReason: string;
  };

  preTradeRisk: {
    decision: MarketPreTradeRiskDecision | string;
    passed: boolean;
    reviewRequired: boolean;
    estimatedNotional: number | null;
    blockedReasons: string[];
  };

  humanReview: {
    taskId: string | null;
    found: boolean;
    required: boolean;
    approved: boolean;
    decision: string;
    status: string;
    reviewId: string | null;
  };

  brokerConnection: {
    brokerId: string;
    status: string;
    decision: string;
    connectionVerified: boolean;
    credentialsVerified: boolean;
    accountVerified: boolean;
    verificationComplete: boolean;
    gateOpen: boolean;
    failureCodes: string[];
    reason: string;
  };

  brokerAdapter: {
    id: string;
    configured: boolean;
    ready: boolean;
    capabilities: {
      available: boolean;
      connectionVerified: boolean;
      credentialsVerified: boolean;
      accountVerified: boolean;
      supportsLiveOrders: boolean;
      supportsPaperOrders: boolean;
      supportsCancelOrders: boolean;
      supportsOrderStatus: boolean;
      supportedMarkets: Array<"us" | "hk" | "cn">;
      executionEnabled: boolean;
    };
  };

  gates: {
    provider: boolean;
    commercial: boolean;
    preTradeRisk: boolean;
    humanReview: boolean;
    brokerConnection: boolean;
    brokerAdapter: boolean;
    execution: boolean;
  };

  failureCodes: MarketExecutionReadinessFailureCode[];

  safetyBoundary: {
    founderOnly: true;
    automaticExecution: false;
    liveOrderPlacement: false;
    tradingExecuted: false;
    callerCanOverride: false;
    callerCanBypass: false;
    commercialAuthorizationRequired: true;
    preTradeRiskRequired: true;
    persistentHumanReviewRequired: true;
    brokerConnectionVerificationRequired: true;
    brokerExecutionAdapterRequired: true;
    liveExecutionEnabled: false;
  };

  generatedAt: string;
}

type NormalizedOrder =
  MarketExecutionReadinessOrder;

function readString(
  value: unknown,
  fallback = "",
): string {
  return typeof value === "string"
    ? value
    : fallback;
}

function normalizeOrder(
  order: MarketExecutionReadinessOrder,
): NormalizedOrder {
  return {
    symbol:
      order.symbol
        .trim()
        .toUpperCase(),
    market:
      order.market,
    side:
      order.side,
    quantity:
      Math.floor(
        order.quantity,
      ),
    limitPrice:
      order.limitPrice === null
        ? null
        : Number(
            order.limitPrice,
          ),
    reason:
      order.reason.trim(),
  };
}

function addFailure(
  failures:
    MarketExecutionReadinessFailureCode[],
  code:
    MarketExecutionReadinessFailureCode,
): void {
  if (
    !failures.includes(code)
  ) {
    failures.push(code);
  }
}

function getHumanReviewStatus(
  decision:
    | MarketHumanReviewRecord["decision"]
    | null,
): string {
  if (!decision) {
    return "not-requested";
  }

  switch (decision) {
    case "accepted":
      return "approved";

    case "rejected":
      return "rejected";

    case "deferred":
      return "deferred";

    case "acknowledged":
      return "acknowledged";

    default:
      return "not-requested";
  }
}

function getHumanReviewState(
  review:
    | MarketHumanReviewRecord
    | null,
) {
  if (!review) {
    return {
      found: false,
      approved: false,
      decision:
        "not-requested",
      status:
        "not-requested",
      reviewId: null,
    };
  }

  return {
    found: true,

    approved:
      review.decision ===
      "accepted",

    decision:
      review.decision,

    status:
      getHumanReviewStatus(
        review.decision,
      ),

    reviewId:
      typeof review.reviewId ===
      "string"
        ? review.reviewId
        : null,
  };
}

export async function evaluateMarketExecutionReadiness(
  orderInput:
    MarketExecutionReadinessOrder,
  taskId?: string | null,
): Promise<
  MarketExecutionReadinessResult
> {
  const order =
    normalizeOrder(
      orderInput,
    );

  const [
    provider,
    providerCapabilities,
    providerStatus,
    humanReview,
  ] = await Promise.all([
    getPrimaryMarketDataProvider(),

    getPrimaryMarketProviderCapabilities(),

    getPrimaryMarketProviderStatus(),

    taskId
      ? getMarketHumanReview(
          taskId,
        )
      : Promise.resolve(null),
  ]);

  const providerId =
    provider?.id ??
    null;

  const technicalProviderReady =
    providerCapabilities.some(
      (capability) =>
        capability.technicalSupport ===
        true,
    ) ||
    providerStatus?.available ===
      true ||
    providerStatus?.configured ===
      true ||
    (
      (
        providerStatus
          ?.realtimeVerifiedMarkets
          ?.length ??
        0
      ) > 0
    );

  const commercialGate =
    providerId
      ? evaluateMarketProviderCommercialGate(
          providerId,
        )
      : null;

  const commercialGateOpen =
    commercialGate?.gateOpen ===
    true;

  const risk =
    evaluateMarketPreTradeRisk(
      order,
    );

  const human =
    getHumanReviewState(
      humanReview,
    );

  const brokerAdapterId =
    getBrokerExecutionAdapterId();

  const brokerAdapterConfigured =
    isBrokerExecutionAdapterConfigured();

  const brokerAdapterReady =
    isBrokerExecutionAdapterReady();

  const brokerAdapterCapabilities =
    getBrokerExecutionAdapterCapabilities();

  const brokerConnection =
    evaluateBrokerConnectionVerification(
      brokerAdapterCapabilities,
    );

  const brokerRecord =
    brokerConnection.broker;

  const brokerReadiness =
    brokerConnection.readiness;

  const brokerGate =
    brokerConnection.gate;

  const connectionVerified =
    brokerReadiness.connectionVerified;

  const credentialsVerified =
    brokerReadiness.credentialsVerified;

  const accountVerified =
    brokerReadiness.accountVerified;

  const verificationComplete =
    brokerReadiness.verificationComplete;

  const brokerGateOpen =
    brokerGate.open;

  const failures:
    MarketExecutionReadinessFailureCode[] =
    [];

  if (
    !technicalProviderReady
  ) {
    addFailure(
      failures,
      "PROVIDER_NOT_READY",
    );
  }

  if (
    !commercialGateOpen
  ) {
    addFailure(
      failures,
      "PROVIDER_COMMERCIAL_GATE_CLOSED",
    );
  }

  if (
    risk.decision ===
    "blocked"
  ) {
    addFailure(
      failures,
      "PRETRADE_RISK_BLOCKED",
    );
  }

  if (
    risk.decision ===
    "review-required"
  ) {
    addFailure(
      failures,
      "PRETRADE_RISK_REVIEW_REQUIRED",
    );
  }

  if (!humanReview) {
    addFailure(
      failures,
      "HUMAN_REVIEW_REQUIRED",
    );
  } else if (
    !human.approved
  ) {
    addFailure(
      failures,
      "HUMAN_REVIEW_NOT_ACCEPTED",
    );
  }

  if (
    !connectionVerified
  ) {
    addFailure(
      failures,
      "BROKER_CONNECTION_NOT_VERIFIED",
    );
  }

  if (
    !credentialsVerified
  ) {
    addFailure(
      failures,
      "BROKER_CREDENTIALS_NOT_VERIFIED",
    );
  }

  if (
    !accountVerified
  ) {
    addFailure(
      failures,
      "BROKER_ACCOUNT_NOT_VERIFIED",
    );
  }

  if (
    !verificationComplete
  ) {
    addFailure(
      failures,
      "BROKER_VERIFICATION_INCOMPLETE",
    );
  }

  if (
    !brokerAdapterConfigured
  ) {
    addFailure(
      failures,
      "BROKER_ADAPTER_NOT_CONFIGURED",
    );
  }

  if (
    !brokerAdapterReady
  ) {
    addFailure(
      failures,
      "BROKER_ADAPTER_NOT_READY",
    );
  }

  /*
   * C167.5.36 is a readiness boundary only.
   * Actual execution remains disabled.
   */
  addFailure(
    failures,
    "EXECUTION_DISABLED",
  );

  const preTradeRiskPassed =
    risk.decision ===
    "pass";

  const executionReady =
    technicalProviderReady &&
    commercialGateOpen &&
    preTradeRiskPassed &&
    human.approved &&
    connectionVerified &&
    credentialsVerified &&
    accountVerified &&
    verificationComplete &&
    brokerGateOpen &&
    brokerAdapterReady &&
    false;

  const decision:
    MarketExecutionReadinessDecision =
    executionReady
      ? "ready"
      : risk.decision ===
          "review-required"
        ? "review-required"
        : !providerId ||
            !brokerAdapterConfigured
          ? "not-configured"
          : "blocked";

  return {
    success: true,

    decision,

    executionReady,

    order,

    provider: {
      id:
        providerId,

      technicalReady:
        technicalProviderReady,

      commercialGateOpen,

      commercialDecision:
        commercialGate?.decision ??
        "unknown",

      commercialReason:
        commercialGate?.reason ??
        "Commercial authorization gate unavailable.",
    },

    preTradeRisk: {
      decision:
        risk.decision,

      passed:
        preTradeRiskPassed,

      reviewRequired:
        risk.decision ===
        "review-required",

      estimatedNotional:
        risk.estimatedNotional ??
        null,

      blockedReasons:
        risk.blockedReasons ??
        [],
    },

    humanReview: {
      taskId:
        taskId?.trim() ??
        null,

      found:
        human.found,

      required:
        true,

      approved:
        human.approved,

      decision:
        human.decision,

      status:
        human.status,

      reviewId:
        human.reviewId,
    },

    brokerConnection: {
      brokerId:
        readString(
          brokerRecord.brokerId,
          "unconfigured",
        ),

      status:
        readString(
          brokerRecord.status,
          "unknown",
        ),

      decision:
        readString(
          brokerRecord.decision,
          "not-ready",
        ),

      connectionVerified,

      credentialsVerified,

      accountVerified,

      verificationComplete,

      gateOpen:
        brokerGateOpen,

      failureCodes:
        brokerRecord.failureCodes,

      reason:
        readString(
          brokerRecord.reason,
          "Broker connection verification is not complete.",
        ),
    },

    brokerAdapter: {
      id:
        brokerAdapterId,

      configured:
        brokerAdapterConfigured,

      ready:
        brokerAdapterReady,

      capabilities: {
        available:
          brokerAdapterCapabilities
            .available,

        connectionVerified:
          brokerAdapterCapabilities
            .connectionVerified,

        credentialsVerified:
          brokerAdapterCapabilities
            .credentialsVerified,

        accountVerified:
          brokerAdapterCapabilities
            .accountVerified,

        supportsLiveOrders:
          brokerAdapterCapabilities
            .supportsLiveOrders,

        supportsPaperOrders:
          brokerAdapterCapabilities
            .supportsPaperOrders,

        supportsCancelOrders:
          brokerAdapterCapabilities
            .supportsCancelOrders,

        supportsOrderStatus:
          brokerAdapterCapabilities
            .supportsOrderStatus,

        supportedMarkets:
          brokerAdapterCapabilities
            .supportedMarkets,

        executionEnabled:
          brokerAdapterCapabilities
            .executionEnabled,
      },
    },

    gates: {
      provider:
        technicalProviderReady,

      commercial:
        commercialGateOpen,

      preTradeRisk:
        preTradeRiskPassed,

      humanReview:
        human.approved,

      brokerConnection:
        connectionVerified &&
        credentialsVerified &&
        accountVerified &&
        verificationComplete &&
        brokerGateOpen,

      brokerAdapter:
        brokerAdapterReady,

      execution:
        executionReady,
    },

    failureCodes:
      failures,

    safetyBoundary: {
      founderOnly: true,

      automaticExecution:
        false,

      liveOrderPlacement:
        false,

      tradingExecuted:
        false,

      callerCanOverride:
        false,

      callerCanBypass:
        false,

      commercialAuthorizationRequired:
        true,

      preTradeRiskRequired:
        true,

      persistentHumanReviewRequired:
        true,

      brokerConnectionVerificationRequired:
        true,

      brokerExecutionAdapterRequired:
        true,

      liveExecutionEnabled:
        false,
    },

    generatedAt:
      new Date().toISOString(),
  };
}

export function isMarketExecutionReady(
  result:
    MarketExecutionReadinessResult,
): boolean {
  return (
    result.executionReady ===
      true &&
    result.safetyBoundary
      .liveExecutionEnabled ===
      false
  );
}
