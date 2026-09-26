import {
  runMarketOperatingSystem,
} from "./market-operating-system-runtime";

import {
  runMarketEvidenceMatrix,
} from "./market-evidence-matrix-runtime";

import {
  runMarketSelectionFramework,
} from "./market-selection-framework-runtime";

import {
  valueMarketCandidates,
} from "./valuation-engine";

import {
  runMarketRiskControl,
} from "./market-risk-control-runtime";

import type {
  MarketRegion,
} from "./market-types";

import type {
  MarketResearchDossierItem,
  MarketResearchDossierResult,
  MarketResearchDossierRequestItem,
  MarketResearchDossierValuation,
} from "./market-research-dossier-types";

function unique(
  values: string[],
): string[] {
  return Array.from(
    new Set(
      values.filter(Boolean),
    ),
  );
}

function buildDossierId(
  symbol: string,
  market: MarketRegion,
): string {
  return [
    "C156",
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

function mapStageStatus(
  passed: boolean,
  status: string,
): "passed" | "failed" | "insufficient" | "blocked" {
  if (passed) {
    return "passed";
  }

  if (status === "failed") {
    return "failed";
  }

  if (
    status === "insufficient-data"
  ) {
    return "insufficient";
  }

  return "blocked";
}

function normalizeDataQuality(
  value: string | null | undefined,
): MarketResearchDossierItem["evidence"]["dataQuality"] {
  switch (value) {
    case "live":
      return "live";

    case "delayed":
      return "delayed";

    case "historical":
      return "historical";

    case "web-evidence":
      return "web-evidence";

    case "insufficient":
      return "insufficient";

    default:
      return "insufficient";
  }
}

function normalizeFreshness(
  value: string | null | undefined,
): MarketResearchDossierItem["evidence"]["freshness"] {
  switch (value) {
    case "fresh":
      return "fresh";

    case "stale":
      return "stale";

    case "unknown":
      return "unknown";

    default:
      return "unknown";
  }
}

/**
 * C156 Dossier intentionally exposes the stable six-metric valuation
 * contract only.
 *
 * C149 may contain additional historical fundamental metrics such as:
 * - historicalRevenue
 * - historicalNetIncome
 * - historicalOperatingCashFlow
 * - historicalFreeCashFlow
 *
 * Those remain available inside the valuation engine but are not part
 * of the current C156 dossier contract.
 */
function isDossierValuationMetric(
  metric: string,
): metric is MarketResearchDossierValuation["metric"] {
  switch (metric) {
    case "pe":
    case "pb":
    case "eps":
    case "revenue":
    case "revenueGrowth":
    case "marketCap":
      return true;

    default:
      return false;
  }
}

/**
 * C149 currently supports an additional historical-structured quality
 * state. C156 deliberately keeps its public metric-quality contract
 * stable, so only the supported C156 quality states are emitted.
 */
function normalizeDossierMetricQuality(
  quality: string,
): MarketResearchDossierValuation["metricQuality"][number]["quality"] {
  switch (quality) {
    case "verified-structured":
      return "verified-structured";

    case "web-evidence":
      return "web-evidence";

    case "missing":
      return "missing";

    case "historical-structured":
      return "web-evidence";

    default:
      return "missing";
  }
}

function findRadarItem(
  result: Awaited<
    ReturnType<
      typeof runMarketOperatingSystem
    >
  >,
  symbol: string,
  market: MarketRegion,
) {
  return result.snapshot.researchItems.find(
    (item) =>
      item.symbol.toUpperCase() ===
        symbol.toUpperCase() &&
      item.market === market,
  );
}

function findSelectionItem(
  result: Awaited<
    ReturnType<
      typeof runMarketSelectionFramework
    >
  >,
  symbol: string,
  market: MarketRegion,
) {
  return result.items.find(
    (item) =>
      item.symbol.toUpperCase() ===
        symbol.toUpperCase() &&
      item.market === market,
  );
}

function findEvidenceItem(
  result: Awaited<
    ReturnType<
      typeof runMarketEvidenceMatrix
    >
  >,
  symbol: string,
  market: MarketRegion,
) {
  return result.items.find(
    (item) =>
      item.symbol.toUpperCase() ===
        symbol.toUpperCase() &&
      item.market === market,
  );
}

function findValuationItem(
  result: Awaited<
    ReturnType<
      typeof valueMarketCandidates
    >
  >,
  symbol: string,
  market: MarketRegion,
) {
  return result.candidates.find(
    (item) =>
      item.normalizedSymbol.toUpperCase() ===
        symbol.toUpperCase() &&
      (item.input.market ?? "us") ===
        market,
  );
}

function buildItem(
  input: MarketResearchDossierRequestItem,
  radar: Awaited<
    ReturnType<
      typeof runMarketOperatingSystem
    >
  >,
  evidence: Awaited<
    ReturnType<
      typeof runMarketEvidenceMatrix
    >
  >,
  selection: Awaited<
    ReturnType<
      typeof runMarketSelectionFramework
    >
  >,
  valuation: Awaited<
    ReturnType<
      typeof valueMarketCandidates
    >
  >,
  risk: Awaited<
    ReturnType<
      typeof runMarketRiskControl
    >
  >,
): MarketResearchDossierItem {
  const radarItem =
    findRadarItem(
      radar,
      input.symbol,
      input.market,
    );

  const evidenceItem =
    findEvidenceItem(
      evidence,
      input.symbol,
      input.market,
    );

  const selectionItem =
    findSelectionItem(
      selection,
      input.symbol,
      input.market,
    );

  const valuationItem =
    findValuationItem(
      valuation,
      input.symbol,
      input.market,
    );

  const researchItem =
    radarItem;

  const blocked =
    researchItem?.state ===
      "blocked" ||
    !evidenceItem?.identityVerified;

  const insufficient =
    !selectionItem ||
    selectionItem.decision ===
      "insufficient-data" ||
    valuationItem?.valuationStatus ===
      "insufficient";

  const state =
    blocked
      ? "blocked"
      : insufficient
        ? "insufficient"
        : researchItem?.evidenceStatus ===
            "partial"
          ? "partial"
          : "research-ready";

  const evidenceMetrics =
    evidenceItem
      ? Object.values(
          evidenceItem.metrics,
        )
      : [];

  const conflictCount =
    evidenceMetrics.filter(
      (metric) =>
        metric.conflict,
    ).length;

  const selectionStages =
    selectionItem?.stages ?? [];

  const stages: MarketResearchDossierItem["stages"] =
    selectionStages.map(
      (stage) => ({
        stage:
          stage.stage === "human-review"
            ? "human-decision"
            : stage.stage,
        status:
          mapStageStatus(
            stage.passed,
            stage.status,
          ),
        reasons:
          stage.reasons,
      }),
    );

  stages.push({
    stage: "human-decision",
    status: "blocked",
    reasons: [
      "Human decision remains mandatory before any investment or trading action.",
    ],
  });

  /**
   * C149 may now expose a broader metric set than C156.
   * Filter at the Dossier boundary rather than weakening the type system.
   */
  const dossierMetricQuality =
    valuationItem?.metrics
      .filter(
        (metric) =>
          isDossierValuationMetric(
            metric.metric,
          ),
      )
      .map(
        (metric) => ({
          metric:
            metric.metric,
          value:
            metric.value,
          available:
            metric.available,
          quality:
            normalizeDossierMetricQuality(
              metric.quality,
            ),
        }),
      ) ?? [];

  return {
    dossierId:
      buildDossierId(
        input.symbol,
        input.market,
      ),

    symbol:
      input.symbol,

    market:
      input.market,

    state,

    change: {
      radarSignalId:
        researchItem?.radarSignalId ??
        null,

      sourceEventId:
        researchItem?.sourceEventId ??
        null,

      title:
        researchItem?.title ??
        "Market research item",

      priority:
        researchItem?.priority ??
        "normal",

      materialChange:
        researchItem?.state ===
        "material-change",

      whatChanged:
        researchItem?.whatChanged ??
        [],

      whyItMatters:
        researchItem?.whyItMatters ??
        [],
    },

    evidence: {
      identityVerified:
        evidenceItem?.identityVerified ??
        false,

      verified:
        evidenceItem?.evidenceSummary
          .verified ??
        false,

      sourceCount:
        evidenceItem?.evidenceSummary
          .sourceCount ??
        0,

      independentDomains:
        evidenceItem?.evidenceSummary
          .independentDomains ??
        0,

      dataQuality:
        normalizeDataQuality(
          evidenceItem?.dataQuality,
        ),

      freshness:
        normalizeFreshness(
          evidenceItem?.freshness
            ?.status,
        ),

      asOf:
        evidenceItem?.freshness
          ?.asOf ??
        null,

      conflictCount,

      humanVerificationRequired:
        true,
    },

    industry: {
      summary:
        selectionItem?.industry
          .summary ??
        null,

      passed:
        selectionItem?.industry
          .passed ??
        false,
    },

    company: {
      summary:
        selectionItem?.company
          .summary ??
        null,

      passed:
        selectionItem?.company
          .passed ??
        false,
    },

    fundamentals: {
      assessment:
        selectionItem?.fundamentals
          .assessment ??
        null,

      passed:
        selectionItem?.fundamentals
          .passed ??
        false,

      revenueGrowth:
        selectionItem?.fundamentals
          .revenueGrowth ??
        null,

      eps:
        selectionItem?.fundamentals
          .eps ??
        null,
    },

    valuation: {
      assessment:
        selectionItem?.valuation
          .assessment ??
        null,

      passed:
        selectionItem?.valuation
          .passed ??
        false,

      pe:
        selectionItem?.valuation
          .pe ??
        null,

      pb:
        selectionItem?.valuation
          .pb ??
        null,

      status:
        valuationItem?.valuationStatus ??
        "insufficient",

      metricQuality:
        dossierMetricQuality,

      methodologyWarnings:
        valuationItem?.methodologyWarnings ??
        [],
    },

    risk: {
      level:
        risk.overallRisk,

      riskCount:
        risk.riskCount,

      highRiskCount:
        risk.highRiskCount,

      mediumRiskCount:
        risk.mediumRiskCount,

      lowRiskCount:
        risk.lowRiskCount,

      insufficientEvidenceCount:
        risk.insufficientEvidenceCount,

      reassessmentRequired:
        risk.reassessmentRequired,

      risks:
        risk.risks.map(
          (item) => ({
            category:
              item.category,

            severity:
              item.severity,

            status:
              item.status,

            title:
              item.title,

            description:
              item.description,

            invalidationCondition:
              item.invalidationCondition,
          }),
        ),

      decisionInvalidationConditions:
        unique(
          risk.decisionInvalidationConditions,
        ),
    },

    stages,

    humanDecisionRequired:
      true,
  };
}

export async function runMarketResearchDossier(
  request: {
    universe: MarketResearchDossierRequestItem[];
    query?: string | null;
  },
): Promise<MarketResearchDossierResult> {
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
        "C156_MARKET_RESEARCH_DOSSIER_INSUFFICIENT",

      snapshot: {
        state:
          "insufficient",

        universeSize: 0,
        evaluatedCount: 0,

        researchReadyCount: 0,
        partialCount: 0,
        blockedCount: 0,
        insufficientCount: 0,

        dossiers: [],

        latencyMs:
          Date.now() -
          startedAt,

        generatedAt:
          new Date().toISOString(),
      },

      upstream: {
        marketOperatingSystem:
          "C155.1",
        selectionFramework:
          "C147.4",
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
        "Industry",
        "Company",
        "Fundamentals",
        "Valuation",
        "Risk",
        "Human Decision",
      ],

      principles: [
        "A Research Dossier organizes evidence and analysis for human review.",
        "No dossier is an investment instruction.",
        "No ranking or recommendation is generated.",
        "No Task or Planner dispatch is created.",
        "No trading operation is executed.",
      ],

      disclaimer:
        "AIOS Research Dossier is research support only. It does not generate buy, sell, hold or target-price instructions.",
    };
  }

  const [
    radar,
    evidence,
    selection,
  ] = await Promise.all([
    runMarketOperatingSystem({
      universe,
      query:
        request.query ?? null,
      includeMonitoring:
        true,
      includeBlocked:
        true,
    }),

    runMarketEvidenceMatrix({
      universe,
      query:
        request.query ?? null,
    }),

    runMarketSelectionFramework({
      universe,
    }),
  ]);

  const valuation =
    await valueMarketCandidates({
      industry:
        "Market research",

      candidates:
        universe.map(
          (item) => ({
            symbol:
              item.symbol,

            market:
              item.market,
          }),
        ),

      maxCandidates:
        universe.length,

      query:
        request.query ??
        "Research dossier fundamentals valuation P/E P/B revenue growth",
    });

  const riskResults =
    await Promise.all(
      universe.map(
        (item) =>
          runMarketRiskControl({
            symbol:
              item.symbol,

            market:
              item.market,

            query:
              request.query ??
              "Research dossier risk control",
          }),
      ),
    );

  const dossiers =
    universe.map(
      (item, index) =>
        buildItem(
          item,
          radar,
          evidence,
          selection,
          valuation,
          riskResults[index],
        ),
    );

  const researchReadyCount =
    dossiers.filter(
      (item) =>
        item.state ===
        "research-ready",
    ).length;

  const partialCount =
    dossiers.filter(
      (item) =>
        item.state ===
        "partial",
    ).length;

  const blockedCount =
    dossiers.filter(
      (item) =>
        item.state ===
        "blocked",
    ).length;

  const insufficientCount =
    dossiers.filter(
      (item) =>
        item.state ===
        "insufficient",
    ).length;

  const state =
    blockedCount > 0
      ? "blocked"
      : insufficientCount ===
          dossiers.length
        ? "insufficient"
        : partialCount > 0
          ? "partial"
          : "research-ready";

  const code =
    state ===
      "research-ready"
      ? "C156_MARKET_RESEARCH_DOSSIER_PASS"
      : state ===
          "insufficient"
        ? "C156_MARKET_RESEARCH_DOSSIER_INSUFFICIENT"
        : "C156_MARKET_RESEARCH_DOSSIER_PARTIAL";

  return {
    success:
      dossiers.length > 0,

    code,

    snapshot: {
      state,

      universeSize:
        universe.length,

      evaluatedCount:
        dossiers.length,

      researchReadyCount,
      partialCount,
      blockedCount,
      insufficientCount,

      dossiers,

      latencyMs:
        Date.now() -
        startedAt,

      generatedAt:
        new Date().toISOString(),
    },

    upstream: {
      marketOperatingSystem:
        "C155.1",
      selectionFramework:
        "C147.4",
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
      "Industry",
      "Company",
      "Fundamentals",
      "Valuation",
      "Risk",
      "Human Decision",
    ],

    principles: [
      "Market changes are converted into research dossiers rather than trading instructions.",
      "C147.6 evidence identity and source quality remain authoritative.",
      "C147.4 provides the Industry → Company → Fundamentals → Valuation → Risk research framework.",
      "C149 valuation scenarios remain modeling inputs and are not exposed as target-price instructions.",
      "C147.17 risk control remains a human-review layer.",
      "No ranking, recommendation, automatic task, planner dispatch or trading execution is performed.",
    ],

    disclaimer:
      "AIOS Research Dossier provides structured market research and decision-support information. It does not generate buy, sell, hold or target-price instructions and does not execute trades.",
  };
}
