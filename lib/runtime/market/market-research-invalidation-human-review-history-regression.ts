import {
  deleteMarketResearchInvalidationLedger,
  runMarketResearchInvalidationLedger,
} from "./market-research-invalidation-ledger-runtime";

import {
  decideMarketResearchInvalidationHumanReview,
  getMarketResearchInvalidationHumanReview,
  runMarketResearchInvalidationHumanReview,
} from "./market-research-invalidation-human-review-runtime";

import {
  getMarketResearchInvalidationHumanReviewIndex,
  registerMarketResearchInvalidationHumanReviewIndex,
  runMarketResearchInvalidationHumanReviewHistory,
} from "./market-research-invalidation-human-review-history-runtime";

import type {
  MarketResearchOutcomeReconciliationResult,
} from "./market-research-outcome-reconciliation-types";

function fixture(
  symbol: string,
): MarketResearchOutcomeReconciliationResult {
  return {
    success:
      true,

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
        12,

      totalReturnPercent:
        0.12,

      maxDrawdown:
        4,

      maxDrawdownPercent:
        0.04,

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
          "C161.4 history regression fixture",

        observation:
          "Explicit human-review history traceability.",

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
      "C161.3 Explicit Human Review",
      "C161.4 Human Review History",
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

export async function runMarketResearchInvalidationHumanReviewHistoryRegression() {
  const ledgerResult =
    await runMarketResearchInvalidationLedger({
      reconciliation:
        fixture(
          "C1614-REGRESSION",
        ),
    });

  if (
    !ledgerResult.success ||
    !ledgerResult.ledger
  ) {
    return {
      success:
        false,

      code:
        "C161_4_RESEARCH_INVALIDATION_HUMAN_REVIEW_HISTORY_REGRESSION_FAIL",

      passed:
        0,

      total:
        8,

      checks:
        [],
    };
  }

  const ledger =
    ledgerResult.ledger;

  const pending =
    await runMarketResearchInvalidationHumanReview({
      ledgerId:
        ledger.ledgerId,
    });

  const pendingReview =
    await getMarketResearchInvalidationHumanReview(
      ledger.ledgerId,
    );

  if (
    !pendingReview
  ) {
    await deleteMarketResearchInvalidationLedger(
      ledger.ledgerId,
    );

    return {
      success:
        false,

      code:
        "C161_4_RESEARCH_INVALIDATION_HUMAN_REVIEW_HISTORY_REGRESSION_FAIL",

      passed:
        0,

      total:
        8,

      checks:
        [],
    };
  }

  await registerMarketResearchInvalidationHumanReviewIndex(
    pendingReview,
  );

  const pendingHistory =
    await runMarketResearchInvalidationHumanReviewHistory({
      ledgerId:
        ledger.ledgerId,

      limit:
        10,
    });

  const decided =
    await decideMarketResearchInvalidationHumanReview({
      ledgerId:
        ledger.ledgerId,

      decision:
        "request-research-update",

      rationale:
        "Explicit C161.4 regression human decision.",
    });

  const decidedReview =
    await getMarketResearchInvalidationHumanReview(
      ledger.ledgerId,
    );

  if (
    decidedReview
  ) {
    await registerMarketResearchInvalidationHumanReviewIndex(
      {
        ...decidedReview,
        status:
          decidedReview.status,
        decision:
          decidedReview.decision,
        updatedAt:
          decidedReview.updatedAt,
      },
    );
  }

  const history =
    await runMarketResearchInvalidationHumanReviewHistory({
      ledgerId:
        ledger.ledgerId,

      limit:
        10,
    });

  const index =
    await getMarketResearchInvalidationHumanReviewIndex();

  const checks = [
    pending.success ===
      true,

    pendingReview.status ===
      "pending",

    pendingHistory.success ===
      true,

    pendingHistory.items.some(
      (item) =>
        item.ledgerId ===
        ledger.ledgerId,
    ),

    decided.success ===
      true,

    history.success ===
      true,

    history.items[0]?.decision ===
      "request-research-update",

    history.humanDecisionRequired ===
      true &&
      history.boundary
        .decisionRecorded ===
        false &&
      history.boundary
        .plannerDispatched ===
        false &&
      history.boundary
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
        ? "C161_4_RESEARCH_INVALIDATION_HUMAN_REVIEW_HISTORY_REGRESSION_PASS"
        : "C161_4_RESEARCH_INVALIDATION_HUMAN_REVIEW_HISTORY_REGRESSION_FAIL",

    passed,

    total:
      checks.length,

    checks,

    indexEntryCount:
      index.entries.length,
  };
}
