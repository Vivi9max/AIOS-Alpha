import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  evaluateBrokerConnectionVerification,
  getBrokerConnectionVerificationPolicy,
} from "@/lib/runtime/market/broker-connection-verification";

import {
  getBrokerExecutionAdapterCapabilities,
  getBrokerExecutionAdapterId,
  isBrokerExecutionAdapterConfigured,
} from "@/lib/runtime/market/broker-execution-adapter";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): NextResponse {
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

function unauthorized(): NextResponse {
  return jsonResponse(
    {
      success:
        false,

      code:
        "FOUNDER_AUTH_REQUIRED",

      error:
        "Founder authentication required.",
    },
    401,
  );
}

function resolveAdapterStatus(
  adapterConfigured: boolean,
  adapterAvailable: boolean,
  executionEnabled: boolean,
): "unconfigured" | "unavailable" | "diagnostic-only" | "execution-disabled" {
  if (!adapterConfigured) {
    return "unconfigured";
  }

  if (!adapterAvailable) {
    return "unavailable";
  }

  if (!executionEnabled) {
    return "execution-disabled";
  }

  return "diagnostic-only";
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse> {
  if (
    !isFounderRequest(
      request,
    )
  ) {
    return unauthorized();
  }

  try {
    const adapterId =
      getBrokerExecutionAdapterId();

    const adapterConfigured =
      isBrokerExecutionAdapterConfigured();

    const capabilities =
      getBrokerExecutionAdapterCapabilities();

    const verification =
      evaluateBrokerConnectionVerification(
        capabilities,
      );

    const policy =
      getBrokerConnectionVerificationPolicy();

    const adapterStatus =
      resolveAdapterStatus(
        adapterConfigured,
        capabilities.available,
        capabilities.executionEnabled,
      );

    return jsonResponse({
      success:
        true,

      code:
        "C167_5_32_BROKER_CONNECTION_VERIFICATION_DIAGNOSTICS",

      stage:
        "C167.5.32",

      generatedAt:
        new Date().toISOString(),

      adapter: {
        id:
          adapterId,

        configured:
          adapterConfigured,

        available:
          capabilities.available,

        status:
          adapterStatus,
      },

      capabilities,

      verification: {
        success:
          verification.success,

        broker:
          verification.broker,

        readiness:
          verification.readiness,

        gate:
          verification.gate,
      },

      policy,

      diagnostics: {
        adapterConfigured,

        adapterAvailable:
          capabilities.available,

        connectionVerified:
          verification.broker
            .connectionVerified,

        credentialsVerified:
          verification.broker
            .credentialsVerified,

        accountVerified:
          verification.broker
            .accountVerified,

        executionEnabled:
          verification.broker
            .executionEnabled,

        verificationComplete:
          verification.readiness
            .verificationComplete,

        decision:
          verification.broker
            .decision,

        status:
          verification.broker
            .status,

        failureCodes:
          verification.broker
            .failureCodes,

        reason:
          verification.broker
            .reason,
      },

      controlChain: {
        position:
          "Research -> Technical Provider -> Commercial Authorization -> Pre-Trade Risk -> Persistent Human Review -> Broker Connection Verification -> Broker Adapter -> Execution Review",

        brokerConnectionVerificationRequired:
          true,

        brokerConnectionVerificationIndependent:
          true,

        brokerAdapterExecutionStillRequired:
          true,

        humanApprovalStillRequired:
          true,

        preTradeRiskStillRequired:
          true,
      },

      safetyBoundary: {
        founderOnly:
          true,

        diagnosticOnly:
          true,

        brokerApiCalled:
          false,

        credentialsSubmitted:
          false,

        accountAccessed:
          false,

        orderPlaced:
          false,

        orderCancelled:
          false,

        executionRequested:
          false,

        automaticVerification:
          false,

        automaticExecution:
          false,

        callerCanSelfVerify:
          false,

        callerCanOverride:
          false,

        callerCanBypass:
          false,

        liveExecutionEnabled:
          false,
      },

      nextRequirements: [
        "Broker connection provider must be explicitly configured.",
        "Broker connection must be independently verified.",
        "Broker credentials must be independently verified.",
        "Broker account must be independently verified.",
        "Pre-trade risk must pass.",
        "Persistent human review must be explicitly accepted.",
        "Broker execution adapter must pass its own readiness checks.",
        "Live execution remains disabled until a separately authorized execution boundary exists.",
      ],
    });
  } catch (error) {
    return jsonResponse(
      {
        success:
          false,

        code:
          "C167_5_32_BROKER_CONNECTION_VERIFICATION_ERROR",

        stage:
          "C167.5.32",

        error:
          error instanceof Error
            ? error.message
            : "Broker connection verification diagnostics failed.",

        safetyBoundary: {
          diagnosticOnly:
            true,

          brokerApiCalled:
            false,

          orderPlaced:
            false,

          automaticExecution:
            false,

          liveExecutionEnabled:
            false,
        },
      },
      500,
    );
  }
}
