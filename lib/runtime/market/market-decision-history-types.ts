import type {
  MarketRegion,
} from "./market-types";

import type {
  MarketDecisionRecord,
} from "./market-decision-record-types";

import type {
  MarketReassessmentResult,
} from "./market-reassessment-types";

export interface MarketDecisionHistoryEntry {
  version: number;

  record:
    MarketDecisionRecord;

  reassessment:
    MarketReassessmentResult | null;

  savedAt: string;
}

export interface MarketDecisionHistory {
  historyId: string;

  symbol: string;

  market:
    MarketRegion;

  version: number;

  entries:
    MarketDecisionHistoryEntry[];

  latestRecordId:
    string | null;

  updatedAt: string;
}

export interface MarketDecisionHistoryRequest {
  universe: Array<{
    symbol: string;
    market: MarketRegion;
  }>;

  includeHistory?: boolean;

  maxHistoryEntries?: number;

  query?: string | null;
}

export interface MarketDecisionHistoryItem {
  symbol: string;

  market:
    MarketRegion;

  version: number;

  previousRecordId:
    string | null;

  currentRecordId:
    string;

  historyLength:
    number;

  currentRecord:
    MarketDecisionRecord;

  previousRecord:
    MarketDecisionRecord | null;

  reassessment:
    MarketReassessmentResult | null;

  firstObservation:
    boolean;

  humanDecisionRequired:
    boolean;
}

export interface MarketDecisionHistoryResult {
  success: boolean;

  code:
    | "C147_9_DECISION_HISTORY_PASS"
    | "C147_9_DECISION_HISTORY_PARTIAL"
    | "C147_9_DECISION_HISTORY_INSUFFICIENT";

  universeSize:
    number;

  evaluatedCount:
    number;

  firstObservationCount:
    number;

  reassessedCount:
    number;

  blockedCount:
    number;

  items:
    MarketDecisionHistoryItem[];

  principles:
    string[];

  humanDecisionRequired:
    boolean;

  storage: {
    mode:
      | "redis"
      | "memory";

    persistent:
      boolean;
  };

  runtime: {
    name:
      "market-decision-history-runtime";

    version:
      "C147.9";

    generatedAt:
      string;

    latencyMs:
      number;
  };

  disclaimer:
    string;
}
