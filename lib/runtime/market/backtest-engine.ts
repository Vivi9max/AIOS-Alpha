import {
  analyzeMarketRequest,
} from "./market-router";

import type {
  MarketAnalysisResult,
  MarketBar,
} from "./market-types";

import type {
  BacktestEquityPoint,
  BacktestMetrics,
  BacktestStrategy,
  BacktestTrade,
  MarketBacktestCandidateInput,
  MarketBacktestCandidateResult,
  MarketBacktestRequest,
  MarketBacktestResult,
} from "./backtest-types";

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.max(
    min,
    Math.min(max, value),
  );
}

function round(
  value: number,
  digits = 2,
): number {
  const factor =
    10 ** digits;

  return (
    Math.round(
      value * factor,
    ) / factor
  );
}

function positiveNumber(
  value: unknown,
  fallback: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return fallback;
  }

  return value;
}

function normalizeInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const number =
    typeof value === "number" &&
    Number.isFinite(value)
      ? Math.floor(value)
      : fallback;

  return clamp(
    number,
    min,
    max,
  );
}

function normalizeBps(
  value: unknown,
  fallback: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return fallback;
  }

  return clamp(
    value,
    0,
    500,
  );
}

function normalizeBars(
  bars: MarketBar[],
): MarketBar[] {
  return bars
    .filter(
      (bar) =>
        typeof bar.timestamp ===
          "string" &&
        typeof bar.close ===
          "number" &&
        Number.isFinite(
          bar.close,
        ) &&
        bar.close > 0,
    )
    .map(
      (bar) => ({
        ...bar,
        open:
          typeof bar.open ===
            "number" &&
          Number.isFinite(
            bar.open,
          ) &&
          bar.open > 0
            ? bar.open
            : bar.close,
      }),
    )
    .sort(
      (a, b) =>
        new Date(
          a.timestamp,
        ).getTime() -
        new Date(
          b.timestamp,
        ).getTime(),
    );
}

function sma(
  values: number[],
  period: number,
  index: number,
): number | null {
  if (
    index + 1 <
    period
  ) {
    return null;
  }

  const start =
    index -
    period +
    1;

  const slice =
    values.slice(
      start,
      index + 1,
    );

  if (
    slice.length !==
    period
  ) {
    return null;
  }

  const sum =
    slice.reduce(
      (
        total,
        value,
      ) =>
        total + value,
      0,
    );

  return (
    sum / period
  );
}

function dailyReturns(
  equityCurve: BacktestEquityPoint[],
): number[] {
  const returns: number[] = [];

  for (
    let index = 1;
    index <
    equityCurve.length;
    index += 1
  ) {
    const previous =
      equityCurve[index - 1]
        .equity;

    const current =
      equityCurve[index]
        .equity;

    if (
      previous > 0 &&
      Number.isFinite(
        current,
      )
    ) {
      returns.push(
        current / previous -
          1,
      );
    }
  }

  return returns;
}

