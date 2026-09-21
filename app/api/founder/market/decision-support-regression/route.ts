import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketDecisionSupport,
} from "@/lib/runtime/market/market-decision-support-runtime";

type Check = {
  name: string;
  passed: boolean;
  detail: string;
};

type RegressionCase = {
  name: string;
  passed: boolean;
  checks: Check[];
  latencyMs: number;
};

async function runCase(
  name: string,
  universe: Array<{
    symbol: string;
    market: "us" | "hk" | "cn";
  }>,
): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  const result =
    await runMarketDecisionSupport({
      universe,
      includeExcluded: true,
      includeInsufficientData: true,
    });

  const item =
    result.items[0];

  const checks: Check[] = [];

  checks.push({
    name:
      "ITEM_RETURNED",
    passed:
      Boolean(item),
    detail:
      item
        ? "Decision-support item returned."
        : "No decision-support item returned.",
  });

  checks.push({
    name:
      "CURRENT_STATE_PRESENT",
    passed:
      Boolean(
        item?.currentState,
      ),
    detail:
      item?.currentState
        ? "Current state is present."
        : "Current state is missing.",
  });

  checks.push({
    name:
      "INVALIDATION_PRESENT",
    passed:
      Boolean(
        item &&
          Array.isArray(
            item.invalidationConditions,
          ),
      ),
    detail:
      item
        ? "Invalidation conditions field exists."
        : "Item missing.",
  });

  checks.push({
    name:
      "WATCH_METRICS_PRESENT",
    passed:
      Boolean(
        item &&
          Array.isArray(
            item.watchMetrics,
          ),
      ),
    detail:
      item
        ? "Watch metrics field exists."
        : "Item missing.",
  });

  checks.push({
    name:
      "SCENARIOS_PRESENT",
    passed:
      Boolean(
        item &&
          Array.isArray(
            item.scenarios,
          ),
      ),
    detail:
      item
        ? "Scenario structure exists."
        : "Scenario structure missing.",
  });

  checks.push({
    name:
      "HUMAN_REVIEW_GATE",
    passed:
      item?.humanReviewRequired ===
      true,
    detail:
      item?.humanReviewRequired ===
      true
        ? "Human review is required."
        : "Human review gate is missing.",
  });

  checks.push({
    name:
      "DATA_QUALITY_PRESENT",
    passed:
      Boolean(
        item &&
          typeof item.dataQuality ===
            "string",
      ),
    detail:
      item
        ? `Data quality: ${item.dataQuality}.`
        : "Data quality field missing.",
  });

  checks.push({
    name:
      "EVIDENCE_STRUCTURE_PRESENT",
    passed:
      Boolean(
        item &&
          item.evidence &&
          typeof item.evidence.sourceCount ===
            "number" &&
          typeof item.evidence.independentDomains ===
            "number" &&
          typeof item.evidence.verified ===
            "boolean",
      ),
    detail:
      item
        ? "Evidence structure is present."
        : "Evidence structure is missing.",
  });

  checks.push({
    name:
      "FRESHNESS_STRUCTURE_PRESENT",
    passed:
      Boolean(
        item &&
          item.freshness &&
          typeof item.freshness.freshness ===
            "string",
      ),
    detail:
      item
        ? `Freshness: ${item.freshness.freshness}.`
        : "Freshness structure is missing.",
  });

  return {
    name,

    passed:
      checks.every(
        (check) =>
          check.passed,
      ),

    checks,

    latencyMs:
      Date.now() -
      startedAt,
  };
}

