import {
  analyzeMarketRequest,
} from "./market-router";

import type {
  MarketAnalysisResult,
} from "./market-types";

import type {
  MarketSelectionCandidateInput,
  MarketSelectionCandidateResult,
  MarketSelectionRequest,
  MarketSelectionResult,
  MarketSelectionScoreBreakdown,
} from "./selection-types";

function clamp(
  value: number,
  min = 0,
  max = 100,
): number {
  return Math.max(
    min,
    Math.min(max, value),
  );
}

function round(
  value: number,
): number {
  return Math.round(value * 10) / 10;
}

function containsIndustry(
  industry: string,
  result: MarketAnalysisResult,
): boolean {
  const target =
    industry.trim().toLowerCase();

  if (!target) {
    return false;
  }

  const haystack = [
    result.analysis.industry.summary,
    result.analysis.industry.evidence.join(" "),
    ...result.evidence.map(
      (item) =>
        `${item.title} ${item.snippet}`,
    ),
  ]
    .join(" ")
    .toLowerCase();

  const tokens =
    target
      .split(/[^a-z0-9\u4e00-\u9fff]+/i)
      .map((item) => item.trim())
      .filter(
        (item) => item.length >= 2,
      );

  if (tokens.length === 0) {
    return haystack.includes(target);
  }

  return tokens.some(
    (token) =>
      haystack.includes(token),
  );
}

function scoreCandidate(
  industry: string,
  result: MarketAnalysisResult,
): MarketSelectionScoreBreakdown {
  const evidenceCount =
    result.evidence.length;

  const independentDomains =
    result.verification.independentDomains;

  const industryFit =
    containsIndustry(
      industry,
      result,
    )
      ? 10
      : 0;

  const evidenceQuality =
    clamp(
      Math.min(
        10,
        evidenceCount * 2,
      ) +
        Math.min(
          10,
          independentDomains * 2,
        ) +
        (result.verification.primarySourceFound
          ? 5
          : 0),
      0,
      25,
    );

  const fundamentals =
    result.analysis.fundamentals
      .signals.length;

  const fundamentalsCoverage =
    clamp(
      Math.min(
        20,
        fundamentals * 5,
      ) +
        (result.snapshot.eps !== null &&
        result.snapshot.eps !== undefined
          ? 3
          : 0) +
        (result.snapshot.revenue !== null &&
        result.snapshot.revenue !== undefined
          ? 2
          : 0),
      0,
      25,
    );

  const valuationSignalCount =
    result.analysis.valuation
      .signals.length;

  const valuationCoverage =
    clamp(
      Math.min(
        12,
        valuationSignalCount * 4,
      ) +
        (result.snapshot.pe !== null &&
        result.snapshot.pe !== undefined
          ? 4
          : 0) +
        (result.snapshot.pb !== null &&
        result.snapshot.pb !== undefined
          ? 4
          : 0),
      0,
      20,
    );

  const riskCount =
    result.analysis.risk.factors.length;

  const riskTransparency =
    clamp(
      20 -
        Math.min(
          20,
          riskCount * 4,
        ),
      0,
      20,
    );

  const dataReadiness =
    result.verification.structuredDataVerified
      ? 10
      : result.verification.structuredDataAvailable
        ? 5
        : result.evidence.length >= 3
          ? 4
          : 0;

  const total =
    round(
      industryFit +
        evidenceQuality +
        fundamentalsCoverage +
        valuationCoverage +
        riskTransparency +
        dataReadiness,
    );

  return {
    industryFit,
    evidenceQuality,
    fundamentalsCoverage,
    valuationCoverage,
    riskTransparency,
    dataReadiness,
    total,
  };
}

function classify(
  result: MarketAnalysisResult,
): MarketSelectionCandidateResult["researchStatus"] {
  if (
    result.evidence.length < 2 &&
    !result.verification.structuredDataVerified
  ) {
    return "insufficient";
  }

  if (
    result.verification.structuredDataVerified ||
    result.evidence.length >= 3
  ) {
    return "research-ready";
  }

  return "evidence-limited";
}

