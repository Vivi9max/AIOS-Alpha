import {
  runMarketFundamentalDataContract,
} from "./market-fundamental-data-contract-runtime";

export async function runMarketFundamentalDataContractRegression() {
  const result =
    await runMarketFundamentalDataContract({
      symbol:
        "AAPL",
      market:
        "us",
    });

  const checks = [
    result.contract.contractVersion ===
      "C162.1",

    result.contract.symbol ===
      "AAPL",

    result.contract.market ===
      "us",

    Array.isArray(
      result.contract.metrics,
    ),

    result.contract.metrics.length ===
      6,

    result.contract.historicalFinancialStatementsAvailable ===
      false,

    result.boundary.financialForecastGenerated ===
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
        ? "C162_1_FUNDAMENTAL_DATA_CONTRACT_REGRESSION_PASS"
        : "C162_1_FUNDAMENTAL_DATA_CONTRACT_REGRESSION_FAIL",

    passed,

    total:
      checks.length,

    checks,

    result,
  };
}
