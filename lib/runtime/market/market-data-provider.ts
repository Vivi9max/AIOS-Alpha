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

export type MarketProviderCommercialStatus =
  | "unknown"
  | "not_verified"
  | "eligible"
  | "restricted";

export interface MarketProviderCapability {
  market: MarketRegion;
  technicalSupport: boolean;
  accountEntitled:
    | "verified"
    | "denied"
    | "unknown";
  realtimeVerified: boolean;
  commercialStatus:
    MarketProviderCommercialStatus;
  probeSymbol: string;
  failureCode?: string | null;
  reason?: string | null;
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

export function getMarketDataProviders(): MarketDataProviderAdapter[] {
  return [
    ...providers,
  ];
}

export function getPrimaryMarketDataProvider(): MarketDataProviderAdapter | null {
  const configured =
    providers.find(
      (provider) =>
        provider.isConfigured(),
    );

  return configured ?? null;
}

export function getMarketDataProvider(
  providerId: string,
): MarketDataProviderAdapter | null {
  return (
    providers.find(
      (provider) =>
        provider.id ===
        providerId,
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
    marketCapabilities,
    reason:
      "Provider capability, account entitlement, and realtime verification are reported independently. Commercial authorization is not inferred from technical access or account entitlement.",
  };
}
