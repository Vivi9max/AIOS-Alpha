import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireFounderAccess,
} from "@/lib/auth/founder";

import {
  evaluateBrokerExecutionAdapter,
  getBrokerExecutionAdapterCapabilities,
  getBrokerExecutionAdapterId,
  isBrokerExecutionAdapterConfigured,
  isBrokerExecutionAdapterReady,
} from "@/lib/runtime/market/broker-execution-adapter";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function buildHeaders() {
  return {
    "Cache-Control":
      "no-store",

    "Content-Type":
      "application/json; charset=utf-8",
  };
}

export async function GET(
  request: NextRequest,
) {
  const access =
    requireFounderAccess(
      request,
    );

  if (
    !access.authorized
  ) {
    return access.response;
  }

  const adapterId =
    getBrokerExecutionAdapterId();

  const configured =
    isBrokerExecutionAdapterConfigured();

  const ready =
    isBrokerExecutionAdapterReady();

  const capabilities =
    getBrokerExecutionAdapterCapabilities();

  const diagnostic =
    evaluateBrokerExecutionAdapter(
      null,
      {
        founderAuthenticated:
          true,

        paperTradingVerified:
          false,

        humanReviewApproved:
          false,

        brokerConnectionVerified:
          false,

        brokerCredentialsVerified:
          false,

        brokerAccountVerified:
          false,

        executionRequested:
          false,

        liveExecutionEnabled:
          false,
      },
    );

  const connectionVerified =
    capabilities.connectionVerified;

  const credentialsVerified =
    capabilities.credentialsVerified;

  const accountVerified =
    capabilities.accountVerified;

  const executionEnabled =
    capabilities.executionEnabled;

  let readinessState:
    | "not-configured"
    | "diagnostic-only"
    | "blocked"
    | "ready-for-review" =
    "not-configured";

  if (
    configured &&
    ready
  ) {
    readinessState =
      "ready-for-review";
  } else if (
    configured
  ) {
    readinessState =
      "diagnostic-only";
  } else {
    readinessState =
      "not-configured";
  }

  const nextRequirements =
    [
      !configured
        ? "Configure a verified broker execution adapter."
        : null,

      configured &&
      !connectionVerified
        ? "Verify the broker connection server-side."
        : null,

      configured &&
      !credentialsVerified
        ? "Verify broker credentials server-side."
        : null,

      configured &&
      !accountVerified
        ? "Verify the broker account server-side."
        : null,

      configured &&
      !executionEnabled
        ? "Keep live execution disabled until the adapter is independently verified."
        : null,

      "Complete paper-trading verification before any live execution review.",

      "Require explicit human approval before any future live execution.",
    ].filter(
      (
        value,
      ): value is string =>
        value !== null,
    );

  return NextResponse.json(
    {
      success:
        true,

      code:
        "C167_5_15_BROKER_ADAPTER_DIAGNOSTICS",

      stage:
        "C167.5.15",

      adapter: {
        id:
          adapterId,

        configured,

        readiness:
          readinessState,

        readyForExecution:
          false,
      },

      capabilities: {
        ...capabilities,

        connectionVerified,

        credentialsVerified,

        accountVerified,

        executionEnabled,

        supportsLiveOrders:
          capabilities.supportsLiveOrders,

        supportsPaperOrders:
          capabilities.supportsPaperOrders,

        supportsCancelOrders:
          capabilities.supportsCancelOrders,

        supportsOrderStatus:
          capabilities.supportsOrderStatus,
      },

      verification: {
        brokerConnection:
          connectionVerified
            ? "verified"
            : "not-verified",

        brokerCredentials:
          credentialsVerified
            ? "verified"
            : "not-verified",

        brokerAccount:
          accountVerified
            ? "verified"
            : "not-verified",

        executionCapability:
          executionEnabled
            ? "enabled"
            : "disabled",
      },

      diagnostic: {
        status:
          diagnostic.status,

        blockedReasons:
          diagnostic.blockedReasons,

        safetyBoundary:
          diagnostic.safetyBoundary,

        generatedAt:
          diagnostic.generatedAt,
      },

      readiness: {
        state:
          readinessState,

        technicalAdapterAvailable:
          capabilities.available,

        connectionVerified,

        credentialsVerified,

        accountVerified,

        executionEnabled,

        liveExecutionReady:
          false,
      },

      nextRequirements,

      commercialBoundary: {
        statement:
          "Broker adapter configuration does not authorize live trading.",

        brokerVerificationRequired:
          true,

        paperTradingRequired:
          true,

        humanReviewRequired:
          true,

        executionAdapterRequired:
          true,

        automaticExecutionAllowed:
          false,
      },

      safetyBoundary: {
        founderOnly:
          true,

        liveOrderPlaced:
          false,

        tradingExecuted:
          false,

        brokerOrderId:
          null,

        plannerDispatched:
          false,

        automaticExecutionAllowed:
          false,

        liveExecutionEnabled:
          false,
      },
    },
    {
      status:
        200,

      headers:
        buildHeaders(),
    },
  );
}
