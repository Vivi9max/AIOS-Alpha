import type {
  MarketRegion,
} from "./market-types";

import type {
  MarketResearchInvalidationLedgerRecord,
} from "./market-research-invalidation-ledger-types";

export type MarketResearchInvalidationHumanReviewDecision =
  | "accept-current-research"
  | "invalidate-current-research"
  | "request-research-update";

export type MarketResearchInvalidationHumanReviewStatus =
  | "pending"
  | "decided";

export interface MarketResearchInvalidationHumanReviewRecord {
  reviewId: string;

  ledgerId: string;

  symbol: string;

  market: MarketRegion;

  status:
    MarketResearchInvalidationHumanReviewStatus;

  decision:
    MarketResearchInvalidationHumanReviewDecision | null;

  rationale: string | null;

  reviewedAt: string | null;

  createdAt: string;

  updatedAt: string;

  ledgerSnapshot: {
    status:
      MarketResearchInvalidationLedgerRecord["status"];

    invalidationConditions: string[];

    sourceGeneratedAt: string;

    ledgerCreatedAt: string;
  };

  humanDecisionRequired: true;

  boundary: {
    automaticInvalidationEvaluation: false;
    decisionAutomaticallyGenerated: false;
    plannerDispatched: false;
    brokerConnected: false;
    liveOrderPlaced: false;
    tradingExecuted: false;
  };
}

export interface MarketResearchInvalidationHumanReviewRequest {
  ledgerId: string;

  decision?:
    MarketResearchInvalidationHumanReviewDecision;

  rationale?: string | null;
}

export interface MarketResearchInvalidationHumanReviewResult {
  success: boolean;

  code:
    | "C161_3_RESEARCH_INVALIDATION_HUMAN_REVIEW_PASS"
    | "C161_3_RESEARCH_INVALIDATION_HUMAN_REVIEW_PENDING"
    | "C161_3_RESEARCH_INVALIDATION_HUMAN_REVIEW_INSUFFICIENT"
    | "C161_3_RESEARCH_INVALIDATION_HUMAN_REVIEW_NOT_FOUND";

  review:
    MarketResearchInvalidationHumanReviewRecord | null;

  ledger:
    MarketResearchInvalidationLedgerRecord | null;

  humanDecisionRequired: true;

  mutationPerformed: boolean;

  boundary: {
    automaticInvalidationEvaluation: false;
    decisionAutomaticallyGenerated: false;
    plannerDispatched: false;
    brokerConnected: false;
    liveOrderPlaced: false;
    tradingExecuted: false;
  };

  runtime: {
    name:
      "market-research-invalidation-human-review-runtime";

    version:
      "C161.3";

    upstream:
      "C161.2";

    generatedAt: string;

    latencyMs: number;
  };

  principles: string[];

  disclaimer: string;
}
