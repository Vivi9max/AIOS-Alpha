import {
  retrieveWebEvidence,
} from "@/lib/web-intelligence";

import {
  retrieveStructuredMarketData,
} from "./structured-provider";

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

function parseNumber(
  value: string,
): number | null {
  const cleaned =
    value
      .replace(/,/g, "")
      .replace(/%/g, "")
      .replace(/[^\d.+-]/g, "");

  if (!cleaned) {
    return null;
  }

  const parsed =
    Number(cleaned);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : null;
}

function extractMetric(
  text: string,
  patterns: RegExp[],
): number | null {
  for (const pattern of patterns) {
    const match =
      text.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    const value =
      parseNumber(match[1]);

    if (value !== null) {
      return value;
    }
  }

  return null;
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

function extractSnapshot(
  evidence: MarketEvidence[],
): MarketSnapshot {
  const combined =
    evidence
      .map(
        (item) =>
          `${item.title} ${item.snippet}`,
      )
      .join(" ");

  const price =
    extractMetric(
      combined,
      [
        /(?:current price|share price|stock price|last price|价格|股价)[^\d]{0,30}([\d,.]+)/i,
        /(?:USD|HKD|CNY)\s*([\d,.]+)/i,
      ],
    );

  const changePercent =
    extractMetric(
      combined,
      [
        /(?:change|涨跌|涨幅|跌幅)[^\d+-]{0,20}([+-]?[\d.]+)%/i,
        /([+-]?[\d.]+)%\s*(?:today|today's|change|涨跌)/i,
      ],
    );

  const marketCap =
    extractMetric(
      combined,
      [
        /(?:market cap|market capitalization|市值)[^\d]{0,20}([\d,.]+)/i,
      ],
    );

  const pe =
    extractMetric(
      combined,
      [
        /(?:P\/E|PE|price[- ]to[- ]earnings|市盈率)[^\d]{0,20}([\d.]+)/i,
      ],
    );

  const pb =
    extractMetric(
      combined,
      [
        /(?:P\/B|PB|price[- ]to[- ]book|市净率)[^\d]{0,20}([\d.]+)/i,
      ],
    );

  const eps =
    extractMetric(
      combined,
      [
        /(?:EPS|earnings per share|每股收益)[^\d-]{0,20}([+-]?[\d.]+)/i,
      ],
    );

  const revenueGrowth =
    extractMetric(
      combined,
      [
        /(?:revenue growth|revenue growth rate|营收增长|收入增长)[^\d+-]{0,20}([+-]?[\d.]+)%/i,
      ],
    );

  const latestTimestamp =
    evidence.length > 0
      ? Math.max(
          ...evidence.map(
            (item) =>
              item.retrievedAt,
          ),
        )
      : null;

  return {
    price,

    previousClose:
      null,

    changePercent,

    open:
      null,

    high:
      null,

    low:
      null,

    volume:
      null,

    marketCap,

    pe,

    pb,

    eps,

    revenue:
      null,

    revenueGrowth,

    dataQuality:
      price !== null
        ? "web-evidence"
        : "insufficient",

    liveQuoteAvailable:
      false,

    asOf:
      latestTimestamp !== null
        ? new Date(
            latestTimestamp,
          ).toISOString()
        : null,

    source:
      evidence[0]?.hostname ??
      null,

    dataset:
      null,

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
  /*
   * ============================================================
   * C147.2.2
   * Structured Provider → Web Intelligence fallback
   * ============================================================
   */

  let structuredError:
    | string
    | undefined;

  /*
   * 1. Try structured provider first.
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
   * 2. Structured provider unavailable/failed.
   *    Continue with Web Intelligence.
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

    const snapshot =
      extractSnapshot(
        evidence,
      );

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
          structuredError
            ? `Structured provider unavailable; Web Intelligence fallback used. ${structuredError}`
            : undefined,
        ),

      error:
        webResult.success
          ? undefined
          : webResult.error ??
            structuredError,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Market evidence retrieval failed.";

    return {
      snapshot: {
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

        dataQuality:
          "insufficient",

        liveQuoteAvailable:
          false,

        asOf: null,
        source: null,
        dataset: null,

        bars: [],
      },

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
