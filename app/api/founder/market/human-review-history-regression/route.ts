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
  runMarketHumanReview,
  getMarketHumanReview,
  deleteMarketHumanReview,
} from "@/lib/runtime/market/market-human-review-runtime";
import {
  runMarketHumanReviewHistory,
} from "@/lib/runtime/market/market-human-review-history-runtime";
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
  const taskIds: string[] = [];
  try {
    const seed = Date.now();
    const taskA =
      await createPersistentTask(
        `C147.16.1 History Regression AAPL ${seed}`,
        [
          "C147.16.1 regression record.",
          "Symbol: AAPL",
          "Market: us",
          "Event ID: C14716-EVENT-AAPL",
          "Reassessment ID: C14716-REASSESS-AAPL",
          "Current Version: 3",
          "Temporary Founder regression task.",
        ].join("\n"),
        {
          allowDuplicate: true,
        },
      );
    const taskB =
      await createPersistentTask(
        `C147.16.1 History Regression MSFT ${seed}`,
        [
          "C147.16.1 regression record.",
          "Symbol: MSFT",
          "Market: us",
          "Event ID: C14716-EVENT-MSFT",
          "Reassessment ID: C14716-REASSESS-MSFT",
          "Current Version: 2",
          "Temporary Founder regression task.",
        ].join("\n"),
        {
          allowDuplicate: true,
        },
      );
    const taskC =
      await createPersistentTask(
        `C147.16.1 History Regression 0700 ${seed}`,
        [
          "C147.16.1 regression record.",
          "Symbol: 0700",
          "Market: hk",
          "Event ID: C14716-EVENT-0700",
          "Reassessment ID: C14716-REASSESS-0700",
          "Current Version: 4",
          "Temporary Founder regression task.",
        ].join("\n"),
        {
          allowDuplicate: true,
        },
      );
    taskIds.push(
      taskA.id,
      taskB.id,
      taskC.id,
    );
    const persistenceStartedAt =
      Date.now();
    const reviewA =
      await runMarketHumanReview(
        {
          taskId:
            taskA.id,
          decision:
            "accepted",
          reviewerNote:
            "C147.16.1 AAPL audit record.",
        },
      );
    const reviewB =
      await runMarketHumanReview(
        {
          taskId:
            taskB.id,
          decision:
            "rejected",
          reviewerNote:
            "C147.16.1 MSFT audit record.",
        },
      );
    const reviewC =
      await runMarketHumanReview(
        {
          taskId:
            taskC.id,
          decision:
            "deferred",
          reviewerNote:
            "C147.16.1 0700 audit record.",
        },
      );
    const persistenceCase =
      makeCase(
        "MULTI_REVIEW_PERSISTENCE",
        persistenceStartedAt,
        [
          {
            name:
              "AAPL_RECORDED",
            passed:
              reviewA.success &&
              reviewA.action ===
                "review-recorded",
            detail:
              `AAPL code=${reviewA.code}; action=${reviewA.action}.`,
          },
          {
            name:
              "MSFT_RECORDED",
            passed:
              reviewB.success &&
              reviewB.action ===
                "review-recorded",
            detail:
              `MSFT code=${reviewB.code}; action=${reviewB.action}.`,
          },
          {
            name:
              "0700_RECORDED",
            passed:
              reviewC.success &&
              reviewC.action ===
                "review-recorded",
            detail:
              `0700 code=${reviewC.code}; action=${reviewC.action}.`,
          },
          {
            name:
              "NO_PLANNER",
            passed:
              reviewA.plannerDispatched ===
                false &&
              reviewB.plannerDispatched ===
                false &&
              reviewC.plannerDispatched ===
                false,
            detail:
              "All persisted decisions remained outside Planner execution.",
          },
          {
            name:
              "NO_TRADING",
            passed:
              reviewA.tradingExecuted ===
                false &&
              reviewB.tradingExecuted ===
                false &&
              reviewC.tradingExecuted ===
                false,
            detail:
              "All persisted decisions remained outside trading execution.",
          },
        ],
      );
    const historyStartedAt =
      Date.now();
    const allHistory =
      await runMarketHumanReviewHistory(
        {
          limit: 100,
          includeNotes: true,
        },
      );
    const historyCase =
      makeCase(
        "HISTORY_READBACK",
        historyStartedAt,
        [
          {
            name:
              "HISTORY_FOUND",
            passed:
              allHistory.success &&
              allHistory.historyFound,
            detail:
              `History found=${allHistory.historyFound}; total=${allHistory.totalReviews}.`,
          },
          {
            name:
              "THREE_RECORDS_PRESENT",
            passed:
              allHistory.items.some(
                (item) =>
                  item.taskId ===
                  taskA.id,
              ) &&
              allHistory.items.some(
                (item) =>
                  item.taskId ===
                  taskB.id,
              ) &&
              allHistory.items.some(
                (item) =>
                  item.taskId ===
                  taskC.id,
              ),
            detail:
              "AAPL, MSFT and 0700 review records are visible through the C147.16 read-only history layer.",
          },
          {
            name:
              "NOTES_READBACK",
            passed:
              allHistory.items.some(
                (item) =>
                  item.taskId ===
                    taskA.id &&
                  item.reviewerNote ===
                    "C147.16.1 AAPL audit record.",
              ),
            detail:
              "Explicit reviewer note was read back only when includeNotes=true.",
          },
          {
            name:
              "READ_ONLY",
            passed:
              allHistory.readOnly ===
              true,
            detail:
              "History query reports readOnly=true.",
          },
        ],
      );
    const symbolStartedAt =
      Date.now();
    const symbolHistory =
      await runMarketHumanReviewHistory(
        {
          symbol:
            "AAPL",
          limit: 100,
        },
      );
    const symbolCase =
      makeCase(
        "SYMBOL_FILTER",
        symbolStartedAt,
        [
          {
            name:
              "AAPL_FILTER_MATCH",
            passed:
              symbolHistory.success &&
              symbolHistory.items.length >=
                1 &&
              symbolHistory.items.every(
                (item) =>
                  item.symbol ===
                  "AAPL",
              ),
            detail:
              `AAPL filtered records=${symbolHistory.items.length}.`,
          },
          {
            name:
              "MSFT_EXCLUDED",
            passed:
              !symbolHistory.items.some(
                (item) =>
                  item.symbol ===
                  "MSFT",
              ),
            detail:
              "MSFT was excluded by explicit symbol filter.",
          },
          {
            name:
              "0700_EXCLUDED",
            passed:
              !symbolHistory.items.some(
                (item) =>
                  item.symbol ===
                  "0700",
              ),
            detail:
              "0700 was excluded by explicit symbol filter.",
          },
        ],
      );
    const decisionStartedAt =
      Date.now();
    const decisionHistory =
      await runMarketHumanReviewHistory(
        {
          decision:
            "rejected",
          limit: 100,
        },
      );
    const decisionCase =
      makeCase(
        "DECISION_FILTER",
        decisionStartedAt,
        [
          {
            name:
              "REJECTED_FILTER_MATCH",
            passed:
              decisionHistory.success &&
              decisionHistory.items.length >=
                1 &&
              decisionHistory.items.every(
                (item) =>
                  item.decision ===
                  "rejected",
              ),
            detail:
              `Rejected filtered records=${decisionHistory.items.length}.`,
          },
          {
            name:
              "ACCEPTED_EXCLUDED",
            passed:
              !decisionHistory.items.some(
                (item) =>
                  item.decision ===
                  "accepted" &&
                  item.taskId ===
                    taskA.id,
              ),
            detail:
              "Accepted AAPL review was excluded by decision filter.",
          },
        ],
      );
    const marketStartedAt =
      Date.now();
    const marketHistory =
      await runMarketHumanReviewHistory(
        {
          market:
            "hk",
          limit: 100,
        },
      );
    const marketCase =
      makeCase(
        "MARKET_FILTER",
        marketStartedAt,
        [
          {
            name:
              "HK_FILTER_MATCH",
            passed:
              marketHistory.success &&
              marketHistory.items.length >=
                1 &&
              marketHistory.items.every(
                (item) =>
                  item.market ===
                  "hk",
              ),
            detail:
              `HK filtered records=${marketHistory.items.length}.`,
          },
          {
            name:
              "US_EXCLUDED",
            passed:
              !marketHistory.items.some(
                (item) =>
                  item.market ===
                  "us" &&
                  (
                    item.taskId ===
                      taskA.id ||
                    item.taskId ===
                      taskB.id
                  ),
              ),
            detail:
              "US regression records were excluded by market filter.",
          },
        ],
      );
    const readOnlyStartedAt =
      Date.now();
    const beforeA =
      await getMarketHumanReview(
        taskA.id,
      );
    const beforeB =
      await getMarketHumanReview(
        taskB.id,
      );
    const beforeC =
      await getMarketHumanReview(
        taskC.id,
      );
    const firstCount =
      allHistory.totalReviews;
    const repeatHistory =
      await runMarketHumanReviewHistory(
        {
          limit: 100,
          includeNotes: true,
        },
      );
    const afterA =
      await getMarketHumanReview(
        taskA.id,
      );
    const afterB =
      await getMarketHumanReview(
        taskB.id,
      );
    const afterC =
      await getMarketHumanReview(
        taskC.id,
      );
    const readOnlyCase =
      makeCase(
        "READ_ONLY_INTEGRITY",
        readOnlyStartedAt,
        [
          {
            name:
              "COUNT_STABLE",
            passed:
              repeatHistory.totalReviews ===
              firstCount,
            detail:
              `History count before=${firstCount}; after=${repeatHistory.totalReviews}.`,
          },
          {
            name:
              "AAPL_UNCHANGED",
            passed:
              beforeA?.reviewId ===
                afterA?.reviewId &&
              beforeA?.decision ===
                afterA?.decision &&
              beforeA?.createdAt ===
                afterA?.createdAt,
            detail:
              "AAPL review identity, decision and creation timestamp remained unchanged.",
          },
          {
            name:
              "MSFT_UNCHANGED",
            passed:
              beforeB?.reviewId ===
                afterB?.reviewId &&
              beforeB?.decision ===
                afterB?.decision &&
              beforeB?.createdAt ===
                afterB?.createdAt,
            detail:
              "MSFT review identity, decision and creation timestamp remained unchanged.",
          },
          {
            name:
              "0700_UNCHANGED",
            passed:
              beforeC?.reviewId ===
                afterC?.reviewId &&
              beforeC?.decision ===
                afterC?.decision &&
              beforeC?.createdAt ===
                afterC?.createdAt,
            detail:
              "0700 review identity, decision and creation timestamp remained unchanged.",
          },
          {
            name:
              "QUERY_READ_ONLY",
            passed:
              repeatHistory.readOnly ===
              true,
            detail:
              "Repeated C147.16 query remained read-only.",
          },
          {
            name:
              "NO_PLANNER",
            passed:
              repeatHistory.plannerDispatched ===
              false,
            detail:
              "History query did not dispatch Planner.",
          },
          {
            name:
              "NO_TRADING",
            passed:
              repeatHistory.tradingExecuted ===
              false,
            detail:
              "History query did not execute trading.",
          },
        ],
      );
    const orderingStartedAt =
      Date.now();
    const orderedHistory =
      await runMarketHumanReviewHistory(
        {
          limit: 100,
        },
      );
    const timestamps =
      orderedHistory.items.map(
        (item) =>
          Date.parse(
            item.createdAt,
          ),
      );
    const ordered =
      timestamps.every(
        (
          timestamp,
          index,
        ) =>
          index === 0 ||
          timestamp <=
            timestamps[
              index - 1
            ],
      );
    const orderingCase =
      makeCase(
        "STABLE_TIME_ORDER",
        orderingStartedAt,
        [
          {
            name:
              "NEWEST_FIRST",
            passed:
              ordered,
            detail:
              "History records are returned in descending creation-time order.",
          },
        ],
      );
    const cases =
      [
        persistenceCase,
        historyCase,
        symbolCase,
        decisionCase,
        marketCase,
        readOnlyCase,
        orderingCase,
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
            ? "C147_16_1_HUMAN_REVIEW_HISTORY_REGRESSION_PASS"
            : "C147_16_1_HUMAN_REVIEW_HISTORY_REGRESSION_PARTIAL",
        stage:
          "C147.16.1",
        mode:
          "behavioral",
        passed,
        failed,
        total:
          cases.length,
        runtimeMs:
          Date.now() -
          regressionStartedAt,
        cases,
        principles: [
          "C147.16 is read-only over persisted C147.15 human-review records.",
          "Historical queries do not create or overwrite review decisions.",
          "Symbol, market and decision filters are explicit and auditable.",
          "Historical records remain connected to their source Task.",
          "History ordering is newest-first by persisted creation timestamp.",
          "No Planner development dispatch occurs.",
          "No automated execution occurs.",
          "No trading execution occurs.",
          "Temporary regression records are removed after verification.",
        ],
        safetyBoundary:
          "C147.16.1 verifies persistent human-review history, filtering, ordering and read-only integrity only. It does not rank securities, predict returns, provide personalized investment advice, dispatch Planner work, or execute trades.",
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success:
          false,
        code:
          "C147_16_1_HUMAN_REVIEW_HISTORY_REGRESSION_ERROR",
        stage:
          "C147.16.1",
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
            : "Human review history regression failed.",
        principles: [
          "Regression failures remain explicit.",
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
    for (
      const taskId of taskIds
    ) {
      try {
        await deleteMarketHumanReview(
          taskId,
        );
      } catch {
        // Regression cleanup must not replace the verification result.
      }
      try {
        await deletePersistentTask(
          taskId,
        );
      } catch {
        // Regression cleanup must not replace the verification result.
      }
    }
  }
}
