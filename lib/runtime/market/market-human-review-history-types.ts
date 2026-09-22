import type {
  MarketRegion,
} from "./market-types";

import type {
  MarketHumanReviewDecision,
  MarketHumanReviewRecord,
} from "./market-human-review-types";

export interface MarketHumanReviewHistoryRequest {
  symbol?: string | null;

  market?: MarketRegion | null;

  decision?: MarketHumanReviewDecision | null;

  limit?: number;

  includeNotes?: boolean;
}

export interface MarketHumanReviewHistoryItem {
  reviewId: string;

  taskId: string;

  symbol: string;

  market: MarketRegion;

  taskTitle: string;

  decision: MarketHumanReviewDecision;

  reviewerNote: string | null;

  sourceEventId: string | null;

  reassessmentId: string | null;

  currentVersion: number | null;

  createdAt: string;

  updatedAt: string;

  humanDecisionRequired: true;

  automatedExecutionStarted: false;

  plannerDispatched: false;

  tradingExecuted: false;
}

export interface MarketHumanReviewHistoryResult {
  success: boolean;

  code:
    | "C147_16_HUMAN_REVIEW_HISTORY_PASS"
    | "C147_16_HUMAN_REVIEW_HISTORY_EMPTY"
    | "C147_16_HUMAN_REVIEW_HISTORY_INSUFFICIENT";

  readOnly: true;

  historyFound: boolean;

  symbol: string | null;

  market: MarketRegion | null;

  decision: MarketHumanReviewDecision | null;

  totalReviews: number;

  returnedReviews: number;

  items: MarketHumanReviewHistoryItem[];

  sourceTasksScanned: number;

  sourceReviewsFound: number;

  principles: string[];

  humanDecisionRequired: true;

  automatedExecutionStarted: false;

  plannerDispatched: false;

  tradingExecuted: false;

  runtime: {
    name:
      "market-human-review-history-runtime";

    version:
      "C147.16";

    upstream:
      "C147.15";

    generatedAt: string;

    latencyMs: number;
  };

  disclaimer: string;
}

export function toMarketHumanReviewHistoryItem(
  review: MarketHumanReviewRecord,
  includeNotes: boolean,
): MarketHumanReviewHistoryItem {
  return {
    reviewId:
      review.reviewId,

    taskId:
      review.taskId,

    symbol:
      review.symbol,

    market:
      review.market,

    taskTitle:
      review.taskTitle,

    decision:
      review.decision,

    reviewerNote:
      includeNotes
        ? review.reviewerNote || null
        : null,

    sourceEventId:
      review.sourceEventId,

    reassessmentId:
      review.reassessmentId,

    currentVersion:
      review.currentVersion,

    createdAt:
      review.createdAt,

    updatedAt:
      review.updatedAt,

    humanDecisionRequired:
      true,

    automatedExecutionStarted:
      false,

    plannerDispatched:
      false,

    tradingExecuted:
      false,
  };
}
