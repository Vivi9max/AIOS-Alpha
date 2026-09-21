import type {
  MarketRegion,
} from "./market-types";

import type {
  MarketDecisionRecord,
} from "./market-decision-record-types";

export type MarketReassessmentChangeType =
  | "no-material-change"
  | "assessment-change"
  | "invalidation-risk"
  | "insufficient-data";

export type MarketReassessmentSeverity =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "blocked";

export interface MarketReassessmentFieldChange {
  field: string;
  previousValue: string | number | null;
  currentValue: string | number | null;
  changed: boolean;
  material: boolean;
  explanation: string;
}

export interface MarketReassessmentResult {
  reassessmentId: string;

  symbol: string;
  market: MarketRegion;

  changeType: MarketReassessmentChangeType;

  severity: MarketReassessmentSeverity;

  previousState: string;
  currentState: string;

  previousReviewStatus: string;
  currentReviewStatus: string;

  materialChanges: MarketReassessmentFieldChange[];

  unchangedFields: string[];

  changedWatchMetrics: string[];

  triggeredInvalidationConditions: string[];

  whatChanged: string[];

  whyItMatters: string[];

  whatRequiresHumanReview: string[];

  humanDecisionRequired: boolean;

  previousRecordGeneratedAt: string;
  currentRecordGeneratedAt: string;

  previousRecordId: string;
  currentRecordId: string;

  sourceVersions: string[];

  generatedAt: string;
}

export interface MarketReassessmentRequest {
  previousRecord: MarketDecisionRecord;
  currentRecord: MarketDecisionRecord;
}

export interface MarketReassessmentRuntimeResult {
  success: boolean;

  code:
    | "C147_8_REASSESSMENT_PASS"
    | "C147_8_REASSESSMENT_PARTIAL"
    | "C147_8_REASSESSMENT_INSUFFICIENT";

  reassessment:
    MarketReassessmentResult | null;

  principles: string[];

  humanDecisionRequired: boolean;

  runtime: {
    name:
      "market-reassessment-runtime";

    version:
      "C147.8";

    generatedAt: string;

    latencyMs: number;
  };

  disclaimer: string;
}
