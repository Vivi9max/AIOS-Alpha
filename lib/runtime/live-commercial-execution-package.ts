import "server-only";

import type {
  CommercialObjective,
} from "@/lib/commercial/operating-layer";

import type {
  LiveDecision,
} from "@/lib/runtime/live-decision";

import type {
  LiveCommercialExecutionPlan,
} from "@/lib/runtime/live-commercial-execution";

import type {
  LiveCommercialActionPackage,
} from "@/lib/runtime/live-commercial-action";

export type LiveCommercialExecutionPackageStatus =
  | "ready-for-approval"
  | "approved"
  | "blocked"
  | "external-execution-pending"
  | "completed";

export interface LiveCommercialExecutionPackage {
  success: boolean;

  status:
    LiveCommercialExecutionPackageStatus;

  objectiveId: string;

  objectiveTitle: string;

  actionType:
    LiveCommercialActionPackage["actionType"];

  actionTitle: string;

  primaryAction: string;

  executionInstruction: string;

  measurableTarget: string;

  successSignal: string;

  executionChannels: string[];

  requiredInputs: string[];

  risks: string[];

  evidenceCount: number;

  verified: boolean;

  approvalRequired: boolean;

  approved: boolean;

  externalSideEffectRequired: boolean;

  externalSideEffectExecuted: boolean;

  executionTaskId: string | null;

  outcomeId: string | null;

  milestoneId: string | null;

  nextStep: string;

  createdAt: number;

  updatedAt: number;
}

function blockedPackage(
  objective: CommercialObjective,
  reason: string,
): LiveCommercialExecutionPackage {
  const now = Date.now();

  return {
    success: false,
    status: "blocked",
    objectiveId: objective.id,
    objectiveTitle: objective.title,
    actionType: "market-validation",
    actionTitle: "Commercial execution blocked",
    primaryAction: reason,
    executionInstruction:
      "Do not execute an external commercial action until the verification requirements are satisfied.",
    measurableTarget:
      "No target is active while execution is blocked.",
    successSignal:
      "Verified commercial execution package becomes ready.",
    executionChannels: [],
    requiredInputs: [],
    risks: [
      "Unverified commercial intelligence.",
      "External side effect must not occur.",
    ],
    evidenceCount: 0,
    verified: false,
    approvalRequired: true,
    approved: false,
    externalSideEffectRequired: true,
    externalSideEffectExecuted: false,
    executionTaskId: null,
    outcomeId: null,
    milestoneId: null,
    nextStep:
      "Return to live intelligence verification.",
    createdAt: now,
    updatedAt: now,
  };
}

export function buildLiveCommercialExecutionPackage(
  objective: CommercialObjective,
  decision: LiveDecision,
  executionPlan: LiveCommercialExecutionPlan,
  actionPackage: LiveCommercialActionPackage,
): LiveCommercialExecutionPackage {
  if (
    !decision.success ||
    decision.verification?.verified !== true ||
    executionPlan.success !== true ||
    executionPlan.verified !== true ||
    actionPackage.success !== true ||
    actionPackage.verified !== true ||
    actionPackage.externalSideEffectRequired !== true
  ) {
    return blockedPackage(
      objective,
      "The commercial execution package requires verified intelligence, decision, execution plan, and action package.",
    );
  }

  const now = Date.now();

  return {
    success: true,

    status:
      "ready-for-approval",

    objectiveId:
      objective.id,

    objectiveTitle:
      objective.title,

    actionType:
      actionPackage.actionType,

    actionTitle:
      actionPackage.title,

    primaryAction:
      actionPackage.primaryAction,

    executionInstruction:
      actionPackage.executionInstruction,

    measurableTarget:
      actionPackage.measurableTarget,

    successSignal:
      actionPackage.successSignal,

    executionChannels:
      [...actionPackage.executionChannels],

    requiredInputs:
      [...actionPackage.requiredInputs],

    risks:
      [...actionPackage.risks],

    evidenceCount:
      executionPlan.evidenceCount,

    verified:
      true,

    approvalRequired:
      true,

    approved:
      false,

    externalSideEffectRequired:
      true,

    externalSideEffectExecuted:
      false,

    executionTaskId:
      null,

    outcomeId:
      null,

    milestoneId:
      null,

    nextStep:
      "Review the execution instruction and approve the external commercial action.",

    createdAt:
      now,

    updatedAt:
      now,
  };
}

export function approveLiveCommercialExecutionPackage(
  executionPackage: LiveCommercialExecutionPackage,
): LiveCommercialExecutionPackage {
  if (
    !executionPackage.success ||
    executionPackage.status === "blocked" ||
    !executionPackage.verified
  ) {
    return {
      ...executionPackage,
      status: "blocked",
      approved: false,
      nextStep:
        "Execution cannot be approved because the package is not verified and ready.",
      updatedAt: Date.now(),
    };
  }

  if (
    executionPackage.externalSideEffectExecuted
  ) {
    return {
      ...executionPackage,
      status: "completed",
      approved: true,
      nextStep:
        "External execution has already occurred. Record the verified business result.",
      updatedAt: Date.now(),
    };
  }

  return {
    ...executionPackage,
    status:
      "approved",
    approved:
      true,
    nextStep:
      "Execute the approved external commercial action and capture the real result.",
    updatedAt:
      Date.now(),
  };
}

