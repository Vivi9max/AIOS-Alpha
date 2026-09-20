import type {
  MarketRegion,
} from "./market-types";

import type {
  MarketScreeningCriteria,
  MarketScreeningDecision,
  MarketScreeningItem,
  MarketScreeningRequest,
  MarketScreeningResult,
} from "./market-screening-types";

export type MarketResearchSection =
  | "universe"
  | "criteria"
  | "candidates"
  | "excluded"
  | "insufficient-data"
  | "evidence"
  | "risk"
  | "freshness"
  | "human-decision";

export interface MarketResearchItem {
  symbol: string;
  market: MarketRegion;

  decision: MarketScreeningDecision;

  matchedCriteria: string[];
  failedCriteria: string[];
  missingCriteria: string[];

  reasons: string[];
  risks: string[];

  price: number | null;
  pe: number | null;
  pb: number | null;
  eps: number | null;
  revenueGrowth: number | null;

  dataQuality: string;
  asOf: string | null;

  sourceCount: number;
  independentDomains: number;
  verified: boolean;
}

export interface MarketScreeningResearchReport {
  success: boolean;

  code:
    | "C147_3_2_REPORT_PASS"
    | "C147_3_2_REPORT_PARTIAL"
    | "C147_3_2_REPORT_INSUFFICIENT";

  report: {
    title: string;

    generatedAt: string;

    market:
      | MarketRegion
      | "mixed";

    universeSize: number;

    evaluatedCount: number;

    candidateCount: number;

    excludedCount: number;

    insufficientDataCount: number;

    candidates: MarketResearchItem[];

    excluded: MarketResearchItem[];

    insufficientData: MarketResearchItem[];

    evidenceSummary: {
      totalSources: number;
      averageSources: number;
      totalIndependentDomains: number;
      averageIndependentDomains: number;
      verifiedCount: number;
      unverifiedCount: number;
    };

    freshnessSummary: {
      knownAsOfCount: number;
      unknownAsOfCount: number;
      oldestAsOf: string | null;
      newestAsOf: string | null;
      dataQuality: string[];
    };

    sections: MarketResearchSection[];

    humanDecisionRequired: boolean;

    humanDecisionNote: string;
  };

  criteria: MarketScreeningCriteria;

  sourceScreening: MarketScreeningResult;

  runtime: {
    name: "market-screening-report-runtime";
    version: "C147.3.2";
    generatedAt: string;
    latencyMs: number;
  };

  disclaimer: string;
}

export interface MarketScreeningResearchReportRequest {
  screening: MarketScreeningRequest;

  title?: string;
}
