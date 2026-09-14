import "server-only";

import {
  executeLiveDecision,
  hasUsableLiveDecision,
  buildDecisionAnswerPolicy,
  type LiveDecisionRuntimeResult,
} from "./live-decision-runtime";

import type {
  WebIntelligenceResult,
} from "@/lib/web-intelligence";

export interface LiveDecisionOrchestrationResult {
  success: boolean;

  stage:
    | "web-intelligence"
    | "decision"
    | "decision-ready"
    | "decision-blocked";

  web: WebIntelligenceResult;

  decision: LiveDecisionRuntimeResult | null;

  answerPolicy: string;

  context: string;

  blocked: boolean;

  reason?: string;
}

export function orchestrateLiveDecision(
  web: WebIntelligenceResult,
): LiveDecisionOrchestrationResult {
  if (
    !web.success ||
    !web.verified ||
    web.evidence.length === 0
  ) {
    return {
      success: false,

      stage:
        "decision-blocked",

      web,

      decision: null,

      answerPolicy:
        "AIOS LIVE DECISION BLOCKED\n\nExternal evidence is not sufficiently verified for decision generation.",

      context: "",

      blocked: true,

      reason:
        web.error ??
        "External evidence is missing or not sufficiently verified.",
    };
  }

  const decision =
    executeLiveDecision(web);

  const usable =
    hasUsableLiveDecision(
      decision,
    );

  if (!usable) {
    return {
      success: false,

      stage:
        "decision-blocked",

      web,

      decision,

      answerPolicy:
        "AIOS LIVE DECISION BLOCKED\n\nThe Decision Layer did not produce a usable decision.",

      context:
        decision.context,

      blocked: true,

      reason:
        "Decision Layer output is incomplete.",
    };
  }

  const answerPolicy =
    buildDecisionAnswerPolicy(
      decision.decision,
    );

  return {
    success: true,

    stage:
      "decision-ready",

    web,

    decision,

    answerPolicy,

    context:
      decision.context,

    blocked: false,
  };
}

export function buildLiveDecisionRuntimeContext(
  result: LiveDecisionOrchestrationResult,
): string {
  if (
    !result.success ||
    !result.decision
  ) {
    return [
      "AIOS LIVE DECISION RUNTIME",

      "status=blocked",

      result.reason ??
        "No usable decision was produced.",

      "Do not present a decision as verified.",

      "Do not claim that an action was executed.",
    ].join("\n");
  }

  const decision =
    result.decision.decision;

  return [
    "AIOS LIVE DECISION RUNTIME",

    "status=ready",

    `priority=${decision.priority}`,

    `conclusion=${decision.conclusion}`,

    "",

    "FACTS",

    ...decision.facts.map(
      (item, index) =>
        `${index + 1}. ${item.statement}`,
    ),

    "",

    "JUDGMENTS",

    ...decision.judgments.map(
      (item, index) =>
        `${index + 1}. ${item.statement}`,
    ),

    "",

    "RISKS",

    ...decision.risks.map(
      (item, index) =>
        `${index + 1}. ${item.statement}`,
    ),

    "",

    "OPPORTUNITIES",

    ...decision.opportunities.map(
      (item, index) =>
        `${index + 1}. ${item.statement}`,
    ),

    "",

    "RECOMMENDED ACTIONS",

    ...decision.recommendedActions.map(
      (item, index) =>
        `${index + 1}. ${item.action}`,
    ),

    "",

    `NEXT STEP=${decision.nextStep}`,

    "",

    result.answerPolicy,
  ].join("\n");
}

export function isLiveDecisionReady(
  result: LiveDecisionOrchestrationResult,
): boolean {
  return (
    result.success &&
    !result.blocked &&
    Boolean(
      result.decision &&
      hasUsableLiveDecision(
        result.decision,
      ),
    )
  );
}
