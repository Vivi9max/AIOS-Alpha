import {
  analyzeMarketRequest,
} from "./market-router";

import {
  runMarketHistoricalFundamentalSeries,
} from "./market-historical-fundamental-series-runtime";

import type {
  MarketAnalysisResult,
} from "./market-types";

import type {
  MarketHistoricalFundamentalSeries,
  HistoricalFundamentalMetricName,
} from "./market-historical-fundamental-series-types";

import type {
  MarketValuationAssumptions,
  MarketValuationCandidateInput,
  MarketValuationCandidateResult,
  MarketValuationMetric,
  MarketValuationRequest,
  MarketValuationResult,
  MarketValuationScenario,
} from "./valuation-types";

interface NormalizedValuationAssumptions {
  peLow: number;
  peBase: number;
  peHigh: number;

  pbLow: number;
  pbBase: number;
  pbHigh: number;

  revenueGrowthLow: number;
  revenueGrowthBase: number;
  revenueGrowthHigh: number;
}

interface HistoricalGrowthContext {
  revenueGrowth:
    number | null;

  netIncomeGrowth:
    number | null;

  freeCashFlowGrowth:
    number | null;
}

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.max(
    min,
    Math.min(
      max,
      value,
    ),
  );
}

function round(
  value: number,
): number {
  return Math.round(
    value * 100,
  ) / 100;
}

function positiveOrNull(
  value: unknown,
): number | null {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value,
    ) ||
    value <= 0
  ) {
    return null;
  }

  return value;
}

function nullableNumber(
  value: unknown,
): number | null {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value,
    )
  ) {
    return null;
  }

  return value;
}

function normalizeAssumptions(
  assumptions?:
    | MarketValuationAssumptions
    | null,
): NormalizedValuationAssumptions {
  const peLow =
    positiveOrNull(
      assumptions?.peLow,
    );

  const peBase =
    positiveOrNull(
      assumptions?.peBase,
    );

  const peHigh =
    positiveOrNull(
      assumptions?.peHigh,
    );

  const pbLow =
    positiveOrNull(
      assumptions?.pbLow,
    );

  const pbBase =
    positiveOrNull(
      assumptions?.pbBase,
    );

  const pbHigh =
    positiveOrNull(
      assumptions?.pbHigh,
    );

  const revenueGrowthLow =
    typeof assumptions?.revenueGrowthLow ===
        "number" &&
    Number.isFinite(
      assumptions.revenueGrowthLow,
    )
      ? assumptions.revenueGrowthLow
      : -0.05;

  const revenueGrowthBase =
    typeof assumptions?.revenueGrowthBase ===
        "number" &&
    Number.isFinite(
      assumptions.revenueGrowthBase,
    )
      ? assumptions.revenueGrowthBase
      : 0.05;

  const revenueGrowthHigh =
    typeof assumptions?.revenueGrowthHigh ===
        "number" &&
    Number.isFinite(
      assumptions.revenueGrowthHigh,
    )
      ? assumptions.revenueGrowthHigh
      : 0.15;

  return {
    peLow:
      peLow ?? 10,

    peBase:
      peBase ?? 15,

    peHigh:
      peHigh ?? 20,

    pbLow:
      pbLow ?? 0.8,

    pbBase:
      pbBase ?? 1.5,

    pbHigh:
      pbHigh ?? 2.5,

    revenueGrowthLow,

    revenueGrowthBase,

    revenueGrowthHigh,
  };
}

function assessMultiple(
  value: number | null,
  referenceBase: number,
):
  | "low"
  | "moderate"
  | "high"
  | "unavailable" {
  if (
    value === null ||
    !Number.isFinite(
      value,
    ) ||
    value <= 0
  ) {
    return "unavailable";
  }

  if (
    value <
    referenceBase * 0.8
  ) {
    return "low";
  }

  if (
    value >
    referenceBase * 1.2
  ) {
    return "high";
  }

  return "moderate";
}

