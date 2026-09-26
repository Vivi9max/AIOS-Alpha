import type {
  MarketDataQuality,
  MarketRegion,
} from "./market-types";

export type FundamentalMetricName =
  | "revenue"
  | "revenueGrowth"
  | "eps"
  | "pe"
  | "pb"
  | "marketCap";

export type FundamentalMetricQuality =
  | "structured-verified"
  | "web-evidence"
  | "historical"
  | "insufficient";

export interface MarketFundamentalMetric {
  name: FundamentalMetricName;
  value: number | null;
  unit:
    | "currency"
    | "currency-per-share"
    | "percent"
    | "multiple"
    | "unknown";
  currency:
    | "USD"
    | "HKD"
    | "CNY"
    | null;
  period:
    | "current"
    | "ttm"
    | "quarterly"
    | "annual"
    | "unknown";
  asOf: string | null;
  source: string | null;
  quality: FundamentalMetricQuality;
}

export interface MarketFundamentalDataContract {
  contractVersion: "C162.1";
  symbol: string;
  market: MarketRegion;

  dataQuality: MarketDataQuality;

  source: string | null;
  dataset: string | null;

  asOf: string | null;

  metrics: MarketFundamentalMetric[];

  availableMetricCount: number;
  verifiedMetricCount: number;

  structuredDataVerified: boolean;
  webEvidenceUsed: boolean;

  historicalFinancialStatementsAvailable: false;

  limitations: string[];

  humanVerificationRequired: true;
}

export interface MarketFundamentalDataContractRequest {
  symbol: string;
  market?: MarketRegion | null;
}

export interface MarketFundamentalDataContractResult {
  success: boolean;

  code:
    | "C162_1_FUNDAMENTAL_DATA_CONTRACT_PASS"
    | "C162_1_FUNDAMENTAL_DATA_CONTRACT_PARTIAL"
    | "C162_1_FUNDAMENTAL_DATA_CONTRACT_INSUFFICIENT";

  contract: MarketFundamentalDataContract;

  upstream: {
    marketDataProvider: "C147.2";
    researchDossier: "C156";
    valuationEngine: "C149";
  };

  boundary: {
    dataMutation: false;
    financialForecastGenerated: false;
    valuationGenerated: false;
    recommendationGenerated: false;
    plannerDispatched: false;
    tradingExecuted: false;
  };

  pipeline: string[];

  disclaimer: string;

  generatedAt: string;
  latencyMs: number;
}
