import type { MarketRegion } from "./market-types";
import type {
  MarketResearchOutcomeReconciliationResult,
} from "./market-research-outcome-reconciliation-types";

export type MarketResearchInvalidationLedgerStatus =
  | "pending-human-review";

export interface MarketResearchInvalidationLedgerRecord {
  ledgerId: string;

  source: "C160";
  sourceCode:
    | "C160_MARKET_RESEARCH_OUTCOME_RECONCILIATION_PASS"
    | "C160_MARKET_RESEARCH_OUTCOME_RECONCILIATION_PARTIAL";

  symbol: string;
  market: MarketRegion;

  status: MarketResearchInvalidationLedgerStatus;

  invalidationConditions: string[];

  findings: MarketResearchOutcomeReconciliationResult["findings"];

  reconciliation: {
    decisionState: MarketResearchOutcomeReconciliationResult["reconciliation"]["decisionState"];
    decisionReviewStatus: MarketResearchOutcomeReconciliationResult["reconciliation"]["decisionReviewStatus"];
    materialChange: boolean;
    evidenceVerified: boolean;

    paperTradingState: MarketResearchOutcomeReconciliationResult["reconciliation"]["paperTradingState"];
    paperTradingSuccess: boolean;

    netProfit: number;
    totalReturnPercent: number;
    maxDrawdown: number;
    maxDrawdownPercent: number;

    filledOrders: number;
    rejectedOrders: number;
    openPositions: number;
  };

  sourceGeneratedAt: string;

  humanReview: {
    required: true;
    status: "pending";
    decisionRecorded: false;
    decision: null;
  };

  boundary: {
    automaticInvalidationEvaluation: false;
    recommendationGenerated: false;
    decisionAutomaticallyGenerated: false;
    taskCreated: false;
    plannerDispatched: false;
    brokerConnected: false;
    liveOrderPlaced: false;
    tradingExecuted: false;
  };

  createdAt: string;
  updatedAt: string;
}

export interface MarketResearchInvalidationLedgerRequest {
  reconciliation: MarketResearchOutcomeReconciliationResult;
}

export interface MarketResearchInvalidationLedgerResult {
  success: boolean;

  code:
    | "C161_1_RESEARCH_INVALIDATION_LEDGER_PASS"
    | "C161_1_RESEARCH_INVALIDATION_LEDGER_ALREADY_EXISTS"
    | "C161_1_RESEARCH_INVALIDATION_LEDGER_INSUFFICIENT";

  action:
    | "ledger-created"
    | "ledger-already-exists"
    | "ledger-blocked";

  ledger: MarketResearchInvalidationLedgerRecord | null;

  mutationPerformed: boolean;

  humanReviewRequired: true;

  boundary: {
    automaticInvalidationEvaluation: false;
    decisionAutomaticallyGenerated: false;
    decisionRecorded: false;
    taskCreated: false;
    plannerDispatched: false;
    brokerConnected: false;
    liveOrderPlaced: false;
    tradingExecuted: false;
  };

  runtime: {
    name: "market-research-invalidation-ledger-runtime";
    version: "C161.1";
    upstream: "C160";
    generatedAt: string;
    latencyMs: number;
  };

  principles: string[];
  disclaimer: string;
}
