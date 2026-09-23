import {
  runMarketRiskReassessmentBridge,
} from "./market-risk-reassessment-bridge-runtime";

type Check = {
  name: string;
  passed: boolean;
  detail: string;
};

function check(
  name: string,
  passed: boolean,
  detail: string,
): Check {
  return {
    name,
    passed,
    detail,
  };
}

export async function runMarketRiskReassessmentBridgeRegression() {
  const startedAt =
    Date.now();

  const checks: Check[] =
    [];

  const invalid =
    await runMarketRiskReassessmentBridge({
      symbol: "",
      market: "us",
      query:
        "C147.18 invalid identity regression",
    });

  checks.push(
    check(
      "RUNTIME_EXECUTION",
      Boolean(
        invalid &&
          invalid.runtime?.version ===
            "C147.18",
      ),
      "C147.18 runtime returned a structured result.",
    ),
  );

  checks.push(
    check(
      "RISK_REASSESSMENT_SCHEMA",
      Boolean(
        invalid &&
          invalid.riskControl &&
          Array.isArray(
            invalid.decisionInvalidationConditions,
          ) &&
          Array.isArray(
            invalid.reviewChecklist,
          ),
      ),
      "Risk control, reassessment and review fields are present.",
    ),
  );

  checks.push(
    check(
      "SAFETY_BOUNDARY",
      invalid.humanReviewRequired ===
        true &&
        invalid.automatedExecutionStarted ===
          false &&
        invalid.plannerDispatched ===
          false &&
        invalid.tradingExecuted ===
          false,
      "Human review remains mandatory and automated execution remains disabled.",
    ),
  );

  checks.push(
    check(
      "READ_ONLY_BOUNDARY",
      invalid.mutationPerformed ===
        false,
      "Bridge performs no persistent mutation.",
    ),
  );

  const live =
    await runMarketRiskReassessmentBridge({
      symbol: "AAPL",
      market: "us",
      query:
        "AAPL risk reassessment evidence fundamentals valuation events",
    });

  checks.push(
    check(
      "LIVE_RISK_RUNTIME",
      Boolean(
        live &&
          live.riskControl &&
          live.riskControl.symbol ===
            "AAPL",
      ),
      "AAPL completed through the live C147.17 risk-control runtime.",
    ),
  );

  checks.push(
    check(
      "INVALIDATION_CHAIN",
      Array.isArray(
        live.decisionInvalidationConditions,
      ) &&
        Array.isArray(
          live.reviewChecklist,
        ),
      "Risk invalidation conditions are connected to the human-review checklist.",
    ),
  );

  checks.push(
    check(
      "NO_DECISION_OVERWRITE",
      live.mutationPerformed ===
        false,
      "Existing decision records are not overwritten by C147.18.",
    ),
  );

  const passed =
    checks.filter(
      (item) =>
        item.passed,
    ).length;

  const verified =
    passed ===
      checks.length;

  return {
    success:
      verified,

    verified,

    code:
      verified
        ? "C147_18_RISK_REASSESSMENT_BRIDGE_REGRESSION_PASS"
        : "C147_18_RISK_REASSESSMENT_BRIDGE_REGRESSION_PARTIAL",

    stage:
      "C147.18",

    passed,

    failed:
      checks.length -
      passed,

    checks,

    safety: {
      humanReviewRequired:
        true,
      mutationPerformed:
        false,
      plannerDispatched:
        false,
      tradingExecuted:
        false,
    },

    runtime: {
      name:
        "market-risk-reassessment-bridge-regression-runtime",
      version:
        "C147.18",
      generatedAt:
        new Date().toISOString(),
      latencyMs:
        Date.now() -
        startedAt,
    },

    principles: [
      "Regression validates the real C147.18 runtime.",
      "C147.17 remains the upstream risk-control runtime.",
      "C147.8 remains the decision reassessment engine.",
      "Risk evidence remains separate from human decisions.",
      "Decision history is not overwritten.",
      "Human review remains mandatory.",
      "No Planner dispatch occurs.",
      "No automated trading occurs.",
    ],

    disclaimer:
      "C147.18 regression validates risk-to-reassessment integrity. It does not rank securities, predict returns, provide personalized investment advice, or execute trades.",
  };
}
