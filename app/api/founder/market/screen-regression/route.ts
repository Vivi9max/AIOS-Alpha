import { NextRequest, NextResponse } from "next/server";

import { isFounderRequest } from "@/lib/founder/auth";
import {
  runMarketScreeningRuntime,
} from "@/lib/runtime/market/market-screening-runtime";
import type {
  MarketScreeningCriteria,
  MarketScreeningItem,
  MarketScreeningUniverseItem,
} from "@/lib/runtime/market/market-screening-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RegressionCase = {
  name: string;
  universe: MarketScreeningUniverseItem[];
  criteria: MarketScreeningCriteria;
};

type RegressionCheck = {
  name: string;
  passed: boolean;
  detail: string;
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
  checks: RegressionCheck[];
  decisions: Array<{
    symbol: string;
    market: string;
    decision: string;
    matchedCriteria: string[];
    failedCriteria: string[];
    missingCriteria: string[];
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

      minPe: null,

      /*
       * Intentionally restrictive.
       *
       * The purpose is not to judge NVDA.
       * The purpose is to prove that the
       * P/E filter actually executes and
       * can produce an exclusion.
       */
      maxPe: 10,
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

function buildDecisions(
  items: MarketScreeningItem[],
) {
  return items.map(
    (item) => ({
      symbol:
        item.symbol,

      market:
        item.market,

      decision:
        item.decision,

      matchedCriteria:
        item.matchedCriteria,

      failedCriteria:
        item.failedCriteria,

      missingCriteria:
        item.missingCriteria,

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
}

function check(
  name: string,
  passed: boolean,
  detail: string,
): RegressionCheck {
  return {
    name,
    passed,
    detail,
  };
}

function evaluateRegressionCase(
  testCase: RegressionCase,
  result: Awaited<
    ReturnType<
      typeof runMarketScreeningRuntime
    >
  >,
): RegressionCaseResult {
  const decisions =
    buildDecisions(
      result.items,
    );

  const checks: RegressionCheck[] =
    [];

  /*
   * ------------------------------------------------------------
   * Common structural verification
   * ------------------------------------------------------------
   */

  checks.push(
    check(
      "UNIVERSE_EVALUATED",
      result.universeSize > 0 &&
        result.evaluatedCount ===
          result.universeSize &&
        result.items.length ===
          result.evaluatedCount,
      `Universe ${result.universeSize}, evaluated ${result.evaluatedCount}, items ${result.items.length}.`,
    ),
  );

  checks.push(
    check(
      "DECISION_SCHEMA",
      result.items.every(
        (item) =>
          item.symbol.length > 0 &&
          (
            item.decision ===
              "candidate" ||
            item.decision ===
              "excluded" ||
            item.decision ===
              "insufficient-data"
          ),
      ),
      "Every evaluated item contains a valid symbol and screening decision.",
    ),
  );

  /*
   * ------------------------------------------------------------
   * C147.3.1 specific behavioral verification
   * ------------------------------------------------------------
   */

  switch (testCase.name) {
    case "MIXED_MARKET_UNIVERSE": {
      const markets =
        new Set(
          result.items.map(
            (item) =>
              item.market,
          ),
        );

      checks.push(
        check(
          "MIXED_MARKETS_PRESENT",
          markets.has("us") &&
            markets.has("hk") &&
            markets.has("cn"),
          "US, HK and CN market runtimes were all evaluated.",
        ),
      );

      checks.push(
        check(
          "EXPECTED_UNIVERSE_SIZE",
          result.universeSize === 4,
          `Expected 4 normalized symbols, received ${result.universeSize}.`,
        ),
      );

      break;
    }

    case "DUPLICATE_SYMBOL_GUARD": {
      const symbols =
        result.items.map(
          (item) =>
            item.symbol.toUpperCase(),
        );

      const uniqueSymbols =
        new Set(symbols);

      checks.push(
        check(
          "DUPLICATES_COLLAPSED",
          result.universeSize === 1 &&
            result.evaluatedCount === 1 &&
            result.items.length === 1 &&
            uniqueSymbols.size === 1 &&
            uniqueSymbols.has("NVDA"),
          `Duplicate normalization produced ${result.universeSize} unique universe item(s): ${symbols.join(", ") || "none"}.`,
        ),
      );

      break;
    }

    case "VALUATION_FILTER_EXECUTION": {
      const item =
        result.items[0];

      const peWasEvaluated =
        item?.matchedCriteria.includes(
          "pe",
        ) ||
        item?.failedCriteria.includes(
          "pe",
        ) ||
        item?.missingCriteria.includes(
          "pe",
        );

      checks.push(
        check(
          "PE_CRITERION_EVALUATED",
          peWasEvaluated === true,
          `P/E criterion state: matched=${item?.matchedCriteria.includes("pe") ?? false}, failed=${item?.failedCriteria.includes("pe") ?? false}, missing=${item?.missingCriteria.includes("pe") ?? false}.`,
        ),
      );

      checks.push(
        check(
          "VALUATION_FILTER_ACTIVE",
          item?.failedCriteria.includes(
            "pe",
          ) === true &&
            item?.decision ===
              "excluded",
          `Expected the restrictive max P/E filter to exclude the symbol; decision=${item?.decision ?? "missing"}.`,
        ),
      );

      break;
    }

    case "EVIDENCE_QUALITY_GATE": {
      const item =
        result.items[0];

      const sourceCount =
        item?.analysis
          ?.verification
          ?.sourceCount ?? 0;

      const independentDomains =
        item?.analysis
          ?.verification
          ?.independentDomains ?? 0;

      checks.push(
        check(
          "EVIDENCE_CRITERION_MATCHED",
          item?.matchedCriteria.includes(
            "evidence",
          ) === true,
          `Evidence criterion matched=${item?.matchedCriteria.includes("evidence") ?? false}.`,
        ),
      );

      checks.push(
        check(
          "SOURCE_THRESHOLD",
          sourceCount >= 3,
          `Evidence sources ${sourceCount} / required 3.`,
        ),
      );

      checks.push(
        check(
          "DOMAIN_THRESHOLD",
          independentDomains >= 2,
          `Independent domains ${independentDomains} / required 2.`,
        ),
      );

      break;
    }

    case "A_SHARE_RUNTIME": {
      const item =
        result.items[0];

      checks.push(
        check(
          "A_SHARE_SYMBOL",
          item?.symbol ===
            "600519.SH",
          `Resolved symbol=${item?.symbol ?? "missing"}.`,
        ),
      );

      checks.push(
        check(
          "A_SHARE_MARKET",
          item?.market ===
            "cn",
          `Resolved market=${item?.market ?? "missing"}.`,
        ),
      );

      break;
    }

    default:
      break;
  }

  const passed =
    checks.every(
      (item) =>
        item.passed,
    );

  return {
    name:
      testCase.name,

    passed,

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

    checks,

    decisions,
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

  const results:
    RegressionCaseResult[] =
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
          testCase,
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

        checks: [
          {
            name:
              "CASE_EXECUTION",
            passed:
              false,
            detail:
              error instanceof Error
                ? error.message
                : "Unknown regression error.",
          },
        ],

        decisions: [],

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

  const verified =
    results.length > 0 &&
    failed === 0;

  return NextResponse.json(
    {
      success:
        verified,

      code:
        verified
          ? "C147_3_1_MARKET_SCREENING_REGRESSION_PASS"
          : "C147_3_1_MARKET_SCREENING_REGRESSION_PARTIAL",

      stage:
        "C147.3.1",

      verified,

      passed,

      failed,

      total:
        results.length,

      latencyMs:
        Date.now() -
        startedAt,

      verificationMode:
        "behavioral",

      results,

      principle:
        "AIOS screening is an explainable research framework. It does not rank securities or issue automatic buy/sell instructions.",

      disclaimer:
        "AIOS screening provides transparent research and decision-support information. It does not constitute personalized investment advice.",
    },
    {
      status:
        verified
          ? 200
          : 422,
    },
  );
}
