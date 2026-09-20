import {
  retrieveWebEvidence,
} from "@/lib/web-intelligence";

import type {
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
      .replace(/^0+(?=\d)/, "")
      .padStart(4, "0");
  }

  if (market === "cn") {
    return value
      .replace(/^SH:/, "")
      .replace(/^SZ:/, "")
      .replace(/^SS:/, "");
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

  const value = symbol
    .trim()
    .toUpperCase();

  if (
    value.startsWith("HK:") ||
    /^\d{4,5}\.HK$/.test(value) ||
    /^\d{4,5}$/.test(value)
  ) {
    return "hk";
  }

  if (
    value.startsWith("SH:") ||
    value.startsWith("SZ:") ||
    /\.SH$/.test(value) ||
    /\.SZ$/.test(value)
  ) {
    return "cn";
  }

  return "us";
}

function buildInstrument(
  symbol: string,
  market: MarketInstrument["market"],
): MarketInstrument {
  const normalized =
    normalizeSymbol(symbol, market);

  if (market === "hk") {
    return {
      symbol,
      normalizedSymbol: normalized,
      market,
      exchange: "HKEX",
      currency: "HKD",
    };
  }

  if (market === "cn") {
    const exchange =
      normalized.startsWith("6")
        ? "SSE"
        : normalized.startsWith("0") ||
            normalized.startsWith("3")
          ? "SZSE"
          : "CN";

    return {
      symbol,
      normalizedSymbol: normalized,
      market,
      exchange,
      currency: "CNY",
    };
  }

  return {
    symbol,
    normalizedSymbol: normalized,
    market,
    exchange: "US",
    currency: "USD",
  };
}

function parseNumber(
  value: string,
): number | null {
  const cleaned = value
    .replace(/,/g, "")
    .replace(/%/g, "")
    .replace(/[^\d.+-]/g, "");

  if (!cleaned) {
    return null;
  }

  const parsed =
    Number(cleaned);

  return Number.isFinite(parsed)
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

    if (match?.[1]) {
      const value =
        parseNumber(match[1]);

      if (value !== null) {
        return value;
      }
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
      .map((item) =>
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
        /(?:market cap|市值)[^\d]{0,20}([\d,.]+)/i,
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
        /(?:EPS|每股收益)[^\d-]{0,20}([+-]?[\d.]+)/i,
      ],
    );

  const revenueGrowth =
    extractMetric(
      combined,
      [
        /(?:revenue growth|营收增长|收入增长)[^\d+-]{0,20}([+-]?[\d.]+)%/i,
      ],
    );

  const hasStructuredQuote =
    price !== null;

  return {
    price,
    previousClose:
      null,
    changePercent,
    marketCap,
    pe,
    pb,
    eps,
    revenue:
      null,
    revenueGrowth,
    dataQuality:
      hasStructuredQuote
        ? "web-evidence"
        : "insufficient",
    liveQuoteAvailable:
      false,
    asOf:
      evidence.length > 0
        ? new Date(
            Math.max(
              ...evidence.map(
                (item) =>
                  item.retrievedAt,
              ),
            ),
          ).toISOString()
        : null,
    source:
      evidence[0]?.hostname ??
      null,
  };
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
  error?: string;
}> {
  const marketName =
    instrument.market === "us"
      ? "US stock market"
      : instrument.market === "hk"
        ? "Hong Kong stock market"
        : "China A-share market";

  const query = [
    `${instrument.normalizedSymbol}`,
    marketName,
    "company",
    "financial results",
    "valuation",
    "stock price",
  ].join(" ");

  const result =
    await retrieveWebEvidence(
      query,
    );

  const evidence =
    buildEvidence(result);

  const snapshot =
    extractSnapshot(evidence);

  const domains =
    new Set(
      evidence.map(
        (item) =>
          item.hostname
            .toLowerCase()
            .replace(/^www\./, ""),
      ),
    );

  return {
    snapshot,
    evidence,
    verified:
      result.verification
        ?.verified ?? false,
    sourceCount:
      result.sourceCount,
    independentDomains:
      domains.size,
    primarySourceFound:
      result.verification
        ?.primarySourceFound ??
      false,
    error:
      result.success
        ? undefined
        : result.error,
  };
}

export function isStructuredRealtimeProviderConfigured(): boolean {
  return Boolean(
    process.env.NASDAQ_DATA_LINK_API_KEY?.trim(),
  );
}