function metricQuality(
  result: MarketAnalysisResult,
  field:
    | "pe"
    | "pb"
    | "eps"
    | "revenue"
    | "revenueGrowth"
    | "marketCap",
): MarketValuationMetric["quality"] {
  const value =
    result.snapshot[field];

  if (
    value === null ||
    value === undefined
  ) {
    return "missing";
  }

  if (
    result.verification
      .structuredDataVerified
  ) {
    return "verified-structured";
  }

  if (
    result.evidence.length >
    0
  ) {
    return "web-evidence";
  }

  return "missing";
}

function buildMetrics(
  result: MarketAnalysisResult,
): MarketValuationMetric[] {
  const fields:
    Array<
      Extract<
        MarketValuationMetric["metric"],
        | "pe"
        | "pb"
        | "eps"
        | "revenue"
        | "revenueGrowth"
        | "marketCap"
      >
    > = [
      "pe",
      "pb",
      "eps",
      "revenue",
      "revenueGrowth",
      "marketCap",
    ];

  return fields.map(
    (
      field,
    ) => {
      const value =
        result.snapshot[field] ??
        null;

      const available =
        typeof value ===
          "number" &&
        Number.isFinite(
          value,
        );

      let interpretation =
        "Data unavailable.";

      if (available) {
        switch (field) {
          case "pe":
            interpretation =
              "Current price-to-earnings multiple observed from available market evidence.";
            break;

          case "pb":
            interpretation =
              "Current price-to-book multiple observed from available market evidence.";
            break;

          case "eps":
            interpretation =
              "Observed earnings-per-share input used only when available.";
            break;

          case "revenue":
            interpretation =
              "Observed revenue input used for fundamental context.";
            break;

          case "revenueGrowth":
            interpretation =
              "Observed revenue-growth input used for scenario context.";
            break;

          case "marketCap":
            interpretation =
              "Observed market-capitalization input.";
            break;
        }
      }

      return {
        metric:
          field,

        value,

        available,

        quality:
          metricQuality(
            result,
            field,
          ),

        interpretation,
      };
    },
  );
}

function latestObservation(
  series: MarketHistoricalFundamentalSeries,
  metric:
    HistoricalFundamentalMetricName,
) {
  return series.observations
    .filter(
      (observation) =>
        observation.metric ===
          metric &&
        observation.value !==
          null,
    )
    .sort(
      (a, b) =>
        new Date(
          b.periodEnd,
        ).getTime() -
        new Date(
          a.periodEnd,
        ).getTime(),
    )[0] ?? null;
}

function previousObservation(
  series: MarketHistoricalFundamentalSeries,
  metric:
    HistoricalFundamentalMetricName,
  latestPeriod: "annual" | "quarterly",
  latestEnd: string,
) {
  const candidates =
    series.observations
      .filter(
        (observation) =>
          observation.metric ===
            metric &&
          observation.period ===
            latestPeriod &&
          observation.periodEnd !==
            latestEnd &&
          observation.value !==
            null,
      )
      .sort(
        (a, b) =>
          new Date(
            b.periodEnd,
          ).getTime() -
          new Date(
            a.periodEnd,
          ).getTime(),
      );

  return (
    candidates[0] ??
    null
  );
}

function growthFromObservations(
  series: MarketHistoricalFundamentalSeries,
  metric:
    HistoricalFundamentalMetricName,
): number | null {
  const latest =
    latestObservation(
      series,
      metric,
    );

  if (
    !latest ||
    latest.value ===
      null
  ) {
    return null;
  }

  const previous =
    previousObservation(
      series,
      metric,
      latest.period,
      latest.periodEnd,
    );

  if (
    !previous ||
    previous.value ===
      null ||
    previous.value === 0
  ) {
    return null;
  }

  const growth =
    (
      latest.value -
      previous.value
    ) /
    Math.abs(
      previous.value,
    );

  if (
    !Number.isFinite(
      growth,
    )
  ) {
    return null;
  }

  return growth;
}

