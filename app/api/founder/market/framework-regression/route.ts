import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketSelectionFramework,
} from "@/lib/runtime/market/market-selection-framework-runtime";

import type {
  MarketSelectionFrameworkRequest,
} from "@/lib/runtime/market/market-selection-framework-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Check = {
  name: string;
  passed: boolean;
  detail: string;
};

type CaseResult = {
  name: string;
  passed: boolean;
  checks: Check[];
  decision: string;
  stages: string[];
  latencyMs: number;
};

function check(
  name: string,
  passed: boolean,
  detail: string,
): Check {
  return {
    name,
    passed,
    detail,
  };
}

const BASE: MarketSelectionFrameworkRequest =
  {
    universe: [
      {
        symbol: "NVDA",
        market: "us",
      },
    ],

    criteria: {
      minRevenueGrowth:
        null,

      minEps:
        null,

      minPe:
        null,

      maxPe:
        null,

      minPb:
        null,

      maxPb:
        null,

      minEvidenceSources:
        3,

      minIndependentDomains:
        2,

      allowedRiskLevels:
        [
          "low",
          "medium",
          "unknown",
        ],

      requireVerifiedData:
        false,
    },
  };

const CASES:
  Array<{
    name: string;
    request: MarketSelectionFrameworkRequest;
    expected:
      | "research-candidate"
      | "excluded"
      | "insufficient-data";
  }> = [
    {
      name:
        "FRAMEWORK_FULL_PIPELINE",
      request:
        BASE,
      expected:
        "research-candidate",
    },

    {
      name:
        "VALUATION_GATE",
      request: {
        ...BASE,

        criteria: {
          ...BASE.criteria,

          maxPe:
            10,
        },
      },
      expected:
        "excluded",
    },

    {
      name:
        "INVALID_IDENTITY_GATE",
      request: {
        ...BASE,

        universe: [
          {
            symbol:
              "INVALID-AIOS-SYMBOL",
            market:
              "us",
          },
        ],
      },
      expected:
        "insufficient-data",
    },

    {
      name:
        "MULTI_MARKET_PIPELINE",
      request: {
        ...BASE,

        universe: [
          {
            symbol: "NVDA",
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
      },
      expected:
        "research-candidate",
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
    return NextResponse.json(
      {
        success: false,
        code:
          "FOUNDER_AUTH_REQUIRED",
      },
      {
        status: 401,
      },
    );
  }

  const started =
    Date.now();

  const results:
    CaseResult[] =
    [];

  for (
    const testCase of CASES
  ) {
    const caseStarted =
      Date.now();

    try {
      const result =
        await runMarketSelectionFramework(
          testCase.request,
        );

      const item =
        result.items[0];

      const stages =
        item?.stages ?? [];

      const stageNames =
        stages.map(
          (stage) =>
            `${stage.stage}:${stage.status}`,
        );

      const checks: Check[] =
        [];

      checks.push(
        check(
          "ITEM_RETURNED",
          Boolean(item),
          "Framework returned an evaluated item.",
        ),
      );

      checks.push(
        check(
          "EXPECTED_DECISION",
          item?.decision ===
            testCase.expected,
          `Expected ${testCase.expected}, received ${item?.decision ?? "missing"}.`,
        ),
      );

      checks.push(
        check(
          "INDUSTRY_STAGE",
          stages.some(
            (stage) =>
              stage.stage ===
              "industry",
          ),
          "Industry stage exists.",
        ),
      );

      checks.push(
        check(
          "COMPANY_STAGE",
          stages.some(
            (stage) =>
              stage.stage ===
              "company",
          ),
          "Company stage exists.",
        ),
      );

      checks.push(
        check(
          "FUNDAMENTALS_STAGE",
          stages.some(
            (stage) =>
              stage.stage ===
              "fundamentals",
          ),
          "Fundamentals stage exists.",
        ),
      );

      checks.push(
        check(
          "VALUATION_STAGE",
          stages.some(
            (stage) =>
              stage.stage ===
              "valuation",
          ),
          "Valuation stage exists.",
        ),
      );

      checks.push(
        check(
          "RISK_STAGE",
          stages.some(
            (stage) =>
              stage.stage ===
              "risk",
          ),
          "Risk stage exists.",
        ),
      );

      checks.push(
        check(
          "EVIDENCE_STAGE",
          stages.some(
            (stage) =>
              stage.stage ===
              "evidence",
          ),
          "Evidence stage exists.",
        ),
      );

      if (
        testCase.name ===
        "VALUATION_GATE"
      ) {
        const valuation =
          stages.find(
            (stage) =>
              stage.stage ===
              "valuation",
          );

        checks.push(
          check(
            "VALUATION_EXCLUSION",
            valuation?.status ===
              "failed",
            `Valuation status=${valuation?.status ?? "missing"}.`,
          ),
        );
      }

      if (
        testCase.name ===
        "INVALID_IDENTITY_GATE"
      ) {
        checks.push(
          check(
            "IDENTITY_REJECTED",
            item?.decision ===
              "insufficient-data",
            "Invalid identity cannot become a research candidate.",
          ),
        );
      }

      const passed =
        checks.every(
          (item) =>
            item.passed,
        );

      results.push({
        name:
          testCase.name,

        passed,

        checks,

        decision:
          item?.decision ??
          "missing",

        stages:
          stageNames,

        latencyMs:
          Date.now() -
          caseStarted,
      });
    } catch (error) {
      results.push({
        name:
          testCase.name,

        passed: false,

        checks: [
          check(
            "CASE_EXECUTION",
            false,
            error instanceof Error
              ? error.message
              : "Unknown regression error.",
          ),
        ],

        decision:
          "error",

        stages: [],

        latencyMs:
          Date.now() -
          caseStarted,
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
          ? "C147_4_MARKET_FRAMEWORK_REGRESSION_PASS"
          : "C147_4_MARKET_FRAMEWORK_REGRESSION_PARTIAL",

      stage:
        "C147.4",

      verified,

      passed,

      failed,

      total:
        results.length,

      verificationMode:
        "behavioral",

      runtimeMs:
        Date.now() -
        started,

      results,

      principle:
        "AIOS evaluates industry, company, fundamentals, valuation, risk and evidence as explainable research stages. It does not rank securities or issue automatic trading instructions.",
    },
    {
      status:
        verified
          ? 200
          : 422,
    },
  );
}
