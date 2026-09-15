import "server-only";

import type {
  CommercialObjective,
} from "@/lib/commercial/operating-layer";

import type {
  LiveDecision,
  LiveDecisionAction,
} from "@/lib/runtime/live-decision";

import type {
  LiveCommercialExecutionPlan,
} from "@/lib/runtime/live-commercial-execution";

export type LiveCommercialActionStatus =
  | "ready"
  | "blocked"
  | "manual-execution-required";

export type LiveCommercialActionType =
  | "customer-acquisition"
  | "sales-outreach"
  | "market-validation"
  | "pricing-validation"
  | "content-promotion"
  | "lead-generation"
  | "conversion"
  | "delivery"
  | "retention"
  | "scaling";

export interface LiveCommercialActionPackage {
  success: boolean;
  status: LiveCommercialActionStatus;

  objectiveId: string;
  objectiveTitle: string;

  actionType: LiveCommercialActionType;

  title: string;
  objective: string;

  primaryAction: string;

  executionInstruction: string;

  measurableTarget: string;

  successSignal: string;

  requiredInputs: string[];

  executionChannels: string[];

  risks: string[];

  evidenceCount: number;
  verified: boolean;

  externalSideEffectRequired: boolean;
  externalSideEffectExecuted: boolean;

  nextStep: string;

  generatedAt: number;
}

