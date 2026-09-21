import {
  analyzeMarketRequest,
} from "./market-router";

import type {
  MarketAnalysisResult,
  MarketFieldName,
  MarketFieldQuality,
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

const FIELD_BY_METRIC: Record<
  MarketEvidenceMetric,
  MarketFieldName
> = {
  price: "price",
  marketCap: "marketCap",
  pe: "pe",
  pb: "pb",
  eps: "eps",
  revenue: "revenue",
  revenueGrowth: "revenueGrowth",
};

const METRIC_PATTERNS: Record<
  MarketEvidenceMetric,
  RegExp[]
> = {
  price: [
    /\bcurrent price\b/i,
    /\bstock price\b/i,
    /\bshare price\b/i,
    /\btrading at\b/i,
    /\bprice today\b/i,
    /价格/i,
    /股价/i,
  ],

  marketCap: [
    /\bmarket cap\b/i,
    /\bmarket capitalization\b/i,
    /市值/i,
  ],

  pe: [
    /\bP\/E\b/i,
    /\bPE ratio\b/i,
    /\bprice[- ]to[- ]earnings\b/i,
    /市盈率/i,
  ],

  pb: [
    /\bP\/B\b/i,
    /\bPB ratio\b/i,
    /\bprice[- ]to[- ]book\b/i,
    /市净率/i,
  ],

  eps: [
    /\bEPS\b/i,
    /\bearnings per share\b/i,
    /每股收益/i,
  ],

  revenue: [
    /\brevenue\b/i,
    /\bannual sales\b/i,
    /营收/i,
    /收入/i,
  ],

  revenueGrowth: [
    /\brevenue growth\b/i,
    /\bsales growth\b/i,
    /营收增长/i,
    /收入增长/i,
  ],
};

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
  universe:
    | MarketEvidenceMatrixRequest["universe"]
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
            typeof item.symbol ===
              "string" &&
            item.symbol.trim(),
        ) &&
        (
          item.market === "us" ||
          item.market === "hk" ||
          item.market === "cn"
        ),
    )
    .map((item) => ({
      symbol:
        item.symbol.trim(),
      market:
        item.market,
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

    const aliases: Record<
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
        aliases[
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
        .replace(/\.SH$/, "")
        .replace(/\.SZ$/, "")
        .replace(/\D/g, "");

    if (digits) {
      tokens.add(digits);
      tokens.add(`${digits}.SH`);
      tokens.add(`${digits}.SZ`);
    }

    const aliases: Record<
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
        aliases[digits] ?? []
    ) {
      tokens.add(
        normalizeIdentityToken(
          alias,
        ),
      );
    }
  }

  return Array.from(
    tokens,
  ).filter(Boolean);
}

function evidenceContainsIdentity(
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

  return tokens.some(
    (token) => {
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
        ).test(text);
      }

      return text.includes(token);
    },
  );
}

function evidenceMatchesMetric(
  evidenceTitle: string,
  evidenceSnippet: string,
  metric: MarketEvidenceMetric,
): boolean {
  const text =
    `${evidenceTitle} ${evidenceSnippet}`;

  return METRIC_PATTERNS[
    metric
  ].some(
    (pattern) =>
      pattern.test(text),
  );
}

function mapFieldQuality(
  quality:
    | MarketFieldQuality
    | undefined,
): MarketEvidenceMetricMatrix["quality"] {
  switch (quality) {
    case "corroborated":
      return "verified";

    case "single-source":
      return "supported";

    case "corroborated-with-conflict":
    case "conflict":
      return "conflicted";

    case "missing":
    default:
      return "insufficient";
  }
}

function mapAgreement(
  quality:
    | MarketFieldQuality
    | undefined,
): MarketEvidenceAgreement {
  switch (quality) {
    case "corroborated":
      return "corroborated";

    case "single-source":
      return "single-source";

    case "corroborated-with-conflict":
    case "conflict":
      return "conflict";

    case "missing":
    default:
      return "unavailable";
  }
}

