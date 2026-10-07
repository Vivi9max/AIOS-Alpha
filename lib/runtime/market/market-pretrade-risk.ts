import type {
  BrokerOrderIntent,
} from "./broker-integration-boundary-types";

export type MarketPreTradeRiskDecision =
  | "pass"
  | "blocked"
  | "review-required";

export type MarketPreTradeRiskFailureCode =
  | "INVALID_ORDER"
  | "MARKET_NOT_ALLOWED"
  | "QUANTITY_LIMIT_EXCEEDED"
  | "ORDER_NOTIONAL_LIMIT_EXCEEDED"
  | "LIMIT_PRICE_REQUIRED"
  | "LIMIT_PRICE_INVALID"
  | "RISK_POLICY_NOT_CONFIGURED";

export interface MarketPreTradeRiskPolicy {
  enabled: boolean;
  allowedMarkets: Array<"us" | "hk" | "cn">;
  maxOrderQuantity: number;
  maxOrderNotional: number;
  requireLimitPrice: boolean;
  allowMarketOrders: boolean;
  reviewRequiredAboveNotional: number;
  version: string;
}

export interface MarketPreTradeRiskResult {
  decision: MarketPreTradeRiskDecision;
  approved: boolean;
  order: BrokerOrderIntent | null;
  policy: MarketPreTradeRiskPolicy;
  checks: {
    orderValid: boolean;
    marketAllowed: boolean;
    quantityWithinLimit: boolean;
    notionalWithinLimit: boolean;
    limitPriceValid: boolean;
    reviewRequired: boolean;
  };
  estimatedNotional: number | null;
  blockedReasons: MarketPreTradeRiskFailureCode[];
  safetyBoundary: {
    preTradeRiskRequired: true;
    automaticRiskOverrideAllowed: false;
    callerCanBypassLimits: false;
    liveExecutionEnabled: false;
  };
  generatedAt: string;
}

const DEFAULT_POLICY: MarketPreTradeRiskPolicy = {
  enabled: true,
  allowedMarkets: ["us", "hk", "cn"],
  maxOrderQuantity: 100000,
  maxOrderNotional: 100000,
  requireLimitPrice: false,
  allowMarketOrders: true,
  reviewRequiredAboveNotional: 25000,
  version: "C167.5.27-v1",
};

function parsePositiveNumber(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return fallback;
  }

  return parsed;
}

function parseBoolean(
  value: string | undefined,
  fallback: boolean,
): boolean {
  if (!value) {
    return fallback;
  }

  const normalized =
    value.trim().toLowerCase();

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return fallback;
}

function parseMarkets(
  value: string | undefined,
): Array<"us" | "hk" | "cn"> {
  if (!value) {
    return DEFAULT_POLICY.allowedMarkets;
  }

  const markets = value
    .split(",")
    .map(
      (item) =>
        item.trim().toLowerCase(),
    )
    .filter(
      (
        item,
      ): item is
        | "us"
        | "hk"
        | "cn" =>
        item === "us" ||
        item === "hk" ||
        item === "cn",
    );

  return markets.length > 0
    ? Array.from(
        new Set(markets),
      )
    : DEFAULT_POLICY.allowedMarkets;
}

export function getMarketPreTradeRiskPolicy(): MarketPreTradeRiskPolicy {
  return {
    enabled: parseBoolean(
      process.env
        .MARKET_PRETRADE_RISK_ENABLED,
      DEFAULT_POLICY.enabled,
    ),

    allowedMarkets:
      parseMarkets(
        process.env
          .MARKET_PRETRADE_ALLOWED_MARKETS,
      ),

    maxOrderQuantity:
      parsePositiveNumber(
        process.env
          .MARKET_PRETRADE_MAX_ORDER_QUANTITY,
        DEFAULT_POLICY.maxOrderQuantity,
      ),

    maxOrderNotional:
      parsePositiveNumber(
        process.env
          .MARKET_PRETRADE_MAX_ORDER_NOTIONAL,
        DEFAULT_POLICY.maxOrderNotional,
      ),

    requireLimitPrice:
      parseBoolean(
        process.env
          .MARKET_PRETRADE_REQUIRE_LIMIT_PRICE,
        DEFAULT_POLICY.requireLimitPrice,
      ),

    allowMarketOrders:
      parseBoolean(
        process.env
          .MARKET_PRETRADE_ALLOW_MARKET_ORDERS,
        DEFAULT_POLICY.allowMarketOrders,
      ),

    reviewRequiredAboveNotional:
      parsePositiveNumber(
        process.env
          .MARKET_PRETRADE_REVIEW_NOTIONAL_THRESHOLD,
        DEFAULT_POLICY.reviewRequiredAboveNotional,
      ),

    version:
      DEFAULT_POLICY.version,
  };
}

