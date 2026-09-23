import {
  runMarketRiskControl,
} from "./market-risk-control-runtime";

import {
  runMarketReassessment,
} from "./market-reassessment-runtime";

import type {
  MarketRiskReassessmentBridgeRequest,
  MarketRiskReassessmentBridgeResult,
  MarketRiskReassessmentBridgeAction,
} from "./market-risk-reassessment-bridge-types";

function unique(
  values: string[],
): string[] {
  return Array.from(
    new Set(
      values.filter(
        (value) =>
          typeof value === "string" &&
          value.trim(),
      ),
    ),
  );
}

function buildChecklist(
  riskControl: Awaited<
    ReturnType<typeof runMarketRiskControl>
  >,
): string[] {
  return unique([
    "Verify security identity and market.",
    "Verify current market evidence freshness.",
    "Review material risk changes.",
    "Review fundamental risk changes.",
    "Review valuation sensitivity.",
    "Review event-driven evidence.",
    "Review evidence conflicts.",
    ...riskControl.reviewChecklist,
    "Compare the current evidence with the previous decision record.",
    "Review explicit decision invalidation conditions.",
    "Require an explicit human decision before any downstream action.",
  ]);
}

export async function runMarketRiskReassessmentBridge(
  request: MarketRiskReassessmentBridgeRequest,
): Promise<MarketRiskReassessmentBridgeResult> {
  const startedAt = Date.now();

  const symbol =
    typeof request?.symbol === "string"
      ? request.symbol.trim().toUpperCase()
      : "";

  const market =
    request.market;

  if (!symbol) {
    const emptyRisk =
      await runMarketRiskControl({
        symbol: "",
        market,
        query:
          request.query ??
          null,
      });

    return {
      success: false,
      code:
        "C147_18_RISK_REASSESSMENT_BRIDGE_INSUFFICIENT",
      action:
        "insufficient-evidence",
      symbol,
      market,
      riskControl:
        emptyRisk,
      reassessment:
        null,
      reassessmentRequired:
        true,
      humanReviewRequired:
        true,
      previousRecordId:
        request.previousRecord?.recordId ??
        null,
      currentRecordId:
        request.currentRecord?.recordId ??
        null,
      decisionInvalidationConditions:
        emptyRisk.decisionInvalidationConditions,
      reviewChecklist:
        buildChecklist(
          emptyRisk,
        ),
      automatedExecutionStarted:
        false,
      plannerDispatched:
        false,
      tradingExecuted:
        false,
      mutationPerformed:
        false,
      runtime: {
        name:
          "market-risk-reassessment-bridge-runtime",
        version:
          "C147.18",
        upstream:
          "C147.17+C147.8",
        generatedAt:
          new Date().toISOString(),
        latencyMs:
          Date.now() - startedAt,
      },
      principles: [
        "Risk control must run before reassessment.",
        "A missing security identity blocks downstream reassessment.",
        "Insufficient evidence is not converted into an investment conclusion.",
        "Human review remains mandatory.",
        "No mutation is performed.",
        "No Planner dispatch occurs.",
        "No automated trading occurs.",
      ],
      disclaimer:
        "C147.18 connects structured risk control to decision reassessment. It does not provide personalized investment advice or execute trades.",
    };
  }

  const riskControl =
    await runMarketRiskControl({
      symbol,
      market,
      query:
        request.query ??
        `Risk reassessment ${market} ${symbol}`,
    });

  const hasPrevious =
    Boolean(
      request.previousRecord,
    );

  const hasCurrent =
    Boolean(
      request.currentRecord,
    );

  let reassessment = null;

  if (
    hasPrevious &&
    hasCurrent
  ) {
    const reassessmentResult =
      runMarketReassessment({
        previousRecord:
          request.previousRecord!,
        currentRecord:
          request.currentRecord!,
      });

    reassessment =
      reassessmentResult.reassessment;
  }

  const reassessmentRequired =
    Boolean(
      riskControl.reassessmentRequired ||
      reassessment?.changeType ===
        "assessment-change" ||
      reassessment?.changeType ===
        "invalidation-risk",
    );

  let action:
    MarketRiskReassessmentBridgeAction;

  if (
    riskControl.code ===
      "C147_17_RISK_CONTROL_INSUFFICIENT"
  ) {
    action =
      "insufficient-evidence";
  } else if (
    reassessmentRequired &&
    reassessment
  ) {
    action =
      "reassessment-completed";
  } else if (
    reassessmentRequired
  ) {
    action =
      "reassessment-required";
  } else {
    action =
      "no-reassessment-required";
  }

  const success =
    riskControl.code !==
      "C147_17_RISK_CONTROL_INSUFFICIENT";

  const code =
    success
      ? riskControl.code ===
          "C147_17_RISK_CONTROL_PARTIAL"
        ? "C147_18_RISK_REASSESSMENT_BRIDGE_PARTIAL"
        : "C147_18_RISK_REASSESSMENT_BRIDGE_PASS"
      : "C147_18_RISK_REASSESSMENT_BRIDGE_INSUFFICIENT";

  return {
    success,
    code,
    action,
    symbol,
    market,
    riskControl,
    reassessment,
    reassessmentRequired,
    humanReviewRequired:
      true,
    previousRecordId:
      request.previousRecord?.recordId ??
      null,
    currentRecordId:
      request.currentRecord?.recordId ??
      null,
    decisionInvalidationConditions:
      unique([
        ...riskControl.decisionInvalidationConditions,
        ...(reassessment?.triggeredInvalidationConditions ??
          []),
      ]),
    reviewChecklist:
      buildChecklist(
        riskControl,
      ),
    automatedExecutionStarted:
      false,
    plannerDispatched:
      false,
    tradingExecuted:
      false,
    mutationPerformed:
      false,
    runtime: {
      name:
        "market-risk-reassessment-bridge-runtime",
      version:
        "C147.18",
      upstream:
        "C147.17+C147.8",
      generatedAt:
        new Date().toISOString(),
      latencyMs:
        Date.now() - startedAt,
    },
    principles: [
      "C147.17 risk control is executed before reassessment.",
      "C147.8 remains the existing decision reassessment engine.",
      "Risk evidence does not silently become a human decision.",
      "Decision invalidation conditions remain explicit.",
      "A material risk change may require decision reassessment.",
      "Previous decision records are never overwritten by this bridge.",
      "No decision-history mutation is performed.",
      "Human review remains mandatory.",
      "No Planner dispatch occurs.",
      "No automated trading occurs.",
      "No buy, sell, hold or return prediction is generated.",
    ],
    disclaimer:
      "C147.18 is a structured bridge between market risk control and decision reassessment. It does not rank securities, predict returns, provide personalized investment advice, or execute trades.",
  };
}
