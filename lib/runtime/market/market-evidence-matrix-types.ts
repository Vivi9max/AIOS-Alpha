import type {
  MarketAnalysisResult,
  MarketRegion,
} from "./market-types";

export type MarketEvidenceMetric =
  | "price"
  | "marketCap"
  | "pe"
  | "pb"
  | "eps"
  | "revenue"
  | "revenueGrowth";

export type MarketEvidenceAgreement =
  | "corroborated"
  | "single-source"
  | "conflict"
  | "unavailable";

export type MarketEvidenceMetricQuality =
  | "verified"
  | "supported"
  | "conflicted"
  | "insufficient";

export interface MarketEvidenceObservation {
  metric: MarketEvidenceMetric;
  value: number | null;
  sourceTitle: string;
  sourceUrl: string;
  hostname: string;
  observedText: string;
  freshness: string;
}

export interface MarketEvidenceMetricMatrix {
  metric: MarketEvidenceMetric;
  value: number | null;

  agreement:
    MarketEvidenceAgreement;

  quality:
    MarketEvidenceMetricQuality;

  observationCount: number;

  independentDomains: number;

  observations:
    MarketEvidenceObservation[];

  conflict:
    boolean;

  humanVerificationRequired:
    boolean;

  explanation:
    string;
}

export interface MarketEvidenceMatrixItem {
  symbol: string;
  market: MarketRegion;

  identityVerified: boolean;

  metrics: Record<
    MarketEvidenceMetric,
    MarketEvidenceMetricMatrix
  >;

  evidenceSummary: {
    sourceCount: number;
    independentDomains: number;
    verified: boolean;
  };

  freshness: {
    status: string;
    asOf: string | null;
  };

  dataQuality:
    string;

  humanReviewRequired:
    boolean;

  analysis:
    MarketAnalysisResult | null;
}

export interface MarketEvidenceMatrixRequest {
  universe: Array<{
    symbol: string;
    market: MarketRegion;
  }>;

  query?: string | null;
}

export interface MarketEvidenceMatrixResult {
  success: boolean;

  code:
    | "C147_6_EVIDENCE_MATRIX_PASS"
    | "C147_6_EVIDENCE_MATRIX_PARTIAL"
    | "C147_6_EVIDENCE_MATRIX_INSUFFICIENT";

  universeSize: number;
  evaluatedCount: number;

  verifiedCount: number;
  conflictedCount: number;
  insufficientCount: number;

  items:
    MarketEvidenceMatrixItem[];

  principles: string[];

  humanDecisionRequired:
    boolean;

  runtime: {
    name:
      "market-evidence-matrix-runtime";
    version: "C147.6";
    generatedAt: string;
    latencyMs: number;
  };

  disclaimer: string;
}
