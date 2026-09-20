import {
  analyzeMarketRequest,
} from "./market-router";

import type {
  MarketAnalysisResult,
  MarketRegion,
} from "./market-types";

import type {
  MarketScreeningCriteria,
  MarketScreeningCriterion,
  MarketScreeningItem,
  MarketScreeningRequest,
  MarketScreeningResult,
  MarketScreeningUniverseItem,
} from "./market-screening-types";

const DEFAULT_CRITERIA: MarketScreeningCriteria = {
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
  criteria?: MarketScreeningCriteria,
): MarketScreeningCriteria {
  return {
    ...DEFAULT_CRITERIA,
    ...(criteria ?? {}),
  };
}

function unique<T>(
  values: T[],
): T[] {
  return Array.from(
    new Set(values),
  );
}

function normalizeUniverse(
  universe: MarketScreeningUniverseItem[],
): MarketScreeningUniverseItem[] {
  const seen =
    new Set<string>();

  const result:
    MarketScreeningUniverseItem[] =
    [];

  for (
    const item of universe
  ) {
    const symbol =
      item.symbol?.trim();

    if (!symbol) {
      continue;
    }

    const market =
      item.market;

    const key =
      `${market}:${symbol.toUpperCase()}`;

    if (
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);

    result.push({
      symbol,
      market,
    });
  }

  return result;
}

function normalizeIndustry(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase();
}

function industryMatches(
  analysis: MarketAnalysisResult,
  industries?: string[],
): boolean {
  if (
    !industries?.length
  ) {
    return true;
  }

  const detected =
    normalizeIndustry(
      analysis.analysis.industry.summary,
    );

  return industries.some(
    (industry) =>
      detected.includes(
        normalizeIndustry(
          industry,
        ),
      ),
  );
}