function calculateMetrics(
  initialCapital: number,
  equityCurve: BacktestEquityPoint[],
  trades: BacktestTrade[],
): BacktestMetrics {
  const finalEquity =
    equityCurve.length > 0
      ? equityCurve[
          equityCurve.length - 1
        ].equity
      : initialCapital;

  const netProfit =
    finalEquity -
    initialCapital;

  const totalReturn =
    initialCapital > 0
      ? netProfit /
        initialCapital
      : 0;

  let peak =
    initialCapital;

  let maxDrawdownAmount =
    0;

  let maxDrawdownPercent =
    0;

  let investedPoints = 0;

  for (
    const point of equityCurve
  ) {
    if (
      point.shares > 0
    ) {
      investedPoints += 1;
    }

    peak =
      Math.max(
        peak,
        point.equity,
      );

    const drawdownAmount =
      peak -
      point.equity;

    const drawdownPercent =
      peak > 0
        ? drawdownAmount /
          peak
        : 0;

    maxDrawdownAmount =
      Math.max(
        maxDrawdownAmount,
        drawdownAmount,
      );

    maxDrawdownPercent =
      Math.max(
        maxDrawdownPercent,
        drawdownPercent,
      );
  }

  let annualizedReturnPercent:
    | number
    | null =
    null;

  if (
    equityCurve.length >= 2
  ) {
    const startTime =
      new Date(
        equityCurve[0]
          .timestamp,
      ).getTime();

    const endTime =
      new Date(
        equityCurve[
          equityCurve.length - 1
        ].timestamp,
      ).getTime();

    const years =
      (endTime -
        startTime) /
      (365.25 *
        24 *
        60 *
        60 *
        1000);

    if (
      years > 0 &&
      finalEquity > 0
    ) {
      annualizedReturnPercent =
        round(
          (
            (
              finalEquity /
              initialCapital
            ) **
              (1 / years) -
            1
          ) *
            100,
          2,
        );
    }
  }

  const returns =
    dailyReturns(
      equityCurve,
    );

  let volatilityAnnualizedPercent:
    | number
    | null =
    null;

  let sharpeRatio:
    | number
    | null =
    null;

  if (
    returns.length >= 2
  ) {
    const mean =
      returns.reduce(
        (
          total,
          value,
        ) =>
          total + value,
        0,
      ) /
      returns.length;

    const variance =
      returns.reduce(
        (
          total,
          value,
        ) =>
          total +
          (
            value -
            mean
          ) **
            2,
        0,
      ) /
      (
        returns.length -
        1
      );

    const standardDeviation =
      Math.sqrt(
        variance,
      );

    volatilityAnnualizedPercent =
      round(
        standardDeviation *
          Math.sqrt(
            252,
          ) *
          100,
        2,
      );

    if (
      standardDeviation >
      0
    ) {
      sharpeRatio =
        round(
          (
            mean /
            standardDeviation
          ) *
            Math.sqrt(
              252,
            ),
          3,
        );
    }
  }

  const completedTrades =
    trades.filter(
      (trade) =>
        trade.side ===
        "sell",
    );

  const wins =
    completedTrades.filter(
      (trade) =>
        trade.netCashFlow >
        0,
    );

  const losses =
    completedTrades.filter(
      (trade) =>
        trade.netCashFlow <
        0,
    );

  const grossProfit =
    wins.reduce(
      (
        total,
        trade,
      ) =>
        total +
        trade.netCashFlow,
      0,
    );

  const grossLoss =
    Math.abs(
      losses.reduce(
        (
          total,
          trade,
        ) =>
          total +
          trade.netCashFlow,
        0,
      ),
    );

  const profitFactor =
    grossLoss > 0
      ? round(
          grossProfit /
            grossLoss,
          3,
        )
      : null;

  const winRate =
    completedTrades.length >
    0
      ? (
          wins.length /
          completedTrades.length
        ) *
        100
      : null;

  const averageTradeReturn =
    completedTrades.length >
    0
      ? (
          completedTrades.reduce(
            (
              total,
              trade,
            ) =>
              total +
              trade.netCashFlow,
            0,
          ) /
          completedTrades.length /
          initialCapital
        ) *
        100
      : null;

  const exposurePercent =
    equityCurve.length > 0
      ? (
          investedPoints /
          equityCurve.length
        ) *
        100
      : 0;

  return {
    initialCapital:
      round(
        initialCapital,
      ),

    finalEquity:
      round(
        finalEquity,
      ),

    netProfit:
      round(
        netProfit,
      ),

    totalReturnPercent:
      round(
        totalReturn * 100,
      ),

    annualizedReturnPercent,

    maxDrawdownPercent:
      round(
        maxDrawdownPercent *
          100,
      ),

    maxDrawdownAmount:
      round(
        maxDrawdownAmount,
      ),

    volatilityAnnualizedPercent,

    sharpeRatio,

    totalTrades:
      completedTrades.length,

    winningTrades:
      wins.length,

    losingTrades:
      losses.length,

    winRatePercent:
      winRate === null
        ? null
        : round(
            winRate,
          ),

    grossProfit:
      round(
        grossProfit,
      ),

    grossLoss:
      round(
        grossLoss,
      ),

    profitFactor,

    exposurePercent:
      round(
        exposurePercent,
      ),

    averageTradeReturnPercent:
      averageTradeReturn ===
      null
        ? null
        : round(
            averageTradeReturn,
          ),
  };
}

