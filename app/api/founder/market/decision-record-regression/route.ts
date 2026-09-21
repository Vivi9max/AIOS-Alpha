import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketDecisionRecord,
} from "@/lib/runtime/market/market-decision-record-runtime";

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

async function runStructureCase(): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  const result =
    await runMarketDecisionRecord({
      universe: [
        {
          symbol: "NVDA",
          market: "us",
        },
      ],
    });

  const record =
    result.records[0];

  const checks: Check[] = [];

  checks.push({
    name:
      "RECORD_RETURNED",
    passed:
      Boolean(record),
    detail:
      record
        ? "Decision record returned."
        : "Decision record missing.",
  });

  checks.push({
    name:
      "CURRENT_STATE_PRESENT",
    passed:
      Boolean(
        record?.currentState,
      ),
    detail:
      record
        ? "Current state present."
        : "Current state missing.",
  });

  checks.push({
    name:
      "SUPPORTING_FACTORS_PRESENT",
    passed:
      Array.isArray(
        record?.supportingFactors,
      ),
    detail:
      record
        ? "Supporting factors array present."
        : "Supporting factors missing.",
  });

  checks.push({
    name:
      "RISKS_PRESENT",
    passed:
      Array.isArray(
        record?.risks,
      ),
    detail:
      record
        ? "Risk structure present."
        : "Risk structure missing.",
  });

  checks.push({
    name:
      "INVALIDATION_PRESENT",
    passed:
      Array.isArray(
        record?.invalidationConditions,
      ),
    detail:
      record
        ? "Invalidation conditions present."
        : "Invalidation conditions missing.",
  });

  checks.push({
    name:
      "WATCH_METRICS_PRESENT",
    passed:
      Array.isArray(
        record?.watchMetrics,
      ),
    detail:
      record
        ? "Watch metrics present."
        : "Watch metrics missing.",
  });

  checks.push({
    name:
      "SCENARIOS_PRESENT",
    passed:
      Array.isArray(
        record?.scenarios,
      ),
    detail:
      record
        ? "Conditional scenarios present."
        : "Scenarios missing.",
  });

  checks.push({
    name:
      "EVIDENCE_SNAPSHOT_PRESENT",
    passed:
      Boolean(
        record?.evidence &&
          typeof record.evidence.sourceCount ===
            "number" &&
          typeof record.evidence.independentDomains ===
            "number",
      ),
    detail:
      record
        ? "Evidence snapshot present."
        : "Evidence snapshot missing.",
  });

  checks.push({
    name:
      "HUMAN_DECISION_GATE",
    passed:
      record?.humanDecisionRequired ===
      true,
    detail:
      record?.humanDecisionRequired ===
      true
        ? "Human decision remains required."
        : "Human decision gate missing.",
  });

  return {
    name:
      "DECISION_RECORD_STRUCTURE",

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

async function runMultiMarketCase(): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  const result =
    await runMarketDecisionRecord({
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
    });

  const checks: Check[] = [];

  const markets =
    new Set(
      result.records.map(
        (record) =>
          record.market,
      ),
    );

  checks.push({
    name:
      "MULTI_MARKET_RECORDS",
    passed:
      result.records.length >= 3,
    detail:
      `Records returned: ${result.records.length}.`,
  });

  checks.push({
    name:
      "US_MARKET_PRESENT",
    passed:
      markets.has("us"),
    detail:
      `US present: ${markets.has("us")}.`,
  });

  checks.push({
    name:
      "HK_MARKET_PRESENT",
    passed:
      markets.has("hk"),
    detail:
      `HK present: ${markets.has("hk")}.`,
  });

  checks.push({
    name:
      "CN_MARKET_PRESENT",
    passed:
      markets.has("cn"),
    detail:
      `CN present: ${markets.has("cn")}.`,
  });

  checks.push({
    name:
      "NO_RANKING_OUTPUT",
    passed:
      !("rank" in result) &&
      !("ranking" in result),
    detail:
      "Decision records do not expose ranking fields.",
  });

  return {
    name:
      "MULTI_MARKET_DECISION_RECORD",

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

async function runIdentityCase(): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  const result =
    await runMarketDecisionRecord({
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

  const record =
    result.records[0];

  const checks: Check[] = [];

  checks.push({
    name:
      "INVALID_RECORD_RETURNED",
    passed:
      Boolean(record),
    detail:
      record
        ? "Invalid-security decision record returned."
        : "Invalid-security record missing.",
  });

  checks.push({
    name:
      "INVALID_NOT_REVIEW_READY",
    passed:
      record?.reviewStatus !==
      "review-ready",
    detail:
      record
        ? `Review status: ${record.reviewStatus}.`
        : "Review status missing.",
  });

  checks.push({
    name:
      "INVALID_STATE_BLOCKED",
    passed:
      record?.state ===
      "insufficient-data",
    detail:
      record
        ? `State: ${record.state}.`
        : "State missing.",
  });

  checks.push({
    name:
      "HUMAN_GATE_RETAINED",
    passed:
      record?.humanDecisionRequired ===
      true,
    detail:
      record?.humanDecisionRequired ===
      true
        ? "Human gate retained."
        : "Human gate missing.",
  });

  return {
    name:
      "IDENTITY_GATE_PROPAGATION",

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

async function runBoundaryCase(): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  const result =
    await runMarketDecisionRecord({
      universe: [
        {
          symbol: "NVDA",
          market: "us",
        },
      ],
    });

  const record =
    result.records[0];

  const checks: Check[] = [];

  checks.push({
    name:
      "DECISION_BOUNDARY_PRESENT",
    passed:
      Boolean(
        record?.decisionBoundary,
      ),
    detail:
      record
        ? "Decision boundary present."
        : "Decision boundary missing.",
  });

  checks.push({
    name:
      "CHANGE_CONDITIONS_PRESENT",
    passed:
      Boolean(
        record &&
          Array.isArray(
            record.decisionBoundary
              .whatWouldChangeAssessment,
          ),
      ),
    detail:
      record
        ? "Assessment-change conditions present."
        : "Assessment-change conditions missing.",
  });

  checks.push({
    name:
      "INVALIDATION_BOUNDARY_PRESENT",
    passed:
      Boolean(
        record &&
          Array.isArray(
            record.decisionBoundary
              .whatWouldInvalidateAssessment,
          ),
      ),
    detail:
      record
        ? "Invalidation boundary present."
        : "Invalidation boundary missing.",
  });

  checks.push({
    name:
      "NO_TRADING_ACTION",
    passed:
      !(
        "order" in
          record &&
        "trade" in
          record
      ),
    detail:
      "Decision record contains no trading execution fields.",
  });

  return {
    name:
      "DECISION_BOUNDARY",

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
    await runStructureCase(),
    await runMultiMarketCase(),
    await runIdentityCase(),
    await runBoundaryCase(),
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
      failed === 0,

    code:
      failed === 0
        ? "C147_7_DECISION_RECORD_REGRESSION_PASS"
        : "C147_7_DECISION_RECORD_REGRESSION_PARTIAL",

    passed,

    failed,

    total:
      cases.length,

    stage:
      "C147.7",

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
          "C147_7_DECISION_RECORD_REGRESSION_ERROR",
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

export async function POST(
  request: NextRequest,
) {
  return GET(request);
}
