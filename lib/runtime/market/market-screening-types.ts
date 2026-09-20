import type {
  MarketAnalysisMode,
  MarketAnalysisResult,
  MarketRegion,
} from "./market-types";

export type MarketScreeningCriterion =
  | "industry"
  | "revenueGrowth"
  | "eps"
  | "pe"
  | "pb"
  | "evidence"
  | "risk"
  | "dataQuality";

export type MarketScreeningDecision =
  | "candidate"
  | "excluded"
  | "insufficient-data";

export interface MarketScreeningCriteria {
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

export interface MarketScreeningUniverseItem {
  symbol: string;
  market: MarketRegion;
}

export interface MarketScreeningItem {
  symbol: string;
  market: MarketRegion;

  decision: MarketScreeningDecision;

  matchedCriteria: MarketScreeningCriterion[];
  failedCriteria: MarketScreeningCriterion[];
  missingCriteria: MarketScreeningCriterion[];

  reasons: string[];
  risks: string[];

  analysis: MarketAnalysisResult | null;

  evaluatedAt: string;
}

export interface MarketScreeningResult {
  success: boolean;

  code:
    | "C147_3_SCREENING_PASS"
    | "C147_3_SCREENING_PARTIAL"
    | "C147_3_SCREENING_INSUFFICIENT";

  market:
    | MarketRegion
    | "mixed";

  universeSize: number;

  evaluatedCount: number;

  candidateCount: number;

  excludedCount: number;

  insufficientDataCount: number;

  criteria: MarketScreeningCriteria;

  items: MarketScreeningItem[];

  runtime: {
    name: "market-screening-runtime";
    version: "C147.3";
    generatedAt: string;
    latencyMs: number;
  };

  disclaimer: string;
}

export interface MarketScreeningRequest {
  universe: MarketScreeningUniverseItem[];

  criteria?: MarketScreeningCriteria;

  mode?: MarketAnalysisMode;
}
