import type {
  MarketAnalysisResult,
} from "./market-types";

export type MarketDecisionSupportQualityGateResult = {
  eligible: boolean;
  reasons: string[];
  dataQuality: string;
  freshness: string;
  sourceCount: number;
  independentDomains: number;
  identityVerified: boolean;
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

export function evaluateMarketDecisionSupportQualityGate(
  analysis: MarketAnalysisResult,
  identityVerified: boolean,
): MarketDecisionSupportQualityGateResult {
  const evidence = Array.isArray(
    analysis.evidence,
  )
    ? analysis.evidence
    : [];

  const sourceCount =
    evidence.length;

  const independentDomains =
    new Set(
      evidence
        .map(
          (item) =>
            item.hostname,
        )
        .filter(Boolean),
    ).size;

  const dataQuality =
    analysis.snapshot?.dataQuality ??
    "insufficient";

  const freshness =
    analysis.verification?.freshness
      ?.freshness ??
    "unknown";

  const reasons: string[] = [];

  if (!identityVerified) {
    reasons.push(
      "Security identity has not been verified against retrieved evidence.",
    );
  }

  if (sourceCount === 0) {
    reasons.push(
      "No retrieved market evidence is available.",
    );
  }

  if (independentDomains === 0) {
    reasons.push(
      "No independent evidence domain is available.",
    );
  }

  if (
    dataQuality ===
    "insufficient"
  ) {
    reasons.push(
      "Market data quality is insufficient for research-candidate promotion.",
    );
  }

  if (
    freshness ===
    "unknown"
  ) {
    reasons.push(
      "Market evidence freshness is unknown.",
    );
  }

  return {
    eligible:
      reasons.length === 0,

    reasons:
      unique(reasons),

    dataQuality,

    freshness,

    sourceCount,

    independentDomains,

    identityVerified,
  };
}
