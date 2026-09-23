import type {
  MarketDataQuality,
  MarketSnapshot,
} from "./market-types";

export type MarketFreshness =
  | "fresh"
  | "stale"
  | "unknown";

export interface MarketFreshnessAssessment {
  freshness: MarketFreshness;
  ageMinutes: number | null;
  ageHours: number | null;
  referenceTime: string | null;
  reason: string;
}

function qualityThresholdMinutes(
  quality: MarketDataQuality,
): number | null {
  switch (quality) {
    case "live":
      return 15;
    case "delayed":
      return 24 * 60;
    case "historical":
      return 24 * 60;
    case "web-evidence":
      return 24 * 60;
    case "insufficient":
      return null;
    default:
      return null;
  }
}

export function assessMarketFreshness(
  snapshot: MarketSnapshot,
  nowMs = Date.now(),
): MarketFreshnessAssessment {
  if (!snapshot.asOf) {
    return {
      freshness: "unknown",
      ageMinutes: null,
      ageHours: null,
      referenceTime: null,
      reason:
        "No timestamp is available for the market snapshot.",
    };
  }

  const referenceMs =
    new Date(snapshot.asOf).getTime();

  if (!Number.isFinite(referenceMs)) {
    return {
      freshness: "unknown",
      ageMinutes: null,
      ageHours: null,
      referenceTime: snapshot.asOf,
      reason:
        "The market snapshot timestamp is invalid.",
    };
  }

  const ageMs = Math.max(
    0,
    nowMs - referenceMs,
  );

  const ageMinutes =
    ageMs / 1000 / 60;

  const ageHours =
    ageMinutes / 60;

  const threshold =
    qualityThresholdMinutes(
      snapshot.dataQuality,
    );

  if (threshold === null) {
    return {
      freshness: "unknown",
      ageMinutes,
      ageHours,
      referenceTime: snapshot.asOf,
      reason:
        "The current data quality does not support a reliable freshness classification.",
    };
  }

  if (ageMinutes <= threshold) {
    return {
      freshness: "fresh",
      ageMinutes,
      ageHours,
      referenceTime: snapshot.asOf,
      reason:
        `${snapshot.dataQuality} data is within the configured freshness window.`,
    };
  }

  return {
    freshness: "stale",
    ageMinutes,
    ageHours,
    referenceTime: snapshot.asOf,
    reason:
      `${snapshot.dataQuality} data is older than the configured freshness window.`,
  };
}

export function buildMarketDataQualitySummary(
  snapshot: MarketSnapshot,
): {
  dataQuality: MarketDataQuality;
  liveQuoteAvailable: boolean;
  quoteQuality: MarketDataQuality;
  historicalQuality: MarketDataQuality;
  freshness: MarketFreshness;
  ageMinutes: number | null;
  ageHours: number | null;
  asOf: string | null;
  source: string | null;
  dataset: string | null;
} {
  const freshness =
    assessMarketFreshness(snapshot);

  return {
    dataQuality:
      snapshot.dataQuality,

    liveQuoteAvailable:
      snapshot.liveQuoteAvailable,

    quoteQuality:
      snapshot.quoteQuality ??
      snapshot.dataQuality,

    historicalQuality:
      snapshot.historicalQuality ??
      snapshot.dataQuality,

    freshness:
      freshness.freshness,

    ageMinutes:
      freshness.ageMinutes,

    ageHours:
      freshness.ageHours,

    asOf:
      snapshot.asOf ?? null,

    source:
      snapshot.source ?? null,

    dataset:
      snapshot.dataset ?? null,
  };
}

/*
 * Safety invariant:
 * web evidence can never claim a live quote.
 */
export function assertMarketQualityIntegrity(
  snapshot: MarketSnapshot,
): void {
  if (
    snapshot.dataQuality ===
      "web-evidence" &&
    snapshot.liveQuoteAvailable
  ) {
    throw new Error(
      "Market quality integrity violation: web-evidence cannot claim liveQuoteAvailable=true.",
    );
  }

  if (
    snapshot.quoteQuality ===
      "live" &&
    !snapshot.liveQuoteAvailable
  ) {
    throw new Error(
      "Market quality integrity violation: quoteQuality=live requires liveQuoteAvailable=true.",
    );
  }
}
