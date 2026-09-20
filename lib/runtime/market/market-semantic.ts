import type {
  MarketEvidence,
  MarketFieldName,
  MarketFieldQuality,
  MarketPeriod,
  MarketSemanticSnapshot,
  MarketSemanticValue,
  MarketTradingSession,
} from "./market-types";

function emptyValue(
  unit:
    | MarketSemanticValue["unit"] = "unknown",
  period: MarketPeriod = "unknown",
): MarketSemanticValue {
  return {
    value: null,
    unit,
    currency: null,
    session: "unknown",
    period,
    timestamp: null,
    source: null,
    quality: "missing",
  };
}

function currencyFromText(
  text: string,
): "USD" | "HKD" | "CNY" | null {
  if (
    /\bUSD\b|\$/i.test(text)
  ) {
    return "USD";
  }

  if (
    /\bHKD\b|HK\$/i.test(text)
  ) {
    return "HKD";
  }

  if (
    /\bCNY\b|RMB|人民币|¥/i.test(text)
  ) {
    return "CNY";
  }

  return null;
}

function detectSession(
  text: string,
): MarketTradingSession {
  if (
    /after[- ]hours|after hours|post[- ]market/i.test(
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
    /at close|closed|closing price|last close|previous close|regular session/i.test(
      text,
    )
  ) {
    return "regular";
  }

  return "unknown";
}

function detectPeriod(
  text: string,
): MarketPeriod {
  if (
    /ttm|trailing twelve months/i.test(
      text,
    )
  ) {
    return "ttm";
  }

  if (
    /quarter|quarterly/i.test(
      text,
    )
  ) {
    return "quarterly";
  }

  if (
    /annual|fiscal year|yearly/i.test(
      text,
    )
  ) {
    return "annual";
  }

  if (
    /ytd|year to date/i.test(
      text,
    )
  ) {
    return "ytd";
  }

  if (
    /1-year|one year|1 year/i.test(
      text,
    )
  ) {
    return "one_year";
  }

  if (
    /3-year|three year|5-year|five year/i.test(
      text,
    )
  ) {
    return "multi_year";
  }

  if (
    /today|daily|1D|intraday/i.test(
      text,
    )
  ) {
    return "intraday";
  }

  return "unknown";
}

function semanticValue(
  value: number | null,
  unit: MarketSemanticValue["unit"],
  evidence: MarketEvidence | undefined,
  quality: MarketFieldQuality,
  text: string,
): MarketSemanticValue {
  return {
    value,
    unit,
    currency:
      evidence
        ? currencyFromText(
            text,
          )
        : null,
    session:
      detectSession(text),
    period:
      detectPeriod(text),
    timestamp:
      evidence
        ? new Date(
            evidence.retrievedAt,
          ).toISOString()
        : null,
    source:
      evidence?.hostname ?? null,
    quality,
  };
}

export function buildEmptySemanticSnapshot(): MarketSemanticSnapshot {
  return {
    price:
      emptyValue("price"),

    previousClose:
      emptyValue("price"),

    changePercent:
      emptyValue("percent"),

    open:
      emptyValue("price"),

    high:
      emptyValue("price"),

    low:
      emptyValue("price"),

    volume:
      emptyValue("shares"),

    afterHoursPrice:
      emptyValue("price"),

    preMarketPrice:
      emptyValue("price"),

    marketCap:
      emptyValue("currency", "ttm"),

    pe:
      emptyValue("multiple", "ttm"),

    pb:
      emptyValue("multiple", "ttm"),

    eps:
      emptyValue("currency", "ttm"),

    revenue:
      emptyValue("currency", "ttm"),

    revenueGrowth:
      emptyValue("percent", "ttm"),

    regularSessionPrice:
      emptyValue("price"),
  };
}

function findEvidenceForField(
  evidence: MarketEvidence[],
  patterns: RegExp[],
): MarketEvidence | undefined {
  return evidence.find(
    (item) => {
      const text =
        `${item.title} ${item.snippet}`;

      return patterns.some(
        (pattern) =>
          pattern.test(text),
      );
    },
  );
}

function findNumberAfterPattern(
  text: string,
  patterns: RegExp[],
): number | null {
  for (const pattern of patterns) {
    const match =
      text.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    const normalized =
      match[1]
        .replace(/,/g, "")
        .trim();

    const value =
      Number(normalized);

    if (
      Number.isFinite(value)
    ) {
      return value;
    }
  }

  return null;
}

export function buildSemanticSnapshot(
  snapshot: {
    price?: number | null;
    previousClose?: number | null;
    changePercent?: number | null;
    open?: number | null;
    high?: number | null;
    low?: number | null;
    volume?: number | null;
    marketCap?: number | null;
    pe?: number | null;
    pb?: number | null;
    eps?: number | null;
    revenue?: number | null;
    revenueGrowth?: number | null;
    afterHoursPrice?: number | null;
    preMarketPrice?: number | null;
  },
  evidence: MarketEvidence[],
): MarketSemanticSnapshot {
  const semantic =
    buildEmptySemanticSnapshot();

  const priceEvidence =
    findEvidenceForField(
      evidence,
      [
        /\bcurrent price\b/i,
        /\bstock price\b/i,
        /\bshare price\b/i,
        /\btrading at\b/i,
      ],
    );

  const priceText =
    priceEvidence
      ? `${priceEvidence.title} ${priceEvidence.snippet}`
      : "";

  semantic.price =
    semanticValue(
      snapshot.price ?? null,
      "price",
      priceEvidence,
      snapshot.price !== null &&
        snapshot.price !== undefined
        ? "corroborated"
        : "missing",
      priceText,
    );

  semantic.regularSessionPrice =
    semanticValue(
      snapshot.price ?? null,
      "price",
      priceEvidence,
      snapshot.price !== null &&
        snapshot.price !== undefined
        ? "corroborated"
        : "missing",
      priceText,
    );

  const previousEvidence =
    findEvidenceForField(
      evidence,
      [
        /\bprevious close\b/i,
        /\blast close\b/i,
      ],
    );

  if (
    previousEvidence
  ) {
    const text =
      `${previousEvidence.title} ${previousEvidence.snippet}`;

    const value =
      snapshot.previousClose ??
      findNumberAfterPattern(
        text,
        [
          /\bprevious close\b[^0-9]{0,20}([\d,.]+)/i,
          /\blast close\b[^0-9]{0,20}([\d,.]+)/i,
        ],
      );

    semantic.previousClose =
      semanticValue(
        value,
        "price",
        previousEvidence,
        value !== null
          ? "single-source"
          : "missing",
        text,
      );
  }

  const afterHoursEvidence =
    findEvidenceForField(
      evidence,
      [
        /after[- ]hours/i,
        /post[- ]market/i,
      ],
    );

  if (
    afterHoursEvidence
  ) {
    const text =
      `${afterHoursEvidence.title} ${afterHoursEvidence.snippet}`;

    const value =
      snapshot.afterHoursPrice ??
      findNumberAfterPattern(
        text,
        [
          /after[- ]hours[^$0-9]{0,30}(?:USD|HKD|CNY|\$|HK\$|¥)?\s*([\d,.]+)/i,
          /post[- ]market[^$0-9]{0,30}(?:USD|HKD|CNY|\$|HK\$|¥)?\s*([\d,.]+)/i,
        ],
      );

    semantic.afterHoursPrice =
      semanticValue(
        value,
        "price",
        afterHoursEvidence,
        value !== null
          ? "single-source"
          : "missing",
        text,
      );
  }

  const preMarketEvidence =
    findEvidenceForField(
      evidence,
      [
        /pre[- ]market/i,
        /premarket/i,
      ],
    );

  if (
    preMarketEvidence
  ) {
    const text =
      `${preMarketEvidence.title} ${preMarketEvidence.snippet}`;

    const value =
      snapshot.preMarketPrice ??
      findNumberAfterPattern(
        text,
        [
          /pre[- ]market[^$0-9]{0,30}(?:USD|HKD|CNY|\$|HK\$|¥)?\s*([\d,.]+)/i,
          /premarket[^$0-9]{0,30}(?:USD|HKD|CNY|\$|HK\$|¥)?\s*([\d,.]+)/i,
        ],
      );

    semantic.preMarketPrice =
      semanticValue(
        value,
        "price",
        preMarketEvidence,
        value !== null
          ? "single-source"
          : "missing",
        text,
      );
  }

  const openEvidence =
    findEvidenceForField(
      evidence,
      [
        /\bopen\b[^.]{0,30}\d/i,
        /\bopening price\b/i,
      ],
    );

  if (
    openEvidence
  ) {
    const text =
      `${openEvidence.title} ${openEvidence.snippet}`;

    const value =
      snapshot.open ??
      findNumberAfterPattern(
        text,
        [
          /\bopen(?:ing price)?\b[^0-9]{0,15}([\d,.]+)/i,
        ],
      );

    semantic.open =
      semanticValue(
        value,
        "price",
        openEvidence,
        value !== null
          ? "single-source"
          : "missing",
        text,
      );
  }

  const highEvidence =
    findEvidenceForField(
      evidence,
      [
        /\bhigh today\b/i,
        /\bdaily high\b/i,
        /\bhigh price\b/i,
      ],
    );

  if (
    highEvidence
  ) {
    const text =
      `${highEvidence.title} ${highEvidence.snippet}`;

    const value =
      snapshot.high ??
      findNumberAfterPattern(
        text,
        [
          /\bhigh today\b[^0-9]{0,15}([\d,.]+)/i,
          /\bdaily high\b[^0-9]{0,15}([\d,.]+)/i,
          /\bhigh price\b[^0-9]{0,15}([\d,.]+)/i,
        ],
      );

    semantic.high =
      semanticValue(
        value,
        "price",
        highEvidence,
        value !== null
          ? "single-source"
          : "missing",
        text,
      );
  }

  const lowEvidence =
    findEvidenceForField(
      evidence,
      [
        /\blow today\b/i,
        /\bdaily low\b/i,
        /\blow price\b/i,
      ],
    );

  if (
    lowEvidence
  ) {
    const text =
      `${lowEvidence.title} ${lowEvidence.snippet}`;

    const value =
      snapshot.low ??
      findNumberAfterPattern(
        text,
        [
          /\blow today\b[^0-9]{0,15}([\d,.]+)/i,
          /\bdaily low\b[^0-9]{0,15}([\d,.]+)/i,
          /\blow price\b[^0-9]{0,15}([\d,.]+)/i,
        ],
      );

    semantic.low =
      semanticValue(
        value,
        "price",
        lowEvidence,
        value !== null
          ? "single-source"
          : "missing",
        text,
      );
  }

  const volumeEvidence =
    findEvidenceForField(
      evidence,
      [
        /\bvolume\b[^.]{0,30}\d/i,
      ],
    );

  if (
    volumeEvidence
  ) {
    const text =
      `${volumeEvidence.title} ${volumeEvidence.snippet}`;

    const value =
      snapshot.volume ??
      findNumberAfterPattern(
        text,
        [
          /\bvolume\b[^0-9]{0,15}([\d,.]+)/i,
        ],
      );

    semantic.volume =
      semanticValue(
        value,
        "shares",
        volumeEvidence,
        value !== null
          ? "single-source"
          : "missing",
        text,
      );
  }

  const changeEvidence =
    findEvidenceForField(
      evidence,
      [
        /\btoday\b[^%]{0,40}[+-]?[\d.]+%/i,
        /\bdaily change\b/i,
        /\bday change\b/i,
      ],
    );

  if (
    changeEvidence &&
    snapshot.changePercent !== null &&
    snapshot.changePercent !== undefined
  ) {
    const text =
      `${changeEvidence.title} ${changeEvidence.snippet}`;

    semantic.changePercent =
      semanticValue(
        snapshot.changePercent,
        "percent",
        changeEvidence,
        "single-source",
        text,
      );
  }

  const metricEvidence = (
    field: MarketFieldName,
    patterns: RegExp[],
  ) =>
    findEvidenceForField(
      evidence,
      patterns,
    );

  const marketCapEvidence =
    metricEvidence(
      "marketCap",
      [
        /\bmarket cap\b/i,
        /\bmarket capitalization\b/i,
      ],
    );

  if (
    marketCapEvidence
  ) {
    semantic.marketCap =
      semanticValue(
        snapshot.marketCap ?? null,
        "currency",
        marketCapEvidence,
        "single-source",
        `${marketCapEvidence.title} ${marketCapEvidence.snippet}`,
      );
  }

  const peEvidence =
    metricEvidence(
      "pe",
      [
        /\bP\/E\b/i,
        /\bPE ratio\b/i,
        /\bprice[- ]to[- ]earnings\b/i,
      ],
    );

  if (
    peEvidence
  ) {
    semantic.pe =
      semanticValue(
        snapshot.pe ?? null,
        "multiple",
        peEvidence,
        "single-source",
        `${peEvidence.title} ${peEvidence.snippet}`,
      );
  }

  const pbEvidence =
    metricEvidence(
      "pb",
      [
        /\bP\/B\b/i,
        /\bPB ratio\b/i,
        /\bprice[- ]to[- ]book\b/i,
      ],
    );

  if (
    pbEvidence
  ) {
    semantic.pb =
      semanticValue(
        snapshot.pb ?? null,
        "multiple",
        pbEvidence,
        "single-source",
        `${pbEvidence.title} ${pbEvidence.snippet}`,
      );
  }

  const epsEvidence =
    metricEvidence(
      "eps",
      [
        /\bEPS\b/i,
        /\bearnings per share\b/i,
      ],
    );

  if (
    epsEvidence
  ) {
    semantic.eps =
      semanticValue(
        snapshot.eps ?? null,
        "currency",
        epsEvidence,
        "single-source",
        `${epsEvidence.title} ${epsEvidence.snippet}`,
      );
  }

  const revenueEvidence =
    metricEvidence(
      "revenue",
      [
        /\brevenue\b/i,
        /\bannual sales\b/i,
      ],
    );

  if (
    revenueEvidence
  ) {
    semantic.revenue =
      semanticValue(
        snapshot.revenue ?? null,
        "currency",
        revenueEvidence,
        "single-source",
        `${revenueEvidence.title} ${revenueEvidence.snippet}`,
      );
  }

  const revenueGrowthEvidence =
    metricEvidence(
      "revenueGrowth",
      [
        /\brevenue growth\b/i,
        /\bsales growth\b/i,
      ],
    );

  if (
    revenueGrowthEvidence
  ) {
    semantic.revenueGrowth =
      semanticValue(
        snapshot.revenueGrowth ?? null,
        "percent",
        revenueGrowthEvidence,
        "single-source",
        `${revenueGrowthEvidence.title} ${revenueGrowthEvidence.snippet}`,
      );
  }

  return semantic;
}
