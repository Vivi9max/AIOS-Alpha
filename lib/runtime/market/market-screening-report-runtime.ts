import {
  runMarketScreeningRuntime,
} from "./market-screening-runtime";

import type {
  MarketScreeningItem,
  MarketScreeningRequest,
  MarketScreeningResult,
} from "./market-screening-types";

import type {
  MarketResearchItem,
  MarketScreeningResearchReport,
  MarketScreeningResearchReportRequest,
} from "./market-screening-report-types";

function toResearchItem(
  item: MarketScreeningItem,
): MarketResearchItem {
  const snapshot =
    item.analysis?.snapshot;

  const verification =
    item.analysis?.verification;

  return {
    symbol:
      item.symbol,

    market:
      item.market,

    decision:
      item.decision,

    matchedCriteria:
      item.matchedCriteria,

    failedCriteria:
      item.failedCriteria,

    missingCriteria:
      item.missingCriteria,

    reasons:
      item.reasons,

    risks:
      item.risks,

    price:
      snapshot?.price ??
      null,

    pe:
      snapshot?.pe ??
      null,

    pb:
      snapshot?.pb ??
      null,

    eps:
      snapshot?.eps ??
      null,

    revenueGrowth:
      snapshot?.revenueGrowth ??
      null,

    dataQuality:
      snapshot?.dataQuality ??
      "unknown",

    asOf:
      snapshot?.asOf ??
      null,

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
  };
}

function unique(
  values: string[],
): string[] {
  return Array.from(
    new Set(values),
  );
}

function buildEvidenceSummary(
  items: MarketScreeningItem[],
) {
  const totalSources =
    items.reduce(
      (sum, item) =>
        sum +
        (item.analysis?.verification
          ?.sourceCount ?? 0),
      0,
    );

  const totalIndependentDomains =
    items.reduce(
      (sum, item) =>
        sum +
        (item.analysis?.verification
          ?.independentDomains ?? 0),
      0,
    );

  const verifiedCount =
    items.filter(
      (item) =>
        Boolean(
          item.analysis?.verification
            ?.verified,
        ),
    ).length;

  const count =
    items.length;

  return {
    totalSources,

    averageSources:
      count > 0
        ? Number(
            (
              totalSources /
              count
            ).toFixed(2),
          )
        : 0,

    totalIndependentDomains,

    averageIndependentDomains:
      count > 0
        ? Number(
            (
              totalIndependentDomains /
              count
            ).toFixed(2),
          )
        : 0,

    verifiedCount,

    unverifiedCount:
      count -
      verifiedCount,
  };
}

function buildFreshnessSummary(
  items: MarketScreeningItem[],
) {
  const timestamps =
    items
      .map(
        (item) =>
          item.analysis?.snapshot
            ?.asOf ?? null,
      )
      .filter(
        (
          value,
        ): value is string =>
          Boolean(value),
      )
      .sort(
        (
          a,
          b,
        ) =>
          new Date(a).getTime() -
          new Date(b).getTime(),
      );

  const dataQuality =
    unique(
      items.map(
        (item) =>
          item.analysis?.snapshot
            ?.dataQuality ??
          "unknown",
      ),
    );

  return {
    knownAsOfCount:
      timestamps.length,

    unknownAsOfCount:
      items.length -
      timestamps.length,

    oldestAsOf:
      timestamps[0] ??
      null,

    newestAsOf:
      timestamps[
        timestamps.length - 1
      ] ??
      null,

    dataQuality,
  };
}

function buildSections(): Array<
  | "universe"
  | "criteria"
  | "candidates"
  | "excluded"
  | "insufficient-data"
  | "evidence"
  | "risk"
  | "freshness"
  | "human-decision"
> {
  return [
    "universe",
    "criteria",
    "candidates",
    "excluded",
    "insufficient-data",
    "evidence",
    "risk",
    "freshness",
    "human-decision",
  ];
}

function buildReport(
  screening:
    MarketScreeningResult,
  title: string,
  startedAt: number,
): MarketScreeningResearchReport {
  const researchItems =
    screening.items.map(
      toResearchItem,
    );

  const candidates =
    researchItems.filter(
      (item) =>
        item.decision ===
        "candidate",
    );

  const excluded =
    researchItems.filter(
      (item) =>
        item.decision ===
        "excluded",
    );

  const insufficientData =
    researchItems.filter(
      (item) =>
        item.decision ===
        "insufficient-data",
    );

  const evidenceSummary =
    buildEvidenceSummary(
      screening.items,
    );

  const freshnessSummary =
    buildFreshnessSummary(
      screening.items,
    );

  const generatedAt =
    new Date().toISOString();

  return {
    success:
      screening.success,

    code:
      screening.success
        ? screening.insufficientDataCount ===
          0
          ? "C147_3_2_REPORT_PASS"
          : "C147_3_2_REPORT_PARTIAL"
        : "C147_3_2_REPORT_INSUFFICIENT",

    report: {
      title,

      generatedAt,

      market:
        screening.market,

      universeSize:
        screening.universeSize,

      evaluatedCount:
        screening.evaluatedCount,

      candidateCount:
        screening.candidateCount,

      excludedCount:
        screening.excludedCount,

      insufficientDataCount:
        screening.insufficientDataCount,

      candidates,

      excluded,

      insufficientData,

      evidenceSummary,

      freshnessSummary,

      sections:
        buildSections(),

      humanDecisionRequired:
        true,

      humanDecisionNote:
        "This report organizes evidence, screening rules, valuation conditions, risks, and data-quality limitations for human review. It does not rank securities and does not issue automatic buy/sell instructions.",
    },

    criteria:
      screening.criteria,

    sourceScreening:
      screening,

    runtime: {
      name:
        "market-screening-report-runtime",

      version:
        "C147.3.2",

      generatedAt,

      latencyMs:
        Date.now() -
        startedAt,
    },

    disclaimer:
      "AIOS provides transparent research and decision-support information. This report is not personalized investment advice and does not constitute an automatic trading instruction.",
  };
}

export async function runMarketScreeningResearchReport(
  request:
    MarketScreeningResearchReportRequest,
): Promise<MarketScreeningResearchReport> {
  const startedAt =
    Date.now();

  const screening =
    await runMarketScreeningRuntime(
      request.screening,
    );

  return buildReport(
    screening,
    request.title?.trim() ||
      "AIOS Market Screening Research Report",
    startedAt,
  );
}
