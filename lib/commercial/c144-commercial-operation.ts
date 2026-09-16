import "server-only";

import {
  initializeFirstCashflowProject,
} from "@/lib/commercial/first-cashflow-project";

import {
  retrieveWebEvidence,
  type WebIntelligenceResult,
} from "@/lib/web-intelligence";

import {
  buildLiveDecision,
  type LiveDecision,
} from "@/lib/runtime/live-decision";

export const C144_COMMERCIAL_OPERATION_ID =
  "C144-ZERO-TO-PROFIT";

export const C144_COMMERCIAL_OPERATION_VERSION =
  "C144.3.8";

export type C144ExperimentStage =
  | "demand-discovery"
  | "product-selection"
  | "pricing"
  | "acquisition"
  | "conversion"
  | "delivery"
  | "profit-verification";

export interface C144CommercialExperiment {
  id: string;
  title: string;
  stage: C144ExperimentStage;

  market: string;
  product: string;

  priceModel: string;
  directCostModel: string;
  acquisitionModel: string;
  fulfillmentModel: string;

  evidenceIds: string[];

  sourceCount: number;
  independentHosts: number;

  targetFirstPriceCny: number;
  targetDirectCostCny: number;
  targetProfitCny: number;

  founderNextAction: string;
  successSignal: string;

  confidence: number;

  risk: "low" | "medium";

  requiresManualFounderAction: true;
  externalSideEffectExecuted: false;
}

export interface C144CommercialOperationResult {
  success: boolean;

  status:
    | "ready"
    | "blocked"
    | "insufficient-evidence";

  version: string;

  operationId: string;

  projectId: string;
  objectiveId: string;

  marketStrategy:
    "domestic-first";

  stage:
    C144ExperimentStage;

  web: {
    success: boolean;
    verified: boolean;
    sourceCount: number;
    independentHosts: number;
  };

  decision:
    LiveDecision | null;

  experiments:
    C144CommercialExperiment[];

  selectedExperiment:
    C144CommercialExperiment | null;

  integrity: {
    fabricatedCustomer: false;
    fabricatedOrder: false;
    fabricatedRevenue: false;
    fabricatedCost: false;
    fabricatedProfit: false;
    externalSideEffectExecuted: false;
  };

  conclusion: string;
  nextStep: string;

  generatedAt: number;
}

const C144_DISCOVERY_PROMPT = `
C144 ZERO-TO-PROFIT COMMERCIAL OPERATION

Mission:
Help the founder create the first real positive-profit commercial result.

Primary KPI:
REAL_PROFIT > 0

Commercial sequence:
Demand discovery -> product selection -> pricing -> smallest commercial experiment -> acquisition -> conversion -> delivery -> real revenue -> real cost -> real profit -> learning.

Reality constraints:
- Solo founder.
- No established AIOS brand reputation.
- No large audience.
- No large advertising budget.
- No assumed overseas company.
- No assumed overseas bank account.
- No assumed inventory.
- No assumed marketplace API.
- Prefer mainland China and CNY for the first transaction.
- Japan and cross-border opportunities are secondary until infrastructure exists.
- Prefer existing demand channels over building an audience from zero.
- Prefer digital, information, research, localization, validation, content or other low-upfront-cost outcomes.
- Prefer fixed-scope products that can be delivered quickly.

The key question is NOT:
"How can AIOS sell AIOS?"

The key question is:
"What real problem can the founder solve now, with a small concrete paid outcome, using AIOS as the internal operating system?"

Find evidence for:
1. Concrete buyer problems.
2. Existing demand.
3. Current commercial activity.
4. Requests for research, validation, localization, content, sourcing, comparison, data organization or similar outcomes.
5. Problems that can be solved without inventory or large capital.
6. Situations where a small fixed-scope paid experiment is realistic.

Reject:
- generic market theory
- generic AI trends
- broad consumer statistics
- ideas requiring large inventory
- ideas requiring large advertising spend
- ideas requiring an established brand
- ideas requiring overseas banking
- ideas requiring large social following
- ideas that only sound profitable but have no observable demand signal

For every useful signal, distinguish:
FACT
COMMERCIAL JUDGMENT
RISK
OPPORTUNITY
NEXT ACTION

The result must be suitable for a solo founder.

AIOS may:
- retrieve live information
- verify evidence
- analyze evidence
- identify opportunities
- design a minimum commercial experiment
- calculate target pricing and cost boundaries
- prepare founder tasks

AIOS must NOT claim:
- a customer exists
- a buyer is interested
- an order exists
- payment was received
- revenue exists
- cost was incurred
- profit exists
- an external message was sent
- an external listing was published

Those facts become true only after actual founder execution and explicit result recording.

Select the smallest realistic experiment with:
- low startup cost
- short delivery time
- clear buyer outcome
- simple manual acquisition
- positive potential margin
- measurable success signal
- low dependency on AIOS brand trust

The first transaction should preferably be domestic CNY.

Do not fabricate demand.
Do not fabricate customers.
Do not fabricate revenue.
Do not fabricate profit.
`.trim();

