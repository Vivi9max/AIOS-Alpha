import {
  analyzeMarketRequest,
} from "./market-router";

import type {
  MarketAnalysisResult,
  MarketRegion,
} from "./market-types";

import type {
  MarketSelectionFrameworkCriteria,
  MarketSelectionFrameworkItem,
  MarketSelectionFrameworkRequest,
  MarketSelectionFrameworkResult,
  MarketSelectionStageResult,
} from "./market-selection-framework-types";

const DEFAULT_CRITERIA: MarketSelectionFrameworkCriteria = {
  minRevenueGrowth: null,
  minEps: null,

  minPe: null,
  maxPe: null,

  minPb: null,
  maxPb: null,

  minEvidenceSources: 3,
  minIndependentDomains: 2,

  allowedRiskLevels: [
    "low",
    "medium",
    "unknown",
  ],

  requireVerifiedData: false,
};

function mergeCriteria(
  criteria?: MarketSelectionFrameworkCriteria,
): MarketSelectionFrameworkCriteria {
  return {
    ...DEFAULT_CRITERIA,
    ...(criteria ?? {}),
  };
}

function unique(
  values: string[],
): string[] {
  return Array.from(
    new Set(values),
  );
}

function normalizeUniverse(
  universe: MarketSelectionFrameworkRequest["universe"],
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

function buildStage(
  stage: MarketSelectionStageResult["stage"],
  passed: boolean,
  status:
    | "passed"
    | "failed"
    | "insufficient-data",
  reasons: string[] = [],
  missing: string[] = [],
): MarketSelectionStageResult {
  return {
    stage,
    passed,
    status,
    reasons: unique(reasons),
    missing: unique(missing),
  };
}

/*
 * ============================================================
 * C147.4 Identity Verification
 * ============================================================
 *
 * Web evidence existence is NOT sufficient to establish that
 * the requested security is the security being analyzed.
 *
 * Identity verification therefore happens before the framework
 * can classify a security as a research candidate.
 *
 * For US securities:
 *   exact ticker is preferred.
 *
 * For HK / CN securities:
 *   ticker variants + known canonical company names are allowed.
 *
 * This is deliberately conservative:
 * generic financial evidence does not satisfy identity.
 * ============================================================
 */

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

  const tokens =
    new Set<string>();

  if (raw) {
    tokens.add(raw);
  }

  if (market === "us") {
    const ticker =
      raw
        .replace(/^US:/, "");

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

    /*
     * Canonical aliases for the common C147 universe.
     * These are identity aliases, not recommendations.
     */
    const hkAliases: Record<
      string,
      string[]
    > = {
      "0700": [
        "TENCENT",
        "TENCENTHOLDINGS",
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

    const aliases =
      hkAliases[
        digits.padStart(4, "0")
      ] ?? [];

    for (const alias of aliases) {
      tokens.add(
        normalizeIdentityToken(alias),
      );
    }
  }

  if (market === "cn") {
    const digits =
      raw
        .replace(/^SH:/, "")
        .replace(/^SZ:/, "")
        .replace(/^SS:/, "")
        .replace(/\.(SH|SZ)$/, "")
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

    /*
     * Canonical aliases for the common C147 universe.
     */
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

    const aliases =
      cnAliases[digits] ?? [];

    for (const alias of aliases) {
      tokens.add(
        normalizeIdentityToken(alias),
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

  /*
   * Prefer exact normalized token matches.
   *
   * For short numeric CN/HK tokens, require a stronger
   * representation to reduce accidental substring matches.
   */
  return tokens.some(
    (token) => {
      if (!token) {
        return false;
      }

      if (/^\d{3,6}$/.test(token)) {
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
        `No retrieved evidence explicitly references the requested security identity ${symbol}. Generic financial evidence is not sufficient for the framework.`,
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

function industryStage(
  analysis: MarketAnalysisResult,
  criteria: MarketSelectionFrameworkCriteria,
): MarketSelectionStageResult {
  const detected =
    analysis.analysis.industry.summary
      ?.trim() ?? "";

  if (!detected) {
    return buildStage(
      "industry",
      false,
      "insufficient-data",
      [
        "Industry classification was not available.",
      ],
      ["industry"],
    );
  }

  if (
    !criteria.industries?.length
  ) {
    return buildStage(
      "industry",
      true,
      "passed",
      [
        `Industry identified: ${detected}.`,
      ],
    );
  }

  const normalized =
    detected.toLowerCase();

  const matched =
    criteria.industries.some(
      (industry) =>
        normalized.includes(
          industry
            .trim()
            .toLowerCase(),
        ),
    );

  return buildStage(
    "industry",
    matched,
    matched
      ? "passed"
      : "failed",
    [
      matched
        ? `Industry ${detected} matches the configured industry scope.`
        : `Industry ${detected} does not match the configured industry scope.`,
    ],
  );
}

function companyStage(
  analysis: MarketAnalysisResult,
): MarketSelectionStageResult {
  const summary =
    analysis.analysis.company.summary
      ?.trim() ?? "";

  if (!summary) {
    return buildStage(
      "company",
      false,
      "insufficient-data",
      [
        "Company analysis is unavailable.",
      ],
      ["company"],
    );
  }

  return buildStage(
    "company",
    true,
    "passed",
    [
      "Company identity and qualitative company analysis are available.",
    ],
  );
}

function fundamentalsStage(
  analysis: MarketAnalysisResult,
  criteria: MarketSelectionFrameworkCriteria,
): MarketSelectionStageResult {
  const snapshot =
    analysis.snapshot;

  const missing: string[] = [];
  const reasons: string[] = [];

  if (
    criteria.minRevenueGrowth !==
      null &&
    criteria.minRevenueGrowth !==
      undefined
  ) {
    if (
      snapshot.revenueGrowth ===
        null ||
      snapshot.revenueGrowth ===
        undefined
    ) {
      missing.push(
        "revenueGrowth",
      );
    } else if (
      snapshot.revenueGrowth >=
      criteria.minRevenueGrowth
    ) {
      reasons.push(
        `Revenue growth ${snapshot.revenueGrowth}% meets the minimum ${criteria.minRevenueGrowth}%.`,
      );
    } else {
      return buildStage(
        "fundamentals",
        false,
        "failed",
        [
          `Revenue growth ${snapshot.revenueGrowth}% is below the minimum ${criteria.minRevenueGrowth}%.`,
        ],
      );
    }
  }

  if (
    criteria.minEps !== null &&
    criteria.minEps !== undefined
  ) {
    if (
      snapshot.eps === null ||
      snapshot.eps === undefined
    ) {
      missing.push("eps");
    } else if (
      snapshot.eps >=
      criteria.minEps
    ) {
      reasons.push(
        `EPS ${snapshot.eps} meets the minimum ${criteria.minEps}.`,
      );
    } else {
      return buildStage(
        "fundamentals",
        false,
        "failed",
        [
          `EPS ${snapshot.eps} is below the minimum ${criteria.minEps}.`,
        ],
      );
    }
  }

  if (
    snapshot.dataQuality ===
    "insufficient"
  ) {
    missing.push(
      "dataQuality",
    );

    reasons.push(
      "Market snapshot data quality is explicitly insufficient for a complete fundamental assessment.",
    );
  }

  if (
    missing.length > 0
  ) {
    return buildStage(
      "fundamentals",
      false,
      "insufficient-data",
      reasons,
      missing,
    );
  }

  reasons.push(
    "Fundamental data is sufficient for the configured framework conditions.",
  );

  return buildStage(
    "fundamentals",
    true,
    "passed",
    reasons,
  );
}

function valuationStage(
  analysis: MarketAnalysisResult,
  criteria: MarketSelectionFrameworkCriteria,
): MarketSelectionStageResult {
  const pe =
    analysis.snapshot.pe;

  const pb =
    analysis.snapshot.pb;

  const missing: string[] = [];
  const reasons: string[] = [];

  const hasPeRule =
    (
      criteria.minPe !==
        null &&
      criteria.minPe !==
        undefined
    ) ||
    (
      criteria.maxPe !==
        null &&
      criteria.maxPe !==
        undefined
    );

  const hasPbRule =
    (
      criteria.minPb !==
        null &&
      criteria.minPb !==
        undefined
    ) ||
    (
      criteria.maxPb !==
        null &&
      criteria.maxPb !==
        undefined
    );

  if (hasPeRule) {
    if (
      pe === null ||
      pe === undefined
    ) {
      missing.push("pe");
    } else {
      if (
        criteria.minPe !==
          null &&
        criteria.minPe !==
          undefined &&
        pe <
          criteria.minPe
      ) {
        return buildStage(
          "valuation",
          false,
          "failed",
          [
            `P/E ${pe} is below the configured minimum ${criteria.minPe}.`,
          ],
        );
      }

      if (
        criteria.maxPe !==
          null &&
        criteria.maxPe !==
          undefined &&
        pe >
          criteria.maxPe
      ) {
        return buildStage(
          "valuation",
          false,
          "failed",
          [
            `P/E ${pe} is above the configured maximum ${criteria.maxPe}.`,
          ],
        );
      }

      reasons.push(
        `P/E ${pe} satisfies the configured valuation rule.`,
      );
    }
  }

  if (hasPbRule) {
    if (
      pb === null ||
      pb === undefined
    ) {
      missing.push("pb");
    } else {
      if (
        criteria.minPb !==
          null &&
        criteria.minPb !==
          undefined &&
        pb <
          criteria.minPb
      ) {
        return buildStage(
          "valuation",
          false,
          "failed",
          [
            `P/B ${pb} is below the configured minimum ${criteria.minPb}.`,
          ],
        );
      }

      if (
        criteria.maxPb !==
          null &&
        criteria.maxPb !==
          undefined &&
        pb >
          criteria.maxPb
      ) {
        return buildStage(
          "valuation",
          false,
          "failed",
          [
            `P/B ${pb} is above the configured maximum ${criteria.maxPb}.`,
          ],
        );
      }

      reasons.push(
        `P/B ${pb} satisfies the configured valuation rule.`,
      );
    }
  }

  if (
    missing.length > 0
  ) {
    return buildStage(
      "valuation",
      false,
      "insufficient-data",
      reasons,
      missing,
    );
  }

  if (
    !hasPeRule &&
    !hasPbRule
  ) {
    reasons.push(
      "No explicit valuation threshold was configured; valuation data is preserved for human review.",
    );
  }

  return buildStage(
    "valuation",
    true,
    "passed",
    reasons,
  );
}

function riskStage(
  analysis: MarketAnalysisResult,
  criteria: MarketSelectionFrameworkCriteria,
): MarketSelectionStageResult {
  const level =
    analysis.analysis.risk.level;

  if (
    !criteria.allowedRiskLevels?.length
  ) {
    return buildStage(
      "risk",
      true,
      "passed",
      [
        `Risk level recorded as ${level}.`,
      ],
    );
  }

  const passed =
    criteria.allowedRiskLevels.includes(
      level,
    );

  return buildStage(
    "risk",
    passed,
    passed
      ? "passed"
      : "failed",
    [
      passed
        ? `Risk level ${level} is permitted by the configured research policy.`
        : `Risk level ${level} is outside the configured research policy.`,
    ],
  );
}

function evidenceStage(
  analysis: MarketAnalysisResult,
  criteria: MarketSelectionFrameworkCriteria,
): MarketSelectionStageResult {
  const sources =
    analysis.verification
      .sourceCount;

  const domains =
    analysis.verification
      .independentDomains;

  const minSources =
    criteria.minEvidenceSources ??
    0;

  const minDomains =
    criteria.minIndependentDomains ??
    0;

  if (
    analysis.snapshot.dataQuality ===
    "insufficient"
  ) {
    return buildStage(
      "evidence",
      false,
      "insufficient-data",
      [
        "The market snapshot is explicitly marked as insufficient quality.",
        "Evidence presence alone cannot upgrade an insufficient market snapshot to a complete research candidate.",
      ],
      ["dataQuality"],
    );
  }

  if (
    sources < minSources
  ) {
    return buildStage(
      "evidence",
      false,
      "failed",
      [
        `Evidence sources ${sources} are below ${minSources}.`,
      ],
    );
  }

  if (
    domains < minDomains
  ) {
    return buildStage(
      "evidence",
      false,
      "failed",
      [
        `Independent domains ${domains} are below ${minDomains}.`,
      ],
    );
  }

  if (
    criteria.requireVerifiedData &&
    !analysis.verification.verified
  ) {
    return buildStage(
      "evidence",
      false,
      "failed",
      [
        "Configured framework requires verified evidence.",
      ],
    );
  }

  return buildStage(
    "evidence",
    true,
    "passed",
    [
      `Evidence quality passed with ${sources} sources across ${domains} independent domains.`,
    ],
  );
}

function buildIdentityFailureStages(
  symbol: string,
  reason: string,
): MarketSelectionStageResult[] {
  return [
    buildStage(
      "industry",
      false,
      "insufficient-data",
      [reason],
      ["identity"],
    ),

    buildStage(
      "company",
      false,
      "insufficient-data",
      [
        `Company stage blocked because ${symbol} identity was not verified.`,
      ],
      ["identity"],
    ),

    buildStage(
      "fundamentals",
      false,
      "insufficient-data",
      [
        `Fundamentals stage blocked because ${symbol} identity was not verified.`,
      ],
      ["identity"],
    ),

    buildStage(
      "valuation",
      false,
      "insufficient-data",
      [
        `Valuation stage blocked because ${symbol} identity was not verified.`,
      ],
      ["identity"],
    ),

    buildStage(
      "risk",
      false,
      "insufficient-data",
      [
        `Risk stage blocked because ${symbol} identity was not verified.`,
      ],
      ["identity"],
    ),

    buildStage(
      "evidence",
      false,
      "insufficient-data",
      [
        `Evidence stage blocked because ${symbol} identity was not verified.`,
      ],
      ["identity"],
    ),
  ];
}

function buildAnalysisFailureStages(
  reason: string,
): MarketSelectionStageResult[] {
  return [
    buildStage(
      "industry",
      false,
      "insufficient-data",
      [reason],
      ["analysis"],
    ),

    buildStage(
      "company",
      false,
      "insufficient-data",
      ["Analysis unavailable."],
      ["analysis"],
    ),

    buildStage(
      "fundamentals",
      false,
      "insufficient-data",
      ["Analysis unavailable."],
      ["analysis"],
    ),

    buildStage(
      "valuation",
      false,
      "insufficient-data",
      ["Analysis unavailable."],
      ["analysis"],
    ),

    buildStage(
      "risk",
      false,
      "insufficient-data",
      ["Analysis unavailable."],
      ["analysis"],
    ),

    buildStage(
      "evidence",
      false,
      "insufficient-data",
      ["Analysis unavailable."],
      ["analysis"],
    ),
  ];
}

function buildItem(
  item: MarketSelectionFrameworkRequest["universe"][number],
  analysis: MarketAnalysisResult | null,
  stages: MarketSelectionStageResult[],
): MarketSelectionFrameworkItem {
  const industry =
    analysis?.analysis.industry;

  const company =
    analysis?.analysis.company;

  const fundamentals =
    analysis?.analysis.fundamentals;

  const valuation =
    analysis?.analysis.valuation;

  const risk =
    analysis?.analysis.risk;

  const snapshot =
    analysis?.snapshot;

  const verification =
    analysis?.verification;

  const failed =
    stages.some(
      (stage) =>
        stage.status ===
        "failed",
    );

  const insufficient =
    stages.some(
      (stage) =>
        stage.status ===
        "insufficient-data",
    );

  const decision =
    insufficient
      ? "insufficient-data"
      : failed
        ? "excluded"
        : "research-candidate";

  return {
    symbol:
      item.symbol,

    market:
      item.market,

    decision,

    stages,

    industry: {
      summary:
        industry?.summary ??
        null,
      passed:
        stages.find(
          (stage) =>
            stage.stage ===
            "industry",
        )?.passed ??
        false,
    },

    company: {
      summary:
        company?.summary ??
        null,
      passed:
        stages.find(
          (stage) =>
            stage.stage ===
            "company",
        )?.passed ??
        false,
    },

    fundamentals: {
      assessment:
        fundamentals?.assessment ??
        null,
      passed:
        stages.find(
          (stage) =>
            stage.stage ===
            "fundamentals",
        )?.passed ??
        false,
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
      passed:
        stages.find(
          (stage) =>
            stage.stage ===
            "valuation",
        )?.passed ??
        false,
      pe:
        snapshot?.pe ??
        null,
      pb:
        snapshot?.pb ??
        null,
    },

    risk: {
      level:
        risk?.level ??
        "unknown",
      passed:
        stages.find(
          (stage) =>
            stage.stage ===
            "risk",
        )?.passed ??
        false,
      factors:
        risk?.factors ??
        [],
    },

    evidence: {
      sourceCount:
        verification?.sourceCount ??
        0,
      independentDomains:
        verification?.independentDomains ??
        0,
      verified:
        Boolean(
          verification?.verified,
        ),
      passed:
        stages.find(
          (stage) =>
            stage.stage ===
            "evidence",
        )?.passed ??
        false,
    },

    freshness: {
      freshness:
        verification
          ?.freshness
          ?.freshness ??
        "unknown",
      ageMinutes:
        verification
          ?.freshness
          ?.ageMinutes ??
        null,
      asOf:
        snapshot?.asOf ??
        null,
    },

    analysis,

    humanReviewRequired:
      true,
  };
}

async function evaluateItem(
  item: MarketSelectionFrameworkRequest["universe"][number],
  criteria: MarketSelectionFrameworkCriteria,
): Promise<MarketSelectionFrameworkItem> {
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
          `Research framework ${item.market} ${item.symbol}`,
      });

    if (
      !analysis.success
    ) {
      return buildItem(
        item,
        analysis,
        buildAnalysisFailureStages(
          analysis.error ??
            "Market analysis returned insufficient evidence.",
        ),
      );
    }

    const identity =
      verifyInstrumentIdentity(
        analysis,
        item.symbol,
        item.market,
      );

    if (
      !identity.verified
    ) {
      return buildItem(
        item,
        analysis,
        buildIdentityFailureStages(
          item.symbol,
          identity.reason,
        ),
      );
    }

    const stages:
      MarketSelectionStageResult[] =
      [
        industryStage(
          analysis,
          criteria,
        ),

        companyStage(
          analysis,
        ),

        fundamentalsStage(
          analysis,
          criteria,
        ),

        valuationStage(
          analysis,
          criteria,
        ),

        riskStage(
          analysis,
          criteria,
        ),

        evidenceStage(
          analysis,
          criteria,
        ),
      ];

    return buildItem(
      item,
      analysis,
      stages,
    );
  } catch (error) {
    return buildItem(
      item,
      null,
      buildAnalysisFailureStages(
        error instanceof Error
          ? error.message
          : "Framework evaluation failed.",
      ),
    );
  }
}

export async function runMarketSelectionFramework(
  request: MarketSelectionFrameworkRequest,
): Promise<MarketSelectionFrameworkResult> {
  const startedAt =
    Date.now();

  const criteria =
    mergeCriteria(
      request.criteria,
    );

  const universe =
    normalizeUniverse(
      request.universe ?? [],
    );

  if (
    universe.length ===
    0
  ) {
    return {
      success: false,

      code:
        "C147_4_FRAMEWORK_INSUFFICIENT",

      universeSize: 0,

      evaluatedCount: 0,

      researchCandidateCount: 0,

      excludedCount: 0,

      insufficientDataCount: 0,

      criteria,

      items: [],

      principle:
        "Industry → Company → Fundamentals → Valuation → Risk → Evidence is an explainable research framework, not an automatic trading strategy.",

      humanDecisionRequired:
        true,

      runtime: {
        name:
          "market-selection-framework",

        version:
          "C147.4",

        generatedAt:
          new Date().toISOString(),

        latencyMs:
          Date.now() -
          startedAt,
      },

      disclaimer:
        "AIOS provides research and decision-support information and does not issue automatic buy/sell instructions.",
    };
  }

  const items:
    MarketSelectionFrameworkItem[] =
    [];

  /*
   * Sequential execution is intentional.
   *
   * The current market provider may invoke external
   * evidence retrieval. Sequential evaluation prevents
   * uncontrolled request bursts against providers.
   */
  for (
    const item of universe
  ) {
    items.push(
      await evaluateItem(
        item,
        criteria,
      ),
    );
  }

  const researchCandidateCount =
    items.filter(
      (item) =>
        item.decision ===
        "research-candidate",
    ).length;

  const excludedCount =
    items.filter(
      (item) =>
        item.decision ===
        "excluded",
    ).length;

  const insufficientDataCount =
    items.filter(
      (item) =>
        item.decision ===
        "insufficient-data",
    ).length;

  const success =
    items.length > 0;

  return {
    success,

    code:
      insufficientDataCount ===
        0
        ? "C147_4_FRAMEWORK_PASS"
        : "C147_4_FRAMEWORK_PARTIAL",

    universeSize:
      universe.length,

    evaluatedCount:
      items.length,

    researchCandidateCount,

    excludedCount,

    insufficientDataCount,

    criteria,

    items,

    principle:
      "Industry → Company → Fundamentals → Valuation → Risk → Evidence is an explainable research framework, not an automatic trading strategy.",

    humanDecisionRequired:
      true,

    runtime: {
      name:
        "market-selection-framework",

      version:
        "C147.4",

      generatedAt:
        new Date().toISOString(),

      latencyMs:
        Date.now() -
        startedAt,
    },

    disclaimer:
      "AIOS provides transparent research and decision-support information. This framework does not rank securities and does not constitute personalized investment advice or automatic trading instructions.",
  };
}
