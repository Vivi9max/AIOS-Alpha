import type {
  MarketPaperTradePerformanceRequest,
  MarketPaperTradePerformanceResult,
  MarketPaperTradePerformanceReviewItem,
} from "./market-paper-trade-performance-types";

import type {
  PaperEquityPoint,
  PaperTradingCandidateResult,
} from "./paper-trading-types";

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

function normalizeSymbol(
  value: string,
): string {
  return value
    .trim()
    .toUpperCase();
}

function calculateDrawdown(
  equityCurve: PaperEquityPoint[],
): {
  maxDrawdown: number;
  maxDrawdownPercent: number;
} {
  if (
    equityCurve.length ===
    0
  ) {
    return {
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
    };
  }

  let peak =
    equityCurve[0].equity;

  let maxDrawdown = 0;

  let maxDrawdownPercent =
    0;

  for (
    const point of equityCurve
  ) {
    if (
      point.equity >
      peak
    ) {
      peak =
        point.equity;
    }

    const drawdown =
      peak -
      point.equity;

    const drawdownPercent =
      peak > 0
        ? (
            drawdown /
            peak
          ) *
          100
        : 0;

    if (
      drawdown >
      maxDrawdown
    ) {
      maxDrawdown =
        drawdown;
    }

    if (
      drawdownPercent >
      maxDrawdownPercent
    ) {
      maxDrawdownPercent =
        drawdownPercent;
    }
  }

  return {
    maxDrawdown:
      round(
        maxDrawdown,
      ),

    maxDrawdownPercent:
      round(
        maxDrawdownPercent,
      ),
  };
}

function buildDataQuality(
  candidates: PaperTradingCandidateResult[],
) {
  const priceSources =
    Array.from(
      new Set(
        candidates.map(
          (candidate) =>
            candidate.data
              .priceSource,
        ),
      ),
    );

  const providers =
    Array.from(
      new Set(
        candidates
          .map(
            (candidate) =>
              candidate.data
                .provider,
          )
          .filter(Boolean),
      ),
    );

  const dataQualities =
    Array.from(
      new Set(
        candidates.map(
          (candidate) =>
            candidate.data
              .dataQuality,
        ),
      ),
    );

  const verifiedPriceCount =
    candidates.filter(
      (candidate) =>
        candidate.data
          .priceVerified,
    ).length;

  const unverifiedPriceCount =
    candidates.filter(
      (candidate) =>
        !candidate.data
          .priceVerified &&
        candidate.data
          .priceSource !==
          "insufficient",
    ).length;

  const insufficientPriceCount =
    candidates.filter(
      (candidate) =>
        candidate.data
          .priceSource ===
        "insufficient",
    ).length;

  const historicalPriceCount =
    candidates.filter(
      (candidate) =>
        candidate.data
          .priceSource ===
        "historical-bar",
    ).length;

  const runtimePriceCount =
    candidates.filter(
      (candidate) =>
        candidate.data
          .priceSource ===
        "market-runtime",
    ).length;

  const webEvidencePriceCount =
    candidates.filter(
      (candidate) =>
        candidate.data
          .dataQuality ===
        "web-evidence",
    ).length;

  const timestamps =
    candidates
      .map(
        (candidate) =>
          candidate.data
            .asOf,
      )
      .filter(
        (
          value,
        ): value is string =>
          typeof value ===
            "string" &&
          value.length > 0,
      );

  return {
    priceSources,

    providers,

    dataQualities,

    verifiedPriceCount,

    unverifiedPriceCount,

    insufficientPriceCount,

    historicalPriceCount,

    runtimePriceCount,

    webEvidencePriceCount,

    asOf:
      timestamps.length >
      0
        ? timestamps.sort()
            .at(-1) ??
          null
        : null,
  };
}

