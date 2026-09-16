import "server-only";

import {
  createCommercialObjective,
  listCommercialObjectives,
  type CommercialObjective,
} from "@/lib/commercial/operating-layer";

import {
  ensureCommercialOperatingLoop,
} from "@/lib/commercial/operating-loop";

export const FIRST_CASHFLOW_PROJECT_ID =
  "C144-FIRST-CASHFLOW";

export const FIRST_CASHFLOW_PROJECT = {
  id:
    FIRST_CASHFLOW_PROJECT_ID,

  title:
    "AIOS First Real Profit Project",

  description:
    "Use AIOS to discover a real demand, select a low-risk productized offer, design the smallest commercial experiment, execute it manually, and verify the first real positive-profit transaction.",

  offer:
    "A small productized digital or information outcome selected from verified current demand.",

  targetMarket:
    "Mainland China first. Japan and cross-border opportunities are considered only when they can be executed without unavailable infrastructure.",

  currency:
    "CNY",

  revenueTarget:
    1,

  costTarget:
    500,

  customerTarget:
    1,

  deadlineDays:
    30,

  stage:
    "validation" as const,

  successCriteria:
    "At least one real transaction is completed within 30 days and verified revenue minus verified direct cost is greater than zero.",

  executionModel:
    "AIOS performs live intelligence, evidence verification, commercial analysis, opportunity selection, experiment design, pricing logic, task generation, and result analysis. Founder performs necessary external actions manually.",

  externalExecutionMode:
    "manual-until-authorized-adapter",

  createdBy:
    "AIOS-C144",
} as const;

export interface FirstCashflowProjectResult {
  success: boolean;

  projectId: string;

  status:
    | "created"
    | "existing"
    | "loop-ready"
    | "blocked";

  objective:
    CommercialObjective | null;

  operatingLoop:
    unknown;

  message:
    string;

  nextAction:
    string;

  timestamp:
    number;
}

function buildObjectiveInput() {
  return {
    title:
      FIRST_CASHFLOW_PROJECT.title,

    description:
      [
        FIRST_CASHFLOW_PROJECT.description,
        `Offer: ${FIRST_CASHFLOW_PROJECT.offer}`,
        `Target market: ${FIRST_CASHFLOW_PROJECT.targetMarket}`,
        `Execution model: ${FIRST_CASHFLOW_PROJECT.executionModel}`,
      ].join(" "),

    status:
      "active" as const,

    stage:
      FIRST_CASHFLOW_PROJECT.stage,

    currency:
      FIRST_CASHFLOW_PROJECT.currency,

    revenueTarget:
      FIRST_CASHFLOW_PROJECT.revenueTarget,

    costTarget:
      FIRST_CASHFLOW_PROJECT.costTarget,

    customerTarget:
      FIRST_CASHFLOW_PROJECT.customerTarget,

    deadlineDays:
      FIRST_CASHFLOW_PROJECT.deadlineDays,

    successCriteria:
      FIRST_CASHFLOW_PROJECT.successCriteria,

    outcomeId:
      null,

    taskId:
      null,
  };
}

async function findExistingObjective(): Promise<CommercialObjective | null> {
  const objectives =
    await listCommercialObjectives();

  const normalizedTitle =
    FIRST_CASHFLOW_PROJECT.title
      .trim()
      .toLowerCase();

  const existing =
    objectives.find(
      (item) =>
        item.title
          .trim()
          .toLowerCase() ===
          normalizedTitle &&
        item.status !==
          "cancelled",
    );

  return existing || null;
}

export async function initializeFirstCashflowProject(): Promise<FirstCashflowProjectResult> {
  const timestamp =
    Date.now();

  try {
    let objective =
      await findExistingObjective();

    let status:
      FirstCashflowProjectResult["status"] =
      objective
        ? "existing"
        : "created";

    if (!objective) {
      objective =
        await createCommercialObjective(
          buildObjectiveInput(),
        );
    }

    if (!objective) {
      return {
        success: false,
        projectId:
          FIRST_CASHFLOW_PROJECT_ID,
        status:
          "blocked",
        objective:
          null,
        operatingLoop:
          null,
        message:
          "AIOS could not initialize the first real profit commercial objective.",
        nextAction:
          "Inspect commercial objective storage before continuing C144.",
        timestamp,
      };
    }

    let operatingLoop:
      unknown = null;

    try {
      operatingLoop =
        await ensureCommercialOperatingLoop(
          objective.id,
        );
    } catch (error) {
      return {
        success: false,
        projectId:
          FIRST_CASHFLOW_PROJECT_ID,
        status:
          "blocked",
        objective,
        operatingLoop:
          null,
        message:
          error instanceof Error
            ? error.message
            : "Commercial operating loop initialization failed.",
        nextAction:
          "Repair the commercial operating loop before executing C144.",
        timestamp,
      };
    }

    status =
      "loop-ready";

    return {
      success:
        true,

      projectId:
        FIRST_CASHFLOW_PROJECT_ID,

      status,

      objective,

      operatingLoop,

      message:
        "C144 first real profit project is initialized and connected to the commercial operating loop.",

      nextAction:
        "Run C144.3.8 commercial operation to discover and rank the smallest realistic profit experiment.",

      timestamp,
    };
  } catch (error) {
    return {
      success:
        false,

      projectId:
        FIRST_CASHFLOW_PROJECT_ID,

      status:
        "blocked",

      objective:
        null,

      operatingLoop:
        null,

      message:
        error instanceof Error
          ? error.message
          : "C144 first real profit project initialization failed.",

      nextAction:
        "Inspect the commercial runtime and retry C144 initialization.",

      timestamp,
    };
  }
}

export function getFirstCashflowProjectDefinition() {
  return {
    ...FIRST_CASHFLOW_PROJECT,

    objectiveId:
      FIRST_CASHFLOW_PROJECT_ID,

    externalExecution: {
      automatic:
        false,

      reason:
        "External platform API credentials and authorized adapters are not yet configured.",

      fallback:
        "Founder manually performs necessary external actions generated by AIOS.",
    },
  };
}
