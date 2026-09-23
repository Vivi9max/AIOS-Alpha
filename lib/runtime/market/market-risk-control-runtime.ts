import {
  analyzeMarketRequest,
} from "./market-router";
import type {
  MarketAnalysisResult,
  MarketRegion,
} from "./market-types";
import type {
  MarketRiskCategory,
  MarketRiskControlRequest,
  MarketRiskControlResult,
  MarketRiskItem,
  MarketRiskSeverity,
} from "./market-risk-control-types";
function unique(
  values: string[],
): string[] {
  return Array.from(
    new Set(
      values.filter(Boolean),
    ),
  );
}
function normalizeSeverity(
  value:
    | string
    | null
    | undefined,
):
  | MarketRiskSeverity {
  if (
    value === "low" ||
    value === "medium" ||
    value === "high"
  ) {
    return value;
  }
  return "unknown";
}
function severityRank(
  value: MarketRiskSeverity,
): number {
  if (value === "high") {
    return 3;
  }
  if (value === "medium") {
    return 2;
  }
  if (value === "low") {
    return 1;
  }
  return 0;
}
function buildRiskId(
  category: MarketRiskCategory,
  symbol: string,
): string {
  return [
    "C147.17",
    category,
    symbol
      .trim()
      .toUpperCase()
      .replace(
        /[^A-Z0-9._-]/g,
        "-",
      ),
  ].join(":");
}
function addRisk(
  risks: MarketRiskItem[],
  risk: MarketRiskItem,
): void {
  const existing =
    risks.find(
      (item) =>
        item.id ===
        risk.id,
    );
  if (!existing) {
    risks.push(risk);
  }
}
function buildEvidenceContext(
  analysis: MarketAnalysisResult,
) {
  const evidence =
    Array.isArray(
      analysis.evidence,
    )
      ? analysis.evidence
      : [];
  const sourceCount =
    evidence.length;
  const independentDomains =
    unique(
      evidence
        .map(
          (item) =>
            item.hostname,
        )
        .filter(Boolean),
    ).length;
  const freshness =
    analysis.verification
      ?.freshness?.freshness ??
    "unknown";
  return {
    evidence,
    sourceCount,
    independentDomains,
    freshness,
  };
}
function buildDataRisks(
  analysis: MarketAnalysisResult,
  symbol: string,
): MarketRiskItem[] {
  const risks:
    MarketRiskItem[] =
    [];
  const context =
    buildEvidenceContext(
      analysis,
    );
  const quality =
    analysis.snapshot
      ?.dataQuality ??
    "insufficient";
  if (
    quality ===
      "insufficient"
  ) {
    addRisk(
      risks,
      {
        id:
          buildRiskId(
            "data",
            symbol,
          ),
        category:
          "data",
        severity:
          "high",
        status:
          "insufficient-evidence",
        title:
          "Market data is insufficient",
        description:
          "The available market dataset is not sufficient to support a complete risk assessment.",
        evidence: [
          `dataQuality=${quality}`,
        ],
        sourceCount:
          context.sourceCount,
        independentDomains:
          context.independentDomains,
        freshness:
          context.freshness,
        invalidationCondition:
          "Obtain sufficient verified market and fundamental data before relying on the current assessment.",
        humanReviewRequired:
          true,
      },
    );
  }
  if (
    context.freshness ===
    "stale"
  ) {
    addRisk(
      risks,
      {
        id:
          buildRiskId(
            "data",
            `${symbol}-stale`,
          ),
        category:
          "data",
        severity:
          "medium",
        status:
          "requires-reassessment",
        title:
          "Market evidence is stale",
        description:
          "The retrieved evidence is older than the runtime freshness threshold and should not be treated as current market state.",
        evidence: [
          "freshness=stale",
        ],
        sourceCount:
          context.sourceCount,
        independentDomains:
          context.independentDomains,
        freshness:
          context.freshness,
        invalidationCondition:
          "Refresh market data and verify the latest relevant evidence.",
        humanReviewRequired:
          true,
      },
    );
  }
  return risks;
}
function buildFundamentalRisks(
  analysis: MarketAnalysisResult,
  symbol: string,
): MarketRiskItem[] {
  const risks:
    MarketRiskItem[] =
    [];
  const fundamentals =
    analysis.analysis
      ?.fundamentals;
  const revenueGrowth =
    analysis.snapshot
      ?.revenueGrowth;
  const eps =
    analysis.snapshot?.eps;
  const signals =
    Array.isArray(
      fundamentals?.signals,
    )
      ? fundamentals.signals
      : [];
  const assessment =
    fundamentals
      ?.assessment
      ?.trim() ?? "";
  if (
    revenueGrowth !==
      null &&
    revenueGrowth !==
      undefined &&
    Number.isFinite(
      revenueGrowth,
    ) &&
    revenueGrowth < 0
  ) {
    addRisk(
      risks,
      {
        id:
          buildRiskId(
            "fundamental",
            `${symbol}-revenue-growth`,
          ),
        category:
          "fundamental",
        severity:
          "medium",
        status:
          "identified",
        title:
          "Revenue growth is negative",
        description:
          `Observed revenueGrowth=${revenueGrowth}. Negative growth is treated as a review signal rather than an automatic conclusion.`,
        evidence: [
          `revenueGrowth=${revenueGrowth}`,
          ...signals.slice(
            0,
            3,
          ),
        ],
        sourceCount:
          analysis.evidence.length,
        independentDomains:
          unique(
            analysis.evidence.map(
              (item) =>
                item.hostname,
            ),
          ).length,
        freshness:
          analysis.verification
            ?.freshness
            ?.freshness ??
          "unknown",
        invalidationCondition:
          "Reassess if revenue deterioration persists or management guidance materially changes.",
        humanReviewRequired:
          true,
      },
    );
  }
  if (
    eps !== null &&
    eps !== undefined &&
    Number.isFinite(eps) &&
    eps < 0
  ) {
    addRisk(
      risks,
      {
        id:
          buildRiskId(
            "fundamental",
            `${symbol}-negative-eps`,
          ),
        category:
          "fundamental",
        severity:
          "medium",
        status:
          "identified",
        title:
          "Observed EPS is negative",
        description:
          `Observed eps=${eps}. Negative earnings require explicit review of profitability and the reason for the loss.`,
        evidence: [
          `eps=${eps}`,
          ...signals.slice(
            0,
            3,
          ),
        ],
        sourceCount:
          analysis.evidence.length,
        independentDomains:
          unique(
            analysis.evidence.map(
              (item) =>
                item.hostname,
            ),
          ).length,
        freshness:
          analysis.verification
            ?.freshness
            ?.freshness ??
          "unknown",
        invalidationCondition:
          "Reassess when earnings, guidance or profitability evidence changes materially.",
        humanReviewRequired:
          true,
      },
    );
  }
  if (
    assessment
      .toLowerCase()
      .includes(
        "deterior",
      )
  ) {
    addRisk(
      risks,
      {
        id:
          buildRiskId(
            "fundamental",
            `${symbol}-assessment`,
          ),
        category:
          "fundamental",
        severity:
          "medium",
        status:
          "identified",
        title:
          "Fundamental assessment contains deterioration signal",
        description:
          assessment,
        evidence:
          signals.slice(
            0,
            5,
          ),
        sourceCount:
          analysis.evidence.length,
        independentDomains:
          unique(
            analysis.evidence.map(
              (item) =>
                item.hostname,
            ),
          ).length,
        freshness:
          analysis.verification
            ?.freshness
            ?.freshness ??
          "unknown",
        invalidationCondition:
          "Reassess the fundamental thesis after updated earnings, guidance or operating evidence.",
        humanReviewRequired:
          true,
      },
    );
  }
  return risks;
}
function buildValuationRisks(
  analysis: MarketAnalysisResult,
  symbol: string,
): MarketRiskItem[] {
  const risks:
    MarketRiskItem[] =
    [];
  const valuation =
    analysis.analysis
      ?.valuation;
  const pe =
    analysis.snapshot?.pe;
  const pb =
    analysis.snapshot?.pb;
  const signals =
    Array.isArray(
      valuation?.signals,
    )
      ? valuation.signals
      : [];
  const assessment =
    valuation
      ?.assessment
      ?.trim() ?? "";
  if (
    pe !== null &&
    pe !== undefined &&
    Number.isFinite(pe) &&
    pe > 50
  ) {
    addRisk(
      risks,
      {
        id:
          buildRiskId(
            "valuation",
            `${symbol}-pe`,
          ),
        category:
          "valuation",
        severity:
          "medium",
        status:
          "identified",
        title:
          "Observed P/E is elevated",
        description:
          `Observed PE=${pe}. This is a valuation sensitivity flag, not a conclusion that the security is overvalued.`,
        evidence: [
          `pe=${pe}`,
          ...signals.slice(
            0,
            3,
          ),
        ],
        sourceCount:
          analysis.evidence.length,
        independentDomains:
          unique(
            analysis.evidence.map(
              (item) =>
                item.hostname,
            ),
          ).length,
        freshness:
          analysis.verification
            ?.freshness
            ?.freshness ??
          "unknown",
        invalidationCondition:
          "Reassess valuation assumptions if earnings expectations, price or comparable multiples change materially.",
        humanReviewRequired:
          true,
      },
    );
  }
  if (
    pb !== null &&
    pb !== undefined &&
    Number.isFinite(pb) &&
    pb > 10
  ) {
    addRisk(
      risks,
      {
        id:
          buildRiskId(
            "valuation",
            `${symbol}-pb`,
          ),
        category:
          "valuation",
        severity:
          "medium",
        status:
          "identified",
        title:
          "Observed P/B is elevated",
        description:
          `Observed PB=${pb}. This is a valuation sensitivity flag requiring context from the company's business model and comparable companies.`,
        evidence: [
          `pb=${pb}`,
          ...signals.slice(
            0,
            3,
          ),
        ],
        sourceCount:
          analysis.evidence.length,
        independentDomains:
          unique(
            analysis.evidence.map(
              (item) =>
                item.hostname,
            ),
          ).length,
        freshness:
          analysis.verification
            ?.freshness
            ?.freshness ??
          "unknown",
        invalidationCondition:
          "Reassess valuation when book value, profitability or comparable-company multiples change materially.",
        humanReviewRequired:
          true,
      },
    );
  }
  if (
    assessment
      .toLowerCase()
      .includes(
        "valuation",
      ) &&
    assessment
      .toLowerCase()
      .includes(
        "risk",
      )
  ) {
    addRisk(
      risks,
      {
        id:
          buildRiskId(
            "valuation",
            `${symbol}-assessment`,
          ),
        category:
          "valuation",
        severity:
          "medium",
        status:
          "identified",
        title:
          "Valuation assessment contains explicit risk language",
        description:
          assessment,
        evidence:
          signals.slice(
            0,
            5,
          ),
        sourceCount:
          analysis.evidence.length,
        independentDomains:
          unique(
            analysis.evidence.map(
              (item) =>
                item.hostname,
            ),
          ).length,
        freshness:
          analysis.verification
            ?.freshness
            ?.freshness ??
          "unknown",
        invalidationCondition:
          "Reassess the valuation framework against updated price, earnings and comparable-company evidence.",
        humanReviewRequired:
          true,
      },
    );
  }
  return risks;
}
function buildEventRisks(
  analysis: MarketAnalysisResult,
  symbol: string,
): MarketRiskItem[] {
  const risks:
    MarketRiskItem[] =
    [];
  const evidence =
    Array.isArray(
      analysis.evidence,
    )
      ? analysis.evidence
      : [];
  const eventKeywords = [
    "earnings",
    "guidance",
    "regulatory",
    "lawsuit",
    "investigation",
    "acquisition",
    "merger",
    "approval",
    "recall",
    "sanction",
    "dividend",
    "management",
    "bankruptcy",
  ];
  const matched =
    evidence.filter(
      (item) => {
        const text =
          [
            item.title,
            item.snippet,
          ]
            .join(" ")
            .toLowerCase();
        return eventKeywords.some(
          (keyword) =>
            text.includes(
              keyword,
            ),
        );
      },
    );
  if (
    matched.length > 0
  ) {
    addRisk(
      risks,
      {
        id:
          buildRiskId(
            "event",
            symbol,
          ),
        category:
          "event",
        severity:
          "medium",
        status:
          "identified",
        title:
          "Potential event-driven risk requires review",
        description:
          `${matched.length} retrieved evidence item(s) contain event-sensitive terms. The runtime does not infer the event's direction or materiality automatically.`,
        evidence:
          matched
            .slice(
              0,
              5,
            )
            .map(
              (item) =>
                item.title,
            ),
        sourceCount:
          evidence.length,
        independentDomains:
          unique(
            evidence.map(
              (item) =>
                item.hostname,
            ),
          ).length,
        freshness:
          analysis.verification
            ?.freshness
            ?.freshness ??
          "unknown",
        invalidationCondition:
          "Verify the event's official status, materiality, timing and impact before changing the human decision record.",
        humanReviewRequired:
          true,
      },
    );
  }
  return risks;
}
function buildEvidenceConflictRisk(
  analysis: MarketAnalysisResult,
  symbol: string,
): MarketRiskItem[] {
  const risks:
    MarketRiskItem[] =
    [];
  const evidence =
    Array.isArray(
      analysis.evidence,
    )
      ? analysis.evidence
      : [];
  const fieldQuality =
    analysis.snapshot
      ?.fieldQuality ?? {};
  const conflicts =
    Object.entries(
      fieldQuality,
    )
      .filter(
        ([, quality]) =>
          quality ===
            "conflict" ||
          quality ===
            "corroborated-with-conflict",
      )
      .map(
        ([field, quality]) =>
          `${field}=${quality}`,
      );
  if (
    conflicts.length > 0
  ) {
    addRisk(
      risks,
      {
        id:
          buildRiskId(
            "evidence-conflict",
            symbol,
          ),
        category:
          "evidence-conflict",
        severity:
          "high",
        status:
          "requires-reassessment",
        title:
          "Conflicting market evidence detected",
        description:
          "One or more structured market fields contain source conflict. Conflicting evidence must remain visible instead of being silently substituted.",
        evidence:
          conflicts,
        sourceCount:
          evidence.length,
        independentDomains:
          unique(
            evidence.map(
              (item) =>
                item.hostname,
            ),
          ).length,
        freshness:
          analysis.verification
            ?.freshness
            ?.freshness ??
          "unknown",
        invalidationCondition:
          "Resolve or explicitly document the source conflict before relying on the affected field for a decision.",
        humanReviewRequired:
          true,
      },
    );
  }
  return risks;
}
function buildInvalidationRisks(
  analysis: MarketAnalysisResult,
  symbol: string,
): MarketRiskItem[] {
  const risks:
    MarketRiskItem[] =
    [];
  const conditions =
    analysis.analysis
      ?.decisionSupport
      ?.invalidationConditions ??
    [];
  if (
    conditions.length ===
    0
  ) {
    addRisk(
      risks,
      {
        id:
          buildRiskId(
            "invalidation",
            symbol,
          ),
        category:
          "invalidation",
        severity:
          "unknown",
        status:
          "insufficient-evidence",
        title:
          "No explicit decision invalidation conditions available",
        description:
          "The current analysis does not expose explicit conditions that would invalidate the existing decision-support state.",
        evidence: [],
        sourceCount:
          analysis.evidence.length,
        independentDomains:
          unique(
            analysis.evidence.map(
              (item) =>
                item.hostname,
            ),
          ).length,
        freshness:
          analysis.verification
            ?.freshness
            ?.freshness ??
          "unknown",
        invalidationCondition:
          "Define explicit thesis invalidation conditions before relying on the current decision-support state.",
        humanReviewRequired:
          true,
      },
    );
  }
  return risks;
}
function calculateOverallRisk(
  risks: MarketRiskItem[],
  analysisRisk:
    | MarketRiskSeverity
    | undefined,
): MarketRiskSeverity {
  const normalized =
    risks.map(
      (risk) =>
        risk.severity,
    );
  if (
    normalized.includes(
      "high",
    )
  ) {
    return "high";
  }
  if (
    normalized.includes(
      "medium",
    )
  ) {
    return "medium";
  }
  if (
    normalized.includes(
      "low",
    )
  ) {
    return "low";
  }
  return (
    analysisRisk ??
    "unknown"
  );
}
export async function runMarketRiskControl(
  request:
    MarketRiskControlRequest,
): Promise<MarketRiskControlResult> {
  const startedAt =
    Date.now();
  const symbol =
    request.symbol.trim();
  if (
    !symbol
  ) {
    return {
      success:
        false,
      code:
        "C147_17_RISK_CONTROL_INSUFFICIENT",
      symbol,
      market:
        request.market,
      overallRisk:
        "unknown",
      risks: [
        {
          id:
            "C147.17:data:missing-symbol",
          category:
            "data",
          severity:
            "high",
          status:
            "insufficient-evidence",
          title:
            "Security identity is missing",
          description:
            "A valid security symbol is required before risk control can run.",
          evidence: [],
          sourceCount:
            0,
          independentDomains:
            0,
          freshness:
            "unknown",
          invalidationCondition:
            "Provide and verify the target security identity.",
          humanReviewRequired:
            true,
        },
      ],
      riskCount:
        1,
      highRiskCount:
        1,
      mediumRiskCount:
        0,
      lowRiskCount:
        0,
      insufficientEvidenceCount:
        1,
      reassessmentRequired:
        true,
      decisionInvalidationConditions:
        [
          "A valid security identity must be verified.",
        ],
      reviewChecklist: [
        "Verify security identity.",
        "Verify data freshness.",
        "Verify source quality.",
        "Review fundamental risks.",
        "Review valuation sensitivity.",
        "Review event-driven risks.",
        "Review evidence conflicts.",
        "Confirm decision invalidation conditions.",
      ],
      humanReviewRequired:
        true,
      automatedExecutionStarted:
        false,
      plannerDispatched:
        false,
      tradingExecuted:
        false,
      sourceAnalysis: {
        dataQuality:
          "insufficient",
        freshness:
          "unknown",
        verified:
          false,
        sourceCount:
          0,
        independentDomains:
          0,
      },
      runtime: {
        name:
          "market-risk-control-runtime",
        version:
          "C147.17",
        generatedAt:
          new Date().toISOString(),
        latencyMs:
          Date.now() -
          startedAt,
      },
      principles: [
        "Risk control cannot operate without a verified security identity.",
        "Insufficient evidence is itself a risk state.",
        "No automated investment or trading action is permitted.",
      ],
      disclaimer:
        "This runtime identifies and structures market risks for human review. It does not provide personalized investment advice or execute trades.",
    };
  }
  try {
    const analysis =
      await analyzeMarketRequest({
        symbol,
        market:
          request.market,
        mode:
          "full",
        query:
          request.query ??
          `Risk control ${request.market} ${symbol}`,
      });
    const context =
      buildEvidenceContext(
        analysis,
      );
    if (
      !analysis.success
    ) {
      const risk:
        MarketRiskItem =
        {
          id:
            buildRiskId(
              "data",
              symbol,
            ),
          category:
            "data",
          severity:
            "high",
          status:
            "insufficient-evidence",
          title:
            "Market analysis did not return sufficient evidence",
          description:
            analysis.error ??
            "The upstream market analysis runtime did not return a sufficient result.",
          evidence: [],
          sourceCount:
            context.sourceCount,
          independentDomains:
            context.independentDomains,
          freshness:
            context.freshness,
          invalidationCondition:
            "Obtain sufficient verified market evidence before relying on the current risk assessment.",
          humanReviewRequired:
            true,
        };
      return {
        success:
          false,
        code:
          "C147_17_RISK_CONTROL_INSUFFICIENT",
        symbol,
        market:
          request.market,
        overallRisk:
          "high",
        risks: [
          risk,
        ],
        riskCount:
          1,
        highRiskCount:
          1,
        mediumRiskCount:
          0,
        lowRiskCount:
          0,
        insufficientEvidenceCount:
          1,
        reassessmentRequired:
          true,
        decisionInvalidationConditions:
          [
            "Obtain sufficient verified evidence.",
          ],
        reviewChecklist: [
          "Verify security identity.",
          "Verify data freshness.",
          "Verify evidence quality.",
          "Resolve missing data before human decision.",
        ],
        humanReviewRequired:
          true,
        automatedExecutionStarted:
          false,
        plannerDispatched:
          false,
        tradingExecuted:
          false,
        sourceAnalysis: {
          dataQuality:
            analysis.snapshot
              ?.dataQuality ??
            "insufficient",
          freshness:
            context.freshness,
          verified:
            Boolean(
              analysis.verification
                ?.verified,
            ),
          sourceCount:
            context.sourceCount,
          independentDomains:
            context.independentDomains,
        },
        runtime: {
          name:
            "market-risk-control-runtime",
          version:
            "C147.17",
          generatedAt:
            new Date().toISOString(),
          latencyMs:
            Date.now() -
            startedAt,
        },
        principles: [
          "Upstream evidence quality is preserved.",
          "Insufficient evidence is surfaced as risk.",
          "No silent substitution of missing market facts occurs.",
          "Human review remains mandatory.",
        ],
        disclaimer:
          "This runtime structures market risk for human review only. It does not rank securities, predict returns, provide personalized investment advice, or execute trades.",
      };
    }
    const risks: MarketRiskItem[] =
      [
        ...buildDataRisks(
          analysis,
          symbol,
        ),
        ...buildFundamentalRisks(
          analysis,
          symbol,
        ),
        ...buildValuationRisks(
          analysis,
          symbol,
        ),
        ...buildEventRisks(
          analysis,
          symbol,
        ),
        ...buildEvidenceConflictRisk(
          analysis,
          symbol,
        ),
        ...buildInvalidationRisks(
          analysis,
          symbol,
        ),
      ];
    const analysisRisk =
      normalizeSeverity(
        analysis.analysis
          ?.risk?.level,
      );
    const overallRisk =
      calculateOverallRisk(
        risks,
        analysisRisk,
      );
    const highRiskCount =
      risks.filter(
        (risk) =>
          risk.severity ===
          "high",
      ).length;
    const mediumRiskCount =
      risks.filter(
        (risk) =>
          risk.severity ===
          "medium",
      ).length;
    const lowRiskCount =
      risks.filter(
        (risk) =>
          risk.severity ===
          "low",
      ).length;
    const insufficientEvidenceCount =
      risks.filter(
        (risk) =>
          risk.status ===
            "insufficient-evidence" ||
          risk.severity ===
            "unknown",
      ).length;
    const reassessmentRequired =
      risks.some(
        (risk) =>
          risk.status ===
          "requires-reassessment",
      );
    const decisionInvalidationConditions =
      unique([
        ...(
          analysis.analysis
            ?.decisionSupport
            ?.invalidationConditions ??
          []
        ),
        ...risks
          .map(
            (risk) =>
              risk.invalidationCondition,
          )
          .filter(
            (
              condition,
            ): condition is string =>
              Boolean(
                condition,
              ),
          ),
      ]);
    const reviewChecklist = [
      "Verify security identity and market.",
      "Verify data freshness before using current-market fields.",
      "Review fundamental deterioration or profitability risks.",
      "Review valuation sensitivity and assumption changes.",
      "Review event-driven evidence and official status.",
      "Review source conflicts and unresolved evidence quality.",
      "Confirm explicit decision invalidation conditions.",
      "Reassess the human decision when material evidence changes.",
    ];
    const code =
      insufficientEvidenceCount >
        0 &&
      highRiskCount ===
        0
        ? "C147_17_RISK_CONTROL_PARTIAL"
        : risks.length ===
            0 &&
          !analysis.analysis
            ?.risk?.factors?.length
        ? "C147_17_RISK_CONTROL_INSUFFICIENT"
        : "C147_17_RISK_CONTROL_PASS";
    return {
      success:
        code !==
        "C147_17_RISK_CONTROL_INSUFFICIENT",
      code,
      symbol,
      market:
        request.market,
      overallRisk,
      risks,
      riskCount:
        risks.length,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      insufficientEvidenceCount,
      reassessmentRequired,
      decisionInvalidationConditions,
      reviewChecklist,
      humanReviewRequired:
        true,
      automatedExecutionStarted:
        false,
      plannerDispatched:
        false,
      tradingExecuted:
        false,
      sourceAnalysis: {
        dataQuality:
          analysis.snapshot
            ?.dataQuality ??
          "insufficient",
        freshness:
          context.freshness,
        verified:
          Boolean(
            analysis.verification
              ?.verified,
          ),
        sourceCount:
          context.sourceCount,
        independentDomains:
          context.independentDomains,
      },
      runtime: {
        name:
          "market-risk-control-runtime",
        version:
          "C147.17",
        generatedAt:
          new Date().toISOString(),
        latencyMs:
          Date.now() -
          startedAt,
      },
      principles: [
        "Risk is separated into data, fundamental, valuation, event, evidence-conflict and invalidation categories.",
        "Risk signals are evidence-linked and remain distinguishable from investment conclusions.",
        "Insufficient data is treated as a risk state rather than silently filled with assumptions.",
        "Material evidence changes should trigger reassessment.",
        "Decision invalidation conditions remain explicit.",
        "Human review remains mandatory.",
        "No ranking or return prediction is generated.",
        "No personalized investment advice is generated.",
        "No Planner dispatch occurs.",
        "No automated trading occurs.",
      ],
      disclaimer:
        "C147.17 is a structured market risk-control runtime for research and human review. Risk flags are not buy, sell or hold recommendations, do not predict future returns, and do not constitute personalized investment advice.",
    };
  } catch (error) {
    return {
      success:
        false,
      code:
        "C147_17_RISK_CONTROL_INSUFFICIENT",
      symbol,
      market:
        request.market,
      overallRisk:
        "unknown",
      risks: [
        {
          id:
            buildRiskId(
              "data",
              `${symbol}-runtime-error`,
            ),
          category:
            "data",
          severity:
            "unknown",
          status:
            "insufficient-evidence",
          title:
            "Risk-control runtime could not complete",
          description:
            error instanceof Error
              ? error.message
              : "Unknown risk-control runtime error.",
          evidence: [],
          sourceCount:
            0,
          independentDomains:
            0,
          freshness:
            "unknown",
          invalidationCondition:
            "Resolve the runtime or evidence failure before relying on the assessment.",
          humanReviewRequired:
            true,
        },
      ],
      riskCount:
        1,
      highRiskCount:
        0,
      mediumRiskCount:
        0,
      lowRiskCount:
        0,
      insufficientEvidenceCount:
        1,
      reassessmentRequired:
        true,
      decisionInvalidationConditions:
        [
          "Resolve the runtime or evidence failure.",
        ],
      reviewChecklist: [
        "Verify runtime health.",
        "Verify security identity.",
        "Verify evidence availability.",
        "Re-run risk assessment.",
      ],
      humanReviewRequired:
        true,
      automatedExecutionStarted:
        false,
      plannerDispatched:
        false,
      tradingExecuted:
        false,
      sourceAnalysis: {
        dataQuality:
          "insufficient",
        freshness:
          "unknown",
        verified:
          false,
        sourceCount:
          0,
        independentDomains:
          0,
      },
      runtime: {
        name:
          "market-risk-control-runtime",
        version:
          "C147.17",
        generatedAt:
          new Date().toISOString(),
        latencyMs:
          Date.now() -
          startedAt,
      },
      principles: [
        "Runtime failure must not be converted into an investment conclusion.",
        "Insufficient evidence remains visible.",
        "No automated execution is permitted.",
        "Human review remains mandatory.",
      ],
      disclaimer:
        "Risk-control failure is not an investment conclusion. No automated trading or personalized investment advice is generated.",
    };
  }
}
