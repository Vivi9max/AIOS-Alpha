import {
  runMarketRadarRuntime,
} from "./market-radar-runtime";

import {
  runMarketEvidenceMatrix,
} from "./market-evidence-matrix-runtime";

import type {
  MarketRadarSignal,
} from "./market-radar-types";

import type {
  MarketEvidenceMatrixItem,
} from "./market-evidence-matrix-types";

import type {
  MarketOperatingSystemRequest,
  MarketOperatingSystemResult,
  MarketResearchItem,
  MarketResearchPriority,
} from "./market-operating-system-types";

const DISCLAIMER =
  "C155 Market Operating System continuously organizes market-change signals and evidence for structured human research. It does not generate buy, sell, hold, target-price, personalized investment advice, autonomous portfolio actions, Planner work, or trading execution.";

function priorityFromSignal(
  signal: MarketRadarSignal,
): MarketResearchPriority {
  if (
    signal.priority ===
    "critical"
  ) {
    return "critical";
  }

  if (
    signal.priority ===
    "high"
  ) {
    return "high";
  }

  return "normal";
}

function evidenceStatus(
  item:
    | MarketEvidenceMatrixItem
    | undefined,
): MarketResearchItem["evidenceStatus"] {
  if (!item) {
    return "insufficient";
  }

  if (!item.identityVerified) {
    return "blocked";
  }

  if (
    item.evidenceSummary.verified
  ) {
    return "verified";
  }

  const metrics =
    Object.values(
      item.metrics,
    );

  if (
    metrics.some(
      (metric) =>
        metric.conflict,
    )
  ) {
    return "partial";
  }

  if (
    metrics.some(
      (metric) =>
        metric.quality ===
        "supported",
    )
  ) {
    return "partial";
  }

  return "insufficient";
}

function researchState(
  signal: MarketRadarSignal,
  evidence:
    | MarketEvidenceMatrixItem
    | undefined,
): MarketResearchItem["state"] {
  if (
    signal.priority ===
    "critical"
  ) {
    return "blocked";
  }

  if (
    !evidence ||
    !evidence.identityVerified
  ) {
    return "evidence-required";
  }

  if (
    signal.materialChange
  ) {
    return "material-change";
  }

  return "monitoring";
}

function buildResearchItem(
  signal: MarketRadarSignal,
  evidence:
    | MarketEvidenceMatrixItem
    | undefined,
): MarketResearchItem {
  return {
    researchId:
      `c155-research-${signal.signalId}`,

    symbol:
      signal.symbol,

    market:
      signal.market,

    priority:
      priorityFromSignal(
        signal,
      ),

    state:
      researchState(
        signal,
        evidence,
      ),

    radarSignalId:
      signal.signalId,

    sourceEventId:
      signal.sourceEventId,

    title:
      signal.title,

    whatChanged:
      evidence
        ?.analysis
        ?.verification
        ?.verified
        ? [
            signal.description,
          ]
        : [
            signal.description,
          ],

    whyItMatters:
      [
        "The market observation requires evidence-based research before human interpretation.",
      ],

    evidenceStatus:
      evidenceStatus(
        evidence,
      ),

    evidenceSourceCount:
      evidence
        ?.evidenceSummary
        .sourceCount ??
      0,

    independentDomains:
      evidence
        ?.evidenceSummary
        .independentDomains ??
      0,

    identityVerified:
      evidence
        ?.identityVerified ??
      false,

    humanDecisionRequired:
      true,
  };
}

function findEvidence(
  signal: MarketRadarSignal,
  evidenceItems:
    MarketEvidenceMatrixItem[],
): MarketEvidenceMatrixItem | undefined {
  return evidenceItems.find(
    (item) =>
      item.symbol
        .trim()
        .toUpperCase() ===
        signal.symbol
          .trim()
          .toUpperCase() &&
      item.market ===
        signal.market,
  );
}