interface ExperimentLane {
  id: string;
  title: string;
  product: string;
  founderAction: string;
  price: number;
  directCost: number;
  risk: "low" | "medium";
}

const EXPERIMENT_LANES: ExperimentLane[] = [
  {
    id: "research",
    title: "Verified Research Pack",
    product:
      "A fixed-scope research result answering one concrete business question using current verified sources.",
    founderAction:
      "Find one existing buyer need or business request and offer a fixed-scope research result.",
    price: 399,
    directCost: 100,
    risk: "low",
  },
  {
    id: "validation",
    title: "Product Validation Pack",
    product:
      "A compact demand, competitor and pricing validation result for one specific product.",
    founderAction:
      "Find a real seller or product owner with a validation problem and offer one paid test.",
    price: 399,
    directCost: 100,
    risk: "low",
  },
  {
    id: "japan-localization",
    title: "Japan Localization Pack",
    product:
      "A small Japan-market localization result covering current market evidence, competitors and localized product copy.",
    founderAction:
      "Find one concrete product with a Japan localization need and manually propose a small paid test.",
    price: 299,
    directCost: 50,
    risk: "low",
  },
  {
    id: "listing",
    title: "Product Listing Content Pack",
    product:
      "A product-page content package based on current competitor and market evidence.",
    founderAction:
      "Find one real seller or listing that needs improvement and offer one fixed-scope package.",
    price: 299,
    directCost: 50,
    risk: "medium",
  },
  {
    id: "supplier",
    title: "Supplier Validation Pack",
    product:
      "A narrow supplier comparison and validation result for one concrete sourcing requirement.",
    founderAction:
      "Find one concrete sourcing request and offer a paid validation result rather than promising procurement.",
    price: 499,
    directCost: 100,
    risk: "medium",
  },
];

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(
    max,
    Math.max(min, value),
  );
}

function buildExperiment(
  lane: ExperimentLane,
  web: WebIntelligenceResult,
): C144CommercialExperiment {
  const evidence =
    web.evidence.slice(0, 6);

  const independentHosts =
    new Set(
      evidence.map(
        (item) =>
          item.hostname.toLowerCase(),
      ),
    ).size;

  const confidence =
    clamp(
      (web.verified ? 0.5 : 0.2) +
        Math.min(
          evidence.length,
          6,
        ) *
          0.04 +
        Math.min(
          independentHosts,
          5,
        ) *
          0.05,
      0,
      0.95,
    );

  return {
    id:
      `C144-EXP-${lane.id}`,

    title:
      lane.title,

    stage:
      "product-selection",

    market:
      "Mainland China first; Japan and cross-border only when evidence supports practical execution.",

    product:
      lane.product,

    priceModel:
      `Fixed-scope first-test price target: CNY ${lane.price}`,

    directCostModel:
      `Direct-cost ceiling target: CNY ${lane.directCost}. Actual cost must be recorded only after execution.`,

    acquisitionModel:
      "Manual founder acquisition through an existing demand channel or concrete buyer need.",

    fulfillmentModel:
      "AIOS prepares the deliverable. Founder reviews and manually delivers it.",

    evidenceIds:
      evidence.map(
        (item) =>
          item.id,
      ),

    sourceCount:
      evidence.length,

    independentHosts,

    targetFirstPriceCny:
      lane.price,

    targetDirectCostCny:
      lane.directCost,

    targetProfitCny:
      Math.max(
        1,
        lane.price -
          lane.directCost,
      ),

    founderNextAction:
      lane.founderAction,

    successSignal:
      "One real buyer agrees to the paid fixed-scope experiment and the actual payment is recorded.",

    confidence,

    risk:
      lane.risk,

    requiresManualFounderAction:
      true,

    externalSideEffectExecuted:
      false,
  };
}

function buildIntegrity() {
  return {
    fabricatedCustomer: false as const,
    fabricatedOrder: false as const,
    fabricatedRevenue: false as const,
    fabricatedCost: false as const,
    fabricatedProfit: false as const,
    externalSideEffectExecuted: false as const,
  };
}

