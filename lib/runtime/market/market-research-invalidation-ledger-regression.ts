import { runMarketResearchInvalidationLedger } from "./market-research-invalidation-ledger-runtime";
import type { MarketResearchOutcomeReconciliationResult } from "./market-research-outcome-reconciliation-types";

function buildReconciliationFixture(): MarketResearchOutcomeReconciliationResult {
  return {
    success: true,
    code: "C160_MARKET_RESEARCH_OUTCOME_RECONCILIATION_PARTIAL",
    state: "review-required",
    symbol: "NVDA",
    market: "us",
    reconciliation: {
      decisionState: "review-required",
      decisionReviewStatus: "pending-human-review",
      materialChange: true,
      evidenceVerified: true,
      paperTradingState: "review-ready",
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
        condition: "Material evidence changes the current research interpretation.",
        status: "preserved-for-human-review",
        automaticEvaluation: false,
      },
    ],
    findings: [
      {
        category: "alignment",
        title: "Research and outcome records linked",
        observation: "C157 and C159 are linked for the same historical review.",
        requiresHumanReview: true,
      },
      {
        category: "data",
        title: "Outcome includes web-evidence pricing",
        observation: "Historical pricing uses web evidence.",
        requiresHumanReview: true,
      },
      {
        category: "boundary",
        title: "Boundary remains human-controlled",
        observation: "No live trading action is represented.",
        requiresHumanReview: true,
      },
    ],
    methodology: {
      sourceDecisionWorkspace: "C157.1",
      sourcePerformanceReview: "C159.1",
      descriptiveReconciliationOnly: true,
      futurePerformancePrediction: false,
      recommendationGenerated: false,
      automaticInvalidationEvaluation: false,
    },
    boundary: {
      humanDecisionRequired: true,
      decisionAutomaticallyGenerated: false,
      decisionRecorded: false,
      taskCreated: false,
      plannerDispatched: false,
      brokerConnected: false,
      liveOrderPlaced: false,
      tradingExecuted: false,
    },
    upstream: {
      decisionWorkspace: "C157.1",
      paperTradeGate: "C158",
      paperTrading: "C151",
      performanceReview: "C159.1",
      liveTradingBoundary: "C152",
    },
    pipeline: ["C157", "C158", "C151", "C159", "C160", "C152"],
    principles: ["Regression fixture."],
    disclaimer: "Regression fixture only.",
    generatedAt: "2026-09-25T00:00:00.000Z",
    latencyMs: 1,
  };
}

export async function runMarketResearchInvalidationLedgerRegression() {
  const result = await runMarketResearchInvalidationLedger({
    symbol: "NVDA",
    market: "us",
    reconciliation: buildReconciliationFixture(),
  });

  const checks = [
    result.success === true,
    result.code === "C161_MARKET_RESEARCH_INVALIDATION_LEDGER_PARTIAL",
    result.state === "review-required",
    result.symbol === "NVDA",
    result.market === "us",
    result.ledger.itemCount === 3,
    result.ledger.invalidationConditionCount === 1,
    result.ledger.evidenceGapCount === 1,
    result.ledger.outcomeObservationCount === 1,
    result.ledger.boundaryObservationCount === 1,
    result.ledger.items[0]?.automaticEvaluation === false,
    result.boundary.tradingExecuted === false,
  ];

  const passed = checks.filter(Boolean).length;
  const total = checks.length;

  return {
    success: passed === total,
    code:
      passed === total
        ? "C161_MARKET_RESEARCH_INVALIDATION_LEDGER_REGRESSION_PASS"
        : "C161_MARKET_RESEARCH_INVALIDATION_LEDGER_REGRESSION_FAIL",
    passed,
    total,
    checks,
    result,
  };
}
