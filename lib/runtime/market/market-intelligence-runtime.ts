import {
  analyzeMarketRequest,
} from "./market-router";

import type {
  MarketAnalysisMode,
  MarketAnalysisResult,
  MarketRegion,
} from "./market-types";

export type MarketRuntimeRequest = {
  prompt?: string | null;
  symbol?: string | null;
  market?: MarketRegion | null;
  mode?: MarketAnalysisMode | null;
};

export type MarketRuntimeTrace = {
  stage: string;

  status:
    | "completed"
    | "skipped"
    | "failed";

  detail: string;

  timestamp: string;
};

export type MarketIntelligenceRuntimeResult = {
  success: boolean;

  code: string;

  request: {
    prompt: string | null;
    symbol: string;
    market: MarketRegion;
    mode: MarketAnalysisMode;
  };

  result:
    | MarketAnalysisResult
    | null;

  trace: MarketRuntimeTrace[];

  runtime: {
    name:
      "market-intelligence-runtime";

    version:
      "C147.2.8";

    generatedAt: string;
  };
};

function normalizePrompt(
  value: unknown,
): string {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSymbol(
  value: unknown,
): string {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .trim()
    .replace(
      /[，。！？、；：]/g,
      " ",
    )
    .split(/\s+/)[0] ?? "";
}

function detectMarketFromPrompt(
  prompt: string,
): MarketRegion | undefined {
  const value =
    prompt.toUpperCase();

  if (
    value.includes("港股") ||
    value.includes("HKEX") ||
    value.includes("HONG KONG") ||
    /\bHK[:\s]?\d{4,5}\b/.test(
      value,
    ) ||
    /\b\d{4,5}\.HK\b/.test(
      value,
    )
  ) {
    return "hk";
  }

  if (
    value.includes("A股") ||
    value.includes("A-SHARE") ||
    value.includes("A SHARE") ||
    value.includes("上证") ||
    value.includes("深证") ||
    /\bSH[:\s]?\d{6}\b/.test(
      value,
    ) ||
    /\bSZ[:\s]?\d{6}\b/.test(
      value,
    ) ||
    /\b\d{6}\.(SH|SZ)\b/.test(
      value,
    )
  ) {
    return "cn";
  }

  if (
    value.includes("美股") ||
    value.includes("NASDAQ") ||
    value.includes("NYSE") ||
    value.includes("US STOCK") ||
    value.includes("美国股票")
  ) {
    return "us";
  }

  return undefined;
}

function extractSymbolFromPrompt(
  prompt: string,
  explicitMarket?: MarketRegion | null,
): string {
  if (!prompt) {
    return "";
  }

  /*
   * Explicit exchange-qualified symbols.
   */
  const exchangeMatch =
    prompt.match(
      /\b(?:NASDAQ:|NYSE:|US:|HK:|SH:|SZ:|SS:)[A-Z0-9._-]+\b/i,
    );

  if (
    exchangeMatch?.[0]
  ) {
    return exchangeMatch[0];
  }

  /*
   * Hong Kong symbols.
   */
  const hkMatch =
    prompt.match(
      /\b\d{4,5}\.HK\b/i,
    );

  if (
    hkMatch?.[0]
  ) {
    return hkMatch[0];
  }

  /*
   * Mainland China symbols.
   */
  const cnMatch =
    prompt.match(
      /\b\d{6}\.(?:SH|SZ)\b/i,
    );

  if (
    cnMatch?.[0]
  ) {
    return cnMatch[0];
  }

  /*
   * Six-digit mainland ticker
   * when CN market is explicit.
   */
  if (
    explicitMarket ===
    "cn"
  ) {
    const mainland =
      prompt.match(
        /\b\d{6}\b/,
      );

    if (
      mainland?.[0]
    ) {
      return mainland[0];
    }
  }

  /*
   * Four/five digit HK ticker
   * when HK market is explicit.
   */
  if (
    explicitMarket ===
    "hk"
  ) {
    const hongKong =
      prompt.match(
        /\b\d{4,5}\b/,
      );

    if (
      hongKong?.[0]
    ) {
      return hongKong[0];
    }
  }

  /*
   * US ticker detection.
   *
   * Avoid common English words so
   * natural-language requests such as
   * "analyze the stock market" do not
   * accidentally become ticker "THE".
   */
  const ignored =
    new Set([
      "THE",
      "AND",
      "FOR",
      "WITH",
      "FROM",
      "WHAT",
      "HOW",
      "WHY",
      "ABOUT",
      "STOCK",
      "STOCKS",
      "MARKET",
      "PRICE",
      "VALUE",
      "ANALYZE",
      "ANALYSIS",
      "TODAY",
      "CURRENT",
      "COMPANY",
      "SHARE",
      "SHARES",
      "PLEASE",
      "SHOW",
      "GIVE",
      "LOOK",
      "AT",
      "ME",
      "CAN",
      "YOU",
    ]);

  const candidates =
    prompt.match(
      /\b[A-Z]{1,5}\b/g,
    ) ?? [];

  for (
    const candidate of
      candidates
  ) {
    if (
      !ignored.has(
        candidate,
      )
    ) {
      return candidate;
    }
  }

  /*
   * Lowercase ticker typed by user.
   */
  const lowercaseCandidates =
    prompt.match(
      /\b[a-z]{1,5}\b/g,
    ) ?? [];

  for (
    const candidate of
      lowercaseCandidates
  ) {
    const normalized =
      candidate.toUpperCase();

    if (
      !ignored.has(
        normalized,
      )
    ) {
      return normalized;
    }
  }

  return "";
}

function resolveMode(
  prompt: string,
  requested?: MarketAnalysisMode | null,
): MarketAnalysisMode {
  if (
    requested
  ) {
    return requested;
  }

  const value =
    prompt.toLowerCase();

  if (
    value.includes("估值") ||
    value.includes("valuation") ||
    value.includes("pe") ||
    value.includes("pb")
  ) {
    return "valuation";
  }

  if (
    value.includes("技术面") ||
    value.includes("technical") ||
    value.includes("trend") ||
    value.includes("走势")
  ) {
    return "technical";
  }

  if (
    value.includes("筛选") ||
    value.includes("screen") ||
    value.includes("选股")
  ) {
    return "screen";
  }

  if (
    value.includes("研究") ||
    value.includes("research")
  ) {
    return "research";
  }

  return "full";
}

function buildTrace(
  stage: string,
  status:
    | "completed"
    | "skipped"
    | "failed",
  detail: string,
): MarketRuntimeTrace {
  return {
    stage,
    status,
    detail,
    timestamp:
      new Date().toISOString(),
  };
}

function buildRuntimeCode(
  result: MarketAnalysisResult,
): string {
  if (
    result.verification
      .structuredDataVerified
  ) {
    return "C147_2_8_STRUCTURED_DATA_RUNTIME_PASS";
  }

  if (
    result.success &&
    result.evidence.length >
      0
  ) {
    return "C147_2_8_WEB_EVIDENCE_RUNTIME_PASS";
  }

  return "C147_2_8_MARKET_RUNTIME_INSUFFICIENT";
}

export async function runMarketIntelligenceRuntime(
  request: MarketRuntimeRequest,
): Promise<MarketIntelligenceRuntimeResult> {
  const startedAt =
    Date.now();

  const prompt =
    normalizePrompt(
      request.prompt,
    );

  const explicitSymbol =
    normalizeSymbol(
      request.symbol,
    );

  const promptMarket =
    detectMarketFromPrompt(
      prompt,
    );

  const resolvedMarket =
    request.market ??
    promptMarket ??
    "us";

  const symbol =
    explicitSymbol ||
    extractSymbolFromPrompt(
      prompt,
      resolvedMarket,
    );

  const resolvedMode =
    resolveMode(
      prompt,
      request.mode,
    );

  const trace: MarketRuntimeTrace[] =
    [];

  trace.push(
    buildTrace(
      "request.normalize",
      "completed",
      prompt
        ? "Natural-language market request normalized."
        : "Explicit market fields supplied.",
    ),
  );

  /*
   * C147.2.8:
   *
   * Missing symbols are now a normal,
   * structured runtime result.
   *
   * Do not call market-router with an
   * intentionally invalid empty symbol.
   */
  if (!symbol) {
    trace.push(
      buildTrace(
        "symbol.resolve",
        "failed",
        "No stock symbol could be resolved from the request.",
      ),
    );

    trace.push(
      buildTrace(
        "provider.resolve",
        "skipped",
        "Provider lookup skipped because no valid stock symbol was resolved.",
      ),
    );

    trace.push(
      buildTrace(
        "analysis.execute",
        "skipped",
        "Market analysis skipped because the instrument is unknown.",
      ),
    );

    trace.push(
      buildTrace(
        "execution-gate",
        "skipped",
        "No broker or trading execution is permitted without a resolved instrument.",
      ),
    );

    trace.push(
      buildTrace(
        "runtime.complete",
        "failed",
        `Runtime completed with SYMBOL_REQUIRED in ${Date.now() - startedAt}ms.`,
      ),
    );

    return {
      success:
        false,

      code:
        "C147_2_8_SYMBOL_REQUIRED",

      request: {
        prompt:
          prompt ||
          null,

        symbol:
          "",

        market:
          resolvedMarket,

        mode:
          resolvedMode,
      },

      result:
        null,

      trace,

      runtime: {
        name:
          "market-intelligence-runtime",

        version:
          "C147.2.8",

        generatedAt:
          new Date().toISOString(),
      },
    };
  }

  trace.push(
    buildTrace(
      "symbol.resolve",
      "completed",
      `Resolved instrument symbol: ${symbol}.`,
    ),
  );

  const result =
    await analyzeMarketRequest(
      {
        symbol,

        market:
          resolvedMarket,

        mode:
          resolvedMode,

        query:
          prompt ||
          null,
      },
    );

  trace.push(
    buildTrace(
      "provider.resolve",
      result.provider.available
        ? "completed"
        : "failed",
      `Provider: ${result.provider.provider}; available=${result.provider.available}; structured=${result.verification.structuredDataVerified}.`,
    ),
  );

  trace.push(
    buildTrace(
      "freshness.verify",
      "completed",
      `Data quality=${result.snapshot.dataQuality}; freshness=${result.verification.freshness.freshness}; liveQuote=${result.snapshot.liveQuoteAvailable}.`,
    ),
  );

  trace.push(
    buildTrace(
      "evidence.verify",
      result.verification
        .verified
        ? "completed"
        : "failed",
      `sources=${result.verification.sourceCount}; independentDomains=${result.verification.independentDomains}; primarySource=${result.verification.primarySourceFound}.`,
    ),
  );

  trace.push(
    buildTrace(
      "analysis.execute",
      "completed",
      "Industry, company, fundamentals, valuation, trend and risk analysis completed.",
    ),
  );

  trace.push(
    buildTrace(
      "decision-support.build",
      "completed",
      "Decision-support conditions and scenarios generated without automatic buy/sell execution.",
    ),
  );

  trace.push(
    buildTrace(
      "execution-gate",
      "skipped",
      "No broker or trading execution was requested or authorized by this runtime.",
    ),
  );

  const runtimeCode =
    buildRuntimeCode(
      result,
    );

  trace.push(
    buildTrace(
      "runtime.complete",
      result.success
        ? "completed"
        : "failed",
      `Market intelligence runtime completed in ${Date.now() - startedAt}ms.`,
    ),
  );

  return {
    success:
      result.success,

    code:
      runtimeCode,

    request: {
      prompt:
        prompt ||
        null,

      symbol,

      market:
        result.instrument.market,

      mode:
        resolvedMode,
    },

    result,

    trace,

    runtime: {
      name:
        "market-intelligence-runtime",

      version:
        "C147.2.8",

      generatedAt:
        new Date().toISOString(),
    },
  };
}