function buildReviewItems(
  result: MarketPaperTradePerformanceRequest["paperTrading"],
  metrics: ReturnType<
    typeof buildMetrics
  >,
  dataQuality: ReturnType<
    typeof buildDataQuality
  >,
): MarketPaperTradePerformanceReviewItem[] {
  const items: MarketPaperTradePerformanceReviewItem[] =
    [];

  items.push({
    category:
      "performance",

    title:
      "Historical simulation outcome",

    observation:
      `Final equity ${metrics.finalEquity.toFixed(2)} from initial capital ${metrics.initialCapital.toFixed(2)}; net result ${metrics.netProfit.toFixed(2)} (${metrics.totalReturnPercent.toFixed(2)}%).`,

    requiresHumanReview:
      true,
  });

  items.push({
    category:
      "performance",

    title:
      "Maximum drawdown",

    observation:
      `Maximum simulated drawdown was ${metrics.maxDrawdown.toFixed(2)} (${metrics.maxDrawdownPercent.toFixed(2)}%).`,

    requiresHumanReview:
      true,
  });

  items.push({
    category:
      "execution",

    title:
      "Order execution",

    observation:
      `${metrics.filledOrders} of ${metrics.requestedOrders} requested orders were filled; ${metrics.rejectedOrders} were rejected.`,

    requiresHumanReview:
      true,
  });

  items.push({
    category:
      "cost",

    title:
      "Simulation friction",

    observation:
      `Recorded fees were ${metrics.totalFees.toFixed(2)} and simulated slippage was ${metrics.totalSlippage.toFixed(2)}.`,

    requiresHumanReview:
      true,
  });

  if (
    dataQuality
      .insufficientPriceCount >
    0
  ) {
    items.push({
      category:
        "data",

      title:
        "Insufficient pricing evidence",

      observation:
        `${dataQuality.insufficientPriceCount} candidate result(s) did not have a sufficient price source.`,

      requiresHumanReview:
        true,
    });
  }

  if (
    dataQuality
      .unverifiedPriceCount >
    0
  ) {
    items.push({
      category:
        "data",

      title:
        "Unverified pricing",

      observation:
        `${dataQuality.unverifiedPriceCount} candidate result(s) used a price that was not marked verified by the paper-trading engine.`,

      requiresHumanReview:
        true,
    });
  }

  if (
    dataQuality
      .webEvidencePriceCount >
    0
  ) {
    items.push({
      category:
        "data",

      title:
        "Web-evidence pricing",

      observation:
        `${dataQuality.webEvidencePriceCount} candidate result(s) contain web-evidence data quality. Web evidence is not equivalent to a verified real-time quote.`,

      requiresHumanReview:
        true,
    });
  }

  if (
    metrics.openPositions >
    0
  ) {
    items.push({
      category:
        "position",

      title:
        "Open simulated positions",

      observation:
        `${metrics.openPositions} simulated position(s) remain open at the end of the paper-trading run.`,

      requiresHumanReview:
        true,
    });
  }

  if (
    result.safetyBoundary
      .tradingExecuted
  ) {
    items.push({
      category:
        "risk",

      title:
        "Boundary integrity",

      observation:
        "The supplied C151 result reports trading execution. This is inconsistent with the C151 simulation-only boundary and requires human review.",

      requiresHumanReview:
        true,
    });
  }

  return items;
}

function buildMetrics(
  paper: MarketPaperTradePerformanceRequest["paperTrading"],
) {
  const source =
    paper.metrics;

  const requestedOrders =
    paper.requestedOrders;

  const filledOrders =
    paper.filledOrders;

  const rejectedOrders =
    paper.rejectedOrders;

  const totalOrders =
    requestedOrders > 0
      ? requestedOrders
      : filledOrders +
        rejectedOrders;

  const fillRatePercent =
    totalOrders > 0
      ? (
          filledOrders /
          totalOrders
        ) *
        100
      : 0;

  const rejectionRatePercent =
    totalOrders > 0
      ? (
          rejectedOrders /
          totalOrders
        ) *
        100
      : 0;

  const drawdown =
    calculateDrawdown(
      paper.equityCurve,
    );

  return {
    initialCapital:
      source.initialCapital,

    finalCash:
      source.finalCash,

    finalEquity:
      source.finalEquity,

    netProfit:
      source.netProfit,

    totalReturnPercent:
      source.totalReturnPercent,

    realizedPnl:
      source.realizedPnl,

    unrealizedPnl:
      source.unrealizedPnl,

    totalFees:
      source.totalFees,

    totalSlippage:
      source.totalSlippage,

    requestedOrders,

    filledOrders,

    rejectedOrders,

    fillRatePercent:
      round(
        fillRatePercent,
      ),

    rejectionRatePercent:
      round(
        rejectionRatePercent,
      ),

    openPositions:
      source.openPositions,

    maxDrawdown:
      drawdown.maxDrawdown,

    maxDrawdownPercent:
      drawdown.maxDrawdownPercent,
  };
}

