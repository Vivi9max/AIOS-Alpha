import type {
  MarketAnalysisResult,
  MarketRegion,
} from "./market-types";

export type MarketFrameworkStage =
  | "industry"
  | "company"
  | "fundamentals"
  | "valuation"
  | "risk"
  | "evidence"
  | "human-review";

export type MarketFrameworkDecision =
  | "research-candidate"
  | "excluded"
  | "insufficient-data";

export interface MarketSelectionFrameworkCriteria {
  industries?: string[];

  minRevenueGrowth?: number | null;
  minEps?: number | null;

  minPe?: number | null;
  maxPe?: number | null;

  minPb?: number | null;
  maxPb?: number | null;

  minEvidenceSources?: number;
  minIndependentDomains?: number;

  allowedRiskLevels?: Array<
    "low" | "medium" | "high" | "unknown"
  >;

  requireVerifiedData?: boolean;
}

export interface MarketSelectionUniverseItem {
  symbol: string;
  market: MarketRegion;
}

export interface MarketSelectionStageResult {
  stage: MarketFrameworkStage;
  passed: boolean;
  status:
    | "passed"
    | "failed"
    | "insufficient-data";
  reasons: string[];
  missing: string[];
}

export interface MarketSelectionFrameworkItem {
  symbol: string;
  market: MarketRegion;

  decision: MarketFrameworkDecision;

  stages: MarketSelectionStageResult[];

  industry: {
    summary: string | null;
    passed: boolean;
  };

  company: {
    summary: string | null;
    passed: boolean;
  };

  fundamentals: {
    assessment: string | null;
    passed: boolean;
    revenueGrowth: number | null;
    eps: number | null;
  };

  valuation: {
    assessment: string | null;
    passed: boolean;
    pe: number | null;
    pb: number | null;
  };

  risk: {
    level:
      | "low"
      | "medium"
      | "high"
      | "unknown";
    passed: boolean;
    factors: string[];
  };

  evidence: {
    sourceCount: number;
    independentDomains: number;
    verified: boolean;
    passed: boolean;
  };

  freshness: {
    freshness: string;
    ageMinutes: number | null;
    asOf: string | null;
  };

  analysis: MarketAnalysisResult | null;

  humanReviewRequired: boolean;
}

export interface MarketSelectionFrameworkResult {
  success: boolean;

  code:
    | "C147_4_FRAMEWORK_PASS"
    | "C147_4_FRAMEWORK_PARTIAL"
    | "C147_4_FRAMEWORK_INSUFFICIENT";

  universeSize: number;
  evaluatedCount: number;

  researchCandidateCount: number;
  excludedCount: number;
  insufficientDataCount: number;

  criteria: MarketSelectionFrameworkCriteria;

  items: MarketSelectionFrameworkItem[];

  principle: string;

  humanDecisionRequired: boolean;

  runtime: {
    name: "market-selection-framework";
    version: "C147.4";
    generatedAt: string;
    latencyMs: number;
  };

  disclaimer: string;
}

export interface MarketSelectionFrameworkRequest {
  universe: MarketSelectionUniverseItem[];
  criteria?: MarketSelectionFrameworkCriteria;
}
