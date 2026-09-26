import type {
  MarketRegion,
} from "./market-types";

export type HistoricalFundamentalMetricName =
  | "revenue"
  | "netIncome"
  | "totalAssets"
  | "totalLiabilities"
  | "stockholdersEquity"
  | "operatingCashFlow"
  | "capitalExpenditures"
  | "freeCashFlow";

export type HistoricalFundamentalPeriod =
  | "quarterly"
  | "annual";

export type HistoricalFundamentalQuality =
  | "structured-verified"
  | "web-evidence"
  | "insufficient";

export interface HistoricalFundamentalObservation {
  metric:
    HistoricalFundamentalMetricName;

  value:
    number | null;

  currency:
    | "USD"
    | "HKD"
    | "CNY"
    | null;

  period:
    HistoricalFundamentalPeriod;

  periodStart:
    string | null;

  periodEnd:
    string;

  fiscalYear:
    number | null;

  fiscalPeriod:
    string | null;

  filingDate:
    string | null;

  form:
    string | null;

  source:
    string;

  quality:
    HistoricalFundamentalQuality;
}

export interface MarketHistoricalFundamentalSeries {
  contractVersion:
    "C162.2";

  symbol:
    string;

  market:
    MarketRegion;

  provider:
    string;

  structured:
    boolean;

  observations:
    HistoricalFundamentalObservation[];

  metricNames:
    HistoricalFundamentalMetricName[];

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

  restatementAware:
    boolean;

  fiscalPeriodNormalized:
    boolean;

  threeStatementReconciled:
    boolean;

  limitations:
    string[];

  humanVerificationRequired:
    true;
}

export interface MarketHistoricalFundamentalSeriesRequest {
  symbol:
    string;

  market?:
    MarketRegion | null;

  periods?:
    number;
}

export interface MarketHistoricalFundamentalSeriesResult {
  success:
    boolean;

  code:
    | "C162_2_HISTORICAL_FUNDAMENTAL_SERIES_PASS"
    | "C162_2_HISTORICAL_FUNDAMENTAL_SERIES_PARTIAL"
    | "C162_2_HISTORICAL_FUNDAMENTAL_SERIES_INSUFFICIENT";

  series:
    MarketHistoricalFundamentalSeries;

  upstream: {
    marketData:
      "C147.2";

    fundamentalContract:
      "C162.1";

    researchDossier:
      "C156";
  };

  boundary: {
    financialForecastGenerated:
      false;

    valuationGenerated:
      false;

    recommendationGenerated:
      false;

    plannerDispatched:
      false;

    tradingExecuted:
      false;
  };

  pipeline:
    string[];

  disclaimer:
    string;

  generatedAt:
    string;

  latencyMs:
    number;
}
