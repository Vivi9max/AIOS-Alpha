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
  getMarketDataProviderIds,
  getMarketDataProviderSelection,
  getPrimaryMarketDataProvider,
  getPrimaryMarketProviderCapabilities,
  getPrimaryMarketProviderStatus,
} from "@/lib/runtime/market/market-data-provider";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

type ReadinessLevel =
  | "ready"
  | "technical-only"
  | "not-configured"
  | "restricted"
  | "unknown";

type ReadinessDecision = {
  level: ReadinessLevel;
  canUseForResearch: boolean;
  canClaimRealtime: boolean;
  canUseForCommercialProduct: boolean;
  reason: string;
};

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
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function normalizeProviderId(
  value: unknown,
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLowerCase();

  return (
    normalized || null
  );
}

function asRecord(
  value: unknown,
): Record<
  string,
  unknown
> {
  if (
    value !== null &&
    typeof value ===
      "object"
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return {};
}

function evaluateReadiness(
  status: Record<
    string,
    unknown
  >,
  capabilities: Record<
    string,
    unknown
  >,
  commercialGate: ReturnType<
    typeof evaluateMarketProviderCommercialGate
  > | null,
): ReadinessDecision {
  const configured =
    status.configured ===
    true;

  const available =
    status.available ===
    true;

  const supportsRealtime =
    status.supportsRealtime ===
    true;

  const marketCapabilities =
    Array.isArray(
      status.marketCapabilities,
    )
      ? status.marketCapabilities
      : Array.isArray(
            capabilities.marketCapabilities,
          )
        ? capabilities.marketCapabilities
        : [];

  if (
    !configured ||
    !available
  ) {
    return {
      level:
        "not-configured",
      canUseForResearch:
        false,
      canClaimRealtime:
        false,
      canUseForCommercialProduct:
        false,
      reason:
        "The selected market provider is not configured and available for runtime use.",
    };
  }

  if (
    commercialGate?.decision ===
    "restricted"
  ) {
    return {
      level:
        "restricted",
      canUseForResearch:
        true,
      canClaimRealtime:
        supportsRealtime,
      canUseForCommercialProduct:
        false,
      reason:
        commercialGate.reason,
    };
  }

  if (
    commercialGate?.gateOpen ===
    true
  ) {
    return {
      level:
        "ready",
      canUseForResearch:
        true,
      canClaimRealtime:
        supportsRealtime,
      canUseForCommercialProduct:
        true,
      reason:
        "Provider technical capability is available and the independent commercial authorization gate is explicitly open.",
    };
  }

  if (
    marketCapabilities.length >
      0 ||
    supportsRealtime
  ) {
    return {
      level:
        "technical-only",
      canUseForResearch:
        true,
      canClaimRealtime:
        supportsRealtime,
      canUseForCommercialProduct:
        false,
      reason:
        commercialGate
          ? commercialGate.reason
          : "Provider technical capability is available, but commercial authorization has not been verified.",
    };
  }

  return {
    level:
      "unknown",
    canUseForResearch:
      available,
    canClaimRealtime:
      false,
    canUseForCommercialProduct:
      false,
    reason:
      commercialGate?.reason ??
      "Provider status is available, but commercial and realtime readiness cannot be established from the current provider contract.",
  };
}

function buildUnknownReadiness(
  requestedProviderKnown: boolean,
): ReadinessDecision {
  if (
    requestedProviderKnown
  ) {
    return {
      level:
        "not-configured",
      canUseForResearch:
        false,
      canClaimRealtime:
        false,
      canUseForCommercialProduct:
        false,
      reason:
        "The requested provider is registered but is not the active configured provider.",
    };
  }

  return {
    level:
      "unknown",
    canUseForResearch:
      false,
    canClaimRealtime:
      false,
    canUseForCommercialProduct:
      false,
    reason:
      "The requested provider is not registered in the current AIOS provider registry.",
  };
}

export async function GET(
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
    const requestedProvider =
      normalizeProviderId(
        request.nextUrl.searchParams.get(
          "provider",
        ),
      );

    const providerIds =
      getMarketDataProviderIds();

    const selection =
      getMarketDataProviderSelection();

    const primary =
      getPrimaryMarketDataProvider();

    const [
      primaryStatus,
      primaryCapabilities,
    ] =
      await Promise.all([
        getPrimaryMarketProviderStatus(),
        getPrimaryMarketProviderCapabilities(),
      ]);

    const primaryStatusRecord =
      asRecord(
        primaryStatus,
      );

    const primaryCapabilitiesRecord =
      asRecord(
        {
          marketCapabilities:
            primaryCapabilities,
        },
      );

    const activeProvider =
      normalizeProviderId(
        selection.activeProvider,
      );

    const registryRequestedProvider =
      normalizeProviderId(
        selection.requestedProvider,
      );

    const selectedProviderId =
      requestedProvider ??
      activeProvider;

    const requestedProviderKnown =
      requestedProvider ===
      null
        ? true
        : providerIds.includes(
            requestedProvider,
          );

    const selectedIsPrimary =
      Boolean(
        selectedProviderId &&
        primary?.id &&
        normalizeProviderId(
          primary.id,
        ) ===
          selectedProviderId,
      );

    const selectedStatus =
      selectedIsPrimary
        ? primaryStatusRecord
        : {};

    const selectedCapabilities =
      selectedIsPrimary
        ? primaryCapabilitiesRecord
        : {};

    const commercialGate =
      selectedIsPrimary &&
      selectedProviderId
        ? evaluateMarketProviderCommercialGate(
            selectedProviderId,
          )
        : null;

    const selectedReadiness =
      selectedIsPrimary
        ? evaluateReadiness(
            selectedStatus,
            selectedCapabilities,
            commercialGate,
          )
        : buildUnknownReadiness(
            requestedProviderKnown,
          );

    const commercialStatus =
      commercialGate?.status ??
      "unknown";

    const commercialDecision =
      commercialGate?.decision ??
      "unknown";

    const commercialAuthorized =
      commercialGate?.authorized ===
      true;

    const commercialGateOpen =
      commercialGate?.gateOpen ===
      true;

    const commercialStatusVerifiedAt =
      commercialGate?.verifiedAt ??
      null;

    const commercialStatusReason =
      commercialGate?.reason ??
      "Commercial authorization is not inferred from technical access, account entitlement, or realtime verification.";

    const supportsRealtime =
      selectedStatus.supportsRealtime ===
      true;

    const configured =
      selectedStatus.configured ===
      true;

    const available =
      selectedStatus.available ===
      true;

    const recommendedAction =
      selectedReadiness.level ===
      "ready"
        ? "Provider is commercially authorized by the independent gate and can be considered for commercial product integration, subject to provider contract and deployment configuration."
        : selectedReadiness.level ===
            "technical-only"
          ? "Keep the provider available for technical research validation, but do not expose it as a commercially authorized production data source."
          : selectedReadiness.level ===
              "restricted"
            ? "Do not use this provider as the commercial production data source until the restriction is resolved and authorization is explicitly re-verified."
            : selectedReadiness.level ===
                "not-configured"
              ? "Verify provider configuration and runtime availability before production adoption."
              : "Verify provider configuration, account entitlement, realtime capability and explicit commercial authorization before production adoption.";

    return NextResponse.json(
      {
        success:
          true,

        code:
          "C167_5_12_MARKET_PROVIDER_READINESS",

        stage:
          "C167.5.12",

        requestedProvider,

        providerRegistry: {
          providerIds,
          count:
            providerIds.length,
        },

        selection: {
          requestedProvider:
            registryRequestedProvider,

          activeProvider,

          availableProviders:
            selection.availableProviders,

          effectiveProvider:
            selectedProviderId,
        },

        primaryProvider:
          primary
            ? {
                id:
                  primary.id,

                displayName:
                  primary.displayName,
              }
            : null,

        providerStatus:
          selectedStatus,

        capabilities:
          selectedCapabilities,

        readiness:
          selectedReadiness,

        commercialAuthorization: {
          providerId:
            commercialGate?.providerId ??
            selectedProviderId,

          status:
            commercialStatus,

          decision:
            commercialDecision,

          authorized:
            commercialAuthorized,

          gateOpen:
            commercialGateOpen,

          source:
            commercialGate?.source ??
            "unknown",

          verifiedAt:
            commercialStatusVerifiedAt,

          verifiedBy:
            commercialGate?.verifiedBy ??
            null,

          contractReference:
            commercialGate?.contractReference ??
            null,

          reason:
            commercialStatusReason,

          automaticApproval:
            false,
        },

        commercialBoundary: {
          technicalSupportIsNotCommercialAuthorization:
            true,

          accountEntitlementIsNotCommercialAuthorization:
            true,

          realtimeVerificationIsNotCommercialAuthorization:
            true,

          commercialAuthorizationRequired:
            true,

          independentCommercialGate:
            true,

          commercialAuthorizationVerified:
            commercialAuthorized,

          commercialGateOpen,

          automaticCommercialApproval:
            false,

          automaticProviderSwitchForCommercialAuthorization:
            false,
        },

        controlPolicy: {
          providerSelection:
            "registry-and-environment-controlled",

          commercialAuthorization:
            "independent-gate-controlled",

          founderCanInspect:
            true,

          founderCanVerify:
            true,

          founderCanOverrideCommercialAuthorization:
            false,

          runtimeCanInventCommercialAuthorization:
            false,

          publicRuntimeCanExposeUnverifiedCommercialClaims:
            false,
        },

        runtimeState: {
          configured,

          available,

          supportsRealtime,

          researchAllowed:
            selectedReadiness.canUseForResearch,

          realtimeClaimAllowed:
            selectedReadiness.canClaimRealtime,

          commercialProductAllowed:
            selectedReadiness.canUseForCommercialProduct,

          commercialGateOpen,
        },

        recommendedAction,

        safety: {
          tradingExecution:
            false,

          brokerConnection:
            false,

          orderPlacement:
            false,

          plannerDispatch:
            false,

          automatedCommercialApproval:
            false,

          providerReadinessDoesNotEnableTrading:
            true,

          commercialGateDoesNotEnableTrading:
            true,
        },

        generatedAt:
          new Date().toISOString(),
      },
      {
        status:
          200,

        headers: {
          "Cache-Control":
            "no-store",
        },
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
          "C167_5_12_MARKET_PROVIDER_READINESS_ERROR",

        stage:
          "C167.5.12",

        error:
          error instanceof Error
            ? error.message
            : "Market provider readiness evaluation failed.",

        safety: {
          tradingExecution:
            false,

          brokerConnection:
            false,

          orderPlacement:
            false,

          plannerDispatch:
            false,

          automatedCommercialApproval:
            false,

          providerReadinessDoesNotEnableTrading:
            true,

          commercialGateDoesNotEnableTrading:
            true,
        },
      },
      {
        status:
          500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}
