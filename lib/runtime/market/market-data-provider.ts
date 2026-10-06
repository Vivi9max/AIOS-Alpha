import {
  isAllTickConfigured,
  probeAllTickCapabilities,
  retrieveStructuredMarketData,
} from "./structured-provider";

import type {
  AllTickCapabilityProbeResult,
} from "./structured-provider";

import type {
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
  result: MarketStructuredProviderResult | null;
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
