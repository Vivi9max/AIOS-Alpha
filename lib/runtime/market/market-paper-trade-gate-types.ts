import type {
  MarketRegion,
} from "./market-types";

import type {
  PaperTradingResult,
} from "./paper-trading-types";

export type MarketPaperTradeGateState =
  | "approved-for-paper"
  | "review-required"
  | "blocked"
  | "insufficient";

export interface MarketPaperTradeGateOrder {
  symbol: string;
  market: MarketRegion;
  side: "buy" | "sell";
  quantity: number;
  price?: number | null;
  timestamp?: string | null;
  reason?: string | null;
}

export interface MarketPaperTradeGateRequest {
  symbol: string;
  market: MarketRegion;

  /**
   * Explicit human confirmation is mandatory.
   *
   * C158 never infers this value from research output.
   */
  humanDecisionConfirmed: boolean;

  order: MarketPaperTradeGateOrder;

  initialCapital?: number;
  feeBps?: number;
  slippageBps?: number;

  query?: string | null;
}

export interface MarketPaperTradeGateResult {
  success: boolean;

  code:
    | "C158_MARKET_PAPER_TRADE_GATE_PASS"
    | "C158_MARKET_PAPER_TRADE_GATE_PARTIAL"
    | "C158_MARKET_PAPER_TRADE_GATE_BLOCKED"
    | "C158_MARKET_PAPER_TRADE_GATE_INSUFFICIENT";

  state: MarketPaperTradeGateState;

  symbol: string;
  market: MarketRegion;

  humanDecisionConfirmed: boolean;

  decisionWorkspace: {
    decisionId: string | null;
    state: string | null;
    reviewStatus: string | null;
    materialChange: boolean;
    evidenceVerified: boolean;
    sourceCount: number;
    independentDomains: number;
    evidenceGaps: string[];
    invalidationConditions: string[];
  };

  paperTrading: {
    executed: boolean;
    result: PaperTradingResult | null;
  };

  boundary: {
    humanDecisionRequired: true;
    recommendationGenerated: false;
    decisionAutomaticallyGenerated: false;
    taskCreated: false;
    plannerDispatched: false;
    brokerConnected: false;
    liveOrderPlaced: false;
    tradingExecuted: false;
  };

  upstream: {
    decisionWorkspace: "C157.1";
    paperTrading: "C151";
    liveTradingBoundary: "C152";
  };

  pipeline: string[];
  principles: string[];
  disclaimer: string;

  generatedAt: string;
  latencyMs: number;
}
