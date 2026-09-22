import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  isFounderRequest,
} from "@/lib/founder/auth";
import {
  resetMarketDecisionHistory,
  runMarketDecisionHistoryQuery,
} from "@/lib/runtime/market/market-decision-history-query-runtime";
import {
  runMarketDecisionObservation,
} from "@/lib/runtime/market/market-decision-observation-runtime";
import {
  runMarketDecisionChangeDetection,
} from "@/lib/runtime/market/market-decision-change-detection-runtime";
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
    symbol: "NVDA",
    market: "us" as const,
  },
];
async function getHistoryVersion(): Promise<number> {
  const result =
    await runMarketDecisionHistoryQuery({
      symbol: "NVDA",
      market: "us",
    });
  return result.currentVersion;
}
async function createBaseline(): Promise<{
  success: boolean;
  code: string;
}> {
  const observed =
    await runMarketDecisionObservation({
      mode: "observe",
      universe,
    });
  if (
    !observed.success ||
    !observed.observation?.record
  ) {
    return {
      success: false,
      code:
        observed.code,
    };
  }
  const mutation =
    await runMarketDecisionObservation({
      mode: "mutate",
      record:
        observed.observation.record,
    });
  return {
    success:
      mutation.success &&
      (
        mutation.code ===
          "C147_11_MUTATION_PASS" ||
        mutation.code ===
          "C147_11_MUTATION_NOOP"
      ),
    code:
      mutation.code,
  };
}
async function runNoHistoryDetection(): Promise<RegressionCase> {
  const startedAt =
    Date.now();
  await resetMarketDecisionHistory(
    "NVDA",
    "us",
  );
  const before =
    await getHistoryVersion();
  const result =
    await runMarketDecisionChangeDetection({
      universe,
      includeExcluded: true,
      includeInsufficientData: true,
    });
  const after =
    await getHistoryVersion();
  const item =
    result.items[0] ?? null;
  const checks: Check[] = [
    {
      name:
        "DETECTION_SUCCEEDED",
      passed:
        result.success === true,
      detail:
        `C147.12 code=${result.code}.`,
    },
    {
      name:
        "NO_HISTORY_DETECTED",
      passed:
        item?.action ===
        "no-history" ||
        item?.action ===
        "blocked",
      detail:
        `Action=${item?.action ?? "none"}.`,
    },
    {
      name:
        "READ_ONLY",
      passed:
        result.mutationPerformed ===
        false,
      detail:
        "C147.12 reported mutationPerformed=false.",
    },
    {
      name:
        "HISTORY_UNCHANGED",
      passed:
        before === after,
      detail:
        `History version before=${before}, after=${after}.`,
    },
  ];
  return {
    name:
      "NO_HISTORY_READ_ONLY",
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
async function runBaselineDetection(): Promise<RegressionCase> {
  const startedAt =
    Date.now();
  await resetMarketDecisionHistory(
    "NVDA",
    "us",
  );
  const baseline =
    await createBaseline();
  const before =
    await getHistoryVersion();
  const result =
    await runMarketDecisionChangeDetection({
      universe,
      includeExcluded: true,
      includeInsufficientData: true,
    });
  const after =
    await getHistoryVersion();
  const item =
    result.items[0] ?? null;
  const checks: Check[] = [
    {
      name:
        "BASELINE_CREATED",
      passed:
        baseline.success &&
        before >= 1,
      detail:
        `Baseline code=${baseline.code}; version=${before}.`,
    },
    {
      name:
        "DETECTION_SUCCEEDED",
      passed:
        result.success === true,
      detail:
        `C147.12 code=${result.code}.`,
    },
    {
      name:
        "ITEM_EVALUATED",
      passed:
        Boolean(item),
      detail:
        `Evaluated action=${item?.action ?? "none"}.`,
    },
    {
      name:
        "MUTATION_NOT_PERFORMED",
      passed:
        result.mutationPerformed ===
        false &&
        item?.mutationPerformed ===
        false,
      detail:
        "C147.12 did not execute the C147.11 mutation path.",
    },
    {
      name:
        "HISTORY_VERSION_PRESERVED",
      passed:
        before === after,
      detail:
        `History version before=${before}, after=${after}.`,
    },
  ];
  return {
    name:
      "BASELINE_CHANGE_DETECTION",
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
async function runRepeatReadOnlyDetection(): Promise<RegressionCase> {
  const startedAt =
    Date.now();
  const before =
    await getHistoryVersion();
  const first =
    await runMarketDecisionChangeDetection({
      universe,
      includeExcluded: true,
      includeInsufficientData: true,
    });
  const middle =
    await getHistoryVersion();
  const second =
    await runMarketDecisionChangeDetection({
      universe,
      includeExcluded: true,
      includeInsufficientData: true,
    });
  const after =
    await getHistoryVersion();
  const firstItem =
    first.items[0] ?? null;
  const secondItem =
    second.items[0] ?? null;
  const checks: Check[] = [
    {
      name:
        "FIRST_DETECTION_COMPLETED",
      passed:
        first.success === true,
      detail:
        `First detection code=${first.code}.`,
    },
    {
      name:
        "SECOND_DETECTION_COMPLETED",
      passed:
        second.success === true,
      detail:
        `Second detection code=${second.code}.`,
    },
    {
      name:
        "NO_MUTATION_FIRST_RUN",
      passed:
        first.mutationPerformed ===
        false &&
        firstItem?.mutationPerformed ===
        false,
      detail:
        "First C147.12 run remained read-only.",
    },
    {
      name:
        "NO_MUTATION_SECOND_RUN",
      passed:
        second.mutationPerformed ===
        false &&
        secondItem?.mutationPerformed ===
        false,
      detail:
        "Second C147.12 run remained read-only.",
    },
    {
      name:
        "VERSION_STABLE",
      passed:
        before ===
          middle &&
        middle ===
          after,
      detail:
        `Versions=${before} → ${middle} → ${after}.`,
    },
    {
      name:
        "NO_HISTORY_WRITE",
      passed:
        firstItem?.currentVersion ===
          firstItem?.previousVersion ||
        firstItem?.observationChanged ===
          true,
      detail:
        "Detection result is informational and does not itself create a history version.",
    },
  ];
  return {
    name:
      "REPEAT_DETECTION_READ_ONLY",
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
    await runNoHistoryDetection(),
    await runBaselineDetection(),
    await runRepeatReadOnlyDetection(),
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
        ? "C147_12_CHANGE_DETECTION_REGRESSION_PASS"
        : "C147_12_CHANGE_DETECTION_REGRESSION_PARTIAL",
    passed,
    failed,
    total:
      cases.length,
    stage:
      "C147.12.1",
    mode:
      "behavioral",
    runtimeMs:
      Date.now() -
      startedAt,
    principles: [
      "C147.12 is read-only.",
      "C147.12 never creates or increments decision-history versions.",
      "C147.11 remains the explicit mutation boundary.",
      "C147.12 may invoke C147.8 reassessment for changed observations.",
      "Human review remains mandatory.",
    ],
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
          "C147_12_CHANGE_DETECTION_REGRESSION_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "C147.12 regression failed.",
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
