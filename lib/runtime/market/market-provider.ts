import {
  retrieveWebEvidence,
} from "@/lib/web-intelligence";

import {
  retrieveStructuredMarketData,
} from "./structured-provider";

import {
  normalizeMarketEvidence,
} from "./market-normalizer";

import {
  guardMarketPriceIntegrity,
} from "./market-price-integrity";

import type {
  MarketDataProviderStatus,
  MarketEvidence,
  MarketInstrument,
  MarketSnapshot,
} from "./market-types";

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
    .replace(/^US:/, "");
}

export function detectMarket(
  symbol: string,
  explicitMarket?: MarketInstrument["market"] | null,
): MarketInstrument["market"] {
  if (explicitMarket) {
    return explicitMarket;
  }

  const value =
    symbol
      .trim()
      .toUpperCase();

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
    ReturnType<typeof retrieveWebEvidence>
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
        item.snippets.join(" "),

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

    asOf: null,
    source: null,
    dataset: null,

    bars: [],
  };
}

function createWebProviderStatus(
  instrument: MarketInstrument,
  reason?: string,
): MarketDataProviderStatus {
  return {
    provider:
      "web-intelligence",

    configured:
      true,

    available:
      true,

    supportsQuote:
      false,

    supportsHistorical:
      false,

    supportsFundamentals:
      true,

    supportsMarkets:
      [instrument.market],

    reason:
      reason ??
      "Web Intelligence evidence fallback is active.",
  };
}

export function isStructuredRealtimeProviderConfigured(): boolean {
  return Boolean(
    process.env.NASDAQ_DATA_LINK_API_KEY?.trim() &&
    process.env.NASDAQ_DATA_LINK_PRICE_TABLE?.trim(),
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

  /*
   * ============================================================
   * C147.2.6 / C147.2.7
   *
   * Structured Provider
   *        ↓
   * Normalized Evidence
   *        ↓
   * Conflict Guard
   *        ↓
   * Price Integrity Guard
   *        ↓
   * Market Snapshot
   *
   * Never treat raw web extraction as trusted
   * structured market data.
   * ============================================================
   */

  /*
   * 1. Structured provider first.
   */
  try {
    const structured =
      await retrieveStructuredMarketData(
        instrument,
      );

    if (
      structured.success &&
      structured.verified
    ) {
      return {
        snapshot:
          structured.snapshot,

        evidence: [],

        verified:
          true,

        sourceCount:
          structured.sourceCount,

        independentDomains:
          1,

        primarySourceFound:
          true,

        structuredDataAvailable:
          true,

        structuredDataVerified:
          true,

        provider: {
          provider:
            structured.provider,

          configured:
            true,

          available:
            true,

          supportsQuote:
            false,

          supportsHistorical:
            true,

          supportsFundamentals:
            false,

          supportsMarkets:
            ["us"],

          reason:
            "Structured historical market data verified.",
        },
      };
    }

    structuredError =
      structured.error;
  } catch (error) {
    structuredError =
      error instanceof Error
        ? error.message
        : "Structured provider failed.";
  }

  /*
   * 2. Web Intelligence fallback.
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

    /*
     * Parse each source independently,
     * then resolve conflicts.
     */
    const normalized =
      normalizeMarketEvidence(
        evidence,
      );

    let snapshot =
      normalized.snapshot;

    /*
     * C147.2.7.1
     *
     * Prevent ticker-code leakage from becoming
     * a market price.
     */
    const priceIntegrity =
      guardMarketPriceIntegrity(
        snapshot,
        instrument.normalizedSymbol,
        instrument.market,
        evidence,
      );

    snapshot =
      priceIntegrity.snapshot;

    const domains =
      new Set(
        evidence.map(
          (item) =>
            item.hostname
              .toLowerCase()
              .replace(
                /^www\./,
                "",
              ),
        ),
      );

    const verified =
      webResult.verification
        ?.verified ?? false;

    const primarySourceFound =
      webResult.verification
        ?.primarySourceFound ??
      false;

    let providerReason:
      | string
      | undefined;

    if (priceIntegrity.priceRejected) {
      providerReason =
        [
          "Price integrity guard rejected a ticker-derived value.",
          priceIntegrity.reason,
        ]
          .filter(Boolean)
          .join(" ");
    } else if (structuredError) {
      providerReason =
        `Structured provider unavailable; Web Intelligence fallback used. ${structuredError}`;
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

      structuredDataAvailable:
        false,

      structuredDataVerified:
        false,

      provider:
        createWebProviderStatus(
          instrument,
          providerReason,
        ),

      error:
        webResult.success
          ? priceIntegrity.priceRejected
            ? priceIntegrity.reason ??
              undefined
            : undefined
          : webResult.error ??
            structuredError,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Market evidence retrieval failed.";

    return {
      snapshot:
        emptySnapshot(),

      evidence: [],

      verified:
        false,

      sourceCount:
        0,

      independentDomains:
        0,

      primarySourceFound:
        false,

      structuredDataAvailable:
        false,

      structuredDataVerified:
        false,

      provider:
        createWebProviderStatus(
          instrument,
          structuredError
            ? `${structuredError}; ${message}`
            : message,
        ),

      error:
        message,
    };
  }
}

/*
 * Keep this export available for existing
 * callers that need canonical symbol handling.
 */
export function normalizeMarketSymbol(
  symbol: string,
  market: MarketInstrument["market"],
): string {
  return normalizeSymbol(
    symbol,
    market,
  );
}
