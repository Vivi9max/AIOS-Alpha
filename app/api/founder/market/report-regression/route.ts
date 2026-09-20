import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketScreeningResearchReport,
} from "@/lib/runtime/market/market-screening-report-runtime";

import type {
  MarketScreeningCriteria,
  MarketScreeningRequest,
  MarketScreeningUniverseItem,
} from "@/lib/runtime/market/market-screening-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RegressionCheck = {
  name: string;
  passed: boolean;
  detail: string;
};

type RegressionCaseResult = {
  name: string;
  passed: boolean;
  code: string;
  checks: RegressionCheck[];
  universeSize: number;
  evaluatedCount: number;
  candidateCount: number;
  excludedCount: number;
  insufficientDataCount: number;
  totalSources: number;
  verifiedCount: number;
  knownTimestampCount: number;
  latencyMs: number;
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

const BASE_UNIVERSE:
  MarketScreeningUniverseItem[] = [
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
  ];

const REGRESSION_CASES: Array<{
  name: string;
  request: MarketScreeningRequest;
}> = [
  {
    name: "REPORT_STRUCTURE",
    request: {
      universe:
        BASE_UNIVERSE,
      criteria:
        BASE_CRITERIA,
      mode: "full",
    },
  },

  {
    name: "REPORT_MIXED_MARKET",
    request: {
      universe:
        BASE_UNIVERSE,
      criteria:
        BASE_CRITERIA,
      mode: "full",
    },
  },

  {
    name: "REPORT_EXCLUSION_PROPAGATION",
    request: {
      universe: [
        {
          symbol: "NVDA",
          market: "us",
        },
      ],
      criteria: {
        ...BASE_CRITERIA,
        maxPe: 10,
      },
      mode: "full",
    },
  },

  {
    name: "REPORT_INSUFFICIENT_DATA_PROPAGATION",
    request: {
      universe: [
        {
          symbol:
            "INVALID-AIOS-SYMBOL",
          market: "us",
        },
      ],
      criteria:
        BASE_CRITERIA,
      mode: "full",
    },
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

async function executeCase(
  name: string,
  request: MarketScreeningRequest,
): Promise<RegressionCaseResult> {
  const startedAt =
    Date.now();

  const report =
    await runMarketScreeningResearchReport(
      {
        screening:
          request,
        title:
          `C147.3.2 Regression · ${name}`,
      },
    );

  const checks:
    RegressionCheck[] = [];

  const summary =
    report.report;

  const allItems = [
    ...summary.candidates,
    ...summary.excluded,
    ...summary.insufficientData,
  ];

  const totalSources =
    summary.evidenceSummary
      .totalSources;

  const verifiedCount =
    summary.evidenceSummary
      .verifiedCount;

  const knownTimestampCount =
    summary.freshnessSummary
      .knownAsOfCount;

  checks.push(
    check(
      "REPORT_SUCCESS",
      report.success === true,
      `Report success=${report.success}.`,
    ),
  );

  checks.push(
    check(
      "REPORT_CODE",
      [
        "C147_3_2_REPORT_PASS",
        "C147_3_2_REPORT_PARTIAL",
        "C147_3_2_REPORT_INSUFFICIENT",
      ].includes(
        report.code,
      ),
      `Report code=${report.code}.`,
    ),
  );

  checks.push(
    check(
      "ITEM_PARTITION_INTEGRITY",
      allItems.length ===
        summary.evaluatedCount,
      `Candidates ${summary.candidateCount} + excluded ${summary.excludedCount} + insufficient ${summary.insufficientDataCount} = ${allItems.length}; evaluated=${summary.evaluatedCount}.`,
    ),
  );

  switch (name) {
    case "REPORT_STRUCTURE":
      checks.push(
        check(
          "UNIVERSE_SIZE",
          summary.universeSize === 4,
          `Expected universe size 4, received ${summary.universeSize}.`,
        ),
      );

      checks.push(
        check(
          "EVIDENCE_PROPAGATED",
          totalSources >= 12,
          `Expected at least 12 evidence sources, received ${totalSources}.`,
        ),
      );

      checks.push(
        check(
          "VERIFICATION_PROPAGATED",
          verifiedCount ===
            summary.evaluatedCount,
          `Verified ${verifiedCount}/${summary.evaluatedCount}.`,
        ),
      );

      break;

    case "REPORT_MIXED_MARKET": {
      const markets =
        new Set(
          allItems.map(
            (item) =>
              item.market,
          ),
        );

      checks.push(
        check(
          "US_MARKET_PRESENT",
          markets.has("us"),
          "US market propagated into the report.",
        ),
      );

      checks.push(
        check(
          "HK_MARKET_PRESENT",
          markets.has("hk"),
          "HK market propagated into the report.",
        ),
      );

      checks.push(
        check(
          "CN_MARKET_PRESENT",
          markets.has("cn"),
          "CN market propagated into the report.",
        ),
      );

      checks.push(
        check(
          "HUMAN_DECISION_GATE",
          summary.humanDecisionRequired ===
            true,
          "Human decision gate remains enabled.",
        ),
      );

      break;
    }

    case "REPORT_EXCLUSION_PROPAGATION": {
      const excluded =
        summary.excluded[0];

      checks.push(
        check(
          "EXCLUDED_ITEM_PRESENT",
          Boolean(excluded),
          "Restrictive valuation rule produced an excluded report item.",
        ),
      );

      checks.push(
        check(
          "PE_FAILURE_PROPAGATED",
          excluded?.failedCriteria.includes(
            "pe",
          ) === true,
          "P/E failure propagated from Screening Runtime into Research Report.",
        ),
      );

      checks.push(
        check(
          "EXCLUSION_COUNT",
          summary.excludedCount ===
            1,
          `Excluded count=${summary.excludedCount}.`,
        ),
      );

      break;
    }

    case "REPORT_INSUFFICIENT_DATA_PROPAGATION": {
      checks.push(
        check(
          "INSUFFICIENT_ITEM_PRESENT",
          summary.insufficientDataCount ===
            1,
          `Insufficient-data count=${summary.insufficientDataCount}.`,
        ),
      );

      checks.push(
        check(
          "INSUFFICIENT_REPORT_CODE",
          report.code ===
            "C147_3_2_REPORT_PARTIAL" ||
            report.code ===
              "C147_3_2_REPORT_INSUFFICIENT",
          `Insufficient-data propagation code=${report.code}.`,
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
    name,

    passed,

    code:
      report.code,

    checks,

    universeSize:
      summary.universeSize,

    evaluatedCount:
      summary.evaluatedCount,

    candidateCount:
      summary.candidateCount,

    excludedCount:
      summary.excludedCount,

    insufficientDataCount:
      summary.insufficientDataCount,

    totalSources,

    verifiedCount,

    knownTimestampCount,

    latencyMs:
      Date.now() -
      startedAt,
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
    RegressionCaseResult[] = [];

  for (
    const testCase of
      REGRESSION_CASES
  ) {
    try {
      results.push(
        await executeCase(
          testCase.name,
          testCase.request,
        ),
      );
    } catch (error) {
      results.push({
        name:
          testCase.name,

        passed:
          false,

        code:
          "C147_3_2_CASE_ERROR",

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

        universeSize:
          testCase.request
            .universe.length,

        evaluatedCount:
          0,

        candidateCount:
          0,

        excludedCount:
          0,

        insufficientDataCount:
          0,

        totalSources:
          0,

        verifiedCount:
          0,

        knownTimestampCount:
          0,

        latencyMs:
          0,

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
          ? "C147_3_2_REPORT_REGRESSION_PASS"
          : "C147_3_2_REPORT_REGRESSION_PARTIAL",

      stage:
        "C147.3.2.1",

      verified,

      passed,

      failed,

      total:
        results.length,

      verificationMode:
        "behavioral",

      latencyMs:
        Date.now() -
        startedAt,

      results,

      principle:
        "The research report must preserve screening evidence, decisions, exclusions, missing-data states, freshness information, and the human decision gate without ranking securities or issuing automatic trading instructions.",

      disclaimer:
        "AIOS research reports provide transparent decision-support information and do not constitute personalized investment advice or automatic trading instructions.",
    },
    {
      status:
        verified
          ? 200
          : 422,
    },
  );
}
