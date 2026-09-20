import type {
  MarketEvidence,
  MarketFieldName,
  MarketFieldQuality,
  MarketSnapshot,
} from "./market-types";

type MetricCandidate = {
  field: MarketFieldName;
  value: number;
  source: string;
  confidence: number;
  retrievedAt: number;
};

type ResolvedMetric = {
  value: number | null;
  quality: MarketFieldQuality;
  candidates: MetricCandidate[];
};

function parseNumber(value: string): number | null {
  const cleaned = value
    .replace(/,/g, "")
    .replace(/%/g, "")
    .trim();

  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function parseScaledNumber(
  value: string,
): number | null {
  const normalized = value
    .replace(/,/g, "")
    .trim()
    .toUpperCase();

  const match = normalized.match(
    /^([+-]?\d+(?:\.\d+)?)\s*([TBMK])?$/,
  );

  if (!match?.[1]) {
    return null;
  }

  const base = Number(match[1]);

  if (!Number.isFinite(base)) {
    return null;
  }

  const unit = match[2];

  switch (unit) {
    case "T":
      return base * 1_000_000_000_000;

    case "B":
      return base * 1_000_000_000;

    case "M":
      return base * 1_000_000;

    case "K":
      return base * 1_000;

    default:
      return base;
  }
}

function addCandidate(
  candidates: MetricCandidate[],
  field: MarketFieldName,
  value: number | null,
  evidence: MarketEvidence,
): void {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return;
  }

  candidates.push({
    field,
    value,
    source: evidence.hostname,
    confidence: Math.max(
      0,
      Math.min(
        1,
        evidence.confidence,
      ),
    ),
    retrievedAt:
      evidence.retrievedAt,
  });
}