async function evaluateCandidate(
  industry: string,
  input: MarketSelectionCandidateInput,
  query?: string | null,
): Promise<MarketSelectionCandidateResult> {
  const result =
    await analyzeMarketRequest({
      symbol: input.symbol,
      market: input.market,
      mode: "full",
      query: [
        industry,
        query ?? "",
        "industry company fundamentals valuation risk",
      ]
        .filter(Boolean)
        .join(" "),
    });

  const score =
    scoreCandidate(
      industry,
      result,
    );

  const providerRecord =
    result.provider as {
      provider?: string;
      marketCapabilities?: Record<
        string,
        {
          providerHealth?: string;
        }
      >;
    };

  const providerHealth =
    providerRecord.marketCapabilities
      ? providerRecord.marketCapabilities[
          result.instrument.market
        ]?.providerHealth ?? null
      : null;

  return {
    rank: 0,
    input,
    normalizedSymbol:
      result.instrument.normalizedSymbol,
    score,
    researchStatus:
      classify(result),
    liveDataVerified:
      result.verification.structuredDataVerified &&
      result.snapshot.liveQuoteAvailable === true,
    historicalDataVerified:
      result.snapshot.historicalQuality ===
        "historical" &&
      Boolean(
        result.snapshot.bars &&
        result.snapshot.bars.length > 0,
      ),
    provider:
      result.provider.provider,
    providerHealth,
    evidenceCount:
      result.verification.sourceCount,
    independentDomains:
      result.verification.independentDomains,
    industry:
      result.analysis.industry.summary,
    strengths:
      result.analysis.company.strengths,
    risks:
      result.analysis.risk.factors,
    valuationSignals:
      result.analysis.valuation.signals,
    fundamentalSignals:
      result.analysis.fundamentals.signals,
    resultCode:
      result.code,
    sourceResult:
      result,
  };
}