async function runIdentityGuardCase(): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  const result =
    await runMarketDecisionSupport({
      universe: [
        {
          symbol:
            "INVALID-AIOS-SYMBOL",
          market: "us",
        },
      ],
      includeExcluded: true,
      includeInsufficientData: true,
    });

  const item =
    result.items[0];

  const checks: Check[] = [];

  checks.push({
    name:
      "INVALID_SYMBOL_RETURNED",
    passed:
      Boolean(item),
    detail:
      item
        ? "Invalid-symbol item returned."
        : "Invalid-symbol item missing.",
  });

  checks.push({
    name:
      "INVALID_SYMBOL_NOT_CANDIDATE",
    passed:
      item?.state !==
      "research-candidate",
    detail:
      item
        ? `State: ${item.state}.`
        : "Item missing.",
  });

  checks.push({
    name:
      "INVALID_SYMBOL_INSUFFICIENT",
    passed:
      item?.state ===
      "insufficient-data",
    detail:
      item
        ? `Invalid symbol state: ${item.state}.`
        : "Item missing.",
  });

  checks.push({
    name:
      "IDENTITY_REASON_PRESENT",
    passed:
      Boolean(
        item?.currentState &&
          /identity|security/i.test(
            item.currentState,
          ),
      ),
    detail:
      item?.currentState ??
      "Identity rejection reason missing.",
  });

  return {
    name:
      "INVALID_SECURITY_IDENTITY_GATE",

    passed:
      checks.every(
        (check) =>
          check.passed,
      ),

    checks,

    latencyMs:
      Date.now() -
      startedAt,
  };
}

async function runQualityGateCase(): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  const result =
    await runMarketDecisionSupport({
      universe: [
        {
          symbol: "MSFT",
          market: "us",
        },
      ],
      includeExcluded: true,
      includeInsufficientData: true,
    });

  const item =
    result.items[0];

  const checks: Check[] = [];

  checks.push({
    name:
      "ITEM_RETURNED",
    passed:
      Boolean(item),
    detail:
      item
        ? "MSFT decision-support item returned."
        : "MSFT item missing.",
  });

  if (item) {
    const invalidCombination =
      item.dataQuality ===
        "insufficient" &&
      item.state ===
        "research-candidate";

    checks.push({
      name:
        "INSUFFICIENT_DATA_CANNOT_BE_CANDIDATE",
      passed:
        !invalidCombination,
      detail:
        invalidCombination
          ? "Quality gate failure: insufficient data was promoted to research-candidate."
          : `Quality gate enforced. State=${item.state}, DataQuality=${item.dataQuality}.`,
    });

    checks.push({
      name:
        "UNKNOWN_FRESHNESS_CANNOT_BE_CANDIDATE",
      passed:
        !(
          item.freshness.freshness ===
            "unknown" &&
          item.state ===
            "research-candidate"
        ),
      detail:
        item.freshness.freshness ===
          "unknown" &&
        item.state ===
          "research-candidate"
          ? "Quality gate failure: unknown freshness was promoted to research-candidate."
          : `Freshness gate enforced. Freshness=${item.freshness.freshness}.`,
    });
  }

  return {
    name:
      "DATA_QUALITY_FRESHNESS_GATE",

    passed:
      checks.every(
        (check) =>
          check.passed,
      ),

    checks,

    latencyMs:
      Date.now() -
      startedAt,
  };
}

export async function POST(
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
          "Founder authentication required.",
      },
      {
        status: 401,
      },
    );
  }

  const startedAt =
    Date.now();

  try {
    const cases = [
      await runCase(
        "DECISION_SUPPORT_STRUCTURE",
        [
          {
            symbol: "NVDA",
            market: "us",
          },
        ],
      ),

      await runCase(
        "MULTI_MARKET_SUPPORT",
        [
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
      ),

      await runIdentityGuardCase(),

      await runQualityGateCase(),
    ];

    const passed =
      cases.filter(
        (item) =>
          item.passed,
      ).length;

    const failed =
      cases.length -
      passed;

    return NextResponse.json({
      success:
        failed === 0,

      code:
        failed === 0
          ? "C147_5_DECISION_SUPPORT_REGRESSION_PASS"
          : "C147_5_DECISION_SUPPORT_REGRESSION_PARTIAL",

      passed,

      failed,

      total:
        cases.length,

      stage:
        "C147.5.5",

      mode:
        "behavioral",

      runtimeMs:
        Date.now() -
        startedAt,

      cases,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        code:
          "C147_5_DECISION_SUPPORT_REGRESSION_ERROR",

        error:
          error instanceof Error
            ? error.message
            : "Regression failed.",
      },
      {
        status: 500,
      },
    );
  }
}
