import {
  runMarketHistoricalFundamentalSeries,
} from "./market-historical-fundamental-series-runtime";

export async function runMarketHistoricalFundamentalSeriesRegression() {
  const result =
    await runMarketHistoricalFundamentalSeries({
      symbol:
        "AAPL",

      market:
        "us",

      periods:
        5,
    });

  const checks = [
    result.series.contractVersion ===
      "C162.2",

    result.series.symbol ===
      "AAPL",

    result.series.market ===
      "us",

    Array.isArray(
      result.series.observations,
    ),

    result.series.metricNames.includes(
      "revenue",
    ),

    result.series.metricNames.includes(
      "netIncome",
    ),

    result.series.threeStatementReconciled ===
      false,

    result.boundary.tradingExecuted ===
      false,
  ];

  const passed =
    checks.filter(
      Boolean,
    ).length;

  return {
    success:
      passed ===
      checks.length,

    code:
      passed ===
      checks.length
        ? "C162_2_HISTORICAL_FUNDAMENTAL_SERIES_REGRESSION_PASS"
        : "C162_2_HISTORICAL_FUNDAMENTAL_SERIES_REGRESSION_FAIL",

    passed,

    total:
      checks.length,

    checks,

    result,
  };
}