function normalizeText(
  value: unknown,
  maxLength = 1200,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function inferActionType(
  objective: CommercialObjective,
  action: LiveDecisionAction,
): LiveCommercialActionType {
  const text =
    normalizeText(
      `${action.action} ${action.reason}`,
    ).toLowerCase();

  if (
    text.includes("customer acquisition") ||
    text.includes("acquire customer") ||
    text.includes("获客") ||
    text.includes("集客") ||
    text.includes("customer")
  ) {
    return "customer-acquisition";
  }

  if (
    text.includes("outreach") ||
    text.includes("sales") ||
    text.includes("销售") ||
    text.includes("営業") ||
    text.includes("联系")
  ) {
    return "sales-outreach";
  }

  if (
    text.includes("lead") ||
    text.includes("leads") ||
    text.includes("线索") ||
    text.includes("リード")
  ) {
    return "lead-generation";
  }

  if (
    text.includes("price") ||
    text.includes("pricing") ||
    text.includes("价格") ||
    text.includes("価格")
  ) {
    return "pricing-validation";
  }

  if (
    text.includes("content") ||
    text.includes("内容") ||
    text.includes("コンテンツ") ||
    text.includes("promotion") ||
    text.includes("推广")
  ) {
    return "content-promotion";
  }

  if (
    text.includes("conversion") ||
    text.includes("转化") ||
    text.includes("コンバージョン")
  ) {
    return "conversion";
  }

  if (
    text.includes("delivery") ||
    text.includes("交付") ||
    text.includes("提供")
  ) {
    return "delivery";
  }

  if (
    text.includes("retention") ||
    text.includes("留存") ||
    text.includes("リテンション")
  ) {
    return "retention";
  }

  if (
    text.includes("scale") ||
    text.includes("scaling") ||
    text.includes("扩大") ||
    text.includes("扩张") ||
    text.includes("拡大")
  ) {
    return "scaling";
  }

  if (
    objective.stage === "acquisition"
  ) {
    return "customer-acquisition";
  }

  if (
    objective.stage === "conversion"
  ) {
    return "conversion";
  }

  if (
    objective.stage === "delivery"
  ) {
    return "delivery";
  }

  if (
    objective.stage === "retention"
  ) {
    return "retention";
  }

  if (
    objective.stage === "scaling"
  ) {
    return "scaling";
  }

  return "market-validation";
}

function buildExecutionInstruction(
  actionType: LiveCommercialActionType,
  primaryAction: string,
): string {
  switch (actionType) {
    case "customer-acquisition":
      return [
        "Identify the smallest qualified customer segment.",
        "Prepare one direct acquisition message or offer.",
        "Send or publish it through an available customer-facing channel.",
        "Record replies, qualified leads, and conversions.",
      ].join(" ");

    case "sales-outreach":
      return [
        "Identify qualified prospects matching the verified opportunity.",
        "Prepare a concise offer based on the verified market signal.",
        "Contact the prospects through an available sales channel.",
        "Record replies, meetings, offers, and purchases.",
      ].join(" ");

    case "lead-generation":
      return [
        "Define the target lead profile.",
        "Create one focused lead-generation asset or message.",
        "Publish or distribute it through an available channel.",
        "Record qualified leads and their source.",
      ].join(" ");

    case "pricing-validation":
      return [
        "Test the proposed price against the target customer segment.",
        "Use a measurable offer or pricing experiment.",
        "Record responses, objections, conversions, and realized price.",
      ].join(" ");

    case "content-promotion":
      return [
        "Create one focused promotional asset.",
        "Publish it to the selected customer-facing channel.",
        "Measure reach, engagement, qualified leads, and conversion.",
      ].join(" ");

    case "conversion":
      return [
        "Present the offer to qualified demand.",
        "Use the smallest measurable conversion action.",
        "Record completed orders, paid customers, and realized revenue.",
      ].join(" ");

    case "delivery":
      return [
        "Deliver the purchased product or service.",
        "Verify completion with the customer.",
        "Record delivery status and any customer feedback.",
      ].join(" ");

    case "retention":
      return [
        "Identify the existing customer or user segment.",
        "Execute one measurable retention action.",
        "Record repeat usage, repeat purchase, or retained customers.",
      ].join(" ");

    case "scaling":
      return [
        "Scale only the action with verified positive commercial evidence.",
        "Increase volume in a controlled increment.",
        "Record incremental revenue, customers, and costs.",
      ].join(" ");

    default:
      return [
        "Run the smallest measurable market validation.",
        `Primary action: ${primaryAction}`,
        "Record the real customer or market response.",
      ].join(" ");
  }
}

function buildMeasurableTarget(
  objective: CommercialObjective,
  actionType: LiveCommercialActionType,
): string {
  if (
    objective.customerTarget > 0
  ) {
    return `Target ${objective.customerTarget} verified customer result(s) within the current objective.`;
  }

  switch (actionType) {
    case "lead-generation":
      return "Generate at least one qualified lead.";

    case "sales-outreach":
      return "Generate at least one qualified sales conversation.";

    case "pricing-validation":
      return "Obtain at least one measurable customer pricing response.";

    case "content-promotion":
      return "Generate at least one qualified commercial signal.";

    default:
      return "Generate at least one measurable commercial signal.";
  }
}

function buildSuccessSignal(
  actionType: LiveCommercialActionType,
): string {
  switch (actionType) {
    case "customer-acquisition":
      return "A real qualified customer, lead, or purchase is obtained.";

    case "sales-outreach":
      return "A real prospect replies, books a conversation, or purchases.";

    case "lead-generation":
      return "A real qualified lead is captured.";

    case "pricing-validation":
      return "A real customer response validates or rejects the tested price.";

    case "content-promotion":
      return "The promotion generates a measurable qualified commercial signal.";

    case "conversion":
      return "A real purchase or paid conversion is completed.";

    case "delivery":
      return "The customer confirms successful delivery.";

    case "retention":
      return "A real repeat-use or repeat-purchase signal is recorded.";

    case "scaling":
      return "Additional verified revenue or customer growth is achieved without violating the cost target.";

    default:
      return "A real measurable market signal is recorded.";
  }
}

function buildRequiredInputs(
  action: LiveDecisionAction,
): string[] {
  const inputs = [
    "Verified live market evidence",
    "Verified commercial decision",
    "Primary commercial action",
  ];

  if (
    normalizeText(action.reason)
  ) {
    inputs.push(
      `Action rationale: ${normalizeText(action.reason)}`,
    );
  }

  return inputs;
}

function buildChannels(
  actionType: LiveCommercialActionType,
): string[] {
  switch (actionType) {
    case "customer-acquisition":
      return [
        "Direct outreach",
        "Social media",
        "Marketplace",
        "Existing customer network",
      ];

    case "sales-outreach":
      return [
        "Direct message",
        "Email",
        "Social media",
        "Sales platform",
      ];

    case "lead-generation":
      return [
        "Social media",
        "Landing page",
        "Community",
        "Marketplace",
      ];

    case "content-promotion":
      return [
        "X",
        "TikTok",
        "Xiaohongshu",
        "Other customer-facing content channel",
      ];

    case "pricing-validation":
      return [
        "Landing page",
        "Marketplace",
        "Direct sales",
        "Customer interviews",
      ];

    default:
      return [
        "Available customer-facing channel",
      ];
  }
}

export function buildLiveCommercialActionPackage(
  objective: CommercialObjective,
  decision: LiveDecision,
  executionPlan: LiveCommercialExecutionPlan,
): LiveCommercialActionPackage {
  const verified =
    decision.success === true &&
    decision.verification?.verified === true &&
    decision.evidence.length >= 2 &&
    executionPlan.success === true &&
    executionPlan.verified === true;

  const primaryAction =
    executionPlan.action;

  if (
    !verified ||
    !primaryAction
  ) {
    return {
      success: false,
      status: "blocked",
      objectiveId:
        objective.id,
      objectiveTitle:
        objective.title,
      actionType:
        "market-validation",
      title:
        "Commercial action blocked",
      objective:
        objective.title,
      primaryAction:
        primaryAction?.action ??
        "",
      executionInstruction:
        "Execution is blocked until verified commercial evidence and a concrete action are available.",
      measurableTarget:
        "No target can be executed while verification is blocked.",
      successSignal:
        "Verified commercial evidence and action readiness.",
      requiredInputs: [
        "Verified live evidence",
        "Verified commercial decision",
      ],
      executionChannels: [],
      risks: [],
      evidenceCount:
        decision.evidence.length,
      verified: false,
      externalSideEffectRequired:
        false,
      externalSideEffectExecuted:
        false,
      nextStep:
        "Resolve the verification block before executing a commercial action.",
      generatedAt:
        Date.now(),
    };
  }

  const actionType =
    inferActionType(
      objective,
      primaryAction,
    );

  const executionInstruction =
    buildExecutionInstruction(
      actionType,
      primaryAction.action,
    );

  return {
    success: true,
    status:
      "manual-execution-required",
    objectiveId:
      objective.id,
    objectiveTitle:
      objective.title,
    actionType,
    title:
      normalizeText(
        primaryAction.action,
      ),
    objective:
      objective.title,
    primaryAction:
      normalizeText(
        primaryAction.action,
      ),
    executionInstruction,
    measurableTarget:
      buildMeasurableTarget(
        objective,
        actionType,
      ),
    successSignal:
      buildSuccessSignal(
        actionType,
      ),
    requiredInputs:
      buildRequiredInputs(
        primaryAction,
      ),
    executionChannels:
      buildChannels(
        actionType,
      ),
    risks:
      executionPlan.risks,
    evidenceCount:
      decision.evidence.length,
    verified: true,
    externalSideEffectRequired:
      true,
    externalSideEffectExecuted:
      false,
    nextStep:
      "Execute the action through an available external channel and return the real verified result.",
    generatedAt:
      Date.now(),
  };
}

export function isLiveCommercialActionPackageReady(
  packageResult: LiveCommercialActionPackage,
): boolean {
  return (
    packageResult.success === true &&
    packageResult.status ===
      "manual-execution-required" &&
    packageResult.verified === true &&
    Boolean(packageResult.primaryAction) &&
    packageResult.requiredInputs.length >= 2 &&
    packageResult.executionChannels.length >= 1 &&
    packageResult.externalSideEffectRequired === true &&
    packageResult.externalSideEffectExecuted === false
  );
}

export function buildLiveCommercialActionContext(
  packageResult: LiveCommercialActionPackage,
): string {
  return [
    "AIOS LIVE COMMERCIAL ACTION PACKAGE",
    "",
    `STATUS: ${packageResult.status}`,
    `OBJECTIVE: ${packageResult.objectiveTitle}`,
    `OBJECTIVE ID: ${packageResult.objectiveId}`,
    `ACTION TYPE: ${packageResult.actionType}`,
    `VERIFIED: ${packageResult.verified ? "YES" : "NO"}`,
    `EVIDENCE COUNT: ${packageResult.evidenceCount}`,
    "",
    `TITLE: ${packageResult.title}`,
    `PRIMARY ACTION: ${packageResult.primaryAction}`,
    "",
    "EXECUTION INSTRUCTION:",
    packageResult.executionInstruction,
    "",
    `MEASURABLE TARGET: ${packageResult.measurableTarget}`,
    `SUCCESS SIGNAL: ${packageResult.successSignal}`,
    "",
    "REQUIRED INPUTS:",
    ...packageResult.requiredInputs.map(
      (item) => `- ${item}`,
    ),
    "",
    "EXECUTION CHANNELS:",
    ...packageResult.executionChannels.map(
      (item) => `- ${item}`,
    ),
    "",
    "RISKS:",
    ...(packageResult.risks.length > 0
      ? packageResult.risks.map(
          (item) => `- ${item}`,
        )
      : ["- None identified."]),
    "",
    `EXTERNAL SIDE EFFECT REQUIRED: ${packageResult.externalSideEffectRequired ? "YES" : "NO"}`,
    `EXTERNAL SIDE EFFECT EXECUTED: ${packageResult.externalSideEffectExecuted ? "YES" : "NO"}`,
    "",
    `NEXT STEP: ${packageResult.nextStep}`,
  ].join("\n");
}
