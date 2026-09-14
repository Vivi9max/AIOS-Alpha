import "server-only";

import type {
  CommercialObjective,
  CommercialStage,
} from "@/lib/commercial/operating-layer";

import type {
  LiveDecision,
  LiveDecisionAction,
} from "@/lib/runtime/live-decision";

export type LiveCommercialExecutionStatus =
  | "ready"
  | "blocked"
  | "insufficient-evidence"
  | "no-action";

export interface LiveCommercialExecutionStep {
  order: number;
  action: string;
  purpose: string;
  priority: LiveDecisionAction["priority"];
}

export interface LiveCommercialExecutionPlan {
  success: boolean;
  status: LiveCommercialExecutionStatus;

  objectiveId: string;
  objectiveTitle: string;
  stage: CommercialStage;

  decisionPriority: LiveDecision["priority"];

  conclusion: string;
  nextStep: string;

  action: LiveDecisionAction | null;

  steps: LiveCommercialExecutionStep[];

  risks: string[];
  opportunities: string[];

  evidenceCount: number;
  verified: boolean;

  generatedAt: number;
}

function normalizeText(
  value: string,
): string {
  return value
    .replace(/\s+/g, " ")
    .trim();
}

function getPrimaryAction(
  decision: LiveDecision,
): LiveDecisionAction | null {
  const actions =
    decision.recommendedActions
      .filter(
        (item) =>
          normalizeText(
            item.action,
          ).length > 0,
      );

  if (actions.length === 0) {
    return null;
  }

  const priorityRank: Record<
    LiveDecisionAction["priority"],
    number
  > = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  return [...actions].sort(
    (a, b) =>
      priorityRank[b.priority] -
      priorityRank[a.priority],
  )[0];
}

function buildSteps(
  objective: CommercialObjective,
  decision: LiveDecision,
  primaryAction: LiveDecisionAction,
): LiveCommercialExecutionStep[] {
  const steps: LiveCommercialExecutionStep[] = [];

  steps.push({
    order: 1,
    action:
      "Use verified external evidence as the decision input.",
    purpose:
      "Prevent commercial execution from relying on stale or unverified information.",
    priority:
      decision.priority,
  });

  steps.push({
    order: 2,
    action:
      normalizeText(
        primaryAction.action,
      ),
    purpose:
      normalizeText(
        primaryAction.reason,
      ) ||
      "Convert the live decision into a concrete commercial action.",
    priority:
      primaryAction.priority,
  });

  switch (objective.stage) {
    case "validation":
      steps.push({
        order: 3,
        action:
          "Run the smallest measurable market validation.",
        purpose:
          "Obtain a real customer, demand, conversion or pricing signal before increasing resource commitment.",
        priority: "high",
      });
      break;

    case "acquisition":
      steps.push({
        order: 3,
        action:
          "Execute the smallest measurable customer acquisition action.",
        purpose:
          "Generate qualified traffic, leads or conversations tied to the objective.",
        priority: "high",
      });
      break;

    case "conversion":
      steps.push({
        order: 3,
        action:
          "Execute the highest-probability conversion action.",
        purpose:
          "Turn qualified demand into measurable revenue or customers.",
        priority: "high",
      });
      break;

    case "delivery":
      steps.push({
        order: 3,
        action:
          "Execute and verify customer delivery.",
        purpose:
          "Protect revenue realization and customer satisfaction.",
        priority: "high",
      });
      break;

    case "retention":
      steps.push({
        order: 3,
        action:
          "Execute the smallest measurable retention action.",
        purpose:
          "Increase repeat usage, repeat purchase or customer lifetime value.",
        priority: "medium",
      });
      break;

    case "scaling":
      steps.push({
        order: 3,
        action:
          "Scale only the commercial action already showing verified positive signal.",
        purpose:
          "Increase output without scaling an unvalidated assumption.",
        priority: "high",
      });
      break;

    default:
      steps.push({
        order: 3,
        action:
          "Convert the objective into the smallest measurable validation action.",
        purpose:
          "Move the objective from idea into verified commercial evidence.",
        priority: "high",
      });
      break;
  }

  steps.push({
    order: 4,
    action:
      "Record the verified result against the commercial objective.",
    purpose:
      "Close the loop between execution and measurable revenue, customer or cost progress.",
    priority: "medium",
  });

  return steps;
}

