import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireFounderAuth,
} from "@/lib/founder/auth";

import {
  runMarketDecisionSupport,
} from "@/lib/runtime/market/market-decision-support-runtime";

type Check = {
  name: string;
  passed: boolean;
  detail: string;
};

async function runCase(
  name: string,
  universe: Array<{
    symbol: string;
    market: "us" | "hk" | "cn";
  }>,
): Promise<{
  name: string;
  passed: boolean;
  checks: Check[];
  latencyMs: number;
}> {
  const startedAt =
    Date.now();

  const result =
    await runMarketDecisionSupport({
      universe,

      includeExcluded: true,

      includeInsufficientData:
        true,
    });

  const checks: Check[] =
    [];

  const item =
    result.items[0];

  checks.push({
    name: "ITEM_RETURNED",
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

export async function POST(
  request: NextRequest,
) {
  const auth =
    requireFounderAuth(
      request,
    );

  if (!auth.ok) {
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

      await runCase(
        "INVALID_SECURITY_GUARD",
        [
          {
            symbol:
              "INVALID-AIOS-SYMBOL",
            market: "us",
          },
        ],
      ),

      await runCase(
        "HUMAN_REVIEW_GATE",
        [
          {
            symbol: "AAPL",
            market: "us",
          },
        ],
      ),
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
        "C147.5",

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
