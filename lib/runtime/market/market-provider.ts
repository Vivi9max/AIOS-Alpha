import {
  retrieveWebEvidence,
} from "@/lib/web-intelligence";

import {
  isAllTickConfigured,
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
  const value = symbol
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
    ReturnType<typeof retrieveWebEvidence>
  >,
): MarketEvidence[] {
  return result.evidence
    .map((item) => ({
      title: item.title,
      url: item.url,
      hostname: item.hostname,
      snippet: item.snippets.join(" "),
      retrievedAt: item.retrievedAt,
      confidence: item.confidence,
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
    dataQuality: "insufficient",
    liveQuoteAvailable: false,
    quoteQuality: "insufficient",
    historicalQuality: "insufficient",
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
    provider: "web-intelligence",
    configured: true,
    available: true,
    supportsQuote: false,
    supportsRealtime: false,
    supportsHistorical: false,
    supportsFundamentals: true,
    supportsMarkets: [instrument.market],
    reason:
      reason ??
      "Web Intelligence evidence fallback is active; it is not a realtime structured quote provider.",
  };
}

export function isStructuredRealtimeProviderConfigured(): boolean {
  return isAllTickConfigured();
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

  /*
   * ============================================================
   * C147.22
   *
   * REALTIME STRUCTURED FIRST
   *
   * AllTick:
   *   trade-tick -> realtime quote
   *   kline      -> historical OHLCV
   *
   * Historical-only data is NOT considered a realtime
   * structured verification.
   * ============================================================
   */

  try {
    const structured =
      await retrieveStructuredMarketData(
        instrument,
      );

    if (
      structured.success &&
      structured.snapshot
    ) {
      /*
       * Preserve historical structured data even when
       * realtime quote is unavailable.
       *
       * This allows the fallback path to retain verified
       * OHLCV information without falsely claiming realtime.
       */
      if (
        structured.historicalVerified &&
        structured.snapshot.bars &&
        structured.snapshot.bars.length > 0
      ) {
        structuredHistoricalSnapshot =
          structured.snapshot;
      }

      /*
       * STRICT realtime success condition.
       *
       * Do NOT use structured.verified here.
       * A historical-only response is not a realtime
       * structured provider PASS.
       */
      if (
        structured.realtimeVerified &&
        structured.snapshot.liveQuoteAvailable
      ) {
        return {
          snapshot:
            structured.snapshot,

          evidence: [],

          verified: true,

          sourceCount:
            structured.sourceCount,

          independentDomains: 1,

          primarySourceFound: true,

          structuredDataAvailable: true,

          structuredDataVerified: true,

          provider: {
            provider:
              structured.provider,

            configured: true,

            available: true,

            supportsQuote: true,

            supportsRealtime: true,

            supportsHistorical:
              structured.historicalVerified,

            supportsFundamentals: false,

            supportsMarkets: [
              "us",
              "hk",
              "cn",
            ],

            reason:
              "AllTick realtime trade tick verified; historical OHLCV also available.",
          },
        };
      }

      /*
       * Structured provider responded, but realtime
       * verification was not achieved.
       *
       * Fall through to Web Intelligence.
       */
      structuredError =
        structured.error ??
        (
          structured.historicalVerified
            ? "AllTick historical data is available, but realtime trade-tick verification was not available."
            : "AllTick structured realtime verification was not available."
        );
    } else {
      structuredError =
        structured.error ??
        "AllTick structured provider returned no verified data.";
    }
  } catch (error) {
    structuredError =
      error instanceof Error
        ? error.message
        : "Structured provider failed.";
  }

  /*
   * ============================================================
   * WEB INTELLIGENCE FALLBACK
   *
   * Web evidence may provide current/recent evidence,
   * but it can NEVER upgrade itself to:
   *
   *   liveQuoteAvailable = true
   *   quoteQuality = live
   *
   * This boundary is intentional.
   * ============================================================
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
      await retrieveWebEvidence(query);

    const evidence =
      buildEvidence(webResult);

    const normalized =
      normalizeMarketEvidence(evidence);

    let snapshot =
      normalized.snapshot;

    /*
     * If structured historical bars were available,
     * preserve them in the fallback result.
     *
     * The price itself still comes from the web-evidence
     * path unless the web layer provides no usable price.
     */
    if (
      structuredHistoricalSnapshot
        ?.bars &&
      structuredHistoricalSnapshot.bars.length > 0
    ) {
      snapshot = {
        ...snapshot,

        bars:
          structuredHistoricalSnapshot.bars,

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
     * Explicit safety boundary:
     *
     * Web evidence is never realtime structured data.
     */
    snapshot.dataQuality =
      snapshot.price !== null
        ? "web-evidence"
        : "insufficient";

    snapshot.liveQuoteAvailable = false;

    snapshot.quoteQuality =
      "web-evidence";

    if (
      !structuredHistoricalSnapshot
        ?.bars ||
      structuredHistoricalSnapshot.bars
        .length === 0
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
        [
          "AllTick realtime structured verification was unavailable.",
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
       * Web fallback does NOT count as structured
       * realtime data.
       */
      structuredDataAvailable:
        Boolean(
          structuredHistoricalSnapshot,
        ),

      structuredDataVerified: false,

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

      structuredDataVerified: false,

      provider:
        createWebProviderStatus(
          instrument,
          structuredError
            ? `${structuredError}; ${message}`
            : message,
        ),

      error: message,
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