export function markLiveCommercialExecutionPending(
  executionPackage: LiveCommercialExecutionPackage,
  taskId: string,
  outcomeId: string,
  milestoneId: string | null,
): LiveCommercialExecutionPackage {
  if (
    !executionPackage.success ||
    !executionPackage.approved ||
    executionPackage.externalSideEffectExecuted
  ) {
    return {
      ...executionPackage,
      status: "blocked",
      nextStep:
        "Execution cannot be started until the package is approved and no external side effect has already occurred.",
      updatedAt: Date.now(),
    };
  }

  return {
    ...executionPackage,
    status:
      "external-execution-pending",
    executionTaskId:
      taskId,
    outcomeId,
    milestoneId,
    nextStep:
      "Perform the external action. Record only the real verified commercial result.",
    updatedAt:
      Date.now(),
  };
}

export function markLiveCommercialExecutionCompleted(
  executionPackage: LiveCommercialExecutionPackage,
): LiveCommercialExecutionPackage {
  if (
    !executionPackage.approved ||
    !executionPackage.externalSideEffectRequired
  ) {
    return {
      ...executionPackage,
      status: "blocked",
      nextStep:
        "Execution completion requires an approved external action package.",
      updatedAt: Date.now(),
    };
  }

  return {
    ...executionPackage,
    status:
      "completed",
    externalSideEffectExecuted:
      true,
    nextStep:
      "Record the verified commercial result through the verified result gate.",
    updatedAt:
      Date.now(),
  };
}

export function isLiveCommercialExecutionPackageReady(
  executionPackage: LiveCommercialExecutionPackage,
): boolean {
  return (
    executionPackage.success === true &&
    executionPackage.status ===
      "ready-for-approval" &&
    executionPackage.verified === true &&
    executionPackage.approvalRequired === true &&
    executionPackage.approved === false &&
    executionPackage.externalSideEffectRequired === true &&
    executionPackage.externalSideEffectExecuted === false &&
    Boolean(
      executionPackage.primaryAction,
    ) &&
    Boolean(
      executionPackage.executionInstruction,
    ) &&
    Boolean(
      executionPackage.measurableTarget,
    ) &&
    Boolean(
      executionPackage.successSignal,
    ) &&
    executionPackage.executionChannels.length >
      0 &&
    executionPackage.requiredInputs.length >
      0
  );
}

export function isLiveCommercialExecutionApproved(
  executionPackage: LiveCommercialExecutionPackage,
): boolean {
  return (
    executionPackage.success === true &&
    executionPackage.verified === true &&
    executionPackage.approved === true &&
    (
      executionPackage.status ===
        "approved" ||
      executionPackage.status ===
        "external-execution-pending" ||
      executionPackage.status ===
        "completed"
    ) &&
    executionPackage.externalSideEffectRequired ===
      true
  );
}

export function buildLiveCommercialExecutionPackageContext(
  executionPackage: LiveCommercialExecutionPackage,
): string {
  return [
    "AIOS LIVE COMMERCIAL EXECUTION PACKAGE",
    "",
    `STATUS: ${executionPackage.status}`,
    `OBJECTIVE ID: ${executionPackage.objectiveId}`,
    `OBJECTIVE: ${executionPackage.objectiveTitle}`,
    `ACTION TYPE: ${executionPackage.actionType}`,
    `ACTION TITLE: ${executionPackage.actionTitle}`,
    "",
    `VERIFIED: ${executionPackage.verified ? "YES" : "NO"}`,
    `APPROVAL REQUIRED: ${executionPackage.approvalRequired ? "YES" : "NO"}`,
    `APPROVED: ${executionPackage.approved ? "YES" : "NO"}`,
    "",
    `PRIMARY ACTION: ${executionPackage.primaryAction}`,
    "",
    `EXECUTION INSTRUCTION: ${executionPackage.executionInstruction}`,
    "",
    `MEASURABLE TARGET: ${executionPackage.measurableTarget}`,
    `SUCCESS SIGNAL: ${executionPackage.successSignal}`,
    "",
    `CHANNELS: ${executionPackage.executionChannels.join(", ")}`,
    `REQUIRED INPUTS: ${executionPackage.requiredInputs.join(", ")}`,
    "",
    `EXTERNAL SIDE EFFECT REQUIRED: ${
      executionPackage.externalSideEffectRequired
        ? "YES"
        : "NO"
    }`,
    `EXTERNAL SIDE EFFECT EXECUTED: ${
      executionPackage.externalSideEffectExecuted
        ? "YES"
        : "NO"
    }`,
    "",
    `TASK ID: ${
      executionPackage.executionTaskId ??
      "NOT STARTED"
    }`,
    `OUTCOME ID: ${
      executionPackage.outcomeId ??
      "NOT LINKED"
    }`,
    `MILESTONE ID: ${
      executionPackage.milestoneId ??
      "NOT LINKED"
    }`,
    "",
    `NEXT STEP: ${executionPackage.nextStep}`,
  ].join("\n");
}
