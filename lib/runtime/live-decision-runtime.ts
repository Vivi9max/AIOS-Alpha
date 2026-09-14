import "server-only";

import {
  buildLiveDecision,
  buildLiveDecisionContext,
  type LiveDecision,
} from "./live-decision";

import type {
  WebIntelligenceResult,
} from "@/lib/web-intelligence";

export interface LiveDecisionRuntimeResult {
  success: boolean;
  decision: LiveDecision;
  context: string;
  runtimeStage:
    | "web-intelligence"
    | "decision";
}

export function executeLiveDecision(
  webContext: WebIntelligenceResult,
): LiveDecisionRuntimeResult {
  const decision =
    buildLiveDecision(
      webContext,
    );

  const context =
    buildLiveDecisionContext(
      decision,
    );

  return {
    success:
      decision.success,

    decision,

    context,

    runtimeStage:
      "decision",
  };
}

export function hasUsableLiveDecision(
  result: LiveDecisionRuntimeResult,
): boolean {
  return (
    result.success &&
    result.decision.success &&
    result.decision.conclusion
      .trim()
      .length > 0 &&
    result.decision.nextStep
      .trim()
      .length > 0
  );
}

export function buildDecisionAnswerPolicy(
  decision: LiveDecision,
): string {
  return [
    "AIOS LIVE DECISION ANSWER POLICY",

    "The Runtime has completed external evidence retrieval and Decision Layer analysis.",

    "",

    "ANSWER ORDER",

    "1. CONCLUSION",
    "2. KEY FACTS",
    "3. JUDGMENT",
    "4. RISKS",
    "5. OPPORTUNITIES",
    "6. RECOMMENDED ACTION",
    "7. NEXT STEP",

    "",

    "BOUNDARIES",

    "Facts must remain distinguishable from judgments.",
    "Judgments must remain distinguishable from hypotheses.",
    "Recommendations must not be presented as executed actions.",
    "Opportunities must not be presented as guaranteed outcomes.",
    "Do not invent facts that are absent from the retrieved evidence.",
    "Do not claim external verification beyond the recorded verification result.",

    "",

    `decision_success=${decision.success}`,
    `priority=${decision.priority}`,
    `conclusion=${decision.conclusion}`,
    `next_step=${decision.nextStep}`,
  ].join("\n");
}
