import "server-only";

import {
  createCommercialObjective,
  getCommercialObjective,
  type CommercialObjective,
} from "@/lib/commercial/operating-layer";

import {
  ensureCommercialOperatingLoop,
} from "@/lib/commercial/operating-loop";

export const FIRST_CASHFLOW_PROJECT_ID =
  "C144-FIRST-CASHFLOW";

export const FIRST_CASHFLOW_PROJECT = {
  id: FIRST_CASHFLOW_PROJECT_ID,

  title:
    "AIOS 30-Day First Cashflow Project",

  description:
    "Use AIOS live intelligence, commercial decision-making, planning, and execution management to acquire the first real paying customer through a cross-border market intelligence and product validation service.",

  offer:
    "AIOS-powered cross-border market intelligence and product validation service.",

  targetMarket:
    "China-based suppliers, sellers, and small businesses seeking validated opportunities in Japan and cross-border markets.",

  currency:
    "CNY",

  revenueTarget:
    5000,

  costTarget:
    500,

  customerTarget:
    1,

  deadlineDays:
    30,

  stage:
    "acquisition" as const,

  successCriteria:
    "At least one real paying customer is acquired and at least CNY 5,000 in verified revenue is recorded within 30 days.",

  executionModel:
    "AIOS performs intelligence, verification, analysis, decision-making, planning, task generation, and result analysis. Founder performs external actions that do not yet have an authorized API adapter.",

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

  message: string;

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

export async function initializeFirstCashflowProject(): Promise<FirstCashflowProjectResult> {
  const timestamp =
    Date.now();

  try {
    let objective =
      await getCommercialObjective(
        FIRST_CASHFLOW_PROJECT_ID,
      );

    let status:
      FirstCashflowProjectResult["status"] =
      "existing";

    if (!objective) {
      const input =
        buildObjectiveInput();

      objective =
        await createCommercialObjective(
          input,
        );

      status =
        "created";
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
          "AIOS could not initialize the first cashflow commercial objective.",
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
          "Repair the commercial operating loop before executing C144 tasks.",
        timestamp,
      };
    }

    status =
      "loop-ready";

    return {
      success: true,
      projectId:
        FIRST_CASHFLOW_PROJECT_ID,
      status,
      objective,
      operatingLoop,
      message:
        "C144 first cashflow project is initialized and connected to the commercial operating loop.",
      nextAction:
        "Run live market intelligence to identify and prioritize the first customer acquisition opportunity.",
      timestamp,
    };
  } catch (error) {
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
        error instanceof Error
          ? error.message
          : "C144 first cashflow project initialization failed.",
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
    externalExecution:
      {
        automatic:
          false,
        reason:
          "External platform API credentials and authorized adapters are not yet configured.",
        fallback:
          "Founder manually performs authorized external actions generated by AIOS.",
      },
  };
}
