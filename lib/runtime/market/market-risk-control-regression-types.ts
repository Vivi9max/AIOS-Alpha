export interface MarketRiskControlRegressionCheck {
  name: string;
  passed: boolean;
  detail: string;
}
export interface MarketRiskControlRegressionResult {
  success: boolean;
  verified: boolean;
  code:
    | "C147_17_1_MARKET_RISK_CONTROL_REGRESSION_PASS"
    | "C147_17_1_MARKET_RISK_CONTROL_REGRESSION_PARTIAL";
  stage: "C147.17.1";
  checks: MarketRiskControlRegressionCheck[];
  passed: number;
  failed: number;
  plannerDispatched: false;
  tradingExecuted: false;
  mutationPerformed: false;
  humanReviewRequired: true;
  runtime: {
    name: "market-risk-control-regression-runtime";
    version: "C147.17.1";
    generatedAt: string;
    latencyMs: number;
  };
  principles: string[];
  disclaimer: string;
}
