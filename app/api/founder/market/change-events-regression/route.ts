import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  isFounderRequest,
} from "@/lib/founder/auth";
import {
  resetMarketDecisionHistory,
} from "@/lib/runtime/market/market-decision-history-runtime";
import {
  runMarketDecisionHistoryQuery,
} from "@/lib/runtime/market/market-decision-history-query-runtime";
import {
  runMarketDecisionObservation,
} from "@/lib/runtime/market/market-decision-observation-runtime";
import {
  runMarketChangeEventRuntime,
} from "@/lib/runtime/market/market-change-event-runtime";
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
type RegressionResult = {
  success: boolean;
  code: string;
  passed: number;
  failed: number;
  total: number;
  stage: string;
  mode: string;
  runtimeMs: number;
  principles: string[];
  cases: RegressionCase[];
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
      includeReassessment: true,
    });
  return result.currentVersion;
}
async function createBaseline(): Promise<{
  success: boolean;
  code: string;
  version: number;
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
      code: observed.code,
      version: 0,
    };
  }
  const mutation =
    await runMarketDecisionObservation({
      mode: "mutate",
      record:
        observed.observation.record,
    });
  const version =
    mutation.observation
      ?.currentVersion ??
    0;
  return {
    success:
      mutation.success &&
      (
        mutation.code ===
          "C147_11_MUTATION_PASS" ||
        mutation.code ===
          "C147_11_MUTATION_NOOP"
      ) &&
      version >= 1,
    code:
      mutation.code,
    version,
  };
}
async function runNoHistoryEvent(): Promise<RegressionCase> {
  const startedAt =
    Date.now();
  await resetMarketDecisionHistory(
    "NVDA",
    "us",
  );
  const before =
    await getHistoryVersion();
  const result =
    await runMarketChangeEventRuntime({
      universe,
      includeExcluded: true,
      includeInsufficientData: true,
      query: null,
    });
  const after =
    await getHistoryVersion();
  const event =
    result.events[0] ??
    null;
  const checks: Check[] = [
    {
      name:
        "EVENT_RUNTIME_SUCCEEDED",
      passed:
        result.success === true &&
        result.code ===
          "C147_13_MARKET_CHANGE_EVENT_PASS",
      detail:
        `C147.13 code=${result.code}; eventCount=${result.eventCount}.`,
    },
    {
      name:
        "NO_HISTORY_EVENT",
      passed:
        event?.eventType ===
          "market-decision-no-history" ||
        event?.eventType ===
          "market-decision-blocked",
      detail:
        `Event type=${event?.eventType ?? "none"}.`,
    },
    {
      name:
        "SOURCE_ALIGNED",
      passed:
        event?.sourceRuntime ===
          "market-decision-change-detection-runtime" &&
        event?.sourceVersion ===
          "C147.12",
      detail:
        `Source=${event?.sourceRuntime ?? "none"}; version=${event?.sourceVersion ?? "none"}.`,
    },
    {
      name:
        "NO_MUTATION",
      passed:
        result.mutationPerformed ===
          false &&
        result.taskCreated ===
          false &&
        result.plannerDispatched ===
          false &&
        result.tradingExecuted ===
          false,
      detail:
        "C147.13 remained read-only.",
    },
    {
      name:
        "HISTORY_UNCHANGED",
      passed:
        before === after,
      detail:
        `History version ${before} → ${after}.`,
    },
  ];
  return {
    name:
      "NO_HISTORY_EVENT",
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
async function runBaselineEvent(): Promise<RegressionCase> {
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
    await runMarketChangeEventRuntime({
      universe,
      includeExcluded: true,
      includeInsufficientData: true,
      query: null,
    });
  const after =
    await getHistoryVersion();
  const event =
    result.events[0] ??
    null;
  const checks: Check[] = [
    {
      name:
        "BASELINE_CREATED",
      passed:
        baseline.success &&
        baseline.version >= 1 &&
        before >= 1,
      detail:
        `Baseline code=${baseline.code}; mutationVersion=${baseline.version}; historyVersion=${before}.`,
    },
    {
      name:
        "EVENT_RUNTIME_SUCCEEDED",
      passed:
        result.success === true,
      detail:
        `C147.13 code=${result.code}.`,
    },
    {
      name:
        "NO_CHANGE_EVENT",
      passed:
        event?.eventType ===
          "market-decision-no-change",
      detail:
        `Event type=${event?.eventType ?? "none"}; action=${event?.action ?? "none"}.`,
    },
    {
      name:
        "MATERIAL_CHANGE_FALSE",
      passed:
        event?.materialChange ===
        false,
      detail:
        `materialChange=${String(event?.materialChange)}.`,
    },
    {
      name:
        "VERSION_PRESERVED",
      passed:
        before === after &&
        event?.currentVersion ===
          before,
      detail:
        `History version ${before} → ${after}; event version=${event?.currentVersion ?? "none"}.`,
    },
    {
      name:
        "NO_DOWNSTREAM_ACTION",
      passed:
        result.mutationPerformed ===
          false &&
        result.taskCreated ===
          false &&
        result.plannerDispatched ===
          false &&
        result.tradingExecuted ===
          false,
      detail:
        "No mutation, Task, Planner dispatch, or trading execution occurred.",
    },
  ];
  return {
    name:
      "BASELINE_NO_CHANGE_EVENT",
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
async function runRepeatReadOnlyEvent(): Promise<RegressionCase> {
  const startedAt =
    Date.now();
  const before =
    await getHistoryVersion();
  const first =
    await runMarketChangeEventRuntime({
      universe,
      includeExcluded: true,
      includeInsufficientData: true,
      query: null,
    });
  const middle =
    await getHistoryVersion();
  const second =
    await runMarketChangeEventRuntime({
      universe,
      includeExcluded: true,
      includeInsufficientData: true,
      query: null,
    });
  const after =
    await getHistoryVersion();
  const firstEvent =
    first.events[0] ??
    null;
  const secondEvent =
    second.events[0] ??
    null;
  const checks: Check[] = [
    {
      name:
        "FIRST_EVENT_COMPLETED",
      passed:
        first.success === true &&
        first.eventCount > 0,
      detail:
        `First code=${first.code}; events=${first.eventCount}.`,
    },
    {
      name:
        "SECOND_EVENT_COMPLETED",
      passed:
        second.success === true &&
        second.eventCount > 0,
      detail:
        `Second code=${second.code}; events=${second.eventCount}.`,
    },
    {
      name:
        "FIRST_EVENT_READ_ONLY",
      passed:
        first.mutationPerformed ===
          false &&
        first.taskCreated ===
          false &&
        first.plannerDispatched ===
          false &&
        first.tradingExecuted ===
          false,
      detail:
        "First C147.13 execution remained read-only.",
    },
    {
      name:
        "SECOND_EVENT_READ_ONLY",
      passed:
        second.mutationPerformed ===
          false &&
        second.taskCreated ===
          false &&
        second.plannerDispatched ===
          false &&
        second.tradingExecuted ===
          false,
      detail:
        "Second C147.13 execution remained read-only.",
    },
    {
      name:
        "EVENT_SOURCE_STABLE",
      passed:
        firstEvent?.sourceVersion ===
          "C147.12" &&
        secondEvent?.sourceVersion ===
          "C147.12",
      detail:
        `Sources=${firstEvent?.sourceVersion ?? "none"} / ${secondEvent?.sourceVersion ?? "none"}.`,
    },
    {
      name:
        "VERSION_STABLE",
      passed:
        before === middle &&
        middle === after,
      detail:
        `Versions=${before} → ${middle} → ${after}.`,
    },
  ];
  return {
    name:
      "REPEAT_EVENT_READ_ONLY",
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
async function runRegression(): Promise<RegressionResult> {
  const startedAt =
    Date.now();
  const cases = [
    await runNoHistoryEvent(),
    await runBaselineEvent(),
    await runRepeatReadOnlyEvent(),
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
        ? "C147_13_MARKET_CHANGE_EVENT_REGRESSION_PASS"
        : "C147_13_MARKET_CHANGE_EVENT_REGRESSION_PARTIAL",
    passed,
    failed,
    total:
      cases.length,
    stage:
      "C147.13.1",
    mode:
      "behavioral",
    runtimeMs:
      Date.now() -
      startedAt,
    principles: [
      "C147.13 consumes the existing C147.12 change-detection runtime.",
      "C147.13 does not duplicate market decision logic.",
      "C147.13 does not mutate market decision history.",
      "C147.13 does not create Tasks.",
      "C147.13 does not dispatch Planner work.",
      "C147.13 does not execute trading.",
      "C147.11 remains the explicit mutation path.",
      "C147.12 remains the change-detection source of truth.",
      "Human review remains mandatory.",
    ],
    cases,
  };
}
export const dynamic =
  "force-dynamic";
export const runtime =
  "nodejs";
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
          "Founder authentication required.",
      },
      {
        status: 401,
      },
    );
  }
  try {
    const result =
      await runRegression();
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
          "C147_13_MARKET_CHANGE_EVENT_REGRESSION_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "C147.13.1 regression failed.",
      },
      {
        status: 500,
      },
    );
  }
}