export async function runC144CommercialOperation(): Promise<C144CommercialOperationResult> {
  const generatedAt =
    Date.now();

  const project =
    await initializeFirstCashflowProject();

  if (
    !project.success ||
    !project.objective
  ) {
    return {
      success:
        false,

      status:
        "blocked",

      version:
        C144_COMMERCIAL_OPERATION_VERSION,

      operationId:
        C144_COMMERCIAL_OPERATION_ID,

      projectId:
        project.projectId,

      objectiveId:
        project.objective?.id ||
        "",

      marketStrategy:
        "domestic-first",

      stage:
        "demand-discovery",

      web: {
        success:
          false,

        verified:
          false,

        sourceCount:
          0,

        independentHosts:
          0,
      },

      decision:
        null,

      experiments:
        [],

      selectedExperiment:
        null,

      integrity:
        buildIntegrity(),

      conclusion:
        project.message,

      nextStep:
        project.nextAction,

      generatedAt,
    };
  }

  const web =
    await retrieveWebEvidence(
      C144_DISCOVERY_PROMPT,
    );

  const independentHosts =
    web.sourceHosts.length;

  if (
    !web.success ||
    web.evidence.length === 0
  ) {
    return {
      success:
        false,

      status:
        "insufficient-evidence",

      version:
        C144_COMMERCIAL_OPERATION_VERSION,

      operationId:
        C144_COMMERCIAL_OPERATION_ID,

      projectId:
        project.projectId,

      objectiveId:
        project.objective.id,

      marketStrategy:
        "domestic-first",

      stage:
        "demand-discovery",

      web: {
        success:
          web.success,

        verified:
          web.verified,

        sourceCount:
          web.sourceCount,

        independentHosts,
      },

      decision:
        null,

      experiments:
        [],

      selectedExperiment:
        null,

      integrity:
        buildIntegrity(),

      conclusion:
        "AIOS did not retrieve enough current external evidence to design a safe commercial experiment.",

      nextStep:
        "Retry live demand discovery. Do not invent demand or commercial results.",

      generatedAt,
    };
  }

  const decision =
    buildLiveDecision(web);

  const experiments =
    EXPERIMENT_LANES.map(
      (lane) =>
        buildExperiment(
          lane,
          web,
        ),
    );

  const ranked =
    [...experiments].sort(
      (a, b) => {
        const scoreA =
          a.confidence * 0.6 +
          (a.targetProfitCny /
            500) *
            0.2 +
          (a.risk === "low"
            ? 0.2
            : 0.1);

        const scoreB =
          b.confidence * 0.6 +
          (b.targetProfitCny /
            500) *
            0.2 +
          (b.risk === "low"
            ? 0.2
            : 0.1);

        return scoreB - scoreA;
      },
    );

  const selectedExperiment =
    web.verified &&
    web.sourceCount >= 2 &&
    independentHosts >= 2
      ? ranked[0] || null
      : null;

  if (
    !selectedExperiment
  ) {
    return {
      success:
        false,

      status:
        "insufficient-evidence",

      version:
        C144_COMMERCIAL_OPERATION_VERSION,

      operationId:
        C144_COMMERCIAL_OPERATION_ID,

      projectId:
        project.projectId,

      objectiveId:
        project.objective.id,

      marketStrategy:
        "domestic-first",

      stage:
        "demand-discovery",

      web: {
        success:
          web.success,

        verified:
          web.verified,

        sourceCount:
          web.sourceCount,

        independentHosts,
      },

      decision,

      experiments,

      selectedExperiment:
        null,

      integrity:
        buildIntegrity(),

      conclusion:
        "Current evidence exists, but it is not sufficiently verified to select a first-profit experiment.",

      nextStep:
        "Strengthen independent evidence before committing to an experiment.",

      generatedAt,
    };
  }

  return {
    success:
      true,

    status:
      "ready",

    version:
      C144_COMMERCIAL_OPERATION_VERSION,

    operationId:
      C144_COMMERCIAL_OPERATION_ID,

    projectId:
      project.projectId,

    objectiveId:
      project.objective.id,

    marketStrategy:
      "domestic-first",

    stage:
      "product-selection",

    web: {
      success:
        web.success,

      verified:
        web.verified,

      sourceCount:
        web.sourceCount,

      independentHosts,
    },

    decision,

    experiments,

    selectedExperiment,

    integrity:
      buildIntegrity(),

    conclusion:
      `C144.3.8 selected a smallest-first commercial experiment: ${selectedExperiment.title}. This is an experiment design, not evidence of a sale.`,

    nextStep:
      selectedExperiment.founderNextAction,

    generatedAt,
  };
}

export function isC144CommercialOperationReady(
  result: C144CommercialOperationResult,
): boolean {
  return (
    result.success &&
    result.status ===
      "ready" &&
    result.version ===
      C144_COMMERCIAL_OPERATION_VERSION &&
    result.marketStrategy ===
      "domestic-first" &&
    result.projectId.length >
      0 &&
    result.objectiveId.length >
      0 &&
    result.web.success &&
    result.web.verified &&
    result.web.sourceCount >=
      2 &&
    result.web.independentHosts >=
      2 &&
    result.selectedExperiment !==
      null &&
    result.integrity.fabricatedCustomer ===
      false &&
    result.integrity.fabricatedOrder ===
      false &&
    result.integrity.fabricatedRevenue ===
      false &&
    result.integrity.fabricatedCost ===
      false &&
    result.integrity.fabricatedProfit ===
      false &&
    result.integrity.externalSideEffectExecuted ===
      false
  );
}
