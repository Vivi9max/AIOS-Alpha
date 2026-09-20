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

function headers() {
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
      headers: headers(),
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

  for (const item of CASES) {
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

        changePercent:
          result.snapshot
            .changePercent,

        pe:
          result.snapshot
            .pe,

        pb:
          result.snapshot
            .pb,

        eps:
          result.snapshot
            .eps,

        fieldQuality:
          result.snapshot
            .fieldQuality ?? {},

        structuredDataVerified:
          result.verification
            .structuredDataVerified,

        webEvidence:
          result.evidence.length > 0,

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
          "C147_2_6_CASE_ERROR",

        dataQuality:
          "insufficient",

        price:
          null,

        changePercent:
          null,

        pe:
          null,

        pb:
          null,

        eps:
          null,

        fieldQuality:
          {},

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
            "Normalization regression case failed.",
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

  return NextResponse.json(
    {
      success:
        allPassed,

      verified:
        allPassed,

      code:
        allPassed
          ? "C147_2_6_MARKET_NORMALIZATION_PASS"
          : "C147_2_6_MARKET_NORMALIZATION_PARTIAL",

      stage:
        "C147.2.6",

      description:
        "Three-market market-data normalization, field-confidence and conflict-guard regression.",

      total:
        CASES.length,

      passed,

      failed:
        CASES.length -
        passed,

      normalization:
        {
          perSourceExtraction:
            true,

          conflictGuard:
            true,

          genericPeSubstringMatch:
            false,

          annualChangeAsDailyChange:
            false,

          unresolvedConflictsBecomeNull:
            true,
        },

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
        allPassed
          ? 200
          : 207,

      headers:
        headers(),
    },
  );
}
