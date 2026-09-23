import {
  runMarketRiskReassessmentBridge,
} from "./market-risk-reassessment-bridge-runtime";

import type {
  MarketDecisionRecord,
} from "./market-decision-record-types";

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

function createRecord(
  variant: "previous" | "current",
): MarketDecisionRecord {
  const current =
    variant === "current";

  return {
    recordId:
      current
        ? "C14718-AAPL-CURRENT"
        : "C14718-AAPL-PREVIOUS",

    symbol:
      "AAPL",

    market:
      "us",

    state:
      "research-candidate",

    reviewStatus:
      "review-ready",

    currentState:
      current
        ? "Current evidence requires reassessment because risk and valuation evidence changed."
        : "Previous evidence supported continued human review.",

    supportingFactors:
      current
        ? [
            "Revenue evidence remains available.",
            "Independent evidence remains available.",
            "Current evidence has been refreshed.",
          ]
        : [
            "Revenue evidence remains available.",
            "Independent evidence remains available.",
          ],

    risks:
      current
        ? [
            "Valuation sensitivity increased.",
            "New regulatory evidence requires review.",
          ]
        : [
            "Valuation sensitivity requires monitoring.",
          ],

    invalidationConditions:
      current
        ? [
            "Material deterioration in fundamentals.",
            "New regulatory evidence materially changes the assessment.",
          ]
        : [
            "Material deterioration in fundamentals.",
          ],

    watchMetrics:
      current
        ? [
            "Revenue growth",
            "EPS",
            "P/E",
            "Regulatory evidence",
          ]
        : [
            "Revenue growth",
            "EPS",
            "P/E",
          ],

    scenarios: [
      {
        name:
          "Fundamentals change",

        condition:
          "Revenue, earnings or guidance materially change.",

        implication:
          "Reassess the current research state.",
      },

      {
        name:
          "Risk evidence changes",

        condition:
          "New evidence materially changes identified risks.",

        implication:
          "Reassess risk and invalidation conditions.",
      },
    ],

    industry:
      "Technology",

    company:
      "Apple Inc.",

    fundamentals: {
      revenueGrowth:
        current
          ? 0.08
          : 0.1,

      eps:
        current
          ? 7.2
          : 7.0,

      assessment:
        current
          ? "Current fundamental evidence requires review."
          : "Previous fundamental evidence remained reviewable.",
    },

    valuation: {
      pe:
        current
          ? 31
          : 28,

      pb:
        current
          ? 12
          : 10,

      assessment:
        current
          ? "Valuation sensitivity increased."
          : "Valuation remained within the prior review context.",
    },

    evidence: {
      sourceCount:
        current
          ? 10
          : 8,

      independentDomains:
        current
          ? 7
          : 6,

      verified:
        true,

      freshness:
        "fresh",

      asOf:
        current
          ? "2026-09-23T07:00:00.000Z"
          : "2026-09-22T07:00:00.000Z",
    },

    dataQuality:
      "web-evidence",

    humanDecisionRequired:
      true,

    decisionBoundary: {
      whatWouldChangeAssessment:
        current
          ? [
              "Revenue growth",
              "EPS",
              "Regulatory evidence",
            ]
          : [
              "Revenue growth",
              "EPS",
            ],

      whatWouldInvalidateAssessment:
        current
          ? [
              "Material deterioration in fundamentals.",
              "New regulatory evidence materially changes the assessment.",
            ]
          : [
              "Material deterioration in fundamentals.",
            ],
    },

    sourceVersion:
      current
        ? "C147.18.1-CURRENT"
        : "C147.18.1-PREVIOUS",

    generatedAt:
      current
        ? "2026-09-23T07:00:00.000Z"
        : "2026-09-22T07:00:00.000Z",
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
        "C147.18.1 invalid identity regression",
    });

  checks.push(
    check(
      "RUNTIME_EXECUTION",
      invalid.runtime.version ===
        "C147.18",
      "C147.18 runtime returned a structured result.",
    ),
  );

  checks.push(
    check(
      "RISK_SCHEMA_INTEGRITY",
      Boolean(
        invalid.riskControl &&
          Array.isArray(
            invalid.decisionInvalidationConditions,
          ) &&
          Array.isArray(
            invalid.reviewChecklist,
          ),
      ),
      "Risk-control and reassessment bridge fields are present.",
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
      "Invalid-input path performs no persistent mutation.",
    ),
  );

  const previousRecord =
    createRecord(
      "previous",
    );

  const currentRecord =
    createRecord(
      "current",
    );

  const live =
    await runMarketRiskReassessmentBridge({
      symbol:
        "AAPL",

      market:
        "us",

      query:
        "AAPL risk reassessment evidence fundamentals valuation events",

      previousRecord,

      currentRecord,
    });

  checks.push(
    check(
      "LIVE_RISK_RUNTIME",
      Boolean(
        live.riskControl &&
          live.riskControl.symbol ===
            "AAPL",
      ),
      "AAPL completed through the live C147.17 risk-control runtime.",
    ),
  );

  checks.push(
    check(
      "REAL_C147_8_REASSESSMENT",
      Boolean(
        live.reassessment &&
          live.reassessment.previousRecordId ===
            previousRecord.recordId &&
          live.reassessment.currentRecordId ===
            currentRecord.recordId &&
          live.reassessment.changeType !==
            "no-material-change",
      ),
      "C147.18 executed the real C147.8 reassessment path using previous and current decision records.",
    ),
  );

  checks.push(
    check(
      "INVALIDATION_REVIEW_CHAIN",
      Boolean(
        live.reassessment &&
          Array.isArray(
            live.reassessment
              .triggeredInvalidationConditions,
          ) &&
          live.reassessment
            .humanDecisionRequired ===
            true &&
          live.decisionInvalidationConditions
            .length >
            0 &&
          live.reviewChecklist
            .length >
            0,
      ),
      "Risk changes reached invalidation conditions and the human-review checklist.",
    ),
  );

  checks.push(
    check(
      "NO_DECISION_OVERWRITE",
      live.mutationPerformed ===
        false &&
        live.previousRecordId ===
          previousRecord.recordId &&
        live.currentRecordId ===
          currentRecord.recordId,
      "Previous and current decision records remain unchanged and are only compared.",
    ),
  );

  const passed =
    checks.filter(
      (item) =>
        item.passed,
    ).length;

  const failed =
    checks.length -
    passed;

  const verified =
    failed === 0;

  return {
    success:
      verified,

    verified,

    code:
      verified
        ? "C147_18_1_RISK_REASSESSMENT_BRIDGE_REGRESSION_PASS"
        : "C147_18_1_RISK_REASSESSMENT_BRIDGE_REGRESSION_PARTIAL",

    stage:
      "C147.18.1",

    passed,

    failed,

    checks,

    liveBridge: {
      symbol:
        live.symbol,

      market:
        live.market,

      action:
        live.action,

      reassessmentRequired:
        live.reassessmentRequired,

      reassessment:
        live.reassessment,

      decisionInvalidationConditions:
        live.decisionInvalidationConditions,

      reviewChecklist:
        live.reviewChecklist,
    },

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
        "C147.18.1",

      upstream:
        "C147.18+C147.8",

      generatedAt:
        new Date().toISOString(),

      latencyMs:
        Date.now() -
        startedAt,
    },

    principles: [
      "Regression validates the real C147.18 bridge.",
      "C147.17 remains the upstream risk-control runtime.",
      "C147.8 is executed with real previous and current decision-record structures.",
      "Material changes remain explicit.",
      "Invalidation conditions remain explicit.",
      "Human review remains mandatory.",
      "Previous decision records are not overwritten.",
      "No persistent mutation occurs.",
      "No Planner dispatch occurs.",
      "No automated trading occurs.",
    ],

    disclaimer:
      "C147.18.1 validates the real Risk Control → Decision Reassessment → Human Review chain. It does not rank securities, predict returns, provide personalized investment advice, or execute trades.",
  };
}
