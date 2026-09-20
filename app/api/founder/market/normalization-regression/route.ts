import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  analyzeMarketRequest,
} from "@/lib/runtime/market/market-router";

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
    id: "US_NVDA",
    symbol: "NVDA",
    market: "us" as const,
  },

  {
    id: "HK_TENCENT",
    symbol: "0700.HK",
    market: "hk" as const,
  },

  {
    id: "CN_MOUTAI",
    symbol: "600519.SH",
    market: "cn" as const,
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
        await analyzeMarketRequest(
          {
            symbol:
              item.symbol,

            market:
              item.market,

            mode:
              "full",
          },
        );

      const semantic =
        result.snapshot
          .semantic;

      results.push({
        id:
          item.id,

        symbol:
          item.symbol,

        market:
          item.market,

        success:
          result.success,

        verified:
          result.verification
            .verified,

        code:
          result.code,

        dataQuality:
          result.snapshot
            .dataQuality,

        price:
          result.snapshot
            .price,

        previousClose:
          result.snapshot
            .previousClose,

        changePercent:
          result.snapshot
            .changePercent,

        open:
          result.snapshot
            .open,

        high:
          result.snapshot
            .high,

        low:
          result.snapshot
            .low,

        volume:
          result.snapshot
            .volume,

        afterHoursPrice:
          result.snapshot
            .afterHoursPrice,

        preMarketPrice:
          result.snapshot
            .preMarketPrice,

        pe:
          result.snapshot
            .pe,

        pb:
          result.snapshot
            .pb,

        eps:
          result.snapshot
            .eps,

        revenue:
          result.snapshot
            .revenue,

        revenueGrowth:
          result.snapshot
            .revenueGrowth,

        fieldQuality:
          result.snapshot
            .fieldQuality ??
          {},

        semantic: {
          regularSessionPrice:
            semantic
              ?.regularSessionPrice ??
            null,

          afterHoursPrice:
            semantic
              ?.afterHoursPrice ??
            null,

          preMarketPrice:
            semantic
              ?.preMarketPrice ??
            null,

          previousClose:
            semantic
              ?.previousClose ??
            null,

          changePercent:
            semantic
              ?.changePercent ??
            null,
        },

        structuredDataVerified:
          result.verification
            .structuredDataVerified,

        webEvidence:
          result.evidence.length >
          0,

        sourceCount:
          result.verification
            .sourceCount,

        independentDomains:
          result.verification
            .independentDomains,

        freshness:
          result.verification
            .freshness,

        provider:
          result.provider
            .provider,

        error:
          result.error ??
          null,

        latencyMs:
          Date.now() -
          caseStartedAt,
      });
    } catch (error) {
      results.push({
        id:
          item.id,

        symbol:
          item.symbol,

        market:
          item.market,

        success:
          false,

        verified:
          false,

        code:
          "C147_2_7_CASE_ERROR",

        dataQuality:
          "insufficient",

        price:
          null,

        previousClose:
          null,

        changePercent:
          null,

        open:
          null,

        high:
          null,

        low:
          null,

        volume:
          null,

        afterHoursPrice:
          null,

        preMarketPrice:
          null,

        pe:
          null,

        pb:
          null,

        eps:
          null,

        revenue:
          null,

        revenueGrowth:
          null,

        fieldQuality:
          {},

        semantic:
          null,

        structuredDataVerified:
          false,

        webEvidence:
          false,

        sourceCount:
          0,

        independentDomains:
          0,

        freshness: {
          freshness:
            "unknown",

          ageMinutes:
            null,

          ageHours:
            null,

          referenceTime:
            null,

          reason:
            "Semantic normalization regression case failed.",
        },

        provider:
          "unknown",

        error:
          error instanceof Error
            ? error.message
            : "Regression case failed.",

        latencyMs:
          Date.now() -
          caseStartedAt,
      });
    }
  }

  const passed =
    results.filter(
      (item) =>
        item.success &&
        item.verified &&
        (
          item.structuredDataVerified ||
          item.webEvidence
        ),
    ).length;

  const allPassed =
    passed ===
    CASES.length;

  /*
   * C147.2.7 semantic regression.
   *
   * Semantic fields are nullable by design.
   * Resolve nullable nested values into local
   * variables before accessing their properties.
   */
  const semanticChecks = {
    regularAndAfterHoursSeparated:
      results.every((item) => {
        const regularSessionPrice =
          item.semantic
            ?.regularSessionPrice ??
          null;

        return (
          regularSessionPrice?.session !==
          "after_hours"
        );
      }),

    afterHoursStoredSeparately:
      results.every((item) => {
        if (
          item.afterHoursPrice ===
          null
        ) {
          return true;
        }

        return (
          item.semantic !==
          null
        );
      }),

    annualChangeNotUsedAsDaily:
      results.every((item) => {
        const semanticChangePercent =
          item.semantic
            ?.changePercent ??
          null;

        return (
          item.changePercent ===
            null ||
          semanticChangePercent?.period !==
            "one_year"
        );
      }),

    peSubstringProtection:
      results.every(
        (item) =>
          item.pe ===
            null ||
          item.fieldQuality.pe !==
            "conflict",
      ),

    fieldQualityPresent:
      results.every(
        (item) =>
          Object.keys(
            item.fieldQuality,
          ).length > 0,
      ),
  };

  const semanticPass =
    Object.values(
      semanticChecks,
    ).every(Boolean);

  const finalPass =
    allPassed &&
    semanticPass;

  return NextResponse.json(
    {
      success:
        finalPass,

      verified:
        finalPass,

      code:
        finalPass
          ? "C147_2_7_MARKET_SEMANTIC_NORMALIZATION_PASS"
          : "C147_2_7_MARKET_SEMANTIC_NORMALIZATION_PARTIAL",

      stage:
        "C147.2.7",

      description:
        "Three-market semantic normalization, trading-session separation, field-confidence and conflict-guard regression.",

      total:
        CASES.length,

      passed,

      failed:
        CASES.length -
        passed,

      semanticChecks,

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
