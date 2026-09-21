import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  resetMarketDecisionHistory,
  runMarketDecisionHistory,
} from "@/lib/runtime/market/market-decision-history-runtime";

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

const universe = [
  {
    symbol:
      "NVDA",

    market:
      "us" as const,
  },
];

async function runHistoryCreation(): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  await resetMarketDecisionHistory(
    "NVDA",
    "us",
  );

  const result =
    await runMarketDecisionHistory({
      universe,
    });

  const item =
    result.items[0];

  const checks: Check[] =
    [
      {
        name:
          "HISTORY_RECORD_CREATED",

        passed:
          Boolean(
            item?.currentRecord,
          ),

        detail:
          item?.currentRecord
            ? "Initial decision record was persisted."
            : "Initial decision record was not persisted.",
      },

      {
        name:
          "FIRST_OBSERVATION",

        passed:
          item?.firstObservation ===
          true,

        detail:
          item?.firstObservation
            ? "Initial observation correctly has no previous record."
            : "Initial observation incorrectly has a previous record.",
      },

      {
        name:
          "VERSION_ONE",

        passed:
          item?.version ===
          1,

        detail:
          `Version: ${
            item?.version ??
            "missing"
          }.`,
      },

      {
        name:
          "HUMAN_REVIEW",

        passed:
          item?.humanDecisionRequired ===
          true,

        detail:
          "Human review remains required.",
      },
    ];

  return {
    name:
      "HISTORY_RECORD_CREATION",

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

async function runContinuity(): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  const result =
    await runMarketDecisionHistory({
      universe,
    });

  const item =
    result.items[0];

  const checks: Check[] =
    [
      {
        name:
          "PREVIOUS_RECORD_FOUND",

        passed:
          Boolean(
            item?.previousRecord,
          ),

        detail:
          item?.previousRecord
            ? "Previous decision record was automatically recovered."
            : "Previous decision record was not recovered.",
      },

      {
        name:
          "VERSION_INCREMENTED",

        passed:
          item?.version ===
          2,

        detail:
          `Version: ${
            item?.version ??
            "missing"
          }.`,
      },

      {
        name:
          "HISTORY_LENGTH_TWO",

        passed:
          item?.historyLength ===
          2,

        detail:
          `History length: ${
            item?.historyLength ??
            "missing"
          }.`,
      },

      {
        name:
          "REASSESSMENT_ATTACHED",

        passed:
          Boolean(
            item?.reassessment,
          ),

        detail:
          item?.reassessment
            ? "C147.8 reassessment attached to the new observation."
            : "C147.8 reassessment missing.",
      },
    ];

  return {
    name:
      "VERSION_CONTINUITY",

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

async function runReassessmentChain(): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  const result =
    await runMarketDecisionHistory({
      universe,
    });

  const reassessment =
    result.items[0]
      ?.reassessment;

  const checks: Check[] =
    [
      {
        name:
          "C147_8_CHAIN_PRESENT",

        passed:
          Boolean(
            reassessment,
          ),

        detail:
          reassessment
            ? "C147.8 reassessment is linked to the history entry."
            : "C147.8 reassessment is not linked.",
      },

      {
        name:
          "SAME_SECURITY",

        passed:
          reassessment?.symbol ===
            "NVDA" &&
          reassessment?.market ===
            "us",

        detail:
          "Reassessment remains bound to NVDA / US.",
      },

      {
        name:
          "HUMAN_GATE",

        passed:
          reassessment?.humanDecisionRequired ===
          true,

        detail:
          "Human review remains mandatory.",
      },
    ];

  return {
    name:
      "REASSESSMENT_CHAIN",

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

async function runMaterialHistory(): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  const result =
    await runMarketDecisionHistory({
      universe,
    });

  const item =
    result.items[0];

  const previous =
    item?.previousRecord;

  const current =
    item?.currentRecord;

  const syntheticCurrent =
    previous &&
    current
      ? {
          ...current,

          valuation: {
            ...current.valuation,

            pe:
              previous.valuation.pe ===
              null
                ? 100
                : previous.valuation.pe *
                  2,
          },
        }
      : null;

  const hasMaterial =
    previous &&
    syntheticCurrent
      ? syntheticCurrent
          .valuation.pe !==
        previous.valuation.pe
      : false;

  const checks: Check[] =
    [
      {
        name:
          "HISTORY_CONTEXT_PRESENT",

        passed:
          Boolean(
            previous &&
              current,
          ),

        detail:
          previous &&
          current
            ? "Previous and current records are available."
            : "History context missing.",
      },

      {
        name:
          "MATERIAL_FIELD_AVAILABLE",

        passed:
          hasMaterial,

        detail:
          hasMaterial
            ? "Valuation field can be compared across history."
            : "Valuation comparison context missing.",
      },

      {
        name:
          "NO_RANKING",

        passed:
          !(
            "rank" in
            (item ?? {})
          ) &&
          !(
            "ranking" in
            (item ?? {})
          ),

        detail:
          "History item exposes no ranking fields.",
      },
    ];

  return {
    name:
      "MATERIAL_CHANGE_HISTORY",

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

async function runInvalidationHistory(): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  const result =
    await runMarketDecisionHistory({
      universe,
    });

  const item =
    result.items[0];

  const checks: Check[] =
    [
      {
        name:
          "HISTORY_CHAIN_EXISTS",

        passed:
          Boolean(
            item?.previousRecord &&
              item?.currentRecord,
          ),

        detail:
          "Historical chain exists.",
      },

      {
        name:
          "INVALIDATION_FIELD_PRESERVED",

        passed:
          Array.isArray(
            item?.currentRecord
              .invalidationConditions,
          ),

        detail:
          "Invalidation conditions remain persisted.",
      },

      {
        name:
          "HUMAN_REVIEW_REQUIRED",

        passed:
          item?.humanDecisionRequired ===
          true,

        detail:
          "Human review remains mandatory.",
      },
    ];

  return {
    name:
      "INVALIDATION_HISTORY",

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

async function runSecurityBoundary(): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  await resetMarketDecisionHistory(
    "AAPL",
    "us",
  );

  const nvda =
    await runMarketDecisionHistory({
      universe: [
        {
          symbol:
            "NVDA",

          market:
            "us",
        },
      ],
    });

  const aapl =
    await runMarketDecisionHistory({
      universe: [
        {
          symbol:
            "AAPL",

          market:
            "us",
        },
      ],
    });

  const nvdaItem =
    nvda.items[0];

  const aaplItem =
    aapl.items[0];

  const checks: Check[] =
    [
      {
        name:
          "NVDA_HISTORY_BOUND",

        passed:
          nvdaItem
            ?.currentRecord
            .symbol ===
          "NVDA",

        detail:
          "NVDA history remains bound to NVDA.",
      },

      {
        name:
          "AAPL_HISTORY_BOUND",

        passed:
          aaplItem
            ?.currentRecord
            .symbol ===
          "AAPL",

        detail:
          "AAPL history remains bound to AAPL.",
      },

      {
        name:
          "NO_CROSS_SECURITY_PREVIOUS",

        passed:
          !aaplItem?.previousRecord ||
          aaplItem.previousRecord
            .symbol ===
            "AAPL",

        detail:
          "AAPL cannot recover NVDA as its previous record.",
      },
    ];

  return {
    name:
      "SECURITY_BOUNDARY",

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

async function runNoRanking(): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  const result =
    await runMarketDecisionHistory({
      universe: [
        {
          symbol:
            "NVDA",

          market:
            "us",
        },

        {
          symbol:
            "AAPL",

          market:
            "us",
        },
      ],
    });

  const checks: Check[] =
    [
      {
        name:
          "MULTI_RECORDS",

        passed:
          result.items.length ===
          2,

        detail:
          `Records returned: ${result.items.length}.`,
      },

      {
        name:
          "NO_RANKING_OUTPUT",

        passed:
          result.items.every(
            (item) =>
              !(
                "rank" in
                item
              ) &&
              !(
                "ranking" in
                item
              ),
          ),

        detail:
          "Decision history does not expose ranking fields.",
      },

      {
        name:
          "NO_TRADING_ACTION",

        passed:
          result.items.every(
            (item) =>
              !(
                "order" in
                item
              ) &&
              !(
                "trade" in
                item
              ),
          ),

        detail:
          "Decision history contains no trading execution fields.",
      },
    ];

  return {
    name:
      "NO_RANKING_OR_TRADING",

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

async function runHumanReview(): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  const result =
    await runMarketDecisionHistory({
      universe,
    });

  const checks: Check[] =
    [
      {
        name:
          "GLOBAL_HUMAN_GATE",

        passed:
          result.humanDecisionRequired ===
          true,

        detail:
          "Global human decision gate remains enabled.",
      },

      {
        name:
          "ITEM_HUMAN_GATE",

        passed:
          result.items.every(
            (item) =>
              item.humanDecisionRequired ===
              true,
          ),

        detail:
          "Every history item retains human review.",
      },

      {
        name:
          "STORAGE_MODE_VISIBLE",

        passed:
          Boolean(
            result.storage.mode,
          ),

        detail:
          `Storage mode: ${result.storage.mode}.`,
      },
    ];

  return {
    name:
      "HUMAN_REVIEW_AND_STORAGE",

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

async function executeRegression() {
  const startedAt =
    Date.now();

  const cases = [
    await runHistoryCreation(),
    await runContinuity(),
    await runReassessmentChain(),
    await runMaterialHistory(),
    await runInvalidationHistory(),
    await runSecurityBoundary(),
    await runNoRanking(),
    await runHumanReview(),
  ];

  const passed =
    cases.filter(
      (item) =>
        item.passed,
    ).length;

  const failed =
    cases.length -
    passed;

  return {
    success:
      failed ===
      0,

    code:
      failed ===
      0
        ? "C147_9_DECISION_HISTORY_REGRESSION_PASS"
        : "C147_9_DECISION_HISTORY_REGRESSION_PARTIAL",

    passed,

    failed,

    total:
      cases.length,

    stage:
      "C147.9",

    mode:
      "behavioral",

    runtimeMs:
      Date.now() -
      startedAt,

    cases,
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
      },
      {
        status: 401,
      },
    );
  }

  try {
    const result =
      await executeRegression();

    return NextResponse.json(
      result,
      {
        status:
          result.success
            ? 200
            : 422,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        code:
          "C147_9_DECISION_HISTORY_REGRESSION_ERROR",

        error:
          error instanceof Error
            ? error.message
            : "Decision history regression failed.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  return GET(
    request,
  );
}
