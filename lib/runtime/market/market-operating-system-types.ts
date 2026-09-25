import type {
  MarketRegion,
} from "./market-types";

export type MarketOperatingSystemResearchState =
  | "monitoring"
  | "research-required"
  | "evidence-required"
  | "human-review"
  | "blocked"
  | "insufficient";

export type MarketResearchPriority =
  | "critical"
  | "high"
  | "normal";

export interface MarketOperatingSystemUniverseItem {
  symbol: string;
  market: MarketRegion;
}

export interface MarketResearchItem {
  researchId: string;

  symbol: string;

  market: MarketRegion;

  priority: MarketResearchPriority;

  state:
    | "material-change"
    | "evidence-required"
    | "blocked"
    | "monitoring";

  radarSignalId: string;

  sourceEventId: string | null;

  title: string;

  whatChanged: string[];

  whyItMatters: string[];

  evidenceStatus:
    | "verified"
    | "partial"
    | "insufficient"
    | "blocked";

  evidenceSourceCount: number;

  independentDomains: number;

  identityVerified: boolean;

  humanDecisionRequired: true;
}

export interface MarketOperatingSystemSnapshot {
  state: MarketOperatingSystemResearchState;

  universeSize: number;

  monitoredCount: number;

  materialChangeCount: number;

  evidenceRequiredCount: number;

  blockedCount: number;

  verifiedEvidenceCount: number;

  researchItems: MarketResearchItem[];

  generatedAt: string;

  latencyMs: number;
}

export interface MarketOperatingSystemRequest {
  universe: MarketOperatingSystemUniverseItem[];

  query?: string | null;

  includeMonitoring?: boolean;

  includeBlocked?: boolean;
}

export interface MarketOperatingSystemResult {
  success: boolean;

  code:
    | "C155_MARKET_OS_PASS"
    | "C155_MARKET_OS_PARTIAL"
    | "C155_MARKET_OS_INSUFFICIENT";

  snapshot: MarketOperatingSystemSnapshot;

  radarRuntime:
    "C154.1";

  evidenceRuntime:
    "C147.6";

  mutationPerformed: false;

  taskCreated: false;

  plannerDispatched: false;

  tradingExecuted: false;

  humanDecisionRequired: true;

  pipeline: string[];

  principles: string[];

  disclaimer: string;
}
