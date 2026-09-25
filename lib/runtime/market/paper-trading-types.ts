import type {
  MarketBar,
  MarketRegion,
} from "./market-types";

export type PaperOrderSide =
  | "buy"
  | "sell";

export type PaperOrderStatus =
  | "filled"
  | "rejected";

export interface PaperTradingCandidateInput {
  symbol: string;
  market?: MarketRegion | null;
  name?: string | null;
}

export interface PaperTradingOrderInput {
  symbol: string;

  market?: MarketRegion | null;

  side: PaperOrderSide;

  quantity: number;

  /**
   * Optional explicit simulation fill price.
   *
   * When omitted, the engine uses:
   * 1. supplied historical bar close;
   * 2. otherwise verified/runtime market snapshot price.
   *
   * This never creates a real broker order.
   */
  price?: number | null;

  timestamp?: string | null;

  reason?: string | null;
}

export interface PaperTradingRequest {
  candidates?: PaperTradingCandidateInput[];

  orders: PaperTradingOrderInput[];

  initialCapital?: number;

  feeBps?: number;

  slippageBps?: number;

  query?: string | null;

  /**
   * Optional historical bars used as the
   * deterministic simulation price source.
   */
  bars?: MarketBar[] | null;
}

export interface PaperPosition {
  symbol: string;

  market: MarketRegion;

  name?: string | null;

  quantity: number;

  averageEntryPrice: number;

  lastPrice: number;

  marketValue: number;

  costBasis: number;

  realizedPnl: number;

  unrealizedPnl: number;

  totalPnl: number;

  currency:
    | "USD"
    | "HKD"
    | "CNY";
}

export interface PaperTrade {
  id: number;

  symbol: string;

  market: MarketRegion;

  side: PaperOrderSide;

  status: PaperOrderStatus;

  timestamp: string;

  quantity: number;

  requestedPrice: number | null;

  fillPrice: number | null;

  grossValue: number;

  fee: number;

  slippage: number;

  cashFlow: number;

  realizedPnl: number;

  reason: string | null;

  rejectionReason?: string | null;
}

export interface PaperEquityPoint {
  timestamp: string;

  cash: number;

  positionsValue: number;

  equity: number;
}

export interface PaperTradingMetrics {
  initialCapital: number;

  finalCash: number;

  finalEquity: number;

  netProfit: number;

  totalReturnPercent: number;

  realizedPnl: number;

  unrealizedPnl: number;

  totalFees: number;

  totalSlippage: number;

  filledOrders: number;

  rejectedOrders: number;

  openPositions: number;
}

export interface PaperTradingCandidateResult {
  rank: number;

  input: PaperTradingCandidateInput;

  normalizedSymbol: string;

  currency:
    | "USD"
    | "HKD"
    | "CNY";

  position: PaperPosition | null;

  trades: PaperTrade[];

  data: {
    priceSource:
      | "explicit-order"
      | "historical-bar"
      | "market-runtime"
      | "insufficient";

    priceVerified: boolean;

    dataQuality:
      | "historical"
      | "live"
      | "delayed"
      | "web-evidence"
      | "insufficient"
      | "unknown";

    provider: string;

    asOf: string | null;
  };

  status:
    | "paper-complete"
    | "paper-insufficient"
    | "paper-rejected";

  warnings: string[];
}

export interface PaperTradingResult {
  success: boolean;

  code:
    | "C151_PAPER_TRADING_PASS"
    | "C151_PAPER_TRADING_PARTIAL"
    | "C151_PAPER_TRADING_INSUFFICIENT";

  stage: "C151";

  requestedOrders: number;

  filledOrders: number;

  rejectedOrders: number;

  account: {
    currency:
      | "USD"
      | "HKD"
      | "CNY";

    initialCapital: number;

    cash: number;

    positionsValue: number;

    equity: number;

    positions: PaperPosition[];
  };

  metrics: PaperTradingMetrics;

  trades: PaperTrade[];

  equityCurve: PaperEquityPoint[];

  candidates: PaperTradingCandidateResult[];

  methodology: {
    purpose: string;

    executionModel: string[];

    pricingHierarchy: string[];

    assumptions: {
      initialCapital: number;

      feeBps: number;

      slippageBps: number;
    };

    excludedFromDecision: string[];

    nextStage: "C152";
  };

  safetyBoundary: {
    founderOnly: true;

    simulationOnly: true;

    brokerConnected: false;

    tradingExecuted: false;

    liveOrderPlaced: false;

    plannerDispatched: false;

    personalizedAdvice: false;

    humanReviewRequiredBeforeLiveTrading: true;
  };

  generatedAt: string;

  error?: string;
}
