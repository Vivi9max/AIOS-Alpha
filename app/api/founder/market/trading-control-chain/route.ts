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
  evaluateMarketPreTradeRisk,
} from "@/lib/runtime/market/market-pretrade-risk";

import {
  evaluateBrokerConnectionVerification,
} from "@/lib/runtime/market/broker-connection-verification";

import {
  evaluateBrokerExecutionAdapter,
  getBrokerExecutionAdapterCapabilities,
  getBrokerExecutionAdapterId,
  isBrokerExecutionAdapterConfigured,
  isBrokerExecutionAdapterReady,
} from "@/lib/runtime/market/broker-execution-adapter";

import {
  getMarketHumanReview,
} from "@/lib/runtime/market/market-human-review-runtime";

import type {
  MarketHumanReviewRecord,
} from "@/lib/runtime/market/market-human-review-types";

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

interface OrderInput {
  symbol?: unknown;
  market?: unknown;
  side?: unknown;
  quantity?: unknown;
  limitPrice?: unknown;
  reason?: unknown;
}

interface TradingControlChainBody
  extends OrderInput {
  order?: OrderInput;
  taskId?: unknown;
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
  input: OrderInput,
): {
  order: OrderIntent | null;
  error: string | null;
} {
  const symbol =
    cleanText(
      input.symbol,
    ).toUpperCase();

  const market =
    normalizeMarket(
      input.market,
    );

  const side =
    normalizeSide(
      input.side,
    );

  const quantity =
    normalizePositiveNumber(
      input.quantity,
    );

  const limitPrice =
    input.limitPrice === null ||
    input.limitPrice === undefined ||
    input.limitPrice === ""
      ? null
      : normalizePositiveNumber(
          input.limitPrice,
        );

  const reason =
    cleanText(
      input.reason,
    );

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

  if (
    quantity === null
  ) {
    return {
      order: null,
      error:
        "quantity must be greater than zero.",
    };
  }

  if (
    input.limitPrice !== null &&
    input.limitPrice !== undefined &&
    input.limitPrice !== "" &&
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

function resolveOrderInput(
  body: TradingControlChainBody,
): OrderInput {
  if (
    body.order !== null &&
    body.order !== undefined &&
    typeof body.order ===
      "object"
  ) {
    return body.order;
  }

  return body;
}

function toBrokerOrder(
  order: OrderIntent,
) {
  return {
    symbol:
      order.symbol,
    market:
      order.market,
    side:
      order.side,
    quantity:
      order.quantity,
    limitPrice:
      order.limitPrice,
    reason:
      order.reason,
  };
}

function normalizeTaskId(
  value: unknown,
): string | null {
  const taskId =
    cleanText(value);

  return taskId
    ? taskId
    : null;
}

function evaluatePersistentHumanReview(
  review:
    MarketHumanReviewRecord | null,
  order:
    OrderIntent,
) {
  if (!review) {
    return {
      requested: false,
      approved: false,
      decision:
        "not-found",
      status:
        "blocked",
      taskId:
        null,
      reviewId:
        null,
      reason:
        "A persistent human review record is required before trading review can continue.",
    };
  }

  const symbolMatches =
    review.symbol ===
    order.symbol;

  const marketMatches =
    review.market ===
    order.market;

  if (
    !symbolMatches ||
    !marketMatches
  ) {
    return {
      requested: true,
      approved: false,
      decision:
        review.decision,
      status:
        "blocked",
      taskId:
        review.taskId,
      reviewId:
        review.reviewId,
      reason:
        "The persistent human review does not match the requested market order.",
    };
  }

  if (
    review.decision ===
    "accepted"
  ) {
    return {
      requested: true,
      approved: true,
      decision:
        review.decision,
      status:
        "approved",
      taskId:
        review.taskId,
      reviewId:
        review.reviewId,
      reason:
        "An explicit persistent human review decision accepted this market intent.",
    };
  }

  if (
    review.decision ===
    "rejected"
  ) {
    return {
      requested: true,
      approved: false,
      decision:
        review.decision,
      status:
        "rejected",
      taskId:
        review.taskId,
      reviewId:
        review.reviewId,
      reason:
        "The persistent human review rejected this market intent.",
    };
  }

  if (
    review.decision ===
    "deferred"
  ) {
    return {
      requested: true,
      approved: false,
      decision:
        review.decision,
      status:
        "deferred",
      taskId:
        review.taskId,
      reviewId:
        review.reviewId,
      reason:
        "The persistent human review deferred this market intent.",
    };
  }

  return {
    requested: true,
    approved: false,
    decision:
      review.decision,
    status:
      "acknowledged",
    taskId:
      review.taskId,
    reviewId:
      review.reviewId,
    reason:
      "Acknowledgement is not equivalent to explicit trading approval.",
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

  let body:
    TradingControlChainBody;

  try {
    body =
      (await request.json()) as
        TradingControlChainBody;
  } catch {
    return jsonResponse(
      {
        success: false,
        code:
          "C167_5_34_INVALID_JSON",
        error:
          "Request body must contain valid JSON.",
      },
      400,
    );
  }

  const orderInput =
    resolveOrderInput(
      body,
    );

  const normalized =
    normalizeOrder(
      orderInput,
    );

  if (
    !normalized.order
  ) {
    return jsonResponse(
      {
        success: false,
        code:
          "C167_5_34_INVALID_ORDER_INTENT",
        error:
          normalized.error ||
          "Invalid order intent.",
      },
      400,
    );
  }

  const order =
    normalized.order;

  const taskId =
    normalizeTaskId(
      body.taskId,
    );

  try {
    const [
      provider,
      providerStatus,
      providerCapabilities,
      brokerCapabilities,
      persistentHumanReview,
    ] = await Promise.all([
      getPrimaryMarketDataProvider(),
      getPrimaryMarketProviderStatus(),
      getPrimaryMarketProviderCapabilities(),
      Promise.resolve(
        getBrokerExecutionAdapterCapabilities(),
      ),
      taskId
        ? getMarketHumanReview(
            taskId,
          )
        : Promise.resolve(
            null,
          ),
    ]);

    const providerRecord =
      asRecord(
        provider,
      );

    const providerId =
      typeof providerRecord.id ===
        "string" &&
      providerRecord.id.trim()
        ? providerRecord.id.trim()
        : "unconfigured";

    const commercialGate =
      evaluateMarketProviderCommercialGate(
        providerId,
      );

    const adapterId =
      getBrokerExecutionAdapterId();

    const adapterConfigured =
      isBrokerExecutionAdapterConfigured();

    const adapterReady =
      isBrokerExecutionAdapterReady();

    const brokerOrder =
      toBrokerOrder(
        order,
      );

    const preTradeRisk =
      evaluateMarketPreTradeRisk(
        brokerOrder,
      );

    const preTradeRiskPassed =
      preTradeRisk.decision ===
      "pass";

    const preTradeRiskReviewRequired =
      preTradeRisk.decision ===
      "review-required";

    const humanReview =
      evaluatePersistentHumanReview(
        persistentHumanReview,
        order,
      );

    const brokerConnectionVerification =
      evaluateBrokerConnectionVerification(
        brokerCapabilities,
      );

    const brokerConnectionVerified =
      brokerConnectionVerification.broker
        .connectionVerified;

    const brokerCredentialsVerified =
      brokerConnectionVerification.broker
        .credentialsVerified;

    const brokerAccountVerified =
      brokerConnectionVerification.broker
        .accountVerified;

    const brokerVerificationComplete =
      brokerConnectionVerification
        .readiness
        .verificationComplete;

    const brokerVerificationPassed =
      brokerVerificationComplete &&
      brokerConnectionVerified &&
      brokerCredentialsVerified &&
      brokerAccountVerified;

    const brokerDiagnostic =
      evaluateBrokerExecutionAdapter(
        brokerOrder,
        {
          founderAuthenticated:
            true,

          paperTradingVerified:
            false,

          humanReviewApproved:
            humanReview.approved,

          brokerConnectionVerified:
            brokerConnectionVerified,

          brokerCredentialsVerified:
            brokerCredentialsVerified,

          brokerAccountVerified:
            brokerAccountVerified,

          executionRequested:
            false,

          liveExecutionEnabled:
            false,
        },
      );

    const providerStatusRecord =
      asRecord(
        providerStatus,
      );

    const providerCapabilitiesRecord =
      asRecord(
        providerCapabilities,
      );

    const commercialGateOpen =
      commercialGate.gateOpen ===
      true;

    const providerReady =
      Boolean(
        providerRecord.id,
      ) &&
      Boolean(
        providerStatusRecord.status ===
          "eligible" ||
        providerStatusRecord.commercialStatus ===
          "eligible",
      );

    const technicalProviderReady =
      Object.keys(
        providerCapabilitiesRecord,
      ).length > 0;

    const brokerDiagnosticReady =
      brokerDiagnostic.readyForExecution;

    const allGatesPassed =
      providerReady &&
      technicalProviderReady &&
      commercialGateOpen &&
      preTradeRiskPassed &&
      humanReview.approved &&
      brokerVerificationPassed &&
      adapterReady &&
      brokerDiagnosticReady;

    const executionReady =
      allGatesPassed &&
      brokerDiagnosticReady;

    const blockedReasons:
      string[] = [];

    if (
      !providerReady
    ) {
      blockedReasons.push(
        "Market provider is not commercially ready.",
      );
    }

    if (
      !technicalProviderReady
    ) {
      blockedReasons.push(
        "Technical market provider capability is unavailable.",
      );
    }

    if (
      !commercialGateOpen
    ) {
      blockedReasons.push(
        "Commercial authorization gate is not open.",
      );
    }

    if (
      !preTradeRiskPassed
    ) {
      if (
        preTradeRiskReviewRequired
      ) {
        blockedReasons.push(
          "Pre-trade risk review is required before the order can continue.",
        );
      } else if (
        preTradeRisk.blockedReasons.length >
        0
      ) {
        blockedReasons.push(
          `Pre-trade risk blocked the order: ${preTradeRisk.blockedReasons.join(
            ", ",
          )}.`,
        );
      } else {
        blockedReasons.push(
          "Pre-trade risk gate did not pass.",
        );
      }
    }

    if (
      !taskId
    ) {
      blockedReasons.push(
        "Persistent human review taskId is required.",
      );
    }

    if (
      !persistentHumanReview
    ) {
      blockedReasons.push(
        "Persistent human review record was not found.",
      );
    } else if (
      !humanReview.approved
    ) {
      blockedReasons.push(
        humanReview.reason,
      );
    }

    if (
      !brokerVerificationPassed
    ) {
      if (
        brokerConnectionVerification
          .broker
          .status ===
        "not-configured"
      ) {
        blockedReasons.push(
          "Broker connection provider is not configured.",
        );
      } else if (
        brokerConnectionVerification
          .broker
          .status ===
        "restricted"
      ) {
        blockedReasons.push(
          "Broker connection verification is restricted.",
        );
      } else if (
        !brokerConnectionVerified
      ) {
        blockedReasons.push(
          "Broker connection has not been independently verified.",
        );
      } else if (
        !brokerCredentialsVerified
      ) {
        blockedReasons.push(
          "Broker credentials have not been independently verified.",
        );
      } else if (
        !brokerAccountVerified
      ) {
        blockedReasons.push(
          "Broker account has not been independently verified.",
        );
      } else {
        blockedReasons.push(
          brokerConnectionVerification
            .broker
            .reason,
        );
      }
    }

    if (
      !adapterConfigured
    ) {
      blockedReasons.push(
        "Broker execution adapter is not configured.",
      );
    }

    if (
      !adapterReady
    ) {
      blockedReasons.push(
        "Broker execution adapter is not ready for execution.",
      );
    }

    if (
      !brokerDiagnosticReady
    ) {
      blockedReasons.push(
        "Live execution remains disabled by the broker adapter safety contract.",
      );
    }

    return jsonResponse({
      success: true,

      code:
        "C167_5_34_TRADING_CONTROL_CHAIN",

      stage:
        "C167.5.34",

      orderIntent:
        order,

      order,

      humanReviewTaskId:
        taskId,

      controlDecision: {
        executionReady,

        decision:
          executionReady
            ? "execution-review-ready"
            : "blocked",

        blockedReasons:
          Array.from(
            new Set(
              blockedReasons,
            ),
          ),

        automaticExecution:
          false,

        orderPlaced:
          false,

        tradingExecuted:
          false,
      },

      controlChain: [
        {
          stage:
            "Research",
          state:
            providerReady
              ? "passed"
              : "blocked",
          description:
            "Research/provider boundary must be commercially ready.",
        },
        {
          stage:
            "Technical Provider",
          state:
            technicalProviderReady
              ? "passed"
              : "blocked",
          description:
            "Technical market-data capability must be available.",
        },
        {
          stage:
            "Commercial Authorization",
          state:
            commercialGateOpen
              ? "passed"
              : "blocked",
          description:
            "Explicit commercial authorization is required.",
        },
        {
          stage:
            "Pre-Trade Risk",
          state:
            preTradeRiskPassed
              ? "passed"
              : preTradeRiskReviewRequired
                ? "review-required"
                : "blocked",
          description:
            "Order quantity, market, notional and limit-price policy must pass before human review and broker evaluation.",
        },
        {
          stage:
            "Persistent Human Review",
          state:
            humanReview.approved
              ? "approved"
              : "blocked",
          description:
            "Only an explicit accepted C147.15 decision can pass this gate.",
        },
        {
          stage:
            "Broker Connection Verification",
          state:
            brokerVerificationPassed
              ? "passed"
              : "blocked",
          description:
            "Broker connection, credentials and account verification must be independently satisfied.",
        },
        {
          stage:
            "Broker Adapter",
          state:
            brokerDiagnosticReady
              ? "passed"
              : "blocked",
          description:
            "Broker execution adapter must independently pass its safety contract.",
        },
        {
          stage:
            "Execution Review",
          state:
            executionReady
              ? "ready"
              : "blocked",
          description:
            "Current implementation never places a live order.",
        },
      ],

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
        providerId:
          commercialGate.providerId,

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

        contractReference:
          commercialGate.contractReference,

        reason:
          commercialGate.reason,
      },

      preTradeRisk: {
        decision:
          preTradeRisk.decision,

        approved:
          preTradeRisk.approved,

        estimatedNotional:
          preTradeRisk.estimatedNotional,

        blockedReasons:
          preTradeRisk.blockedReasons,

        policy:
          preTradeRisk.policy,

        checks:
          preTradeRisk.checks,

        reviewRequired:
          preTradeRiskReviewRequired,

        safetyBoundary:
          preTradeRisk.safetyBoundary,
      },

      humanReview: {
        source:
          "c147.15-persistent-runtime",

        required:
          true,

        taskId:
          taskId,

        found:
          Boolean(
            persistentHumanReview,
          ),

        review:
          persistentHumanReview,

        requested:
          humanReview.requested,

        approved:
          humanReview.approved,

        decision:
          humanReview.decision,

        status:
          humanReview.status,

        reviewId:
          humanReview.reviewId,

        reason:
          humanReview.reason,

        approvalPolicy: {
          acceptedOnly:
            true,

          acknowledgementIsApproval:
            false,

          deferredIsApproval:
            false,

          rejectedIsApproval:
            false,

          missingReviewIsApproval:
            false,

          automaticApproval:
            false,
        },
      },

      brokerConnectionVerification: {
        brokerId:
          brokerConnectionVerification
            .broker
            .brokerId,

        status:
          brokerConnectionVerification
            .broker
            .status,

        decision:
          brokerConnectionVerification
            .broker
            .decision,

        source:
          brokerConnectionVerification
            .broker
            .source,

        connectionVerified:
          brokerConnectionVerified,

        credentialsVerified:
          brokerCredentialsVerified,

        accountVerified:
          brokerAccountVerified,

        executionEnabled:
          brokerConnectionVerification
            .broker
            .executionEnabled,

        verifiedAt:
          brokerConnectionVerification
            .broker
            .verifiedAt,

        verifiedBy:
          brokerConnectionVerification
            .broker
            .verifiedBy,

        contractReference:
          brokerConnectionVerification
            .broker
            .contractReference,

        reason:
          brokerConnectionVerification
            .broker
            .reason,

        failureCodes:
          brokerConnectionVerification
            .broker
            .failureCodes,

        verificationComplete:
          brokerVerificationComplete,

        gateOpen:
          brokerConnectionVerification
            .gate
            .open,
      },

      brokerAdapter: {
        id:
          adapterId,

        configured:
          adapterConfigured,

        ready:
          adapterReady,

        capabilities:
          brokerCapabilities,

        diagnostic:
          brokerDiagnostic,
      },

      gates: {
        researchGate:
          providerReady,

        technicalProviderGate:
          technicalProviderReady,

        commercialGate:
          commercialGateOpen,

        preTradeRiskGate:
          preTradeRiskPassed,

        persistentHumanReviewGate:
          humanReview.approved,

        brokerConnectionVerificationGate:
          brokerVerificationPassed,

        brokerAdapterGate:
          adapterReady &&
          brokerDiagnosticReady,

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

        preTradeRiskRequired:
          true,

        automaticRiskOverrideAllowed:
          false,

        callerCanBypassRiskLimits:
          false,

        persistentHumanReviewRequired:
          true,

        explicitAcceptedDecisionRequired:
          true,

        acknowledgementDoesNotApprove:
          true,

        deferredDoesNotApprove:
          true,

        rejectedDoesNotApprove:
          true,

        brokerConnectionVerificationRequired:
          true,

        brokerConnectionCallerCanSelfVerify:
          false,

        brokerConnectionCallerCanOverride:
          false,

        brokerConnectionCallerCanBypass:
          false,

        brokerConnectionAutomaticVerification:
          false,

        brokerConnectionExecutionAuthorization:
          false,

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

        preTradeRiskPassed,

        preTradeRiskReviewRequired,

        adapterConfigured,

        adapterReady,

        persistentHumanReviewFound:
          Boolean(
            persistentHumanReview,
          ),

        persistentHumanReviewApproved:
          humanReview.approved,

        brokerConnectionVerified,

        brokerCredentialsVerified,

        brokerAccountVerified,

        brokerVerificationComplete,

        brokerVerificationPassed,

        executionReady,
      },

      nextRequirements:
        blockedReasons.length > 0
          ? Array.from(
              new Set(
                blockedReasons,
              ),
            )
          : [
              "All control gates passed. External execution review remains required.",
            ],
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,

        code:
          "C167_5_34_TRADING_CONTROL_CHAIN_ERROR",

        stage:
          "C167.5.34",

        error:
          error instanceof Error
            ? error.message
            : "Trading control chain evaluation failed.",

        boundary: {
          humanDecisionRequired:
            true,

          persistentHumanReviewRequired:
            true,

          preTradeRiskRequired:
            true,

          brokerConnectionVerificationRequired:
            true,

          decisionAutomaticallyGenerated:
            false,

          brokerConnected:
            false,

          brokerConnectionVerified:
            false,

          brokerCredentialsVerified:
            false,

          brokerAccountVerified:
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
      "C167_5_34_TRADING_CONTROL_CHAIN_READY",

    stage:
      "C167.5.34",

    requestContract: {
      supportedForms: [
        "nested-order",
        "flat-order",
      ],

      preferredForm:
        "nested-order",

      taskId:
        "optional-for-contract-validation-but-required-for-human-review",

      nestedOrderExample: {
        order: {
          symbol:
            "AAPL",
          market:
            "us",
          side:
            "buy",
          quantity:
            10,
          limitPrice:
            null,
          reason:
            "Founder trading intent review.",
        },
        taskId:
          "persistent-task-id",
      },

      noOrderPlacement:
        true,
    },

    pipeline: [
      "Research",
      "Technical Provider",
      "Commercial Authorization",
      "Pre-Trade Risk",
      "C147.15 Persistent Human Review",
      "Broker Connection Verification",
      "Broker Adapter",
      "Execution Review",
    ],

    brokerConnectionVerification: {
      required:
        true,

      independent:
        true,

      connectionRequired:
        true,

      credentialsRequired:
        true,

      accountRequired:
        true,

      callerCanSelfVerify:
        false,

      callerCanOverride:
        false,

      callerCanBypass:
        false,

      automaticVerification:
        false,

      executionAuthorization:
        false,
    },

    preTradeRisk: {
      required:
        true,

      automaticOverride:
        false,

      callerBypass:
        false,

      liveExecutionEnabled:
        false,
    },

    humanReview: {
      source:
        "c147.15-persistent-runtime",

      required:
        true,

      acceptedDecisionRequired:
        true,

      acknowledgementIsApproval:
        false,

      deferredIsApproval:
        false,

      rejectedIsApproval:
        false,

      automaticApproval:
        false,
    },

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

    brokerExecution: {
      currentEnabled:
        false,

      externalAdapterRequired:
        true,
    },
  });
}