export async function selectMarketCandidates(
  request: MarketSelectionRequest,
): Promise<MarketSelectionResult> {
  const industry =
    request.industry.trim();

  if (!industry) {
    throw new Error(
      "industry is required.",
    );
  }

  const maxCandidates =
    Math.max(
      1,
      Math.min(
        request.maxCandidates ?? 8,
        12,
      ),
    );

  const uniqueCandidates =
    Array.from(
      new Map(
        request.candidates
          .map((candidate) => [
            `${candidate.market ?? "auto"}:${candidate.symbol
              .trim()
              .toUpperCase()}`,
            {
              ...candidate,
              symbol:
                candidate.symbol
                  .trim()
                  .toUpperCase(),
            },
          ]),
      ).values(),
    ).slice(0, maxCandidates);

  if (uniqueCandidates.length === 0) {
    throw new Error(
      "At least one candidate is required.",
    );
  }

  const evaluated: MarketSelectionCandidateResult[] =
    [];

  for (const candidate of uniqueCandidates) {
    try {
      evaluated.push(
        await evaluateCandidate(
          industry,
          candidate,
          request.query,
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Candidate evaluation failed.";

      evaluated.push({
        rank: 0,
        input: candidate,
        normalizedSymbol:
          candidate.symbol,
        score: {
          industryFit: 0,
          evidenceQuality: 0,
          fundamentalsCoverage: 0,
          valuationCoverage: 0,
          riskTransparency: 0,
          dataReadiness: 0,
          total: 0,
        },
        researchStatus:
          "insufficient",
        liveDataVerified:
          false,
        historicalDataVerified:
          false,
        provider:
          "unavailable",
        providerHealth:
          null,
        evidenceCount: 0,
        independentDomains: 0,
        industry:
          "Candidate evaluation failed.",
        strengths: [],
        risks: [message],
        valuationSignals: [],
        fundamentalSignals: [],
        resultCode:
          "C148_1_CANDIDATE_EVALUATION_ERROR",
        sourceResult:
          {
            success: false,
            code:
              "C147_2_MARKET_EVIDENCE_INSUFFICIENT",
            instrument: {
              symbol:
                candidate.symbol,
              normalizedSymbol:
                candidate.symbol,
              market:
                candidate.market ?? "us",
              exchange:
                "UNKNOWN",
              currency:
                candidate.market === "hk"
                  ? "HKD"
                  : candidate.market === "cn"
                    ? "CNY"
                    : "USD",
            },
            snapshot: {
              dataQuality:
                "insufficient",
              liveQuoteAvailable:
                false,
            },
            analysis: {
              industry: {
                summary:
                  "Candidate evaluation failed.",
                evidence: [],
              },
              company: {
                summary:
                  message,
                strengths: [],
                risks: [message],
              },
              fundamentals: {
                assessment:
                  "Unavailable.",
                signals: [],
              },
              valuation: {
                assessment:
                  "Unavailable.",
                signals: [],
              },
              trend: {
                assessment:
                  "Unavailable.",
                signals: [],
              },
              risk: {
                level:
                  "unknown",
                factors: [message],
              },
              decisionSupport: {
                currentState:
                  "Unavailable.",
                supportingFactors: [],
                invalidationConditions: [],
                watchMetrics: [],
                scenarios: [],
              },
            },
            evidence: [],
            verification: {
              verified: false,
              sourceCount: 0,
              independentDomains: 0,
              primarySourceFound: false,
              structuredDataAvailable: false,
              structuredDataVerified: false,
              freshness: {
                freshness:
                  "unknown",
                ageMinutes: null,
                ageHours: null,
                referenceTime: null,
                reason:
                  "Candidate evaluation failed.",
              },
            },
            provider: {
              provider:
                "unavailable",
              configured: false,
              available: false,
              supportsQuote: false,
              supportsHistorical: false,
              supportsFundamentals: false,
              supportsMarkets: [],
            },
            metadata: {
              runtime:
                "aios-alpha",
              stage:
                "C147.2.7",
              analysisMode:
                "full",
              generatedAt:
                new Date().toISOString(),
              disclaimer:
                "Research-only candidate evaluation.",
            },
            error: message,
          },
      });
    }
  }

  evaluated.sort(
    (a, b) =>
      b.score.total -
      a.score.total,
  );

  evaluated.forEach(
    (candidate, index) => {
      candidate.rank =
        index + 1;
    },
  );

  const liveVerified =
    evaluated.length > 0 &&
    evaluated.every(
      (candidate) =>
        candidate.liveDataVerified,
    );

  const researchReady =
    evaluated.filter(
      (candidate) =>
        candidate.researchStatus ===
        "research-ready",
    ).length;

  let code:
    | "C148_1_SELECTION_PASS"
    | "C148_1_SELECTION_PARTIAL"
    | "C148_1_SELECTION_INSUFFICIENT";

  if (
    researchReady ===
      evaluated.length &&
    evaluated.length > 0
  ) {
    code =
      "C148_1_SELECTION_PASS";
  } else if (
    researchReady > 0
  ) {
    code =
      "C148_1_SELECTION_PARTIAL";
  } else {
    code =
      "C148_1_SELECTION_INSUFFICIENT";
  }

  return {
    success:
      evaluated.length > 0,
    code,
    stage:
      "C148.1",
    industry,
    requestedCandidates:
      request.candidates.length,
    evaluatedCandidates:
      evaluated.length,
    candidates:
      evaluated,
    researchGate: {
      selectionCompleted:
        evaluated.length > 0,
      liveQuoteRequiredForSelection:
        false,
      liveQuoteVerifiedForAll:
        liveVerified,
      humanReviewRequiredBeforeTrading:
        true,
      tradingExecuted:
        false,
      plannerDispatched:
        false,
    },
    methodology: {
      purpose:
        "Research-stage candidate selection: industry context → company evidence → fundamentals coverage → valuation coverage → risk transparency → data readiness.",
      scoring: [
        "Industry fit: evidence contains signals related to the requested industry.",
        "Evidence quality: evidence breadth, independent-domain breadth, and primary-source presence.",
        "Fundamentals coverage: available operating indicators such as EPS, revenue and fundamental signals.",
        "Valuation coverage: availability of P/E, P/B and valuation evidence; no intrinsic value is calculated in C148.1.",
        "Risk transparency: explicit risk factors reduce the score when material uncertainty is visible.",
        "Data readiness: verified structured data is stronger than evidence-only data.",
      ],
      excludedFromScore: [
        "Predicted future return.",
        "Guaranteed upside or downside.",
        "Automatic buy/sell instruction.",
        "Automated trading execution.",
        "Personalized portfolio suitability.",
      ],
      nextStage:
        "C149",
    },
    generatedAt:
      new Date().toISOString(),
  };
}
