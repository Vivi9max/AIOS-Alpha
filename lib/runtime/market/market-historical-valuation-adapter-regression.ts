import {
  runMarketHistoricalValuationContext,
} from "./market-historical-valuation-context-runtime";
import {
  buildHistoricalValuationRequest,
} from "./market-historical-valuation-adapter-runtime";
import type {
  MarketRegion,
} from "./market-types";
export interface MarketHistoricalValuationAdapterRegressionResult {
  success: boolean;
  code:
    | "C163_4_ADAPTER_REGRESSION_PASS"
    | "C163_4_ADAPTER_REGRESSION_PARTIAL"
    | "C163_4_ADAPTER_REGRESSION_FAIL";
  contract: {
    source: "C163.4";
    target: "C149";
    historicalSeries: "C162.2";
  };
  input: {
    symbol: string;
    market: MarketRegion;
    periods: number;
  };
  checks: {
    historicalContextLoaded: boolean;
    historicalContextUsable: boolean;
    c149RequestGenerated: boolean;
    c149SymbolPreserved: boolean;
    c149MarketPreserved: boolean;
    historicalRevenueGrowthObserved: boolean;
    historicalNetIncomeGrowthObserved: boolean;
    historicalOperatingCashFlowGrowthObserved: boolean;
    historicalFreeCashFlowGrowthObserved: boolean;
    historicalGrowthNotInjectedAsScenario: boolean;
    explicitScenarioAssumptionsPreserved: boolean;
    noForecastGenerated: boolean;
    noTargetPriceGenerated: boolean;
    noRecommendationGenerated: boolean;
    plannerNotDispatched: boolean;
    tradingNotExecuted: boolean;
  };
  adaptedRequest: {
    industry: string;
    symbol: string;
    market: MarketRegion | null;
    assumptions: {
      revenueGrowthLow: number | null;
      revenueGrowthBase: number | null;
      revenueGrowthHigh: number | null;
    };
  };
  historicalInputs: {
    revenueGrowth: number | null;
    netIncomeGrowth: number | null;
    operatingCashFlowGrowth: number | null;
    freeCashFlowGrowth: number | null;
    sourceQuality:
      | "structured-verified"
      | "partial"
      | "insufficient";
  };
  limitations: string[];
  humanVerificationRequired: true;
  generatedAt: string;
  latencyMs: number;
}
function finiteOrNull(
  value: number | null | undefined,
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return null;
  }
  return value;
}
function normalizeSymbol(
  value: string,
): string {
  return value
    .trim()
    .toUpperCase();
}
function isMarketRegion(
  value: string | null | undefined,
): value is MarketRegion {
  return (
    value === "us" ||
    value === "hk" ||
    value === "cn"
  );
}
export async function runMarketHistoricalValuationAdapterRegression(
  request: {
    symbol: string;
    market?: MarketRegion | null;
    periods?: number;
    industry?: string | null;
  },
): Promise<MarketHistoricalValuationAdapterRegressionResult> {
  const startedAt =
    Date.now();
  const symbol =
    normalizeSymbol(
      request.symbol,
    );
  if (!symbol) {
    throw new Error(
      "symbol is required.",
    );
  }
  const market =
    request.market ??
    "us";
  if (
    !isMarketRegion(
      market,
    )
  ) {
    throw new Error(
      "market must be us, hk or cn.",
    );
  }
  const periods =
    Number.isFinite(
      request.periods,
    )
      ? Math.max(
          2,
          Math.min(
            Math.floor(
              request.periods as number,
            ),
            12,
          ),
        )
      : 5;
  const industry =
    request.industry?.trim() ||
    "Regression Validation";
  const contextResult =
    await runMarketHistoricalValuationContext({
      symbol,
      market,
      periods,
    });
  const context =
    contextResult.context;
  const adapterResult =
    buildHistoricalValuationRequest({
      industry,
      symbol,
      market,
      historicalContext:
        context,
    });
  const adaptedRequest =
    adapterResult.request;
  const candidate =
    adaptedRequest.candidates[0] ??
    null;
  const c149SymbolPreserved =
    candidate !== null &&
    normalizeSymbol(
      candidate.symbol,
    ) ===
      symbol;
  const c149MarketPreserved =
    candidate !== null &&
    candidate.market ===
      market;
  const historicalRevenueGrowth =
    finiteOrNull(
      context.revenueGrowth,
    );
  const historicalNetIncomeGrowth =
    finiteOrNull(
      context.netIncomeGrowth,
    );
  const historicalOperatingCashFlowGrowth =
    finiteOrNull(
      context.operatingCashFlowGrowth,
    );
  const historicalFreeCashFlowGrowth =
    finiteOrNull(
      context.freeCashFlowGrowth,
    );
  const historicalContextLoaded =
    contextResult.context !==
    null;
  const historicalContextUsable =
    context.historicalDataUsableForValuation;
  /*
   * targetContract belongs to the
   * adapter result, not the frozen
   * C149 MarketValuationRequest.
   */
  const c149RequestGenerated =
    adapterResult !== null &&
    adapterResult.targetContract ===
      "C149" &&
    adaptedRequest !== null;
  const historicalRevenueGrowthObserved =
    historicalRevenueGrowth !==
    null;
  const historicalNetIncomeGrowthObserved =
    historicalNetIncomeGrowth !==
    null;
  const historicalOperatingCashFlowGrowthObserved =
    historicalOperatingCashFlowGrowth !==
    null;
  const historicalFreeCashFlowGrowthObserved =
    historicalFreeCashFlowGrowth !==
    null;
  /*
   * C163.5 semantic boundary:
   *
   * Historical revenue growth must remain
   * historical context. It must not be
   * automatically copied into C149's
   * Low / Base / High scenario assumptions.
   */
  const historicalGrowthNotInjectedAsScenario =
    historicalRevenueGrowth ===
      null ||
    (
      adaptedRequest.assumptions
        ?.revenueGrowthLow ===
        null &&
      adaptedRequest.assumptions
        ?.revenueGrowthBase ===
        null &&
      adaptedRequest.assumptions
        ?.revenueGrowthHigh ===
        null
    );
  /*
   * The regression itself does not provide
   * explicit forward scenario assumptions.
   *
   * Therefore the C149 scenario fields must
   * remain empty rather than inheriting the
   * historical Revenue Growth value.
   */
  const explicitScenarioAssumptionsPreserved =
    adaptedRequest.assumptions
      ?.revenueGrowthLow ===
      null &&
    adaptedRequest.assumptions
      ?.revenueGrowthBase ===
      null &&
    adaptedRequest.assumptions
      ?.revenueGrowthHigh ===
      null;
  const noForecastGenerated =
    adapterResult.methodology
      .historicalGrowthUsedAsForecast ===
    false;
  const noTargetPriceGenerated =
    adapterResult.methodology
      .historicalGrowthUsedAsTargetPrice ===
    false;
  const noRecommendationGenerated =
    adapterResult.methodology
      .recommendationGenerated ===
    false;
  const plannerNotDispatched =
    adapterResult.methodology
      .plannerDispatched ===
    false;
  const tradingNotExecuted =
    adapterResult.methodology
      .tradingExecuted ===
    false;
  const coreChecksPassed =
    historicalContextLoaded &&
    c149RequestGenerated &&
    c149SymbolPreserved &&
    c149MarketPreserved &&
    historicalGrowthNotInjectedAsScenario &&
    explicitScenarioAssumptionsPreserved &&
    noForecastGenerated &&
    noTargetPriceGenerated &&
    noRecommendationGenerated &&
    plannerNotDispatched &&
    tradingNotExecuted;
  const allHistoricalSignalsAvailable =
    historicalRevenueGrowthObserved &&
    historicalNetIncomeGrowthObserved &&
    historicalOperatingCashFlowGrowthObserved &&
    historicalFreeCashFlowGrowthObserved;
  const success =
    coreChecksPassed &&
    historicalContextUsable;
  const code =
    success
      ? "C163_4_ADAPTER_REGRESSION_PASS"
      : coreChecksPassed
        ? "C163_4_ADAPTER_REGRESSION_PARTIAL"
        : "C163_4_ADAPTER_REGRESSION_FAIL";
  const limitations = [
    "This regression validates the C163.4 historical valuation adapter boundary with the C163.5 historical-context semantic refinement.",
    "The generated request conforms to the frozen C149 MarketValuationRequest contract.",
    "C149 valuation-types.ts is not modified by this regression.",
    "C149 valuation-engine.ts is not executed by this regression.",
    "Historical growth remains descriptive historical context.",
    "Historical growth is not automatically injected into C149 Low/Base/High scenario assumptions.",
    "Forward valuation scenario assumptions remain explicit modeling inputs.",
    "No target price is generated by the adapter regression.",
    "No investment recommendation or buy/sell instruction is generated.",
    "Planner dispatch is explicitly disabled.",
    "Trading execution is explicitly disabled.",
    "Historical signal availability depends on the upstream C162.2 structured fundamental data provider.",
    "Human verification remains required.",
  ];
  if (
    !allHistoricalSignalsAvailable
  ) {
    limitations.push(
      "One or more historical growth signals are unavailable; this does not invalidate the adapter boundary itself.",
    );
  }
  return {
    success,
    code,
    contract: {
      source: "C163.4",
      target: "C149",
      historicalSeries: "C162.2",
    },
    input: {
      symbol,
      market,
      periods,
    },
    checks: {
      historicalContextLoaded,
      historicalContextUsable,
      c149RequestGenerated,
      c149SymbolPreserved,
      c149MarketPreserved,
      historicalRevenueGrowthObserved,
      historicalNetIncomeGrowthObserved,
      historicalOperatingCashFlowGrowthObserved,
      historicalFreeCashFlowGrowthObserved,
      historicalGrowthNotInjectedAsScenario,
      explicitScenarioAssumptionsPreserved,
      noForecastGenerated,
      noTargetPriceGenerated,
      noRecommendationGenerated,
      plannerNotDispatched,
      tradingNotExecuted,
    },
    adaptedRequest: {
      industry:
        adaptedRequest.industry,
      symbol:
        candidate?.symbol ??
        symbol,
      market:
        candidate?.market ??
        null,
      assumptions: {
        revenueGrowthLow:
          finiteOrNull(
            adaptedRequest
              .assumptions
              ?.revenueGrowthLow,
          ),
        revenueGrowthBase:
          finiteOrNull(
            adaptedRequest
              .assumptions
              ?.revenueGrowthBase,
          ),
        revenueGrowthHigh:
          finiteOrNull(
            adaptedRequest
              .assumptions
              ?.revenueGrowthHigh,
          ),
      },
    },
    historicalInputs: {
      revenueGrowth:
        historicalRevenueGrowth,
      netIncomeGrowth:
        historicalNetIncomeGrowth,
      operatingCashFlowGrowth:
        historicalOperatingCashFlowGrowth,
      freeCashFlowGrowth:
        historicalFreeCashFlowGrowth,
      sourceQuality:
        context.historicalDataQuality,
    },
    limitations,
    humanVerificationRequired:
      true,
    generatedAt:
      new Date().toISOString(),
    latencyMs:
      Date.now() -
      startedAt,
  };
}
