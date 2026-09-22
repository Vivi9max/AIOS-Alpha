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
  deleteMarketHumanReview,
  getMarketHumanReview,
  runMarketHumanReview,
} from "@/lib/runtime/market/market-human-review-runtime";
export const dynamic =
  "force-dynamic";
export const runtime =
  "nodejs";
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
function unauthorized() {
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
function makeCase(
  name: string,
  startedAt: number,
  checks: Check[],
): RegressionCase {
  return {
    name,
    passed:
      checks.length > 0 &&
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
export async function GET(
  request: NextRequest,
) {
  if (
    !isFounderRequest(
      request,
    )
  ) {
    return unauthorized();
  }
  const regressionStartedAt =
    Date.now();
  let taskId:
    string | null = null;
  try {
    const task =
      await createPersistentTask(
        `C147.15.1 Human Review Regression ${Date.now()}`,
        [
          "C147.15.1 regression task.",
          "Symbol: AAPL",
          "Market: us",
          "Event ID: C14715-REGRESSION-EVENT",
          "Reassessment ID: C14715-REGRESSION-REASSESSMENT",
          "Current Version: 1",
          "This Task exists only for Founder regression verification.",
        ].join("\n"),
        {
          allowDuplicate:
            true,
        },
      );
    taskId =
      task.id;
    const createStartedAt =
      Date.now();
    const firstDecision =
      await runMarketHumanReview(
        {
          taskId:
            task.id,
          decision:
            "accepted",
          reviewerNote:
            "C147.15.1 explicit regression decision.",
        },
      );
    const persisted =
      await getMarketHumanReview(
        task.id,
      );
    const createCase =
      makeCase(
        "EXPLICIT_DECISION_PERSISTENCE",
        createStartedAt,
        [
          {
            name:
              "REVIEW_RECORDED",
            passed:
              firstDecision.success &&
              firstDecision.action ===
                "review-recorded",
            detail:
              `Code=${firstDecision.code}; action=${firstDecision.action}.`,
          },
          {
            name:
              "EXPLICIT_DECISION",
            passed:
              persisted?.decision ===
              "accepted",
            detail:
              `Persisted decision=${persisted?.decision ?? "none"}.`,
          },
          {
            name:
              "HUMAN_REVIEW_ONLY",
            passed:
              firstDecision.humanDecisionRequired ===
                true &&
              firstDecision.automatedExecutionStarted ===
                false,
            detail:
              "Human decision was recorded without automated execution.",
          },
          {
            name:
              "NO_PLANNER",
            passed:
              firstDecision.plannerDispatched ===
              false,
            detail:
              "Planner dispatch remained false.",
          },
          {
            name:
              "NO_TRADING",
            passed:
              firstDecision.tradingExecuted ===
              false,
            detail:
              "Trading execution remained false.",
          },
        ],
      );
    const readbackStartedAt =
      Date.now();
    const readback =
      await getMarketHumanReview(
        task.id,
      );
    const readbackCase =
      makeCase(
        "PERSISTENT_REVIEW_READBACK",
        readbackStartedAt,
        [
          {
            name:
              "RECORD_FOUND",
            passed:
              Boolean(
                readback,
              ),
            detail:
              `Review record ${readback ? "found" : "not found"}.`,
          },
          {
            name:
              "TASK_ID_ALIGNED",
            passed:
              readback?.taskId ===
              task.id,
            detail:
              `Stored taskId=${readback?.taskId ?? "none"}.`,
          },
          {
            name:
              "DECISION_ALIGNED",
            passed:
              readback?.decision ===
              "accepted",
            detail:
              `Stored decision=${readback?.decision ?? "none"}.`,
          },
          {
            name:
              "IMMUTABLE_RECORD",
            passed:
              Boolean(
                readback?.reviewId &&
                readback?.createdAt,
              ),
            detail:
              "Persistent review record contains stable review identity and creation timestamp.",
          },
        ],
      );
    const duplicateStartedAt =
      Date.now();
    const secondDecision =
      await runMarketHumanReview(
        {
          taskId:
            task.id,
          decision:
            "rejected",
          reviewerNote:
            "This decision must not overwrite the first decision.",
        },
      );
    const afterDuplicate =
      await getMarketHumanReview(
        task.id,
      );
    const duplicateCase =
      makeCase(
        "DUPLICATE_DECISION_GUARD",
        duplicateStartedAt,
        [
          {
            name:
              "SECOND_DECISION_BLOCKED",
            passed:
              secondDecision.success ===
                false &&
              secondDecision.code ===
                "C147_15_HUMAN_REVIEW_ALREADY_RECORDED",
            detail:
              `Code=${secondDecision.code}; action=${secondDecision.action}.`,
          },
          {
            name:
              "NO_MUTATION",
            passed:
              secondDecision.mutationPerformed ===
              false,
            detail:
              "Second decision performed no mutation.",
          },
          {
            name:
              "ORIGINAL_DECISION_PRESERVED",
            passed:
              afterDuplicate?.decision ===
              "accepted",
            detail:
              `Final persisted decision=${afterDuplicate?.decision ?? "none"}.`,
          },
          {
            name:
              "NO_PLANNER",
            passed:
              secondDecision.plannerDispatched ===
              false,
            detail:
              "Planner dispatch remained false.",
          },
          {
            name:
              "NO_TRADING",
            passed:
              secondDecision.tradingExecuted ===
              false,
            detail:
              "Trading execution remained false.",
          },
        ],
      );
    const cases =
      [
        createCase,
        readbackCase,
        duplicateCase,
      ];
    const passed =
      cases.filter(
        (item) =>
          item.passed,
      ).length;
    const failed =
      cases.length -
      passed;
    return NextResponse.json(
      {
        success:
          failed === 0,
        code:
          failed === 0
            ? "C147_15_1_HUMAN_REVIEW_REGRESSION_PASS"
            : "C147_15_1_HUMAN_REVIEW_REGRESSION_PARTIAL",
        stage:
          "C147.15.1",
        mode:
          "behavioral",
        passed,
        failed,
        total:
          cases.length,
        runtimeMs:
          Date.now() -
          regressionStartedAt,
        taskId,
        cases,
        principles: [
          "Only an explicit human decision may be persisted.",
          "Persistent review records are read back before duplicate testing.",
          "A second decision for the same Task is blocked.",
          "The original human decision is never silently overwritten.",
          "No Planner development dispatch occurs.",
          "No automated execution occurs.",
          "No trading occurs.",
          "Regression artifacts are cleaned after verification.",
        ],
        safetyBoundary:
          "C147.15.1 verifies explicit human review persistence only. It does not generate investment advice or execute trading.",
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success:
          false,
        code:
          "C147_15_1_HUMAN_REVIEW_REGRESSION_ERROR",
        stage:
          "C147.15.1",
        mode:
          "behavioral",
        passed:
          0,
        failed:
          1,
        total:
          1,
        runtimeMs:
          Date.now() -
          regressionStartedAt,
        error:
          error instanceof Error
            ? error.message
            : "Human review regression failed.",
        principles: [
          "Regression failures must remain explicit.",
          "No automated execution is permitted.",
          "No trading is permitted.",
        ],
      },
      {
        status:
          500,
      },
    );
  } finally {
    if (taskId) {
      try {
        await deleteMarketHumanReview(
          taskId,
        );
      } catch {
        // Regression cleanup must never replace
        // the actual regression result.
      }
      try {
        await deletePersistentTask(
          taskId,
        );
      } catch {
        // Regression cleanup must never replace
        // the actual regression result.
      }
    }
  }
}
