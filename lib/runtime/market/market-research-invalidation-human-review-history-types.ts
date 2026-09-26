import type {
  MarketRegion,
} from "./market-types";

import type {
  MarketResearchInvalidationHumanReviewRecord,
} from "./market-research-invalidation-human-review-types";

export interface MarketResearchInvalidationHumanReviewIndexEntry {
  reviewId: string;

  ledgerId: string;

  symbol: string;

  market: MarketRegion;

  status:
    MarketResearchInvalidationHumanReviewRecord["status"];

  decision:
    MarketResearchInvalidationHumanReviewRecord["decision"];

  createdAt: string;

  updatedAt: string;

  reviewedAt: string | null;
}

export interface MarketResearchInvalidationHumanReviewIndex {
  version: 1;

  entries:
    MarketResearchInvalidationHumanReviewIndexEntry[];

  updatedAt: string;
}

export interface MarketResearchInvalidationHumanReviewHistoryRequest {
  ledgerId?: string;

  symbol?: string;

  market?: MarketRegion;

  status?:
    MarketResearchInvalidationHumanReviewRecord["status"];

  limit?: number;
}

export interface MarketResearchInvalidationHumanReviewHistoryItem {
  reviewId: string;

  ledgerId: string;

  symbol: string;

  market: MarketRegion;

  status:
    MarketResearchInvalidationHumanReviewRecord["status"];

  decision:
    MarketResearchInvalidationHumanReviewRecord["decision"];

  rationale: string | null;

  createdAt: string;

  updatedAt: string;

  reviewedAt: string | null;

  review:
    MarketResearchInvalidationHumanReviewRecord;
}

export interface MarketResearchInvalidationHumanReviewHistoryResult {
  success: boolean;

  code:
    | "C161_4_RESEARCH_INVALIDATION_HUMAN_REVIEW_HISTORY_PASS"
    | "C161_4_RESEARCH_INVALIDATION_HUMAN_REVIEW_HISTORY_EMPTY"
    | "C161_4_RESEARCH_INVALIDATION_HUMAN_REVIEW_HISTORY_INSUFFICIENT";

  ledgerId: string | null;

  symbol: string | null;

  market: MarketRegion | null;

  status:
    MarketResearchInvalidationHumanReviewRecord["status"] | null;

  total: number;

  items:
    MarketResearchInvalidationHumanReviewHistoryItem[];

  index: {
    version: 1;

    entryCount: number;

    updatedAt: string;
  };

  humanDecisionRequired: true;

  boundary: {
    automaticInvalidationEvaluation: false;

    decisionAutomaticallyGenerated: false;

    decisionRecorded: false;

    plannerDispatched: false;

    brokerConnected: false;

    liveOrderPlaced: false;

    tradingExecuted: false;
  };

  runtime: {
    name:
      "market-research-invalidation-human-review-history-runtime";

    version: "C161.4";

    upstream: "C161.3";

    generatedAt: string;

    latencyMs: number;
  };

  principles: string[];

  disclaimer: string;
}
