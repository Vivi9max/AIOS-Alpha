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

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

type CapabilityRecord = {
  market: string;
  technicalSupport: boolean;
  accountEntitled:
    | "verified"
    | "denied"
    | "unknown";
  realtimeVerified: boolean;
  commercialStatus:
    | "unknown"
    | "not_verified"
    | "eligible"
    | "restricted";
  probeSymbol: string;
  failureCode:
    | string
    | null;
  reason:
    | string
    | null;
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

function normalizeCapability(
  value: unknown,
): CapabilityRecord {
  const record =
    value !== null &&
    typeof value === "object"
      ? (value as Record<
          string,
          unknown
        >)
      : {};

  const accountEntitled =
    record.accountEntitled ===
      "verified" ||
    record.accountEntitled ===
      "denied"
      ? record.accountEntitled
      : "unknown";

  const commercialStatus =
    record.commercialStatus ===
      "eligible" ||
    record.commercialStatus ===
      "restricted" ||
    record.commercialStatus ===
      "not_verified"
      ? record.commercialStatus
      : "unknown";

  return {
    market:
      typeof record.market ===
      "string"
        ? record.market
        : "unknown",

    technicalSupport:
      record.technicalSupport ===
      true,

    accountEntitled,

    realtimeVerified:
      record.realtimeVerified ===
      true,

    commercialStatus,

    probeSymbol:
      typeof record.probeSymbol ===
      "string"
        ? record.probeSymbol
        : "",

    failureCode:
      typeof record.failureCode ===
      "string"
        ? record.failureCode
        : null,

    reason:
      typeof record.reason ===
      "string"
        ? record.reason
        : null,
  };
}

function buildCapabilitySummary(
  capabilities: CapabilityRecord[],
) {
  return {
    total:
      capabilities.length,

    technicallySupported:
      capabilities.filter(
        (item) =>
          item.technicalSupport,
      ).length,

    entitled:
      capabilities.filter(
        (item) =>
          item.accountEntitled ===
          "verified",
      ).length,

    realtimeVerified:
      capabilities.filter(
        (item) =>
          item.realtimeVerified,
      ).length,

    commerciallyEligible:
      capabilities.filter(
        (item) =>
          item.commercialStatus ===
          "eligible",
      ).length,

    commerciallyRestricted:
      capabilities.filter(
        (item) =>
          item.commercialStatus ===
          "restricted",
      ).length,

    commercialNotVerified:
      capabilities.filter(
        (item) =>
          item.commercialStatus ===
          "not_verified",
      ).length,

    unknown:
      capabilities.filter(
        (item) =>
          item.commercialStatus ===
          "unknown",
      ).length,
  };
}

function buildCommercialBoundary(
  capabilities: CapabilityRecord[],
) {
  const hasTechnicalSupport =
    capabilities.some(
      (item) =>
        item.technicalSupport,
    );

  const hasEntitlement =
    capabilities.some(
      (item) =>
        item.accountEntitled ===
        "verified",
    );

  const hasRealtimeVerification =
    capabilities.some(
      (item) =>
        item.realtimeVerified,
    );

  const commerciallyEligible =
    capabilities.some(
      (item) =>
        item.commercialStatus ===
        "eligible",
    );

  return {
    technicalSupport:
      hasTechnicalSupport,

    accountEntitlement:
      hasEntitlement,

    realtimeVerification:
      hasRealtimeVerification,

    commercialAuthorization:
      commerciallyEligible,

    commercialAuthorizationVerified:
      commerciallyEligible,

    rule:
      "Commercial authorization is never inferred from technical support, account entitlement, or realtime verification.",
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

  const startedAt =
    Date.now();

  try {
    const providerSelection =
      getMarketDataProviderSelection();

    const providerIds =
      getMarketDataProviderIds();

    const provider =
      getPrimaryMarketDataProvider();

    const status =
      await getPrimaryMarketProviderStatus();

    const rawCapabilities =
      await getPrimaryMarketProviderCapabilities();

    const capabilities =
      rawCapabilities.map(
        normalizeCapability,
      );

    const summary =
      buildCapabilitySummary(
        capabilities,
      );

    const commercialBoundary =
      buildCommercialBoundary(
        capabilities,
      );

    return NextResponse.json(
      {
        success: true,

        code:
          "C167_5_6_MARKET_PROVIDER_DIAGNOSTICS",

        stage:
          "C167.5.6",

        timestamp:
          new Date().toISOString(),

        latencyMs:
          Date.now() -
          startedAt,

        providerRegistry: {
          providerIds,

          requestedProvider:
            providerSelection.requestedProvider,

          activeProvider:
            providerSelection.activeProvider,

          configuredProvider:
            provider?.id ??
            null,

          configured:
            provider !== null,
        },

        provider: status
          ? {
              id:
                status.provider,

              configured:
                status.configured,

              available:
                status.available,

              supportsQuote:
                status.supportsQuote,

              supportsRealtime:
                status.supportsRealtime ??
                false,

              supportsHistorical:
                status.supportsHistorical,

              supportsFundamentals:
                status.supportsFundamentals,

              supportsMarkets:
                status.supportsMarkets,

              entitledMarkets:
                status.entitledMarkets ??
                [],

              realtimeVerifiedMarkets:
                status.realtimeVerifiedMarkets ??
                [],

              commercialStatus:
                status.commercialStatus ??
                "unknown",

              commercialStatusVerifiedAt:
                status.commercialStatusVerifiedAt ??
                null,

              commercialStatusReason:
                status.commercialStatusReason ??
                null,

              reason:
                status.reason ??
                null,
            }
          : null,

        capabilities,

        summary,

        commercialBoundary,

        safety: {
          realtimeDataRequiresVerification:
            true,

          webEvidenceIsNotRealtime:
            true,

          commercialAuthorizationRequiresExplicitVerification:
            true,

          tradingExecution:
            false,

          automatedExecution:
            false,

          plannerDispatch:
            false,
        },
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store",
          "Content-Type":
            "application/json; charset=utf-8",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        code:
          "C167_5_6_MARKET_PROVIDER_DIAGNOSTICS_ERROR",

        stage:
          "C167.5.6",

        error:
          error instanceof Error
            ? error.message
            : "Market provider diagnostics failed.",

        latencyMs:
          Date.now() -
          startedAt,
      },
      {
        status: 500,

        headers: {
          "Cache-Control":
            "no-store",
          "Content-Type":
            "application/json; charset=utf-8",
        },
      },
    );
  }
}
