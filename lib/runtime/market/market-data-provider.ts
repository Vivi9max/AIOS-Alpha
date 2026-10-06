import {
  isAllTickConfigured,
  probeAllTickCapabilities,
  retrieveStructuredMarketData,
} from "./structured-provider";

import type {
  AllTickCapabilityProbeResult,
} from "./structured-provider";

import type {
  MarketDataProviderStatus,
  MarketInstrument,
  MarketProviderCapability,
  MarketProviderCommercialStatus,
  MarketRegion,
  MarketSnapshot,
} from "./market-types";

export interface MarketStructuredProviderResult {
  success: boolean;
  snapshot: MarketSnapshot;
  realtimeVerified: boolean;
  historicalVerified: boolean;
  sourceCount: number;
  error?: string;
}

export interface MarketDataProviderAdapter {
  readonly id: string;
  readonly displayName: string;

  isConfigured(): boolean;

  getSupportedMarkets(): MarketRegion[];

  retrieve(
    instrument: MarketInstrument,
  ): Promise<MarketStructuredProviderResult>;

  probeCapabilities?(): Promise<unknown>;
}

function env(name: string): string {
  return (
    process.env[name] ??
    ""
  ).trim();
}

function normalizeProviderId(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function getRequestedProviderId(): string | null {
  const value =
    normalizeProviderId(
      env("MARKET_DATA_PROVIDER"),
    );

  if (!value) {
    return null;
  }

  return value;
}

function commercialStatusFromCapability(
  capability:
    | MarketProviderCapability
    | null
    | undefined,
): MarketProviderCommercialStatus {
  if (!capability) {
    return "unknown";
  }

  if (
    !capability.technicalSupport ||
    capability.accountEntitled ===
      "denied"
  ) {
    return "restricted";
  }

  if (
    capability.accountEntitled ===
      "verified" &&
    capability.realtimeVerified
  ) {
    return "not_verified";
  }

  return "unknown";
}

function normalizeCapability(
  market: MarketRegion,
  capability: unknown,
): MarketProviderCapability {
  const value =
    capability !== null &&
    typeof capability === "object"
      ? (capability as Record<
          string,
          unknown
        >)
      : {};

  const accountEntitled =
    value.accountEntitled ===
      "verified" ||
    value.accountEntitled ===
      "denied"
      ? value.accountEntitled
      : "unknown";

  const normalized: MarketProviderCapability = {
    market,
    technicalSupport:
      value.technicalSupport ===
      true,
    accountEntitled,
    realtimeVerified:
      value.realtimeVerified ===
      true,
    commercialStatus:
      "unknown",
    probeSymbol:
      typeof value.probeSymbol ===
      "string"
        ? value.probeSymbol
        : "",
    failureCode:
      typeof value.failureCode ===
      "string"
        ? value.failureCode
        : null,
    reason:
      typeof value.reason ===
      "string"
        ? value.reason
        : null,
  };

  normalized.commercialStatus =
    commercialStatusFromCapability(
      normalized,
    );

  return normalized;
}

class AllTickMarketDataProvider
  implements MarketDataProviderAdapter
{
  readonly id =
    "alltick";

  readonly displayName =
    "AllTick";

  isConfigured(): boolean {
    return isAllTickConfigured();
  }

  getSupportedMarkets(): MarketRegion[] {
    return [
      "us",
      "hk",
      "cn",
    ];
  }

  async retrieve(
    instrument: MarketInstrument,
  ): Promise<MarketStructuredProviderResult> {
    const result =
      await retrieveStructuredMarketData(
        instrument,
      );

    return {
      success:
        result.success,
      snapshot:
        result.snapshot,
      realtimeVerified:
        result.realtimeVerified,
      historicalVerified:
        result.historicalVerified,
      sourceCount:
        result.sourceCount,
      error:
        result.error,
    };
  }

  async probeCapabilities(): Promise<AllTickCapabilityProbeResult> {
    return probeAllTickCapabilities();
  }
}

const allTickProvider =
  new AllTickMarketDataProvider();

const providers: MarketDataProviderAdapter[] =
  [
    allTickProvider,
  ];

function getConfiguredProvider(
  providerList: MarketDataProviderAdapter[],
): MarketDataProviderAdapter | null {
  const requestedProvider =
    getRequestedProviderId();

  if (requestedProvider) {
    const requested =
      providerList.find(
        (provider) =>
          normalizeProviderId(
            provider.id,
          ) ===
          requestedProvider,
      );

    if (
      requested &&
      requested.isConfigured()
    ) {
      return requested;
    }

    return null;
  }

  return (
    providerList.find(
      (provider) =>
        provider.isConfigured(),
    ) ?? null
  );
}

export function getMarketDataProviders(): MarketDataProviderAdapter[] {
  return [
    ...providers,
  ];
}

export function getPrimaryMarketDataProvider(): MarketDataProviderAdapter | null {
  return getConfiguredProvider(
    providers,
  );
}

export function getMarketDataProvider(
  providerId: string,
): MarketDataProviderAdapter | null {
  const normalizedId =
    normalizeProviderId(
      providerId,
    );

  return (
    providers.find(
      (provider) =>
        normalizeProviderId(
          provider.id,
        ) ===
        normalizedId,
    ) ?? null
  );
}

export function getMarketDataProviderIds(): string[] {
  return providers.map(
    (provider) =>
      provider.id,
  );
}

export function getMarketDataTechnicalMarkets(): MarketRegion[] {
  const markets =
    new Set<MarketRegion>();

  for (const provider of providers) {
    for (const market of provider.getSupportedMarkets()) {
      markets.add(market);
    }
  }

  return Array.from(
    markets,
  );
}

export function isAnyStructuredMarketProviderConfigured(): boolean {
  return providers.some(
    (provider) =>
      provider.isConfigured(),
  );
}

export function getMarketDataProviderSelection(): {
  requestedProvider: string | null;
  activeProvider: string | null;
  availableProviders: string[];
} {
  const requestedProvider =
    getRequestedProviderId();

  const activeProvider =
    getPrimaryMarketDataProvider();

  return {
    requestedProvider,
    activeProvider:
      activeProvider?.id ??
      null,
    availableProviders:
      getMarketDataProviderIds(),
  };
}

export async function retrievePrimaryStructuredMarketData(
  instrument: MarketInstrument,
): Promise<{
  provider: MarketDataProviderAdapter | null;
  result:
    | MarketStructuredProviderResult
    | null;
}> {
  const provider =
    getPrimaryMarketDataProvider();

  if (!provider) {
    return {
      provider: null,
      result: null,
    };
  }

  try {
    const result =
      await provider.retrieve(
        instrument,
      );

    return {
      provider,
      result,
    };
  } catch (error) {
    return {
      provider,
      result: {
        success: false,
        snapshot: {
          dataQuality:
            "insufficient",
          liveQuoteAvailable:
            false,
        },
        realtimeVerified:
          false,
        historicalVerified:
          false,
        sourceCount: 0,
        error:
          error instanceof Error
            ? error.message
            : "Structured market provider failed.",
      },
    };
  }
}

export async function probePrimaryStructuredMarketProvider(): Promise<unknown | null> {
  const provider =
    getPrimaryMarketDataProvider();

  if (
    !provider ||
    !provider.probeCapabilities
  ) {
    return null;
  }

  return provider.probeCapabilities();
}

export async function getPrimaryMarketProviderCapabilities(): Promise<
  MarketProviderCapability[]
> {
  const provider =
    getPrimaryMarketDataProvider();

  if (!provider) {
    return [];
  }

  if (
    provider.id ===
    "alltick"
  ) {
    const probe =
      await probeAllTickCapabilities();

    return (
      Object.entries(
        probe.marketCapabilities,
      )
        .map(
          ([
            market,
            capability,
          ]) =>
            normalizeCapability(
              market as MarketRegion,
              capability,
            ),
        )
        .sort(
          (a, b) =>
            a.market.localeCompare(
              b.market,
            ),
        )
    );
  }

  return provider
    .getSupportedMarkets()
    .map(
      (market) => ({
        market,
        technicalSupport:
          true,
        accountEntitled:
          "unknown",
        realtimeVerified:
          false,
        commercialStatus:
          "unknown",
        probeSymbol:
          "",
        failureCode:
          null,
        reason:
          "Provider capability has not been verified.",
      }),
    );
}

export async function getPrimaryMarketProviderStatus(): Promise<MarketDataProviderStatus | null> {
  const provider =
    getPrimaryMarketDataProvider();

  if (!provider) {
    return null;
  }

  const capabilities =
    await getPrimaryMarketProviderCapabilities();

  const entitledMarkets =
    capabilities
      .filter(
        (capability) =>
          capability.accountEntitled ===
          "verified",
      )
      .map(
        (capability) =>
          capability.market,
      );

  const realtimeVerifiedMarkets =
    capabilities
      .filter(
        (capability) =>
          capability.realtimeVerified,
      )
      .map(
        (capability) =>
          capability.market,
      );

  const commercialStatuses =
    capabilities.map(
      (capability) =>
        capability.commercialStatus,
    );

  const commercialStatus =
    commercialStatuses.includes(
      "eligible",
    )
      ? "eligible"
      : commercialStatuses.includes(
            "restricted",
          )
        ? "restricted"
        : commercialStatuses.includes(
              "not_verified",
            )
          ? "not_verified"
          : "unknown";

  const marketCapabilities =
    capabilities.reduce(
      (
        result,
        capability,
      ) => {
        result[
          capability.market
        ] = {
          technicalSupport:
            capability.technicalSupport,
          accountEntitled:
            capability.accountEntitled,
          realtimeVerified:
            capability.realtimeVerified,
          probeSymbol:
            capability.probeSymbol,
          failureCode:
            capability.failureCode,
          reason:
            capability.reason,
        };

        return result;
      },
      {} as Partial<
        Record<
          MarketRegion,
          {
            technicalSupport: boolean;
            accountEntitled:
              | "verified"
              | "denied"
              | "unknown";
            realtimeVerified: boolean;
            probeSymbol: string;
            failureCode?:
              | string
              | null;
            reason?:
              | string
              | null;
          }
        >
      >,
    );

  return {
    provider:
      provider.id,
    configured:
      provider.isConfigured(),
    available:
      true,
    supportsQuote:
      true,
    supportsRealtime:
      true,
    supportsHistorical:
      true,
    supportsFundamentals:
      false,
    supportsMarkets:
      provider.getSupportedMarkets(),
    entitledMarkets,
    realtimeVerifiedMarkets,
    commercialStatus,
    commercialStatusVerifiedAt:
      null,
    commercialStatusReason:
      "Commercial authorization is not inferred from technical access, account entitlement, or realtime verification.",
    marketCapabilities,
    reason:
      "Provider selection, technical capability, account entitlement, realtime verification, and commercial authorization are reported independently.",
  };
}
