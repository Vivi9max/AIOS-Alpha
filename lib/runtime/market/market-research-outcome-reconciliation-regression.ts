import {
  runMarketResearchOutcomeReconciliation,
} from "./market-research-outcome-reconciliation-runtime";

import type {
  MarketDecisionWorkspaceItem,
} from "./market-decision-workspace-types";

import type {
  MarketPaperTradePerformanceResult,
} from "./market-paper-trade-performance-types";

function buildDecisionFixture(): MarketDecisionWorkspaceItem {
  return {
    decisionId: "C157:us:NVDA",
    symbol: "NVDA",
    market: "us",
    state: "review-required",
    reviewStatus: "pending-human-review",
    priority: "high",
    materialChange: true,
    evidence: {
      identityVerified: true,
      verified: true,
      sourceCount: 5,
      independentDomains: 4,
      conflictCount: 0,
      dataQuality: "web-evidence",
      freshness: "fresh",
    },
    researchSummary: {
      change: "Material market change detected",
      industry: "Semiconductors",
      company: "NVIDIA",
      fundamentals: "Available for human review",
      valuation: "Valuation evidence available",
      risk: "normal",
    },
    evidenceGaps: [],
    decisionQuestions: [],
    invalidationConditions: [
      "Material evidence changes the current research interpretation.",
    ],
    humanDecisionRequired: true,
    decisionRecorded: false,
    recommendationGenerated: false,
    tradingAllowed: false,
  };
}

function buildPerformanceFixture(): MarketPaperTradePerformanceResult {
  return {
    success: true,
    code: "C159_MARKET_PAPER_TRADE_PERFORMANCE_PASS",
    state: "review-ready",
    symbol: "NVDA",
    market: "us",
    metrics: {
      initialCapital: 10000,
      finalCash: 9977,
      finalEquity: 10030,
      netProfit: 30,
      totalReturnPercent: 0.3,
      realizedPnl: 30,
      unrealizedPnl: 0,
      totalFees: 4,
      totalSlippage: 3,
      requestedOrders: 2,
      filledOrders: 2,
      rejectedOrders: 0,
      fillRatePercent: 100,
      rejectionRatePercent: 0,
      openPositions: 0,
      maxDrawdown: 20,
      maxDrawdownPercent: 0.2,
    },
    dataQuality: {
      priceSources: ["explicit-order"],
      providers: ["regression"],
      dataQualities: ["web-evidence"],
      verifiedPriceCount: 1,
      unverifiedPriceCount: 0,
      insufficientPriceCount: 0,
      historicalPriceCount: 0,
      runtimePriceCount: 0,
      webEvidencePriceCount: 1,
      asOf: "2026-09-25T00:00:00.000Z",
    },
    reviewItems: [],
    methodology: {
      source: "C151",
      simulationOnly: true,
      historicalPerformanceOnly: true,
      futurePerformancePrediction: false,
      recommendationGenerated: false,
    },
    boundary: {
      humanDecisionRequired: true,
      decisionAutomaticallyGenerated: false,
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
      liveTradingBoundary: "C152",
    },
    pipeline: [
      "C157 Human Decision Workspace",
      "C158 Human Paper Trade Gate",
      "C151 Paper Trading",
      "C159 Performance Review",
      "C152 Live Trading Boundary",
    ],
    principles: [
      "Historical simulation is descriptive.",
    ],
    disclaimer: "Regression fixture only.",
    generatedAt: "2026-09-25T00:00:00.000Z",
    latencyMs: 1,
  };
}

export async function runMarketResearchOutcomeReconciliationRegression() {
  const result = await runMarketResearchOutcomeReconciliation({
    symbol: "NVDA",
    market: "us",
    decisionWorkspace: buildDecisionFixture(),
    performanceReview: buildPerformanceFixture(),
  });

  const checks = [
    result.code ===
      "C160_MARKET_RESEARCH_OUTCOME_RECONCILIATION_PARTIAL",
    result.state === "review-required",
    result.symbol === "NVDA",
    result.market === "us",
    result.reconciliation.materialChange === true,
    result.reconciliation.evidenceVerified === true,
    result.reconciliation.netProfit === 30,
    result.reconciliation.maxDrawdown === 20,
    result.conditionReviews.length === 1,
    result.conditionReviews[0]?.automaticEvaluation === false,
    result.methodology.futurePerformancePrediction === false,
    result.boundary.tradingExecuted === false,
  ];

  const passed = checks.filter(Boolean).length;
  const total = checks.length;

  return {
    success: result.success && passed === total,
    code: result.success && passed === total
      ? "C160_MARKET_RESEARCH_OUTCOME_RECONCILIATION_REGRESSION_PASS"
      : "C160_MARKET_RESEARCH_OUTCOME_RECONCILIATION_REGRESSION_FAIL",
    passed,
    total,
    checks,
    result,
  };
}