function snapshotValue(
  analysis: MarketAnalysisResult,
  metric: MarketEvidenceMetric,
): number | null {
  const field =
    FIELD_BY_METRIC[metric];

  const value =
    analysis.snapshot[field];

  return typeof value ===
    "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

function buildEmptyMetric(
  metric: MarketEvidenceMetric,
  explanation: string,
): MarketEvidenceMetricMatrix {
  return {
    metric,
    value: null,
    agreement:
      "unavailable",
    quality:
      "insufficient",
    observationCount: 0,
    independentDomains: 0,
    observations: [],
    conflict: false,
    humanVerificationRequired:
      true,
    explanation,
  };
}

function buildObservations(
  analysis: MarketAnalysisResult,
  symbol: string,
  market: MarketRegion,
  metric: MarketEvidenceMetric,
): MarketEvidenceObservation[] {
  const identityTokens =
    buildIdentityTokens(
      symbol,
      market,
    );

  const value =
    snapshotValue(
      analysis,
      metric,
    );

  if (value === null) {
    return [];
  }

  return analysis.evidence
    .filter(
      (evidence) =>
        evidenceContainsIdentity(
          evidence.title,
          evidence.url,
          evidence.snippet,
          identityTokens,
        ),
    )
    .filter(
      (evidence) =>
        evidenceMatchesMetric(
          evidence.title,
          evidence.snippet,
          metric,
        ),
    )
    .map(
      (evidence) => ({
        metric,
        value,
        sourceTitle:
          evidence.title,
        sourceUrl:
          evidence.url,
        hostname:
          evidence.hostname,
        observedText:
          `${evidence.title} ${evidence.snippet}`,
        freshness:
          analysis.verification
            .freshness
            .freshness,
      }),
    );
}

function buildMetricMatrix(
  analysis: MarketAnalysisResult,
  symbol: string,
  market: MarketRegion,
  metric: MarketEvidenceMetric,
): MarketEvidenceMetricMatrix {
  const field =
    FIELD_BY_METRIC[metric];

  const fieldQuality =
    analysis.snapshot
      .fieldQuality?.[field];

  const value =
    snapshotValue(
      analysis,
      metric,
    );

  const observations =
    buildObservations(
      analysis,
      symbol,
      market,
      metric,
    );

  const domains =
    unique(
      observations.map(
        (item) =>
          item.hostname,
      ),
    );

  const quality =
    mapFieldQuality(
      fieldQuality,
    );

  const agreement =
    mapAgreement(
      fieldQuality,
    );

  const conflict =
    fieldQuality ===
      "conflict" ||
    fieldQuality ===
      "corroborated-with-conflict";

  if (
    value === null ||
    quality === "insufficient"
  ) {
    return {
      metric,
      value: null,
      agreement:
        "unavailable",
      quality:
        "insufficient",
      observationCount:
        observations.length,
      independentDomains:
        domains.length,
      observations,
      conflict: false,
      humanVerificationRequired:
        true,
      explanation:
        `No normalized ${metric} value is available from the market normalization layer.`,
    };
  }

  return {
    metric,
    value,
    agreement,
    quality,
    observationCount:
      observations.length,
    independentDomains:
      domains.length,
    observations,
    conflict,
    humanVerificationRequired:
      conflict ||
      quality !== "verified",
    explanation:
      conflict
        ? `${metric} is normalized but contains source conflict; human verification is required.`
        : agreement ===
            "corroborated"
          ? `${metric} is corroborated by the existing market normalization layer.`
          : `${metric} is available from normalized market evidence but is not fully corroborated.`,
  };
}

function buildIdentityMatchList(
  analysis:
    | MarketAnalysisResult
    | null,
  symbol: string,
  market: MarketRegion,
) {
  if (!analysis) {
    return [];
  }

  const identityTokens =
    buildIdentityTokens(
      symbol,
      market,
    );

  return analysis.evidence.filter(
    (item) =>
      evidenceContainsIdentity(
        item.title,
        item.url,
        item.snippet,
        identityTokens,
      ),
  );
}

function buildItem(
  symbol: string,
  market: MarketRegion,
  analysis:
    | MarketAnalysisResult
    | null,
): MarketEvidenceMatrixItem {
  const identityMatches =
    buildIdentityMatchList(
      analysis,
      symbol,
      market,
    );

  const identityVerified =
    identityMatches.length > 0;

  /*
   * C147.6.2 IDENTITY GATE
   *
   * Evidence returned by a generic financial
   * search is not sufficient to attribute
   * normalized market metrics to the
   * requested security.
   *
   * Identity must therefore be established
   * BEFORE any normalized metric is exposed
   * through the evidence matrix.
   */
  if (!identityVerified) {
    const metrics =
      {} as Record<
        MarketEvidenceMetric,
        MarketEvidenceMetricMatrix
      >;

    for (
      const metric of METRICS
    ) {
      metrics[metric] =
        buildEmptyMetric(
          metric,
          `Security identity was not verified for ${symbol}. Generic financial evidence is not sufficient to attribute ${metric} to the requested security.`,
        );
    }

    return {
      symbol,
      market,

      identityVerified:
        false,

      metrics,

      evidenceSummary: {
        sourceCount:
          analysis?.evidence.length ??
          0,

        independentDomains: 0,

        verified: false,
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
        "insufficient",

      humanReviewRequired:
        true,

      /*
       * Keep the raw analysis internally available
       * for diagnostics, but expose NO normalized
       * metric values through the evidence matrix.
       */
      analysis,
    };
  }

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
            analysis,
            symbol,
            market,
            metric,
          )
        : buildEmptyMetric(
            metric,
            "Market analysis failed before normalized evidence became available.",
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
      true,

    metrics,

    evidenceSummary: {
      sourceCount:
        analysis?.evidence.length ??
        0,

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
      symbol:
        item.symbol,
      market:
        item.market,
      mode:
        "full",
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

  if (
    universe.length === 0
  ) {
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
        "Metric values are sourced from the existing normalized market snapshot.",
        "Existing fieldQuality is preserved.",
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
    MarketEvidenceMatrixItem[] =
    [];

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
        item.identityVerified &&
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
        item.identityVerified &&
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
      "Metric values come from the existing C147.2 normalization layer.",
      "Existing fieldQuality is preserved rather than recalculated.",
      "Security identity is verified before normalized metrics are exposed.",
      "Generic financial evidence cannot be attributed to an unverified security.",
      "Evidence observations provide source provenance without replacing normalized values.",
      "Multiple independent domains remain visible.",
      "Material conflicts remain visible.",
      "Evidence freshness remains visible.",
      "Human verification remains required.",
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
      "This evidence matrix organizes normalized market data and source provenance. It does not provide personalized investment advice or execute trades.",
  };
}
