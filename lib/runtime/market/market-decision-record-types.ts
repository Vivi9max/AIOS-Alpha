import type {
  MarketRegion,
} from "./market-types";

export type MarketDecisionRecordState =
  | "research-candidate"
  | "excluded"
  | "insufficient-data";

export type MarketDecisionRecordReviewStatus =
  | "pending-human-review"
  | "review-ready"
  | "blocked";

export interface MarketDecisionRecordScenario {
  name: string;
  condition: string;
  implication: string;
}

export interface MarketDecisionRecordEvidence {
  sourceCount: number;
  independentDomains: number;
  verified: boolean;
  freshness: string;
  asOf: string | null;
}

export interface MarketDecisionRecord {
  recordId: string;

  symbol: string;
  market: MarketRegion;

  state:
    MarketDecisionRecordState;

  reviewStatus:
    MarketDecisionRecordReviewStatus;

  currentState: string;

  supportingFactors: string[];

  risks: string[];

  invalidationConditions: string[];

  watchMetrics: string[];

  scenarios:
    MarketDecisionRecordScenario[];

  industry: string | null;

  company: string | null;

  fundamentals: {
    revenueGrowth: number | null;
    eps: number | null;
    assessment: string | null;
  };

  valuation: {
    pe: number | null;
    pb: number | null;
    assessment: string | null;
  };

  evidence:
    MarketDecisionRecordEvidence;

  dataQuality:
    string;

  humanDecisionRequired:
    boolean;

  decisionBoundary: {
    whatWouldChangeAssessment: string[];
    whatWouldInvalidateAssessment: string[];
  };

  sourceVersion: string;

  generatedAt: string;
}

export interface MarketDecisionRecordRequest {
  universe: Array<{
    symbol: string;
    market: MarketRegion;
  }>;

  includeExcluded?: boolean;

  includeInsufficientData?: boolean;

  query?: string | null;
}

export interface MarketDecisionRecordResult {
  success: boolean;

  code:
    | "C147_7_DECISION_RECORD_PASS"
    | "C147_7_DECISION_RECORD_PARTIAL"
    | "C147_7_DECISION_RECORD_INSUFFICIENT";

  universeSize: number;

  evaluatedCount: number;

  reviewReadyCount: number;

  blockedCount: number;

  records:
    MarketDecisionRecord[];

  principles: string[];

  humanDecisionRequired:
    boolean;

  runtime: {
    name:
      "market-decision-record-runtime";

    version:
      "C147.7";

    generatedAt: string;

    latencyMs: number;
  };

  disclaimer: string;
}