function historicalGrowthContext(
  series:
    | MarketHistoricalFundamentalSeries
    | null,
): HistoricalGrowthContext {
  if (
    !series ||
    series.observationCount ===
      0
  ) {
    return {
      revenueGrowth:
        null,

      netIncomeGrowth:
        null,

      freeCashFlowGrowth:
        null,
    };
  }

  return {
    revenueGrowth:
      growthFromObservations(
        series,
        "revenue",
      ),

    netIncomeGrowth:
      growthFromObservations(
        series,
        "netIncome",
      ),

    freeCashFlowGrowth:
      growthFromObservations(
        series,
        "freeCashFlow",
      ),
  };
}

function historicalMetricQuality(
  series:
    | MarketHistoricalFundamentalSeries
    | null,
  metric:
    HistoricalFundamentalMetricName,
): MarketValuationMetric["quality"] {
  if (
    !series ||
    !series.observations.some(
      (observation) =>
        observation.metric ===
          metric &&
        observation.value !==
          null,
    )
  ) {
    return "missing";
  }

  const hasStructured =
    series.observations.some(
      (observation) =>
        observation.metric ===
          metric &&
        observation.quality ===
          "structured-verified",
    );

  if (
    hasStructured
  ) {
    return "historical-structured";
  }

  if (
    series.observations.some(
      (observation) =>
        observation.metric ===
          metric &&
        observation.quality ===
          "web-evidence",
    )
  ) {
    return "web-evidence";
  }

  return "missing";
}

function buildHistoricalMetrics(
  series:
    | MarketHistoricalFundamentalSeries
    | null,
): MarketValuationMetric[] {
  if (
    !series
  ) {
    return [];
  }

  const mappings:
    Array<{
      metric:
        MarketValuationMetric["metric"];

      historicalMetric:
        HistoricalFundamentalMetricName;

      interpretation:
        string;
    }> = [
      {
        metric:
          "historicalRevenue",

        historicalMetric:
          "revenue",

        interpretation:
          "Latest structured historical revenue observation.",
      },

      {
        metric:
          "historicalNetIncome",

        historicalMetric:
          "netIncome",

        interpretation:
          "Latest structured historical net-income observation.",
      },

      {
        metric:
          "historicalOperatingCashFlow",

        historicalMetric:
          "operatingCashFlow",

        interpretation:
          "Latest structured historical operating-cash-flow observation.",
      },

      {
        metric:
          "historicalFreeCashFlow",

        historicalMetric:
          "freeCashFlow",

        interpretation:
          "Latest structured historical free-cash-flow observation.",
      },
    ];

  return mappings.map(
    ({
      metric,
      historicalMetric,
      interpretation,
    }) => {
      const observation =
        latestObservation(
          series,
          historicalMetric,
        );

      const value =
        observation?.value ??
        null;

      const available =
        typeof value ===
          "number" &&
        Number.isFinite(
          value,
        );

      return {
        metric,

        value,

        available,

        quality:
          historicalMetricQuality(
            series,
            historicalMetric,
          ),

        interpretation:
          available
            ? interpretation
            : "Historical structured data unavailable.",
      };
    },
  );
}