function runSmaCrossover(
  bars: MarketBar[],
  initialCapital: number,
  fastPeriod: number,
  slowPeriod: number,
  feeBps: number,
  slippageBps: number,
): {
  metrics: BacktestMetrics;
  trades: BacktestTrade[];
  equityCurve: BacktestEquityPoint[];
} {
  const closes =
    bars.map(
      (bar) =>
        bar.close as number,
    );

  let cash =
    initialCapital;

  let shares = 0;

  let entryCost = 0;

  let tradeId = 1;

  const trades:
    BacktestTrade[] =
    [];

  const equityCurve:
    BacktestEquityPoint[] =
    [];

  const friction =
    (
      feeBps +
      slippageBps
    ) /
    10000;

  for (
    let index = 0;
    index <
    bars.length;
    index += 1
  ) {
    const bar =
      bars[index];

    const price =
      bar.close as number;

    const previousIndex =
      index - 1;

    const previousFast =
      previousIndex >=
      0
        ? sma(
            closes,
            fastPeriod,
            previousIndex,
          )
        : null;

    const previousSlow =
      previousIndex >=
      0
        ? sma(
            closes,
            slowPeriod,
            previousIndex,
          )
        : null;

    const currentFast =
      sma(
        closes,
        fastPeriod,
        index,
      );

    const currentSlow =
      sma(
        closes,
        slowPeriod,
        index,
      );

    const bullishCross =
      previousFast !== null &&
      previousSlow !== null &&
      currentFast !== null &&
      currentSlow !== null &&
      previousFast <=
        previousSlow &&
      currentFast >
        currentSlow;

    const bearishCross =
      previousFast !== null &&
      previousSlow !== null &&
      currentFast !== null &&
      currentSlow !== null &&
      previousFast >=
        previousSlow &&
      currentFast <
        currentSlow;

    /*
     * Signal is calculated from the completed bar.
     * Execution occurs on the NEXT bar open.
     * This prevents look-ahead bias.
     */
    const nextBar =
      index + 1 <
      bars.length
        ? bars[index + 1]
        : null;

    if (
      nextBar !== null
    ) {
      const executionPrice =
        typeof nextBar.open ===
          "number" &&
        Number.isFinite(
          nextBar.open,
        ) &&
        nextBar.open > 0
          ? nextBar.open
          : nextBar.close as number;

      if (
        bullishCross &&
        shares === 0
      ) {
        const buyPrice =
          executionPrice *
          (
            1 +
            friction
          );

        const availableCash =
          cash;

        const quantity =
          Math.floor(
            availableCash /
              buyPrice,
          );

        if (
          quantity > 0
        ) {
          const grossValue =
            quantity *
            executionPrice;

          const fee =
            grossValue *
            feeBps /
            10000;

          const slippage =
            grossValue *
            slippageBps /
            10000;

          const totalCost =
            grossValue +
            fee +
            slippage;

          if (
            totalCost <=
            cash
          ) {
            cash -=
              totalCost;

            shares =
              quantity;

            entryCost =
              totalCost;

            trades.push({
              id:
                tradeId++,

              side:
                "buy",

              timestamp:
                nextBar.timestamp,

              price:
                round(
                  executionPrice,
                ),

              shares:
                quantity,

              grossValue:
                round(
                  grossValue,
                ),

              fee:
                round(
                  fee,
                ),

              slippage:
                round(
                  slippage,
                ),

              netCashFlow:
                round(
                  -totalCost,
                ),

              reason:
                "entry",
            });
          }
        }
      }

      if (
        bearishCross &&
        shares > 0
      ) {
        const sellPrice =
          executionPrice *
          (
            1 -
            friction
          );

        const grossValue =
          shares *
          executionPrice;

        const fee =
          grossValue *
          feeBps /
          10000;

        const slippage =
          grossValue *
          slippageBps /
          10000;

        const netProceeds =
          grossValue -
          fee -
          slippage;

        const tradeProfit =
          netProceeds -
          entryCost;

        cash +=
          netProceeds;

        trades.push({
          id:
            tradeId++,

          side:
            "sell",

          timestamp:
            nextBar.timestamp,

          price:
            round(
              executionPrice,
            ),

          shares,

          grossValue:
            round(
              grossValue,
            ),

          fee:
            round(
              fee,
            ),

          slippage:
            round(
              slippage,
            ),

          netCashFlow:
            round(
              tradeProfit,
            ),

          reason:
            "exit",
        });

        shares = 0;
        entryCost = 0;
      }
    }

    const equity =
      cash +
      shares * price;

    equityCurve.push({
      timestamp:
        bar.timestamp,

      price:
        round(
          price,
        ),

      cash:
        round(
          cash,
        ),

      shares,

      equity:
        round(
          equity,
        ),
    });
  }

  if (
    shares > 0 &&
    bars.length > 0
  ) {
    const finalBar =
      bars[
        bars.length - 1
      ];

    const finalPrice =
      finalBar.close as number;

    const grossValue =
      shares *
      finalPrice;

    const fee =
      grossValue *
      feeBps /
      10000;

    const slippage =
      grossValue *
      slippageBps /
      10000;

    const netProceeds =
      grossValue -
      fee -
      slippage;

    const tradeProfit =
      netProceeds -
      entryCost;

    cash +=
      netProceeds;

    trades.push({
      id:
        tradeId++,

      side:
        "sell",

      timestamp:
        finalBar.timestamp,

      price:
        round(
          finalPrice,
        ),

      shares,

      grossValue:
        round(
          grossValue,
        ),

      fee:
        round(
          fee,
        ),

      slippage:
        round(
          slippage,
        ),

      netCashFlow:
        round(
          tradeProfit,
        ),

      reason:
        "final_close",
    });

    shares = 0;

    equityCurve.push({
      timestamp:
        finalBar.timestamp,

      price:
        round(
          finalPrice,
        ),

      cash:
        round(
          cash,
        ),

      shares: 0,

      equity:
        round(
          cash,
        ),
    });
  }

  return {
    metrics:
      calculateMetrics(
        initialCapital,
        equityCurve,
        trades,
      ),

    trades,

    equityCurve,
  };
}

