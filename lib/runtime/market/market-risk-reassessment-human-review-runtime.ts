import {
  createPersistentTask,
} from "@/lib/task/server-store";

import {
  runMarketHumanReview,
  getMarketHumanReview,
} from "./market-human-review-runtime";

import {
  runMarketRiskReassessmentBridge,
} from "./market-risk-reassessment-bridge-runtime";

import type {
  MarketHumanReviewDecision,
} from "./market-human-review-types";

import type {
  MarketRiskReassessmentHumanReviewRequest,
  MarketRiskReassessmentHumanReviewResult,
} from "./market-risk-reassessment-human-review-types";

function normalizeSymbol(
  value: unknown,
): string {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .trim()
    .toUpperCase()
    .slice(0, 32);
}

function normalizeText(
  value: unknown,
  maxLength: number,
): string {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .trim()
    .slice(0, maxLength);
}

function isDecision(
  value: unknown,
): value is MarketHumanReviewDecision {
  return (
    value === "acknowledged" ||
    value === "accepted" ||
    value === "rejected" ||
    value === "deferred"
  );
}

function buildDescription(
  symbol: string,
  market: string,
  eventId: string | null,
  reassessmentId: string | null,
): string {
  return [
    "C147.19 persistent human-review task.",
    `Symbol: ${symbol}`,
    `Market: ${market}`,
    `Event ID: ${eventId ?? "none"}`,
    `Reassessment ID: ${reassessmentId ?? "none"}`,
    "Current Version: 1",
    "Source: C147.18 Risk Reassessment.",
    "Human decision is required before downstream action.",
    "This Task must not trigger Planner development or trading.",
  ].join("\n");
}

function basePrinciples(): string[] {
  return [
    "C147.19 consumes the real C147.18 risk-reassessment bridge.",
    "A material reassessment creates an explicit persistent human-review Task.",
    "The runtime never infers a human decision.",
    "The runtime never converts silence into approval.",
    "An explicit decision is persisted only through the existing C147.15 runtime.",
    "Existing C147.15 review records remain immutable.",
    "C147.16 remains the read-only history layer.",
    "No Planner development dispatch occurs.",
    "No automated execution occurs.",
    "No trading occurs.",
    "Human review remains mandatory.",
  ];
}

export async function runMarketRiskReassessmentHumanReview(
  request: MarketRiskReassessmentHumanReviewRequest,
): Promise<MarketRiskReassessmentHumanReviewResult> {
  const startedAt =
    Date.now();

  const symbol =
    normalizeSymbol(
      request?.symbol,
    );

  const market =
    request.market;

  const bridge =
    await runMarketRiskReassessmentBridge({
      symbol,
      market,
      query:
        request.query ??
        `Risk reassessment human review ${market} ${symbol}`,
      previousRecord:
        request.previousRecord ??
        null,
      currentRecord:
        request.currentRecord ??
        null,
    });

  const base = {
    symbol,
    market,
    bridge,
    reassessmentRequired:
      bridge.reassessmentRequired,
    humanDecisionRequired:
      true as const,
    automatedExecutionStarted:
      false as const,
    plannerDispatched:
      false as const,
    tradingExecuted:
      false as const,
    runtime: {
      name:
        "market-risk-reassessment-human-review-runtime" as const,
      version:
        "C147.19" as const,
      upstream:
        "C147.18+C147.15" as const,
      generatedAt:
        new Date().toISOString(),
      latencyMs:
        Date.now() -
        startedAt,
    },
    principles:
      basePrinciples(),
    disclaimer:
      "C147.19 connects risk reassessment to persistent human review. It does not rank securities, predict returns, provide personalized investment advice, or execute trades.",
  };

  if (
    !symbol ||
    !bridge.success
  ) {
    return {
      success: false,
      code:
        "C147_19_RISK_REASSESSMENT_HUMAN_REVIEW_INSUFFICIENT",
      action:
        "insufficient-evidence",
      taskId:
        null,
      review:
        null,
      existingReview:
        null,
      mutationPerformed:
        false,
      ...base,
      runtime: {
        ...base.runtime,
        latencyMs:
          Date.now() -
          startedAt,
      },
    };
  }

  if (
    !bridge.reassessmentRequired
  ) {
    return {
      success: true,
      code:
        "C147_19_RISK_REASSESSMENT_HUMAN_REVIEW_BLOCKED",
      action:
        "review-blocked",
      taskId:
        null,
      review:
        null,
      existingReview:
        null,
      mutationPerformed:
        false,
      ...base,
      runtime: {
        ...base.runtime,
        latencyMs:
          Date.now() -
          startedAt,
      },
    };
  }

  let taskId =
    normalizeText(
      request.taskId,
      200,
    ) || null;

  if (!taskId) {
    const reassessmentId =
      bridge.reassessment?.reassessmentId ??
      `C14719-${Date.now()}`;

    const eventId =
      bridge.riskControl
        .riskItems?.[0]
        ?.riskId ??
      null;

    const task =
      await createPersistentTask(
        `Market Human Review: ${symbol}`,
        buildDescription(
          symbol,
          market,
          eventId,
          reassessmentId,
        ),
        {
          allowDuplicate:
            true,
        },
      );

    taskId =
      task.id;
  }

  const existing =
    await getMarketHumanReview(
      taskId,
    );

  if (existing) {
    return {
      success: true,
      code:
        "C147_19_RISK_REASSESSMENT_HUMAN_REVIEW_ALREADY_RECORDED",
      action:
        "review-already-recorded",
      taskId,
      review:
        existing,
      existingReview:
        existing,
      mutationPerformed:
        false,
      ...base,
      runtime: {
        ...base.runtime,
        latencyMs:
          Date.now() -
          startedAt,
      },
    };
  }

  if (
    !isDecision(
      request.decision,
    )
  ) {
    return {
      success: true,
      code:
        "C147_19_RISK_REASSESSMENT_HUMAN_REVIEW_TASK_CREATED",
      action:
        "review-task-created",
      taskId,
      review:
        null,
      existingReview:
        null,
      mutationPerformed:
        true,
      ...base,
      runtime: {
        ...base.runtime,
        latencyMs:
          Date.now() -
          startedAt,
      },
    };
  }

  const review =
    await runMarketHumanReview({
      taskId,
      decision:
        request.decision,
      reviewerNote:
        request.reviewerNote ??
        null,
    });

  if (
    !review.success
  ) {
    return {
      success: false,
      code:
        "C147_19_RISK_REASSESSMENT_HUMAN_REVIEW_BLOCKED",
      action:
        "review-blocked",
      taskId,
      review:
        null,
      existingReview:
        review.existingReview,
      mutationPerformed:
        false,
      ...base,
      runtime: {
        ...base.runtime,
        latencyMs:
          Date.now() -
          startedAt,
      },
    };
  }

  return {
    success: true,
    code:
      "C147_19_RISK_REASSESSMENT_HUMAN_REVIEW_RECORDED",
    action:
      "review-recorded",
    taskId,
    review:
      review.review,
    existingReview:
      null,
    mutationPerformed:
      true,
    ...base,
    runtime: {
      ...base.runtime,
      latencyMs:
        Date.now() -
        startedAt,
    },
  };
}
