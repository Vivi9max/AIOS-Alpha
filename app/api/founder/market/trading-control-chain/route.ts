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
  getMarketDataProviderSelection,
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

import type {
  BrokerOrderIntent,
} from "@/lib/runtime/market/broker-integration-boundary-types";

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

type ControlChainOrder = {
  symbol: string;
  market: MarketRegion;
  side: OrderSide;
  quantity: number;
  limitPrice: number | null;
  reason: string | null;
};

function noStoreHeaders() {
  return {
    "Cache-Control":
      "no-store",
    "Content-Type":
      "application/json; charset=utf-8",
  };
}

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
      headers:
        noStoreHeaders(),
    },
  );
}

function isRecord(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    value !== null &&
    typeof value ===
      "object"
  );
}

function normalizeMarket(
  value: unknown,
): MarketRegion | null {
  if (
    value === "us" ||
    value === "hk" ||
    value === "cn"
  ) {
    return value;
  }

  return null;
}

function normalizeSide(
  value: unknown,
): OrderSide | null {
  if (
    value === "buy" ||
    value === "sell"
  ) {
    return value;
  }

  return null;
}

function normalizeOrder(
  value: unknown,
): ControlChainOrder | null {
  if (
    !isRecord(value)
  ) {
    return null;
  }

  const symbol =
    typeof value.symbol ===
      "string"
      ? value.symbol
          .trim()
          .toUpperCase()
      : "";

  const market =
    normalizeMarket(
      value.market,
    );

  const side =
    normalizeSide(
      value.side,
    );

  const rawQuantity =
    typeof value.quantity ===
      "number"
      ? value.quantity
      : Number(
          value.quantity,
        );

  const quantity =
    Number.isFinite(
      rawQuantity,
    )
      ? Math.floor(
          rawQuantity,
        )
      : 0;

  const rawLimitPrice =
    value.limitPrice ===
      null ||
    value.limitPrice ===
      undefined ||
    value.limitPrice ===
      ""
      ? null
      : typeof value.limitPrice ===
          "number"
        ? value.limitPrice
        : Number(
            value.limitPrice,
          );

  const limitPrice =
    rawLimitPrice ===
      null
      ? null
      : Number.isFinite(
          rawLimitPrice,
        ) &&
        rawLimitPrice >
          0
        ? rawLimitPrice
        : null;

  const reason =
    typeof value.reason ===
      "string"
      ? value.reason.trim()
      : "";

  if (
    !symbol ||
    !market ||
    !side ||
    quantity <=
      0
  ) {
    return null;
  }

  return {
    symbol,
    market,
    side,
    quantity,
    limitPrice,
    reason:
      reason ||
      null,
  };
}

