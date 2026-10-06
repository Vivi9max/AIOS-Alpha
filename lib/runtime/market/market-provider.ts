import {
  retrieveWebEvidence,
} from "@/lib/web-intelligence";

import {
  normalizeMarketEvidence,
} from "./market-normalizer";

import {
  guardMarketPriceIntegrity,
} from "./market-price-integrity";

import {
  getMarketDataTechnicalMarkets,
  getPrimaryMarketDataProvider,
  probePrimaryStructuredMarketProvider,
  retrievePrimaryStructuredMarketData,
} from "./market-data-provider";

import type {
  MarketDataProviderStatus,
  MarketEvidence,
  MarketInstrument,
  MarketRegion,
  MarketSnapshot,
} from "./market-types";

import type {
  AllTickCapabilityProbeResult,
} from "./structured-provider";

function normalizeSymbol(
  symbol: string,
  market: MarketInstrument["market"],
): string {
  const value =
    symbol
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");

  if (market === "hk") {
    return value
      .replace(/^HK:/, "")
      .replace(/\.HK$/, "")
      .replace(/^0+(?=\d)/, "")
      .padStart(4, "0");
  }

  if (market === "cn") {
    return value
      .replace(/^SH:/, "")
      .replace(/^SZ:/, "")
      .replace(/^SS:/, "")
      .replace(/\.(SH|SZ)$/, "");
  }

  return value
    .replace(/^NASDAQ:/, "")
    .replace(/^NYSE:/, "")
    .replace(/^US:/, "")
    .replace(/\.US$/, "");
}

export function detectMarket(
  symbol: string,
  explicitMarket?:
    | MarketInstrument["market"]
    | null,
): MarketInstrument["market"] {
  if (explicitMarket) {
    return explicitMarket;
  }

  const value =
    symbol.trim().toUpperCase();

  if (
    value.startsWith("HK:") ||
    /\.HK$/.test(value) ||
    /^\d{4,5}$/.test(value)
  ) {
    return "hk";
  }

  if (
    value.startsWith("SH:") ||
    value.startsWith("SZ:") ||
    value.startsWith("SS:") ||
    /\.SH$/.test(value) ||
    /\.SZ$/.test(value)
  ) {
    return "cn";
  }

  return "us";
}

function buildEvidence(
  result: Awaited<
    ReturnType<
      typeof retrieveWebEvidence
    >
  >,
): MarketEvidence[] {
  return result.evidence
    .map((item) => ({
      title:
        item.title,
      url:
        item.url,
      hostname:
        item.hostname,
      snippet:
        item.snippets.join(
          " ",
        ),
      retrievedAt:
        item.retrievedAt,
      confidence:
        item.confidence,
    }))
    .slice(0, 12);
}

function emptySnapshot(): MarketSnapshot {
  return {
    price: null,
    previousClose: null,
    changePercent: null,
    open: null,
    high: null,
    low: null,
    volume: null,
    marketCap: null,
    pe: null,
    pb: null,
    eps: null,
    revenue: null,
    revenueGrowth: null,
    afterHoursPrice: null,
    preMarketPrice: null,
    dataQuality:
      "insufficient",
    liveQuoteAvailable:
      false,
    quoteQuality:
      "insufficient",
    historicalQuality:
      "insufficient",
    asOf: null,
    source: null,
    dataset: null,
    bars: [],
  };
}

function createWebProviderStatus(
  reason?: string,
): MarketDataProviderStatus {
  return {
    provider:
      "web-intelligence",
    configured: true,
    available: true,
    supportsQuote: false,
    supportsRealtime: false,
    supportsHistorical: false,
    supportsFundamentals: true,
    supportsMarkets: [],
    reason:
      reason ??
      "Web Intelligence evidence fallback is active; it is not a realtime structured quote provider.",
  };
}

function createStructuredProviderStatus(
  providerId: string,
  providerName: string,
  supportsHistorical: boolean,
  reason: string,
  supportedMarkets: MarketRegion[],
): MarketDataProviderStatus {
  return {
    provider:
      providerId,
    configured: true,
    available: true,
    supportsQuote: true,
    supportsRealtime: true,
    supportsHistorical,
    supportsFundamentals: false,
    supportsMarkets:
      supportedMarkets,
    reason:
      `${providerName} is connected through the AIOS Market Data Provider Boundary. ${reason}`,
  };
}

