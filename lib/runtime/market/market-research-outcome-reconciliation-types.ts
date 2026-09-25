import type { MarketRegion } from "./market-types";
import type { MarketDecisionWorkspaceItem } from "./market-decision-workspace-types";
import type { MarketPaperTradePerformanceResult } from "./market-paper-trade-performance-types";

export type MarketResearchOutcomeReconciliationState =
  | "reconciled"
  | "review-required"
  | "insufficient";

export type MarketResearchOutcomeFindingCategory =
  | "alignment"
  | "gap"
  | "data"
  | "boundary";

export interface MarketResearchOutcomeFinding {
  category: MarketResearchOutcomeFindingCategory;
  title: string;
  observation: string;
  requiresHumanReview: true;
}

export interface MarketResearchOutcomeConditionReview {
  condition: string;
  status: "preserved-for-human-review";
  automaticEvaluation: false;
}

export interface MarketResearchOutcomeReconciliationRequest {
  symbol: string;
  market: MarketRegion;
  decisionWorkspace: MarketDecisionWorkspaceItem;
  performanceReview: MarketPaperTradePerformanceResult;
  query?: string | null;
}

export interface MarketResearchOutcomeReconciliationResult {
  success: boolean;
  code:
    | "C160_MARKET_RESEARCH_OUTCOME_RECONCILIATION_PASS"
    | "C160_MARKET_RESEARCH_OUTCOME_RECONCILIATION_PARTIAL"
    | "C160_MARKET_RESEARCH_OUTCOME_RECONCILIATION_INSUFFICIENT";
  state: MarketResearchOutcomeReconciliationState;
  symbol: string;
  market: MarketRegion;
  reconciliation: {
    decisionState: MarketDecisionWorkspaceItem["state"];
    decisionReviewStatus: MarketDecisionWorkspaceItem["reviewStatus"];
    materialChange: boolean;
    evidenceVerified: boolean;
    paperTradingState: MarketPaperTradePerformanceResult["state"];
    paperTradingSuccess: boolean;
    netProfit: number;
    totalReturnPercent: number;
    maxDrawdown: number;
    maxDrawdownPercent: number;
    filledOrders: number;
    rejectedOrders: number;
    openPositions: number;
  };
  conditionReviews: MarketResearchOutcomeConditionReview[];
  findings: MarketResearchOutcomeFinding[];
  methodology: {
    sourceDecisionWorkspace: "C157.1";
    sourcePerformanceReview: "C159.1";
    descriptiveReconciliationOnly: true;
    futurePerformancePrediction: false;
    recommendationGenerated: false;
    automaticInvalidationEvaluation: false;
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
    decisionWorkspace: "C157.1";
    paperTradeGate: "C158";
    paperTrading: "C151";
    performanceReview: "C159.1";
    liveTradingBoundary: "C152";
  };
  pipeline: string[];
  principles: string[];
  disclaimer: string;
  generatedAt: string;
  latencyMs: number;
}
