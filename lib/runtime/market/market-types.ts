export type MarketRegion =
  | "us"
  | "hk"
  | "cn";

export type MarketAnalysisMode =
  | "research"
  | "screen"
  | "valuation"
  | "technical"
  | "full";

export type MarketDataQuality =
  | "live"
  | "delayed"
  | "historical"
  | "web-evidence"
  | "insufficient";

export type MarketFreshness =
  | "fresh"
  | "stale"
  | "unknown";

export type MarketTradingSession =
  | "regular"
  | "after_hours"
  | "pre_market"
  | "intraday"
  | "unknown";

export type MarketPeriod =
  | "intraday"
  | "daily"
  | "ttm"
  | "quarterly"
  | "annual"
  | "ytd"
  | "one_year"
  | "multi_year"
  | "unknown";

export type MarketFieldName =
  | "price"
  | "previousClose"
  | "changePercent"
  | "open"
  | "high"
  | "low"
  | "volume"
  | "marketCap"
  | "pe"
  | "pb"
  | "eps"
  | "revenue"
  | "revenueGrowth"
  | "afterHoursPrice"
  | "preMarketPrice";

export type MarketFieldQuality =
  | "corroborated"
  | "single-source"
  | "corroborated-with-conflict"
  | "conflict"
  | "missing";

export interface MarketInstrument {
  symbol: string;
  normalizedSymbol: string;
  name?: string | null;
  market: MarketRegion;
  exchange: string;
  currency:
    | "USD"
    | "HKD"
    | "CNY";
}

export interface MarketBar {
  timestamp: string;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number | null;
}

export interface MarketSemanticValue {
  value: number | null;
  unit:
    | "price"
    | "percent"
    | "shares"
    | "currency"
    | "multiple"
    | "unknown";
  currency:
    | "USD"
    | "HKD"
    | "CNY"
    | null;
  session: MarketTradingSession;
  period: MarketPeriod;
  timestamp: string | null;
  source: string | null;
  quality: MarketFieldQuality;
}

export interface MarketSemanticSnapshot {
  price: MarketSemanticValue;
  previousClose: MarketSemanticValue;
  changePercent: MarketSemanticValue;
  open: MarketSemanticValue;
  high: MarketSemanticValue;
  low: MarketSemanticValue;
  volume: MarketSemanticValue;
  afterHoursPrice: MarketSemanticValue;
  preMarketPrice: MarketSemanticValue;
  marketCap: MarketSemanticValue;
  pe: MarketSemanticValue;
  pb: MarketSemanticValue;
  eps: MarketSemanticValue;
  revenue: MarketSemanticValue;
  revenueGrowth: MarketSemanticValue;
  regularSessionPrice: MarketSemanticValue;
}

export interface MarketSnapshot {
  price?: number | null;
  previousClose?: number | null;
  changePercent?: number | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  volume?: number | null;
  marketCap?: number | null;
  pe?: number | null;
  pb?: number | null;
  eps?: number | null;
  revenue?: number | null;
  revenueGrowth?: number | null;
  afterHoursPrice?: number | null;
  preMarketPrice?: number | null;

  dataQuality: MarketDataQuality;
  liveQuoteAvailable: boolean;

  quoteQuality?: MarketDataQuality;
  historicalQuality?: MarketDataQuality;

  asOf?: string | null;
  source?: string | null;
  dataset?: string | null;

  bars?: MarketBar[];

  fieldQuality?: Partial<
    Record<
      MarketFieldName,
      MarketFieldQuality
    >
  >;

  semantic?: MarketSemanticSnapshot;
}

export interface MarketEvidence {
  title: string;
  url: string;
  hostname: string;
  snippet: string;
  retrievedAt: number;
  confidence: number;
}

export interface MarketDataProviderStatus {
  provider: string;
  configured: boolean;
  available: boolean;

  supportsQuote: boolean;
  supportsRealtime?: boolean;
  supportsHistorical: boolean;
  supportsFundamentals: boolean;

  /*
   * Technical capability:
   * markets the provider itself supports.
   */
  supportsMarkets: MarketRegion[];

  /*
   * C147.22.3
   *
   * Account entitlement verified by an actual
   * provider request. This MUST NOT be inferred
   * from technical provider capability.
   */
  entitledMarkets?: MarketRegion[];

  /*
   * C147.22.3
   *
   * Markets that have successfully returned a
   * verified realtime Trade Tick during the
   * capability probe.
   */
  realtimeVerifiedMarkets?: MarketRegion[];

  /*
   * C147.22.3
   *
   * Per-market capability diagnostics.
   */
  marketCapabilities?: Partial<
    Record<
      MarketRegion,
      {
        technicalSupport: boolean;
        accountEntitled: boolean;
        realtimeVerified: boolean;
        probeSymbol: string;
        failureCode?: string | null;
        reason?: string | null;
      }
    >
  >;

  reason?: string;
}

export interface MarketAnalysis {
  industry: {
    summary: string;
    evidence: string[];
  };
  company: {
    summary: string;
    strengths: string[];
    risks: string[];
  };
  fundamentals: {
    assessment: string;
    signals: string[];
  };
  valuation: {
    assessment: string;
    signals: string[];
  };
  trend: {
    assessment: string;
    signals: string[];
  };
  risk: {
    level:
      | "low"
      | "medium"
      | "high"
      | "unknown";
    factors: string[];
  };
  decisionSupport: {
    currentState: string;
    supportingFactors: string[];
    invalidationConditions: string[];
    watchMetrics: string[];
    scenarios: Array<{
      name: string;
      condition: string;
      implication: string;
    }>;
  };
}

export interface MarketAnalysisRequest {
  symbol: string;
  market?: MarketRegion | null;
  mode?: MarketAnalysisMode;
  query?: string | null;
}

export interface MarketFreshnessVerification {
  freshness: MarketFreshness;
  ageMinutes: number | null;
  ageHours: number | null;
  referenceTime: string | null;
  reason: string;
}

export interface MarketAnalysisResult {
  success: boolean;
  code: string;
  instrument: MarketInstrument;
  snapshot: MarketSnapshot;
  analysis: MarketAnalysis;
  evidence: MarketEvidence[];

  verification: {
    verified: boolean;
    sourceCount: number;
    independentDomains: number;
    primarySourceFound: boolean;
    structuredDataAvailable: boolean;
    structuredDataVerified: boolean;
    freshness: MarketFreshnessVerification;
  };

  provider: MarketDataProviderStatus;

  metadata: {
    runtime: "aios-alpha";
    stage:
      | "C147.2.4"
      | "C147.2.5"
      | "C147.2.6"
      | "C147.2.7";

    analysisMode: MarketAnalysisMode;
    generatedAt: string;
    disclaimer: string;
  };

  error?: string;
}
