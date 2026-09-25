import {
  runMarketResearchDossier,
} from "./market-research-dossier-runtime";

import type {
  MarketRegion,
} from "./market-types";

import type {
  MarketDecisionWorkspaceItem,
  MarketDecisionWorkspaceResult,
  MarketDecisionQuestion,
  MarketDecisionWorkspaceRequestItem,
} from "./market-decision-workspace-types";

function unique(
  values: string[],
): string[] {
  return Array.from(
    new Set(
      values.filter(Boolean),
    ),
  );
}

function buildDecisionId(
  symbol: string,
  market: MarketRegion,
): string {
  return [
    "C157",
    market,
    symbol
      .trim()
      .toUpperCase()
      .replace(
        /[^A-Z0-9._-]/g,
        "-",
      ),
  ].join(":");
}

function buildQuestions(
  item: Awaited<
    ReturnType<
      typeof runMarketResearchDossier
    >
  >["snapshot"]["dossiers"][number],
): MarketDecisionQuestion[] {
  const questions: MarketDecisionQuestion[] = [];

  if (
    !item.evidence.identityVerified
  ) {
    questions.push({
      id: "identity-verification",
      category: "evidence",
      question:
        "Is the evidence definitively attributable to the requested security?",
      reason:
        "Security identity is not verified.",
      requiresEvidence: true,
    });
  }

  if (
    item.evidence.conflictCount > 0
  ) {
    questions.push({
      id: "evidence-conflict",
      category: "evidence",
      question:
        "Which conflicting observations should be accepted and why?",
      reason:
        `${item.evidence.conflictCount} evidence metric conflicts require human review.`,
      requiresEvidence: true,
    });
  }

  if (
    item.change.materialChange
  ) {
    questions.push({
      id: "material-change",
      category: "change",
      question:
        "What concrete market change has occurred, and is it materially relevant?",
      reason:
        "A material market change was detected.",
      requiresEvidence: true,
    });
  }

  if (
    !item.industry.passed
  ) {
    questions.push({
      id: "industry-review",
      category: "industry",
      question:
        "Is the industry context sufficiently established for this research case?",
      reason:
        "Industry analysis is incomplete.",
      requiresEvidence: true,
    });
  }

  if (
    !item.company.passed
  ) {
    questions.push({
      id: "company-review",
      category: "company",
      question:
        "Is the company's business context sufficiently established?",
      reason:
        "Company analysis is incomplete.",
      requiresEvidence: true,
    });
  }

  if (
    !item.fundamentals.passed
  ) {
    questions.push({
      id: "fundamentals-review",
      category: "fundamentals",
      question:
        "Are the available fundamental metrics sufficient for human interpretation?",
      reason:
        "Fundamental analysis is incomplete or insufficient.",
      requiresEvidence: true,
    });
  }

  if (
    !item.valuation.passed ||
    item.valuation.status !==
      "valuation-ready"
  ) {
    questions.push({
      id: "valuation-review",
      category: "valuation",
      question:
        "Are the valuation metrics sufficiently reliable and methodologically appropriate?",
      reason:
        "Valuation remains partial or insufficient.",
      requiresEvidence: true,
    });
  }

  if (
    item.risk.riskCount > 0 ||
    item.risk.reassessmentRequired
  ) {
    questions.push({
      id: "risk-review",
      category: "risk",
      question:
        "Which identified risks could invalidate the current research interpretation?",
      reason:
        `${item.risk.riskCount} risk conditions were identified.`,
      requiresEvidence: true,
    });
  }

  for (
    const condition of
      item.risk.decisionInvalidationConditions
  ) {
    questions.push({
      id:
        `invalidation-${questions.length}`,
      category: "invalidation",
      question:
        "What evidence would invalidate the current research interpretation?",
      reason:
        condition,
      requiresEvidence: true,
    });
  }

  if (
    questions.length === 0
  ) {
    questions.push({
      id: "human-review",
      category: "evidence",
      question:
        "Does the complete research record support a human decision?",
      reason:
        "The dossier has completed the available research stages.",
      requiresEvidence: false,
    });
  }

  return questions;
}

