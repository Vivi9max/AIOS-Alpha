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
    new Set(values),
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

      const key =
        `${item.market}:${symbol.toUpperCase()}`;

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
      .decisionSupport
      .scenarios ?? [];

  if (scenarios.length > 0) {
    return scenarios.map(
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
      name: "Current conditions persist",
      condition:
        "Current observed business, valuation, risk and evidence conditions remain broadly unchanged.",
      implication:
        "The current research state remains subject to continued monitoring.",
    },

    {
      name: "Supporting conditions improve",
      condition:
        "Key supporting operating or valuation indicators improve and remain corroborated by evidence.",
      implication:
        "The research thesis may require reassessment using the updated evidence.",
    },

    {
      name: "Supporting conditions deteriorate",
      condition:
        "Key operating, valuation, evidence or risk conditions deteriorate.",
      implication:
        "The current research interpretation should be reassessed.",
    },
  ];
}

function buildItem(
  symbol: string,
  market: MarketRegion,
  analysis: MarketAnalysisResult | null,
  state: MarketDecisionSupportItem["state"],
): MarketDecisionSupportItem {
  if (!analysis) {
    return {
      symbol,
      market,
      state,
      currentState:
        "Insufficient market analysis is available to construct decision-support context.",
      supportingFactors: [],
      invalidationConditions: [
        "A verified market analysis must become available before the current interpretation can be relied upon.",
      ],
      watchMetrics: [
        "Data availability",
        "Evidence quality",
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
      dataQuality: "insufficient",
      humanReviewRequired: true,
      analysis: null,
    };
  }

  const decisionSupport =
    analysis.analysis
      .decisionSupport;

  const supportingFactors =
    unique(
      decisionSupport
        .supportingFactors ?? [],
    );

  const invalidationConditions =
    unique(
      decisionSupport
        .invalidationConditions ?? [],
    );

  const watchMetrics =
    unique(
      decisionSupport
        .watchMetrics ?? [],
    );

  const scenarios =
    buildFallbackScenarios(
      analysis,
    );

  return {
    symbol,

    market,

    state,

    currentState:
      decisionSupport.currentState ||
      "Current state was not explicitly summarized by the analysis engine.",

    supportingFactors,

    invalidationConditions,

    watchMetrics,

    scenarios,

    industry:
      analysis.analysis
        .industry.summary ||
      null,

    company:
      analysis.analysis
        .company.summary ||
      null,

    fundamentals: {
      assessment:
        analysis.analysis
          .fundamentals
          .assessment ||
        null,

      revenueGrowth:
        analysis.snapshot
          .revenueGrowth ??
        null,

      eps:
        analysis.snapshot.eps ??
        null,
    },

    valuation: {
      assessment:
        analysis.analysis
          .valuation
          .assessment ||
        null,

      pe:
        analysis.snapshot.pe ??
        null,

      pb:
        analysis.snapshot.pb ??
        null,
    },

    risk: {
      level:
        analysis.analysis
          .risk.level,

      factors:
        unique(
          analysis.analysis
            .risk.factors ?? [],
        ),
    },

    evidence: {
      sourceCount:
        analysis.verification
          .sourceCount,

      independentDomains:
        analysis.verification
          .independentDomains,

      verified:
        analysis.verification
          .verified,
    },

    freshness: {
      freshness:
        analysis.verification
          .freshness
          .freshness,

      asOf:
        analysis.snapshot
          .asOf ??
        null,
    },

    dataQuality:
      analysis.snapshot
        .dataQuality,

    humanReviewRequired:
      true,

    analysis,
  };
}

async function evaluateItem(
  item: MarketDecisionSupportRequest["universe"][number],
): Promise<MarketDecisionSupportItem> {
  try {
    const analysis =
      await analyzeMarketRequest({
        symbol:
          item.symbol,

        market:
          item.market,

        mode:
          "full",

        query:
          item.query ??
          `Decision support ${item.market} ${item.symbol}`,
      });

    if (
      !analysis.success
    ) {
      return buildItem(
        item.symbol,
        item.market,
        analysis,
        "insufficient-data",
      );
    }

    return buildItem(
      item.symbol,
      item.market,
      analysis,
      "research-candidate",
    );
  } catch {
    return buildItem(
      item.symbol,
      item.market,
      null,
      "insufficient-data",
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

      disclaimer:
        "AIOS provides research and decision-support information. It does not rank securities, provide personalized investment advice, or issue automatic trading instructions.",
    };
  }

  const items:
    MarketDecisionSupportItem[] =
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

  return {
    success:
      items.length > 0,

    code:
      insufficientDataCount ===
        0
        ? "C147_5_DECISION_SUPPORT_PASS"
        : "C147_5_DECISION_SUPPORT_PARTIAL",

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

    disclaimer:
      "AIOS provides transparent research and decision-support information. This engine does not rank securities, provide personalized investment advice, or issue automatic buy/sell instructions.",
  };
}
