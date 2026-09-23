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
  getMarketHumanReview,
} from "@/lib/runtime/market/market-human-review-runtime";

import {
  runMarketRiskReassessmentHumanReview,
} from "@/lib/runtime/market/market-risk-reassessment-human-review-runtime";

import type {
  MarketDecisionRecord,
} from "@/lib/runtime/market/market-decision-record-types";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

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

function makeRecord(
  id: string,
  current: boolean,
): MarketDecisionRecord {
  return {
    recordId: id,
    symbol: "AAPL",
    market: "us",
    state:
      "research-candidate",
    reviewStatus:
      "review-ready",
    currentState:
      current
        ? "New regulatory evidence materially changes the assessment."
        : "Previous assessment remained research-ready.",
    supportingFactors: [
      "Revenue growth remains positive.",
      current
        ? "New regulatory evidence requires reassessment."
        : "Evidence remains sufficiently verified.",
    ],
    risks: current
      ? [
          "Regulatory evidence changed.",
          "Valuation sensitivity increased.",
        ]
      : [
          "Valuation remains elevated.",
        ],
    invalidationConditions:
      current
        ? [
            "New regulatory evidence materially changes the assessment.",
          ]
        : [],
    watchMetrics: [
      "Revenue growth",
      "EPS",
      "Valuation",
      "Regulatory evidence",
    ],
    scenarios: [
      {
        name: "Base",
        condition: "Evidence remains stable.",
        implication:
          "Continue research review.",
      },
      {
        name: "Changed",
        condition:
          "Material evidence changes.",
        implication:
          "Require human reassessment.",
      },
    ],
    industry:
      "Technology",
    company:
      "Apple",
    fundamentals: {
      revenueGrowth:
        current ? 0.08 : 0.1,
      eps:
        current ? 7.2 : 7.0,
      assessment:
        "Structured fundamental evidence.",
    },
    valuation: {
      pe:
        current ? 31 : 28,
      pb:
        current ? 12 : 10,
      assessment:
        "Valuation requires review.",
    },
    evidence: {
      sourceCount:
        current ? 10 : 8,
      independentDomains:
        current ? 7 : 6,
      verified:
        true,
      freshness:
        "fresh",
      asOf:
        new Date().toISOString(),
    },
    dataQuality:
      "web-evidence",
    humanDecisionRequired:
      true,
    decisionBoundary: {
      whatWouldChangeAssessment: [
        "Material evidence change.",
      ],
      whatWouldInvalidateAssessment:
        current
          ? [
              "New regulatory evidence materially changes the assessment.",
            ]
          : [],
    },
    sourceVersion:
      current
        ? "C147.19-CURRENT"
        : "C147.19-PREVIOUS",
    generatedAt:
      new Date().toISOString(),
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

  const startedAt =
    Date.now();

  let taskId:
    string | null = null;

  try {
    const previous =
      makeRecord(
        "C14719-AAPL-PREVIOUS",
        false,
      );

    const current =
      makeRecord(
        "C14719-AAPL-CURRENT",
        true,
      );

    const task =
      await createPersistentTask(
        `C147.19 Live Regression AAPL ${Date.now()}`,
        [
          "C147.19 live regression task.",
          "Symbol: AAPL",
          "Market: us",
          "Event ID: C14719-REGRESSION-EVENT",
          "Reassessment ID: C14719-REGRESSION-REASSESSMENT",
          "Current Version: 1",
          "Temporary Founder regression task.",
        ].join("\n"),
        {
          allowDuplicate:
            true,
        },
      );

    taskId =
      task.id;

    const prepared =
      await runMarketRiskReassessmentHumanReview(
        {
          symbol: "AAPL",
          market: "us",
          query:
            "C147.19 live regression risk reassessment",
          previousRecord:
            previous,
          currentRecord:
            current,
          taskId,
        },
      );

    const persisted =
      await getMarketHumanReview(
        taskId,
      );

    const decision =
      await runMarketRiskReassessmentHumanReview(
        {
          symbol: "AAPL",
          market: "us",
          query:
            "C147.19 live regression explicit human decision",
          previousRecord:
            previous,
          currentRecord:
            current,
          taskId,
          decision:
            "accepted",
          reviewerNote:
            "C147.19 explicit Founder regression decision.",
        },
      );

    const readback =
      await getMarketHumanReview(
        taskId,
      );

    const duplicate =
      await runMarketRiskReassessmentHumanReview(
        {
          symbol: "AAPL",
          market: "us",
          previousRecord:
            previous,
          currentRecord:
            current,
          taskId,
          decision:
            "rejected",
          reviewerNote:
            "Must not overwrite the first decision.",
        },
      );

    const checks = [
      {
        name:
          "REAL_C147_18_BRIDGE",
        passed:
          prepared.bridge.code ===
            "C147_18_RISK_REASSESSMENT_BRIDGE_PASS" &&
          Boolean(
            prepared.bridge.reassessment,
          ),
        detail:
          "C147.19 executed the real C147.18 bridge.",
      },
      {
        name:
          "REASSESSMENT_REQUIRED",
        passed:
          prepared.reassessmentRequired ===
          true,
        detail:
          `Reassessment required=${prepared.reassessmentRequired}.`,
      },
      {
        name:
          "PERSISTENT_TASK",
        passed:
          Boolean(
            prepared.taskId ===
            taskId,
          ),
        detail:
          `Task=${prepared.taskId}.`,
      },
      {
        name:
          "NO_DECISION_BEFORE_HUMAN",
        passed:
          persisted ===
          null,
        detail:
          "Task preparation did not infer a human decision.",
      },
      {
        name:
          "EXPLICIT_DECISION_RECORDED",
        passed:
          decision.success &&
          decision.action ===
            "review-recorded" &&
          readback?.decision ===
            "accepted",
        detail:
          `Decision=${readback?.decision ?? "none"}.`,
      },
      {
        name:
          "PERSISTENT_READBACK",
        passed:
          Boolean(
            readback?.reviewId &&
            readback?.createdAt &&
            readback?.taskId ===
              taskId,
          ),
        detail:
          "C147.15 persistent review record was read back.",
      },
      {
        name:
          "DUPLICATE_PROTECTED",
        passed:
          duplicate.success ===
            true &&
          duplicate.action ===
            "review-already-recorded" &&
          duplicate.review?.decision ===
            "accepted",
        detail:
          "Second decision did not overwrite the first decision.",
      },
      {
        name:
          "SAFETY_BOUNDARY",
        passed:
          decision.automatedExecutionStarted ===
            false &&
          decision.plannerDispatched ===
            false &&
          decision.tradingExecuted ===
            false,
        detail:
          "No automated execution, Planner dispatch or trading occurred.",
      },
    ];

    const failed =
      checks.filter(
        (item) =>
          !item.passed,
      ).length;

    return NextResponse.json(
      {
        success:
          failed === 0,
        code:
          failed === 0
            ? "C147_19_RISK_REASSESSMENT_HUMAN_REVIEW_REGRESSION_PASS"
            : "C147_19_RISK_REASSESSMENT_HUMAN_REVIEW_REGRESSION_PARTIAL",
        stage:
          "C147.19.1",
        passed:
          checks.length -
          failed,
        failed,
        total:
          checks.length,
        checks,
        taskId,
        review:
          readback,
        safetyBoundary: {
          humanDecisionRequired:
            true,
          automatedExecutionStarted:
            false,
          plannerDispatched:
            false,
          tradingExecuted:
            false,
        },
        runtime: {
          name:
            "market-risk-reassessment-human-review-regression-runtime",
          version:
            "C147.19.1",
          upstream:
            "C147.18+C147.15+C147.16",
          generatedAt:
            new Date().toISOString(),
          latencyMs:
            Date.now() -
            startedAt,
        },
        principles: [
          "C147.18 risk reassessment remains the upstream evidence-change detector.",
          "A material reassessment creates an explicit persistent human-review Task.",
          "C147.15 remains the only persistence path for an explicit human decision.",
          "A human decision is never inferred.",
          "Existing decisions are immutable and duplicate decisions are blocked.",
          "C147.16 remains the read-only audit/history layer.",
          "No Planner development dispatch occurs.",
          "No automated trading occurs.",
        ],
        disclaimer:
          "C147.19.1 validates Risk Reassessment → Persistent Human Review Decision. It does not rank securities, predict returns, provide personalized investment advice, or execute trades.",
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        code:
          "C147_19_RISK_REASSESSMENT_HUMAN_REVIEW_REGRESSION_ERROR",
        stage:
          "C147.19.1",
        error:
          error instanceof Error
            ? error.message
            : "C147.19.1 regression failed.",
      },
      {
        status: 500,
      },
    );
  } finally {
    if (taskId) {
      try {
        await deletePersistentTask(
          taskId,
        );
      } catch {
        // Regression cleanup must not replace the result.
      }
    }
  }
}