function buildEvidenceGaps(
  item: Awaited<
    ReturnType<
      typeof runMarketResearchDossier
    >
  >["snapshot"]["dossiers"][number],
): string[] {
  const gaps: string[] = [];

  if (
    !item.evidence.identityVerified
  ) {
    gaps.push(
      "Security identity verification is incomplete.",
    );
  }

  if (
    !item.evidence.verified
  ) {
    gaps.push(
      "Evidence matrix is not fully verified.",
    );
  }

  if (
    item.evidence.sourceCount === 0
  ) {
    gaps.push(
      "No evidence sources are currently available.",
    );
  }

  if (
    item.evidence.conflictCount > 0
  ) {
    gaps.push(
      `${item.evidence.conflictCount} evidence conflicts require resolution.`,
    );
  }

  if (
    item.evidence.freshness ===
    "unknown"
  ) {
    gaps.push(
      "Evidence freshness is unknown.",
    );
  }

  if (
    item.valuation.status !==
    "valuation-ready"
  ) {
    gaps.push(
      "Valuation evidence is not fully ready.",
    );
  }

  return unique(gaps);
}

function buildReviewStatus(
  item: Awaited<
    ReturnType<
      typeof runMarketResearchDossier
    >
  >["snapshot"]["dossiers"][number],
): MarketDecisionWorkspaceItem["reviewStatus"] {
  if (
    item.state === "blocked"
  ) {
    return "blocked";
  }

  if (
    item.evidence.conflictCount > 0 ||
    item.risk.reassessmentRequired
  ) {
    return "risk-reassessment";
  }

  if (
    !item.evidence.verified ||
    item.evidence.sourceCount === 0 ||
    item.state === "insufficient"
  ) {
    return "evidence-gap";
  }

  return "pending-human-review";
}

function buildState(
  item: Awaited<
    ReturnType<
      typeof runMarketResearchDossier
    >
  >["snapshot"]["dossiers"][number],
): MarketDecisionWorkspaceItem["state"] {
  if (
    item.state === "blocked"
  ) {
    return "blocked";
  }

  if (
    item.state === "insufficient"
  ) {
    return "insufficient";
  }

  if (
    item.evidence.verified &&
    item.evidence.identityVerified &&
    item.risk.reassessmentRequired ===
      false &&
    item.valuation.status ===
      "valuation-ready"
  ) {
    return "decision-ready";
  }

  return "review-required";
}

function buildItem(
  item: Awaited<
    ReturnType<
      typeof runMarketResearchDossier
    >
  >["snapshot"]["dossiers"][number],
): MarketDecisionWorkspaceItem {
  const evidenceGaps =
    buildEvidenceGaps(item);

  return {
    decisionId:
      buildDecisionId(
        item.symbol,
        item.market,
      ),

    symbol:
      item.symbol,

    market:
      item.market,

    state:
      buildState(item),

    reviewStatus:
      buildReviewStatus(item),

    priority:
      item.change.priority,

    materialChange:
      item.change.materialChange,

    evidence: {
      identityVerified:
        item.evidence.identityVerified,

      verified:
        item.evidence.verified,

      sourceCount:
        item.evidence.sourceCount,

      independentDomains:
        item.evidence.independentDomains,

      conflictCount:
        item.evidence.conflictCount,

      dataQuality:
        item.evidence.dataQuality,

      freshness:
        item.evidence.freshness,
    },

    researchSummary: {
      change:
        item.change.title,

      industry:
        item.industry.summary,

      company:
        item.company.summary,

      fundamentals:
        item.fundamentals.assessment,

      valuation:
        item.valuation.assessment,

      risk:
        item.risk.level,
    },

    evidenceGaps,

    decisionQuestions:
      buildQuestions(item),

    invalidationConditions:
      unique(
        item.risk
          .decisionInvalidationConditions,
      ),

    humanDecisionRequired:
      true,

    decisionRecorded:
      false,

    recommendationGenerated:
      false,

    tradingAllowed:
      false,
  };
}

