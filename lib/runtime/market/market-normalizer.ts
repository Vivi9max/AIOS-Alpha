import {
  buildSemanticSnapshot,
} from "./market-semantic";

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
  session:
    | "regular"
    | "after_hours"
    | "pre_market"
    | "intraday"
    | "unknown";
};

type ResolvedMetric = {
  value: number | null;
  quality: MarketFieldQuality;
  candidates: MetricCandidate[];
};

function parseNumber(
  value: string,
): number | null {
  const cleaned =
    value
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
  const normalized =
    value
      .replace(/,/g, "")
      .trim()
      .toUpperCase();

  const match =
    normalized.match(
      /^([+-]?\d+(?:\.\d+)?)\s*([TBMK])?$/,
    );

  if (!match?.[1]) {
    return null;
  }

  const base = Number(match[1]);

  if (!Number.isFinite(base)) {
    return null;
  }

  switch (match[2]) {
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

function detectSession(
  text: string,
):
  | "regular"
  | "after_hours"
  | "pre_market"
  | "intraday"
  | "unknown" {
  if (
    /after[- ]hours|post[- ]market/i.test(
      text,
    )
  ) {
    return "after_hours";
  }

  if (
    /pre[- ]market|premarket|pre market/i.test(
      text,
    )
  ) {
    return "pre_market";
  }

  if (
    /intraday|during the trading session|today's range|today range/i.test(
      text,
    )
  ) {
    return "intraday";
  }

  if (
    /at close|closed|closing price|previous close|regular session/i.test(
      text,
    )
  ) {
    return "regular";
  }

  return "unknown";
}

function addCandidate(
  candidates: MetricCandidate[],
  field: MarketFieldName,
  value: number | null,
  evidence: MarketEvidence,
  text: string,
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
    source:
      evidence.hostname,
    confidence:
      Math.max(
        0,
        Math.min(
          1,
          evidence.confidence,
        ),
      ),
    retrievedAt:
      evidence.retrievedAt,
    session:
      detectSession(text),
  });
}

