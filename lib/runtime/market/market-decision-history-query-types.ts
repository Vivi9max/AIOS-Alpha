import type {
  MarketRegion,
} from "./market-types";

import type {
  MarketDecisionHistory,
  MarketDecisionHistoryEntry,
} from "./market-decision-history-types";

export interface MarketDecisionHistoryQueryRequest {
  symbol: string;

  market: MarketRegion;

  limit?: number;

  includeReassessment?: boolean;
}

export interface MarketDecisionHistoryTimelineEntry {
  version: number;

  recordId: string;

  symbol: string;

  market: MarketRegion;

  state: string;

  reviewStatus: string;

  generatedAt: string;

  savedAt: string;

  reassessment:
    MarketDecisionHistoryEntry["reassessment"];

  humanDecisionRequired: boolean;
}

export interface MarketDecisionHistoryQueryResult {
  success: boolean;

  code:
    | "C147_10_HISTORY_QUERY_PASS"
    | "C147_10_HISTORY_QUERY_EMPTY"
    | "C147_10_HISTORY_QUERY_INSUFFICIENT";

  historyFound: boolean;

  historyId: string | null;

  symbol: string;

  market: MarketRegion;

  currentVersion: number;

  totalVersions: number;

  entries:
    MarketDecisionHistoryTimelineEntry[];

  latestRecordId: string | null;

  storage: {
    mode:
      | "redis"
      | "memory";

    persistent: boolean;
  };

  humanDecisionRequired: boolean;

  readOnly: boolean;

  runtime: {
    name:
      "market-decision-history-query-runtime";

    version:
      "C147.10";

    generatedAt: string;

    latencyMs: number;
  };

  disclaimer: string;
}
