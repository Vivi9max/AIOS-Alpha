import {
  analyzeMarketRequest,
} from "./market-router";

import type {
  MarketAnalysisResult,
  MarketRegion,
} from "./market-types";

import type {
  MarketEvidenceAgreement,
  MarketEvidenceMetric,
  MarketEvidenceMetricMatrix,
  MarketEvidenceMatrixItem,
  MarketEvidenceMatrixRequest,
  MarketEvidenceMatrixResult,
  MarketEvidenceObservation,
} from "./market-evidence-matrix-types";

const METRICS: MarketEvidenceMetric[] = [
  "price",
  "marketCap",
  "pe",
  "pb",
  "eps",
  "revenue",
  "revenueGrowth",
];

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeUniverse(
  universe: MarketEvidenceMatrixRequest["universe"] | undefined,
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

function identityTokens(
  symbol: string,
  market: MarketRegion,
): string[] {
  const raw =
    normalizeIdentityToken(symbol);

  const tokens = new Set<string>();

  if (raw) {
    tokens.add(raw);
  }

  if (market === "us") {
    tokens.add(
      raw.replace(/^US:/, ""),
    );
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

    const aliases: Record<string, string[]> = {
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
        aliases[digits.padStart(4, "0")] ?? []
    ) {
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
        .replace(/\.SH$/, "")
        .replace(/\.SZ$/, "")
        .replace(/\D/g, "");

    if (digits) {
      tokens.add(digits);
      tokens.add(`${digits}.SH`);
      tokens.add(`${digits}.SZ`);
    }

    const aliases: Record<string, string[]> = {
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
      const alias of aliases[digits] ?? []
    ) {
      tokens.add(
        normalizeIdentityToken(alias),
      );
    }
  }

  return Array.from(tokens).filter(Boolean);
}

function containsIdentity(
  title: string,
  url: string,
  snippet: string,
  tokens: string[],
): boolean {
  const text =
    [
      title,
      url,
      snippet,
    ]
      .join(" ")
      .toUpperCase();

  return tokens.some((token) => {
    if (/^\d{3,6}$/.test(token)) {
      const escaped =
        token.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        );

      return new RegExp(
        `(^|[^0-9])${escaped}([^0-9]|$)`,
      ).test(text);
    }

    return text.includes(token);
  });
}

function extractMetric(
  text: string,
  metric: MarketEvidenceMetric,
): number | null {
  const normalized =
    text
      .replace(/,/g, "")
      .replace(/\$/g, "")
      .replace(/%/g, "");

  const patterns: Record<
    MarketEvidenceMetric,
    RegExp[]
  > = {
    price: [
      /(?:price|share price|stock price)[^\d]{0,20}(\d+(?:\.\d+)?)/i,
    ],

    marketCap: [
      /(?:market cap|market capitalization)[^\d]{0,20}(\d+(?:\.\d+)?)/i,
    ],

    pe: [
      /(?:p\/e|price[\s-]*to[\s-]*earnings|pe ratio)[^\d]{0,20}(\d+(?:\.\d+)?)/i,
    ],

    pb: [
      /(?:p\/b|price[\s-]*to[\s-]*book|pb ratio)[^\d]{0,20}(\d+(?:\.\d+)?)/i,
    ],

    eps: [
      /(?:eps|earnings per share)[^\d]{0,20}(\d+(?:\.\d+)?)/i,
    ],

    revenue: [
      /(?:revenue|sales)[^\d]{0,20}(\d+(?:\.\d+)?)/i,
    ],

    revenueGrowth: [
      /(?:revenue growth|sales growth)[^\d-]{0,20}(-?\d+(?:\.\d+)?)/i,
    ],
  };

  for (
    const pattern of patterns[metric]
  ) {
    const match =
      normalized.match(pattern);

    if (match?.[1]) {
      const value =
        Number(match[1]);

      if (Number.isFinite(value)) {
        return value;
      }
    }
  }

  return null;
}

function collectObservations(
  analysis: MarketAnalysisResult,
  symbol: string,
  market: MarketRegion,
  metric: MarketEvidenceMetric,
): MarketEvidenceObservation[] {
  const tokens =
    identityTokens(
      symbol,
      market,
    );

  const observations:
    MarketEvidenceObservation[] = [];

  for (
    const evidence of analysis.evidence
  ) {
    if (
      !containsIdentity(
        evidence.title,
        evidence.url,
        evidence.snippet,
        tokens,
      )
    ) {
      continue;
    }

    const observedText =
      [
        evidence.title,
        evidence.snippet,
      ].join(" ");

    const value =
      extractMetric(
        observedText,
        metric,
      );

    if (value === null) {
      continue;
    }

    observations.push({
      metric,
      value,
      sourceTitle:
        evidence.title,
      sourceUrl:
        evidence.url,
      hostname:
        evidence.hostname,
      observedText,
      freshness:
        analysis.verification
          .freshness
          .freshness,
    });
  }

  return observations;
}

function buildMetricMatrix(
  metric: MarketEvidenceMetric,
  observations: MarketEvidenceObservation[],
): MarketEvidenceMetricMatrix {
  if (observations.length === 0) {
    return {
      metric,
      value: null,
      agreement: "unavailable",
      quality: "insufficient",
      observationCount: 0,
      independentDomains: 0,
      observations: [],
      conflict: false,
      humanVerificationRequired: true,
      explanation:
        `No identity-matched evidence provided a usable ${metric} value.`,
    };
  }

  const domains =
    unique(
      observations.map(
        (item) => item.hostname,
      ),
    );

  const values =
    observations
      .map(
        (item) => item.value,
      )
      .filter(
        (
          value,
        ): value is number =>
          typeof value === "number" &&
          Number.isFinite(value),
      );

  const average =
    values.length > 0
      ? values.reduce(
          (sum, value) =>
            sum + value,
          0,
        ) / values.length
      : null;

  const conflict =
    values.length >= 2 &&
    average !== null &&
    values.some(
      (value) =>
        Math.abs(
          value - average,
        ) /
          Math.max(
            Math.abs(average),
            0.000001,
          ) >
        0.05,
    );

  let agreement:
    MarketEvidenceAgreement;

  if (conflict) {
    agreement = "conflict";
  } else if (
    observations.length >= 2 &&
    domains.length >= 2
  ) {
    agreement = "corroborated";
  } else {
    agreement = "single-source";
  }

  const value =
    average !== null
      ? Number(
          average.toFixed(6),
        )
      : null;

  return {
    metric,
    value,
    agreement,
    quality:
      conflict
        ? "conflicted"
        : agreement === "corroborated"
          ? "verified"
          : "supported",
    observationCount:
      observations.length,
    independentDomains:
      domains.length,
    observations,
    conflict,
    humanVerificationRequired:
      conflict ||
      agreement !== "corroborated",
    explanation:
      conflict
        ? `${metric} observations differ materially across retrieved evidence and require human verification.`
        : agreement === "corroborated"
          ? `${metric} is supported by multiple independent evidence domains.`
          : `${metric} is supported by a limited evidence set and should be human-verified.`,
  };
}

function buildItem(
  symbol: string,
  market: MarketRegion,
  analysis: MarketAnalysisResult | null,
): MarketEvidenceMatrixItem {
  const tokens =
    identityTokens(
      symbol,
      market,
    );

  const identityMatches =
    analysis?.evidence.filter(
      (item) =>
        containsIdentity(
          item.title,
          item.url,
          item.snippet,
          tokens,
        ),
    ) ?? [];

  const metrics =
    {} as Record<
      MarketEvidenceMetric,
      MarketEvidenceMetricMatrix
    >;

  for (
    const metric of METRICS
  ) {
    metrics[metric] =
      analysis
        ? buildMetricMatrix(
            metric,
            collectObservations(
              analysis,
              symbol,
              market,
              metric,
            ),
          )
        : buildMetricMatrix(
            metric,
            [],
          );
  }

  const independentDomains =
    unique(
      identityMatches
        .map(
          (item) =>
            item.hostname,
        )
        .filter(Boolean),
    ).length;

  return {
    symbol,
    market,

    identityVerified:
      identityMatches.length > 0,

    metrics,

    evidenceSummary: {
      sourceCount:
        analysis?.evidence.length ?? 0,

      independentDomains,

      verified:
        Boolean(
          analysis?.verification
            .verified,
        ),
    },

    freshness: {
      status:
        analysis?.verification
          .freshness
          .freshness ??
        "unknown",

      asOf:
        analysis?.verification
          .freshness
          .referenceTime ??
        analysis?.snapshot
          .asOf ??
        null,
    },

    dataQuality:
      analysis?.snapshot
        .dataQuality ??
      "insufficient",

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
): Promise<MarketEvidenceMatrixItem> {
  const analysis =
    await analyzeMarketRequest({
      symbol: item.symbol,
      market: item.market,
      mode: "full",
      query:
        query ??
        `Evidence matrix ${item.market} ${item.symbol}`,
    });

  return buildItem(
    item.symbol,
    item.market,
    analysis,
  );
}

export async function runMarketEvidenceMatrix(
  request: MarketEvidenceMatrixRequest,
): Promise<MarketEvidenceMatrixResult> {
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
        "C147_6_EVIDENCE_MATRIX_INSUFFICIENT",

      universeSize: 0,
      evaluatedCount: 0,
      verifiedCount: 0,
      conflictedCount: 0,
      insufficientCount: 0,

      items: [],

      principles: [
        "Evidence matrix requires at least one valid security.",
        "Evidence is preserved per source rather than silently collapsed.",
        "Conflicts remain visible.",
        "Human verification remains required.",
      ],

      humanDecisionRequired:
        true,

      runtime: {
        name:
          "market-evidence-matrix-runtime",
        version:
          "C147.6",
        generatedAt:
          new Date().toISOString(),
        latencyMs:
          Date.now() -
          startedAt,
      },

      disclaimer:
        "Evidence matrix output is research support only and does not constitute personalized investment advice or automated trading.",
    };
  }

  const items:
    MarketEvidenceMatrixItem[] = [];

  for (
    const item of universe
  ) {
    try {
      items.push(
        await evaluateItem(
          item,
          request?.query,
        ),
      );
    } catch {
      /*
       * Do not manufacture a fake MarketAnalysisResult here.
       * The matrix itself can represent an analysis failure safely
       * with analysis: null and all metric observations unavailable.
       */
      items.push(
        buildItem(
          item.symbol,
          item.market,
          null,
        ),
      );
    }
  }

  const verified =
    items.filter(
      (item) =>
        Object.values(
          item.metrics,
        ).some(
          (metric) =>
            metric.quality ===
            "verified",
        ),
    );

  const conflicted =
    items.filter(
      (item) =>
        Object.values(
          item.metrics,
        ).some(
          (metric) =>
            metric.conflict,
        ),
    );

  const insufficient =
    items.filter(
      (item) =>
        !item.identityVerified ||
        Object.values(
          item.metrics,
        ).every(
          (metric) =>
            metric.quality ===
            "insufficient",
        ),
    );

  let code:
    | "C147_6_EVIDENCE_MATRIX_PASS"
    | "C147_6_EVIDENCE_MATRIX_PARTIAL"
    | "C147_6_EVIDENCE_MATRIX_INSUFFICIENT";

  if (
    insufficient.length ===
    items.length
  ) {
    code =
      "C147_6_EVIDENCE_MATRIX_INSUFFICIENT";
  } else if (
    conflicted.length > 0 ||
    insufficient.length > 0
  ) {
    code =
      "C147_6_EVIDENCE_MATRIX_PARTIAL";
  } else {
    code =
      "C147_6_EVIDENCE_MATRIX_PASS";
  }

  return {
    success:
      code !==
      "C147_6_EVIDENCE_MATRIX_INSUFFICIENT",

    code,

    universeSize:
      universe.length,

    evaluatedCount:
      items.length,

    verifiedCount:
      verified.length,

    conflictedCount:
      conflicted.length,

    insufficientCount:
      insufficient.length,

    items,

    principles: [
      "Market metrics remain linked to their underlying evidence.",
      "Multiple independent sources are required for corroboration.",
      "Material source disagreement is preserved as conflict.",
      "A single-source metric is not silently treated as fully verified.",
      "Evidence freshness remains visible.",
      "Security identity is checked before evidence is attributed to an instrument.",
      "Human verification remains required before investment decisions.",
      "No ranking, prediction, order placement, or automated trading is performed.",
    ],

    humanDecisionRequired:
      true,

    runtime: {
      name:
        "market-evidence-matrix-runtime",

      version:
        "C147.6",

      generatedAt:
        new Date().toISOString(),

      latencyMs:
        Date.now() -
        startedAt,
    },

    disclaimer:
      "This evidence matrix organizes market evidence and metric provenance. It does not provide personalized investment advice or execute trades.",
  };
}
