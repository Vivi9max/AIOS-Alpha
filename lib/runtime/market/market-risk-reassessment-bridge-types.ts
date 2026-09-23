import type {
  MarketRegion,
} from "./market-types";

import type {
  MarketDecisionRecord,
} from "./market-decision-record-types";

import type {
  MarketReassessmentResult,
} from "./market-reassessment-types";

import type {
  MarketRiskControlResult,
} from "./market-risk-control-types";

export type MarketRiskReassessmentBridgeAction =
  | "reassessment-required"
  | "reassessment-completed"
  | "human-review-required"
  | "no-reassessment-required"
  | "insufficient-evidence";

export interface MarketRiskReassessmentBridgeRequest {
  symbol: string;
  market: MarketRegion;
  query?: string | null;

  previousRecord?: MarketDecisionRecord | null;
  currentRecord?: MarketDecisionRecord | null;
}

export interface MarketRiskReassessmentBridgeResult {
  success: boolean;

  code:
    | "C147_18_RISK_REASSESSMENT_BRIDGE_PASS"
    | "C147_18_RISK_REASSESSMENT_BRIDGE_PARTIAL"
    | "C147_18_RISK_REASSESSMENT_BRIDGE_INSUFFICIENT";

  action: MarketRiskReassessmentBridgeAction;

  symbol: string;
  market: MarketRegion;

  riskControl: MarketRiskControlResult;

  reassessment:
    MarketReassessmentResult | null;

  reassessmentRequired: boolean;

  humanReviewRequired: true;

  previousRecordId: string | null;
  currentRecordId: string | null;

  decisionInvalidationConditions: string[];

  reviewChecklist: string[];

  automatedExecutionStarted: false;
  plannerDispatched: false;
  tradingExecuted: false;
  mutationPerformed: false;

  runtime: {
    name:
      "market-risk-reassessment-bridge-runtime";
    version:
      "C147.18";
    upstream:
      "C147.17+C147.8";
    generatedAt: string;
    latencyMs: number;
  };

  principles: string[];

  disclaimer: string;
}