function buildProviderHealth(
  result: MarketAnalysisResult,
): string | null {
  const provider =
    result.provider as {
      marketCapabilities?: Record<
        string,
        {
          providerHealth?: string;
        }
      >;
    };

  return (
    provider
      .marketCapabilities?.[
      result.instrument.market
    ]?.providerHealth ??
    null
  );
}

function insufficientCandidate(
  input: MarketBacktestCandidateInput,
  result: MarketAnalysisResult,
  strategy: BacktestStrategy,
  error?: string,
): MarketBacktestCandidateResult {
  return {
    rank: 0,

    input,

    normalizedSymbol:
      result.instrument
        .normalizedSymbol,

    currency:
      result.instrument
        .currency,

    strategy,

    data: {
      barCount:
        result.snapshot.bars
          ?.length ?? 0,

      start:
        result.snapshot.bars?.[
          0
        ]?.timestamp ??
        null,

      end:
        result.snapshot.bars?.[
          result.snapshot.bars
            .length - 1
        ]?.timestamp ??
        null,

      historicalVerified:
        result.verification
          .structuredDataVerified &&
        (
          result.snapshot.bars
            ?.length ?? 0
        ) > 0,

      historicalQuality:
        result.snapshot
          .historicalQuality ??
        "unknown",

      provider:
        result.provider
          .provider,

      providerHealth:
        buildProviderHealth(
          result,
        ),
    },

    metrics:
      calculateMetrics(
        positiveNumber(
          100000,
          100000,
        ),
        [],
        [],
      ),

    trades: [],

    equityCurve: [],

    status:
      "historical-data-insufficient",

    warnings: [
      "Historical OHLCV bars are required for a valid backtest.",
      "Web Intelligence evidence is not a substitute for historical OHLCV data.",
      "No simulated order was generated.",
    ],

    sourceCode:
      "C150_HISTORICAL_DATA_REQUIRED",

    ...(error
      ? {
          error,
        }
      : {}),
  };
}

