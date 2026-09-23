import type {
  MarketRegion,
} from "./market-types";
export type MarketRiskCategory =
  | "data"
  | "fundamental"
  | "valuation"
  | "event"
  | "evidence-conflict"
  | "invalidation";
export type MarketRiskSeverity =
  | "low"
  | "medium"
  | "high"
  | "unknown";
export type MarketRiskStatus =
  | "identified"
  | "insufficient-evidence"
  | "requires-reassessment";
export interface MarketRiskItem {
  id: string;
  category:
    MarketRiskCategory;
  severity:
    MarketRiskSeverity;
  status:
    MarketRiskStatus;
  title: string;
  description: string;
  evidence: string[];
  sourceCount: number;
  independentDomains: number;
  freshness:
    | "fresh"
    | "stale"
    | "unknown";
  invalidationCondition:
    string | null;
  humanReviewRequired:
    true;
}
export interface MarketRiskControlRequest {
  symbol: string;
  market: MarketRegion;
  query?:
    | string
    | null;
}
export interface MarketRiskControlResult {
  success: boolean;
  code:
    | "C147_17_RISK_CONTROL_PASS"
    | "C147_17_RISK_CONTROL_PARTIAL"
    | "C147_17_RISK_CONTROL_INSUFFICIENT";
  symbol: string;
  market: MarketRegion;
  overallRisk:
    MarketRiskSeverity;
  risks:
    MarketRiskItem[];
  riskCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  insufficientEvidenceCount:
    number;
  reassessmentRequired:
    boolean;
  decisionInvalidationConditions:
    string[];
  reviewChecklist: string[];
  humanReviewRequired:
    true;
  automatedExecutionStarted:
    false;
  plannerDispatched:
    false;
  tradingExecuted:
    false;
  sourceAnalysis: {
    dataQuality:
      | "live"
      | "delayed"
      | "historical"
      | "web-evidence"
      | "insufficient";
    freshness:
      | "fresh"
      | "stale"
      | "unknown";
    verified: boolean;
    sourceCount: number;
    independentDomains:
      number;
  };
  runtime: {
    name:
      "market-risk-control-runtime";
    version:
      "C147.17";
    generatedAt:
      string;
    latencyMs:
      number;
  };
  principles: string[];
  disclaimer: string;
}
