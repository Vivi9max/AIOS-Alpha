import type {
  MarketRegion,
} from "./market-types";

export type MarketResearchDossierState =
  | "research-ready"
  | "partial"
  | "blocked"
  | "insufficient";

export type MarketResearchDossierStage =
  | "market"
  | "change-detection"
  | "radar"
  | "evidence"
  | "verification"
  | "industry"
  | "company"
  | "fundamentals"
  | "valuation"
  | "risk"
  | "human-decision";

export interface MarketResearchDossierRequestItem {
  symbol: string;
  market: MarketRegion;
}

export interface MarketResearchDossierChange {
  radarSignalId: string | null;
  sourceEventId: string | null;
  title: string;
  priority:
    | "critical"
    | "high"
    | "normal"
    | "low";
  materialChange: boolean;
  whatChanged: string[];
  whyItMatters: string[];
}

export interface MarketResearchDossierEvidence {
  identityVerified: boolean;
  verified: boolean;
  sourceCount: number;
  independentDomains: number;
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
  asOf: string | null;
  conflictCount: number;
  humanVerificationRequired: true;
}

export interface MarketResearchDossierIndustry {
  summary: string | null;
  passed: boolean;
}

export interface MarketResearchDossierCompany {
  summary: string | null;
  passed: boolean;
}

export interface MarketResearchDossierFundamentals {
  assessment: string | null;
  passed: boolean;
  revenueGrowth: number | null;
  eps: number | null;
}

export interface MarketResearchDossierValuation {
  assessment: string | null;
  passed: boolean;
  pe: number | null;
  pb: number | null;
  status:
    | "valuation-ready"
    | "partial"
    | "insufficient";
  metricQuality: Array<{
    metric:
      | "pe"
      | "pb"
      | "eps"
      | "revenue"
      | "revenueGrowth"
      | "marketCap";
    value: number | null;
    available: boolean;
    quality:
      | "verified-structured"
      | "web-evidence"
      | "missing";
  }>;
  methodologyWarnings: string[];
}

export interface MarketResearchDossierRisk {
  level:
    | "low"
    | "medium"
    | "high"
    | "unknown";
  riskCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  insufficientEvidenceCount: number;
  reassessmentRequired: boolean;
  risks: Array<{
    category:
      | "data"
      | "fundamental"
      | "valuation"
      | "event"
      | "evidence-conflict"
      | "invalidation";
    severity:
      | "low"
      | "medium"
      | "high"
      | "unknown";
    status:
      | "identified"
      | "insufficient-evidence"
      | "requires-reassessment";
    title: string;
    description: string;
    invalidationCondition: string | null;
  }>;
  decisionInvalidationConditions: string[];
}

export interface MarketResearchDossierItem {
  dossierId: string;
  symbol: string;
  market: MarketRegion;

  state: MarketResearchDossierState;

  change: MarketResearchDossierChange;
  evidence: MarketResearchDossierEvidence;

  industry: MarketResearchDossierIndustry;
  company: MarketResearchDossierCompany;
  fundamentals: MarketResearchDossierFundamentals;
  valuation: MarketResearchDossierValuation;
  risk: MarketResearchDossierRisk;

  stages: Array<{
    stage: MarketResearchDossierStage;
    status:
      | "passed"
      | "failed"
      | "insufficient"
      | "blocked";
    reasons: string[];
  }>;

  humanDecisionRequired: true;
}

export interface MarketResearchDossierSnapshot {
  state: MarketResearchDossierState;

  universeSize: number;
  evaluatedCount: number;

  researchReadyCount: number;
  partialCount: number;
  blockedCount: number;
  insufficientCount: number;

  dossiers: MarketResearchDossierItem[];

  latencyMs: number;
  generatedAt: string;
}

export interface MarketResearchDossierResult {
  success: boolean;

  code:
    | "C156_MARKET_RESEARCH_DOSSIER_PASS"
    | "C156_MARKET_RESEARCH_DOSSIER_PARTIAL"
    | "C156_MARKET_RESEARCH_DOSSIER_INSUFFICIENT";

  snapshot: MarketResearchDossierSnapshot;

  upstream: {
    marketOperatingSystem: "C155.1";
    selectionFramework: "C147.4";
    evidenceMatrix: "C147.6";
    valuation: "C149";
    riskControl: "C147.17";
  };

  mutationPerformed: false;
  taskCreated: false;
  plannerDispatched: false;
  tradingExecuted: false;
  humanDecisionRequired: true;

  pipeline: string[];
  principles: string[];
  disclaimer: string;
}
