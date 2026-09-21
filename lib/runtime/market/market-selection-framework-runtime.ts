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

const DEFAULT_CRITERIA:
  MarketSelectionFrameworkCriteria = {
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

function normalizeUniverse(
  universe: MarketSelectionFrameworkRequest["universe"],
) {
  const seen =
    new Set<string>();

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

function unique(
  values: string[],
): string[] {
  return Array.from(
    new Set(values),
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

  const missing: string[] =
    [];

  const reasons: string[] =
    [];

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
      missing.push(
        "eps",
      );
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

  const missing: string[] =
    [];

  const reasons: string[] =
    [];

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
        [
          buildStage(
            "industry",
            false,
            "insufficient-data",
            [
              analysis.error ??
                "Market analysis returned insufficient evidence.",
            ],
            ["analysis"],
          ),
        ],
      );
    }

    const identityTokens =
      [
        item.symbol
          .trim()
          .toUpperCase(),
      ];

    const identityMatched =
      analysis.evidence.some(
        (evidence) => {
          const haystack =
            [
              evidence.title,
              evidence.url,
              evidence.snippet,
            ]
              .join(" ")
              .toUpperCase();

          return identityTokens.some(
            (token) =>
              haystack.includes(
                token,
              ),
          );
        },
      );

    if (
      !identityMatched
    ) {
      return buildItem(
        item,
        analysis,
        [
          buildStage(
            "industry",
            false,
            "insufficient-data",
            [
              `No evidence explicitly references ${item.symbol}.`,
            ],
            ["identity"],
          ),
        ],
      );
    }

    const stages: MarketSelectionStageResult[] =
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
      [
        buildStage(
          "industry",
          false,
          "insufficient-data",
          [
            error instanceof Error
              ? error.message
              : "Framework evaluation failed.",
          ],
          ["analysis"],
        ),
      ],
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
      request.universe ??
        [],
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