export async function runMarketOperatingSystem(
  request: MarketOperatingSystemRequest,
): Promise<MarketOperatingSystemResult> {
  const startedAt =
    Date.now();

  const universe =
    Array.isArray(
      request?.universe,
    )
      ? request.universe
      : [];

  if (
    universe.length === 0
  ) {
    return {
      success: false,

      code:
        "C155_MARKET_OS_INSUFFICIENT",

      snapshot: {
        state:
          "insufficient",

        universeSize: 0,

        monitoredCount: 0,

        materialChangeCount: 0,

        evidenceRequiredCount: 0,

        blockedCount: 0,

        verifiedEvidenceCount: 0,

        researchItems: [],

        generatedAt:
          new Date().toISOString(),

        latencyMs:
          Date.now() -
          startedAt,
      },

      radarRuntime:
        "C154.1",

      evidenceRuntime:
        "C147.6",

      mutationPerformed:
        false,

      taskCreated:
        false,

      plannerDispatched:
        false,

      tradingExecuted:
        false,

      humanDecisionRequired:
        true,

      pipeline: [
        "Market",
        "Change Detection",
        "Market Radar",
        "Evidence",
        "Verification",
        "Research Organization",
        "Human Decision",
      ],

      principles: [
        "C155 consumes C154 rather than duplicating change detection.",
        "C155 consumes C147.6 rather than inventing a second evidence system.",
        "Evidence must remain attributable to the requested security.",
        "Material changes require evidence-based research.",
        "Blocked evidence remains visible.",
        "Human decision remains mandatory.",
        "No automated trading is performed.",
      ],

      disclaimer:
        DISCLAIMER,
    };
  }

  const radar =
    await runMarketRadarRuntime({
      universe,

      query:
        request?.query ??
        null,

      includeNoChange:
        request?.includeMonitoring ??
        true,

      includeNoHistory:
        true,

      includeBlocked:
        request?.includeBlocked ??
        true,
    });

  const evidence =
    await runMarketEvidenceMatrix({
      universe,

      query:
        request?.query ??
        null,
    });

  const researchItems =
    radar.radar.signals
      .map(
        (signal) =>
          buildResearchItem(
            signal,
            findEvidence(
              signal,
              evidence.items,
            ),
          ),
      );

  const filteredItems =
    researchItems.filter(
      (item) => {
        if (
          item.state ===
            "monitoring" &&
          request
            ?.includeMonitoring ===
            false
        ) {
          return false;
        }

        if (
          item.state ===
            "blocked" &&
          request
            ?.includeBlocked ===
            false
        ) {
          return false;
        }

        return true;
      },
    );

  const materialChangeCount =
    filteredItems.filter(
      (item) =>
        item.state ===
        "material-change",
    ).length;

  const evidenceRequiredCount =
    filteredItems.filter(
      (item) =>
        item.evidenceStatus ===
          "partial" ||
        item.evidenceStatus ===
          "insufficient",
    ).length;

  const blockedCount =
    filteredItems.filter(
      (item) =>
        item.state ===
          "blocked" ||
        item.evidenceStatus ===
          "blocked",
    ).length;

  const verifiedEvidenceCount =
    filteredItems.filter(
      (item) =>
        item.evidenceStatus ===
        "verified",
    ).length;

  const state =
    blockedCount > 0
      ? "blocked"
      : materialChangeCount > 0
        ? "research-required"
        : evidenceRequiredCount > 0
          ? "evidence-required"
          : "monitoring";

  const code =
    filteredItems.length ===
    0
      ? "C155_MARKET_OS_INSUFFICIENT"
      : blockedCount > 0 ||
          evidenceRequiredCount > 0
        ? "C155_MARKET_OS_PARTIAL"
        : "C155_MARKET_OS_PASS";

  return {
    success:
      filteredItems.length >
      0,

    code,

    snapshot: {
      state,

      universeSize:
        universe.length,

      monitoredCount:
        filteredItems.length,

      materialChangeCount,

      evidenceRequiredCount,

      blockedCount,

      verifiedEvidenceCount,

      researchItems:
        filteredItems,

      generatedAt:
        new Date().toISOString(),

      latencyMs:
        Date.now() -
        startedAt,
    },

    radarRuntime:
      "C154.1",

    evidenceRuntime:
      "C147.6",

    mutationPerformed:
      false,

    taskCreated:
      false,

    plannerDispatched:
      false,

    tradingExecuted:
      false,

    humanDecisionRequired:
      true,

    pipeline: [
      "Market",
      "Change Detection",
      "Market Radar",
      "Evidence",
      "Verification",
      "Research Organization",
      "Industry",
      "Company",
      "Valuation",
      "Risk",
      "Human Decision",
    ],

    principles: [
      "C155 consumes C154 rather than duplicating market-change detection.",
      "C154 remains the market-change monitoring boundary.",
      "C147.6 remains the evidence matrix boundary.",
      "Security identity must be verified before evidence is treated as attributable.",
      "Material market changes are converted into research items rather than trading instructions.",
      "Evidence conflicts remain visible.",
      "Insufficient evidence remains visible.",
      "Industry, company, valuation, and risk are research stages, not automated recommendations.",
      "C155 does not rank securities.",
      "C155 does not generate buy, sell, hold, target-price, or probability recommendations.",
      "C155 does not create Tasks.",
      "C155 does not dispatch Planner.",
      "C155 does not execute trading.",
      "Human decision remains mandatory.",
    ],

    disclaimer:
      DISCLAIMER,
  };
}
