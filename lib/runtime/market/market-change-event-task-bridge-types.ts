import type {
  MarketRegion,
} from "./market-types";
import type {
  MarketChangeEvent,
} from "./market-change-event-types";
export type MarketChangeEventTaskBridgeAction =
  | "task-created"
  | "task-already-exists"
  | "no-task-required"
  | "blocked";
export interface MarketChangeEventTaskBridgeRequest {
  universe: Array<{
    symbol: string;
    market: MarketRegion;
  }>;
  query?: string | null;
  includeExcluded?: boolean;
  includeInsufficientData?: boolean;
}
export interface MarketChangeEventTaskBridgeItem {
  symbol: string;
  market: MarketRegion;
  eventId: string;
  eventType: MarketChangeEvent["eventType"];
  action: MarketChangeEventTaskBridgeAction;
  materialChange: boolean;
  currentVersion: number;
  reassessmentId: string | null;
  taskId: string | null;
  taskTitle: string | null;
  humanDecisionRequired: true;
  automatedExecutionStarted: false;
  plannerDispatched: false;
  tradingExecuted: false;
  reason: string;
}
export interface MarketChangeEventTaskBridgeResult {
  success: boolean;
  code:
    | "C147_14_MARKET_EVENT_TASK_BRIDGE_PASS"
    | "C147_14_MARKET_EVENT_TASK_BRIDGE_PARTIAL"
    | "C147_14_MARKET_EVENT_TASK_BRIDGE_INSUFFICIENT";
  universeSize: number;
  eventCount: number;
  materialEventCount: number;
  taskCreatedCount: number;
  taskExistingCount: number;
  noTaskRequiredCount: number;
  blockedCount: number;
  items: MarketChangeEventTaskBridgeItem[];
  mutationPerformed: false;
  taskCreated: boolean;
  plannerDispatched: false;
  tradingExecuted: false;
  humanDecisionRequired: true;
  runtime: {
    name:
      "market-change-event-task-bridge-runtime";
    version:
      "C147.14";
    upstream:
      "C147.13";
    generatedAt: string;
    latencyMs: number;
  };
  principles: string[];
  disclaimer: string;
}