function buildScenario(
  result: MarketAnalysisResult,
  assumptions:
    NormalizedValuationAssumptions,
  name:
    | "low"
    | "base"
    | "high",
  historical:
    HistoricalGrowthContext,
): MarketValuationScenario {
  const eps =
    positiveOrNull(
      result.snapshot.eps,
    );

  const currentPrice =
    positiveOrNull(
      result.snapshot.price,
    );

  const pb =
    positiveOrNull(
      result.snapshot.pb,
    );

  const peReference: number =
    name === "low"
      ? assumptions.peLow
      : name === "base"
        ? assumptions.peBase
        : assumptions.peHigh;

  const pbReference: number =
    name === "low"
      ? assumptions.pbLow
      : name === "base"
        ? assumptions.pbBase
        : assumptions.pbHigh;

  const peImpliedPrice =
    eps !== null
      ? round(
          eps *
          peReference,
        )
      : null;

  const pbImpliedPrice =
    currentPrice !== null &&
    pb !== null &&
    pb > 0
      ? round(
          currentPrice *
          (pbReference / pb),
        )
      : null;

  const prices = [
    peImpliedPrice,
    pbImpliedPrice,
  ].filter(
    (
      value,
    ): value is number =>
      typeof value ===
        "number" &&
      Number.isFinite(
        value,
      ),
  );

  const combinedImpliedPrice =
    prices.length ===
      0
      ? null
      : round(
          prices.reduce(
            (
              total,
              value,
            ) =>
              total + value,
            0,
          ) /
            prices.length,
        );

  const multipleSource =
    peImpliedPrice !== null &&
    pbImpliedPrice !== null
      ? "combined"
      : peImpliedPrice !== null
        ? "pe"
        : pbImpliedPrice !== null
          ? "pb"
          : "unavailable";

  const caveats:
    string[] = [];

  if (
    eps === null
  ) {
    caveats.push(
      "EPS is unavailable or non-positive, so P/E implied price cannot be calculated.",
    );
  }

  if (
    pb === null
  ) {
    caveats.push(
      "Current P/B is unavailable or non-positive, so P/B implied price cannot be calculated.",
    );
  }

  if (
    result.snapshot
      .dataQuality !==
    "live"
  ) {
    caveats.push(
      "Current market data is not verified realtime; valuation inputs may require refreshed structured data.",
    );
  }

  if (
    historical.revenueGrowth ===
    null
  ) {
    caveats.push(
      "Historical revenue growth is unavailable from the structured historical fundamental series.",
    );
  }

  if (
    historical.netIncomeGrowth ===
    null
  ) {
    caveats.push(
      "Historical net-income growth is unavailable from the structured historical fundamental series.",
    );
  }

  if (
    historical.freeCashFlowGrowth ===
    null
  ) {
    caveats.push(
      "Historical free-cash-flow growth is unavailable from the structured historical fundamental series.",
    );
  }

  caveats.push(
    "Reference multiples are explicit modeling assumptions, not forecasts or investment instructions.",
  );

  return {
    name,

    multipleSource,

    referenceMultiple:
      multipleSource ===
        "pe"
        ? peReference
        : multipleSource ===
            "pb"
          ? pbReference
          : null,

    peReference,

    pbReference,

    peImpliedPrice,

    pbImpliedPrice,

    combinedImpliedPrice,

    revenueGrowthReference:
      name === "low"
        ? assumptions.revenueGrowthLow
        : name === "base"
          ? assumptions.revenueGrowthBase
          : assumptions.revenueGrowthHigh,

    historicalRevenueGrowth:
      historical.revenueGrowth,

    historicalNetIncomeGrowth:
      historical.netIncomeGrowth,

    historicalFreeCashFlowGrowth:
      historical.freeCashFlowGrowth,

    caveats,
  };
}