async function evaluateCandidate(
  input: MarketBacktestCandidateInput,
  request: MarketBacktestRequest,
  strategy: BacktestStrategy,
  initialCapital: number,
  fastPeriod: number,
  slowPeriod: number,
  feeBps: number,
  slippageBps: number,
): Promise<MarketBacktestCandidateResult> {
  let sourceResult:
    | MarketAnalysisResult
    | null =
    null;

  try {
    if (
      Array.isArray(
        request.bars,
      ) &&
      request.bars.length > 0
    ) {
      sourceResult =
        await analyzeMarketRequest({
          symbol:
            input.symbol,

          market:
            input.market,

          mode:
            "technical",

          query:
            request.query ??
            "historical OHLCV technical backtest",
        });
    } else {
      sourceResult =
        await analyzeMarketRequest({
          symbol:
            input.symbol,

          market:
            input.market,

          mode:
            "technical",

          query: [
            request.query ??
              "",
            "historical OHLCV daily price volume",
          ]
            .filter(Boolean)
            .join(" "),
        });
    }

    const bars =
      normalizeBars(
        Array.isArray(
          request.bars,
        ) &&
          request.bars.length >
            0
          ? request.bars
          : sourceResult.snapshot
              .bars ?? [],
      );

    if (
      bars.length <
      slowPeriod + 2
    ) {
      return insufficientCandidate(
        input,
        sourceResult,
        strategy,
        `Insufficient historical bars: ${bars.length}. At least ${slowPeriod + 2} valid bars are required.`,
      );
    }

    const result =
      runSmaCrossover(
        bars,
        initialCapital,
        fastPeriod,
        slowPeriod,
        feeBps,
        slippageBps,
      );

    const warnings: string[] =
      [
        "Backtest results describe historical simulation only.",
        "Historical performance does not guarantee future results.",
        "Execution assumes next-bar-open fills after completed-bar signals.",
        "Fees and slippage are modeled assumptions, not actual brokerage costs.",
      ];

    if (
      !sourceResult
        .verification
        .structuredDataVerified
    ) {
      warnings.push(
        "Historical structured data is not independently verified by the current provider.",
      );
    }

    if (
      sourceResult.snapshot
        .historicalQuality !==
      "historical"
    ) {
      warnings.push(
        "Historical data quality is not explicitly verified as historical-provider data.",
      );
    }

    return {
      rank: 0,

      input,

      normalizedSymbol:
        sourceResult
          .instrument
          .normalizedSymbol,

      currency:
        sourceResult
          .instrument
          .currency,

      strategy,

      data: {
        barCount:
          bars.length,

        start:
          bars[0]
            ?.timestamp ??
          null,

        end:
          bars[
            bars.length - 1
          ]?.timestamp ??
          null,

        historicalVerified:
          sourceResult
            .verification
            .structuredDataVerified,

        historicalQuality:
          sourceResult.snapshot
            .historicalQuality ??
          "unknown",

        provider:
          sourceResult
            .provider
            .provider,

        providerHealth:
          buildProviderHealth(
            sourceResult,
          ),
      },

      metrics:
        result.metrics,

      trades:
        result.trades,

      equityCurve:
        result.equityCurve,

      status:
        "backtest-complete",

      warnings,

      sourceCode:
        "C150_SMA_CROSSOVER_BACKTEST",
    };
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "Backtest candidate evaluation failed.";

    if (
      sourceResult !== null
    ) {
      return insufficientCandidate(
        input,
        sourceResult,
        strategy,
        message,
      );
    }

    return {
      rank: 0,

      input,

      normalizedSymbol:
        input.symbol,

      currency:
        input.market ===
        "hk"
          ? "HKD"
          : input.market ===
              "cn"
            ? "CNY"
            : "USD",

      strategy,

      data: {
        barCount: 0,
        start: null,
        end: null,
        historicalVerified:
          false,
        historicalQuality:
          "unknown",
        provider:
          "unavailable",
        providerHealth:
          null,
      },

      metrics:
        calculateMetrics(
          initialCapital,
          [],
          [],
        ),

      trades: [],

      equityCurve: [],

      status:
        "backtest-error",

      warnings: [
        "Backtest could not obtain a valid market data source.",
      ],

      sourceCode:
        "C150_BACKTEST_ERROR",

      error:
        message,
    };
  }
}

