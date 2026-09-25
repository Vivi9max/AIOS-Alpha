import type {
  MarketRegion,
} from "./market-types";

import type {
  PaperTradingResult,
} from "./paper-trading-types";

export type MarketPaperTradePerformanceState =
  | "review-ready"
  | "partial"
  | "insufficient";

export interface MarketPaperTradePerformanceRequest {
  symbol: string;
  market: MarketRegion;

  paperTrading: PaperTradingResult;

  query?: string | null;
}

export interface MarketPaperTradePerformanceMetrics {
  initialCapital: number;
  finalCash: number;
  finalEquity: number;

  netProfit: number;
  totalReturnPercent: number;

  realizedPnl: number;
  unrealizedPnl: number;

  totalFees: number;
  totalSlippage: number;

  requestedOrders: number;
  filledOrders: number;
  rejectedOrders: number;

  fillRatePercent: number;
  rejectionRatePercent: number;

  openPositions: number;

  maxDrawdown: number;
  maxDrawdownPercent: number;
}

export interface MarketPaperTradePerformanceDataQuality {
  priceSources: string[];
  providers: string[];
  dataQualities: string[];
  verifiedPriceCount: number;
  unverifiedPriceCount: number;
  insufficientPriceCount: number;
  historicalPriceCount: number;
  runtimePriceCount: number;
  webEvidencePriceCount: number;
  asOf: string | null;
}

export interface MarketPaperTradePerformanceReviewItem {
  category:
    | "performance"
    | "execution"
    | "cost"
    | "data"
    | "position"
    | "risk";

  title: string;

  observation: string;

  requiresHumanReview: true;
}

export interface MarketPaperTradePerformanceResult {
  success: boolean;

  code:
    | "C159_MARKET_PAPER_TRADE_PERFORMANCE_PASS"
    | "C159_MARKET_PAPER_TRADE_PERFORMANCE_PARTIAL"
    | "C159_MARKET_PAPER_TRADE_PERFORMANCE_INSUFFICIENT";

  state: MarketPaperTradePerformanceState;

  symbol: string;
  market: MarketRegion;

  metrics: MarketPaperTradePerformanceMetrics;

  dataQuality: MarketPaperTradePerformanceDataQuality;

  reviewItems: MarketPaperTradePerformanceReviewItem[];

  methodology: {
    source: "C151";
    simulationOnly: true;
    historicalPerformanceOnly: true;
    futurePerformancePrediction: false;
    recommendationGenerated: false;
  };

  boundary: {
    humanDecisionRequired: true;
    decisionAutomaticallyGenerated: false;
    taskCreated: false;
    plannerDispatched: false;
    brokerConnected: false;
    liveOrderPlaced: false;
    tradingExecuted: false;
  };

  upstream: {
    decisionWorkspace: "C157.1";
    paperTradeGate: "C158";
    paperTrading: "C151";
    liveTradingBoundary: "C152";
  };

  pipeline: string[];

  principles: string[];

  disclaimer: string;

  generatedAt: string;

  latencyMs: number;
}