function normalizeOrder(
  order:
    | BrokerOrderIntent
    | null
    | undefined,
): BrokerOrderIntent | null {
  if (!order) {
    return null;
  }

  const symbol =
    typeof order.symbol ===
    "string"
      ? order.symbol
          .trim()
          .toUpperCase()
      : "";

  const quantity =
    typeof order.quantity ===
      "number" &&
    Number.isFinite(
      order.quantity,
    )
      ? Math.floor(
          order.quantity,
        )
      : 0;

  const market =
    order.market === "us" ||
    order.market === "hk" ||
    order.market === "cn"
      ? order.market
      : null;

  const limitPrice =
    typeof order.limitPrice ===
      "number" &&
    Number.isFinite(
      order.limitPrice,
    ) &&
    order.limitPrice > 0
      ? order.limitPrice
      : null;

  if (
    !symbol ||
    quantity <= 0 ||
    !market ||
    (
      order.side !== "buy" &&
      order.side !== "sell"
    )
  ) {
    return null;
  }

  return {
    symbol,
    market,
    side: order.side,
    quantity,
    limitPrice,
    reason:
      typeof order.reason ===
        "string" &&
      order.reason.trim()
        ? order.reason.trim()
        : null,
  };
}

export function evaluateMarketPreTradeRisk(
  order:
    | BrokerOrderIntent
    | null
    | undefined,
): MarketPreTradeRiskResult {
  const policy =
    getMarketPreTradeRiskPolicy();

  const normalizedOrder =
    normalizeOrder(
      order,
    );

  const orderValid =
    normalizedOrder !== null;

  const marketAllowed =
    orderValid &&
    policy.allowedMarkets.includes(
      normalizedOrder.market,
    );

  const quantityWithinLimit =
    orderValid &&
    normalizedOrder.quantity <=
      policy.maxOrderQuantity;

  const limitPriceValid =
    !orderValid
      ? false
      : normalizedOrder.limitPrice ===
          null
        ? policy.allowMarketOrders &&
          !policy.requireLimitPrice
        : Number.isFinite(
              normalizedOrder.limitPrice,
            ) &&
            normalizedOrder.limitPrice >
              0;

  const estimatedNotional =
    orderValid &&
    normalizedOrder.limitPrice !==
      null
      ? normalizedOrder.quantity *
        normalizedOrder.limitPrice
      : null;

  const notionalWithinLimit =
    estimatedNotional === null
      ? !policy.requireLimitPrice
      : estimatedNotional <=
        policy.maxOrderNotional;

  const reviewRequired =
    estimatedNotional !== null &&
    estimatedNotional >=
      policy.reviewRequiredAboveNotional;

  const blockedReasons:
    MarketPreTradeRiskFailureCode[] =
    [];

  if (!orderValid) {
    blockedReasons.push(
      "INVALID_ORDER",
    );
  }

  if (
    orderValid &&
    !marketAllowed
  ) {
    blockedReasons.push(
      "MARKET_NOT_ALLOWED",
    );
  }

  if (
    orderValid &&
    !quantityWithinLimit
  ) {
    blockedReasons.push(
      "QUANTITY_LIMIT_EXCEEDED",
    );
  }

  if (
    orderValid &&
    estimatedNotional !== null &&
    !notionalWithinLimit
  ) {
    blockedReasons.push(
      "ORDER_NOTIONAL_LIMIT_EXCEEDED",
    );
  }

  if (
    orderValid &&
    !limitPriceValid
  ) {
    blockedReasons.push(
      normalizedOrder.limitPrice ===
        null
        ? "LIMIT_PRICE_REQUIRED"
        : "LIMIT_PRICE_INVALID",
    );
  }

  if (!policy.enabled) {
    blockedReasons.push(
      "RISK_POLICY_NOT_CONFIGURED",
    );
  }

  const blocked =
    blockedReasons.length > 0;

  const decision:
    MarketPreTradeRiskDecision =
    blocked
      ? "blocked"
      : reviewRequired
        ? "review-required"
        : "pass";

  return {
    decision,

    approved:
      decision === "pass",

    order:
      normalizedOrder,

    policy,

    checks: {
      orderValid,

      marketAllowed,

      quantityWithinLimit,

      notionalWithinLimit,

      limitPriceValid,

      reviewRequired,
    },

    estimatedNotional,

    blockedReasons:
      Array.from(
        new Set(
          blockedReasons,
        ),
      ),

    safetyBoundary: {
      preTradeRiskRequired:
        true,

      automaticRiskOverrideAllowed:
        false,

      callerCanBypassLimits:
        false,

      liveExecutionEnabled:
        false,
    },

    generatedAt:
      new Date().toISOString(),
  };
}
