import {
  runMarketPaperTradePerformanceReview,
} from "./market-paper-trade-performance-runtime";

import type {
  PaperTradingResult,
} from "./paper-trading-types";

function buildFixture(): PaperTradingResult {
  return {
    success: true,

    code:
      "C151_PAPER_TRADING_PASS",

    stage:
      "C151",

    requestedOrders:
      2,

    filledOrders:
      2,

    rejectedOrders:
      0,

    account: {
      currency:
        "USD",

      initialCapital:
        10000,

      cash:
        9700,

      positionsValue:
        330,

      equity:
        10030,

      positions: [],
    },

    metrics: {
      initialCapital:
        10000,

      finalCash:
        9700,

      finalEquity:
        10030,

      netProfit:
        30,

      totalReturnPercent:
        0.3,

      realizedPnl:
        20,

      unrealizedPnl:
        10,

      totalFees:
        4,

      totalSlippage:
        3,

      filledOrders:
        2,

      rejectedOrders:
        0,

      openPositions:
        0,
    },

    trades: [],

    equityCurve: [
      {
        timestamp:
          "2026-01-01T00:00:00.000Z",

        cash:
          10000,

        positionsValue:
          0,

        equity:
          10000,
      },

      {
        timestamp:
          "2026-01-02T00:00:00.000Z",

        cash:
          9800,

        positionsValue:
          250,

        equity:
          10050,
      },

      {
        timestamp:
          "2026-01-03T00:00:00.000Z",

        cash:
          9700,

        positionsValue:
          330,

        equity:
          10030,
      },
    ],

    candidates: [
      {
        rank:
          1,

        input: {
          symbol:
            "NVDA",
          market:
            "us",
        },

        normalizedSymbol:
          "NVDA.US",

        currency:
          "USD",

        position:
          null,

        trades: [],

        data: {
          priceSource:
            "explicit-order",

          priceVerified:
            true,

          dataQuality:
            "web-evidence",

          provider:
            "regression",

          asOf:
            "2026-01-03T00:00:00.000Z",
        },

        status:
          "paper-complete",

        warnings: [],
      },
    ],

    methodology: {
      purpose:
        "Simulation only.",

      executionModel: [
        "Regression fixture only.",
      ],

      pricingHierarchy: [
        "Explicit simulation price.",
      ],

      assumptions: {
        initialCapital:
          10000,

        feeBps:
          10,

        slippageBps:
          5,
      },

      excludedFromDecision: [
        "Future prediction.",
        "Investment recommendation.",
      ],

      nextStage:
        "C152",
    },

    safetyBoundary: {
      founderOnly:
        true,

      simulationOnly:
        true,

      brokerConnected:
        false,

      tradingExecuted:
        false,

      liveOrderPlaced:
        false,

      plannerDispatched:
        false,

      personalizedAdvice:
        false,

      humanReviewRequiredBeforeLiveTrading:
        true,
    },

    generatedAt:
      new Date().toISOString(),
  };
}

export async function runMarketPaperTradePerformanceRegression() {
  const result =
    await runMarketPaperTradePerformanceReview({
      symbol:
        "NVDA",

      market:
        "us",

      paperTrading:
        buildFixture(),
    });

  const checks = [
    {
      name:
        "result exists",
      passed:
        Boolean(result),
    },

    {
      name:
        "C159 pass code",
      passed:
        result.code ===
        "C159_MARKET_PAPER_TRADE_PERFORMANCE_PASS",
    },

    {
      name:
        "review-ready state",
      passed:
        result.state ===
        "review-ready",
    },

    {
      name:
        "net profit preserved",
      passed:
        result.metrics.netProfit ===
        30,
    },

    {
      name:
        "return preserved",
      passed:
        result.metrics.totalReturnPercent ===
        0.3,
    },

    {
      name:
        "filled order count preserved",
      passed:
        result.metrics.filledOrders ===
        2,
    },

    {
      name:
        "drawdown calculated",
      passed:
        result.metrics.maxDrawdown ===
        20,
    },

    {
      name:
        "drawdown percent calculated",
      passed:
        result.metrics.maxDrawdownPercent ===
        0.2,
    },

    {
      name:
        "web evidence identified",
      passed:
        result.dataQuality
          .webEvidencePriceCount ===
        1,
    },

    {
      name:
        "human review required",
      passed:
        result.boundary
          .humanDecisionRequired ===
        true,
    },

    {
      name:
        "planner not dispatched",
      passed:
        result.boundary
          .plannerDispatched ===
        false,
    },

    {
      name:
        "live trading not executed",
      passed:
        result.boundary
          .tradingExecuted ===
        false,
    },
  ];

  const passed =
    checks.filter(
      (check) =>
        check.passed,
    ).length;

  return {
    success:
      passed ===
      checks.length,

    code:
      passed ===
      checks.length
        ? "C159_MARKET_PAPER_TRADE_PERFORMANCE_REGRESSION_PASS"
        : "C159_MARKET_PAPER_TRADE_PERFORMANCE_REGRESSION_FAIL",

    passed,

    total:
      checks.length,

    checks,

    generatedAt:
      new Date().toISOString(),
  };
}