export async function backtestMarketCandidates(
  request: MarketBacktestRequest,
): Promise<MarketBacktestResult> {
  const strategy:
    BacktestStrategy =
    request.strategy ===
    "sma_crossover"
      ? request.strategy
      : "sma_crossover";

  const initialCapital =
    positiveNumber(
      request.initialCapital,
      100000,
    );

  const slowPeriod =
    normalizeInteger(
      request.slowPeriod,
      20,
      2,
      250,
    );

  const fastPeriod =
    Math.min(
      normalizeInteger(
        request.fastPeriod,
        5,
        1,
        100,
      ),
      slowPeriod - 1,
    );

  const feeBps =
    normalizeBps(
      request.feeBps,
      5,
    );

  const slippageBps =
    normalizeBps(
      request.slippageBps,
      5,
    );

  const uniqueCandidates =
    Array.from(
      new Map(
        request.candidates.map(
          (
            candidate,
          ) => [
            `${
              candidate.market ??
              "auto"
            }:${
              candidate.symbol
                .trim()
                .toUpperCase()
            }`,
            {
              ...candidate,
              symbol:
                candidate.symbol
                  .trim()
                  .toUpperCase(),
            },
          ],
        ),
      ).values(),
    ).slice(
      0,
      12,
    );

  if (
    uniqueCandidates.length ===
    0
  ) {
    throw new Error(
      "At least one candidate is required.",
    );
  }

  const evaluated:
    MarketBacktestCandidateResult[] =
    [];

  for (
    const candidate of
      uniqueCandidates
  ) {
    evaluated.push(
      await evaluateCandidate(
        candidate,
        request,
        strategy,
        initialCapital,
        fastPeriod,
        slowPeriod,
        feeBps,
        slippageBps,
      ),
    );
  }

  evaluated.sort(
    (
      a,
      b,
    ) => {
      if (
        a.status ===
        "backtest-complete" &&
        b.status !==
          "backtest-complete"
      ) {
        return -1;
      }

      if (
        b.status ===
        "backtest-complete" &&
        a.status !==
          "backtest-complete"
      ) {
        return 1;
      }

      return (
        b.metrics.totalReturnPercent -
        a.metrics.totalReturnPercent
      );
    },
  );

  evaluated.forEach(
    (
      candidate,
      index,
    ) => {
      candidate.rank =
        index + 1;
    },
  );

  const completed =
    evaluated.filter(
      (
        candidate,
      ) =>
        candidate.status ===
        "backtest-complete",
    ).length;

  let code:
    | "C150_BACKTEST_PASS"
    | "C150_BACKTEST_PARTIAL"
    | "C150_BACKTEST_INSUFFICIENT";

  if (
    completed ===
      evaluated.length &&
    completed > 0
  ) {
    code =
      "C150_BACKTEST_PASS";
  } else if (
    completed > 0
  ) {
    code =
      "C150_BACKTEST_PARTIAL";
  } else {
    code =
      "C150_BACKTEST_INSUFFICIENT";
  }

  return {
    success:
      evaluated.length > 0,

    code,

    stage:
      "C150",

    requestedCandidates:
      request.candidates.length,

    evaluatedCandidates:
      evaluated.length,

    candidates:
      evaluated,

    methodology: {
      purpose:
        "Historical research-stage strategy simulation with explicit execution, fee, slippage and drawdown assumptions.",

      strategy: [
        "SMA crossover strategy: fast-period SMA crossing above slow-period SMA creates a long entry signal.",
        "Fast-period SMA crossing below slow-period SMA creates an exit signal.",
        "Only long positions are simulated.",
        "Signals are calculated from completed historical bars.",
      ],

      executionModel: [
        "Signals generated from completed bar N are executed at bar N+1 open.",
        "If the next bar has no valid open, its close is used as the execution price.",
        "Final open position is closed at the final historical close.",
        "Transaction fee and slippage are applied to simulated executions.",
        "No order is sent to a broker or exchange.",
      ],

      assumptions: {
        initialCapital:
          round(
            initialCapital,
          ),

        fastPeriod,

        slowPeriod,

        feeBps:
          round(
            feeBps,
          ),

        slippageBps:
          round(
            slippageBps,
          ),
      },

      excludedFromDecision: [
        "Future return prediction.",
        "Guaranteed profitability.",
        "Personalized investment advice.",
        "Automatic buy/sell instruction.",
        "Portfolio allocation.",
        "Broker order submission.",
        "Live trading.",
      ],

      nextStage:
        "C151",
    },

    safetyBoundary: {
      founderOnly:
        true,

      historicalOnly:
        true,

      plannerDispatched:
        false,

      tradingExecuted:
        false,

      liveOrderPlaced:
        false,

      personalizedAdvice:
        false,

      returnPrediction:
        false,

      humanReviewRequiredBeforeTrading:
        true,
    },

    generatedAt:
      new Date().toISOString(),
  };
}
