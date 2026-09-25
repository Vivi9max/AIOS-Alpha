import type {
  MarketResearchInvalidationLedgerItem,
  MarketResearchInvalidationLedgerRequest,
  MarketResearchInvalidationLedgerResult,
} from "./market-research-invalidation-ledger-types";

function normalizeSymbol(value: string): string {
  return value.trim().toUpperCase();
}

function insufficientResult(
  request: MarketResearchInvalidationLedgerRequest,
  reason: string,
  startedAt: number,
): MarketResearchInvalidationLedgerResult {
  const symbol = normalizeSymbol(request.symbol);
  return {
    success: false,
    code: "C161_MARKET_RESEARCH_INVALIDATION_LEDGER_INSUFFICIENT",
    state: "insufficient",
    symbol,
    market: request.market,
    ledger: {
      itemCount: 0,
      invalidationConditionCount: 0,
      evidenceGapCount: 0,
      outcomeObservationCount: 0,
      boundaryObservationCount: 0,
      items: [],
    },
    source: {
      reconciliationCode:
        request.reconciliation?.code ??
        "C160_MARKET_RESEARCH_OUTCOME_RECONCILIATION_INSUFFICIENT",
      reconciliationState: request.reconciliation?.state ?? "insufficient",
      historicalOnly: true,
    },
    methodology: {
      source: "C160.1",
      ledgerConstructionOnly: true,
      automaticInvalidationEvaluation: false,
      thesisValidation: false,
      futurePerformancePrediction: false,
      recommendationGenerated: false,
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
      reconciliation: "C160.1",
      performanceReview: "C159.1",
      decisionWorkspace: "C157.1",
      paperTrading: "C151",
      liveTradingBoundary: "C152",
    },
    pipeline: [
      "C157 Human Decision Workspace",
      "C158 Human Paper Trade Gate",
      "C151 Paper Trading",
      "C159 Performance Review",
      "C160 Research ↔ Outcome Reconciliation",
      "C161 Research Invalidation Ledger",
      "C152 Live Trading Boundary",
    ],
    principles: [
      "C161 preserves research conditions and observations for human review.",
      "C161 does not automatically decide whether an invalidation condition occurred.",
      "C161 does not validate or invalidate a research thesis.",
      "Historical simulation remains descriptive and non-predictive.",
    ],
    disclaimer:
      "C161 constructs a human-review ledger from C160 records. It does not automatically evaluate invalidation conditions or generate trading recommendations.",
    generatedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
  };
}

function makeItem(
  index: number,
  type: MarketResearchInvalidationLedgerItem["type"],
  title: string,
  observation: string,
): MarketResearchInvalidationLedgerItem {
  return {
    id: `C161:${index + 1}`,
    type,
    title,
    observation,
    source: "C160.1",
    status: "preserved-for-human-review",
    automaticEvaluation: false,
    requiresHumanReview: true,
  };
}

export async function runMarketResearchInvalidationLedger(
  request: MarketResearchInvalidationLedgerRequest,
): Promise<MarketResearchInvalidationLedgerResult> {
  const startedAt = Date.now();
  const symbol = normalizeSymbol(request.symbol);
  const reconciliation = request.reconciliation;

  if (!symbol) {
    return insufficientResult(request, "A valid market symbol is required.", startedAt);
  }

  if (!reconciliation) {
    return insufficientResult(request, "A C160 reconciliation result is required.", startedAt);
  }

  if (
    normalizeSymbol(reconciliation.symbol) !== symbol ||
    reconciliation.market !== request.market
  ) {
    return insufficientResult(
      request,
      "C160 symbol and market must match the ledger request.",
      startedAt,
    );
  }

  const items: MarketResearchInvalidationLedgerItem[] = [];
  let index = 0;

  for (const condition of reconciliation.conditionReviews) {
    if (!condition.condition.trim()) continue;
    items.push(
      makeItem(
        index++,
        "invalidation-condition",
        "Research invalidation condition preserved",
        condition.condition,
      ),
    );
  }

  for (const finding of reconciliation.findings) {
    if (finding.category === "data" || finding.category === "gap") {
      items.push(
        makeItem(
          index++,
          "evidence-gap",
          finding.title,
          finding.observation,
        ),
      );
    } else if (finding.category === "boundary") {
      items.push(
        makeItem(
          index++,
          "boundary-observation",
          finding.title,
          finding.observation,
        ),
      );
    } else {
      items.push(
        makeItem(
          index++,
          "outcome-observation",
          finding.title,
          finding.observation,
        ),
      );
    }
  }

  const invalidationConditionCount = items.filter(
    (item) => item.type === "invalidation-condition",
  ).length;
  const evidenceGapCount = items.filter(
    (item) => item.type === "evidence-gap",
  ).length;
  const outcomeObservationCount = items.filter(
    (item) => item.type === "outcome-observation",
  ).length;
  const boundaryObservationCount = items.filter(
    (item) => item.type === "boundary-observation",
  ).length;

  const state =
    reconciliation.state === "insufficient"
      ? "review-required"
      : evidenceGapCount > 0 || boundaryObservationCount > 0
        ? "review-required"
        : "ledger-ready";

  return {
    success: true,
    code:
      state === "ledger-ready"
        ? "C161_MARKET_RESEARCH_INVALIDATION_LEDGER_PASS"
        : "C161_MARKET_RESEARCH_INVALIDATION_LEDGER_PARTIAL",
    state,
    symbol,
    market: request.market,
    ledger: {
      itemCount: items.length,
      invalidationConditionCount,
      evidenceGapCount,
      outcomeObservationCount,
      boundaryObservationCount,
      items,
    },
    source: {
      reconciliationCode: reconciliation.code,
      reconciliationState: reconciliation.state,
      historicalOnly: true,
    },
    methodology: {
      source: "C160.1",
      ledgerConstructionOnly: true,
      automaticInvalidationEvaluation: false,
      thesisValidation: false,
      futurePerformancePrediction: false,
      recommendationGenerated: false,
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
      reconciliation: "C160.1",
      performanceReview: "C159.1",
      decisionWorkspace: "C157.1",
      paperTrading: "C151",
      liveTradingBoundary: "C152",
    },
    pipeline: [
      "C157 Human Decision Workspace",
      "C158 Human Paper Trade Gate",
      "C151 Paper Trading",
      "C159 Performance Review",
      "C160 Research ↔ Outcome Reconciliation",
      "C161 Research Invalidation Ledger",
      "C152 Live Trading Boundary",
    ],
    principles: [
      "C161 preserves research conditions and observed outcomes as reviewable records.",
      "C161 never automatically marks an invalidation condition as triggered.",
      "C161 separates evidence gaps from historical outcome observations.",
      "C161 does not turn historical simulation into future performance prediction.",
      "C161 does not generate investment recommendations.",
      "C161 does not create tasks or dispatch Planner.",
      "C161 does not connect a broker or execute live trading.",
    ],
    disclaimer:
      "C161 is a structured human-review ledger derived from C160.1. A ledger item is not an automatic conclusion, thesis validation, or trading instruction.",
    generatedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
  };
}
