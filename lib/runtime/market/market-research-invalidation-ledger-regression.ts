import {
  deleteMarketResearchInvalidationLedger,
  getMarketResearchInvalidationLedger,
  runMarketResearchInvalidationLedger,
} from "./market-research-invalidation-ledger-runtime";

import type {
  MarketResearchOutcomeReconciliationResult,
} from "./market-research-outcome-reconciliation-types";

function buildFixture(): MarketResearchOutcomeReconciliationResult {
  return {
    success: true,
    code:
      "C160_MARKET_RESEARCH_OUTCOME_RECONCILIATION_PARTIAL",
    state: "review-required",

    symbol: "NVDA",
    market: "us",

    reconciliation: {
      decisionState:
        "review-required",
      decisionReviewStatus:
        "pending-human-review",

      materialChange: true,
      evidenceVerified: true,

      paperTradingState:
        "review-ready",
      paperTradingSuccess: true,

      netProfit: 30,
      totalReturnPercent: 0.3,

      maxDrawdown: 20,
      maxDrawdownPercent: 0.2,

      filledOrders: 2,
      rejectedOrders: 0,
      openPositions: 0,
    },

    conditionReviews: [
      {
        condition:
          "Material evidence changes the current research interpretation.",
        status:
          "preserved-for-human-review",
        automaticEvaluation: false,
      },
    ],

    findings: [
      {
        category: "alignment",
        title:
          "Research and outcome records linked",
        observation:
          "C160 regression fixture.",
        requiresHumanReview: true,
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
      "C152 Live Trading Boundary",
    ],

    principles: [
      "Regression fixture only.",
    ],

    disclaimer:
      "Regression fixture only.",

    generatedAt:
      "2026-09-25T00:00:00.000Z",

    latencyMs: 1,
  };
}

export async function runMarketResearchInvalidationLedgerRegression() {
  const fixture =
    buildFixture();

  const first =
    await runMarketResearchInvalidationLedger(
      {
        reconciliation:
          fixture,
      },
    );

  if (!first.ledger) {
    return {
      success: false,
      code:
        "C161_1_RESEARCH_INVALIDATION_LEDGER_REGRESSION_FAIL",
      passed: 0,
      total: 8,
      checks: [],
      result: first,
    };
  }

  const readback =
    await getMarketResearchInvalidationLedger(
      first.ledger.ledgerId,
    );

  const second =
    await runMarketResearchInvalidationLedger(
      {
        reconciliation:
          fixture,
      },
    );

  const checks = [
    first.success === true,

    first.code ===
      "C161_1_RESEARCH_INVALIDATION_LEDGER_PASS",

    first.mutationPerformed === true,

    readback?.ledgerId ===
      first.ledger.ledgerId,

    readback?.status ===
      "pending-human-review",

    readback?.humanReview
      .decisionRecorded === false,

    readback?.boundary
      .automaticInvalidationEvaluation === false,

    second.code ===
      "C161_1_RESEARCH_INVALIDATION_LEDGER_ALREADY_EXISTS" &&
      second.mutationPerformed === false &&
      second.ledger?.ledgerId ===
        first.ledger.ledgerId,
  ];

  const passed =
    checks.filter(Boolean).length;

  const total =
    checks.length;

  await deleteMarketResearchInvalidationLedger(
    first.ledger.ledgerId,
  );

  return {
    success:
      passed === total,
    code:
      passed === total
        ? "C161_1_RESEARCH_INVALIDATION_LEDGER_REGRESSION_PASS"
        : "C161_1_RESEARCH_INVALIDATION_LEDGER_REGRESSION_FAIL",
    passed,
    total,
    checks,
    result: first,
    readback,
    duplicateAttempt: second,
  };
}
