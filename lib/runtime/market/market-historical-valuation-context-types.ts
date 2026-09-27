import type {
  MarketRegion,
} from "./market-types";
import type {
  HistoricalFundamentalMetricName,
  MarketHistoricalFundamentalSeries,
} from "./market-historical-fundamental-series-types";
export interface HistoricalValuationObservation {
  metric:
    HistoricalFundamentalMetricName;
  value:
    number | null;
  period:
    "annual"
    | "quarterly";
  periodEnd:
    string;
  currency:
    "USD"
    | "HKD"
    | "CNY"
    | null;
  quality:
    "structured-verified"
    | "web-evidence"
    | "insufficient";
  source:
    string;
}
export interface HistoricalGrowthSignal {
  metric:
    "revenue"
    | "netIncome"
    | "operatingCashFlow"
    | "freeCashFlow";
  currentValue:
    number | null;
  previousValue:
    number | null;
  growthRate:
    number | null;
  period:
    "annual"
    | "quarterly"
    | null;
  currentPeriodEnd:
    string | null;
  previousPeriodEnd:
    string | null;
  status:
    | "calculated"
    | "insufficient";
  interpretation:
    string;
}
export interface MarketHistoricalValuationContext {
  contractVersion:
    "C163.4";
  symbol:
    string;
  market:
    MarketRegion;
  provider:
    string;
  historicalSeriesContract:
    "C162.2";
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
  latestObservations:
    HistoricalValuationObservation[];
  growthSignals:
    HistoricalGrowthSignal[];
  revenueGrowth:
    number | null;
  netIncomeGrowth:
    number | null;
  operatingCashFlowGrowth:
    number | null;
  freeCashFlowGrowth:
    number | null;
  historicalDataQuality:
    | "structured-verified"
    | "partial"
    | "insufficient";
  historicalDataUsableForValuation:
    boolean;
  limitations:
    string[];
  humanVerificationRequired:
    true;
}
export interface MarketHistoricalValuationContextRequest {
  symbol:
    string;
  market?:
    MarketRegion | null;
  periods?:
    number;
}
export interface MarketHistoricalValuationContextResult {
  success:
    boolean;
  code:
    | "C163_4_HISTORICAL_VALUATION_CONTEXT_PASS"
    | "C163_4_HISTORICAL_VALUATION_CONTEXT_PARTIAL"
    | "C163_4_HISTORICAL_VALUATION_CONTEXT_INSUFFICIENT";
  context:
    MarketHistoricalValuationContext;
  sourceSeries:
    MarketHistoricalFundamentalSeries;
  boundary: {
    valuationGenerated:
      false;
    forecastGenerated:
      false;
    recommendationGenerated:
      false;
    plannerDispatched:
      false;
    tradingExecuted:
      false;
  };
  generatedAt:
    string;
  latencyMs:
    number;
  disclaimer:
    string;
}