/*
 * ============================================================
 * C147.3.3 / Identity Verification Guard
 * ============================================================
 *
 * Web evidence availability alone is NOT sufficient to prove
 * that the requested security actually exists.
 *
 * Example:
 *
 * INVALID-AIOS-SYMBOL
 *        ↓
 * generic financial search results
 *        ↓
 * sourceCount > 0
 *        ↓
 * old behavior: candidate
 *
 * Correct behavior:
 *
 * INVALID-AIOS-SYMBOL
 *        ↓
 * no evidence containing the requested symbol identity
 *        ↓
 * insufficient-data
 *
 * This prevents unrelated financial pages from becoming
 * evidence for an arbitrary ticker.
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

  if (market === "hk") {
    const digits =
      raw
        .replace(/^HK:/, "")
        .replace(/\.HK$/, "")
        .replace(/\D/g, "");

    if (digits) {
      tokens.add(digits);

      tokens.add(
        digits.padStart(4, "0"),
      );

      tokens.add(
        `${digits.padStart(4, "0")}.HK`,
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
    (token) =>
      haystack.includes(
        token,
      ),
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
        `No retrieved evidence explicitly references the requested security identity ${symbol}. Generic financial evidence is not sufficient for screening.`,
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

function evaluateItem(
  analysis: MarketAnalysisResult,
  criteria: MarketScreeningCriteria,
): {
  matched: MarketScreeningCriterion[];
  failed: MarketScreeningCriterion[];
  missing: MarketScreeningCriterion[];
  reasons: string[];
  risks: string[];
} {
  const matched:
    MarketScreeningCriterion[] =
    [];

  const failed:
    MarketScreeningCriterion[] =
    [];

  const missing:
    MarketScreeningCriterion[] =
    [];

  const reasons: string[] =
    [];

  const risks: string[] =
    [];

  const snapshot =
    analysis.snapshot;

  const marketAnalysis =
    analysis.analysis;

  /*
   * Industry
   */
  if (
    criteria.industries?.length
  ) {
    if (
      industryMatches(
        analysis,
        criteria.industries,
      )
    ) {
      matched.push(
        "industry",
      );

      reasons.push(
        "Industry condition matched the configured screening universe.",
      );
    } else {
      failed.push(
        "industry",
      );

      reasons.push(
        "Detected industry did not match the configured industry filter.",
      );
    }
  }

  /*
   * Revenue Growth
   */
  if (
    criteria.minRevenueGrowth !==
      null &&
    criteria.minRevenueGrowth !==
      undefined
  ) {
    const growth =
      snapshot.revenueGrowth;

    if (
      growth === null ||
      growth === undefined
    ) {
      missing.push(
        "revenueGrowth",
      );
    } else if (
      growth >=
      criteria.minRevenueGrowth
    ) {
      matched.push(
        "revenueGrowth",
      );

      reasons.push(
        `Revenue growth ${growth}% meets the configured minimum of ${criteria.minRevenueGrowth}%.`,
      );
    } else {
      failed.push(
        "revenueGrowth",
      );

      reasons.push(
        `Revenue growth ${growth}% is below the configured minimum of ${criteria.minRevenueGrowth}%.`,
      );
    }
  }

  /*
   * EPS
   */
  if (
    criteria.minEps !== null &&
    criteria.minEps !== undefined
  ) {
    const eps =
      snapshot.eps;

    if (
      eps === null ||
      eps === undefined
    ) {
      missing.push(
        "eps",
      );
    } else if (
      eps >=
      criteria.minEps
    ) {
      matched.push(
        "eps",
      );

      reasons.push(
        `EPS ${eps} meets the configured minimum of ${criteria.minEps}.`,
      );
    } else {
      failed.push(
        "eps",
      );

      reasons.push(
        `EPS ${eps} is below the configured minimum of ${criteria.minEps}.`,
      );
    }
  }

  /*
   * P/E
   */
  if (
    (
      criteria.minPe !== null &&
      criteria.minPe !== undefined
    ) ||
    (
      criteria.maxPe !== null &&
      criteria.maxPe !== undefined
    )
  ) {
    const pe =
      snapshot.pe;

    if (
      pe === null ||
      pe === undefined
    ) {
      missing.push(
        "pe",
      );
    } else {
      let valid = true;

      if (
        criteria.minPe !== null &&
        criteria.minPe !== undefined &&
        pe < criteria.minPe
      ) {
        valid = false;
      }

      if (
        criteria.maxPe !== null &&
        criteria.maxPe !== undefined &&
        pe > criteria.maxPe
      ) {
        valid = false;
      }

      if (valid) {
        matched.push(
          "pe",
        );

        reasons.push(
          `P/E ${pe} satisfies the configured valuation range.`,
        );
      } else {
        failed.push(
          "pe",
        );

        reasons.push(
          `P/E ${pe} falls outside the configured valuation range.`,
        );
      }
    }
  }

  /*
   * P/B
   */
  if (
    (
      criteria.minPb !== null &&
      criteria.minPb !== undefined
    ) ||
    (
      criteria.maxPb !== null &&
      criteria.maxPb !== undefined
    )
  ) {
    const pb =
      snapshot.pb;

    if (
      pb === null ||
      pb === undefined
    ) {
      missing.push(
        "pb",
      );
    } else {
      let valid = true;

      if (
        criteria.minPb !== null &&
        criteria.minPb !== undefined &&
        pb < criteria.minPb
      ) {
        valid = false;
      }

      if (
        criteria.maxPb !== null &&
        criteria.maxPb !== undefined &&
        pb > criteria.maxPb
      ) {
        valid = false;
      }

      if (valid) {
        matched.push(
          "pb",
        );

        reasons.push(
          `P/B ${pb} satisfies the configured valuation range.`,
        );
      } else {
        failed.push(
          "pb",
        );

        reasons.push(
          `P/B ${pb} falls outside the configured valuation range.`,
        );
      }
    }
  }

  /*
   * Evidence
   */
  const sourceCount =
    analysis.verification.sourceCount;

  const independentDomains =
    analysis.verification
      .independentDomains;

  const minSources =
    criteria.minEvidenceSources ??
    0;

  const minDomains =
    criteria.minIndependentDomains ??
    0;

  if (
    sourceCount <
    minSources
  ) {
    failed.push(
      "evidence",
    );

    reasons.push(
      `Evidence source count ${sourceCount} is below the configured minimum of ${minSources}.`,
    );
  } else if (
    independentDomains <
    minDomains
  ) {
    failed.push(
      "evidence",
    );

    reasons.push(
      `Independent-domain count ${independentDomains} is below the configured minimum of ${minDomains}.`,
    );
  } else {
    matched.push(
      "evidence",
    );

    reasons.push(
      `Evidence quality passed with ${sourceCount} sources across ${independentDomains} independent domains.`,
    );
  }

  /*
   * Data Quality
   */
  if (
    criteria.requireVerifiedData
  ) {
    if (
      !analysis.verification.verified
    ) {
      failed.push(
        "dataQuality",
      );

      reasons.push(
        "The configured screening policy requires verified evidence.",
      );
    } else {
      matched.push(
        "dataQuality",
      );
    }
  } else {
    matched.push(
      "dataQuality",
    );
  }

  /*
   * Risk
   */
  const riskLevel =
    marketAnalysis.risk.level;

  if (
    criteria.allowedRiskLevels?.length
  ) {
    if (
      criteria.allowedRiskLevels.includes(
        riskLevel,
      )
    ) {
      matched.push(
        "risk",
      );
    } else {
      failed.push(
        "risk",
      );

      reasons.push(
        `Risk level ${riskLevel} is outside the configured screening policy.`,
      );
    }
  } else {
    matched.push(
      "risk",
    );
  }

  risks.push(
    ...marketAnalysis.risk.factors,
  );

  /*
   * Missing-data guard
   */
  if (
    snapshot.dataQuality ===
      "insufficient" ||
    !analysis.evidence.length
  ) {
    missing.push(
      "dataQuality",
    );
  }

  return {
    matched:
      unique(matched),

    failed:
      unique(failed),

    missing:
      unique(missing),

    reasons:
      unique(reasons),

    risks:
      unique(risks),
  };
}

