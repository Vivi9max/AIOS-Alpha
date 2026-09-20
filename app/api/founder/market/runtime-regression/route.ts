import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketIntelligenceRuntime,
} from "@/lib/runtime/market/market-intelligence-runtime";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function responseHeaders() {
  return {
    "cache-control":
      "no-store",

    "content-type":
      "application/json; charset=utf-8",
  };
}

function unauthorized() {
  return NextResponse.json(
    {
      success: false,

      verified: false,

      code:
        "FOUNDER_AUTH_REQUIRED",

      message:
        "Founder authentication is required.",
    },
    {
      status: 401,

      headers:
        responseHeaders(),
    },
  );
}

const CASES = [
  {
    id:
      "EXPLICIT_SYMBOL",

    prompt:
      "Analyze NVDA",

    symbol:
      null,

    market:
      "us" as const,
  },

  {
    id:
      "NATURAL_LANGUAGE_US",

    prompt:
      "分析 NVDA 的估值和基本面",

    symbol:
      null,

    market:
      null,
  },

  {
    id:
      "HK_SYMBOL",

    prompt:
      "分析 0700.HK",

    symbol:
      null,

    market:
      null,
  },

  {
    id:
      "CN_SYMBOL",

    prompt:
      "分析 600519.SH",

    symbol:
      null,

    market:
      null,
  },

  {
    id:
      "SYMBOL_REQUIRED",

    prompt:
      "帮我分析今天的股票市场",

    symbol:
      null,

    market:
      null,
  },
];

export async function GET(
  request: NextRequest,
) {
  if (
    !isFounderRequest(
      request,
    )
  ) {
    return unauthorized();
  }

  const startedAt =
    Date.now();

  const results = [];

  for (
    const item of CASES
  ) {
    const caseStartedAt =
      Date.now();

    try {
      const result =
        await runMarketIntelligenceRuntime(
          {
            prompt:
              item.prompt,

            symbol:
              item.symbol,

            market:
              item.market,
          },
        );

      const expectedMissingSymbol =
        item.id ===
        "SYMBOL_REQUIRED";

      const symbolResolutionPass =
        expectedMissingSymbol
          ? result.code ===
              "C147_2_8_SYMBOL_REQUIRED" &&
            result.success ===
              false &&
            result.result ===
              null
          : Boolean(
              result.request
                .symbol,
            );

      const tracePass =
        expectedMissingSymbol
          ? result.trace.some(
              (trace) =>
                trace.stage ===
                  "symbol.resolve" &&
                trace.status ===
                  "failed",
            )
          : result.trace.some(
              (trace) =>
                trace.stage ===
                  "symbol.resolve" &&
                trace.status ===
                  "completed",
            );

      const marketPass =
        expectedMissingSymbol
          ? true
          : Boolean(
              result.result
                ?.instrument
                ?.market,
            );

      const noInvalidRouterCall =
        expectedMissingSymbol
          ? result.trace.every(
              (trace) =>
                trace.stage !==
                "provider.resolve",
            )
          : true;

      const passed =
        symbolResolutionPass &&
        tracePass &&
        marketPass &&
        noInvalidRouterCall;

      results.push({
        id:
          item.id,

        prompt:
          item.prompt,

        expectedMissingSymbol,

        success:
          result.success,

        code:
          result.code,

        resolvedSymbol:
          result.request
            .symbol,

        resolvedMarket:
          result.request
            .market,

        mode:
          result.request
            .mode,

        symbolResolutionPass,

        tracePass,

        marketPass,

        noInvalidRouterCall,

        passed,

        trace:
          result.trace,

        provider:
          result.result
            ?.provider
            ?.provider ??
          null,

        dataQuality:
          result.result
            ?.snapshot
            ?.dataQuality ??
          null,

        latencyMs:
          Date.now() -
          caseStartedAt,
      });
    } catch (error) {
      results.push({
        id:
          item.id,

        prompt:
          item.prompt,

        expectedMissingSymbol:
          item.id ===
          "SYMBOL_REQUIRED",

        success:
          false,

        code:
          "C147_2_8_CASE_ERROR",

        resolvedSymbol:
          "",

        resolvedMarket:
          item.market ??
          "us",

        mode:
          "full",

        symbolResolutionPass:
          false,

        tracePass:
          false,

        marketPass:
          false,

        noInvalidRouterCall:
          false,

        passed:
          false,

        trace:
          [],

        provider:
          null,

        dataQuality:
          null,

        error:
          error instanceof Error
            ? error.message
            : "Runtime regression case failed.",

        latencyMs:
          Date.now() -
          caseStartedAt,
      });
    }
  }

  const passed =
    results.filter(
      (item) =>
        item.passed,
    ).length;

  const total =
    CASES.length;

  const finalPass =
    passed ===
    total;

  return NextResponse.json(
    {
      success:
        finalPass,

      verified:
        finalPass,

      code:
        finalPass
          ? "C147_2_8_MARKET_RUNTIME_REGRESSION_PASS"
          : "C147_2_8_MARKET_RUNTIME_REGRESSION_PARTIAL",

      stage:
        "C147.2.8",

      description:
        "Market Intelligence Runtime symbol resolution, natural-language routing and structured failure regression.",

      total,

      passed,

      failed:
        total -
        passed,

      results,

      metadata: {
        generatedAt:
          new Date().toISOString(),

        latencyMs:
          Date.now() -
          startedAt,

        disclaimer:
          "AIOS provides market research and decision-support information, not personalized investment advice or automatic buy/sell instructions.",
      },
    },
    {
      status:
        finalPass
          ? 200
          : 207,

      headers:
        responseHeaders(),
    },
  );
}
