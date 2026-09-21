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

import {
  runMarketReassessment,
} from "@/lib/runtime/market/market-reassessment-runtime";

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

async function getRecord(
  symbol: string,
  market:
    | "us"
    | "hk"
    | "cn",
) {
  const result =
    await runMarketDecisionRecord({
      universe: [
        {
          symbol,
          market,
        },
      ],
    });

  return result.records[0] ?? null;
}

async function runStructureCase(): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  const previous =
    await getRecord(
      "NVDA",
      "us",
    );

  const current =
    await getRecord(
      "NVDA",
      "us",
    );

  const result =
    previous &&
    current
      ? runMarketReassessment({
          previousRecord:
            previous,
          currentRecord:
            current,
        })
      : null;

  const checks: Check[] = [];

  checks.push({
    name:
      "REASSESSMENT_RETURNED",
    passed:
      Boolean(
        result?.reassessment,
      ),
    detail:
      result?.reassessment
        ? "Reassessment returned."
        : "Reassessment missing.",
  });

  checks.push({
    name:
      "SAME_INSTRUMENT",
    passed:
      result?.reassessment
        ?.symbol ===
        "NVDA" &&
      result?.reassessment
        ?.market ===
        "us",
    detail:
      "Reassessment remains bound to the same security.",
  });

  checks.push({
    name:
      "HUMAN_DECISION_GATE",
    passed:
      result?.humanDecisionRequired ===
      true,
    detail:
      result?.humanDecisionRequired ===
      true
        ? "Human decision remains required."
        : "Human decision gate missing.",
  });

  checks.push({
    name:
      "CHANGE_VISIBILITY",
    passed:
      Boolean(
        result?.reassessment &&
          Array.isArray(
            result.reassessment
              .materialChanges,
          ) &&
          Array.isArray(
            result.reassessment
              .unchangedFields,
          ),
      ),
    detail:
      "Changed and unchanged fields remain separately visible.",
  });

  return {
    name:
      "REASSESSMENT_STRUCTURE",

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

async function runMaterialChangeCase(): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  const previous =
    await getRecord(
      "NVDA",
      "us",
    );

  const current =
    previous
      ? {
          ...previous,
          valuation: {
            ...previous.valuation,
            pe:
              previous.valuation.pe ===
              null
                ? 100
                : previous.valuation.pe *
                  2,
          },
          generatedAt:
            new Date(
              Date.now() +
                1000,
            ).toISOString(),
        }
      : null;

  const result =
    previous &&
    current
      ? runMarketReassessment({
          previousRecord:
            previous,
          currentRecord:
            current,
        })
      : null;

  const peChange =
    result?.reassessment
      ?.materialChanges.some(
        (change) =>
          change.field ===
          "pe",
      ) ?? false;

  const checks: Check[] = [];

  checks.push({
    name:
      "MATERIAL_CHANGE_DETECTED",
    passed:
      peChange,
    detail:
      peChange
        ? "Material P/E change detected."
        : "Material P/E change was not detected.",
  });

  checks.push({
    name:
      "ASSESSMENT_CHANGE_VISIBLE",
    passed:
      result?.reassessment
        ?.changeType ===
      "assessment-change",
    detail:
      `Change type: ${result?.reassessment?.changeType ?? "missing"}.`,
  });

  checks.push({
    name:
      "NO_TRADING_ACTION",
    passed:
      !(
        result &&
        "order" in result
      ) &&
      !(
        result &&
        "trade" in result
      ),
    detail:
      "Reassessment contains no trading execution fields.",
  });

  return {
    name:
      "MATERIAL_CHANGE_DETECTION",

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

async function runInvalidationCase(): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  const previous =
    await getRecord(
      "NVDA",
      "us",
    );

  const current =
    previous
      ? {
          ...previous,
          state:
            "insufficient-data" as const,
          reviewStatus:
            "blocked" as const,
          dataQuality:
            "insufficient",
          invalidationConditions:
            [
              ...previous.invalidationConditions,
              "Identity or evidence verification fails.",
            ],
          generatedAt:
            new Date(
              Date.now() +
                2000,
            ).toISOString(),
        }
      : null;

  const result =
    previous &&
    current
      ? runMarketReassessment({
          previousRecord:
            previous,
          currentRecord:
            current,
        })
      : null;

  const checks: Check[] = [];

  checks.push({
    name:
      "INVALIDATION_RISK_DETECTED",
    passed:
      result?.reassessment
        ?.changeType ===
      "insufficient-data",
    detail:
      `Change type: ${result?.reassessment?.changeType ?? "missing"}.`,
  });

  checks.push({
    name:
      "BLOCKED_SEVERITY",
    passed:
      result?.reassessment
        ?.severity ===
      "blocked",
    detail:
      `Severity: ${result?.reassessment?.severity ?? "missing"}.`,
  });

  checks.push({
    name:
      "HUMAN_REVIEW_REQUIRED",
    passed:
      result?.humanDecisionRequired ===
      true,
    detail:
      "Human review remains mandatory.",
  });

  return {
    name:
      "INVALIDATION_PROPAGATION",

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

  const previous =
    await getRecord(
      "NVDA",
      "us",
    );

  const other =
    await getRecord(
      "AAPL",
      "us",
    );

  const result =
    previous &&
    other
      ? runMarketReassessment({
          previousRecord:
            previous,
          currentRecord:
            other,
        })
      : null;

  const checks: Check[] = [];

  checks.push({
    name:
      "CROSS_SECURITY_BLOCKED",
    passed:
      result?.reassessment ===
      null,
    detail:
      result?.reassessment ===
      null
        ? "Cross-security comparison was blocked."
        : "Cross-security comparison was incorrectly accepted.",
  });

  checks.push({
    name:
      "INSUFFICIENT_CODE",
    passed:
      result?.code ===
      "C147_8_REASSESSMENT_INSUFFICIENT",
    detail:
      `Code: ${result?.code ?? "missing"}.`,
  });

  checks.push({
    name:
      "HUMAN_GATE_RETAINED",
    passed:
      result?.humanDecisionRequired ===
      true,
    detail:
      "Human review remains required.",
  });

  return {
    name:
      "SECURITY_IDENTITY_BOUNDARY",

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
    await runMaterialChangeCase(),
    await runInvalidationCase(),
    await runIdentityCase(),
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
        ? "C147_8_REASSESSMENT_REGRESSION_PASS"
        : "C147_8_REASSESSMENT_REGRESSION_PARTIAL",

    passed,

    failed,

    total:
      cases.length,

    stage:
      "C147.8",

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
          "C147_8_REASSESSMENT_REGRESSION_ERROR",
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
