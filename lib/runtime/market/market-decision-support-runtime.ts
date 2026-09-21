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
  return Array.from(
    new Set(
      values.filter(Boolean),
    ),
  );
}

function normalizeUniverse(
  universe:
    | MarketDecisionSupportRequest["universe"]
    | undefined,
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

function normalizeIdentityToken(
  value: string,
): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function buildIdentityTokens(
  symbol: string,
  market: MarketRegion,
): string[] {
  const raw =
    normalizeIdentityToken(
      symbol,
    );

  const tokens = new Set<string>();

  if (raw) {
    tokens.add(raw);
  }

  if (market === "us") {
    const ticker =
      raw.replace(
        /^US:/,
        "",
      );

    if (ticker) {
      tokens.add(ticker);
    }
  }

  if (market === "hk") {
    const digits =
      raw
        .replace(/^HK:/, "")
        .replace(/\.HK$/, "")
        .replace(/\D/g, "");

    if (digits) {
      const padded =
        digits.padStart(4, "0");

      tokens.add(digits);
      tokens.add(padded);
      tokens.add(`${padded}.HK`);
    }

    const hkAliases: Record<
      string,
      string[]
    > = {
      "0700": [
        "TENCENT",
        "TENCENTHOLDINGS",
        "騰訊",
        "腾讯",
      ],

      "9988": [
        "ALIBABA",
        "ALIBABAGROUP",
        "阿里巴巴",
        "阿里巴巴集团",
      ],
    };

    for (
      const alias of
      hkAliases[
        digits.padStart(4, "0")
      ] ?? []
    ) {
      tokens.add(
        normalizeIdentityToken(
          alias,
        ),
      );
    }
  }

  if (market === "cn") {
    const digits =
      raw
        .replace(/^SH:/, "")
        .replace(/^SZ:/, "")
        .replace(/^SS:/, "")
        .replace(
          /\.(SH|SZ)$/,
          "",
        )
        .replace(/\D/g, "");

    if (digits) {
      tokens.add(digits);
      tokens.add(
        `${digits}.SH`,
      );
      tokens.add(
        `${digits}.SZ`,
      );
    }

    const cnAliases: Record<
      string,
      string[]
    > = {
      "600519": [
        "KWEICHOWMOUTAI",
        "KWEICHOWMOUTAICO",
        "MOUTAI",
        "贵州茅台",
        "贵州茅台酒",
      ],

      "000858": [
        "WULIANGYE",
        "WULIANGYEYIBIN",
        "五粮液",
        "宜宾五粮液",
      ],
    };

    for (
      const alias of
      cnAliases[digits] ?? []
    ) {
      tokens.add(
        normalizeIdentityToken(
          alias,
        ),
      );
    }
  }

  return Array.from(tokens)
    .filter(Boolean);
}

function evidenceContainsIdentity(
  title: string,
  url: string,
  snippet: string,
  tokens: string[],
): boolean {
  const haystack =
    [
      title,
      url,
      snippet,
    ]
      .join(" ")
      .toUpperCase();

  return tokens.some(
    (token) => {
      if (!token) {
        return false;
      }

      if (
        /^\d{3,6}$/.test(
          token,
        )
      ) {
        const escaped =
          token.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          );

        return new RegExp(
          `(^|[^0-9])${escaped}([^0-9]|$)`,
        ).test(
          haystack,
        );
      }

      return haystack.includes(
        token,
      );
    },
  );
}

function verifyInstrumentIdentity(
  analysis: MarketAnalysisResult,
  symbol: string,
  market: MarketRegion,
): {
  verified: boolean;
  matchedEvidenceCount: number;
  reason: string;
} {
  const tokens =
    buildIdentityTokens(
      symbol,
      market,
    );

  if (
    tokens.length === 0
  ) {
    return {
      verified: false,
      matchedEvidenceCount: 0,
      reason:
        "No usable security identity token could be derived from the requested symbol.",
    };
  }

  const matched =
    analysis.evidence.filter(
      (item) =>
        evidenceContainsIdentity(
          item.title,
          item.url,
          item.snippet,
          tokens,
        ),
    );

  if (
    matched.length === 0
  ) {
    return {
      verified: false,
      matchedEvidenceCount: 0,
      reason:
        `No retrieved evidence explicitly references the requested security identity ${symbol}. Generic financial evidence is not sufficient for decision support.`,
    };
  }

  return {
    verified: true,
    matchedEvidenceCount:
      matched.length,
    reason:
      `Requested security identity ${symbol} is referenced by ${matched.length} retrieved evidence item(s).`,
  };
}

