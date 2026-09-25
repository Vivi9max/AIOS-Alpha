import type {
  MarketBar,
  MarketRegion,
} from "./market-types";

export type BacktestStrategy =
  | "sma_crossover";

export interface MarketBacktestCandidateInput {
  symbol: string;
  market?: MarketRegion | null;
  name?: string | null;
}

export interface MarketBacktestRequest {
  candidates: MarketBacktestCandidateInput[];

  strategy?: BacktestStrategy;

  initialCapital?: number;

  fastPeriod?: number;
  slowPeriod?: number;

  feeBps?: number;
  slippageBps?: number;

  query?: string | null;

  /**
   * Optional explicit historical bars.
   *
   * When supplied, these bars are used directly.
   * Otherwise the runtime attempts to obtain verified
   * historical bars from the market provider.
   */
  bars?: MarketBar[] | null;
}

export interface BacktestTrade {
  id: number;

  side:
    | "buy"
    | "sell";

  timestamp: string;

  price: number;

  shares: number;

  grossValue: number;

  fee: number;

  slippage: number;

  netCashFlow: number;

  reason:
    | "entry"
    | "exit"
    | "final_close";
}

export interface BacktestEquityPoint {
  timestamp: string;

  price: number;

  cash: number;

  shares: number;

  equity: number;
}

export interface BacktestMetrics {
  initialCapital: number;

  finalEquity: number;

  netProfit: number;

  totalReturnPercent: number;

  annualizedReturnPercent: number | null;

  maxDrawdownPercent: number;

  maxDrawdownAmount: number;

  volatilityAnnualizedPercent: number | null;

  sharpeRatio: number | null;

  totalTrades: number;

  winningTrades: number;

  losingTrades: number;

  winRatePercent: number | null;

  grossProfit: number;

  grossLoss: number;

  profitFactor: number | null;

  exposurePercent: number;

  averageTradeReturnPercent: number | null;
}

export interface MarketBacktestCandidateResult {
  rank: number;

  input: MarketBacktestCandidateInput;

  normalizedSymbol: string;

  currency:
    | "USD"
    | "HKD"
    | "CNY";

  strategy: BacktestStrategy;

  data: {
    barCount: number;

    start: string | null;

    end: string | null;

    historicalVerified: boolean;

    historicalQuality:
      | "historical"
      | "live"
      | "delayed"
      | "web-evidence"
      | "insufficient"
      | "unknown";

    provider: string;

    providerHealth?: string | null;
  };

  metrics: BacktestMetrics;

  trades: BacktestTrade[];

  equityCurve: BacktestEquityPoint[];

  status:
    | "backtest-complete"
    | "historical-data-insufficient"
    | "backtest-error";

  warnings: string[];

  sourceCode: string;

  error?: string;
}

export interface MarketBacktestResult {
  success: boolean;

  code:
    | "C150_BACKTEST_PASS"
    | "C150_BACKTEST_PARTIAL"
    | "C150_BACKTEST_INSUFFICIENT";

  stage: "C150";

  requestedCandidates: number;

  evaluatedCandidates: number;

  candidates: MarketBacktestCandidateResult[];

  methodology: {
    purpose: string;

    strategy: string[];

    executionModel: string[];

    assumptions: {
      initialCapital: number;

      fastPeriod: number;

      slowPeriod: number;

      feeBps: number;

      slippageBps: number;
    };

    excludedFromDecision: string[];

    nextStage: "C151";
  };

  safetyBoundary: {
    founderOnly: true;

    historicalOnly: true;

    plannerDispatched: false;

    tradingExecuted: false;

    liveOrderPlaced: false;

    personalizedAdvice: false;

    returnPrediction: false;

    humanReviewRequiredBeforeTrading: true;
  };

  generatedAt: string;

  error?: string;
}
