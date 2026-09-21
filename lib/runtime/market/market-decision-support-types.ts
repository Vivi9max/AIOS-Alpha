import type {
  MarketAnalysisResult,
  MarketRegion,
} from "./market-types";

export type MarketDecisionSupportState =
  | "research-candidate"
  | "excluded"
  | "insufficient-data";

export interface MarketDecisionSupportScenario {
  name: string;
  condition: string;
  implication: string;
}

export interface MarketDecisionSupportItem {
  symbol: string;
  market: MarketRegion;

  state: MarketDecisionSupportState;

  currentState: string;

  supportingFactors: string[];

  invalidationConditions: string[];

  watchMetrics: string[];

  scenarios: MarketDecisionSupportScenario[];

  industry: string | null;

  company: string | null;

  fundamentals: {
    assessment: string | null;
    revenueGrowth: number | null;
    eps: number | null;
  };

  valuation: {
    assessment: string | null;
    pe: number | null;
    pb: number | null;
  };

  risk: {
    level:
      | "low"
      | "medium"
      | "high"
      | "unknown";

    factors: string[];
  };

  evidence: {
    sourceCount: number;
    independentDomains: number;
    verified: boolean;
  };

  freshness: {
    freshness: string;
    asOf: string | null;
  };

  dataQuality:
    | "live"
    | "delayed"
    | "historical"
    | "web-evidence"
    | "insufficient";

  humanReviewRequired: boolean;

  analysis: MarketAnalysisResult | null;
}

export interface MarketDecisionSupportRequest {
  universe: Array<{
    symbol: string;
    market: MarketRegion;
  }>;

  includeExcluded?: boolean;

  includeInsufficientData?: boolean;

  query?: string | null;
}

export interface MarketDecisionSupportResult {
  success: boolean;

  code:
    | "C147_5_DECISION_SUPPORT_PASS"
    | "C147_5_DECISION_SUPPORT_PARTIAL"
    | "C147_5_DECISION_SUPPORT_INSUFFICIENT";

  universeSize: number;

  evaluatedCount: number;

  researchCandidateCount: number;

  excludedCount: number;

  insufficientDataCount: number;

  items: MarketDecisionSupportItem[];

  principles: string[];

  humanDecisionRequired: boolean;

  runtime: {
    name: "market-decision-support-runtime";
    version: "C147.5";
    generatedAt: string;
    latencyMs: number;
  };

  disclaimer: string;
}
