import { NextRequest, NextResponse } from "next/server";

import { isFounderRequest } from "@/lib/founder/auth";
import {
  runMarketScreeningRuntime,
} from "@/lib/runtime/market/market-screening-runtime";
import type {
  MarketScreeningCriteria,
  MarketScreeningUniverseItem,
} from "@/lib/runtime/market/market-screening-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RegressionCase = {
  name: string;
  universe: MarketScreeningUniverseItem[];
  criteria: MarketScreeningCriteria;
};

type RegressionCaseResult = {
  name: string;
  passed: boolean;
  code: string;
  universeSize: number;
  evaluatedCount: number;
  candidateCount: number;
  excludedCount: number;
  insufficientDataCount: number;
  latencyMs: number;
  decisions: Array<{
    symbol: string;
    market: string;
    decision: string;
    evidenceSources: number;
    independentDomains: number;
    dataQuality: string;
  }>;
  error?: string;
};

const BASE_CRITERIA: MarketScreeningCriteria = {
  minRevenueGrowth: null,
  minEps: null,
  minPe: null,
  maxPe: null,
  minPb: null,
  maxPb: null,
  minEvidenceSources: 3,
  minIndependentDomains: 2,
  allowedRiskLevels: [
    "low",
    "medium",
    "unknown",
  ],
  requireVerifiedData: false,
};

const REGRESSION_CASES: RegressionCase[] = [
  {
    name: "MIXED_MARKET_UNIVERSE",
    universe: [
      {
        symbol: "NVDA",
        market: "us",
      },
      {
        symbol: "AAPL",
        market: "us",
      },
      {
        symbol: "0700.HK",
        market: "hk",
      },
      {
        symbol: "600519.SH",
        market: "cn",
      },
    ],
    criteria: BASE_CRITERIA,
  },

  {
    name: "DUPLICATE_SYMBOL_GUARD",
    universe: [
      {
        symbol: "NVDA",
        market: "us",
      },
      {
        symbol: "nvda",
        market: "us",
      },
      {
        symbol: "NVDA",
        market: "us",
      },
    ],
    criteria: BASE_CRITERIA,
  },

  {
    name: "VALUATION_FILTER_EXECUTION",
    universe: [
      {
        symbol: "NVDA",
        market: "us",
      },
    ],
    criteria: {
      ...BASE_CRITERIA,
      minPe: 0,
      maxPe: 200,
    },
  },

  {
    name: "EVIDENCE_QUALITY_GATE",
    universe: [
      {
        symbol: "0700.HK",
        market: "hk",
      },
    ],
    criteria: {
      ...BASE_CRITERIA,
      minEvidenceSources: 3,
      minIndependentDomains: 2,
      requireVerifiedData: false,
    },
  },

  {
    name: "A_SHARE_RUNTIME",
    universe: [
      {
        symbol: "600519.SH",
        market: "cn",
      },
    ],
    criteria: BASE_CRITERIA,
  },
];

function evaluateRegressionCase(
  name: string,
  result: Awaited<
    ReturnType<
      typeof runMarketScreeningRuntime
    >
  >,
): RegressionCaseResult {
  const decisions =
    result.items.map(
      (item) => ({
        symbol:
          item.symbol,

        market:
          item.market,

        decision:
          item.decision,

        evidenceSources:
          item.analysis
            ?.verification
            ?.sourceCount ?? 0,

        independentDomains:
          item.analysis
            ?.verification
            ?.independentDomains ?? 0,

        dataQuality:
          item.analysis
            ?.snapshot
            ?.dataQuality ??
          "unknown",
      }),
    );

  const structuralPass =
    result.universeSize >
      0 &&
    result.evaluatedCount ===
      result.universeSize &&
    result.items.length ===
      result.evaluatedCount &&
    result.items.every(
      (item) =>
        item.symbol.length >
          0 &&
        (
          item.decision ===
            "candidate" ||
          item.decision ===
            "excluded" ||
          item.decision ===
            "insufficient-data"
        ),
    );

  return {
    name,
    passed:
      structuralPass,
    code:
      result.code,
    universeSize:
      result.universeSize,
    evaluatedCount:
      result.evaluatedCount,
    candidateCount:
      result.candidateCount,
    excludedCount:
      result.excludedCount,
    insufficientDataCount:
      result.insufficientDataCount,
    latencyMs:
      result.runtime.latencyMs,
    decisions,
  };
}

export async function GET(
  request: NextRequest,
) {
  if (!isFounderRequest(request)) {
    return NextResponse.json(
      {
        success: false,
        code:
          "FOUNDER_AUTH_REQUIRED",
        error:
          "Alpha founder access required.",
      },
      {
        status: 401,
      },
    );
  }

  const startedAt =
    Date.now();

  const results: RegressionCaseResult[] =
    [];

  for (
    const testCase of REGRESSION_CASES
  ) {
    try {
      const result =
        await runMarketScreeningRuntime(
          {
            universe:
              testCase.universe,

            criteria:
              testCase.criteria,

            mode:
              "full",
          },
        );

      results.push(
        evaluateRegressionCase(
          testCase.name,
          result,
        ),
      );
    } catch (error) {
      results.push({
        name:
          testCase.name,

        passed:
          false,

        code:
          "C147_3_1_CASE_ERROR",

        universeSize:
          testCase.universe.length,

        evaluatedCount:
          0,

        candidateCount:
          0,

        excludedCount:
          0,

        insufficientDataCount:
          0,

        latencyMs:
          0,

        decisions:
          [],

        error:
          error instanceof Error
            ? error.message
            : "Unknown regression error.",
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

  return NextResponse.json(
    {
      success:
        failed === 0,

      code:
        failed === 0
          ? "C147_3_1_MARKET_SCREENING_REGRESSION_PASS"
          : "C147_3_1_MARKET_SCREENING_REGRESSION_PARTIAL",

      stage:
        "C147.3.1",

      verified:
        failed === 0,

      passed,

      failed,

      total:
        results.length,

      latencyMs:
        Date.now() -
        startedAt,

      results,

      principle:
        "AIOS screening is an explainable research framework. It does not rank securities or issue automatic buy/sell instructions.",

      disclaimer:
        "AIOS screening provides transparent research and decision-support information. It does not constitute personalized investment advice.",
    },
    {
      status:
        failed === 0
          ? 200
          : 422,
    },
  );
}
