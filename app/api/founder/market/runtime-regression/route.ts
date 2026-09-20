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
      "NVDA",

    market:
      "us" as const,

    mode:
      "full" as const,
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

    mode:
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

    mode:
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

    mode:
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

    mode:
      null,
  },
];

export async function GET(
  request: NextRequest,
) {
  const startedAt =
    Date.now();

  if (
    !isFounderRequest(
      request,
    )
  ) {
    return unauthorized();
  }

  const results = [];

  for (
    const item of CASES
  ) {
    const caseStartedAt =
      Date.now();

    try {
      const runtime =
        await runMarketIntelligenceRuntime(
          {
            prompt:
              item.prompt,

            symbol:
              item.symbol,

            market:
              item.market,

            mode:
              item.mode,
          },
        );

      const isSymbolRequired =
        item.id ===
        "SYMBOL_REQUIRED";

      const symbolResolved =
        Boolean(
          runtime.request.symbol,
        );

      const expectedSymbolRequired =
        isSymbolRequired &&
        runtime.code ===
          "C147_2_8_SYMBOL_REQUIRED" &&
        runtime.result ===
          null;

      const normalCasePassed =
        !isSymbolRequired &&
        runtime.success &&
        symbolResolved &&
        runtime.result !==
          null &&
        runtime.trace.some(
          (trace) =>
            trace.stage ===
              "symbol.resolve" &&
            trace.status ===
              "completed",
        ) &&
        runtime.trace.some(
          (trace) =>
            trace.stage ===
              "runtime.complete",
        );

      const passed =
        isSymbolRequired
          ? expectedSymbolRequired
          : normalCasePassed;

      results.push({
        id:
          item.id,

        prompt:
          item.prompt,

        success:
          runtime.success,

        passed,

        code:
          runtime.code,

        symbol:
          runtime.request
            .symbol,

        market:
          runtime.request
            .market,

        mode:
          runtime.request
            .mode,

        resultAvailable:
          runtime.result !==
          null,

        provider:
          runtime.result
            ?.provider
            ?.provider ??
          null,

        providerAvailable:
          runtime.result
            ?.provider
            ?.available ??
          false,

        structuredDataVerified:
          runtime.result
            ?.verification
            ?.structuredDataVerified ??
          false,

        webEvidenceAvailable:
          (runtime.result
            ?.evidence
            ?.length ?? 0) >
          0,

        dataQuality:
          runtime.result
            ?.snapshot
            ?.dataQuality ??
          null,

        freshness:
          runtime.result
            ?.verification
            ?.freshness ??
          null,

        sourceCount:
          runtime.result
            ?.verification
            ?.sourceCount ??
          0,

        independentDomains:
          runtime.result
            ?.verification
            ?.independentDomains ??
          0,

        traceStages:
          runtime.trace.map(
            (trace) => ({
              stage:
                trace.stage,

              status:
                trace.status,
            }),
          ),

        latencyMs:
          Date.now() -
          caseStartedAt,

        error:
          runtime.result
            ?.error ??
          null,
      });
    } catch (error) {
      results.push({
        id:
          item.id,

        prompt:
          item.prompt,

        success:
          false,

        passed:
          false,

        code:
          "C147_2_8_1_CASE_ERROR",

        symbol:
          "",

        market:
          item.market ??
          "us",

        mode:
          item.mode ??
          "full",

        resultAvailable:
          false,

        provider:
          null,

        providerAvailable:
          false,

        structuredDataVerified:
          false,

        webEvidenceAvailable:
          false,

        dataQuality:
          null,

        freshness:
          null,

        sourceCount:
          0,

        independentDomains:
          0,

        traceStages:
          [],

        latencyMs:
          Date.now() -
          caseStartedAt,

        error:
          error instanceof Error
            ? error.message
            : "Runtime regression case failed.",
      });
    }
  }

  const passed =
    results.filter(
      (item) =>
        item.passed,
    ).length;

  const failed =
    results.length -
    passed;

  const finalPass =
    passed ===
    results.length;

  return NextResponse.json(
    {
      success:
        finalPass,

      verified:
        finalPass,

      code:
        finalPass
          ? "C147_2_8_1_MARKET_RUNTIME_REGRESSION_PASS"
          : "C147_2_8_1_MARKET_RUNTIME_REGRESSION_PARTIAL",

      stage:
        "C147.2.8.1",

      description:
        "Founder-session regression for explicit symbols, natural-language symbol resolution, HK/A-share routing, and SYMBOL_REQUIRED protection.",

      total:
        results.length,

      passed,

      failed,

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
