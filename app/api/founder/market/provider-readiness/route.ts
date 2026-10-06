import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  getMarketDataProviderIds,
  getMarketDataProviderSelection,
  getPrimaryMarketDataProvider,
  getPrimaryMarketProviderCapabilities,
  getPrimaryMarketProviderStatus,
} from "@/lib/runtime/market/market-data-provider";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

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
      code: "FOUNDER_AUTH_REQUIRED",
      error: "Founder authentication required.",
    },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function normalizeProviderId(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase();

  return normalized || null;
}

function asRecord(
  value: unknown,
): Record<string, unknown> {
  if (
    value !== null &&
    typeof value === "object"
  ) {
    return value as Record<string, unknown>;
  }

  return {};
}

function evaluateReadiness(
  status: Record<string, unknown>,
  capabilities: Record<string, unknown>,
): ReadinessDecision {
  const configured =
    status.configured === true;

  const available =
    status.available === true;

  const supportsRealtime =
    status.supportsRealtime === true;

  const commercialStatus =
    typeof status.commercialStatus === "string"
      ? status.commercialStatus
      : "unknown";

  const marketCapabilities =
    Array.isArray(
      capabilities.marketCapabilities,
    )
      ? capabilities.marketCapabilities
      : [];

  if (!configured || !available) {
    return {
      level: "not-configured",
      canUseForResearch: false,
      canClaimRealtime: false,
      canUseForCommercialProduct: false,
      reason:
        "The selected market provider is not configured and available for runtime use.",
    };
  }

  if (
    commercialStatus ===
    "restricted"
  ) {
    return {
      level: "restricted",
      canUseForResearch: true,
      canClaimRealtime:
        supportsRealtime,
      canUseForCommercialProduct: false,
      reason:
        "Technical market access exists, but the provider is explicitly marked as commercially restricted.",
    };
  }

  if (
    commercialStatus ===
    "eligible"
  ) {
    return {
      level: "ready",
      canUseForResearch: true,
      canClaimRealtime:
        supportsRealtime,
      canUseForCommercialProduct: true,
      reason:
        "Provider technical capability and commercial eligibility are both explicitly available.",
    };
  }

  if (
    marketCapabilities.length > 0 ||
    supportsRealtime
  ) {
    return {
      level: "technical-only",
      canUseForResearch: true,
      canClaimRealtime:
        supportsRealtime,
      canUseForCommercialProduct: false,
      reason:
        "Provider technical capability is available, but commercial authorization has not been verified.",
    };
  }

  return {
    level: "unknown",
    canUseForResearch: available,
    canClaimRealtime: false,
    canUseForCommercialProduct: false,
    reason:
      "Provider status is available, but commercial and realtime readiness cannot be established from the current provider contract.",
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

    const primaryStatus =
      getPrimaryMarketProviderStatus();

    const primaryCapabilities =
      getPrimaryMarketProviderCapabilities();

    const primaryStatusRecord =
      asRecord(
        primaryStatus,
      );

    const primaryCapabilitiesRecord =
      asRecord(
        primaryCapabilities,
      );

    const primaryReadiness =
      evaluateReadiness(
        primaryStatusRecord,
        primaryCapabilitiesRecord,
      );

    const requestedProviderKnown =
      requestedProvider === null
        ? true
        : providerIds.includes(
            requestedProvider,
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

    const selectedProvider =
      selectedProviderId ===
        primary?.id
        ? primary
        : null;

    const selectedStatus =
      selectedProviderId ===
        primary?.id
        ? primaryStatusRecord
        : {};

    const selectedCapabilities =
      selectedProviderId ===
        primary?.id
        ? primaryCapabilitiesRecord
        : {};

    const selectedReadiness =
      selectedProviderId ===
          primary?.id
        ? primaryReadiness
        : {
            level:
              requestedProviderKnown
                ? "not-configured"
                : "unknown",
            canUseForResearch: false,
            canClaimRealtime: false,
            canUseForCommercialProduct: false,
            reason:
              requestedProviderKnown
                ? "The requested provider is registered but is not the active configured provider."
                : "The requested provider is not registered in the current AIOS provider registry.",
          };

    return NextResponse.json(
      {
        success: true,

        code:
          "C167_5_8_MARKET_PROVIDER_READINESS",

        stage: "C167.5.8",

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

        primaryProvider: primary
          ? {
              id: primary.id,
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

        commercialBoundary: {
          technicalSupportIsNotCommercialAuthorization:
            true,

          accountEntitlementIsNotCommercialAuthorization:
            true,

          realtimeVerificationIsNotCommercialAuthorization:
            true,

          commercialAuthorizationRequired:
            true,

          automaticCommercialApproval:
            false,

          automaticProviderSwitchForCommercialAuthorization:
            false,
        },

        controlPolicy: {
          providerSelection:
            "registry-and-environment-controlled",

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

        recommendedAction:
          selectedReadiness.level ===
          "ready"
            ? "Provider is eligible for commercial product integration subject to the provider contract and deployment configuration."
            : selectedReadiness.level ===
                "technical-only"
              ? "Keep the provider available for technical research validation, but do not claim commercial authorization."
              : selectedReadiness.level ===
                  "restricted"
                ? "Do not use this provider as the commercial production data source until restrictions are resolved."
                : "Verify provider configuration, entitlement, realtime capability and commercial authorization before production adoption.",

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
        },

        generatedAt:
          new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        code:
          "C167_5_8_MARKET_PROVIDER_READINESS_ERROR",

        stage: "C167.5.8",

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
        },
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}
