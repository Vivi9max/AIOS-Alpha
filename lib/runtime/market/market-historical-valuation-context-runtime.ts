import {
  runMarketHistoricalFundamentalSeries,
} from "./market-historical-fundamental-series-runtime";
import type {
  HistoricalFundamentalMetricName,
  HistoricalFundamentalObservation,
  MarketHistoricalFundamentalSeries,
} from "./market-historical-fundamental-series-types";
import type {
  HistoricalGrowthSignal,
  HistoricalValuationObservation,
  MarketHistoricalValuationContext,
  MarketHistoricalValuationContextRequest,
  MarketHistoricalValuationContextResult,
} from "./market-historical-valuation-context-types";
function finiteOrNull(
  value: number | null,
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return null;
  }
  return value;
}
function calculateGrowth(
  current: number | null,
  previous: number | null,
): number | null {
  if (
    current === null ||
    previous === null ||
    !Number.isFinite(current) ||
    !Number.isFinite(previous) ||
    previous === 0
  ) {
    return null;
  }
  return (
    (current - previous) /
    Math.abs(previous)
  );
}
function sortNewestFirst(
  observations: HistoricalFundamentalObservation[],
): HistoricalFundamentalObservation[] {
  return [...observations].sort(
    (a, b) =>
      new Date(b.periodEnd).getTime() -
      new Date(a.periodEnd).getTime(),
  );
}
function latestObservationForMetric(
  observations: HistoricalFundamentalObservation[],
  metric: HistoricalFundamentalMetricName,
): HistoricalFundamentalObservation | null {
  return (
    sortNewestFirst(
      observations.filter(
        (observation) =>
          observation.metric === metric &&
          typeof observation.value === "number" &&
          Number.isFinite(observation.value),
      ),
    )[0] ?? null
  );
}
function previousObservationForMetric(
  observations: HistoricalFundamentalObservation[],
  metric: HistoricalFundamentalMetricName,
): HistoricalFundamentalObservation | null {
  return (
    sortNewestFirst(
      observations.filter(
        (observation) =>
          observation.metric === metric &&
          typeof observation.value === "number" &&
          Number.isFinite(observation.value),
      ),
    )[1] ?? null
  );
}
function buildGrowthSignal(
  observations: HistoricalFundamentalObservation[],
  metric:
    | "revenue"
    | "netIncome"
    | "operatingCashFlow"
    | "freeCashFlow",
): HistoricalGrowthSignal {
  const current =
    latestObservationForMetric(
      observations,
      metric,
    );
  const previous =
    previousObservationForMetric(
      observations,
      metric,
    );
  const growthRate =
    calculateGrowth(
      current?.value ?? null,
      previous?.value ?? null,
    );
  if (
    growthRate === null
  ) {
    return {
      metric,
      currentValue:
        current?.value ?? null,
      previousValue:
        previous?.value ?? null,
      growthRate:
        null,
      period:
        current?.period ??
        null,
      currentPeriodEnd:
        current?.periodEnd ??
        null,
      previousPeriodEnd:
        previous?.periodEnd ??
        null,
      status:
        "insufficient",
      interpretation:
        "Historical growth cannot be calculated reliably from two comparable structured observations.",
    };
  }
  return {
    metric,
    currentValue:
      current?.value ?? null,
    previousValue:
      previous?.value ?? null,
    growthRate,
    period:
      current?.period ??
      null,
    currentPeriodEnd:
      current?.periodEnd ??
      null,
    previousPeriodEnd:
      previous?.periodEnd ??
      null,
    status:
      "calculated",
    interpretation:
      "Historical period-over-period growth derived from structured observations. This is descriptive historical context, not a forecast.",
  };
}
function buildLatestObservations(
  observations: HistoricalFundamentalObservation[],
): HistoricalValuationObservation[] {
  const metrics:
    HistoricalFundamentalMetricName[] = [
      "revenue",
      "netIncome",
      "totalAssets",
      "totalLiabilities",
      "stockholdersEquity",
      "operatingCashFlow",
      "capitalExpenditures",
      "freeCashFlow",
    ];
  return metrics
    .map(
      (metric) =>
        latestObservationForMetric(
          observations,
          metric,
        ),
    )
    .filter(
      (
        observation,
      ): observation is HistoricalFundamentalObservation =>
        observation !== null,
    )
    .map(
      (
        observation,
      ): HistoricalValuationObservation => ({
        metric:
          observation.metric,
        value:
          observation.value,
        period:
          observation.period,
        periodEnd:
          observation.periodEnd,
        currency:
          observation.currency,
        quality:
          observation.quality,
        source:
          observation.source,
      }),
    );
}
function determineQuality(
  series: MarketHistoricalFundamentalSeries,
):
  | "structured-verified"
  | "partial"
  | "insufficient" {
  if (
    series.observationCount === 0
  ) {
    return "insufficient";
  }
  if (
    series.structured &&
    series.observationCount >= 8
  ) {
    return "structured-verified";
  }
  return "partial";
}
function buildContext(
  series: MarketHistoricalFundamentalSeries,
): MarketHistoricalValuationContext {
  const observations =
    series.observations;
  const revenue =
    buildGrowthSignal(
      observations,
      "revenue",
    );
  const netIncome =
    buildGrowthSignal(
      observations,
      "netIncome",
    );
  const operatingCashFlow =
    buildGrowthSignal(
      observations,
      "operatingCashFlow",
    );
  const freeCashFlow =
    buildGrowthSignal(
      observations,
      "freeCashFlow",
    );
  const historicalDataQuality =
    determineQuality(
      series,
    );
  const historicalDataUsableForValuation =
    historicalDataQuality !==
      "insufficient" &&
    series.observationCount >= 2;
  const limitations = [
    ...series.limitations,
    "C163.4 derives descriptive historical growth signals only; it does not create forecasts.",
    "Historical growth is not converted into a predicted return or target price.",
    "C163.4 does not modify the verified C149 valuation contract.",
    "Negative historical growth is preserved as valid historical information.",
    "Human verification remains required before historical data is used in any valuation review.",
  ];
  return {
    contractVersion:
      "C163.4",
    symbol:
      series.symbol,
    market:
      series.market,
    provider:
      series.provider,
    historicalSeriesContract:
      "C162.2",
    observationCount:
      series.observationCount,
    annualObservationCount:
      series.annualObservationCount,
    quarterlyObservationCount:
      series.quarterlyObservationCount,
    latestPeriodEnd:
      series.latestPeriodEnd,
    earliestPeriodEnd:
      series.earliestPeriodEnd,
    latestObservations:
      buildLatestObservations(
        observations,
      ),
    growthSignals: [
      revenue,
      netIncome,
      operatingCashFlow,
      freeCashFlow,
    ],
    revenueGrowth:
      finiteOrNull(
        revenue.growthRate,
      ),
    netIncomeGrowth:
      finiteOrNull(
        netIncome.growthRate,
      ),
    operatingCashFlowGrowth:
      finiteOrNull(
        operatingCashFlow.growthRate,
      ),
    freeCashFlowGrowth:
      finiteOrNull(
        freeCashFlow.growthRate,
      ),
    historicalDataQuality,
    historicalDataUsableForValuation,
    limitations,
    humanVerificationRequired:
      true,
  };
}
export async function runMarketHistoricalValuationContext(
  request: MarketHistoricalValuationContextRequest,
): Promise<MarketHistoricalValuationContextResult> {
  const startedAt =
    Date.now();
  const symbol =
    request.symbol
      .trim()
      .toUpperCase();
  if (!symbol) {
    throw new Error(
      "symbol is required.",
    );
  }
  const seriesResult =
    await runMarketHistoricalFundamentalSeries({
      symbol,
      market:
        request.market ??
        null,
      periods:
        request.periods ??
        5,
    });
  const series =
    seriesResult.series;
  const context =
    buildContext(
      series,
    );
  const code =
    context.historicalDataQuality ===
      "structured-verified"
      ? "C163_4_HISTORICAL_VALUATION_CONTEXT_PASS"
      : context.historicalDataQuality ===
          "partial"
        ? "C163_4_HISTORICAL_VALUATION_CONTEXT_PARTIAL"
        : "C163_4_HISTORICAL_VALUATION_CONTEXT_INSUFFICIENT";
  return {
    success:
      context.historicalDataUsableForValuation,
    code,
    context,
    sourceSeries:
      series,
    boundary: {
      valuationGenerated:
        false,
      forecastGenerated:
        false,
      recommendationGenerated:
        false,
      plannerDispatched:
        false,
      tradingExecuted:
        false,
    },
    generatedAt:
      new Date().toISOString(),
    latencyMs:
      Date.now() -
      startedAt,
    disclaimer:
      "C163.4 converts C162.2 historical fundamental observations into a valuation-context adapter. It provides descriptive historical context only and does not generate forecasts, recommendations, target prices or trading instructions.",
  };
}
