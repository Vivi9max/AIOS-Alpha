import type {
  MarketRegion,
} from "./market-types";

export type MarketRadarPriority =
  | "critical"
  | "high"
  | "normal"
  | "low";

export type MarketRadarSignalType =
  | "market-change"
  | "volume-anomaly"
  | "price-change"
  | "sector-change"
  | "data-quality"
  | "event-review"
  | "risk-review";

export type MarketRadarState =
  | "stable"
  | "active"
  | "attention"
  | "blocked"
  | "insufficient";

export interface MarketRadarUniverseItem {
  symbol: string;
  market: MarketRegion;
}

export interface MarketRadarSignal {
  signalId: string;

  type: MarketRadarSignalType;

  priority: MarketRadarPriority;

  symbol: string;

  market: MarketRegion;

  title: string;

  description: string;

  materialChange: boolean;

  humanReviewRequired: true;

  sourceEventId: string | null;

  sourceVersion: string;

  detectedAt: string;
}

export interface MarketRadarSnapshot {
  state: MarketRadarState;

  universeSize: number;

  evaluatedCount: number;

  eventCount: number;

  materialEventCount: number;

  highPriorityCount: number;

  blockedCount: number;

  noChangeCount: number;

  noHistoryCount: number;

  signals: MarketRadarSignal[];

  generatedAt: string;

  latencyMs: number;
}

export interface MarketRadarRuntimeRequest {
  universe: MarketRadarUniverseItem[];

  query?: string | null;

  includeNoChange?: boolean;

  includeNoHistory?: boolean;

  includeBlocked?: boolean;
}

export interface MarketRadarRuntimeResult {
  success: boolean;

  code:
    | "C154_MARKET_RADAR_PASS"
    | "C154_MARKET_RADAR_PARTIAL"
    | "C154_MARKET_RADAR_INSUFFICIENT";

  radar: MarketRadarSnapshot;

  mutationPerformed: false;

  taskCreated: false;

  plannerDispatched: false;

  tradingExecuted: false;

  humanDecisionRequired: true;

  runtime: {
    name:
      "market-radar-runtime";

    version:
      "C154.1";

    upstream:
      "C147.13";

    generatedAt: string;

    latencyMs: number;
  };

  principles: string[];

  disclaimer: string;
}