function extractCandidatesFromEvidence(
  evidence: MarketEvidence,
): MetricCandidate[] {
  const text =
    `${evidence.title} ${evidence.snippet}`;

  const candidates: MetricCandidate[] = [];

  /*
   * PRICE
   *
   * Important:
   * Never use a generic "price" regex.
   * This prevents open/high/low/targets
   * from being interpreted as current price.
   */
  const pricePatterns: RegExp[] = [
    /\b(?:current price|share price|stock price|last price|price today)\b[^$£€\d]{0,35}(?:USD|HKD|CNY|\$|HK\$|¥)?\s*([\d,.]+)/i,

    /\b(?:valued at|trading at)\b[^$£€\d]{0,20}(?:USD|HKD|CNY|\$|HK\$|¥)?\s*([\d,.]+)/i,

    /(?:价格|股价)\s*(?:为|是|:)?\s*(?:USD|HKD|CNY|\$|HK\$|¥)?\s*([\d,.]+)/i,
  ];

  for (const pattern of pricePatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      addCandidate(
        candidates,
        "price",
        parseNumber(match[1]),
        evidence,
      );
      break;
    }
  }

  /*
   * P/E
   *
   * Use word boundaries.
   * Never match "PE" inside "open".
   */
  const pePatterns: RegExp[] = [
    /\bP\/E(?:\s+ratio)?\b[^0-9]{0,25}([\d.]+)/i,

    /\bPE\s+ratio\b[^0-9]{0,25}([\d.]+)/i,

    /\bprice[- ]to[- ]earnings(?:\s+ratio)?\b[^0-9]{0,25}([\d.]+)/i,

    /\b市盈率\b[^0-9]{0,25}([\d.]+)/i,
  ];

  for (const pattern of pePatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      addCandidate(
        candidates,
        "pe",
        parseNumber(match[1]),
        evidence,
      );
      break;
    }
  }

  /*
   * P/B
   */
  const pbPatterns: RegExp[] = [
    /\bP\/B(?:\s+ratio)?\b[^0-9]{0,25}([\d.]+)/i,

    /\bPB\s+ratio\b[^0-9]{0,25}([\d.]+)/i,

    /\bprice[- ]to[- ]book(?:\s+ratio)?\b[^0-9]{0,25}([\d.]+)/i,

    /\b市净率\b[^0-9]{0,25}([\d.]+)/i,
  ];

  for (const pattern of pbPatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      addCandidate(
        candidates,
        "pb",
        parseNumber(match[1]),
        evidence,
      );
      break;
    }
  }

  /*
   * EPS
   */
  const epsPatterns: RegExp[] = [
    /\bEPS\b[^0-9+-]{0,25}([+-]?[\d.]+)/i,

    /\bearnings per share\b[^0-9+-]{0,25}([+-]?[\d.]+)/i,

    /\b每股收益\b[^0-9+-]{0,25}([+-]?[\d.]+)/i,
  ];

  for (const pattern of epsPatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      addCandidate(
        candidates,
        "eps",
        parseNumber(match[1]),
        evidence,
      );
      break;
    }
  }

  /*
   * MARKET CAP
   */
  const marketCapPatterns: RegExp[] = [
    /\bmarket capitalization\b[^0-9]{0,20}([\d,.]+\s*[TBMK]?)/i,

    /\bmarket cap\b[^0-9]{0,20}([\d,.]+\s*[TBMK]?)/i,

    /\b市值\b[^0-9]{0,20}([\d,.]+\s*[TBMK]?)/i,
  ];

  for (const pattern of marketCapPatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      addCandidate(
        candidates,
        "marketCap",
        parseScaledNumber(match[1]),
        evidence,
      );
      break;
    }
  }

  /*
   * REVENUE
   */
  const revenuePatterns: RegExp[] = [
    /\brevenue\b[^0-9]{0,20}([\d,.]+\s*[TBMK]?)/i,

    /\bannual sales\b[^0-9]{0,20}([\d,.]+\s*[TBMK]?)/i,

    /\b营收\b[^0-9]{0,20}([\d,.]+\s*[TBMK]?)/i,

    /\b收入\b[^0-9]{0,20}([\d,.]+\s*[TBMK]?)/i,
  ];

  for (const pattern of revenuePatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      addCandidate(
        candidates,
        "revenue",
        parseScaledNumber(match[1]),
        evidence,
      );
      break;
    }
  }

  /*
   * REVENUE GROWTH
   */
  const revenueGrowthPatterns: RegExp[] = [
    /\brevenue growth\b[^0-9+-]{0,25}([+-]?[\d.]+)%/i,

    /\brevenue growth rate\b[^0-9+-]{0,25}([+-]?[\d.]+)%/i,

    /\b(?:revenue|sales)\b[^%]{0,30}\b(?:up|down|grew|growth)\b[^0-9+-]{0,15}([+-]?[\d.]+)%/i,

    /(?:营收增长|收入增长)\s*(?:约|为|:)?\s*([+-]?[\d.]+)%/i,
  ];

  for (const pattern of revenueGrowthPatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      addCandidate(
        candidates,
        "revenueGrowth",
        parseNumber(match[1]),
        evidence,
      );
      break;
    }
  }

  /*
   * CHANGE %
   *
   * Do NOT accept:
   * "1 year change"
   * "52-week change"
   * "3 year return"
   *
   * Only daily/current/explicit change signals.
   */
  const changePatterns: RegExp[] = [
    /\b(?:today|today's|daily|1D|1-day)\b[^%]{0,45}([+-]?[\d.]+)%/i,

    /\b(?:daily change|day change|change today)\b[^%]{0,25}([+-]?[\d.]+)%/i,

    /(?:涨跌|日涨跌|今日涨跌|涨幅|跌幅)\s*(?:为|:)?\s*([+-]?[\d.]+)%/i,
  ];

  for (const pattern of changePatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      addCandidate(
        candidates,
        "changePercent",
        parseNumber(match[1]),
        evidence,
      );
      break;
    }
  }

  return candidates;
}

function relativeDifference(
  a: number,
  b: number,
): number {
  const denominator =
    Math.max(
      Math.abs(a),
      Math.abs(b),
      0.000001,
    );

  return (
    Math.abs(a - b) /
    denominator
  );
}

