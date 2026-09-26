import type {
  MarketRegion,
} from "./market-types";

import {
  detectMarket,
  normalizeMarketSymbol,
} from "./market-provider";

import type {
  HistoricalFundamentalMetricName,
  HistoricalFundamentalObservation,
  MarketHistoricalFundamentalSeries,
  MarketHistoricalFundamentalSeriesRequest,
  MarketHistoricalFundamentalSeriesResult,
} from "./market-historical-fundamental-series-types";

const SEC_TICKER_URL =
  "https://www.sec.gov/files/company_tickers.json";

const SEC_COMPANY_FACTS_URL =
  "https://data.sec.gov/api/xbrl/companyfacts";

const METRIC_TAGS: Record<
  HistoricalFundamentalMetricName,
  string[]
> = {
  revenue: [
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "Revenues",
    "SalesRevenueNet",
  ],

  netIncome: [
    "NetIncomeLoss",
  ],

  totalAssets: [
    "Assets",
  ],

  totalLiabilities: [
    "Liabilities",
  ],

  stockholdersEquity: [
    "StockholdersEquity",
    "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
  ],

  operatingCashFlow: [
    "NetCashProvidedByUsedInOperatingActivities",
  ],

  capitalExpenditures: [
    "PaymentsToAcquirePropertyPlantAndEquipment",
  ],

  freeCashFlow: [],
};

type SecTickerEntry = {
  cik_str?: number;
  ticker?: string;
  title?: string;
};

type SecFactUnit = {
  val?: number;
  start?: string;
  end?: string;
  fy?: number;
  fp?: string;
  filed?: string;
  form?: string;
  accn?: string;
  frame?: string;
};

type SecFact = {
  label?: string;
  description?: string;
  units?: Record<
    string,
    SecFactUnit[]
  >;
};

type SecCompanyFacts = {
  entityName?: string;

  facts?: {
    "us-gaap"?: Record<
      string,
      SecFact
    >;
  };
};

function env(
  name: string,
): string {
  return (
    process.env[name]
      ?.trim() ?? ""
  );
}

