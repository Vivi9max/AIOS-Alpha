import {
  deleteMarketResearchInvalidationLedger,
  runMarketResearchInvalidationLedger,
} from "./market-research-invalidation-ledger-runtime";

import {
  runMarketResearchInvalidationLedgerHistory,
} from "./market-research-invalidation-ledger-history-runtime";

import type {
  MarketResearchOutcomeReconciliationResult,
} from "./market-research-outcome-reconciliation-types";

function buildFixture(
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
        30,

      totalReturnPercent:
        0.3,

      maxDrawdown:
        20,

      maxDrawdownPercent:
        0.2,

      filledOrders:
        2,

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
          "Research and outcome records linked",

        observation:
          "C161.2 history regression fixture.",

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
      "C161.2 Ledger History",
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

export async function runMarketResearchInvalidationLedgerHistoryRegression() {
  const symbols = [
    "C1612-A",
    "C1612-B",
  ];

  const ledgers = [];

  for (
    const symbol of symbols
  ) {
    const result =
      await runMarketResearchInvalidationLedger(
        {
          reconciliation:
            buildFixture(
              symbol,
            ),
        },
      );

    if (
      !result.success ||
      !result.ledger
    ) {
      return {
        success: false,

        code:
          "C161_2_RESEARCH_INVALIDATION_LEDGER_HISTORY_REGRESSION_FAIL",

        passed: 0,

        total: 8,

        checks: [],

        result,
      };
    }

    ledgers.push(
      result.ledger,
    );
  }

  const history =
    await runMarketResearchInvalidationLedgerHistory(
      {
        market:
          "us",

        limit:
          10,
      },
    );

  const symbolHistory =
    await runMarketResearchInvalidationLedgerHistory(
      {
        symbol:
          symbols[0],

        market:
          "us",

        limit:
          10,
      },
    );

  const checks = [
    history.success === true,

    history.code ===
      "C161_2_RESEARCH_INVALIDATION_LEDGER_HISTORY_PASS",

    history.total >= 2,

    history.items.some(
      (item) =>
        item.ledgerId ===
        ledgers[0].ledgerId,
    ),

    history.items.some(
      (item) =>
        item.ledgerId ===
        ledgers[1].ledgerId,
    ),

    symbolHistory.total === 1,

    symbolHistory.items[0]?.ledgerId ===
      ledgers[0].ledgerId,

    history.boundary
      .automaticInvalidationEvaluation ===
      false &&
      history.boundary
        .decisionRecorded ===
        false &&
      history.boundary
        .tradingExecuted ===
        false,
  ];

  const passed =
    checks.filter(Boolean)
      .length;

  const total =
    checks.length;

  for (
    const ledger of ledgers
  ) {
    await deleteMarketResearchInvalidationLedger(
      ledger.ledgerId,
    );
  }

  return {
    success:
      passed === total,

    code:
      passed === total
        ? "C161_2_RESEARCH_INVALIDATION_LEDGER_HISTORY_REGRESSION_PASS"
        : "C161_2_RESEARCH_INVALIDATION_LEDGER_HISTORY_REGRESSION_FAIL",

    passed,

    total,

    checks,

    history,

    symbolHistory,
  };
}