export async function runMarketDecisionWorkspace(
  request: {
    universe: MarketDecisionWorkspaceRequestItem[];
    query?: string | null;
  },
): Promise<MarketDecisionWorkspaceResult> {
  const startedAt =
    Date.now();

  const universe =
    Array.from(
      new Map(
        (
          request.universe ??
          []
        ).map(
          (item) => [
            `${item.market}:${item.symbol.toUpperCase()}`,
            {
              symbol:
                item.symbol.trim(),
              market:
                item.market,
            },
          ],
        ),
      ).values(),
    );

  if (
    universe.length === 0
  ) {
    return {
      success: false,

      code:
        "C157_MARKET_DECISION_WORKSPACE_INSUFFICIENT",

      snapshot: {
        state:
          "insufficient",

        universeSize: 0,
        evaluatedCount: 0,

        decisionReadyCount: 0,
        reviewRequiredCount: 0,
        blockedCount: 0,
        insufficientCount: 0,

        workspaces: [],

        latencyMs:
          Date.now() -
          startedAt,

        generatedAt:
          new Date().toISOString(),
      },

      upstream: {
        researchDossier:
          "C156.1",
        marketOperatingSystem:
          "C155.1",
        evidenceMatrix:
          "C147.6",
        valuation:
          "C149",
        riskControl:
          "C147.17",
      },

      mutationPerformed:
        false,

      taskCreated:
        false,

      plannerDispatched:
        false,

      decisionRecorded:
        false,

      recommendationGenerated:
        false,

      tradingExecuted:
        false,

      humanDecisionRequired:
        true,

      pipeline: [
        "Market",
        "Change Detection",
        "Radar",
        "Evidence",
        "Verification",
        "Research Dossier",
        "Decision Questions",
        "Evidence Gaps",
        "Risk Invalidation",
        "Human Decision",
      ],

      principles: [
        "The Decision Workspace organizes human review.",
        "It does not generate an investment recommendation.",
        "It does not record or execute a trading decision.",
        "Evidence gaps remain visible.",
      ],

      disclaimer:
        "C157 is a human decision-support workspace. It does not generate buy, sell, hold or target-price instructions.",
    };
  }

  const dossier =
    await runMarketResearchDossier({
      universe,
      query:
        request.query ?? null,
    });

  const workspaces =
    dossier.snapshot.dossiers.map(
      buildItem,
    );

  const decisionReadyCount =
    workspaces.filter(
      (item) =>
        item.state ===
        "decision-ready",
    ).length;

  const reviewRequiredCount =
    workspaces.filter(
      (item) =>
        item.state ===
        "review-required",
    ).length;

  const blockedCount =
    workspaces.filter(
      (item) =>
        item.state ===
        "blocked",
    ).length;

  const insufficientCount =
    workspaces.filter(
      (item) =>
        item.state ===
        "insufficient",
    ).length;

  const state =
    blockedCount > 0
      ? "blocked"
      : insufficientCount ===
          workspaces.length
        ? "insufficient"
        : reviewRequiredCount > 0
          ? "review-required"
          : "decision-ready";

  const code =
    state ===
      "decision-ready"
      ? "C157_MARKET_DECISION_WORKSPACE_PASS"
      : state ===
          "insufficient"
        ? "C157_MARKET_DECISION_WORKSPACE_INSUFFICIENT"
        : "C157_MARKET_DECISION_WORKSPACE_PARTIAL";

  return {
    success:
      workspaces.length > 0,

    code,

    snapshot: {
      state,

      universeSize:
        universe.length,

      evaluatedCount:
        workspaces.length,

      decisionReadyCount,
      reviewRequiredCount,
      blockedCount,
      insufficientCount,

      workspaces,

      latencyMs:
        Date.now() -
        startedAt,

      generatedAt:
        new Date().toISOString(),
    },

    upstream: {
      researchDossier:
        "C156.1",
      marketOperatingSystem:
        "C155.1",
      evidenceMatrix:
        "C147.6",
      valuation:
        "C149",
      riskControl:
        "C147.17",
    },

    mutationPerformed:
      false,

    taskCreated:
      false,

    plannerDispatched:
      false,

    decisionRecorded:
      false,

    recommendationGenerated:
      false,

    tradingExecuted:
      false,

    humanDecisionRequired:
      true,

    pipeline: [
      "Market",
      "Change Detection",
      "Radar",
      "Evidence",
      "Verification",
      "Research Dossier",
      "Decision Questions",
      "Evidence Gaps",
      "Risk Invalidation",
      "Human Decision",
    ],

    principles: [
      "C157 consumes C156 rather than duplicating research logic.",
      "Research evidence remains attributable to the underlying dossier.",
      "Evidence gaps are explicit rather than hidden.",
      "Risk invalidation conditions remain visible.",
      "Human review is mandatory before any investment decision.",
      "No recommendation is generated.",
      "No ranking is generated.",
      "No decision is automatically recorded.",
      "No Task is created.",
      "Planner is not dispatched.",
      "No trading operation is executed.",
    ],

    disclaimer:
      "C157 Market Decision Workspace provides structured decision-support information for human review. It does not generate buy, sell, hold or target-price instructions and does not execute trades.",
  };
}
