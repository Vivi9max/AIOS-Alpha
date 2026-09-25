import {
  analyzeMarketRequest,
} from "./market-router";

import type {
  MarketBar,
  MarketRegion,
} from "./market-types";

import type {
  PaperEquityPoint,
  PaperPosition,
  PaperTrade,
  PaperTradingCandidateInput,
  PaperTradingCandidateResult,
  PaperTradingMetrics,
  PaperTradingOrderInput,
  PaperTradingRequest,
  PaperTradingResult,
} from "./paper-trading-types";

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

function normalizeMarket(
  market: MarketRegion | null | undefined,
  symbol: string,
): MarketRegion {
  if (
    market === "us" ||
    market === "hk" ||
    market === "cn"
  ) {
    return market;
  }

  const normalized =
    symbol
      .trim()
      .toUpperCase();

  if (
    normalized.endsWith(".HK")
  ) {
    return "hk";
  }

  if (
    normalized.endsWith(".SH") ||
    normalized.endsWith(".SZ")
  ) {
    return "cn";
  }

  return "us";
}

function normalizeSymbol(
  symbol: string,
  market: MarketRegion,
): string {
  const normalized =
    symbol
      .trim()
      .toUpperCase();

  if (market === "hk") {
    return normalized.endsWith(".HK")
      ? normalized
      : `${normalized}.HK`;
  }

  if (market === "cn") {
    if (
      normalized.endsWith(".SH") ||
      normalized.endsWith(".SZ")
    ) {
      return normalized;
    }

    if (
      normalized.startsWith("6")
    ) {
      return `${normalized}.SH`;
    }

    return `${normalized}.SZ`;
  }

  return normalized.endsWith(".US")
    ? normalized
    : `${normalized}.US`;
}

function currencyForMarket(
  market: MarketRegion,
):
  | "USD"
  | "HKD"
  | "CNY" {
  if (market === "hk") {
    return "HKD";
  }

  if (market === "cn") {
    return "CNY";
  }

  return "USD";
}

