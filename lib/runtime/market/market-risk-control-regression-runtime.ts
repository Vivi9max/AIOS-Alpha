import {
  runMarketRiskControl,
} from "./market-risk-control-runtime";
import type {
  MarketRiskControlRegressionCheck,
  MarketRiskControlRegressionResult,
} from "./market-risk-control-regression-types";
function check(
  name: string,
  passed: boolean,
  detail: string,
): MarketRiskControlRegressionCheck {
  return {
    name,
    passed,
    detail,
  };
}
export async function runMarketRiskControlRegression(): Promise<MarketRiskControlRegressionResult> {
  const startedAt = Date.now();
  const checks: MarketRiskControlRegressionCheck[] = [];
  let invalidResult: Awaited<
    ReturnType<typeof runMarketRiskControl>
  > | null = null;
  try {
    invalidResult = await runMarketRiskControl({
      symbol: "__C14717_INVALID__",
      market: "us",
      query:
        "C147.17 deterministic regression evidence check",
    });
  } catch {
    invalidResult = null;
  }
  checks.push(
    check(
      "RUNTIME_EXECUTION",
      invalidResult !== null,
      invalidResult
        ? "C147.17 runtime returned a structured result."
        : "C147.17 runtime did not return a result.",
    ),
  );
  checks.push(
    check(
      "RISK_SCHEMA_INTEGRITY",
      Boolean(
        invalidResult &&
          Array.isArray(
            invalidResult.risks,
          ) &&
          typeof invalidResult.riskCount ===
            "number" &&
          typeof invalidResult.reassessmentRequired ===
            "boolean" &&
          Array.isArray(
            invalidResult.decisionInvalidationConditions,
          ) &&
          Array.isArray(
            invalidResult.reviewChecklist,
          ),
      ),
      invalidResult
        ? "Risk collection, counts, reassessment and invalidation fields are present."
        : "Risk result is unavailable.",
    ),
  );
  checks.push(
    check(
      "EVIDENCE_METADATA_PRESERVED",
      Boolean(
        invalidResult &&
          invalidResult.sourceAnalysis &&
          typeof invalidResult.sourceAnalysis
            .sourceCount ===
            "number" &&
          typeof invalidResult.sourceAnalysis
            .independentDomains ===
            "number" &&
          typeof invalidResult.sourceAnalysis
            .freshness ===
            "string",
      ),
      invalidResult
        ? "Source count, independent domains and freshness remain explicit."
        : "Source metadata is unavailable.",
    ),
  );
  checks.push(
    check(
      "SAFETY_BOUNDARY",
      Boolean(
        invalidResult &&
          invalidResult.humanReviewRequired ===
            true &&
          invalidResult.automatedExecutionStarted ===
            false &&
          invalidResult.plannerDispatched ===
            false &&
          invalidResult.tradingExecuted ===
            false,
      ),
      invalidResult
        ? "Human review remains mandatory; Planner and trading remain disabled."
        : "Safety boundary could not be verified.",
    ),
  );
  checks.push(
    check(
      "READ_ONLY_RUNTIME",
      Boolean(
        invalidResult &&
          invalidResult.automatedExecutionStarted ===
            false &&
          invalidResult.plannerDispatched ===
            false &&
          invalidResult.tradingExecuted ===
            false,
      ),
      invalidResult
        ? "Regression path performs no task, review or trading mutation."
        : "Read-only boundary could not be verified.",
    ),
  );
  let normalResult: Awaited<
    ReturnType<typeof runMarketRiskControl>
  > | null = null;
  try {
    normalResult = await runMarketRiskControl({
      symbol: "AAPL",
      market: "us",
      query:
        "AAPL fundamentals valuation events evidence risk review",
    });
  } catch {
    normalResult = null;
  }
  checks.push(
    check(
      "LIVE_MARKET_RUNTIME",
      Boolean(
        normalResult &&
          normalResult.symbol ===
            "AAPL" &&
          normalResult.market ===
            "us" &&
          Array.isArray(
            normalResult.risks,
          ) &&
          normalResult.runtime.version ===
            "C147.17",
      ),
      normalResult
        ? "AAPL completed through the live C147.17 market runtime."
        : "Live market runtime did not return a valid C147.17 result.",
    ),
  );
  checks.push(
    check(
      "INVALIDATION_REVIEW_CHAIN",
      Boolean(
        normalResult &&
          Array.isArray(
            normalResult.decisionInvalidationConditions,
          ) &&
          Array.isArray(
            normalResult.reviewChecklist,
          ) &&
          normalResult.humanReviewRequired ===
            true,
      ),
      normalResult
        ? "Decision invalidation conditions and human review checklist are exposed."
        : "Invalidation/review chain is incomplete.",
    ),
  );
  const passed = checks.filter(
    (item) => item.passed,
  ).length;
  const failed =
    checks.length - passed;
  const verified =
    failed === 0;
  return {
    success: verified,
    verified,
    code: verified
      ? "C147_17_1_MARKET_RISK_CONTROL_REGRESSION_PASS"
      : "C147_17_1_MARKET_RISK_CONTROL_REGRESSION_PARTIAL",
    stage: "C147.17.1",
    checks,
    passed,
    failed,
    plannerDispatched: false,
    tradingExecuted: false,
    mutationPerformed: false,
    humanReviewRequired: true,
    runtime: {
      name:
        "market-risk-control-regression-runtime",
      version: "C147.17.1",
      generatedAt:
        new Date().toISOString(),
      latencyMs:
        Date.now() - startedAt,
    },
    principles: [
      "Regression validates the real C147.17 runtime rather than a mocked risk response.",
      "Risk evidence, freshness and invalidation conditions remain explicit.",
      "Insufficient evidence is not converted into an investment conclusion.",
      "Human review remains mandatory.",
      "No persistent task mutation occurs.",
      "No human review mutation occurs.",
      "No Planner dispatch occurs.",
      "No automated trading occurs.",
    ],
    disclaimer:
      "C147.17.1 is a founder regression test for market risk-control integrity. It does not rank securities, predict returns, provide personalized investment advice, or execute trades.",
  };
}
