import type {
  MarketAnalysisResult,
  MarketRegion,
} from "./market-types";

import type {
  MarketHistoricalFundamentalSeries,
} from "./market-historical-fundamental-series-types";

export interface MarketValuationCandidateInput {
  symbol: string;

  market?:
    | MarketRegion
    | null;

  name?:
    | string
    | null;
}

export interface MarketValuationAssumptions {
  peLow?:
    | number
    | null;

  peBase?:
    | number
    | null;

  peHigh?:
    | number
    | null;

  pbLow?:
    | number
    | null;

  pbBase?:
    | number
    | null;

  pbHigh?:
    | number
    | null;

  revenueGrowthLow?:
    | number
    | null;

  revenueGrowthBase?:
    | number
    | null;

  revenueGrowthHigh?:
    | number
    | null;
}

export interface MarketValuationRequest {
  industry: string;

  candidates:
    MarketValuationCandidateInput[];

  maxCandidates?:
    number;

  query?:
    | string
    | null;

  assumptions?:
    | MarketValuationAssumptions
    | null;

  historicalPeriods?:
    number;

  includeHistoricalFundamentals?:
    boolean;
}

export type MarketValuationMetricName =
  | "pe"
  | "pb"
  | "eps"
  | "revenue"
  | "revenueGrowth"
  | "marketCap"
  | "historicalRevenue"
  | "historicalNetIncome"
  | "historicalOperatingCashFlow"
  | "historicalFreeCashFlow";

export type MarketValuationMetricQuality =
  | "verified-structured"
  | "web-evidence"
  | "historical-structured"
  | "missing";

export interface MarketValuationMetric {
  metric:
    MarketValuationMetricName;

  value:
    number | null;

  available:
    boolean;

  quality:
    MarketValuationMetricQuality;

  interpretation:
    string;
}

export interface MarketValuationHistoricalContext {
  available:
    boolean;

  provider:
    string;

  observationCount:
    number;

  annualObservationCount:
    number;

  quarterlyObservationCount:
    number;

  latestPeriodEnd:
    string | null;

  earliestPeriodEnd:
    string | null;

  revenueLatest:
    number | null;

  revenuePrevious:
    number | null;

  revenueGrowth:
    number | null;

  netIncomeLatest:
    number | null;

  netIncomePrevious:
    number | null;

  netIncomeGrowth:
    number | null;

  operatingCashFlowLatest:
    number | null;

  operatingCashFlowPrevious:
    number | null;

  freeCashFlowLatest:
    number | null;

  freeCashFlowPrevious:
    number | null;

  series:
    MarketHistoricalFundamentalSeries | null;

  quality:
    | "structured-verified"
    | "insufficient";

  limitations:
    string[];

  humanVerificationRequired:
    true;
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

  referenceMultiple:
    number | null;

  peReference:
    number | null;

  pbReference:
    number | null;

  peImpliedPrice:
    number | null;

  pbImpliedPrice:
    number | null;

  combinedImpliedPrice:
    number | null;

  revenueGrowthReference:
    number | null;

  historicalRevenueGrowth:
    number | null;

  historicalNetIncomeGrowth:
    number | null;

  historicalFreeCashFlowGrowth:
    number | null;

  caveats:
    string[];
}

export interface MarketValuationCandidateResult {
  rank:
    number;

  input:
    MarketValuationCandidateInput;

  normalizedSymbol:
    string;

  currentPrice:
    number | null;

  currency:
    | "USD"
    | "HKD"
    | "CNY";

  metrics:
    MarketValuationMetric[];

  historicalFundamentals:
    MarketValuationHistoricalContext;

  currentValuation: {
    pe:
      number | null;

    pb:
      number | null;

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

  scenarios:
    MarketValuationScenario[];

  valuationStatus:
    | "valuation-ready"
    | "partial"
    | "insufficient";

  strengths:
    string[];

  risks:
    string[];

  methodologyWarnings:
    string[];

  sourceResult:
    MarketAnalysisResult;

  resultCode:
    | "C149_VALUATION_PASS"
    | "C149_VALUATION_PARTIAL"
    | "C149_VALUATION_INSUFFICIENT"
    | "C149_VALUATION_ERROR";
}

export interface MarketValuationResult {
  success:
    boolean;

  code:
    | "C149_VALUATION_PASS"
    | "C149_VALUATION_PARTIAL"
    | "C149_VALUATION_INSUFFICIENT";

  stage:
    "C149";

  industry:
    string;

  requestedCandidates:
    number;

  evaluatedCandidates:
    number;

  candidates:
    MarketValuationCandidateResult[];

  historicalFundamentalCoverage: {
    requested:
      boolean;

    availableCandidates:
      number;

    structuredCandidates:
      number;

    unavailableCandidates:
      number;
  };

  methodology: {
    purpose:
      string;

    methods:
      string[];

    assumptions:
      MarketValuationAssumptions;

    historicalFundamentalRole:
      string[];

    excludedFromDecision:
      string[];

    nextStage:
      "C150";
  };

  safetyBoundary: {
    founderOnly:
      true;

    personalizedAdvice:
      false;

    returnPrediction:
      false;

    automaticBuySellInstruction:
      false;

    plannerDispatched:
      false;

    tradingExecuted:
      false;

    humanReviewRequiredBeforeTrading:
      true;
  };

  generatedAt:
    string;

  error?:
    string;
}
