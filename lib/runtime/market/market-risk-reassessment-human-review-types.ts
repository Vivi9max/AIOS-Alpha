import type {
  MarketRegion,
} from "./market-types";

import type {
  MarketHumanReviewDecision,
  MarketHumanReviewRecord,
} from "./market-human-review-types";

import type {
  MarketRiskReassessmentBridgeResult,
} from "./market-risk-reassessment-bridge-types";

export type MarketRiskReassessmentHumanReviewAction =
  | "review-task-created"
  | "review-recorded"
  | "review-already-recorded"
  | "insufficient-evidence"
  | "review-blocked";

export interface MarketRiskReassessmentHumanReviewRequest {
  symbol: string;
  market: MarketRegion;

  query?: string | null;

  previousRecord?: import("./market-decision-record-types").MarketDecisionRecord | null;
  currentRecord?: import("./market-decision-record-types").MarketDecisionRecord | null;

  taskId?: string | null;

  decision?: MarketHumanReviewDecision | null;
  reviewerNote?: string | null;
}

export interface MarketRiskReassessmentHumanReviewResult {
  success: boolean;

  code:
    | "C147_19_RISK_REASSESSMENT_HUMAN_REVIEW_TASK_CREATED"
    | "C147_19_RISK_REASSESSMENT_HUMAN_REVIEW_RECORDED"
    | "C147_19_RISK_REASSESSMENT_HUMAN_REVIEW_ALREADY_RECORDED"
    | "C147_19_RISK_REASSESSMENT_HUMAN_REVIEW_INSUFFICIENT"
    | "C147_19_RISK_REASSESSMENT_HUMAN_REVIEW_BLOCKED";

  action: MarketRiskReassessmentHumanReviewAction;

  symbol: string;
  market: MarketRegion;

  bridge: MarketRiskReassessmentBridgeResult;

  taskId: string | null;

  review:
    MarketHumanReviewRecord | null;

  existingReview:
    MarketHumanReviewRecord | null;

  reassessmentRequired: boolean;

  humanDecisionRequired: true;

  mutationPerformed: boolean;

  automatedExecutionStarted: false;
  plannerDispatched: false;
  tradingExecuted: false;

  runtime: {
    name:
      "market-risk-reassessment-human-review-runtime";
    version:
      "C147.19";
    upstream:
      "C147.18+C147.15";
    generatedAt: string;
    latencyMs: number;
  };

  principles: string[];

  disclaimer: string;
}