function extractCandidatesFromEvidence(
  evidence: MarketEvidence,
): MetricCandidate[] {
  const text =
    `${evidence.title} ${evidence.snippet}`;

  const candidates: MetricCandidate[] =
    [];

  const add = (
    field: MarketFieldName,
    value: number | null,
  ) =>
    addCandidate(
      candidates,
      field,
      value,
      evidence,
      text,
    );

  /*
   * Regular/current price.
   *
   * After-hours and pre-market prices
   * are intentionally handled separately.
   */
  const pricePatterns: RegExp[] = [
    /\b(?:current price|share price|stock price|last price|price today)\b[^$£€\d]{0,35}(?:USD|HKD|CNY|\$|HK\$|¥)?\s*([\d,.]+)/i,

    /\b(?:valued at|trading at)\b[^$£€\d]{0,20}(?:USD|HKD|CNY|\$|HK\$|¥)?\s*([\d,.]+)/i,

    /(?:价格|股价)\s*(?:为|是|:)?\s*(?:USD|HKD|CNY|\$|HK\$|¥)?\s*([\d,.]+)/i,
  ];

  for (const pattern of pricePatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      add(
        "price",
        parseNumber(match[1]),
      );
      break;
    }
  }

  /*
   * After-hours price.
   */
  const afterHoursPatterns: RegExp[] = [
    /after[- ]hours[^$0-9]{0,30}(?:USD|HKD|CNY|\$|HK\$|¥)?\s*([\d,.]+)/i,

    /post[- ]market[^$0-9]{0,30}(?:USD|HKD|CNY|\$|HK\$|¥)?\s*([\d,.]+)/i,
  ];

  for (const pattern of afterHoursPatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      add(
        "afterHoursPrice",
        parseNumber(match[1]),
      );
      break;
    }
  }

  /*
   * Pre-market price.
   */
  const preMarketPatterns: RegExp[] = [
    /pre[- ]market[^$0-9]{0,30}(?:USD|HKD|CNY|\$|HK\$|¥)?\s*([\d,.]+)/i,

    /premarket[^$0-9]{0,30}(?:USD|HKD|CNY|\$|HK\$|¥)?\s*([\d,.]+)/i,
  ];

  for (const pattern of preMarketPatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      add(
        "preMarketPrice",
        parseNumber(match[1]),
      );
      break;
    }
  }

  /*
   * Previous close.
   */
  const previousClosePatterns: RegExp[] = [
    /\bprevious close\b[^0-9]{0,20}([\d,.]+)/i,

    /\blast close\b[^0-9]{0,20}([\d,.]+)/i,
  ];

  for (const pattern of previousClosePatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      add(
        "previousClose",
        parseNumber(match[1]),
      );
      break;
    }
  }

  /*
   * Open.
   */
  const openPatterns: RegExp[] = [
    /\bopen(?:ing price)?\b[^0-9]{0,15}([\d,.]+)/i,
  ];

  for (const pattern of openPatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      add(
        "open",
        parseNumber(match[1]),
      );
      break;
    }
  }

  /*
   * High.
   */
  const highPatterns: RegExp[] = [
    /\bhigh today\b[^0-9]{0,15}([\d,.]+)/i,

    /\bdaily high\b[^0-9]{0,15}([\d,.]+)/i,

    /\bhigh price\b[^0-9]{0,15}([\d,.]+)/i,
  ];

  for (const pattern of highPatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      add(
        "high",
        parseNumber(match[1]),
      );
      break;
    }
  }

  /*
   * Low.
   */
  const lowPatterns: RegExp[] = [
    /\blow today\b[^0-9]{0,15}([\d,.]+)/i,

    /\bdaily low\b[^0-9]{0,15}([\d,.]+)/i,

    /\blow price\b[^0-9]{0,15}([\d,.]+)/i,
  ];

  for (const pattern of lowPatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      add(
        "low",
        parseNumber(match[1]),
      );
      break;
    }
  }

  /*
   * Volume.
   */
  const volumePatterns: RegExp[] = [
    /\bvolume\b[^0-9]{0,15}([\d,.]+\s*[TBMK]?)/i,
  ];

  for (const pattern of volumePatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      add(
        "volume",
        parseScaledNumber(match[1]),
      );
      break;
    }
  }

  /*
   * P/E
   *
   * Word boundaries are mandatory.
   * This prevents "open price" from
   * being interpreted as "PE".
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
      add(
        "pe",
        parseNumber(match[1]),
      );
      break;
    }
  }

  /*
   * P/B.
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
      add(
        "pb",
        parseNumber(match[1]),
      );
      break;
    }
  }

  /*
   * EPS.
   */
  const epsPatterns: RegExp[] = [
    /\bEPS\b[^0-9+-]{0,25}([+-]?[\d.]+)/i,

    /\bearnings per share\b[^0-9+-]{0,25}([+-]?[\d.]+)/i,

    /\b每股收益\b[^0-9+-]{0,25}([+-]?[\d.]+)/i,
  ];

  for (const pattern of epsPatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      add(
        "eps",
        parseNumber(match[1]),
      );
      break;
    }
  }

  /*
   * Market cap.
   */
  const marketCapPatterns: RegExp[] = [
    /\bmarket capitalization\b[^0-9]{0,20}([\d,.]+\s*[TBMK]?)/i,

    /\bmarket cap\b[^0-9]{0,20}([\d,.]+\s*[TBMK]?)/i,

    /\b市值\b[^0-9]{0,20}([\d,.]+\s*[TBMK]?)/i,
  ];

  for (const pattern of marketCapPatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      add(
        "marketCap",
        parseScaledNumber(match[1]),
      );
      break;
    }
  }

  /*
   * Revenue.
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
      add(
        "revenue",
        parseScaledNumber(match[1]),
      );
      break;
    }
  }

  /*
   * Revenue growth.
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
      add(
        "revenueGrowth",
        parseNumber(match[1]),
      );
      break;
    }
  }

  /*
   * Current daily change only.
   *
   * Explicitly rejects:
   * - 1-Year Change
   * - 52-Week Change
   * - YTD
   * - multi-year return
   */
  const changePatterns: RegExp[] = [
    /\b(?:today|today's|daily|1D|1-day)\b[^%]{0,45}([+-]?[\d.]+)%/i,

    /\b(?:daily change|day change|change today)\b[^%]{0,25}([+-]?[\d.]+)%/i,

    /(?:涨跌|日涨跌|今日涨跌|涨幅|跌幅)\s*(?:为|:)?\s*([+-]?[\d.]+)%/i,
  ];

  for (const pattern of changePatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      add(
        "changePercent",
        parseNumber(match[1]),
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
  candidates: MetricCandidate[],
): ResolvedMetric {
  if (candidates.length === 0) {
    return {
      value: null,
      quality: "missing",
      candidates: [],
    };
  }

  const clusters:
    MetricCandidate[][] = [];

  for (const candidate of candidates) {
    let target:
      | MetricCandidate[]
      | null = null;

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
      clusters.push([
        candidate,
      ]);
    }
  }

  clusters.sort(
    (a, b) => {
      const scoreA =
        a.reduce(
          (sum, item) =>
            sum +
            item.confidence,
          0,
        );

      const scoreB =
        b.reduce(
          (sum, item) =>
            sum +
            item.confidence,
          0,
        );

      return scoreB - scoreA;
    },
  );

  const winner =
    clusters[0] ?? [];

  const totalWeight =
    winner.reduce(
      (sum, item) =>
        sum +
        Math.max(
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
      quality:
        "corroborated-with-conflict",
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
  const candidates =
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
      byField[
        candidate.field
      ] ?? [];

    current.push(candidate);

    byField[
      candidate.field
    ] = current;
  }

  const fields:
    MarketFieldName[] = [
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
      "afterHoursPrice",
      "preMarketPrice",
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
        byField[field] ?? [],
      );
  }

  const fieldQuality:
    Partial<
      Record<
        MarketFieldName,
        MarketFieldQuality
      >
    > = {};

  for (const field of fields) {
    fieldQuality[field] =
      resolved[field]?.quality ??
      "missing";
  }

  const latestEvidence =
    evidence.length > 0
      ? new Date(
          Math.max(
            ...evidence.map(
              (item) =>
                item.retrievedAt,
            ),
          ),
        ).toISOString()
      : null;

  const snapshot: MarketSnapshot =
    {
      price:
        resolved.price?.value ??
        null,

      previousClose:
        resolved.previousClose?.value ??
        null,

      changePercent:
        resolved.changePercent?.value ??
        null,

      open:
        resolved.open?.value ??
        null,

      high:
        resolved.high?.value ??
        null,

      low:
        resolved.low?.value ??
        null,

      volume:
        resolved.volume?.value ??
        null,

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

      afterHoursPrice:
        resolved.afterHoursPrice?.value ??
        null,

      preMarketPrice:
        resolved.preMarketPrice?.value ??
        null,

      dataQuality:
        resolved.price?.value !== null &&
        resolved.price?.value !== undefined
          ? "web-evidence"
          : "insufficient",

      liveQuoteAvailable:
        false,

      asOf:
        latestEvidence,

      source:
        evidence[0]?.hostname ??
        null,

      dataset:
        null,

      bars: [],

      fieldQuality,
    };

  snapshot.semantic =
    buildSemanticSnapshot(
      snapshot,
      evidence,
    );

  /*
   * C147.2.7 semantic selection.
   *
   * Generic `price` remains the regular/current
   * evidence price. After-hours and pre-market
   * values remain separate semantic fields.
   *
   * Important:
   * MarketSnapshot fields can be optional,
   * therefore a null check alone does not
   * narrow `number | undefined | null`.
   */
  if (
    typeof snapshot.afterHoursPrice ===
    "number"
  ) {
    snapshot.semantic.afterHoursPrice.value =
      snapshot.afterHoursPrice;
  }

  if (
    typeof snapshot.preMarketPrice ===
    "number"
  ) {
    snapshot.semantic.preMarketPrice.value =
      snapshot.preMarketPrice;
  }

  return {
    snapshot,
    fieldCandidates: byField,
  };
}
