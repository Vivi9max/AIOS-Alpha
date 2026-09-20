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

import type {
  MarketRegion,
} from "@/lib/runtime/market/market-types";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

type RegressionCase = {
  id: string;
  symbol: string;
  market: MarketRegion;
};

const CASES: RegressionCase[] = [
  {
    id: "US_NVDA",
    symbol: "NVDA",
    market: "us",
  },
  {
    id: "HK_TENCENT",
    symbol: "0700.HK",
    market: "hk",
  },
  {
    id: "CN_MOUTAI",
    symbol: "600519.SH",
    market: "cn",
  },
];

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

function summarizeResult(
  item: RegressionCase,
  result: Awaited<
    ReturnType<
      typeof analyzeMarketRequest
    >
  >,
) {
  return {
    id:
      item.id,

    symbol:
      item.symbol,

    market:
      item.market,

    success:
      result.success,

    code:
      result.code,

    verified:
      result.verification.verified,

    structuredDataAvailable:
      result.verification
        .structuredDataAvailable,

    structuredDataVerified:
      result.verification
        .structuredDataVerified,

    webEvidenceAvailable:
      result.evidence.length > 0,

    dataQuality:
      result.snapshot.dataQuality,

    liveQuoteAvailable:
      result.snapshot
        .liveQuoteAvailable,

    freshness:
      result.verification
        .freshness.freshness,

    ageMinutes:
      result.verification
        .freshness.ageMinutes,

    ageHours:
      result.verification
        .freshness.ageHours,

    freshnessReason:
      result.verification
        .freshness.reason,

    asOf:
      result.snapshot.asOf,

    source:
      result.snapshot.source,

    dataset:
      result.snapshot.dataset,

    provider:
      result.provider.provider,

    providerAvailable:
      result.provider.available,

    sourceCount:
      result.verification
        .sourceCount,

    independentDomains:
      result.verification
        .independentDomains,

    primarySourceFound:
      result.verification
        .primarySourceFound,

    price:
      result.snapshot.price,

    changePercent:
      result.snapshot.changePercent,

    error:
      result.error ?? null,
  };
}

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
        ...summarizeResult(
          item,
          result,
        ),

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

        code:
          "C147_2_4_CASE_ERROR",

        verified:
          false,

        structuredDataAvailable:
          false,

        structuredDataVerified:
          false,

        webEvidenceAvailable:
          false,

        dataQuality:
          "insufficient",

        liveQuoteAvailable:
          false,

        freshness:
          "unknown",

        ageMinutes:
          null,

        ageHours:
          null,

        freshnessReason:
          "Regression case failed before freshness assessment.",

        asOf:
          null,

        source:
          null,

        dataset:
          null,

        provider:
          "unknown",

        providerAvailable:
          false,

        sourceCount:
          0,

        independentDomains:
          0,

        primarySourceFound:
          false,

        price:
          null,

        changePercent:
          null,

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
          item.webEvidenceAvailable
        ),
    ).length;

  const allPassed =
    passed ===
    CASES.length;

  const structuredCount =
    results.filter(
      (item) =>
        item.structuredDataVerified,
    ).length;

  const webFallbackCount =
    results.filter(
      (item) =>
        !item.structuredDataVerified &&
        item.webEvidenceAvailable,
    ).length;

  const freshCount =
    results.filter(
      (item) =>
        item.freshness ===
        "fresh",
    ).length;

  const staleCount =
    results.filter(
      (item) =>
        item.freshness ===
        "stale",
    ).length;

  const unknownFreshnessCount =
    results.filter(
      (item) =>
        item.freshness ===
        "unknown",
    ).length;

  return NextResponse.json(
    {
      success:
        allPassed,

      verified:
        allPassed,

      code:
        allPassed
          ? "C147_2_4_MARKET_EVIDENCE_QUALITY_PASS"
          : "C147_2_4_MARKET_EVIDENCE_QUALITY_PARTIAL",

      stage:
        "C147.2.4",

      description:
        "US / HK / A-share market evidence, data-quality and freshness regression.",

      total:
        CASES.length,

      passed,

      failed:
        CASES.length -
        passed,

      structuredDataVerified:
        structuredCount,

      webFallback:
        webFallbackCount,

      fresh:
        freshCount,

      stale:
        staleCount,

      unknownFreshness:
        unknownFreshnessCount,

      liveQuoteVerified:
        results.filter(
          (item) =>
            item.liveQuoteAvailable,
        ).length,

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