/**
 * C167.5.2
 *
 * Founder / diagnostic capability probe.
 *
 * The public market request path does not
 * automatically execute this probe.
 */
export async function probeStructuredMarketCapabilities(): Promise<AllTickCapabilityProbeResult | null> {
  const result =
    await probePrimaryStructuredMarketProvider();

  return (
    result as
      | AllTickCapabilityProbeResult
      | null
  );
}

/**
 * Returns the technical market capability list
 * exposed by configured provider adapters.
 *
 * Technical support does not mean account entitlement.
 */
export function getStructuredTechnicalMarkets(): MarketRegion[] {
  return getMarketDataTechnicalMarkets();
}

export function isStructuredRealtimeProviderConfigured(): boolean {
  return (
    getPrimaryMarketDataProvider() !==
    null
  );
}

export async function retrieveMarketData(
  instrument: MarketInstrument,
): Promise<{
  snapshot: MarketSnapshot;
  evidence: MarketEvidence[];
  verified: boolean;
  sourceCount: number;
  independentDomains: number;
  primarySourceFound: boolean;
  structuredDataAvailable: boolean;
  structuredDataVerified: boolean;
  provider: MarketDataProviderStatus;
  error?: string;
}> {
  let structuredError:
    | string
    | undefined;

  let structuredHistoricalSnapshot:
    | MarketSnapshot
    | undefined;

  let structuredProviderId:
    | string
    | undefined;

  let structuredProviderName:
    | string
    | undefined;

  /*
   * =========================================================
   * C167.5.2
   *
   * STRUCTURED PROVIDER BOUNDARY
   *
   * The runtime no longer directly depends on a concrete
   * provider implementation.
   *
   * A provider adapter is selected first.
   * =========================================================
   */
  try {
    const structured =
      await retrievePrimaryStructuredMarketData(
        instrument,
      );

    const provider =
      structured.provider;

    const result =
      structured.result;

    if (provider) {
      structuredProviderId =
        provider.id;

      structuredProviderName =
        provider.displayName;
    }

    if (result) {
      /*
       * STRICT REALTIME PASS
       *
       * Only provider-reported realtime verification
       * may enter the live structured path.
       */
      if (
        result.success &&
        result.realtimeVerified &&
        result.snapshot
          .liveQuoteAvailable
      ) {
        return {
          snapshot:
            result.snapshot,
          evidence: [],
          verified: true,
          sourceCount:
            result.sourceCount,
          independentDomains: 1,
          primarySourceFound: true,
          structuredDataAvailable:
            true,
          structuredDataVerified:
            true,
          provider:
            createStructuredProviderStatus(
              structuredProviderId ??
                "structured-provider",
              structuredProviderName ??
                "Structured Market Provider",
              result.historicalVerified,
              result.historicalVerified
                ? "Realtime quote verification passed; historical data is also available."
                : "Realtime quote verification passed; historical data is unavailable.",
              provider?.getSupportedMarkets() ??
                [],
            ),
        };
      }

      /*
       * Historical structured data remains available
       * as an analytical layer.
       *
       * It is never promoted to liveQuoteAvailable.
       */
      if (
        result.historicalVerified &&
        result.snapshot.bars &&
        result.snapshot.bars.length > 0
      ) {
        structuredHistoricalSnapshot =
          result.snapshot;
      }

      structuredError =
        result.error ??
        (
          result.historicalVerified
            ? "Structured historical data is available, but realtime verification was not available."
            : "Structured realtime verification was not available."
        );
    } else if (!provider) {
      structuredError =
        "No configured structured market data provider is available.";
    }
  } catch (error) {
    structuredError =
      error instanceof Error
        ? error.message
        : "Structured provider failed.";
  }

  /*
   * =========================================================
   * WEB INTELLIGENCE FALLBACK
   * =========================================================
   */
  const marketName =
    instrument.market === "us"
      ? "US stock market"
      : instrument.market === "hk"
        ? "Hong Kong stock market"
        : "China A-share market";

  const query = [
    instrument.normalizedSymbol,
    marketName,
    "company",
    "financial results",
    "valuation",
    "stock price",
  ].join(" ");

  try {
    const webResult =
      await retrieveWebEvidence(
        query,
      );

    const evidence =
      buildEvidence(
        webResult,
      );

    const normalized =
      normalizeMarketEvidence(
        evidence,
      );

    let snapshot =
      normalized.snapshot;

    /*
     * Historical structured bars may still be used
     * as a secondary analytical layer.
     */
    if (
      structuredHistoricalSnapshot?.bars &&
      structuredHistoricalSnapshot
        .bars.length > 0
    ) {
      snapshot = {
        ...snapshot,
        bars:
          structuredHistoricalSnapshot
            .bars,
        historicalQuality:
          "historical",
      };
    }

    const priceIntegrity =
      guardMarketPriceIntegrity(
        snapshot,
        instrument.normalizedSymbol,
        instrument.market,
        evidence,
      );

    snapshot =
      priceIntegrity.snapshot;

    /*
     * =========================================================
     * HARD SAFETY BOUNDARY
     *
     * Web evidence NEVER becomes realtime quote data.
     * =========================================================
     */
    snapshot.dataQuality =
      snapshot.price !== null
        ? "web-evidence"
        : "insufficient";

    snapshot.liveQuoteAvailable =
      false;

    snapshot.quoteQuality =
      "web-evidence";

    if (
      !structuredHistoricalSnapshot?.bars ||
      structuredHistoricalSnapshot
        .bars.length === 0
    ) {
      snapshot.historicalQuality =
        "web-evidence";
    }

    const domains =
      new Set(
        evidence.map((item) =>
          item.hostname
            .toLowerCase()
            .replace(/^www\./, ""),
        ),
      );

    const verified =
      webResult.verification
        ?.verified ?? false;

    const primarySourceFound =
      webResult.verification
        ?.primarySourceFound ?? false;

    let providerReason:
      | string
      | undefined;

    if (
      priceIntegrity.priceRejected
    ) {
      providerReason = [
        "Price integrity guard rejected a ticker-derived value.",
        priceIntegrity.reason,
      ]
        .filter(Boolean)
        .join(" ");
    } else if (
      structuredError
    ) {
      providerReason = [
        structuredProviderName
          ? `${structuredProviderName} structured verification was unavailable.`
          : "Structured market data verification was unavailable.",
        "Web Intelligence fallback used.",
        structuredError,
      ].join(" ");
    }

    return {
      snapshot,
      evidence,
      verified,
      sourceCount:
        webResult.sourceCount,
      independentDomains:
        domains.size,
      primarySourceFound,
      /*
       * Historical structured bars count as
       * structured availability, but not as
       * verified realtime market data.
       */
      structuredDataAvailable:
        Boolean(
          structuredHistoricalSnapshot,
        ),
      structuredDataVerified:
        false,
      provider:
        createWebProviderStatus(
          providerReason,
        ),
      error: [
        webResult.success
          ? priceIntegrity.priceRejected
            ? priceIntegrity.reason
            : undefined
          : webResult.error,
        structuredError,
      ]
        .filter(Boolean)
        .join(" | ") ||
        undefined,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Market evidence retrieval failed.";

    return {
      snapshot:
        structuredHistoricalSnapshot ??
        emptySnapshot(),
      evidence: [],
      verified: false,
      sourceCount: 0,
      independentDomains: 0,
      primarySourceFound: false,
      structuredDataAvailable:
        Boolean(
          structuredHistoricalSnapshot,
        ),
      structuredDataVerified:
        false,
      provider:
        createWebProviderStatus(
          structuredError
            ? `${structuredError}; ${message}`
            : message,
        ),
      error: [
        structuredError,
        message,
      ]
        .filter(Boolean)
        .join(" | "),
    };
  }
}

export function normalizeMarketSymbol(
  symbol: string,
  market: MarketInstrument["market"],
): string {
  return normalizeSymbol(
    symbol,
    market,
  );
}
