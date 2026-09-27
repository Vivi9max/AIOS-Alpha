import type {
  MarketValuationAssumptions,
  MarketValuationCandidateInput,
  MarketValuationRequest,
} from "./valuation-types";
import type {
  MarketHistoricalValuationContext,
} from "./market-historical-valuation-context-types";
import type {
  MarketHistoricalValuationAdapterRequest,
  MarketHistoricalValuationAdapterResult,
} from "./market-historical-valuation-adapter-types";
function finiteOrNull(
  value: number | null | undefined,
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return null;
  }
  return value;
}
function normalizeSymbol(
  value: string,
): string {
  return value
    .trim()
    .toUpperCase();
}
function buildAssumptions(
  historicalContext:
    MarketHistoricalValuationContext | null,
  supplied:
    MarketValuationAssumptions | null | undefined,
): MarketValuationAssumptions {
  const historicalGrowth =
    finiteOrNull(
      historicalContext?.revenueGrowth,
    );
  /*
   * C149 keeps explicit scenario assumptions.
   *
   * Historical revenue growth is mapped only to the
   * revenueGrowthReference fields. It is NOT converted
   * into a price target or forecast.
   */
  if (
    historicalGrowth === null
  ) {
    return {
      ...(supplied ?? {}),
    };
  }
  const existingLow =
    finiteOrNull(
      supplied?.revenueGrowthLow,
    );
  const existingBase =
    finiteOrNull(
      supplied?.revenueGrowthBase,
    );
  const existingHigh =
    finiteOrNull(
      supplied?.revenueGrowthHigh,
    );
  return {
    ...(supplied ?? {}),
    revenueGrowthLow:
      existingLow ??
      historicalGrowth,
    revenueGrowthBase:
      existingBase ??
      historicalGrowth,
    revenueGrowthHigh:
      existingHigh ??
      historicalGrowth,
  };
}
function buildCandidate(
  request:
    MarketHistoricalValuationAdapterRequest,
): MarketValuationCandidateInput {
  return {
    symbol:
      normalizeSymbol(
        request.symbol,
      ),
    market:
      request.market ??
      null,
    name:
      request.name ??
      null,
  };
}
function determineCode(
  historicalContext:
    MarketHistoricalValuationContext | null,
):
  | "C163_4_VALUATION_ADAPTER_PASS"
  | "C163_4_VALUATION_ADAPTER_PARTIAL"
  | "C163_4_VALUATION_ADAPTER_INSUFFICIENT" {
  if (
    historicalContext === null
  ) {
    return "C163_4_VALUATION_ADAPTER_INSUFFICIENT";
  }
  if (
    historicalContext.historicalDataQuality ===
    "structured-verified"
  ) {
    return "C163_4_VALUATION_ADAPTER_PASS";
  }
  if (
    historicalContext.historicalDataQuality ===
    "partial"
  ) {
    return "C163_4_VALUATION_ADAPTER_PARTIAL";
  }
  return "C163_4_VALUATION_ADAPTER_INSUFFICIENT";
}
export function buildHistoricalValuationRequest(
  request:
    MarketHistoricalValuationAdapterRequest,
): MarketHistoricalValuationAdapterResult {
  const symbol =
    normalizeSymbol(
      request.symbol,
    );
  if (!symbol) {
    throw new Error(
      "symbol is required.",
    );
  }
  if (
    !request.industry.trim()
  ) {
    throw new Error(
      "industry is required.",
    );
  }
  const historicalContext =
    request.historicalContext ??
    null;
  const assumptions =
    buildAssumptions(
      historicalContext,
      request.assumptions,
    );
  const candidate =
    buildCandidate({
      ...request,
      symbol,
    });
  const valuationRequest:
    MarketValuationRequest = {
    industry:
      request.industry.trim(),
    candidates: [
      candidate,
    ],
    maxCandidates:
      1,
    query:
      null,
    assumptions,
  };
  const code =
    determineCode(
      historicalContext,
    );
  const historicalContextUsable =
    Boolean(
      historicalContext &&
      historicalContext.historicalDataUsableForValuation,
    );
  const limitations: string[] = [
    "C163.4 is an adapter layer between historical fundamentals and the frozen C149 valuation request contract.",
    "Historical growth is descriptive context only and is not a forecast.",
    "Historical growth is not converted into a target price.",
    "The adapter does not modify C149 valuation-types.ts.",
    "The adapter does not modify C149 valuation-engine.ts.",
    "P/E and P/B assumptions remain explicit modeling inputs.",
    "A historical growth signal does not establish future returns.",
    "Human verification is required before using the adapted request for valuation review.",
  ];
  if (
    historicalContext === null
  ) {
    limitations.push(
      "No C163.4 historical context was supplied; the C149 request remains usable only with its explicit assumptions.",
    );
  } else if (
    historicalContext.historicalDataQuality !==
    "structured-verified"
  ) {
    limitations.push(
      "Historical context is not fully structured-verified; the adapted request should be treated as partial historical context.",
    );
  }
  return {
    success:
      historicalContextUsable,
    code,
    sourceContract:
      "C163.4",
    targetContract:
      "C149",
    historicalContextAvailable:
      historicalContext !== null,
    historicalContextUsable,
    request:
      valuationRequest,
    historicalInputs: {
      revenueGrowth:
        finiteOrNull(
          historicalContext?.revenueGrowth,
        ),
      netIncomeGrowth:
        finiteOrNull(
          historicalContext?.netIncomeGrowth,
        ),
      operatingCashFlowGrowth:
        finiteOrNull(
          historicalContext?.operatingCashFlowGrowth,
        ),
      freeCashFlowGrowth:
        finiteOrNull(
          historicalContext?.freeCashFlowGrowth,
        ),
      sourceQuality:
        historicalContext?.historicalDataQuality ??
        "insufficient",
    },
    methodology: {
      historicalGrowthUsedAsScenarioContext:
        historicalContext !== null &&
        historicalContext.historicalDataUsableForValuation,
      historicalGrowthUsedAsForecast:
        false,
      historicalGrowthUsedAsTargetPrice:
        false,
      recommendationGenerated:
        false,
      plannerDispatched:
        false,
      tradingExecuted:
        false,
    },
    limitations,
    humanVerificationRequired:
      true,
    generatedAt:
      new Date().toISOString(),
  };
}