function buildFallbackScenarios(
  analysis:
    | MarketAnalysisResult
    | null,
): MarketDecisionSupportScenario[] {
  const scenarios =
    analysis
      ?.analysis
      ?.decisionSupport
      ?.scenarios;

  if (
    Array.isArray(
      scenarios,
    ) &&
    scenarios.length > 0
  ) {
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
      name:
        "Fundamentals improve",
      condition:
        "Revenue, earnings, or other monitored fundamentals improve relative to the current evidence.",
      implication:
        "Reassess the fundamental thesis using updated evidence.",
    },
    {
      name:
        "Valuation expands",
      condition:
        "Observed valuation multiples increase materially.",
      implication:
        "Reassess valuation assumptions and downside sensitivity.",
    },
    {
      name:
        "Fundamentals deteriorate",
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
  analysis:
    | MarketAnalysisResult
    | null = null,
): MarketDecisionSupportItem {
  const evidence =
    analysis?.evidence ?? [];

  const domains =
    unique(
      evidence
        .map(
          (item) =>
            item.hostname,
        )
        .filter(Boolean),
    ).length;

  const freshness =
    analysis?.verification?.freshness;

  return {
    symbol,
    market,

    state:
      "insufficient-data",

    currentState:
      reason,

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

    scenarios:
      buildFallbackScenarios(
        analysis,
      ),

    industry:
      analysis?.analysis?.industry
        ?.summary ?? null,

    company:
      analysis?.analysis?.company
        ?.summary ?? null,

    fundamentals: {
      assessment:
        analysis?.analysis?.fundamentals
          ?.assessment ?? null,

      revenueGrowth:
        analysis?.snapshot
          ?.revenueGrowth ?? null,

      eps:
        analysis?.snapshot
          ?.eps ?? null,
    },

    valuation: {
      assessment:
        analysis?.analysis?.valuation
          ?.assessment ?? null,

      pe:
        analysis?.snapshot?.pe ??
        null,

      pb:
        analysis?.snapshot?.pb ??
        null,
    },

    risk: {
      level:
        analysis?.analysis?.risk?.level ??
        "unknown",

      factors:
        analysis?.analysis?.risk?.factors ??
        [
          "Insufficient verified market evidence.",
        ],
    },

    evidence: {
      sourceCount:
        evidence.length,

      independentDomains:
        domains,

      verified:
        Boolean(
          analysis?.verification
            ?.verified,
        ),
    },

    freshness: {
      freshness:
        freshness?.freshness ??
        "unknown",

      asOf:
        freshness?.referenceTime ??
        analysis?.snapshot?.asOf ??
        null,
    },

    dataQuality:
      "insufficient",

    humanReviewRequired:
      true,

    analysis,
  };
}

function normalizeRiskLevel(
  value:
    | string
    | null
    | undefined,
):
  | "low"
  | "medium"
  | "high"
  | "unknown" {
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
  value:
    | string
    | null
    | undefined,
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
    analysis.analysis
      ?.decisionSupport;

  const industry =
    analysis.analysis
      ?.industry
      ?.summary ?? null;

  const company =
    analysis.analysis
      ?.company
      ?.summary ?? null;

  const fundamentals =
    analysis.analysis
      ?.fundamentals;

  const valuation =
    analysis.analysis
      ?.valuation;

  const risk =
    analysis.analysis
      ?.risk;

  const snapshot =
    analysis.snapshot;

  const verification =
    analysis.verification;

  const evidence =
    Array.isArray(
      analysis.evidence,
    )
      ? analysis.evidence
      : [];

  const sourceCount =
    evidence.length;

  const independentDomains =
    unique(
      evidence
        .map(
          (item) =>
            item.hostname,
        )
        .filter(Boolean),
    ).length;

  const verified =
    Boolean(
      verification?.verified,
    );

  const freshness =
    verification?.freshness;

  return {
    symbol,
    market,

    state:
      "research-candidate",

    currentState:
      decisionSupport
        ?.currentState ??
      "Evidence-based market state available; real-time status must be verified separately.",

    supportingFactors:
      Array.isArray(
        decisionSupport
          ?.supportingFactors,
      )
        ? decisionSupport.supportingFactors
        : [],

    invalidationConditions:
      Array.isArray(
        decisionSupport
          ?.invalidationConditions,
      )
        ? decisionSupport.invalidationConditions
        : [],

    watchMetrics:
      Array.isArray(
        decisionSupport
          ?.watchMetrics,
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
        fundamentals
          ?.assessment ??
        null,

      revenueGrowth:
        snapshot
          ?.revenueGrowth ??
        null,

      eps:
        snapshot?.eps ??
        null,
    },

    valuation: {
      assessment:
        valuation
          ?.assessment ??
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
  query:
    | string
    | null
    | undefined,
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

    if (
      !analysis.success
    ) {
      return buildInsufficientItem(
        symbol,
        item.market,
        analysis.error ??
          "Market analysis did not return sufficient evidence.",
        analysis,
      );
    }

    const identity =
      verifyInstrumentIdentity(
        analysis,
        symbol,
        item.market,
      );

    if (
      !identity.verified
    ) {
      return buildInsufficientItem(
        symbol,
        item.market,
        identity.reason,
        analysis,
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
  request:
    MarketDecisionSupportRequest,
): Promise<MarketDecisionSupportResult> {
  const startedAt =
    Date.now();

  const universe =
    normalizeUniverse(
      request?.universe,
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
        "Decision support requires at least one valid market instrument.",
        "Security identity must be verified from retrieved evidence.",
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
      "Security identity must be verified before an instrument can become a research candidate.",
      "Supporting factors and invalidation conditions are kept separate.",
      "Watch metrics are explicit so a human can reassess the thesis when evidence changes.",
      "Scenarios are conditional and do not predict an outcome.",
      "Data quality and freshness remain visible.",
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
