import {
  analyzeMarketRequest,
} from "./market-router";

import type {
  MarketAnalysisResult,
  MarketRegion,
} from "./market-types";

import type {
  MarketDecisionSupportItem,
  MarketDecisionSupportRequest,
  MarketDecisionSupportResult,
  MarketDecisionSupportScenario,
} from "./market-decision-support-types";

function unique(
  values: string[],
): string[] {
  return Array.from(
    new Set(
      values.filter(Boolean),
    ),
  );
}

function normalizeUniverse(
  universe: MarketDecisionSupportRequest["universe"],
) {
  const seen = new Set<string>();

  return universe.filter(
    (item) => {
      const symbol =
        item.symbol?.trim();

      if (!symbol) {
        return false;
      }

      const market =
        item.market;

      if (
        market !== "us" &&
        market !== "hk" &&
        market !== "cn"
      ) {
        return false;
      }

      const key =
        `${market}:${symbol.toUpperCase()}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    },
  );
}

function buildFallbackScenarios(
  analysis: MarketAnalysisResult,
): MarketDecisionSupportScenario[] {
  const scenarios =
    analysis.analysis
      ?.decisionSupport
      ?.scenarios;

  if (
    Array.isArray(scenarios) &&
    scenarios.length > 0
  ) {
    return scenarios
      .filter(
        (scenario) =>
          Boolean(
            scenario?.name,
          ),
      )
      .map(
        (scenario) => ({
          name:
            scenario.name,

          condition:
            scenario.condition,

          implication:
            scenario.implication,
        }),
      );
  }

  return [
    {
      name:
        "Current conditions persist",

      condition:
        "Current observed business, valuation, risk and evidence conditions remain broadly unchanged.",

      implication:
        "The current research state remains subject to continued monitoring.",
    },

    {
      name:
        "Supporting conditions improve",

      condition:
        "Key operating or valuation indicators improve and remain corroborated by evidence.",

      implication:
        "The research interpretation should be reassessed using the updated evidence.",
    },

    {
      name:
        "Supporting conditions deteriorate",

      condition:
        "Key operating, valuation, evidence or risk conditions deteriorate.",

      implication:
        "The current research interpretation should be reassessed.",
    },
  ];
}

function buildInsufficientItem(
  symbol: string,
  market: MarketRegion,
): MarketDecisionSupportItem {
  return {
    symbol,

    market,

    state:
      "insufficient-data",

    currentState:
      "Insufficient verified market analysis is available to construct reliable decision-support context.",

    supportingFactors: [],

    invalidationConditions: [
      "Verified market evidence must become available before the current interpretation can be relied upon.",
    ],

    watchMetrics: [
      "Data availability",
      "Evidence quality",
      "Source independence",
      "Freshness",
    ],

    scenarios: [],

    industry: null,

    company: null,

    fundamentals: {
      assessment: null,
      revenueGrowth: null,
      eps: null,
    },

    valuation: {
      assessment: null,
      pe: null,
      pb: null,
    },

    risk: {
      level: "unknown",
      factors: [],
    },

    evidence: {
      sourceCount: 0,
      independentDomains: 0,
      verified: false,
    },

    freshness: {
      freshness: "unknown",
      asOf: null,
    },

    dataQuality:
      "insufficient",

    humanReviewRequired:
      true,

    analysis: null,
  };
}

function buildItem(
  symbol: string,
  market: MarketRegion,
  analysis: MarketAnalysisResult,
): MarketDecisionSupportItem {
  const engineAnalysis =
    analysis.analysis;

  const decisionSupport =
    engineAnalysis
      ?.decisionSupport;

  const industry =
    engineAnalysis
      ?.industry;

  const company =
    engineAnalysis
      ?.company;

  const fundamentals =
    engineAnalysis
      ?.fundamentals;

  const valuation =
    engineAnalysis
      ?.valuation;

  const risk =
    engineAnalysis
      ?.risk;

  const snapshot =
    analysis.snapshot;

  const verification =
    analysis.verification;

  const currentState =
    decisionSupport
      ?.currentState ||
    "Current state was not explicitly summarized by the analysis engine.";

  const supportingFactors =
    unique(
      decisionSupport
        ?.supportingFactors ??
        [],
    );

  const invalidationConditions =
    unique(
      decisionSupport
        ?.invalidationConditions ??
        [],
    );

  const watchMetrics =
    unique(
      decisionSupport
        ?.watchMetrics ??
        [],
    );

  const scenarios =
    buildFallbackScenarios(
      analysis,
    );

  const riskLevel =
    risk?.level;

  const normalizedRisk =
    riskLevel === "low" ||
    riskLevel === "medium" ||
    riskLevel === "high"
      ? riskLevel
      : "unknown";

  const dataQuality =
    snapshot?.dataQuality;

  const normalizedDataQuality =
    dataQuality === "live" ||
    dataQuality === "delayed" ||
    dataQuality === "historical" ||
    dataQuality === "web-evidence"
      ? dataQuality
      : "insufficient";

  return {
    symbol,

    market,

    state:
      "research-candidate",

    currentState,

    supportingFactors,

    invalidationConditions,

    watchMetrics,

    scenarios,

    industry:
      industry?.summary ??
      null,

    company:
      company?.summary ??
      null,

    fundamentals: {
      assessment:
        fundamentals?.assessment ??
        null,

      revenueGrowth:
        snapshot?.revenueGrowth ??
        null,

      eps:
        snapshot?.eps ??
        null,
    },

    valuation: {
      assessment:
        valuation?.assessment ??
        null,

      pe:
        snapshot?.pe ??
        null,

      pb:
        snapshot?.pb ??
        null,
    },

    risk: {
      level:
        normalizedRisk,

      factors:
        unique(
          risk?.factors ??
            [],
        ),
    },

    evidence: {
      sourceCount:
        verification
          ?.sourceCount ??
        0,

      independentDomains:
        verification
          ?.independentDomains ??
        0,

      verified:
        verification
          ?.verified ??
        false,
    },

    freshness: {
      freshness:
        verification
          ?.freshness
          ?.freshness ??
        "unknown",

      asOf:
        snapshot?.asOf ??
        null,
    },

    dataQuality:
      normalizedDataQuality,

    humanReviewRequired:
      true,

    analysis,
  };
}

async function evaluateItem(
  item: MarketDecisionSupportRequest["universe"][number],
): Promise<MarketDecisionSupportItem> {
  const symbol =
    item.symbol.trim();

  try {
    const analysis =
      await analyzeMarketRequest({
        symbol,

        market:
          item.market,

        mode:
          "full",

        query:
          item.query ??
          `Decision support ${item.market} ${symbol}`,
      });

    if (
      !analysis ||
      !analysis.success
    ) {
      return buildInsufficientItem(
        symbol,
        item.market,
      );
    }

    return buildItem(
      symbol,
      item.market,
      analysis,
    );
  } catch {
    return buildInsufficientItem(
      symbol,
      item.market,
    );
  }
}

export async function runMarketDecisionSupport(
  request: MarketDecisionSupportRequest,
): Promise<MarketDecisionSupportResult> {
  const startedAt =
    Date.now();

  const universe =
    normalizeUniverse(
      request.universe ?? [],
    );

  const disclaimer =
    "AIOS provides transparent market research and decision-support information. It does not rank securities, provide personalized investment advice, or issue automatic buy/sell instructions.";

  if (
    universe.length === 0
  ) {
    return {
      success: false,

      code:
        "C147_5_DECISION_SUPPORT_INSUFFICIENT",

      universeSize: 0,

      evaluatedCount: 0,

      researchCandidateCount: 0,

      excludedCount: 0,

      insufficientDataCount: 0,

      items: [],

      principles: [
        "Decision support requires an identified security.",
        "Insufficient evidence must not be converted into a positive conclusion.",
        "Human review remains mandatory.",
      ],

      humanDecisionRequired:
        true,

      runtime: {
        name:
          "market-decision-support-runtime",

        version:
          "C147.5",

        generatedAt:
          new Date().toISOString(),

        latencyMs:
          Date.now() -
          startedAt,
      },

      disclaimer,
    };
  }

  const items: MarketDecisionSupportItem[] =
    [];

  for (
    const item of universe
  ) {
    items.push(
      await evaluateItem(
        item,
      ),
    );
  }

  const filtered =
    items.filter(
      (item) => {
        if (
          item.state ===
            "excluded" &&
          !request.includeExcluded
        ) {
          return false;
        }

        if (
          item.state ===
            "insufficient-data" &&
          !request.includeInsufficientData
        ) {
          return false;
        }

        return true;
      },
    );

  const researchCandidateCount =
    items.filter(
      (item) =>
        item.state ===
        "research-candidate",
    ).length;

  const excludedCount =
    items.filter(
      (item) =>
        item.state ===
        "excluded",
    ).length;

  const insufficientDataCount =
    items.filter(
      (item) =>
        item.state ===
        "insufficient-data",
    ).length;

  const success =
    items.length > 0;

  const code =
    items.length === 0
      ? "C147_5_DECISION_SUPPORT_INSUFFICIENT"
      : insufficientDataCount > 0
        ? "C147_5_DECISION_SUPPORT_PARTIAL"
        : "C147_5_DECISION_SUPPORT_PASS";

  return {
    success,

    code,

    universeSize:
      universe.length,

    evaluatedCount:
      items.length,

    researchCandidateCount,

    excludedCount,

    insufficientDataCount,

    items:
      filtered,

    principles: [
      "Current state is descriptive, not a buy/sell recommendation.",
      "Supporting factors are separated from invalidation conditions.",
      "Watch metrics identify information that can change the interpretation.",
      "Scenarios describe conditional outcomes rather than predicted outcomes.",
      "Data quality and freshness remain visible.",
      "Human review is mandatory before any consequential decision.",
    ],

    humanDecisionRequired:
      true,

    runtime: {
      name:
        "market-decision-support-runtime",

      version:
        "C147.5",

      generatedAt:
        new Date().toISOString(),

      latencyMs:
        Date.now() -
        startedAt,
    },

    disclaimer,
  };
}