function resolveCandidates(
  field: MarketFieldName,
  candidates: MetricCandidate[],
): ResolvedMetric {
  if (candidates.length === 0) {
    return {
      value: null,
      quality: "missing",
      candidates: [],
    };
  }

  /*
   * Build weighted clusters.
   *
   * Values within 5% belong to the same
   * evidence cluster.
   */
  const clusters: MetricCandidate[][] = [];

  for (const candidate of candidates) {
    let target: MetricCandidate[] | null =
      null;

    for (const cluster of clusters) {
      const representative =
        cluster[0];

      if (
        representative &&
        relativeDifference(
          representative.value,
          candidate.value,
        ) <= 0.05
      ) {
        target = cluster;
        break;
      }
    }

    if (target) {
      target.push(candidate);
    } else {
      clusters.push([candidate]);
    }
  }

  clusters.sort((a, b) => {
    const scoreA = a.reduce(
      (sum, item) =>
        sum + item.confidence,
      0,
    );

    const scoreB = b.reduce(
      (sum, item) =>
        sum + item.confidence,
      0,
    );

    return scoreB - scoreA;
  });

  const winner =
    clusters[0] ?? [];

  if (winner.length === 0) {
    return {
      value: null,
      quality: "missing",
      candidates,
    };
  }

  const totalWeight =
    winner.reduce(
      (sum, item) =>
        sum + Math.max(
          item.confidence,
          0.05,
        ),
      0,
    );

  const weightedValue =
    winner.reduce(
      (sum, item) =>
        sum +
        item.value *
          Math.max(
            item.confidence,
            0.05,
          ),
      0,
    ) /
    Math.max(
      totalWeight,
      0.05,
    );

  const losingClusters =
    clusters.slice(1);

  const hasMaterialConflict =
    losingClusters.some(
      (cluster) => {
        const representative =
          cluster[0];

        return (
          representative &&
          relativeDifference(
            weightedValue,
            representative.value,
          ) > 0.10
        );
      },
    );

  /*
   * If several independent sources agree,
   * the field is corroborated.
   *
   * If only one source exists, retain it
   * but mark it single-source.
   *
   * If materially conflicting evidence exists,
   * only accept the winner when it has
   * meaningful corroboration.
   */
  const uniqueSources =
    new Set(
      winner.map(
        (item) =>
          item.source,
      ),
    ).size;

  if (
    hasMaterialConflict &&
    uniqueSources < 2
  ) {
    return {
      value: null,
      quality: "conflict",
      candidates,
    };
  }

  if (hasMaterialConflict) {
    return {
      value: weightedValue,
      quality: "corroborated-with-conflict",
      candidates,
    };
  }

  if (uniqueSources >= 2) {
    return {
      value: weightedValue,
      quality: "corroborated",
      candidates,
    };
  }

  return {
    value: weightedValue,
    quality: "single-source",
    candidates,
  };
}

export function normalizeMarketEvidence(
  evidence: MarketEvidence[],
): {
  snapshot: MarketSnapshot;
  fieldCandidates: Partial<
    Record<
      MarketFieldName,
      MetricCandidate[]
    >
  >;
} {
  const candidates: MetricCandidate[] =
    evidence.flatMap(
      extractCandidatesFromEvidence,
    );

  const byField: Partial<
    Record<
      MarketFieldName,
      MetricCandidate[]
    >
  > = {};

  for (const candidate of candidates) {
    const current =
      byField[candidate.field] ??
      [];

    current.push(candidate);

    byField[candidate.field] =
      current;
  }

  const fields: MarketFieldName[] = [
    "price",
    "previousClose",
    "changePercent",
    "open",
    "high",
    "low",
    "volume",
    "marketCap",
    "pe",
    "pb",
    "eps",
    "revenue",
    "revenueGrowth",
  ];

  const resolved: Partial<
    Record<
      MarketFieldName,
      ResolvedMetric
    >
  > = {};

  for (const field of fields) {
    resolved[field] =
      resolveCandidates(
        field,
        byField[field] ?? [],
      );
  }

  const snapshot: MarketSnapshot = {
    price:
      resolved.price?.value ??
      null,

    previousClose: null,

    changePercent:
      resolved.changePercent?.value ??
      null,

    open: null,
    high: null,
    low: null,
    volume: null,

    marketCap:
      resolved.marketCap?.value ??
      null,

    pe:
      resolved.pe?.value ??
      null,

    pb:
      resolved.pb?.value ??
      null,

    eps:
      resolved.eps?.value ??
      null,

    revenue:
      resolved.revenue?.value ??
      null,

    revenueGrowth:
      resolved.revenueGrowth?.value ??
      null,

    dataQuality:
      resolved.price?.value !== null &&
      resolved.price?.value !== undefined
        ? "web-evidence"
        : "insufficient",

    liveQuoteAvailable: false,

    asOf:
      evidence.length > 0
        ? new Date(
            Math.max(
              ...evidence.map(
                (item) =>
                  item.retrievedAt,
              ),
            ),
          ).toISOString()
        : null,

    source:
      evidence[0]?.hostname ??
      null,

    dataset: null,

    bars: [],

    fieldQuality: {
      price:
        resolved.price?.quality ??
        "missing",

      changePercent:
        resolved.changePercent?.quality ??
        "missing",

      marketCap:
        resolved.marketCap?.quality ??
        "missing",

      pe:
        resolved.pe?.quality ??
        "missing",

      pb:
        resolved.pb?.quality ??
        "missing",

      eps:
        resolved.eps?.quality ??
        "missing",

      revenue:
        resolved.revenue?.quality ??
        "missing",

      revenueGrowth:
        resolved.revenueGrowth?.quality ??
        "missing",
    },
  };

  return {
    snapshot,
    fieldCandidates: byField,
  };
}