function secHeaders(): HeadersInit {
  const userAgent =
    env("SEC_USER_AGENT");

  if (!userAgent) {
    throw new Error(
      "SEC_USER_AGENT is required for SEC programmatic access.",
    );
  }

  return {
    Accept:
      "application/json",

    "User-Agent":
      userAgent,
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

function uniqueSorted(
  values: string[],
): string[] {
  return Array.from(
    new Set(values),
  ).sort(
    (a, b) =>
      new Date(a).getTime() -
      new Date(b).getTime(),
  );
}

function periodType(
  fact: SecFactUnit,
):
  | "annual"
  | "quarterly"
  | null {
  if (
    !fact.start ||
    !fact.end
  ) {
    return null;
  }

  const duration =
    new Date(
      fact.end,
    ).getTime() -
    new Date(
      fact.start,
    ).getTime();

  const days =
    duration /
    (1000 * 60 * 60 * 24);

  if (
    days >= 300 &&
    days <= 400
  ) {
    return "annual";
  }

  if (
    days >= 70 &&
    days <= 120
  ) {
    return "quarterly";
  }

  return null;
}

function chooseUsdUnit(
  fact: SecFact,
): SecFactUnit[] {
  if (
    !fact.units
  ) {
    return [];
  }

  if (
    fact.units.USD
  ) {
    return fact.units.USD;
  }

  const first =
    Object.values(
      fact.units,
    )[0];

  return first ?? [];
}

function selectLatestFacts(
  facts: SecFactUnit[],
  periods: number,
): SecFactUnit[] {
  const candidates =
    facts.filter(
      (fact) =>
        typeof fact.val ===
          "number" &&
        Boolean(fact.end) &&
        Boolean(
          periodType(fact),
        ),
    );

  const annual =
    candidates
      .filter(
        (fact) =>
          periodType(
            fact,
          ) === "annual",
      )
      .sort(
        (a, b) =>
          new Date(
            b.end!,
          ).getTime() -
          new Date(
            a.end!,
          ).getTime(),
      )
      .slice(
        0,
        periods,
      );

  const quarterly =
    candidates
      .filter(
        (fact) =>
          periodType(
            fact,
          ) === "quarterly",
      )
      .sort(
        (a, b) =>
          new Date(
            b.end!,
          ).getTime() -
          new Date(
            a.end!,
          ).getTime(),
      )
      .slice(
        0,
        periods * 4,
      );

  return [
    ...annual,
    ...quarterly,
  ];
}

function factKey(
  metric:
    HistoricalFundamentalMetricName,
  fact: SecFactUnit,
): string {
  return [
    metric,
    periodType(fact),
    fact.end,
  ].join("|");
}

function toObservation(
  metric:
    HistoricalFundamentalMetricName,
  fact: SecFactUnit,
): HistoricalFundamentalObservation | null {
  if (
    typeof fact.val !==
      "number" ||
    !fact.end
  ) {
    return null;
  }

  const period =
    periodType(fact);

  if (!period) {
    return null;
  }

  return {
    metric,

    value:
      Number.isFinite(
        fact.val,
      )
        ? fact.val
        : null,

    currency:
      "USD",

    period,

    periodStart:
      fact.start ?? null,

    periodEnd:
      fact.end,

    fiscalYear:
      typeof fact.fy ===
      "number"
        ? fact.fy
        : null,

    fiscalPeriod:
      fact.fp ?? null,

    filingDate:
      fact.filed ?? null,

    form:
      fact.form ?? null,

    source:
      "SEC XBRL Company Facts",

    quality:
      "structured-verified",
  };
}

async function fetchJson<T>(
  url: string,
): Promise<T> {
  const response =
    await fetch(
      url,
      {
        method:
          "GET",

        headers:
          secHeaders(),

        cache:
          "no-store",
      },
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `SEC request failed: HTTP ${response.status}.`,
    );
  }

  return (
    await response.json()
  ) as T;
}

async function resolveCik(
  symbol: string,
): Promise<string | null> {
  const payload =
    await fetchJson<
      Record<
        string,
        SecTickerEntry
      >
    >(
      SEC_TICKER_URL,
    );

  const target =
    symbol
      .trim()
      .toUpperCase();

  for (
    const entry of Object.values(
      payload,
    )
  ) {
    if (
      entry.ticker
        ?.trim()
        .toUpperCase() ===
      target &&
      typeof entry.cik_str ===
        "number"
    ) {
      return String(
        Math.trunc(
          entry.cik_str,
        ),
      ).padStart(
        10,
        "0",
      );
    }
  }

  return null;
}

function buildFreeCashFlow(
  observations:
    HistoricalFundamentalObservation[],
): HistoricalFundamentalObservation[] {
  const operating =
    new Map<string, HistoricalFundamentalObservation>();

  const capex =
    new Map<string, HistoricalFundamentalObservation>();

  for (
    const observation of
    observations
  ) {
    const key = [
      observation.period,
      observation.periodEnd,
    ].join("|");

    if (
      observation.metric ===
      "operatingCashFlow"
    ) {
      operating.set(
        key,
        observation,
      );
    }

    if (
      observation.metric ===
      "capitalExpenditures"
    ) {
      capex.set(
        key,
        observation,
      );
    }
  }

  const output:
    HistoricalFundamentalObservation[] =
    [];

  for (
    const [key, ocf] of
    operating
  ) {
    const spending =
      capex.get(key);

    if (
      !spending ||
      ocf.value === null ||
      spending.value === null
    ) {
      continue;
    }

    output.push({
      metric:
        "freeCashFlow",

      value:
        ocf.value -
        Math.abs(
          spending.value,
        ),

      currency:
        "USD",

      period:
        ocf.period,

      periodStart:
        ocf.periodStart,

      periodEnd:
        ocf.periodEnd,

      fiscalYear:
        ocf.fiscalYear,

      fiscalPeriod:
        ocf.fiscalPeriod,

      filingDate:
        ocf.filingDate,

      form:
        ocf.form,

      source:
        "SEC XBRL Company Facts / derived FCF",

      quality:
        "structured-verified",
    });
  }

  return output;
}

async function retrieveSecSeries(
  symbol: string,
  periods: number,
): Promise<{
  observations:
    HistoricalFundamentalObservation[];

  cik:
    string;
}> {
  const cik =
    await resolveCik(
      symbol,
    );

  if (!cik) {
    throw new Error(
      `SEC ticker mapping not found for ${symbol}.`,
    );
  }

  const companyFacts =
    await fetchJson<SecCompanyFacts>(
      `${SEC_COMPANY_FACTS_URL}/CIK${cik}.json`,
    );

  const facts =
    companyFacts.facts?.[
      "us-gaap"
    ];

  if (!facts) {
    throw new Error(
      "SEC US-GAAP company facts are unavailable.",
    );
  }

  const observations:
    HistoricalFundamentalObservation[] =
    [];

  const metricNames:
    HistoricalFundamentalMetricName[] =
    [
      "revenue",
      "netIncome",
      "totalAssets",
      "totalLiabilities",
      "stockholdersEquity",
      "operatingCashFlow",
      "capitalExpenditures",
    ];

  for (
    const metric of
    metricNames
  ) {
    const tags =
      METRIC_TAGS[metric];

    let selected:
      SecFactUnit[] = [];

    for (
      const tag of tags
    ) {
      const fact =
        facts[tag];

      if (!fact) {
        continue;
      }

      const candidate =
        selectLatestFacts(
          chooseUsdUnit(
            fact,
          ),
          periods,
        );

      if (
        candidate.length >
        selected.length
      ) {
        selected =
          candidate;
      }
    }

    const unique =
      new Map<
        string,
        SecFactUnit
      >();

    for (
      const fact of selected
    ) {
      unique.set(
        factKey(
          metric,
          fact,
        ),
        fact,
      );
    }

    for (
      const fact of
      unique.values()
    ) {
      const observation =
        toObservation(
          metric,
          fact,
        );

      if (
        observation
      ) {
        observations.push(
          observation,
        );
      }
    }
  }

  observations.push(
    ...buildFreeCashFlow(
      observations,
    ),
  );

  observations.sort(
    (a, b) => {
      const dateCompare =
        new Date(
          b.periodEnd,
        ).getTime() -
        new Date(
          a.periodEnd,
        ).getTime();

      if (
        dateCompare !==
        0
      ) {
        return dateCompare;
      }

      return a.metric.localeCompare(
        b.metric,
      );
    },
  );

  return {
    observations,
    cik,
  };
}

function emptySeries(
  symbol: string,
  market: MarketRegion,
  provider: string,
  limitations: string[],
): MarketHistoricalFundamentalSeries {
  return {
    contractVersion:
      "C162.2",

    symbol,

    market,

    provider,

    structured:
      false,

    observations: [],

    metricNames: [
      "revenue",
      "netIncome",
      "totalAssets",
      "totalLiabilities",
      "stockholdersEquity",
      "operatingCashFlow",
      "capitalExpenditures",
      "freeCashFlow",
    ],

    observationCount:
      0,

    annualObservationCount:
      0,

    quarterlyObservationCount:
      0,

    latestPeriodEnd:
      null,

    earliestPeriodEnd:
      null,

    restatementAware:
      false,

    fiscalPeriodNormalized:
      false,

    threeStatementReconciled:
      false,

    limitations,

    humanVerificationRequired:
      true,
  };
}

export async function runMarketHistoricalFundamentalSeries(
  request: MarketHistoricalFundamentalSeriesRequest,
): Promise<MarketHistoricalFundamentalSeriesResult> {
  const startedAt =
    Date.now();

  const rawSymbol =
    request.symbol
      .trim()
      .toUpperCase();

  if (!rawSymbol) {
    throw new Error(
      "symbol is required.",
    );
  }

  const market =
    detectMarket(
      rawSymbol,
      request.market ?? null,
    );

  const symbol =
    normalizeMarketSymbol(
      rawSymbol,
      market,
    );

  const periods =
    Math.min(
      10,
      Math.max(
        1,
        Math.floor(
          request.periods ??
            5,
        ),
      ),
    );

  let series:
    MarketHistoricalFundamentalSeries;

  if (
    market !== "us"
  ) {
    series =
      emptySeries(
        symbol,
        market,
        "none",
        [
          "C162.2 currently has a structured historical financial provider only for the US SEC/XBRL path.",
          "HK/CN historical financial statements are not synthesized from web evidence.",
          "No historical observation is promoted without a structured source.",
          "Regional financial statement providers will be added before valuation depends on this series.",
        ],
      );
  } else {
    try {
      const sec =
        await retrieveSecSeries(
          symbol,
          periods,
        );

      const observations =
        sec.observations;

      const annualObservationCount =
        observations.filter(
          (item) =>
            item.period ===
            "annual",
        ).length;

      const quarterlyObservationCount =
        observations.filter(
          (item) =>
            item.period ===
            "quarterly",
        ).length;

      const dates =
        uniqueSorted(
          observations.map(
            (item) =>
              item.periodEnd,
          ),
        );

      series = {
        contractVersion:
          "C162.2",

        symbol,

        market,

        provider:
          "SEC XBRL Company Facts",

        structured:
          observations.length >
          0,

        observations,

        metricNames: [
          "revenue",
          "netIncome",
          "totalAssets",
          "totalLiabilities",
          "stockholdersEquity",
          "operatingCashFlow",
          "capitalExpenditures",
          "freeCashFlow",
        ],

        observationCount:
          observations.length,

        annualObservationCount,

        quarterlyObservationCount,

        latestPeriodEnd:
          dates.at(-1) ??
          null,

        earliestPeriodEnd:
          dates.at(0) ??
          null,

        restatementAware:
          false,

        fiscalPeriodNormalized:
          true,

        threeStatementReconciled:
          false,

        limitations: [
          "SEC XBRL facts are structured source data, not a complete normalized three-statement model.",
          "Restatement lineage and amended-filing reconciliation are not yet implemented.",
          "GAAP tag selection uses a controlled fallback mapping and requires human verification.",
          "Free cash flow is derived as operating cash flow minus absolute capital expenditures.",
          "C162.2 does not generate forecasts, valuation or trading instructions.",
        ],

        humanVerificationRequired:
          true,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "SEC historical fundamental retrieval failed.";

      series =
        emptySeries(
          symbol,
          market,
          "SEC XBRL Company Facts",
          [
            message,
            "Historical financial data is not promoted when SEC retrieval cannot be verified.",
            "Set SEC_USER_AGENT to a declared contact string before using SEC programmatic access.",
          ],
        );
    }
  }

  const code =
    series.observationCount >=
    8
      ? "C162_2_HISTORICAL_FUNDAMENTAL_SERIES_PASS"
      : series.observationCount > 0
        ? "C162_2_HISTORICAL_FUNDAMENTAL_SERIES_PARTIAL"
        : "C162_2_HISTORICAL_FUNDAMENTAL_SERIES_INSUFFICIENT";

  return {
    success:
      series.observationCount >
      0,

    code,

    series,

    upstream: {
      marketData:
        "C147.2",

      fundamentalContract:
        "C162.1",

      researchDossier:
        "C156",
    },

    boundary: {
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
      "C162.2 Historical Fundamental Series",
      "C163 Institutional Valuation",
      "Human Verification",
    ],

    disclaimer:
      "C162.2 provides structured historical fundamental observations where a verifiable financial-data source exists. It does not provide investment recommendations or trading instructions.",

    generatedAt:
      new Date().toISOString(),

    latencyMs:
      Date.now() -
      startedAt,
  };
}
