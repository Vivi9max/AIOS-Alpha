import {
  analyzeMarket,
} from "./market-analysis";

import {
  detectMarket,
  retrieveMarketData,
} from "./market-provider";

import {
  assessMarketFreshness,
} from "./evidence-quality";

import type {
  MarketAnalysisMode,
  MarketAnalysisRequest,
  MarketAnalysisResult,
  MarketInstrument,
} from "./market-types";

function resolveMode(
  mode?: MarketAnalysisMode,
): MarketAnalysisMode {
  return mode ?? "full";
}

function buildInstrument(
  rawSymbol: string,
  market: MarketInstrument["market"],
): MarketInstrument {
  const normalized =
    market === "hk"
      ? rawSymbol
          .replace(/^HK:/i, "")
          .replace(/\.HK$/i, "")
          .replace(/^0+(?=\d)/, "")
          .padStart(4, "0")
      : market === "cn"
        ? rawSymbol
            .replace(/^SH:/i, "")
            .replace(/^SZ:/i, "")
            .replace(/^SS:/i, "")
            .replace(
              /\.(SH|SZ)$/i,
              "",
            )
            .toUpperCase()
        : rawSymbol
            .replace(
              /^(NASDAQ:|NYSE:|US:)/i,
              "",
            )
            .toUpperCase();

  return {
    symbol: rawSymbol,

    normalizedSymbol:
      normalized,

    market,

    exchange:
      market === "hk"
        ? "HKEX"
        : market === "cn"
          ? normalized.startsWith("6")
            ? "SSE"
            : normalized.startsWith("0") ||
                normalized.startsWith("3")
              ? "SZSE"
              : "CN"
          : "US",

    currency:
      market === "hk"
        ? "HKD"
        : market === "cn"
          ? "CNY"
          : "USD",
  };
}

export async function analyzeMarketRequest(
  request: MarketAnalysisRequest,
): Promise<MarketAnalysisResult> {
  const rawSymbol =
    request.symbol?.trim();

  if (!rawSymbol) {
    throw new Error(
      "A stock symbol is required.",
    );
  }

  const market =
    detectMarket(
      rawSymbol,
      request.market,
    );

  const instrument =
    buildInstrument(
      rawSymbol,
      market,
    );

  const data =
    await retrieveMarketData(
      instrument,
    );

  const analysis =
    analyzeMarket(
      data.snapshot,
      data.evidence,
    );

  const mode =
    resolveMode(
      request.mode,
    );

  const freshness =
    assessMarketFreshness(
      data.snapshot,
    );

  const structuredDataAvailable =
    data.structuredDataAvailable;

  const structuredDataVerified =
    data.structuredDataVerified;

  const webEvidenceAvailable =
    data.evidence.length > 0;

  /*
   * Verification means the runtime has
   * a usable evidence path.
   *
   * It does NOT mean the price is live.
   */
  const success =
    structuredDataVerified ||
    webEvidenceAvailable;

  let code:
    | "C147_2_STRUCTURED_MARKET_DATA_PASS"
    | "C147_2_WEB_EVIDENCE_FALLBACK"
    | "C147_2_MARKET_EVIDENCE_INSUFFICIENT";

  if (structuredDataVerified) {
    code =
      "C147_2_STRUCTURED_MARKET_DATA_PASS";
  } else if (webEvidenceAvailable) {
    code =
      "C147_2_WEB_EVIDENCE_FALLBACK";
  } else {
    code =
      "C147_2_MARKET_EVIDENCE_INSUFFICIENT";
  }

  return {
    success,

    code,

    instrument,

    snapshot:
      data.snapshot,

    analysis,

    evidence:
      data.evidence,

    verification: {
      verified:
        data.verified,

      sourceCount:
        data.sourceCount,

      independentDomains:
        data.independentDomains,

      primarySourceFound:
        data.primarySourceFound,

      structuredDataAvailable,

      structuredDataVerified,

      freshness: {
        freshness:
          freshness.freshness,

        ageMinutes:
          freshness.ageMinutes,

        ageHours:
          freshness.ageHours,

        referenceTime:
          freshness.referenceTime,

        reason:
          freshness.reason,
      },
    },

    provider:
      data.provider,

    metadata: {
      runtime:
        "aios-alpha",

      stage:
        "C147.2.4",

      analysisMode:
        mode,

      generatedAt:
        new Date().toISOString(),

      disclaimer:
        "AIOS provides market research and decision-support information, not personalized investment advice or automatic buy/sell instructions.",
    },

    error:
      data.error,
  };
}
