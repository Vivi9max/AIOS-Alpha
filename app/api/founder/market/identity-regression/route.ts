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

type IdentityCase = {
  name: string;
  universe: MarketScreeningUniverseItem[];
  expectedDecision:
    | "candidate"
    | "insufficient-data";
  expectedSymbol: string;
  expectedMarket: "us" | "hk" | "cn";
};

type RegressionCheck = {
  name: string;
  passed: boolean;
  detail: string;
};

type IdentityCaseResult = {
  name: string;
  passed: boolean;
  code: string;
  decision: string;
  symbol: string;
  market: string;
  evidenceSources: number;
  independentDomains: number;
  identityReason: string;
  checks: RegressionCheck[];
  latencyMs: number;
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

const IDENTITY_CASES: IdentityCase[] = [
  {
    name: "US_IDENTITY_VERIFICATION",
    universe: [
      {
        symbol: "NVDA",
        market: "us",
      },
    ],
    expectedDecision: "candidate",
    expectedSymbol: "NVDA",
    expectedMarket: "us",
  },

  {
    name: "HK_IDENTITY_VERIFICATION",
    universe: [
      {
        symbol: "0700.HK",
        market: "hk",
      },
    ],
    expectedDecision: "candidate",
    expectedSymbol: "0700.HK",
    expectedMarket: "hk",
  },

  {
    name: "CN_IDENTITY_VERIFICATION",
    universe: [
      {
        symbol: "600519.SH",
        market: "cn",
      },
    ],
    expectedDecision: "candidate",
    expectedSymbol: "600519.SH",
    expectedMarket: "cn",
  },

  {
    name: "INVALID_SYMBOL_REJECTION",
    universe: [
      {
        symbol: "INVALID-AIOS-SYMBOL",
        market: "us",
      },
    ],
    expectedDecision: "insufficient-data",
    expectedSymbol: "INVALID-AIOS-SYMBOL",
    expectedMarket: "us",
  },
];

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

function extractIdentityReason(
  item: MarketScreeningItem | undefined,
): string {
  if (!item) {
    return "No screening item returned.";
  }

  return (
    item.reasons.find(
      (reason) =>
        reason.toLowerCase().includes(
          "identity",
        ) ||
        reason.toLowerCase().includes(
          "security",
        ) ||
        reason.toLowerCase().includes(
          "evidence",
        ),
    ) ??
    item.reasons[0] ??
    "No identity verification reason returned."
  );
}

function evaluateCase(
  testCase: IdentityCase,
  result: Awaited<
    ReturnType<
      typeof runMarketScreeningRuntime
    >
  >,
): IdentityCaseResult {
  const item =
    result.items[0];

  const sourceCount =
    item?.analysis
      ?.verification
      ?.sourceCount ??
    0;

  const independentDomains =
    item?.analysis
      ?.verification
      ?.independentDomains ??
    0;

  const identityReason =
    extractIdentityReason(
      item,
    );

  const checks: RegressionCheck[] =
    [];

  checks.push(
    check(
      "ITEM_RETURNED",
      Boolean(item),
      "Exactly one screening item is expected.",
    ),
  );

  checks.push(
    check(
      "SYMBOL_PRESERVED",
      item?.symbol ===
        testCase.expectedSymbol,
      `Expected symbol=${testCase.expectedSymbol}, received=${item?.symbol ?? "missing"}.`,
    ),
  );

  checks.push(
    check(
      "MARKET_PRESERVED",
      item?.market ===
        testCase.expectedMarket,
      `Expected market=${testCase.expectedMarket}, received=${item?.market ?? "missing"}.`,
    ),
  );

  checks.push(
    check(
      "EXPECTED_DECISION",
      item?.decision ===
        testCase.expectedDecision,
      `Expected decision=${testCase.expectedDecision}, received=${item?.decision ?? "missing"}.`,
    ),
  );

  if (
    testCase.expectedDecision ===
    "candidate"
  ) {
    checks.push(
      check(
        "IDENTITY_EVIDENCE_PRESENT",
        sourceCount >= 3 &&
          independentDomains >= 2,
        `Identity-capable evidence returned ${sourceCount} sources across ${independentDomains} independent domains.`,
      ),
    );

    checks.push(
      check(
        "NOT_INSUFFICIENT",
        item?.decision !==
          "insufficient-data",
        "Valid securities must not be downgraded to insufficient-data when identity evidence is present.",
      ),
    );
  }

  if (
    testCase.expectedDecision ===
    "insufficient-data"
  ) {
    checks.push(
      check(
        "GENERIC_EVIDENCE_REJECTED",
        item?.decision ===
          "insufficient-data",
        "Generic financial evidence must not establish identity for an invalid security symbol.",
      ),
    );

    checks.push(
      check(
        "NO_CANDIDATE_LEAK",
        item?.decision !==
          "candidate",
        "Invalid security identity must never become a screening candidate.",
      ),
    );

    checks.push(
      check(
        "IDENTITY_REASON_PRESENT",
        identityReason.length > 0 &&
          (
            identityReason
              .toLowerCase()
              .includes(
                "identity",
              ) ||
            identityReason
              .toLowerCase()
              .includes(
                "security",
              )
          ),
        `Identity guard reason=${identityReason}`,
      ),
    );
  }

  return {
    name:
      testCase.name,

    passed:
      checks.every(
        (item) =>
          item.passed,
      ),

    code:
      result.code,

    decision:
      item?.decision ??
      "missing",

    symbol:
      item?.symbol ??
      "missing",

    market:
      item?.market ??
      "missing",

    evidenceSources:
      sourceCount,

    independentDomains,

    identityReason,

    checks,

    latencyMs:
      result.runtime.latencyMs,
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
    IdentityCaseResult[] =
    [];

  for (
    const testCase of IDENTITY_CASES
  ) {
    try {
      const result =
        await runMarketScreeningRuntime(
          {
            universe:
              testCase.universe,

            criteria:
              BASE_CRITERIA,

            mode:
              "full",
          },
        );

      results.push(
        evaluateCase(
          testCase,
          result,
        ),
      );
    } catch (error) {
      results.push({
        name:
          testCase.name,

        passed: false,

        code:
          "C147_3_3_CASE_ERROR",

        decision:
          "error",

        symbol:
          testCase.expectedSymbol,

        market:
          testCase.expectedMarket,

        evidenceSources: 0,
        independentDomains: 0,

        identityReason:
          error instanceof Error
            ? error.message
            : "Unknown regression error.",

        checks: [
          {
            name:
              "CASE_EXECUTION",
            passed: false,
            detail:
              error instanceof Error
                ? error.message
                : "Unknown regression error.",
          },
        ],

        latencyMs: 0,
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
          ? "C147_3_3_MARKET_IDENTITY_REGRESSION_PASS"
          : "C147_3_3_MARKET_IDENTITY_REGRESSION_PARTIAL",

      stage:
        "C147.3.3",

      verified,

      passed,

      failed,

      total:
        results.length,

      verificationMode:
        "behavioral",

      runtimeMs:
        Date.now() -
        startedAt,

      results,

      principle:
        "AIOS requires security identity evidence before a market item can enter screening. Generic financial evidence is not sufficient.",

      disclaimer:
        "AIOS market screening provides transparent research and decision-support information. It does not constitute personalized investment advice or automatic trading instructions.",
    },
    {
      status:
        verified
          ? 200
          : 422,
    },
  );
}
