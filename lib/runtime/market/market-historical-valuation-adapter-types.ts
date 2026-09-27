import type {
  MarketValuationAssumptions,
  MarketValuationCandidateInput,
  MarketValuationRequest,
} from "./valuation-types";
import type {
  MarketHistoricalValuationContext,
} from "./market-historical-valuation-context-types";
export interface MarketHistoricalValuationAdapterRequest {
  industry: string;
  symbol: string;
  market?:
    MarketValuationCandidateInput["market"];
  name?: string | null;
  assumptions?:
    MarketValuationAssumptions | null;
  historicalContext?:
    MarketHistoricalValuationContext | null;
}
export interface MarketHistoricalValuationAdapterResult {
  success: boolean;
  code:
    | "C163_4_VALUATION_ADAPTER_PASS"
    | "C163_4_VALUATION_ADAPTER_PARTIAL"
    | "C163_4_VALUATION_ADAPTER_INSUFFICIENT";
  sourceContract:
    "C163.4";
  targetContract:
    "C149";
  historicalContextAvailable:
    boolean;
  historicalContextUsable:
    boolean;
  request:
    MarketValuationRequest;
  historicalInputs: {
    revenueGrowth:
      number | null;
    netIncomeGrowth:
      number | null;
    operatingCashFlowGrowth:
      number | null;
    freeCashFlowGrowth:
      number | null;
    sourceQuality:
      | "structured-verified"
      | "partial"
      | "insufficient";
  };
  methodology: {
    historicalGrowthUsedAsScenarioContext:
      boolean;
    historicalGrowthUsedAsForecast:
      false;
    historicalGrowthUsedAsTargetPrice:
      false;
    recommendationGenerated:
      false;
    plannerDispatched:
      false;
    tradingExecuted:
      false;
  };
  limitations:
    string[];
  humanVerificationRequired:
    true;
  generatedAt:
    string;
}
