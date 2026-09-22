import type {
  MarketRegion,
} from "./market-types";

import type {
  MarketDecisionChangeAction,
  MarketDecisionChangeDetectionItem,
} from "./market-decision-change-detection-types";

export type MarketChangeEventType =
  | "market-decision-changed"
  | "market-decision-reassessment-required"
  | "market-decision-no-change"
  | "market-decision-no-history"
  | "market-decision-blocked";

export type MarketChangeEventPriority =
  | "normal"
  | "high"
  | "blocked";

export interface MarketChangeEvent {
  eventId: string;

  eventType: MarketChangeEventType;

  priority: MarketChangeEventPriority;

  symbol: string;

  market: MarketRegion;

  action: MarketDecisionChangeAction;

  observationChanged: boolean;

  materialChange: boolean;

  previousVersion: number;

  currentVersion: number;

  previousRecordId: string | null;

  currentRecordId: string;

  observationFingerprint: string;

  previousFingerprint: string | null;

  reassessmentId: string | null;

  whatChanged: string[];

  whyItMatters: string[];

  whatRequiresHumanReview: string[];

  humanDecisionRequired: true;

  sourceRuntime:
    "market-decision-change-detection-runtime";

  sourceVersion:
    "C147.12";

  createdAt: string;
}

export interface MarketChangeEventRuntimeRequest {
  universe: Array<{
    symbol: string;
    market: MarketRegion;
  }>;

  query?: string | null;

  includeExcluded?: boolean;

  includeInsufficientData?: boolean;
}

export interface MarketChangeEventRuntimeResult {
  success: boolean;

  code:
    | "C147_13_MARKET_CHANGE_EVENT_PASS"
    | "C147_13_MARKET_CHANGE_EVENT_PARTIAL"
    | "C147_13_MARKET_CHANGE_EVENT_INSUFFICIENT";

  universeSize: number;

  evaluatedCount: number;

  eventCount: number;

  materialEventCount: number;

  noChangeCount: number;

  noHistoryCount: number;

  blockedCount: number;

  events: MarketChangeEvent[];

  mutationPerformed: false;

  taskCreated: false;

  plannerDispatched: false;

  tradingExecuted: false;

  humanDecisionRequired: true;

  sourceRuntime: {
    name:
      "market-change-event-runtime";

    version:
      "C147.13";

    upstream:
      "C147.12";

    generatedAt: string;

    latencyMs: number;
  };

  principles: string[];

  disclaimer: string;
}
