import type {
  MarketResearchOutcomeConditionReview,
  MarketResearchOutcomeFinding,
  MarketResearchOutcomeReconciliationRequest,
  MarketResearchOutcomeReconciliationResult,
} from "./market-research-outcome-reconciliation-types";

function normalizeSymbol(value: string): string {
  return value.trim().toUpperCase();
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function insufficientResult(
  request: MarketResearchOutcomeReconciliationRequest,
  reason: string,
  startedAt: number,
): MarketResearchOutcomeReconciliationResult {
  const symbol = normalizeSymbol(request.symbol);
  return {
    success: false,
    code: "C160_MARKET_RESEARCH_OUTCOME_RECONCILIATION_INSUFFICIENT",
    state: "insufficient",
    symbol,
    market: request.market,
    reconciliation: {
      decisionState: request.decisionWorkspace?.state ?? "insufficient",
      decisionReviewStatus:
        request.decisionWorkspace?.reviewStatus ?? "blocked",
      materialChange: request.decisionWorkspace?.materialChange ?? false,
      evidenceVerified: request.decisionWorkspace?.evidence.verified ?? false,
      paperTradingState:
        request.performanceReview?.state ?? "insufficient",
      paperTradingSuccess:
        request.performanceReview?.success ?? false,
      netProfit: 0,
      totalReturnPercent: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      filledOrders: 0,
      rejectedOrders: 0,
      openPositions: 0,
    },
    conditionReviews: [],
    findings: [{
      category: "gap",
      title: "Reconciliation inputs incomplete",
      observation: reason,
      requiresHumanReview: true,
    }],
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
    pipeline: [
      "C157 Human Decision Workspace",
      "C158 Human Paper Trade Gate",
      "C151 Paper Trading",
      "C159 Performance Review",
      "C160 Research ↔ Outcome Reconciliation",
      "C152 Live Trading Boundary",
    ],
    principles: [
      "C160 reconciles recorded research context with recorded simulation outcomes.",
      "C160 does not decide whether a thesis was correct.",
      "Invalidation conditions remain for human evaluation.",
      "No recommendation or trading instruction is generated.",
    ],
    disclaimer:
      "C160 requires both the C157 decision workspace and C159 performance review before reconciliation.",
    generatedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
  };
}

function buildConditionReviews(
  conditions: string[],
): MarketResearchOutcomeConditionReview[] {
  return conditions
    .filter((condition) => condition.trim().length > 0)
    .map((condition) => ({
      condition,
      status: "preserved-for-human-review" as const,
      automaticEvaluation: false as const,
    }));
}

function buildFindings(
  request: MarketResearchOutcomeReconciliationRequest,
): MarketResearchOutcomeFinding[] {
  const decision = request.decisionWorkspace;
  const review = request.performanceReview;
  const findings: MarketResearchOutcomeFinding[] = [];

  findings.push({
    category: "alignment",
    title: "Research and outcome records linked",
    observation:
      `C157 decision workspace ${decision.decisionId} is reconciled with the supplied C159 historical performance review for ${request.symbol.toUpperCase()}.`,
    requiresHumanReview: true,
  });

  if (decision.materialChange) {
    findings.push({
      category: "alignment",
      title: "Material change was present at decision stage",
      observation:
        "The C157 workspace recorded a material market change. C160 preserves that fact and does not reinterpret its significance from the paper-trading result.",
      requiresHumanReview: true,
    });
  }

  if (!decision.evidence.verified) {
    findings.push({
      category: "data",
      title: "Decision-stage evidence was not fully verified",
      observation:
        "The C157 workspace was not fully evidence-verified. The paper-trading outcome is therefore not treated as validation of the underlying research evidence.",
      requiresHumanReview: true,
    });
  }

  if (review.state !== "review-ready" || !review.success) {
    findings.push({
      category: "gap",
      title: "Performance review remains partial",
      observation:
        `C159 returned state ${review.state}. The outcome is preserved as descriptive evidence rather than treated as a completed validation result.`,
      requiresHumanReview: true,
    });
  }

  if (review.dataQuality.insufficientPriceCount > 0) {
    findings.push({
      category: "data",
      title: "Outcome contains insufficient pricing evidence",
      observation:
        `${review.dataQuality.insufficientPriceCount} candidate result(s) had insufficient pricing evidence in C159.`,
      requiresHumanReview: true,
    });
  }

  if (review.dataQuality.webEvidencePriceCount > 0) {
    findings.push({
      category: "data",
      title: "Outcome includes web-evidence pricing",
      observation:
        "C159 reports web-evidence pricing. This is not treated as equivalent to verified real-time market data.",
      requiresHumanReview: true,
    });
  }

  if (review.metrics.openPositions > 0) {
    findings.push({
      category: "gap",
      title: "Simulation ended with open positions",
      observation:
        `${review.metrics.openPositions} simulated position(s) remained open at the end of the reviewed run, so the final result may not represent a fully closed simulation path.`,
      requiresHumanReview: true,
    });
  }

  if (review.metrics.maxDrawdown > 0) {
    findings.push({
      category: "alignment",
      title: "Observed historical drawdown",
      observation:
        `C159 recorded maximum simulated drawdown of ${review.metrics.maxDrawdown.toFixed(2)} (${review.metrics.maxDrawdownPercent.toFixed(2)}%). C160 reports it without converting it into a future-risk prediction.`,
      requiresHumanReview: true,
    });
  }

  if (review.boundary.tradingExecuted || review.boundary.liveOrderPlaced) {
    findings.push({
      category: "boundary",
      title: "Unexpected live-trading boundary signal",
      observation:
        "The supplied C159 result contains a live-trading boundary signal inconsistent with the expected simulation-only state. Human review is required.",
      requiresHumanReview: true,
    });
  }

  return findings;
}

export async function runMarketResearchOutcomeReconciliation(
  request: MarketResearchOutcomeReconciliationRequest,
): Promise<MarketResearchOutcomeReconciliationResult> {
  const startedAt = Date.now();
  const symbol = normalizeSymbol(request.symbol);

  if (!symbol) {
    return insufficientResult(
      request,
      "A valid market symbol is required.",
      startedAt,
    );
  }

  if (!request.decisionWorkspace) {
    return insufficientResult(
      request,
      "A C157 Decision Workspace item is required.",
      startedAt,
    );
  }

  if (!request.performanceReview) {
    return insufficientResult(
      request,
      "A C159 Performance Review result is required.",
      startedAt,
    );
  }

  if (
    normalizeSymbol(request.decisionWorkspace.symbol) !== symbol ||
    request.decisionWorkspace.market !== request.market
  ) {
    return insufficientResult(
      request,
      "C157 symbol and market must match the reconciliation request.",
      startedAt,
    );
  }

  if (
    normalizeSymbol(request.performanceReview.symbol) !== symbol ||
    request.performanceReview.market !== request.market
  ) {
    return insufficientResult(
      request,
      "C159 symbol and market must match the reconciliation request.",
      startedAt,
    );
  }

  const findings = buildFindings(request);
  const conditionReviews = buildConditionReviews(
    request.decisionWorkspace.invalidationConditions,
  );

  const hasMaterialGap =
    request.decisionWorkspace.state === "blocked" ||
    request.decisionWorkspace.state === "insufficient" ||
    request.performanceReview.state === "insufficient";

  const state = hasMaterialGap
    ? "review-required"
    : findings.some((finding) => finding.category === "gap" || finding.category === "data")
      ? "review-required"
      : "reconciled";

  return {
    success: true,
    code:
      state === "reconciled"
        ? "C160_MARKET_RESEARCH_OUTCOME_RECONCILIATION_PASS"
        : "C160_MARKET_RESEARCH_OUTCOME_RECONCILIATION_PARTIAL",
    state,
    symbol,
    market: request.market,
    reconciliation: {
      decisionState: request.decisionWorkspace.state,
      decisionReviewStatus: request.decisionWorkspace.reviewStatus,
      materialChange: request.decisionWorkspace.materialChange,
      evidenceVerified: request.decisionWorkspace.evidence.verified,
      paperTradingState: request.performanceReview.state,
      paperTradingSuccess: request.performanceReview.success,
      netProfit: round(request.performanceReview.metrics.netProfit),
      totalReturnPercent: round(request.performanceReview.metrics.totalReturnPercent),
      maxDrawdown: round(request.performanceReview.metrics.maxDrawdown),
      maxDrawdownPercent: round(request.performanceReview.metrics.maxDrawdownPercent),
      filledOrders: request.performanceReview.metrics.filledOrders,
      rejectedOrders: request.performanceReview.metrics.rejectedOrders,
      openPositions: request.performanceReview.metrics.openPositions,
    },
    conditionReviews,
    findings,
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
    pipeline: [
      "C157 Human Decision Workspace",
      "C158 Human Paper Trade Gate",
      "C151 Paper Trading",
      "C159 Performance Review",
      "C160 Research ↔ Outcome Reconciliation",
      "C152 Live Trading Boundary",
    ],
    principles: [
      "C160 links research context to an observed historical simulation outcome.",
      "C160 does not declare a research thesis correct or incorrect.",
      "Decision invalidation conditions are preserved for human review.",
      "Historical paper performance is descriptive, not predictive.",
      "Data quality is reported separately from outcome metrics.",
      "No investment recommendation is generated.",
      "No decision is automatically recorded.",
      "No Planner task is created.",
      "No broker is connected.",
      "No live order is placed.",
      "No live trading is executed.",
    ],
    disclaimer:
      "C160 reconciles recorded research context with a historical paper-trading outcome. It does not validate future performance, automatically evaluate invalidation conditions, generate investment recommendations, or execute trading.",
    generatedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
  };
}
