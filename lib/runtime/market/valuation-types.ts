import type {
  MarketAnalysisResult,
  MarketRegion,
} from "./market-types";

export interface MarketValuationCandidateInput {
  symbol: string;
  market?: MarketRegion | null;
  name?: string | null;
}

export interface MarketValuationAssumptions {
  peLow?: number | null;
  peBase?: number | null;
  peHigh?: number | null;

  pbLow?: number | null;
  pbBase?: number | null;
  pbHigh?: number | null;

  revenueGrowthLow?: number | null;
  revenueGrowthBase?: number | null;
  revenueGrowthHigh?: number | null;
}

export interface MarketValuationRequest {
  industry: string;
  candidates: MarketValuationCandidateInput[];
  maxCandidates?: number;
  query?: string | null;
  assumptions?: MarketValuationAssumptions | null;
}

export interface MarketValuationMetric {
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
  interpretation: string;
}

export interface MarketValuationScenario {
  name:
    | "low"
    | "base"
    | "high";

  multipleSource:
    | "pe"
    | "pb"
    | "combined"
    | "unavailable";

  referenceMultiple: number | null;

  peReference: number | null;
  pbReference: number | null;

  peImpliedPrice: number | null;
  pbImpliedPrice: number | null;

  combinedImpliedPrice: number | null;

  revenueGrowthReference: number | null;

  caveats: string[];
}

export interface MarketValuationCandidateResult {
  rank: number;

  input: MarketValuationCandidateInput;

  normalizedSymbol: string;

  currentPrice: number | null;

  currency:
    | "USD"
    | "HKD"
    | "CNY";

  metrics: MarketValuationMetric[];

  currentValuation: {
    pe: number | null;
    pb: number | null;

    peAssessment:
      | "low"
      | "moderate"
      | "high"
      | "unavailable";

    pbAssessment:
      | "low"
      | "moderate"
      | "high"
      | "unavailable";
  };

  scenarios: MarketValuationScenario[];

  valuationStatus:
    | "valuation-ready"
    | "partial"
    | "insufficient";

  strengths: string[];

  risks: string[];

  methodologyWarnings: string[];

  sourceResult: MarketAnalysisResult;

  resultCode:
    | "C149_VALUATION_PASS"
    | "C149_VALUATION_PARTIAL"
    | "C149_VALUATION_INSUFFICIENT"
    | "C149_VALUATION_ERROR";
}

export interface MarketValuationResult {
  success: boolean;

  code:
    | "C149_VALUATION_PASS"
    | "C149_VALUATION_PARTIAL"
    | "C149_VALUATION_INSUFFICIENT";

  stage: "C149";

  industry: string;

  requestedCandidates: number;

  evaluatedCandidates: number;

  candidates: MarketValuationCandidateResult[];

  methodology: {
    purpose: string;

    methods: string[];

    assumptions: MarketValuationAssumptions;

    excludedFromDecision: string[];

    nextStage: "C150";
  };

  safetyBoundary: {
    founderOnly: true;
    personalizedAdvice: false;
    returnPrediction: false;
    automaticBuySellInstruction: false;
    plannerDispatched: false;
    tradingExecuted: false;
    humanReviewRequiredBeforeTrading: true;
  };

  generatedAt: string;

  error?: string;
}
