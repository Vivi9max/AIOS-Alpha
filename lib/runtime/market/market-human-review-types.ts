import type {
  MarketRegion,
} from "./market-types";
export type MarketHumanReviewDecision =
  | "acknowledged"
  | "accepted"
  | "rejected"
  | "deferred";
export type MarketHumanReviewAction =
  | "review-recorded"
  | "review-already-recorded"
  | "review-blocked"
  | "task-not-found";
export interface MarketHumanReviewRequest {
  taskId: string;
  decision: MarketHumanReviewDecision;
  reviewerNote?: string | null;
}
export interface MarketHumanReviewRecord {
  reviewId: string;
  taskId: string;
  symbol: string;
  market: MarketRegion;
  taskTitle: string;
  decision: MarketHumanReviewDecision;
  reviewerNote: string;
  sourceEventId: string | null;
  reassessmentId: string | null;
  currentVersion: number | null;
  humanDecisionRequired: true;
  automatedExecutionStarted: false;
  plannerDispatched: false;
  tradingExecuted: false;
  createdAt: string;
  updatedAt: string;
}
export interface MarketHumanReviewResult {
  success: boolean;
  code:
    | "C147_15_HUMAN_REVIEW_PASS"
    | "C147_15_HUMAN_REVIEW_ALREADY_RECORDED"
    | "C147_15_HUMAN_REVIEW_BLOCKED"
    | "C147_15_HUMAN_REVIEW_TASK_NOT_FOUND"
    | "C147_15_HUMAN_REVIEW_INSUFFICIENT";
  action: MarketHumanReviewAction;
  taskId: string;
  taskFound: boolean;
  review: MarketHumanReviewRecord | null;
  existingReview: MarketHumanReviewRecord | null;
  mutationPerformed: boolean;
  automatedExecutionStarted: false;
  plannerDispatched: false;
  tradingExecuted: false;
  humanDecisionRequired: true;
  runtime: {
    name: "market-human-review-runtime";
    version: "C147.15";
    upstream: "C147.14";
    generatedAt: string;
    latencyMs: number;
  };
  principles: string[];
  disclaimer: string;
}