function buildInsufficientDataItem(
  item: MarketScreeningUniverseItem,
  analysis: MarketAnalysisResult | null,
  reason: string,
  evaluatedAt: string,
): MarketScreeningItem {
  return {
    symbol:
      item.symbol,

    market:
      item.market,

    decision:
      "insufficient-data",

    matchedCriteria:
      [],

    failedCriteria:
      [],

    missingCriteria:
      ["dataQuality"],

    reasons: [
      reason,
    ],

    risks:
      analysis?.analysis.risk
        .factors ?? [],

    analysis,

    evaluatedAt,
  };
}

async function evaluateUniverseItem(
  item: MarketScreeningUniverseItem,
  criteria: MarketScreeningCriteria,
  mode: MarketScreeningRequest["mode"],
): Promise<MarketScreeningItem> {
  const evaluatedAt =
    new Date().toISOString();

  try {
    const analysis =
      await analyzeMarketRequest({
        symbol:
          item.symbol,

        market:
          item.market,

        mode:
          mode ?? "full",

        query:
          `Screen ${item.market} ${item.symbol}`,
      });

    if (
      !analysis.success
    ) {
      return buildInsufficientDataItem(
        item,
        analysis,
        analysis.error ??
          "Market analysis did not return sufficient evidence.",
        evaluatedAt,
      );
    }

    /*
     * Identity verification must happen before
     * valuation/evidence/risk screening.
     *
     * A generic financial search result cannot
     * establish that the requested symbol exists.
     */
    const identity =
      verifyInstrumentIdentity(
        analysis,
        item.symbol,
        item.market,
      );

    if (
      !identity.verified
    ) {
      return buildInsufficientDataItem(
        item,
        analysis,
        identity.reason,
        evaluatedAt,
      );
    }

    const evaluation =
      evaluateItem(
        analysis,
        criteria,
      );

    const decision =
      evaluation.missing.length > 0 &&
      evaluation.failed.length === 0
        ? "insufficient-data"
        : evaluation.failed.length === 0
          ? "candidate"
          : "excluded";

    return {
      symbol:
        item.symbol,

      market:
        item.market,

      decision,

      matchedCriteria:
        evaluation.matched,

      failedCriteria:
        evaluation.failed,

      missingCriteria:
        evaluation.missing,

      reasons:
        [
          identity.reason,
          ...evaluation.reasons,
        ].filter(Boolean),

      risks:
        evaluation.risks,

      analysis,

      evaluatedAt,
    };
  } catch (error) {
    return buildInsufficientDataItem(
      item,
      null,
      error instanceof Error
        ? error.message
        : "Market screening evaluation failed.",
      evaluatedAt,
    );
  }
}

function resolveMarket(
  items: MarketScreeningUniverseItem[],
): MarketRegion | "mixed" {
  const markets =
    new Set(
      items.map(
        (item) =>
          item.market,
      ),
    );

  if (
    markets.size === 1
  ) {
    return (
      Array.from(
        markets,
      )[0] ?? "us"
    );
  }

  return "mixed";
}

export async function runMarketScreeningRuntime(
  request: MarketScreeningRequest,
): Promise<MarketScreeningResult> {
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
    universe.length === 0
  ) {
    return {
      success: false,

      code:
        "C147_3_SCREENING_INSUFFICIENT",

      market:
        "mixed",

      universeSize: 0,
      evaluatedCount: 0,
      candidateCount: 0,
      excludedCount: 0,
      insufficientDataCount: 0,

      criteria,

      items: [],

      runtime: {
        name:
          "market-screening-runtime",

        version:
          "C147.3",

        generatedAt:
          new Date().toISOString(),

        latencyMs:
          Date.now() -
          startedAt,
      },

      disclaimer:
        "AIOS screening provides transparent research and decision-support information. It does not constitute personalized investment advice or automatic buy/sell instructions.",
    };
  }

  /*
   * Sequential execution is intentional.
   *
   * The current market provider may invoke
   * external evidence retrieval. Sequential
   * evaluation prevents an uncontrolled
   * request burst against external providers.
   */
  const items:
    MarketScreeningItem[] =
    [];

  for (
    const item of universe
  ) {
    const result =
      await evaluateUniverseItem(
        item,
        criteria,
        request.mode,
      );

    items.push(
      result,
    );
  }

  const candidateCount =
    items.filter(
      (item) =>
        item.decision ===
        "candidate",
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

  const evaluatedCount =
    items.length;

  const success =
    evaluatedCount > 0;

  const code =
    success &&
    insufficientDataCount === 0
      ? "C147_3_SCREENING_PASS"
      : success
        ? "C147_3_SCREENING_PARTIAL"
        : "C147_3_SCREENING_INSUFFICIENT";

  return {
    success,

    code,

    market:
      resolveMarket(
        universe,
      ),

    universeSize:
      universe.length,

    evaluatedCount,

    candidateCount,

    excludedCount,

    insufficientDataCount,

    criteria,

    items,

    runtime: {
      name:
        "market-screening-runtime",

      version:
        "C147.3",

      generatedAt:
        new Date().toISOString(),

      latencyMs:
        Date.now() -
        startedAt,
    },

    disclaimer:
      "AIOS screening provides transparent research and decision-support information. It does not constitute personalized investment advice or automatic buy/sell instructions.",
  };
}