function toBrokerOrder(
  order:
    | ControlChainOrder
    | null,
): BrokerOrderIntent | null {
  if (!order) {
    return null;
  }

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

function asRecord(
  value: unknown,
): Record<
  string,
  unknown
> {
  if (
    isRecord(value)
  ) {
    return value;
  }

  return {};
}

function buildControlDecision(
  brokerDiagnostic: ReturnType<
    typeof evaluateBrokerExecutionAdapter
  >,
  commercialGateOpen: boolean,
) {
  const adapterReady =
    brokerDiagnostic
      .capabilities
      .available &&
    brokerDiagnostic
      .capabilities
      .connectionVerified &&
    brokerDiagnostic
      .capabilities
      .credentialsVerified &&
    brokerDiagnostic
      .capabilities
      .accountVerified &&
    brokerDiagnostic
      .capabilities
      .executionEnabled;

  const executionReady =
    commercialGateOpen &&
    adapterReady &&
    brokerDiagnostic
      .readyForExecution ===
      true;

  if (
    executionReady
  ) {
    return {
      state:
        "ready-for-human-review",
      executionAllowed:
        false,
      reason:
        "All technical and commercial gates are observable, but explicit human execution approval remains required.",
    };
  }

  if (
    !commercialGateOpen
  ) {
    return {
      state:
        "commercial-gate-blocked",
      executionAllowed:
        false,
      reason:
        "Market provider commercial authorization is not explicitly open.",
    };
  }

  if (
    !adapterReady
  ) {
    return {
      state:
        "broker-adapter-blocked",
      executionAllowed:
        false,
      reason:
        "The broker execution adapter is not independently verified and enabled.",
    };
  }

  return {
    state:
      "human-review-required",
    executionAllowed:
      false,
    reason:
      "The control chain requires explicit human review before any future execution.",
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
    return unauthorized();
  }

  try {
    const body =
      await request.json();

    const order =
      normalizeOrder(
        isRecord(body)
          ? body.order
          : null,
      );

    if (
      isRecord(body) &&
      body.order !==
        undefined &&
      !order
    ) {
      return NextResponse.json(
        {
          success: false,
          code:
            "C167_5_17_INVALID_ORDER",
          error:
            "The supplied order intent is invalid.",
          safetyBoundary: {
            liveOrderPlaced:
              false,
            tradingExecuted:
              false,
            plannerDispatched:
              false,
            automaticExecutionAllowed:
              false,
          },
        },
        {
          status: 400,
          headers:
            noStoreHeaders(),
        },
      );
    }

    const selection =
      getMarketDataProviderSelection();

    const primary =
      getPrimaryMarketDataProvider();

    const [
      providerStatus,
      providerCapabilities,
    ] =
      await Promise.all([
        getPrimaryMarketProviderStatus(),
        getPrimaryMarketProviderCapabilities(),
      ]);

    const activeProvider =
      selection.activeProvider;

    const providerId =
      primary?.id ??
      activeProvider ??
      null;

    const commercialGate =
      providerId
        ? evaluateMarketProviderCommercialGate(
            providerId,
          )
        : null;

    const commercialGateOpen =
      commercialGate?.gateOpen ===
      true;

    const adapterId =
      getBrokerExecutionAdapterId();

    const adapterConfigured =
      isBrokerExecutionAdapterConfigured();

    const adapterReady =
      isBrokerExecutionAdapterReady();

    const adapterCapabilities =
      getBrokerExecutionAdapterCapabilities();

    const brokerDiagnostic =
      evaluateBrokerExecutionAdapter(
        toBrokerOrder(
          order,
        ),
        {
          founderAuthenticated:
            true,

          paperTradingVerified:
            false,

          humanReviewApproved:
            false,

          brokerConnectionVerified:
            adapterCapabilities
              .connectionVerified,

          brokerCredentialsVerified:
            adapterCapabilities
              .credentialsVerified,

          brokerAccountVerified:
            adapterCapabilities
              .accountVerified,

          executionRequested:
            false,

          liveExecutionEnabled:
            false,
        },
      );

    const controlDecision =
      buildControlDecision(
        brokerDiagnostic,
        commercialGateOpen,
      );

    const providerStatusRecord =
      asRecord(
        providerStatus,
      );

    const providerCapabilitiesRecord =
      asRecord(
        providerCapabilities,
      );

    const providerTechnicalReady =
      providerStatusRecord
        .configured ===
        true &&
      providerStatusRecord
        .available ===
        true;

    const realtimeVerified =
      providerStatusRecord
        .supportsRealtime ===
        true;

    const commercialStatus =
      commercialGate?.status ??
      "unknown";

    const commercialDecision =
      commercialGate?.decision ??
      "unknown";

    return NextResponse.json(
      {
        success:
          true,

        code:
          "C167_5_17_TRADING_CONTROL_CHAIN",

        stage:
          "C167.5.17",

        controlChain: [
          {
            stage:
              "research",
            state:
              "available",
            description:
              "Founder market research remains available through the shared Market Terminal.",
          },

          {
            stage:
              "provider",
            state:
              providerTechnicalReady
                ? "technical-ready"
                : "blocked",
            description:
              "Market provider technical capability is evaluated independently from commercial authorization.",
          },

          {
            stage:
              "commercial",
            state:
              commercialGateOpen
                ? "authorized"
                : "not-authorized",
            description:
              "Commercial authorization is controlled by the independent provider commercial gate.",
          },

          {
            stage:
              "broker-adapter",
            state:
              adapterConfigured
                ? adapterReady
                  ? "ready-for-review"
                  : "diagnostic-only"
                : "not-configured",
            description:
              "Broker adapter diagnostics establish capability state without enabling live execution.",
          },

          {
            stage:
              "human-review",
            state:
              "required",
            description:
              "Explicit human approval remains mandatory.",
          },

          {
            stage:
              "execution",
            state:
              "disabled",
            description:
              "Live order execution remains disabled at this stage.",
          },
        ],

        orderIntent:
          order,

        provider: {
          id:
            providerId,

          requestedProvider:
            selection.requestedProvider,

          activeProvider:
            activeProvider,

          availableProviders:
            selection.availableProviders,

          technicalReady:
            providerTechnicalReady,

          realtimeVerified,

          status:
            providerStatusRecord,

          capabilities:
            providerCapabilitiesRecord,
        },

        commercialAuthorization: {
          providerId:
            commercialGate
              ?.providerId ??
            providerId,

          status:
            commercialStatus,

          decision:
            commercialDecision,

          authorized:
            commercialGate
              ?.authorized ===
            true,

          gateOpen:
            commercialGateOpen,

          source:
            commercialGate
              ?.source ??
            "unknown",

          verifiedAt:
            commercialGate
              ?.verifiedAt ??
            null,

          verifiedBy:
            commercialGate
              ?.verifiedBy ??
            null,

          contractReference:
            commercialGate
              ?.contractReference ??
            null,

          reason:
            commercialGate
              ?.reason ??
            "Commercial authorization has not been explicitly verified.",

          automaticApproval:
            false,
        },

        brokerAdapter: {
          id:
            adapterId,

          configured:
            adapterConfigured,

          ready:
            adapterReady,

          capabilities:
            adapterCapabilities,

          diagnostic: {
            status:
              brokerDiagnostic.status,

            blockedReasons:
              brokerDiagnostic
                .blockedReasons,

            execution:
              brokerDiagnostic
                .execution,

            safetyBoundary:
              brokerDiagnostic
                .safetyBoundary,

            generatedAt:
              brokerDiagnostic
                .generatedAt,
          },
        },

        controlDecision,

        gates: {
          founderAuthenticated:
            true,

          providerTechnicalReady,

          providerRealtimeVerified:
            realtimeVerified,

          commercialGateOpen,

          brokerAdapterConfigured:
            adapterConfigured,

          brokerAdapterReady:
            adapterReady,

          brokerConnectionVerified:
            adapterCapabilities
              .connectionVerified,

          brokerCredentialsVerified:
            adapterCapabilities
              .credentialsVerified,

          brokerAccountVerified:
            adapterCapabilities
              .accountVerified,

          paperTradingVerified:
            false,

          humanReviewApproved:
            false,

          liveExecutionEnabled:
            false,
        },

        execution: {
          readyForLiveExecution:
            false,

          executionRequested:
            false,

          liveOrderPlaced:
            false,

          tradingExecuted:
            false,

          brokerOrderId:
            null,

          plannerDispatched:
            false,
        },

        nextRequirements: [
          !providerTechnicalReady
            ? "Verify the selected market provider technical configuration and runtime availability."
            : null,

          !realtimeVerified
            ? "Verify realtime market-data capability before making realtime claims."
            : null,

          !commercialGateOpen
            ? "Complete and explicitly verify the independent market provider commercial authorization gate."
            : null,

          !adapterConfigured
            ? "Configure a verified broker execution adapter."
            : null,

          adapterConfigured &&
          !adapterCapabilities
            .connectionVerified
            ? "Verify broker connection server-side."
            : null,

          adapterConfigured &&
          !adapterCapabilities
            .credentialsVerified
            ? "Verify broker credentials server-side."
            : null,

          adapterConfigured &&
          !adapterCapabilities
            .accountVerified
            ? "Verify broker account server-side."
            : null,

          !adapterCapabilities
            .executionEnabled
            ? "Keep live execution disabled until the broker adapter is independently verified."
            : null,

          "Complete paper-trading verification before any live execution review.",

          "Require explicit human approval before any future live execution.",
        ].filter(
          (
            value,
          ): value is string =>
            value !== null,
        ),

        safetyBoundary: {
          founderOnly:
            true,

          researchOnlyForOrdinaryUsers:
            true,

          technicalProviderAccessDoesNotAuthorizeTrading:
            true,

          commercialAuthorizationDoesNotAuthorizeTrading:
            true,

          brokerAdapterConfigurationDoesNotAuthorizeTrading:
            true,

          paperTradingRequired:
            true,

          humanReviewRequired:
            true,

          automaticExecutionAllowed:
            false,

          liveExecutionEnabled:
            false,

          liveOrderPlaced:
            false,

          tradingExecuted:
            false,

          brokerOrderId:
            null,

          plannerDispatched:
            false,
        },

        generatedAt:
          new Date().toISOString(),
      },
      {
        status:
          200,

        headers:
          noStoreHeaders(),
      },
    );
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        success:
          false,

        code:
          "C167_5_17_TRADING_CONTROL_CHAIN_ERROR",

        stage:
          "C167.5.17",

        error:
          error instanceof Error
            ? error.message
            : "Trading control chain evaluation failed.",

        execution: {
          readyForLiveExecution:
            false,

          executionRequested:
            false,

          liveOrderPlaced:
            false,

          tradingExecuted:
            false,

          brokerOrderId:
            null,

          plannerDispatched:
            false,
        },

        safetyBoundary: {
          founderOnly:
            true,

          automaticExecutionAllowed:
            false,

          liveExecutionEnabled:
            false,

          liveOrderPlaced:
            false,

          tradingExecuted:
            false,

          plannerDispatched:
            false,
        },
      },
      {
        status:
          500,

        headers:
          noStoreHeaders(),
      },
    );
  }
}