export function buildLiveCommercialExecutionPlan(
  objective: CommercialObjective,
  decision: LiveDecision,
): LiveCommercialExecutionPlan {
  const verified =
    decision.success === true &&
    decision.verification?.verified === true &&
    decision.evidence.length >= 2;

  const primaryAction =
    getPrimaryAction(decision);

  const risks =
    decision.risks
      .map((risk) =>
        normalizeText(
          risk.statement,
        ),
      )
      .filter(Boolean)
      .slice(0, 5);

  const opportunities =
    decision.opportunities
      .map((item) =>
        normalizeText(
          item.statement,
        ),
      )
      .filter(Boolean)
      .slice(0, 5);

  if (!verified) {
    return {
      success: false,
      status:
        "insufficient-evidence",
      objectiveId:
        objective.id,
      objectiveTitle:
        objective.title,
      stage:
        objective.stage,
      decisionPriority:
        decision.priority,
      conclusion:
        "Commercial execution is blocked because the live evidence is not sufficiently verified.",
      nextStep:
        "Strengthen external evidence before committing commercial resources.",
      action:
        primaryAction,
      steps: [],
      risks,
      opportunities,
      evidenceCount:
        decision.evidence.length,
      verified: false,
      generatedAt:
        Date.now(),
    };
  }

  if (!primaryAction) {
    return {
      success: false,
      status: "no-action",
      objectiveId:
        objective.id,
      objectiveTitle:
        objective.title,
      stage:
        objective.stage,
      decisionPriority:
        decision.priority,
      conclusion:
        "Live intelligence is available, but no concrete commercial action has been produced.",
      nextStep:
        "Generate a measurable commercial action before execution.",
      action: null,
      steps: [],
      risks,
      opportunities,
      evidenceCount:
        decision.evidence.length,
      verified: true,
      generatedAt:
        Date.now(),
    };
  }

  const steps =
    buildSteps(
      objective,
      decision,
      primaryAction,
    );

  return {
    success: true,
    status: "ready",
    objectiveId:
      objective.id,
    objectiveTitle:
      objective.title,
    stage:
      objective.stage,
    decisionPriority:
      decision.priority,
    conclusion:
      normalizeText(
        decision.conclusion,
      ),
    nextStep:
      normalizeText(
        decision.nextStep,
      ),
    action:
      primaryAction,
    steps,
    risks,
    opportunities,
    evidenceCount:
      decision.evidence.length,
    verified: true,
    generatedAt:
      Date.now(),
  };
}

export function isLiveCommercialExecutionReady(
  plan: LiveCommercialExecutionPlan,
): boolean {
  return (
    plan.success === true &&
    plan.status === "ready" &&
    plan.verified === true &&
    plan.steps.length >= 3 &&
    Boolean(plan.action)
  );
}

export function buildLiveCommercialExecutionContext(
  plan: LiveCommercialExecutionPlan,
): string {
  return [
    "AIOS LIVE COMMERCIAL EXECUTION CONTEXT",
    "",
    `OBJECTIVE: ${plan.objectiveTitle}`,
    `OBJECTIVE ID: ${plan.objectiveId}`,
    `STAGE: ${plan.stage}`,
    `DECISION PRIORITY: ${plan.decisionPriority}`,
    `EVIDENCE COUNT: ${plan.evidenceCount}`,
    `VERIFIED: ${plan.verified ? "YES" : "NO"}`,
    "",
    `CONCLUSION: ${plan.conclusion}`,
    "",
    "PRIMARY ACTION:",
    plan.action
      ? plan.action.action
      : "NONE",
    "",
    "EXECUTION STEPS:",
    ...plan.steps.map(
      (step) =>
        `${step.order}. ${step.action} — ${step.purpose}`,
    ),
    "",
    "RISKS:",
    ...(plan.risks.length > 0
      ? plan.risks.map(
          (risk) =>
            `- ${risk}`,
        )
      : ["- None identified."]),
    "",
    "OPPORTUNITIES:",
    ...(plan.opportunities.length > 0
      ? plan.opportunities.map(
          (item) =>
            `- ${item}`,
        )
      : ["- None identified."]),
    "",
    `NEXT STEP: ${plan.nextStep}`,
  ].join("\n");
}
