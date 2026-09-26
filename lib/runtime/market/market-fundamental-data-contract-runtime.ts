import {
  retrieveMarketData,
  detectMarket,
  normalizeMarketSymbol,
} from "./market-provider";

import type {
  MarketRegion,
  MarketSnapshot,
} from "./market-types";

import type {
  FundamentalMetricName,
  FundamentalMetricQuality,
  MarketFundamentalDataContract,
  MarketFundamentalDataContractRequest,
  MarketFundamentalDataContractResult,
  MarketFundamentalMetric,
} from "./market-fundamental-data-contract-types";

function metricQuality(
  snapshot: MarketSnapshot,
  field:
    | "revenue"
    | "revenueGrowth"
    | "eps"
    | "pe"
    | "pb"
    | "marketCap",
): FundamentalMetricQuality {
  const value = snapshot[field];

  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "insufficient";
  }

  if (
    snapshot.dataQuality === "live" &&
    snapshot.fieldQuality?.[
      field
    ] === "corroborated"
  ) {
    return "structured-verified";
  }

  if (
    snapshot.dataQuality === "live"
  ) {
    return "structured-verified";
  }

  if (
    snapshot.dataQuality === "historical"
  ) {
    return "historical";
  }

  if (
    snapshot.dataQuality === "web-evidence"
  ) {
    return "web-evidence";
  }

  return "insufficient";
}

function metricUnit(
  name: FundamentalMetricName,
):
  | "currency"
  | "currency-per-share"
  | "percent"
  | "multiple"
  | "unknown" {
  switch (name) {
    case "revenue":
    case "marketCap":
      return "currency";

    case "eps":
      return "currency-per-share";

    case "revenueGrowth":
      return "percent";

    case "pe":
    case "pb":
      return "multiple";

    default:
      return "unknown";
  }
}

function metricPeriod(
  name: FundamentalMetricName,
):
  | "current"
  | "ttm"
  | "quarterly"
  | "annual"
  | "unknown" {
  switch (name) {
    case "pe":
    case "pb":
    case "marketCap":
      return "current";

    case "revenue":
    case "eps":
      return "ttm";

    case "revenueGrowth":
      return "ttm";

    default:
      return "unknown";
  }
}

function buildMetric(
  snapshot: MarketSnapshot,
  name: FundamentalMetricName,
  currency:
    | "USD"
    | "HKD"
    | "CNY",
): MarketFundamentalMetric {
  const value =
    snapshot[name] ?? null;

  return {
    name,

    value:
      typeof value === "number" &&
      Number.isFinite(value)
        ? value
        : null,

    unit:
      metricUnit(name),

    currency:
      metricUnit(name) === "multiple" ||
      metricUnit(name) === "percent"
        ? null
        : currency,

    period:
      metricPeriod(name),

    asOf:
      snapshot.asOf ?? null,

    source:
      snapshot.source ?? null,

    quality:
      metricQuality(
        snapshot,
        name,
      ),
  };
}

function currencyFor(
  market: MarketRegion,
):
  | "USD"
  | "HKD"
  | "CNY" {
  switch (market) {
    case "hk":
      return "HKD";

    case "cn":
      return "CNY";

    default:
      return "USD";
  }
}

function limitations(
  snapshot: MarketSnapshot,
): string[] {
  const result: string[] = [];

  if (
    snapshot.dataQuality !== "live"
  ) {
    result.push(
      "Current fundamental values are not fully verified realtime structured data.",
    );
  }

  if (
    snapshot.dataQuality ===
    "web-evidence"
  ) {
    result.push(
      "Web evidence is retained as evidence and is not promoted to realtime financial data.",
    );
  }

  result.push(
    "This contract does not represent a complete historical financial statement.",
  );

  result.push(
    "Fiscal-period normalization, restatements and three-statement reconciliation are not yet implemented.",
  );

  result.push(
    "The values are research inputs and must not be interpreted as investment instructions.",
  );

  return Array.from(
    new Set(result),
  );
}

export async function runMarketFundamentalDataContract(
  request: MarketFundamentalDataContractRequest,
): Promise<MarketFundamentalDataContractResult> {
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

  const market =
    detectMarket(
      symbol,
      request.market ?? null,
    );

  const normalizedSymbol =
    normalizeMarketSymbol(
      symbol,
      market,
    );

  const instrument = {
    symbol,
    normalizedSymbol,
    market,
    exchange:
      market === "us"
        ? "US"
        : market === "hk"
          ? "HKEX"
          : "CN",
    currency:
      currencyFor(market),
  };

  const result =
    await retrieveMarketData(
      instrument,
    );

  const snapshot =
    result.snapshot;

  const metricNames:
    FundamentalMetricName[] = [
      "revenue",
      "revenueGrowth",
      "eps",
      "pe",
      "pb",
      "marketCap",
    ];

  const metrics =
    metricNames.map(
      (name) =>
        buildMetric(
          snapshot,
          name,
          currencyFor(
            market,
          ),
        ),
    );

  const availableMetricCount =
    metrics.filter(
      (metric) =>
        metric.value !== null,
    ).length;

  const verifiedMetricCount =
    metrics.filter(
      (metric) =>
        metric.quality ===
        "structured-verified",
    ).length;

  const contract:
    MarketFundamentalDataContract =
    {
      contractVersion:
        "C162.1",

      symbol:
        normalizedSymbol,

      market,

      dataQuality:
        snapshot.dataQuality,

      source:
        snapshot.source ??
        result.provider.provider ??
        null,

      dataset:
        snapshot.dataset ??
        null,

      asOf:
        snapshot.asOf ??
        null,

      metrics,

      availableMetricCount,

      verifiedMetricCount,

      structuredDataVerified:
        result.structuredDataVerified,

      webEvidenceUsed:
        snapshot.dataQuality ===
        "web-evidence",

      historicalFinancialStatementsAvailable:
        false,

      limitations:
        limitations(
          snapshot,
        ),

      humanVerificationRequired:
        true,
    };

  let code:
    | "C162_1_FUNDAMENTAL_DATA_CONTRACT_PASS"
    | "C162_1_FUNDAMENTAL_DATA_CONTRACT_PARTIAL"
    | "C162_1_FUNDAMENTAL_DATA_CONTRACT_INSUFFICIENT";

  if (
    verifiedMetricCount >= 3
  ) {
    code =
      "C162_1_FUNDAMENTAL_DATA_CONTRACT_PASS";
  } else if (
    availableMetricCount > 0
  ) {
    code =
      "C162_1_FUNDAMENTAL_DATA_CONTRACT_PARTIAL";
  } else {
    code =
      "C162_1_FUNDAMENTAL_DATA_CONTRACT_INSUFFICIENT";
  }

  return {
    success:
      availableMetricCount > 0,

    code,

    contract,

    upstream: {
      marketDataProvider:
        "C147.2",

      researchDossier:
        "C156",

      valuationEngine:
        "C149",
    },

    boundary: {
      dataMutation:
        false,

      financialForecastGenerated:
        false,

      valuationGenerated:
        false,

      recommendationGenerated:
        false,

      plannerDispatched:
        false,

      tradingExecuted:
        false,
    },

    pipeline: [
      "C147.2 Market Data",
      "C162.1 Fundamental Data Contract",
      "C156 Research Dossier",
      "C149 Valuation",
      "Human Verification",
    ],

    disclaimer:
      "C162.1 structures available fundamental inputs for research. It does not provide a complete financial-statement model, investment recommendation or trading instruction.",

    generatedAt:
      new Date().toISOString(),

    latencyMs:
      Date.now() -
      startedAt,
  };
}