function normalizeBars(
  bars: MarketBar[] | null | undefined,
): MarketBar[] {
  if (!Array.isArray(bars)) {
    return [];
  }

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

function findBarPrice(
  bars: MarketBar[],
): {
  price: number | null;
  timestamp: string | null;
} {
  if (bars.length === 0) {
    return {
      price: null,
      timestamp: null,
    };
  }

  const last =
    bars[bars.length - 1];

  return {
    price:
      typeof last.close ===
        "number" &&
      Number.isFinite(
        last.close,
      ) &&
      last.close > 0
        ? last.close
        : null,

    timestamp:
      last.timestamp,
  };
}

function buildPosition(
  symbol: string,
  market: MarketRegion,
  name: string | null | undefined,
  quantity: number,
  averageEntryPrice: number,
  lastPrice: number,
  realizedPnl: number,
): PaperPosition {
  const costBasis =
    quantity *
    averageEntryPrice;

  const marketValue =
    quantity *
    lastPrice;

  const unrealizedPnl =
    marketValue -
    costBasis;

  return {
    symbol,

    market,

    name,

    quantity,

    averageEntryPrice:
      round(
        averageEntryPrice,
      ),

    lastPrice:
      round(
        lastPrice,
      ),

    marketValue:
      round(
        marketValue,
      ),

    costBasis:
      round(
        costBasis,
      ),

    realizedPnl:
      round(
        realizedPnl,
      ),

    unrealizedPnl:
      round(
        unrealizedPnl,
      ),

    totalPnl:
      round(
        realizedPnl +
          unrealizedPnl,
      ),

    currency:
      currencyForMarket(
        market,
      ),
  };
}

interface MutablePosition {
  symbol: string;
  market: MarketRegion;
  name: string | null;
  quantity: number;
  averageEntryPrice: number;
  realizedPnl: number;
  lastPrice: number;
}

function executePaperOrder(
  order: PaperTradingOrderInput,
  market: MarketRegion,
  symbol: string,
  price: number,
  timestamp: string,
  cash: {
    value: number;
  },
  positions: Map<
    string,
    MutablePosition
  >,
  trades: PaperTrade[],
  feeBps: number,
  slippageBps: number,
  tradeId: {
    value: number;
  },
  initialCapital: number,
): void {
  const quantity =
    Math.floor(
      order.quantity,
    );

  if (
    quantity <= 0
  ) {
    trades.push({
      id:
        tradeId.value++,

      symbol,

      market,

      side:
        order.side,

      status:
        "rejected",

      timestamp,

      quantity:
        order.quantity,

      requestedPrice:
        order.price ??
        null,

      fillPrice:
        null,

      grossValue:
        0,

      fee:
        0,

      slippage:
        0,

      cashFlow:
        0,

      realizedPnl:
        0,

      reason:
        order.reason ??
        null,

      rejectionReason:
        "Quantity must be a positive whole number.",
    });

    return;
  }

  const friction =
    (
      feeBps +
      slippageBps
    ) / 10000;

  const executionPrice =
    order.side === "buy"
      ? price *
        (1 + friction)
      : price *
        (1 - friction);

  const grossValue =
    quantity *
    price;

  const fee =
    grossValue *
    feeBps /
    10000;

  const slippage =
    grossValue *
    slippageBps /
    10000;

  const existing =
    positions.get(
      symbol,
    );

  if (
    order.side === "buy"
  ) {
    const totalCost =
      grossValue +
      fee +
      slippage;

    if (
      totalCost >
      cash.value
    ) {
      trades.push({
        id:
          tradeId.value++,

        symbol,

        market,

        side:
          order.side,

        status:
          "rejected",

        timestamp,

        quantity,

        requestedPrice:
          order.price ??
          null,

        fillPrice:
          round(
            executionPrice,
          ),

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

        cashFlow:
          0,

        realizedPnl:
          0,

        reason:
          order.reason ??
          null,

        rejectionReason:
          "Insufficient virtual cash.",
      });

      return;
    }

    cash.value -=
      totalCost;

    if (existing) {
      const oldCost =
        existing.quantity *
        existing.averageEntryPrice;

      const newCost =
        quantity *
        executionPrice;

      existing.quantity +=
        quantity;

      existing.averageEntryPrice =
        (
          oldCost +
          newCost
        ) /
        existing.quantity;

      existing.lastPrice =
        price;
    } else {
      positions.set(
        symbol,
        {
          symbol,

          market,

          name: null,

          quantity,

          averageEntryPrice:
            executionPrice,

          realizedPnl:
            0,

          lastPrice:
            price,
        },
      );
    }

    trades.push({
      id:
        tradeId.value++,

      symbol,

      market,

      side:
        "buy",

      status:
        "filled",

      timestamp,

      quantity,

      requestedPrice:
        order.price ??
        null,

      fillPrice:
        round(
          executionPrice,
        ),

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

      cashFlow:
        round(
          -totalCost,
        ),

      realizedPnl:
        0,

      reason:
        order.reason ??
        null,
    });

    return;
  }

  if (
    !existing ||
    existing.quantity <
      quantity
  ) {
    trades.push({
      id:
        tradeId.value++,

      symbol,

      market,

      side:
        order.side,

      status:
        "rejected",

      timestamp,

      quantity,

      requestedPrice:
        order.price ??
        null,

      fillPrice:
        round(
          executionPrice,
        ),

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

      cashFlow:
        0,

      realizedPnl:
        0,

      reason:
        order.reason ??
        null,

      rejectionReason:
        "Insufficient virtual position quantity.",
    });

    return;
  }

  const netProceeds =
    grossValue -
    fee -
    slippage;

  const realizedPnl =
    (
      executionPrice -
      existing.averageEntryPrice
    ) *
      quantity -
    fee -
    slippage;

  cash.value +=
    netProceeds;

  existing.quantity -=
    quantity;

  existing.lastPrice =
    price;

  existing.realizedPnl +=
    realizedPnl;

  if (
    existing.quantity ===
    0
  ) {
    positions.delete(
      symbol,
    );
  }

  trades.push({
    id:
      tradeId.value++,

    symbol,

    market,

    side:
      "sell",

    status:
      "filled",

    timestamp,

    quantity,

    requestedPrice:
      order.price ??
      null,

    fillPrice:
      round(
        executionPrice,
      ),

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

    cashFlow:
      round(
        netProceeds,
      ),

    realizedPnl:
      round(
        realizedPnl,
      ),

    reason:
      order.reason ??
      null,
  });

  void initialCapital;
}

function buildMetrics(
  initialCapital: number,
  cash: number,
  positions: PaperPosition[],
  trades: PaperTrade[],
): PaperTradingMetrics {
  const positionsValue =
    positions.reduce(
      (
        total,
        position,
      ) =>
        total +
        position.marketValue,
      0,
    );

  const finalEquity =
    cash +
    positionsValue;

  const netProfit =
    finalEquity -
    initialCapital;

  const realizedPnl =
    trades.reduce(
      (
        total,
        trade,
      ) =>
        total +
        trade.realizedPnl,
      0,
    );

  const totalFees =
    trades.reduce(
      (
        total,
        trade,
      ) =>
        total +
        trade.fee,
      0,
    );

  const totalSlippage =
    trades.reduce(
      (
        total,
        trade,
      ) =>
        total +
        trade.slippage,
      0,
    );

  const unrealizedPnl =
    positions.reduce(
      (
        total,
        position,
      ) =>
        total +
        position.unrealizedPnl,
      0,
    );

  const filledOrders =
    trades.filter(
      (trade) =>
        trade.status ===
        "filled",
    ).length;

  const rejectedOrders =
    trades.filter(
      (trade) =>
        trade.status ===
        "rejected",
    ).length;

  return {
    initialCapital:
      round(
        initialCapital,
      ),

    finalCash:
      round(
        cash,
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
      initialCapital > 0
        ? round(
            (
              netProfit /
              initialCapital
            ) *
              100,
          )
        : 0,

    realizedPnl:
      round(
        realizedPnl,
      ),

    unrealizedPnl:
      round(
        unrealizedPnl,
      ),

    totalFees:
      round(
        totalFees,
      ),

    totalSlippage:
      round(
        totalSlippage,
      ),

    filledOrders,

    rejectedOrders,

    openPositions:
      positions.length,
  };
}

function buildEquityPoint(
  timestamp: string,
  cash: number,
  positions: Map<
    string,
    MutablePosition
  >,
): PaperEquityPoint {
  let positionsValue = 0;

  for (
    const position of positions.values()
  ) {
    positionsValue +=
      position.quantity *
      position.lastPrice;
  }

  return {
    timestamp,

    cash:
      round(
        cash,
      ),

    positionsValue:
      round(
        positionsValue,
      ),

    equity:
      round(
        cash +
          positionsValue,
      ),
  };
}

async function resolveRuntimePrice(
  symbol: string,
  market: MarketRegion,
  query: string | null | undefined,
): Promise<{
  price: number | null;
  asOf: string | null;
  provider: string;
  dataQuality:
    | "historical"
    | "live"
    | "delayed"
    | "web-evidence"
    | "insufficient"
    | "unknown";
  verified: boolean;
}> {
  try {
    const result =
      await analyzeMarketRequest({
        symbol,
        market,
        mode:
          "research",
        query:
          query ??
          null,
      });

    const price =
      result.snapshot.price;

    if (
      typeof price !==
        "number" ||
      !Number.isFinite(
        price,
      ) ||
      price <= 0
    ) {
      return {
        price: null,
        asOf:
          result.snapshot.asOf ??
          null,
        provider:
          result.provider
            .provider,
        dataQuality:
          "insufficient",
        verified: false,
      };
    }

    return {
      price,

      asOf:
        result.snapshot.asOf ??
        null,

      provider:
        result.provider
          .provider,

      dataQuality:
        result.snapshot
          .dataQuality,

      verified:
        result.verification
          .verified,
    };
  } catch {
    return {
      price: null,

      asOf: null,

      provider:
        "unavailable",

      dataQuality:
        "insufficient",

      verified: false,
    };
  }
}

export async function paperTradeMarket(
  request: PaperTradingRequest,
): Promise<PaperTradingResult> {
  const initialCapital =
    positiveNumber(
      request.initialCapital,
      100000,
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

  const bars =
    normalizeBars(
      request.bars,
    );

  const candidates =
    Array.isArray(
      request.candidates,
    )
      ? request.candidates
      : [];

  const orders =
    Array.isArray(
      request.orders,
    )
      ? request.orders
      : [];

  const cash = {
    value:
      initialCapital,
  };

  const positions =
    new Map<
      string,
      MutablePosition
    >();

  const trades: PaperTrade[] =
    [];

  const equityCurve:
    PaperEquityPoint[] =
    [];

  const tradeId = {
    value: 1,
  };

  const candidateMap =
    new Map<
      string,
      PaperTradingCandidateInput
    >();

  for (
    const candidate of candidates
  ) {
    const market =
      normalizeMarket(
        candidate.market,
        candidate.symbol,
      );

    const symbol =
      normalizeSymbol(
        candidate.symbol,
        market,
      );

    candidateMap.set(
      symbol,
      {
        ...candidate,
        market,
        symbol,
      },
    );
  }

  for (
    const order of orders
  ) {
    const market =
      normalizeMarket(
        order.market,
        order.symbol,
      );

    const symbol =
      normalizeSymbol(
        order.symbol,
        market,
      );

    if (
      !candidateMap.has(
        symbol,
      )
    ) {
      candidateMap.set(
        symbol,
        {
          symbol,

          market,

          name: null,
        },
      );
    }
  }

  const priceCache =
    new Map<
      string,
      {
        price: number;
        asOf: string | null;
        provider: string;
        dataQuality:
          | "historical"
          | "live"
          | "delayed"
          | "web-evidence"
          | "insufficient"
          | "unknown";
        verified: boolean;
      }
    >();

  const candidateResults =
    new Map<
      string,
      PaperTradingCandidateResult
    >();

  for (
    const candidate of candidateMap.values()
  ) {
    const market =
      normalizeMarket(
        candidate.market,
        candidate.symbol,
      );

    const symbol =
      normalizeSymbol(
        candidate.symbol,
        market,
      );

    const barPrice =
      findBarPrice(
        bars,
      );

    if (
      barPrice.price !==
        null
    ) {
      priceCache.set(
        symbol,
        {
          price:
            barPrice.price,

          asOf:
            barPrice.timestamp,

          provider:
            "historical-bars",

          dataQuality:
            "historical",

          verified:
            true,
        },
      );

      continue;
    }

    const explicitOrder =
      orders.find(
        (order) => {
          const orderMarket =
            normalizeMarket(
              order.market,
              order.symbol,
            );

          return (
            normalizeSymbol(
              order.symbol,
              orderMarket,
            ) === symbol &&
            typeof order.price ===
              "number" &&
            Number.isFinite(
              order.price,
            ) &&
            order.price > 0
          );
        },
      );

    if (
      explicitOrder &&
      typeof explicitOrder.price ===
        "number"
    ) {
      priceCache.set(
        symbol,
        {
          price:
            explicitOrder.price,

          asOf:
            explicitOrder.timestamp ??
            null,

          provider:
            "explicit-order",

          dataQuality:
            "unknown",

          verified:
            false,
        },
      );

      continue;
    }

    const runtime =
      await resolveRuntimePrice(
        symbol,
        market,
        request.query,
      );

    if (
      runtime.price !==
        null
    ) {
      priceCache.set(
        symbol,
        {
          price:
            runtime.price,

          asOf:
            runtime.asOf,

          provider:
            runtime.provider,

          dataQuality:
            runtime.dataQuality,

          verified:
            runtime.verified,
        },
      );
    }
  }

  for (
    const order of orders
  ) {
    const market =
      normalizeMarket(
        order.market,
        order.symbol,
      );

    const symbol =
      normalizeSymbol(
        order.symbol,
        market,
      );

    const cached =
      priceCache.get(
        symbol,
      );

    const explicitPrice =
      typeof order.price ===
        "number" &&
      Number.isFinite(
        order.price,
      ) &&
      order.price > 0
        ? order.price
        : null;

    const price =
      explicitPrice ??
      cached?.price ??
      null;

    const timestamp =
      order.timestamp ??
      cached?.asOf ??
      new Date().toISOString();

    if (
      price === null
    ) {
      trades.push({
        id:
          tradeId.value++,

        symbol,

        market,

        side:
          order.side,

        status:
          "rejected",

        timestamp,

        quantity:
          order.quantity,

        requestedPrice:
          explicitPrice,

        fillPrice:
          null,

        grossValue:
          0,

        fee:
          0,

        slippage:
          0,

        cashFlow:
          0,

        realizedPnl:
          0,

        reason:
          order.reason ??
          null,

        rejectionReason:
          "No usable simulation price was available.",
      });

      continue;
    }

    executePaperOrder(
      order,

      market,

      symbol,

      price,

      timestamp,

      cash,

      positions,

      trades,

      feeBps,

      slippageBps,

      tradeId,

      initialCapital,
    );

    for (
      const position of positions.values()
    ) {
      const current =
        priceCache.get(
          position.symbol,
        );

      if (
        current
      ) {
        position.lastPrice =
          current.price;
      }
    }

    equityCurve.push(
      buildEquityPoint(
        timestamp,
        cash.value,
        positions,
      ),
    );
  }

  /*
   * Mark remaining positions to the
   * latest available price.
   */
  for (
    const position of positions.values()
  ) {
    const current =
      priceCache.get(
        position.symbol,
      );

    if (
      current
    ) {
      position.lastPrice =
        current.price;
    }
  }

  if (
    equityCurve.length ===
      0 &&
    priceCache.size > 0
  ) {
    equityCurve.push(
      buildEquityPoint(
        new Date().toISOString(),
        cash.value,
        positions,
      ),
    );
  }

  const positionList:
    PaperPosition[] =
    [];

  for (
    const position of positions.values()
  ) {
    const candidate =
      candidateMap.get(
        position.symbol,
      );

    positionList.push(
      buildPosition(
        position.symbol,

        position.market,

        candidate?.name ??
          position.name,

        position.quantity,

        position.averageEntryPrice,

        position.lastPrice,

        position.realizedPnl,
      ),
    );
  }

  const metrics =
    buildMetrics(
      initialCapital,
      cash.value,
      positionList,
      trades,
    );

  let rank = 1;

  for (
    const candidate of candidateMap.values()
  ) {
    const market =
      normalizeMarket(
        candidate.market,
        candidate.symbol,
      );

    const symbol =
      normalizeSymbol(
        candidate.symbol,
        market,
      );

    const price =
      priceCache.get(
        symbol,
      );

    const position =
      positionList.find(
        (item) =>
          item.symbol ===
          symbol,
      ) ??
      null;

    const candidateTrades =
      trades.filter(
        (trade) =>
          trade.symbol ===
          symbol,
      );

    const warnings: string[] =
      [];

    if (!price) {
      warnings.push(
        "No usable simulation price was available.",
      );
    }

    if (
      price &&
      !price.verified
    ) {
      warnings.push(
        "Price source was not independently verified as structured realtime data.",
      );
    }

    candidateResults.set(
      symbol,
      {
        rank:
          rank++,

        input:
          candidate,

        normalizedSymbol:
          symbol,

        currency:
          currencyForMarket(
            market,
          ),

        position,

        trades:
          candidateTrades,

        data: {
          priceSource:
            price?.provider ===
            "explicit-order"
              ? "explicit-order"
              : price?.provider ===
                "historical-bars"
                ? "historical-bar"
                : price
                  ? "market-runtime"
                  : "insufficient",

          priceVerified:
            price?.verified ??
            false,

          dataQuality:
            price?.dataQuality ??
            "insufficient",

          provider:
            price?.provider ??
            "unavailable",

          asOf:
            price?.asOf ??
            null,
        },

        status:
          price
            ? "paper-complete"
            : "paper-insufficient",

        warnings,
      },
    );
  }

  const candidateResultList =
    Array.from(
      candidateResults.values(),
    );

  const filledOrders =
    trades.filter(
      (trade) =>
        trade.status ===
        "filled",
    ).length;

  const rejectedOrders =
    trades.filter(
      (trade) =>
        trade.status ===
        "rejected",
    ).length;

  let code:
    | "C151_PAPER_TRADING_PASS"
    | "C151_PAPER_TRADING_PARTIAL"
    | "C151_PAPER_TRADING_INSUFFICIENT";

  if (
    orders.length === 0
  ) {
    code =
      "C151_PAPER_TRADING_INSUFFICIENT";
  } else if (
    filledOrders ===
      orders.length
  ) {
    code =
      "C151_PAPER_TRADING_PASS";
  } else if (
    filledOrders > 0
  ) {
    code =
      "C151_PAPER_TRADING_PARTIAL";
  } else {
    code =
      "C151_PAPER_TRADING_INSUFFICIENT";
  }

  const positionsValue =
    positionList.reduce(
      (
        total,
        position,
      ) =>
        total +
        position.marketValue,
      0,
    );

  return {
    success:
      filledOrders > 0,

    code,

    stage:
      "C151",

    requestedOrders:
      orders.length,

    filledOrders,

    rejectedOrders,

    account: {
      currency:
        positionList[0]
          ?.currency ??
        "USD",

      initialCapital:
        round(
          initialCapital,
        ),

      cash:
        round(
          cash.value,
        ),

      positionsValue:
        round(
          positionsValue,
        ),

      equity:
        round(
          cash.value +
            positionsValue,
        ),

      positions:
        positionList,
    },

    metrics,

    trades,

    equityCurve,

    candidates:
      candidateResultList,

    methodology: {
      purpose:
        "Simulate portfolio execution with virtual cash and positions before any live broker connection.",

      executionModel: [
        "Virtual cash only.",
        "Virtual positions only.",
        "No broker or exchange API is called.",
        "Buy orders reduce virtual cash.",
        "Sell orders require sufficient virtual position quantity.",
        "Fees and slippage are applied to simulated fills.",
        "Remaining positions are marked to the latest available simulation price.",
      ],

      pricingHierarchy: [
        "Explicit order price when supplied.",
        "Supplied historical bar close.",
        "Market Runtime snapshot when no deterministic simulation price is supplied.",
        "No price means the paper order is rejected.",
      ],

      assumptions: {
        initialCapital:
          round(
            initialCapital,
          ),

        feeBps,

        slippageBps,
      },

      excludedFromDecision: [
        "No personalized investment advice.",
        "No future return prediction.",
        "No automatic buy/sell recommendation.",
        "No broker execution.",
        "No live order placement.",
        "No Planner dispatch.",
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
