import type {
  MarketRegion,
} from "./market-types";

export type MarketDecisionWorkspaceState =
  | "decision-ready"
  | "review-required"
  | "blocked"
  | "insufficient";

export type MarketDecisionReviewStatus =
  | "pending-human-review"
  | "evidence-gap"
  | "risk-reassessment"
  | "blocked";

export interface MarketDecisionWorkspaceRequestItem {
  symbol: string;
  market: MarketRegion;
}

export interface MarketDecisionQuestion {
  id: string;
  category:
    | "evidence"
    | "change"
    | "industry"
    | "company"
    | "fundamentals"
    | "valuation"
    | "risk"
    | "invalidation";

  question: string;
  reason: string;
  requiresEvidence: boolean;
}

export interface MarketDecisionWorkspaceItem {
  decisionId: string;
  symbol: string;
  market: MarketRegion;

  state: MarketDecisionWorkspaceState;
  reviewStatus: MarketDecisionReviewStatus;

  priority:
    | "critical"
    | "high"
    | "normal"
    | "low";

  materialChange: boolean;

  evidence: {
    identityVerified: boolean;
    verified: boolean;
    sourceCount: number;
    independentDomains: number;
    conflictCount: number;
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
  };

  researchSummary: {
    change: string;
    industry: string | null;
    company: string | null;
    fundamentals: string | null;
    valuation: string | null;
    risk: string | null;
  };

  evidenceGaps: string[];

  decisionQuestions: MarketDecisionQuestion[];

  invalidationConditions: string[];

  humanDecisionRequired: true;
  decisionRecorded: false;
  recommendationGenerated: false;
  tradingAllowed: false;
}

export interface MarketDecisionWorkspaceSnapshot {
  state: MarketDecisionWorkspaceState;

  universeSize: number;
  evaluatedCount: number;

  decisionReadyCount: number;
  reviewRequiredCount: number;
  blockedCount: number;
  insufficientCount: number;

  workspaces: MarketDecisionWorkspaceItem[];

  latencyMs: number;
  generatedAt: string;
}

export interface MarketDecisionWorkspaceResult {
  success: boolean;

  code:
    | "C157_MARKET_DECISION_WORKSPACE_PASS"
    | "C157_MARKET_DECISION_WORKSPACE_PARTIAL"
    | "C157_MARKET_DECISION_WORKSPACE_INSUFFICIENT";

  snapshot: MarketDecisionWorkspaceSnapshot;

  upstream: {
    researchDossier: "C156.1";
    marketOperatingSystem: "C155.1";
    evidenceMatrix: "C147.6";
    valuation: "C149";
    riskControl: "C147.17";
  };

  mutationPerformed: false;
  taskCreated: false;
  plannerDispatched: false;
  decisionRecorded: false;
  recommendationGenerated: false;
  tradingExecuted: false;

  humanDecisionRequired: true;

  pipeline: string[];
  principles: string[];
  disclaimer: string;
}