function buildCandidate(
  industry: string,
  input:
    MarketValuationCandidateInput,
  result:
    MarketAnalysisResult,
  assumptions:
    NormalizedValuationAssumptions,
  historicalSeries:
    MarketHistoricalFundamentalSeries | null,
): MarketValuationCandidateResult {
  const metrics =
    [
      ...buildMetrics(
        result,
      ),

      ...buildHistoricalMetrics(
        historicalSeries,
      ),
    ];

  const pe =
    positiveOrNull(
      result.snapshot.pe,
    );

  const pb =
    positiveOrNull(
      result.snapshot.pb,
    );

  const historical =
    historicalGrowthContext(
      historicalSeries,
    );

  const scenarios = [
    buildScenario(
      result,
      assumptions,
      "low",
      historical,
    ),

    buildScenario(
      result,
      assumptions,
      "base",
      historical,
    ),

    buildScenario(
      result,
      assumptions,
      "high",
      historical,
    ),
  ];

  const availableMethods =
    scenarios.filter(
      (
        scenario,
      ) =>
        scenario.combinedImpliedPrice !==
          null ||
        scenario.peImpliedPrice !==
          null ||
        scenario.pbImpliedPrice !==
          null,
    ).length;

  const valuationStatus =
    availableMethods ===
        3
      ? "valuation-ready"
      : availableMethods >
          0
        ? "partial"
        : "insufficient";

  const strengths:
    string[] = [];

  if (
    pe !== null
  ) {
    strengths.push(
      "P/E is available for scenario valuation.",
    );
  }

  if (
    pb !== null
  ) {
    strengths.push(
      "P/B is available for scenario valuation.",
    );
  }

  if (
    result.snapshot.eps !==
      null &&
    result.snapshot.eps !==
      undefined
  ) {
    strengths.push(
      "EPS is available as a fundamental valuation input.",
    );
  }

  if (
    result.evidence.length >=
    3
  ) {
    strengths.push(
      "Multiple external evidence sources are available.",
    );
  }

  if (
    historical.revenueGrowth !==
      null ||
    historical.netIncomeGrowth !==
      null ||
    historical.freeCashFlowGrowth !==
      null
  ) {
    strengths.push(
      "Structured historical fundamental growth context is available.",
    );
  }

  const risks:
    string[] = [
      ...result.analysis.risk
        .factors,
    ];

  if (
    result.snapshot
      .dataQuality !==
    "live"
  ) {
    risks.push(
      "Realtime market price is not currently verified.",
    );
  }

  if (
    result.verification
      .structuredDataVerified ===
    false
  ) {
    risks.push(
      "Structured market data has not been verified for this candidate.",
    );
  }

  if (
    historicalSeries ===
      null ||
    historicalSeries.observationCount ===
      0
  ) {
    risks.push(
      "Structured historical fundamental data is unavailable for this candidate.",
    );
  }

  const methodologyWarnings:
    string[] = [
      "Relative multiples are not a substitute for a complete intrinsic-value model.",

      "Industry-specific normal valuation ranges should be supplied or validated before using the scenarios.",

      "Historical growth and current multiples do not guarantee future returns.",

      `Requested industry context: ${industry}.`,

      "C163.2 historical fundamentals are descriptive historical inputs, not forecasts.",
    ];

  let resultCode:
    | "C149_VALUATION_PASS"
    | "C149_VALUATION_PARTIAL"
    | "C149_VALUATION_INSUFFICIENT";

  if (
    valuationStatus ===
    "valuation-ready"
  ) {
    resultCode =
      "C149_VALUATION_PASS";
  } else if (
    valuationStatus ===
    "partial"
  ) {
    resultCode =
      "C149_VALUATION_PARTIAL";
  } else {
    resultCode =
      "C149_VALUATION_INSUFFICIENT";
  }

  return {
    rank:
      0,

    input,

    normalizedSymbol:
      result.instrument
        .normalizedSymbol,

    currentPrice:
      result.snapshot.price ??
      null,

    currency:
      result.instrument.currency,

    metrics,

    historicalFundamentals: {
      available:
        historicalSeries !==
          null &&
        historicalSeries.observationCount >
          0,

      provider:
        historicalSeries?.provider ??
        "none",

      observationCount:
        historicalSeries?.observationCount ??
        0,

      annualObservationCount:
        historicalSeries?.annualObservationCount ??
        0,

      quarterlyObservationCount:
        historicalSeries?.quarterlyObservationCount ??
        0,

      latestPeriodEnd:
        historicalSeries?.latestPeriodEnd ??
        null,

      earliestPeriodEnd:
        historicalSeries?.earliestPeriodEnd ??
        null,

      revenueLatest:
        latestObservation(
          historicalSeries!,
          "revenue",
        )?.value ??
        null,

      revenuePrevious:
        historicalSeries
          ? previousObservation(
              historicalSeries,
              "revenue",
              latestObservation(
                historicalSeries,
                "revenue",
              )?.period ??
                "annual",
              latestObservation(
                historicalSeries,
                "revenue",
              )?.periodEnd ??
                "",
            )?.value ??
            null
          : null,

      revenueGrowth:
        historical.revenueGrowth,

      netIncomeLatest:
        latestObservation(
          historicalSeries!,
          "netIncome",
        )?.value ??
        null,

      netIncomePrevious:
        historicalSeries
          ? previousObservation(
              historicalSeries,
              "netIncome",
              latestObservation(
                historicalSeries,
                "netIncome",
              )?.period ??
                "annual",
              latestObservation(
                historicalSeries,
                "netIncome",
              )?.periodEnd ??
                "",
            )?.value ??
            null
          : null,

      netIncomeGrowth:
        historical.netIncomeGrowth,

      operatingCashFlowLatest:
        latestObservation(
          historicalSeries!,
          "operatingCashFlow",
        )?.value ??
        null,

      operatingCashFlowPrevious:
        historicalSeries
          ? previousObservation(
              historicalSeries,
              "operatingCashFlow",
              latestObservation(
                historicalSeries,
                "operatingCashFlow",
              )?.period ??
                "annual",
              latestObservation(
                historicalSeries,
                "operatingCashFlow",
              )?.periodEnd ??
                "",
            )?.value ??
            null
          : null,

      freeCashFlowLatest:
        latestObservation(
          historicalSeries!,
          "freeCashFlow",
        )?.value ??
        null,

      freeCashFlowPrevious:
        historicalSeries
          ? previousObservation(
              historicalSeries,
              "freeCashFlow",
              latestObservation(
                historicalSeries,
                "freeCashFlow",
              )?.period ??
                "annual",
              latestObservation(
                historicalSeries,
                "freeCashFlow",
              )?.periodEnd ??
                "",
            )?.value ??
            null
          : null,

      series:
        historicalSeries,

      quality:
        historicalSeries &&
        historicalSeries.observationCount >
          0
          ? "structured-verified"
          : "insufficient",

      limitations:
        historicalSeries?.limitations ??
        [
          "No structured historical fundamental series was available.",
        ],

      humanVerificationRequired:
        true,
    },

    currentValuation: {
      pe,

      pb,

      peAssessment:
        assessMultiple(
          pe,
          assumptions.peBase,
        ),

      pbAssessment:
        assessMultiple(
          pb,
          assumptions.pbBase,
        ),
    },

    scenarios,

    valuationStatus,

    strengths,

    risks,

    methodologyWarnings,

    sourceResult:
      result,

    resultCode,
  };
}

