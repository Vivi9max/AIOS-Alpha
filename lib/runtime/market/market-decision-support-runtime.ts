import { analyzeMarketRequest } from "./market-router";

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

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeUniverse(
  universe: MarketDecisionSupportRequest["universe"] | undefined,
): Array<{
  symbol: string;
  market: MarketRegion;
}> {
  if (!Array.isArray(universe)) {
    return [];
  }

  const seen = new Set<string>();

  return universe
    .filter(
      (
        item,
      ): item is {
        symbol: string;
        market: MarketRegion;
      } =>
        Boolean(
          item &&
            typeof item.symbol === "string" &&
            item.symbol.trim(),
        ) &&
        (
          item.market === "us" ||
          item.market === "hk" ||
          item.market === "cn"
        ),
    )
    .map((item) => ({
      symbol: item.symbol.trim(),
      market: item.market,
    }))
    .filter((item) => {
      const key =
        `${item.market}:${item.symbol.toUpperCase()}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function buildFallbackScenarios(
  analysis: MarketAnalysisResult | null,
): MarketDecisionSupportScenario[] {
  const scenarios =
    analysis?.analysis?.decisionSupport?.scenarios;

  if (Array.isArray(scenarios) && scenarios.length > 0) {
    return scenarios.map((scenario) => ({
      name: scenario.name,
      condition: scenario.condition,
      implication: scenario.implication,
    }));
  }

  return [
    {
      name: "Fundamentals improve",
      condition:
        "Revenue, earnings, or other monitored fundamentals improve relative to the current evidence.",
      implication:
        "Reassess the fundamental thesis using updated evidence.",
    },
    {
      name: "Valuation expands",
      condition:
        "Observed valuation multiples increase materially.",
      implication:
        "Reassess valuation assumptions and downside sensitivity.",
    },
    {
      name: "Fundamentals deteriorate",
      condition:
        "Revenue, earnings, guidance, or other monitored fundamentals deteriorate.",
      implication:
        "Reassess the thesis and the conditions that would invalidate it.",
    },
  ];
}

function buildInsufficientItem(
  symbol: string,
  market: MarketRegion,
  reason: string,
): MarketDecisionSupportItem {
  return {
    symbol,
    market,
    state: "insufficient-data",

    currentState: reason,

    supportingFactors: [],

    invalidationConditions: [
      "Obtain sufficient independent evidence before making a human decision.",
    ],

    watchMetrics: [
      "Evidence availability",
      "Data freshness",
      "Source identity",
      "Fundamental data",
      "Valuation data",
    ],

    scenarios: buildFallbackScenarios(null),

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
      factors: [
        "Insufficient verified market evidence.",
      ],
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

function normalizeRiskLevel(
  value: string | null | undefined,
): "low" | "medium" | "high" | "unknown" {
  if (
    value === "low" ||
    value === "medium" ||
    value === "high"
  ) {
    return value;
  }

  return "unknown";
}

function normalizeDataQuality(
  value: string | null | undefined,
):
  | "live"
  | "delayed"
  | "historical"
  | "web-evidence"
  | "insufficient" {
  if (
    value === "live" ||
    value === "delayed" ||
    value === "historical" ||
    value === "web-evidence"
  ) {
    return value;
  }

  return "insufficient";
}

function buildItem(
  symbol: string,
  market: MarketRegion,
  analysis: MarketAnalysisResult,
): MarketDecisionSupportItem {
  const decisionSupport =
    analysis.analysis?.decisionSupport;

  const industry =
    analysis.analysis?.industry?.summary ?? null;

  const company =
    analysis.analysis?.company?.summary ?? null;

  const fundamentals =
    analysis.analysis?.fundamentals;

  const valuation =
    analysis.analysis?.valuation;

  const risk =
    analysis.analysis?.risk;

  const snapshot =
    analysis.snapshot;

  const verification =
    analysis.verification;

  const evidence =
    Array.isArray(analysis.evidence)
      ? analysis.evidence
      : [];

  const sourceCount =
    evidence.length;

  const independentDomains =
    unique(
      evidence
        .map(
          (item) =>
            item.hostname ?? null,
        )
        .filter(
          (
            hostname,
          ): hostname is string =>
            Boolean(hostname),
        ),
    ).length;

  const verified =
    Boolean(
      verification?.verified,
    );

  /*
   * MarketAnalysis currently exposes fundamental
   * and valuation assessments/signals rather than
   * duplicate numeric fields. Numeric values therefore
   * come from the normalized MarketSnapshot.
   */
  const revenueGrowth =
    snapshot?.revenueGrowth ?? null;

  const eps =
    snapshot?.eps ?? null;

  const pe =
    snapshot?.pe ?? null;

  const pb =
    snapshot?.pb ?? null;

  /*
   * Freshness is part of MarketAnalysisResult.verification,
   * not MarketSnapshot in the current market type contract.
   */
  const freshness =
    verification?.freshness;

  return {
    symbol,
    market,

    state: "research-candidate",

    currentState:
      decisionSupport?.currentState ??
      "Evidence-based market state available; real-time status must be verified separately.",

    supportingFactors:
      Array.isArray(
        decisionSupport?.supportingFactors,
      )
        ? decisionSupport.supportingFactors
        : [],

    invalidationConditions:
      Array.isArray(
        decisionSupport?.invalidationConditions,
      )
        ? decisionSupport.invalidationConditions
        : [],

    watchMetrics:
      Array.isArray(
        decisionSupport?.watchMetrics,
      )
        ? decisionSupport.watchMetrics
        : [],

    scenarios:
      buildFallbackScenarios(
        analysis,
      ),

    industry,

    company,

    fundamentals: {
      assessment:
        fundamentals?.assessment ??
        null,

      revenueGrowth,

      eps,
    },

    valuation: {
      assessment:
        valuation?.assessment ??
        null,

      pe,

      pb,
    },

    risk: {
      level:
        normalizeRiskLevel(
          risk?.level,
        ),

      factors:
        Array.isArray(
          risk?.factors,
        )
          ? risk.factors
          : [],
    },

    evidence: {
      sourceCount,

      independentDomains,

      verified,
    },

    freshness: {
      freshness:
        freshness?.freshness ??
        "unknown",

      asOf:
        freshness?.referenceTime ??
        snapshot?.asOf ??
        null,
    },

    dataQuality:
      normalizeDataQuality(
        snapshot?.dataQuality,
      ),

    humanReviewRequired:
      true,

    analysis,
  };
}

async function evaluateItem(
  item: {
    symbol: string;
    market: MarketRegion;
  },
  query: string | null | undefined,
): Promise<MarketDecisionSupportItem> {
  const symbol =
    item.symbol.trim();

  if (!symbol) {
    return buildInsufficientItem(
      symbol,
      item.market,
      "A valid security symbol is required.",
    );
  }

  try {
    const analysis =
      await analyzeMarketRequest({
        symbol,
        market: item.market,
        mode: "full",
        query:
          query ??
          `Decision support ${item.market} ${symbol}`,
      });

    if (!analysis.success) {
      return buildInsufficientItem(
        symbol,
        item.market,
        analysis.error ??
          "Market analysis did not return sufficient evidence.",
      );
    }

    return buildItem(
      symbol,
      item.market,
      analysis,
    );
  } catch (error) {
    return buildInsufficientItem(
      symbol,
      item.market,
      error instanceof Error
        ? error.message
        : "Market decision support evaluation failed.",
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
      request?.universe,
    );

  if (universe.length === 0) {
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
        "Decision support requires at least one valid market instrument.",
        "No automatic trading action is performed.",
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
        "This runtime provides structured research and decision-support information. It does not rank securities, provide personalized investment advice, or execute trades automatically.",
    };
  }

  const evaluatedItems:
    MarketDecisionSupportItem[] =
    [];

  for (
    const item of universe
  ) {
    evaluatedItems.push(
      await evaluateItem(
        item,
        request?.query,
      ),
    );
  }

  const researchCandidates =
    evaluatedItems.filter(
      (item) =>
        item.state ===
        "research-candidate",
    );

  const excluded =
    evaluatedItems.filter(
      (item) =>
        item.state ===
        "excluded",
    );

  const insufficient =
    evaluatedItems.filter(
      (item) =>
        item.state ===
        "insufficient-data",
    );

  const visibleItems =
    evaluatedItems.filter(
      (item) => {
        if (
          item.state ===
            "excluded" &&
          request?.includeExcluded ===
            false
        ) {
          return false;
        }

        if (
          item.state ===
            "insufficient-data" &&
          request?.includeInsufficientData ===
            false
        ) {
          return false;
        }

        return true;
      },
    );

  let code:
    | "C147_5_DECISION_SUPPORT_PASS"
    | "C147_5_DECISION_SUPPORT_PARTIAL"
    | "C147_5_DECISION_SUPPORT_INSUFFICIENT";

  if (
    insufficient.length ===
    evaluatedItems.length
  ) {
    code =
      "C147_5_DECISION_SUPPORT_INSUFFICIENT";
  } else if (
    insufficient.length > 0
  ) {
    code =
      "C147_5_DECISION_SUPPORT_PARTIAL";
  } else {
    code =
      "C147_5_DECISION_SUPPORT_PASS";
  }

  return {
    success:
      code !==
      "C147_5_DECISION_SUPPORT_INSUFFICIENT",

    code,

    universeSize:
      universe.length,

    evaluatedCount:
      evaluatedItems.length,

    researchCandidateCount:
      researchCandidates.length,

    excludedCount:
      excluded.length,

    insufficientDataCount:
      insufficient.length,

    items:
      visibleItems,

    principles: [
      "The runtime describes market states and evidence; it does not rank securities.",
      "Supporting factors and invalidation conditions are kept separate.",
      "Watch metrics are explicit so a human can reassess the thesis when evidence changes.",
      "Scenarios are conditional and do not predict an outcome.",
      "Data quality and freshness remain visible instead of being presented as verified live data when they are not.",
      "Human review remains required before any investment decision.",
      "No automatic buy, sell, order placement, or portfolio execution is performed.",
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
      "This runtime provides structured market research and decision-support information only. It does not rank securities, provide personalized investment advice, predict market outcomes, or execute trades automatically.",
  };
}
