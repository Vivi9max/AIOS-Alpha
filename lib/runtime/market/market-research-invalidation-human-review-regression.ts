import {
  deleteMarketResearchInvalidationLedger,
  runMarketResearchInvalidationLedger,
} from "./market-research-invalidation-ledger-runtime";

import {
  decideMarketResearchInvalidationHumanReview,
  getMarketResearchInvalidationHumanReview,
  runMarketResearchInvalidationHumanReview,
} from "./market-research-invalidation-human-review-runtime";

import type {
  MarketResearchOutcomeReconciliationResult,
} from "./market-research-outcome-reconciliation-types";

function fixture(
  symbol: string,
): MarketResearchOutcomeReconciliationResult {
  return {
    success: true,

    code:
      "C160_MARKET_RESEARCH_OUTCOME_RECONCILIATION_PARTIAL",

    state:
      "review-required",

    symbol,

    market:
      "us",

    reconciliation: {
      decisionState:
        "review-required",

      decisionReviewStatus:
        "pending-human-review",

      materialChange:
        true,

      evidenceVerified:
        true,

      paperTradingState:
        "review-ready",

      paperTradingSuccess:
        true,

      netProfit:
        10,

      totalReturnPercent:
        0.1,

      maxDrawdown:
        5,

      maxDrawdownPercent:
        0.05,

      filledOrders:
        1,

      rejectedOrders:
        0,

      openPositions:
        0,
    },

    conditionReviews: [
      {
        condition:
          "Material evidence changes the current research interpretation.",

        status:
          "preserved-for-human-review",

        automaticEvaluation:
          false,
      },
    ],

    findings: [
      {
        category:
          "alignment",

        title:
          "C161.3 regression fixture",

        observation:
          "Explicit human review boundary.",

        requiresHumanReview:
          true,
      },
    ],

    methodology: {
      sourceDecisionWorkspace:
        "C157.1",

      sourcePerformanceReview:
        "C159.1",

      descriptiveReconciliationOnly:
        true,

      futurePerformancePrediction:
        false,

      recommendationGenerated:
        false,

      automaticInvalidationEvaluation:
        false,
    },

    boundary: {
      humanDecisionRequired:
        true,

      decisionAutomaticallyGenerated:
        false,

      decisionRecorded:
        false,

      taskCreated:
        false,

      plannerDispatched:
        false,

      brokerConnected:
        false,

      liveOrderPlaced:
        false,

      tradingExecuted:
        false,
    },

    upstream: {
      decisionWorkspace:
        "C157.1",

      paperTradeGate:
        "C158",

      paperTrading:
        "C151",

      performanceReview:
        "C159.1",

      liveTradingBoundary:
        "C152",
    },

    pipeline: [
      "C157 Human Decision Workspace",
      "C158 Human Paper Trade Gate",
      "C151 Paper Trading",
      "C159 Performance Review",
      "C160 Research ↔ Outcome Reconciliation",
      "C161.1 Research Invalidation Ledger",
      "C161.2 Persistent Ledger History",
      "C161.3 Human Review",
      "C152 Live Trading Boundary",
    ],

    principles: [
      "Regression fixture only.",
    ],

    disclaimer:
      "Regression fixture only.",

    generatedAt:
      "2026-09-26T00:00:00.000Z",

    latencyMs:
      1,
  };
}

export async function runMarketResearchInvalidationHumanReviewRegression() {
  const ledgerResult =
    await runMarketResearchInvalidationLedger({
      reconciliation:
        fixture(
          "C1613-REGRESSION",
        ),
    });

  if (
    !ledgerResult.success ||
    !ledgerResult.ledger
  ) {
    return {
      success: false,
      code:
        "C161_3_RESEARCH_INVALIDATION_HUMAN_REVIEW_REGRESSION_FAIL",
      passed: 0,
      total: 8,
    };
  }

  const ledger =
    ledgerResult.ledger;

  const pending =
    await runMarketResearchInvalidationHumanReview({
      ledgerId:
        ledger.ledgerId,
    });

  const storedPending =
    await getMarketResearchInvalidationHumanReview(
      ledger.ledgerId,
    );

  const decided =
    await decideMarketResearchInvalidationHumanReview({
      ledgerId:
        ledger.ledgerId,

      decision:
        "request-research-update",

      rationale:
        "Explicit C161.3 regression human decision.",
    });

  const storedDecision =
    await getMarketResearchInvalidationHumanReview(
      ledger.ledgerId,
    );

  const checks = [
    pending.success === true,

    pending.code ===
      "C161_3_RESEARCH_INVALIDATION_HUMAN_REVIEW_PENDING",

    pending.review?.status ===
      "pending",

    storedPending?.ledgerId ===
      ledger.ledgerId,

    decided.success === true,

    decided.review?.status ===
      "decided",

    storedDecision?.decision ===
      "request-research-update",

    decided.boundary
      .automaticInvalidationEvaluation ===
      false &&
      decided.boundary
        .plannerDispatched ===
        false &&
      decided.boundary
        .tradingExecuted ===
        false,
  ];

  const passed =
    checks.filter(
      Boolean,
    ).length;

  await deleteMarketResearchInvalidationLedger(
    ledger.ledgerId,
  );

  return {
    success:
      passed ===
      checks.length,

    code:
      passed ===
      checks.length
        ? "C161_3_RESEARCH_INVALIDATION_HUMAN_REVIEW_REGRESSION_PASS"
        : "C161_3_RESEARCH_INVALIDATION_HUMAN_REVIEW_REGRESSION_FAIL",

    passed,

    total:
      checks.length,

    checks,
  };
}
