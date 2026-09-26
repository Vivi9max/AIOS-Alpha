import type {
  MarketRegion,
} from "./market-types";

import type {
  MarketResearchInvalidationLedgerRecord,
} from "./market-research-invalidation-ledger-types";

export interface MarketResearchInvalidationLedgerIndexEntry {
  ledgerId: string;
  symbol: string;
  market: MarketRegion;
  status:
    MarketResearchInvalidationLedgerRecord["status"];
  sourceGeneratedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketResearchInvalidationLedgerIndex {
  version: 1;
  entries:
    MarketResearchInvalidationLedgerIndexEntry[];
  updatedAt: string;
}

export interface MarketResearchInvalidationLedgerHistoryRequest {
  symbol?: string;
  market?: MarketRegion;
  limit?: number;
}

export interface MarketResearchInvalidationLedgerHistoryItem {
  ledgerId: string;
  symbol: string;
  market: MarketRegion;
  status:
    MarketResearchInvalidationLedgerRecord["status"];
  sourceGeneratedAt: string;
  createdAt: string;
  updatedAt: string;
  ledger:
    MarketResearchInvalidationLedgerRecord;
}

export interface MarketResearchInvalidationLedgerHistoryResult {
  success: boolean;

  code:
    | "C161_2_RESEARCH_INVALIDATION_LEDGER_HISTORY_PASS"
    | "C161_2_RESEARCH_INVALIDATION_LEDGER_HISTORY_EMPTY"
    | "C161_2_RESEARCH_INVALIDATION_LEDGER_HISTORY_INSUFFICIENT";

  symbol: string | null;
  market: MarketRegion | null;

  total: number;

  items:
    MarketResearchInvalidationLedgerHistoryItem[];

  index: {
    version: 1;
    entryCount: number;
    updatedAt: string;
  };

  humanReviewRequired: true;

  boundary: {
    automaticInvalidationEvaluation: false;
    decisionAutomaticallyGenerated: false;
    decisionRecorded: false;
    taskCreated: false;
    plannerDispatched: false;
    brokerConnected: false;
    liveOrderPlaced: false;
    tradingExecuted: false;
  };

  runtime: {
    name:
      "market-research-invalidation-ledger-history-runtime";
    version: "C161.2";
    upstream: "C161.1";
    generatedAt: string;
    latencyMs: number;
  };

  principles: string[];

  disclaimer: string;
}
