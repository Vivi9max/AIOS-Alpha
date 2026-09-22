import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  isFounderRequest,
} from "@/lib/founder/auth";
import {
  createPersistentTask,
  deletePersistentTask,
} from "@/lib/task/server-store";
import {
  runMarketChangeEventTaskBridge,
} from "@/lib/runtime/market/market-change-event-task-bridge-runtime";
import type {
  MarketChangeEvent,
} from "@/lib/runtime/market/market-change-event-types";
const universe = [
  {
    symbol: "NVDA",
    market: "us" as const,
  },
];
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
function syntheticMaterialEvent(): MarketChangeEvent {
  return {
    eventId:
      "C14714-REGRESSION-MATERIAL",
    eventType:
      "market-decision-reassessment-required",
    priority:
      "high",
    symbol:
      "NVDA",
    market:
      "us",
    action:
      "reassessment-required",
    observationChanged:
      true,
    materialChange:
      true,
    previousVersion:
      1,
    currentVersion:
      2,
    previousRecordId:
      "C1477-us-NVDA-v1",
    currentRecordId:
      "C1477-us-NVDA-v2",
    observationFingerprint:
      "c14714-current",
    previousFingerprint:
      "c14714-previous",
    reassessmentId:
      "C1478-C14714-NVDA",
    whatChanged: [
      "Assessment changed.",
      "C147.14.1 synthetic material-change verification.",
    ],
    whyItMatters: [
      "A material reassessment requires human review.",
    ],
    whatRequiresHumanReview: [
      "Review the evidence and reassessment before any decision.",
    ],
    humanDecisionRequired:
      true,
    sourceRuntime:
      "market-decision-change-detection-runtime",
    sourceVersion:
      "C147.12",
    createdAt:
      new Date().toISOString(),
  };
}
function syntheticNoChangeEvent(): MarketChangeEvent {
  return {
    ...syntheticMaterialEvent(),
    eventId:
      "C14714-REGRESSION-NOCHANGE",
    eventType:
      "market-decision-no-change",
    priority:
      "normal",
    action:
      "no-material-change",
    observationChanged:
      false,
    materialChange:
      false,
    reassessmentId:
      null,
    whatChanged: [],
    whyItMatters: [],
    whatRequiresHumanReview: [],
  };
}
async function noTaskCase(): Promise<RegressionCase> {
  const startedAt =
    Date.now();
  const result =
    await runMarketChangeEventTaskBridge(
      {
        universe,
        query: null,
        includeExcluded: true,
        includeInsufficientData: true,
      },
      [
        syntheticNoChangeEvent(),
      ],
    );
  const item =
    result.items[0];
  const checks: Check[] = [
    {
      name:
        "BRIDGE_SUCCEEDED",
      passed:
        result.success &&
        result.code ===
          "C147_14_MARKET_EVENT_TASK_BRIDGE_PASS",
      detail:
        `Code=${result.code}.`,
    },
    {
      name:
        "NO_TASK_REQUIRED",
      passed:
        item?.action ===
        "no-task-required",
      detail:
        `Action=${item?.action ?? "none"}.`,
    },
    {
      name:
        "NO_PLANNER",
      passed:
        result.plannerDispatched ===
        false,
      detail:
        "Planner dispatch remained false.",
    },
    {
      name:
        "NO_TRADING",
      passed:
        result.tradingExecuted ===
        false,
      detail:
        "Trading execution remained false.",
    },
  ];
  return {
    name:
      "NO_CHANGE_NO_TASK",
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
async function materialTaskCase(): Promise<{
  testCase: RegressionCase;
  taskId: string | null;
  taskTitle: string | null;
}> {
  const startedAt =
    Date.now();
  const result =
    await runMarketChangeEventTaskBridge(
      {
        universe,
        query: null,
        includeExcluded: true,
        includeInsufficientData: true,
      },
      [
        syntheticMaterialEvent(),
      ],
    );
  const item =
    result.items[0];
  const checks: Check[] = [
    {
      name:
        "BRIDGE_SUCCEEDED",
      passed:
        result.success,
      detail:
        `Code=${result.code}; materialEvents=${result.materialEventCount}.`,
    },
    {
      name:
        "MATERIAL_EVENT_DETECTED",
      passed:
        result.materialEventCount ===
        1 &&
        item?.materialChange ===
        true,
      detail:
        `materialChange=${String(item?.materialChange)}.`,
    },
    {
      name:
        "TASK_CREATED",
      passed:
        item?.action ===
          "task-created" &&
        Boolean(
          item.taskId,
        ),
      detail:
        `Action=${item?.action ?? "none"}; taskId=${item?.taskId ?? "none"}.`,
    },
    {
      name:
        "HUMAN_REVIEW_ONLY",
      passed:
        item?.humanDecisionRequired ===
          true &&
        item?.automatedExecutionStarted ===
          false,
      detail:
        "Task requires human review and starts no automated execution.",
    },
    {
      name:
        "NO_PLANNER",
      passed:
        result.plannerDispatched ===
        false,
      detail:
        "Planner dispatch remained false.",
    },
    {
      name:
        "NO_TRADING",
      passed:
        result.tradingExecuted ===
        false,
      detail:
        "Trading execution remained false.",
    },
  ];
  return {
    taskId:
      item?.taskId ??
      null,
    taskTitle:
      item?.taskTitle ??
      null,
    testCase: {
      name:
        "MATERIAL_CHANGE_TASK_CREATE",
      passed:
        checks.every(
          (check) =>
            check.passed,
        ),
      checks,
      latencyMs:
        Date.now() -
        startedAt,
    },
  };
}
async function duplicateCase(
  taskId: string,
): Promise<RegressionCase> {
  const startedAt =
    Date.now();
  const result =
    await runMarketChangeEventTaskBridge(
      {
        universe,
        query: null,
        includeExcluded: true,
        includeInsufficientData: true,
      },
      [
        syntheticMaterialEvent(),
      ],
    );
  const item =
    result.items[0];
  const checks: Check[] = [
    {
      name:
        "BRIDGE_SUCCEEDED",
      passed:
        result.success,
      detail:
        `Code=${result.code}.`,
    },
    {
      name:
        "DUPLICATE_GUARDED",
      passed:
        item?.action ===
          "task-already-exists" &&
        item.taskId ===
          taskId,
      detail:
        `Action=${item?.action ?? "none"}; taskId=${item?.taskId ?? "none"}.`,
    },
    {
      name:
        "NO_SECOND_TASK",
      passed:
        result.taskCreatedCount ===
        0 &&
        result.taskExistingCount ===
        1,
      detail:
        `Created=${result.taskCreatedCount}; existing=${result.taskExistingCount}.`,
    },
    {
      name:
        "NO_PLANNER",
      passed:
        result.plannerDispatched ===
        false,
      detail:
        "Planner dispatch remained false.",
    },
    {
      name:
        "NO_TRADING",
      passed:
        result.tradingExecuted ===
        false,
      detail:
        "Trading execution remained false.",
    },
  ];
  return {
    name:
      "DUPLICATE_TASK_GUARD",
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
async function runRegression() {
  const startedAt =
    Date.now();
  let createdTaskId:
    string | null = null;
  try {
    const noTask =
      await noTaskCase();
    const created =
      await materialTaskCase();
    createdTaskId =
      created.taskId;
    if (!createdTaskId) {
      return {
        success: false,
        code:
          "C147_14_MARKET_EVENT_TASK_BRIDGE_REGRESSION_PARTIAL",
        passed: 1,
        failed: 2,
        total: 3,
        stage:
          "C147.14.1",
        mode:
          "behavioral",
        runtimeMs:
          Date.now() -
          startedAt,
        cases: [
          noTask,
          created.testCase,
        ],
      };
    }
    const duplicate =
      await duplicateCase(
        createdTaskId,
      );
    const cases = [
      noTask,
      created.testCase,
      duplicate,
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
          ? "C147_14_MARKET_EVENT_TASK_BRIDGE_REGRESSION_PASS"
          : "C147_14_MARKET_EVENT_TASK_BRIDGE_REGRESSION_PARTIAL",
      passed,
      failed,
      total:
        cases.length,
      stage:
        "C147.14.1",
      mode:
        "behavioral",
      runtimeMs:
        Date.now() -
        startedAt,
      principles: [
        "C147.14 consumes C147.13-shaped market change events.",
        "Only material reassessment-required events create Tasks.",
        "No-change events do not create Tasks.",
        "Active duplicate Tasks are reused.",
        "Planner development dispatch is not invoked.",
        "Trading execution is not invoked.",
        "Human review remains mandatory.",
      ],
      cases,
    };
  } finally {
    if (
      createdTaskId
    ) {
      await deletePersistentTask(
        createdTaskId,
      ).catch(
        () => undefined,
      );
    }
  }
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
          "C147_14_MARKET_EVENT_TASK_BRIDGE_REGRESSION_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "C147.14.1 regression failed.",
      },
      {
        status: 500,
      },
    );
  }
}