async function evaluateCandidate(
  industry: string,
  input:
    MarketValuationCandidateInput,
  request:
    MarketValuationRequest,
  assumptions:
    NormalizedValuationAssumptions,
): Promise<MarketValuationCandidateResult> {
  const result =
    await analyzeMarketRequest(
      {
        symbol:
          input.symbol,

        market:
          input.market,

        mode:
          "valuation",

        query: [
          industry,

          request.query ??
            "",

          "company fundamentals earnings valuation P/E P/B revenue growth financial results",
        ]
          .filter(Boolean)
          .join(" "),
      },
    );

  let historicalSeries:
    MarketHistoricalFundamentalSeries |
    null =
      null;

  if (
    request.includeHistoricalFundamentals !==
    false
  ) {
    try {
      const historicalResult =
        await runMarketHistoricalFundamentalSeries(
          {
            symbol:
              input.symbol,

            market:
              input.market,

            periods:
              request.historicalPeriods ??
              5,
          },
        );

      historicalSeries =
        historicalResult.series;
    } catch {
      historicalSeries =
        null;
    }
  }

  return buildCandidate(
    industry,
    input,
    result,
    assumptions,
    historicalSeries,
  );
}

export async function valueMarketCandidates(
  request:
    MarketValuationRequest,
): Promise<MarketValuationResult> {
  const industry =
    request.industry.trim();

  if (!industry) {
    throw new Error(
      "industry is required.",
    );
  }

  const assumptions =
    normalizeAssumptions(
      request.assumptions,
    );

  const maxCandidates =
    clamp(
      Math.floor(
        request.maxCandidates ??
          8,
      ),
      1,
      12,
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
      maxCandidates,
    );

  if (
    uniqueCandidates.length ===
    0
  ) {
    throw new Error(
      "At least one candidate is required.",
    );
  }

  const candidates:
    MarketValuationCandidateResult[] =
    [];

  for (
    const candidate of
      uniqueCandidates
  ) {
    try {
      const result =
        await evaluateCandidate(
          industry,
          candidate,
          request,
          assumptions,
        );

      candidates.push(
        result,
      );
    } catch (
      error
    ) {
      const message =
        error instanceof Error
          ? error.message
          : "Candidate valuation failed.";

      candidates.push({
        rank:
          0,

        input:
          candidate,

        normalizedSymbol:
          candidate.symbol,

        currentPrice:
          null,

        currency:
          candidate.market ===
          "hk"
            ? "HKD"
            : candidate.market ===
                "cn"
              ? "CNY"
              : "USD",

        metrics: [],

        historicalFundamentals: {
          available:
            false,

          provider:
            "unavailable",

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

          revenueLatest:
            null,

          revenuePrevious:
            null,

          revenueGrowth:
            null,

          netIncomeLatest:
            null,

          netIncomePrevious:
            null,

          netIncomeGrowth:
            null,

          operatingCashFlowLatest:
            null,

          operatingCashFlowPrevious:
            null,

          freeCashFlowLatest:
            null,

          freeCashFlowPrevious:
            null,

          series:
            null,

          quality:
            "insufficient",

          limitations: [
            message,
          ],

          humanVerificationRequired:
            true,
        },

        currentValuation: {
          pe:
            null,

          pb:
            null,

          peAssessment:
            "unavailable",

          pbAssessment:
            "unavailable",
        },

        scenarios: [],

        valuationStatus:
          "insufficient",

        strengths: [],

        risks: [
          message,
        ],

        methodologyWarnings: [
          "Candidate valuation could not be completed.",
        ],

        sourceResult: {
          success:
            false,

          code:
            "C147_2_MARKET_EVIDENCE_INSUFFICIENT",

          instrument: {
            symbol:
              candidate.symbol,

            normalizedSymbol:
              candidate.symbol,

            market:
              candidate.market ??
              "us",

            exchange:
              "UNKNOWN",

            currency:
              candidate.market ===
              "hk"
                ? "HKD"
                : candidate.market ===
                    "cn"
                  ? "CNY"
                  : "USD",
          },

          snapshot: {
            dataQuality:
              "insufficient",

            liveQuoteAvailable:
              false,
          },

          analysis: {
            industry: {
              summary:
                "Candidate valuation failed.",

              evidence: [],
            },

            company: {
              summary:
                message,

              strengths: [],

              risks: [
                message,
              ],
            },

            fundamentals: {
              assessment:
                "Unavailable.",

              signals: [],
            },

            valuation: {
              assessment:
                "Unavailable.",

              signals: [],
            },

            trend: {
              assessment:
                "Unavailable.",

              signals: [],
            },

            risk: {
              level:
                "unknown",

              factors: [
                message,
              ],
            },

            decisionSupport: {
              currentState:
                "Unavailable.",

              supportingFactors:
                [],

              invalidationConditions:
                [],

              watchMetrics:
                [],

              scenarios:
                [],
            },
          },

          evidence: [],

          verification: {
            verified:
              false,

            sourceCount:
              0,

            independentDomains:
              0,

            primarySourceFound:
              false,

            structuredDataAvailable:
              false,

            structuredDataVerified:
              false,

            freshness: {
              freshness:
                "unknown",

              ageMinutes:
                null,

              ageHours:
                null,

              referenceTime:
                null,

              reason:
                "Candidate valuation failed.",
            },
          },

          provider: {
            provider:
              "unavailable",

            configured:
              false,

            available:
              false,

            supportsQuote:
              false,

            supportsHistorical:
              false,

            supportsFundamentals:
              false,

            supportsMarkets:
              [],
          },

          metadata: {
            runtime:
              "aios-alpha",

            stage:
              "C147.2.7",

            analysisMode:
              "valuation",

            generatedAt:
              new Date().toISOString(),

            disclaimer:
              "Research-only valuation analysis.",
          },

          error:
            message,
        },

        resultCode:
          "C149_VALUATION_ERROR",
      });
    }
  }

  candidates.sort(
    (
      a,
      b,
    ) => {
      const aPrice =
        a.currentPrice ??
        Number.POSITIVE_INFINITY;

      const bPrice =
        b.currentPrice ??
        Number.POSITIVE_INFINITY;

      if (
        a.valuationStatus !==
        b.valuationStatus
      ) {
        return (
          a.valuationStatus ===
          "valuation-ready"
            ? -1
            : b.valuationStatus ===
                "valuation-ready"
              ? 1
              : 0
        );
      }

      return (
        aPrice -
        bPrice
      );
    },
  );

  candidates.forEach(
    (
      candidate,
      index,
    ) => {
      candidate.rank =
        index + 1;
    },
  );

  const readyCount =
    candidates.filter(
      (
        candidate,
      ) =>
        candidate.valuationStatus ===
        "valuation-ready",
    ).length;

  let code:
    | "C149_VALUATION_PASS"
    | "C149_VALUATION_PARTIAL"
    | "C149_VALUATION_INSUFFICIENT";

  if (
    readyCount ===
      candidates.length &&
    candidates.length > 0
  ) {
    code =
      "C149_VALUATION_PASS";
  } else if (
    readyCount > 0
  ) {
    code =
      "C149_VALUATION_PARTIAL";
  } else {
    code =
      "C149_VALUATION_INSUFFICIENT";
  }

  return {
    success:
      candidates.length > 0,

    code,

    stage:
      "C149",

    industry,

    requestedCandidates:
      request.candidates.length,

    evaluatedCandidates:
      candidates.length,

    candidates,

    historicalFundamentalCoverage: {
      requested:
        request.includeHistoricalFundamentals !==
        false,

      availableCandidates:
        candidates.filter(
          (candidate) =>
            candidate.historicalFundamentals
              .available,
        ).length,

      structuredCandidates:
        candidates.filter(
          (candidate) =>
            candidate.historicalFundamentals
              .quality ===
            "structured-verified",
        ).length,

      unavailableCandidates:
        candidates.filter(
          (candidate) =>
            !candidate.historicalFundamentals
              .available,
        ).length,
    },

    methodology: {
      purpose:
        "Transparent research-stage relative valuation using P/E and P/B scenario multiples with structured historical fundamental context when available.",

      methods: [
        "P/E scenario valuation when positive EPS is available.",

        "P/B scenario valuation when current P/B and current price are available.",

        "Combined scenario value uses the arithmetic mean of available P/E and P/B implied prices.",

        "Low/base/high scenarios are explicit assumption ranges, not predicted future prices.",

        "C162.2 structured historical revenue, net income, operating cash flow and free cash flow are used as descriptive historical context.",

        "Historical growth is calculated from the latest and immediately preceding comparable structured observation.",

        "Revenue-growth assumptions are recorded as scenario context and are not converted into guaranteed returns.",
      ],

      assumptions,

      historicalFundamentalRole: [
        "Historical revenue growth provides descriptive fundamental context.",

        "Historical net-income growth provides descriptive earnings context.",

        "Historical free-cash-flow growth provides descriptive cash-generation context.",

        "Historical observations do not constitute forecasts.",
      ],

      excludedFromDecision: [
        "Predicted future return.",

        "Guaranteed target price.",

        "Personalized investment advice.",

        "Automatic buy/sell instruction.",

        "Portfolio allocation.",

        "Automated trading.",
      ],

      nextStage:
        "C150",
    },

    safetyBoundary: {
      founderOnly:
        true,

      personalizedAdvice:
        false,

      returnPrediction:
        false,

      automaticBuySellInstruction:
        false,

      plannerDispatched:
        false,

      tradingExecuted:
        false,

      humanReviewRequiredBeforeTrading:
        true,
    },

    generatedAt:
      new Date().toISOString(),
  };
}
