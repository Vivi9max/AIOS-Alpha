import type { MarketRegion } from "./market-types";
import type { MarketResearchOutcomeReconciliationResult } from "./market-research-outcome-reconciliation-types";

export type MarketResearchInvalidationLedgerState =
  | "ledger-ready"
  | "review-required"
  | "insufficient";

export type MarketResearchInvalidationLedgerItemType =
  | "invalidation-condition"
  | "evidence-gap"
  | "outcome-observation"
  | "boundary-observation";

export interface MarketResearchInvalidationLedgerItem {
  id: string;
  type: MarketResearchInvalidationLedgerItemType;
  title: string;
  observation: string;
  source: "C160.1";
  status: "preserved-for-human-review";
  automaticEvaluation: false;
  requiresHumanReview: true;
}

export interface MarketResearchInvalidationLedgerRequest {
  symbol: string;
  market: MarketRegion;
  reconciliation: MarketResearchOutcomeReconciliationResult;
  query?: string | null;
}

export interface MarketResearchInvalidationLedgerResult {
  success: boolean;
  code:
    | "C161_MARKET_RESEARCH_INVALIDATION_LEDGER_PASS"
    | "C161_MARKET_RESEARCH_INVALIDATION_LEDGER_PARTIAL"
    | "C161_MARKET_RESEARCH_INVALIDATION_LEDGER_INSUFFICIENT";
  state: MarketResearchInvalidationLedgerState;
  symbol: string;
  market: MarketRegion;
  ledger: {
    itemCount: number;
    invalidationConditionCount: number;
    evidenceGapCount: number;
    outcomeObservationCount: number;
    boundaryObservationCount: number;
    items: MarketResearchInvalidationLedgerItem[];
  };
  source: {
    reconciliationCode: MarketResearchOutcomeReconciliationResult["code"];
    reconciliationState: MarketResearchOutcomeReconciliationResult["state"];
    historicalOnly: true;
  };
  methodology: {
    source: "C160.1";
    ledgerConstructionOnly: true;
    automaticInvalidationEvaluation: false;
    thesisValidation: false;
    futurePerformancePrediction: false;
    recommendationGenerated: false;
  };
  boundary: {
    humanDecisionRequired: true;
    decisionAutomaticallyGenerated: false;
    decisionRecorded: false;
    taskCreated: false;
    plannerDispatched: false;
    brokerConnected: false;
    liveOrderPlaced: false;
    tradingExecuted: false;
  };
  upstream: {
    reconciliation: "C160.1";
    performanceReview: "C159.1";
    decisionWorkspace: "C157.1";
    paperTrading: "C151";
    liveTradingBoundary: "C152";
  };
  pipeline: string[];
  principles: string[];
  disclaimer: string;
  generatedAt: string;
  latencyMs: number;
}
