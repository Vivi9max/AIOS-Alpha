import "server-only";

import {
  type CommercialObjective,
} from "@/lib/commercial/operating-layer";

import {
  initializeFirstCashflowProject,
} from "@/lib/commercial/first-cashflow-project";

import {
  executeLiveCommercialOpportunity,
  isLiveCommercialOpportunityReady,
  type LiveCommercialOpportunityResult,
} from "@/lib/runtime/live-commercial-opportunity";

export const C144_FIRST_CUSTOMER_TASK_ID =
  "C144-FIRST-CUSTOMER";

export interface C144FirstCustomerResult {
  success: boolean;

  status:
    | "ready"
    | "blocked"
    | "objective-blocked"
    | "search-blocked";

  taskId:
    string;

  project:
    CommercialObjective | null;

  opportunity:
    LiveCommercialOpportunityResult | null;

  task:
    {
      id: string;
      title: string;
      objectiveId: string;
      status: "ready" | "blocked";
      priority: "critical" | "high" | "medium";
      measurableTarget: string;
      successSignal: string;
      executionMode: "manual-founder";
      externalSideEffectExecuted: false;
    } | null;

  conclusion:
    string;

  nextStep:
    string;

  timestamp:
    number;
}

function buildCustomerDiscoveryPrompt(
  objective: CommercialObjective,
): string {
  return [
    "AIOS FIRST CUSTOMER DISCOVERY TASK",

    "",

    `Commercial objective: ${objective.title}.`,

    `Offer: AIOS-powered cross-border market intelligence and product validation service.`,

    `Target market: ${"China-based suppliers, sellers, and small businesses seeking validated opportunities in Japan and cross-border markets"}.`,

    `Revenue target: ${objective.revenueTarget} ${objective.currency}.`,

    `Customer target: ${objective.customerTarget}.`,

    "",

    "Primary mission:",
    "Find the strongest currently actionable opportunity for acquiring the first paying customer.",

    "",

    "Research requirements:",
    "1. Use current external web information.",
    "2. Identify real current customer demand or business pain.",
    "3. Identify businesses or customer segments that could realistically pay for this service.",
    "4. Identify evidence of active demand, commercial activity, expansion, outsourcing, ecommerce growth, cross-border activity, or market-entry needs.",
    "5. Compare competing solutions and current pricing signals when available.",
    "6. Prefer recent and independent sources.",
    "7. Verify the conclusion using multiple independent sources.",
    "8. Do not claim that a person or company is a qualified lead unless the public evidence actually supports that conclusion.",
    "9. Produce the smallest practical customer-acquisition action that the founder can execute manually.",
    "10. The action must have a measurable target and a clear success signal.",

    "",

    "Execution constraint:",
    "AIOS currently has no authorized external messaging, advertising, or social-platform execution adapter for this task.",
    "Therefore AIOS must not claim that any message was sent, lead was contacted, customer was acquired, revenue was generated, or external action was completed.",

    "",

    "Final objective:",
    "Turn verified market intelligence into the single highest-priority first-customer acquisition task for the founder.",
  ].join("\n");
}

function buildBlockedResult(
  status:
    | "blocked"
    | "objective-blocked"
    | "search-blocked",
  project:
    CommercialObjective | null,
  opportunity:
    LiveCommercialOpportunityResult | null,
  conclusion:
    string,
  nextStep:
    string,
): C144FirstCustomerResult {
  return {
    success:
      false,

    status,

    taskId:
      C144_FIRST_CUSTOMER_TASK_ID,

    project,

    opportunity,

    task:
      null,

    conclusion,

    nextStep,

    timestamp:
      Date.now(),
  };
}

function extractTask(
  opportunity:
    LiveCommercialOpportunityResult,
) {
  const decision =
    opportunity.decision;

  const runtime =
    opportunity.runtime;

  const recommendedAction =
    decision?.recommendedActions?.[0] ||
    "";

  const nextStep =
    opportunity.nextStep ||
    decision?.nextStep ||
    recommendedAction ||
    "Manually validate the highest-priority customer opportunity.";

  const measurableTarget =
    "Identify and manually approach 5 highly relevant prospective customers or businesses based on the verified opportunity.";

  const successSignal =
    "At least 1 prospective customer provides a qualified response or requests more information.";

  return {
    id:
      C144_FIRST_CUSTOMER_TASK_ID,

    title:
      "Find and validate the first paying customer",

    objectiveId:
      opportunity.objectiveId,

    status:
      "ready" as const,

    priority:
      "critical" as const,

    measurableTarget,

    successSignal,

    executionMode:
      "manual-founder" as const,

    externalSideEffectExecuted:
      false as const,

    recommendedAction,

    nextStep,

    runtimeTaskId:
      runtime?.taskId ||
      null,

    outcomeId:
      runtime?.outcomeId ||
      null,

    milestoneId:
      runtime?.milestoneId ||
      null,
  };
}

export async function executeC144FirstCustomerTask(): Promise<C144FirstCustomerResult> {
  const initialized =
    await initializeFirstCashflowProject();

  if (
    !initialized.success ||
    !initialized.objective
  ) {
    return buildBlockedResult(
      "objective-blocked",
      initialized.objective,
      null,
      initialized.message,
      initialized.nextAction,
    );
  }

  const objective =
    initialized.objective;

  const opportunity =
    await executeLiveCommercialOpportunity({
      objectiveId:
        objective.id,

      prompt:
        buildCustomerDiscoveryPrompt(
          objective,
        ),
    });

  if (
    !isLiveCommercialOpportunityReady(
      opportunity,
    )
  ) {
    return buildBlockedResult(
      "search-blocked",
      objective,
      opportunity,
      opportunity.conclusion,
      opportunity.nextStep,
    );
  }

  const task =
    extractTask(
      opportunity,
    );

  return {
    success:
      true,

    status:
      "ready",

    taskId:
      C144_FIRST_CUSTOMER_TASK_ID,

    project:
      objective,

    opportunity,

    task,

    conclusion:
      [
        "AIOS completed the first customer discovery cycle.",
        "Verified external intelligence was converted into a concrete customer-acquisition task.",
        "No external outreach or customer result was fabricated.",
      ].join(" "),

    nextStep:
      [
        "Founder should manually execute the generated customer-acquisition task.",
        `Target: ${task.measurableTarget}`,
        `Success signal: ${task.successSignal}`,
      ].join(" "),

    timestamp:
      Date.now(),
  };
}

export function isC144FirstCustomerTaskReady(
  result:
    C144FirstCustomerResult,
): boolean {
  return (
    result.success === true &&
    result.status === "ready" &&
    result.project !== null &&
    result.opportunity !== null &&
    isLiveCommercialOpportunityReady(
      result.opportunity,
    ) &&
    result.task !== null &&
    result.task.status === "ready" &&
    result.task.externalSideEffectExecuted ===
      false
  );
}