export async function runMarketPaperTradePerformanceReview(
  request: MarketPaperTradePerformanceRequest,
): Promise<MarketPaperTradePerformanceResult> {
  const startedAt =
    Date.now();

  const symbol =
    normalizeSymbol(
      request.symbol,
    );

  if (
    !symbol ||
    !request.paperTrading
  ) {
    return {
      success:
        false,

      code:
        "C159_MARKET_PAPER_TRADE_PERFORMANCE_INSUFFICIENT",

      state:
        "insufficient",

      symbol,

      market:
        request.market,

      metrics: {
        initialCapital: 0,
        finalCash: 0,
        finalEquity: 0,
        netProfit: 0,
        totalReturnPercent: 0,
        realizedPnl: 0,
        unrealizedPnl: 0,
        totalFees: 0,
        totalSlippage: 0,
        requestedOrders: 0,
        filledOrders: 0,
        rejectedOrders: 0,
        fillRatePercent: 0,
        rejectionRatePercent: 0,
        openPositions: 0,
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
      },

      dataQuality: {
        priceSources: [],
        providers: [],
        dataQualities: [],
        verifiedPriceCount: 0,
        unverifiedPriceCount: 0,
        insufficientPriceCount: 0,
        historicalPriceCount: 0,
        runtimePriceCount: 0,
        webEvidencePriceCount: 0,
        asOf: null,
      },

      reviewItems: [
        {
          category:
            "data",

          title:
            "Paper trading result unavailable",

          observation:
            "A valid C151 Paper Trading Result is required before performance review.",

          requiresHumanReview:
            true,
        },
      ],

      methodology: {
        source:
          "C151",

        simulationOnly:
          true,

        historicalPerformanceOnly:
          true,

        futurePerformancePrediction:
          false,

        recommendationGenerated:
          false,
      },

      boundary: {
        humanDecisionRequired:
          true,

        decisionAutomaticallyGenerated:
          false,

        taskCreated:
          false,

        plannerDispatched:
          false,

        brokerConnected:
          false,

        liveOrderPlaced:
          false,

        tradingExecuted:
          false,
      },

      upstream: {
        decisionWorkspace:
          "C157.1",

        paperTradeGate:
          "C158",

        paperTrading:
          "C151",

        liveTradingBoundary:
          "C152",
      },

      pipeline: [
        "C157 Decision Workspace",
        "C158 Human Paper Trade Gate",
        "C151 Paper Trading",
        "C159 Performance Review",
        "C152 Live Trading Boundary",
      ],

      principles: [
        "C159 reviews completed simulation results only.",
        "C159 does not create investment recommendations.",
        "Historical simulation results do not predict future performance.",
        "C159 does not execute another trade.",
        "C159 does not dispatch Planner tasks.",
      ],

      disclaimer:
        "Insufficient C151 paper-trading result for performance review.",

      generatedAt:
        new Date().toISOString(),

      latencyMs:
        Date.now() -
        startedAt,
    };
  }

  const metrics =
    buildMetrics(
      request.paperTrading,
    );

  const dataQuality =
    buildDataQuality(
      request.paperTrading
        .candidates,
    );

  const reviewItems =
    buildReviewItems(
      request.paperTrading,
      metrics,
      dataQuality,
    );

  const hasInsufficientData =
    dataQuality
      .insufficientPriceCount >
      0 ||
    request.paperTrading
      .code ===
      "C151_PAPER_TRADING_INSUFFICIENT";

  const success =
    request.paperTrading
      .success &&
    !hasInsufficientData;

  return {
    success,

    code:
      success
        ? "C159_MARKET_PAPER_TRADE_PERFORMANCE_PASS"
        : "C159_MARKET_PAPER_TRADE_PERFORMANCE_PARTIAL",

    state:
      success
        ? "review-ready"
        : "partial",

    symbol,

    market:
      request.market,

    metrics,

    dataQuality,

    reviewItems,

    methodology: {
      source:
        "C151",

      simulationOnly:
        true,

      historicalPerformanceOnly:
        true,

      futurePerformancePrediction:
        false,

      recommendationGenerated:
        false,
    },

    boundary: {
      humanDecisionRequired:
        true,

      decisionAutomaticallyGenerated:
        false,

      taskCreated:
        false,

      plannerDispatched:
        false,

      brokerConnected:
        false,

      liveOrderPlaced:
        false,

      tradingExecuted:
        false,
    },

    upstream: {
      decisionWorkspace:
        "C157.1",

      paperTradeGate:
        "C158",

      paperTrading:
        "C151",

      liveTradingBoundary:
        "C152",
    },

    pipeline: [
      "C157 Decision Workspace",
      "C158 Human Paper Trade Gate",
      "C151 Paper Trading",
      "C159 Performance Review",
      "C152 Live Trading Boundary",
    ],

    principles: [
      "C159 reviews the actual C151 simulation result.",
      "Performance metrics are descriptive, not predictive.",
      "Maximum drawdown is calculated from the supplied equity curve.",
      "Fees and slippage are reported explicitly.",
      "Data quality is reported separately from performance.",
      "Human review remains required.",
      "No investment recommendation is generated.",
      "No Planner task is created.",
      "No broker is connected.",
      "No live order is placed.",
      "No live trading is executed.",
    ],

    disclaimer:
      "C159 is a historical paper-trading performance review. Simulation performance does not guarantee future results and does not constitute an investment recommendation.",

    generatedAt:
      new Date().toISOString(),

    latencyMs:
      Date.now() -
      startedAt,
  };
}
