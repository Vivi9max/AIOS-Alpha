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
/**
 * C163.5 semantic boundary:
 *
 * Historical growth data from C162.2 / C163.4
 * must remain historical context.
 *
 * It must NOT automatically populate the
 * C149 Low / Base / High valuation assumptions,
 * because doing so would make historical data
 * appear to be a forward-looking scenario.
 *
 * Explicit C149 assumptions supplied by the caller
 * remain unchanged.
 */
function buildAssumptions(
  supplied:
    MarketValuationAssumptions | null | undefined,
): MarketValuationAssumptions {
  return {
    ...(supplied ?? {}),
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
    "Historical growth remains descriptive historical context only.",
    "Historical growth is not automatically converted into C149 Low/Base/High forward scenario assumptions.",
    "Historical growth is not treated as a forecast.",
    "Historical growth is not converted into a target price.",
    "Explicit C149 valuation assumptions remain caller-supplied modeling inputs.",
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
      /**
       * Historical data is available as
       * descriptive historical context,
       * but is deliberately NOT injected
       * into C149 forward scenario assumptions.
       */
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
