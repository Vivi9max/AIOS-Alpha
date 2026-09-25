import type {
  MarketAnalysisResult,
  MarketRegion,
} from "./market-types";

export interface MarketSelectionCandidateInput {
  symbol: string;
  market?: MarketRegion | null;
  name?: string | null;
}

export interface MarketSelectionRequest {
  industry: string;
  candidates: MarketSelectionCandidateInput[];
  maxCandidates?: number;
  query?: string | null;
}

export interface MarketSelectionScoreBreakdown {
  industryFit: number;
  evidenceQuality: number;
  fundamentalsCoverage: number;
  valuationCoverage: number;
  riskTransparency: number;
  dataReadiness: number;
  total: number;
}

export interface MarketSelectionCandidateResult {
  rank: number;
  input: MarketSelectionCandidateInput;
  normalizedSymbol: string;
  score: MarketSelectionScoreBreakdown;
  researchStatus:
    | "research-ready"
    | "evidence-limited"
    | "insufficient";
  liveDataVerified: boolean;
  historicalDataVerified: boolean;
  provider: string;
  providerHealth?: string | null;
  evidenceCount: number;
  independentDomains: number;
  industry: string;
  strengths: string[];
  risks: string[];
  valuationSignals: string[];
  fundamentalSignals: string[];
  resultCode: string;
  sourceResult: MarketAnalysisResult;
}

export interface MarketSelectionResult {
  success: boolean;
  code:
    | "C148_1_SELECTION_PASS"
    | "C148_1_SELECTION_PARTIAL"
    | "C148_1_SELECTION_INSUFFICIENT";
  stage: "C148.1";
  industry: string;
  requestedCandidates: number;
  evaluatedCandidates: number;
  candidates: MarketSelectionCandidateResult[];
  researchGate: {
    selectionCompleted: boolean;
    liveQuoteRequiredForSelection: boolean;
    liveQuoteVerifiedForAll: boolean;
    humanReviewRequiredBeforeTrading: boolean;
    tradingExecuted: false;
    plannerDispatched: false;
  };
  methodology: {
    purpose: string;
    scoring: string[];
    excludedFromScore: string[];
    nextStage: "C149";
  };
  generatedAt: string;
  error?: string;
}
