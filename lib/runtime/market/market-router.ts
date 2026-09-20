import {
  analyzeMarket,
} from "./market-analysis";

import {
  detectMarket,
  retrieveMarketData,
} from "./market-provider";

import type {
  MarketAnalysisMode,
  MarketAnalysisRequest,
  MarketAnalysisResult,
} from "./market-types";

function resolveMode(
  mode?: MarketAnalysisMode,
): MarketAnalysisMode {
  return mode ?? "full";
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

  const instrument = {
    symbol: rawSymbol,
    normalizedSymbol:
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
              .replace(/\.(SH|SZ)$/i, "")
          : rawSymbol
              .replace(
                /^(NASDAQ:|NYSE:|US:)/i,
                "",
              )
              .toUpperCase(),
    market,
    exchange:
      market === "hk"
        ? "HKEX"
        : market === "cn"
          ? "CN"
          : "US",
    currency:
      market === "hk"
        ? "HKD"
        : market === "cn"
          ? "CNY"
          : "USD",
  } as const;

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
    resolveMode(request.mode);

  return {
    success:
      data.evidence.length > 0,

    code:
      data.evidence.length > 0
        ? "C147_1_MARKET_ANALYSIS_PASS"
        : "C147_1_MARKET_EVIDENCE_INSUFFICIENT",

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
    },

    metadata: {
      runtime:
        "aios-alpha",
      stage:
        "C147.1",
      analysisMode:
        mode,
      generatedAt:
        new Date().toISOString(),
      disclaimer:
        "AIOS provides market research and decision-support information, not personalized investment advice or an automatic buy/sell instruction.",
    },

    error:
      data.error,
  };
}
