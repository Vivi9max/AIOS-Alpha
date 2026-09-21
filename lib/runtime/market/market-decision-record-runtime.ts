import {
  runMarketDecisionSupport,
} from "./market-decision-support-runtime";

import type {
  MarketRegion,
} from "./market-types";

import type {
  MarketDecisionSupportItem,
} from "./market-decision-support-types";

import type {
  MarketDecisionRecord,
  MarketDecisionRecordRequest,
  MarketDecisionRecordResult,
  MarketDecisionRecordScenario,
} from "./market-decision-record-types";

function unique(
  values: string[],
): string[] {
  return Array.from(
    new Set(
      values.filter(
        (value) =>
          typeof value === "string" &&
          value.trim(),
      ),
    ),
  );
}

function normalizeUniverse(
  universe:
    | MarketDecisionRecordRequest["universe"]
    | undefined,
): Array<{
  symbol: string;
  market: MarketRegion;
}> {
  if (!Array.isArray(universe)) {
    return [];
  }

  const seen =
    new Set<string>();

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

function createRecordId(
  symbol: string,
  market: MarketRegion,
): string {
  const normalized =
    symbol
      .trim()
      .toUpperCase()
      .replace(
        /[^A-Z0-9]+/g,
        "-",
      )
      .replace(
        /^-+|-+$/g,
        "",
      );

  return `C1477-${market}-${normalized}`;
}

function buildScenarios(
  item: MarketDecisionSupportItem,
): MarketDecisionRecordScenario[] {
  if (
    Array.isArray(
      item.scenarios,
    ) &&
    item.scenarios.length > 0
  ) {
    return item.scenarios.map(
      (scenario) => ({
        name:
          scenario.name,

        condition:
          scenario.condition,

        implication:
          scenario.implication,
      }),
    );
  }

  return [
    {
      name:
        "Fundamentals change",

      condition:
        "Revenue, earnings, guidance, or other monitored fundamentals materially change.",

      implication:
        "Reassess the current research state using updated evidence.",
    },

    {
      name:
        "Valuation changes",

      condition:
        "Observed valuation metrics materially change relative to the current evidence.",

      implication:
        "Reassess valuation assumptions and sensitivity.",
    },

    {
      name:
        "Risk evidence changes",

      condition:
        "New evidence materially changes the identified risk factors.",

      implication:
        "Reassess the current state and invalidation conditions.",
    },
  ];
}

function buildBlockedRecord(
  item: MarketDecisionSupportItem,
): MarketDecisionRecord {
  const now =
    new Date().toISOString();

  const blockedReasons =
    unique([
      item.currentState,
      ...item.invalidationConditions,
    ]);

  return {
    recordId:
      createRecordId(
        item.symbol,
        item.market,
      ),

    symbol:
      item.symbol,

    market:
      item.market,

    state:
      item.state,

    reviewStatus:
      "blocked",

    currentState:
      item.currentState,

    supportingFactors:
      unique(
        item.supportingFactors,
      ),

    risks:
      unique(
        item.risk.factors,
      ),

    invalidationConditions:
      unique(
        item.invalidationConditions,
      ),

    watchMetrics:
      unique(
        item.watchMetrics,
      ),

    scenarios:
      buildScenarios(item),

    industry:
      item.industry,

    company:
      item.company,

    fundamentals: {
      revenueGrowth:
        item.fundamentals
          .revenueGrowth,

      eps:
        item.fundamentals.eps,

      assessment:
        item.fundamentals
          .assessment,
    },

    valuation: {
      pe:
        item.valuation.pe,

      pb:
        item.valuation.pb,

      assessment:
        item.valuation
          .assessment,
    },

    evidence: {
      sourceCount:
        item.evidence
          .sourceCount,

      independentDomains:
        item.evidence
          .independentDomains,

      verified:
        item.evidence
          .verified,

      freshness:
        item.freshness
          .freshness,

      asOf:
        item.freshness
          .asOf,
    },

    dataQuality:
      item.dataQuality,

    humanDecisionRequired:
      true,

    decisionBoundary: {
      whatWouldChangeAssessment:
        unique([
          ...item.watchMetrics,
          ...item.supportingFactors,
        ]),

      whatWouldInvalidateAssessment:
        unique(
          blockedReasons,
        ),
    },

    sourceVersion:
      "C147.5",

    generatedAt:
      now,
  };
}

function buildRecord(
  item: MarketDecisionSupportItem,
): MarketDecisionRecord {
  const now =
    new Date().toISOString();

  const ready =
    item.state ===
      "research-candidate" &&
    item.dataQuality !==
      "insufficient" &&
    item.freshness.freshness !==
      "unknown";

  return {
    recordId:
      createRecordId(
        item.symbol,
        item.market,
      ),

    symbol:
      item.symbol,

    market:
      item.market,

    state:
      item.state,

    reviewStatus:
      ready
        ? "review-ready"
        : "blocked",

    currentState:
      item.currentState,

    supportingFactors:
      unique(
        item.supportingFactors,
      ),

    risks:
      unique(
        item.risk.factors,
      ),

    invalidationConditions:
      unique(
        item.invalidationConditions,
      ),

    watchMetrics:
      unique(
        item.watchMetrics,
      ),

    scenarios:
      buildScenarios(item),

    industry:
      item.industry,

    company:
      item.company,

    fundamentals: {
      revenueGrowth:
        item.fundamentals
          .revenueGrowth,

      eps:
        item.fundamentals.eps,

      assessment:
        item.fundamentals
          .assessment,
    },

    valuation: {
      pe:
        item.valuation.pe,

      pb:
        item.valuation.pb,

      assessment:
        item.valuation
          .assessment,
    },

    evidence: {
      sourceCount:
        item.evidence
          .sourceCount,

      independentDomains:
        item.evidence
          .independentDomains,

      verified:
        item.evidence
          .verified,

      freshness:
        item.freshness
          .freshness,

      asOf:
        item.freshness
          .asOf,
    },

    dataQuality:
      item.dataQuality,

    humanDecisionRequired:
      true,

    decisionBoundary: {
      whatWouldChangeAssessment:
        unique([
          ...item.watchMetrics,
          ...item.supportingFactors,
        ]),

      whatWouldInvalidateAssessment:
        unique(
          item.invalidationConditions,
        ),
    },

    sourceVersion:
      "C147.5",

    generatedAt:
      now,
  };
}

function buildRecordFromItem(
  item: MarketDecisionSupportItem,
): MarketDecisionRecord {
  if (
    item.state !==
    "research-candidate"
  ) {
    return buildBlockedRecord(
      item,
    );
  }

  return buildRecord(
    item,
  );
}

export async function runMarketDecisionRecord(
  request:
    MarketDecisionRecordRequest,
): Promise<MarketDecisionRecordResult> {
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
        "C147_7_DECISION_RECORD_INSUFFICIENT",

      universeSize: 0,

      evaluatedCount: 0,

      reviewReadyCount: 0,

      blockedCount: 0,

      records: [],

      principles: [
        "Decision records require at least one valid market instrument.",
        "Decision records inherit evidence from the existing Decision Support runtime.",
        "Human review is always required.",
      ],

      humanDecisionRequired:
        true,

      runtime: {
        name:
          "market-decision-record-runtime",

        version:
          "C147.7",

        generatedAt:
          new Date().toISOString(),

        latencyMs:
          Date.now() -
          startedAt,
      },

      disclaimer:
        "Decision records organize research evidence and decision boundaries. They do not constitute personalized investment advice or automated trading instructions.",
    };
  }

  const support =
    await runMarketDecisionSupport({
      universe,

      includeExcluded:
        request?.includeExcluded ??
        true,

      includeInsufficientData:
        request?.includeInsufficientData ??
        true,

      query:
        request?.query ??
        null,
    });

  const records =
    support.items.map(
      buildRecordFromItem,
    );

  const reviewReady =
    records.filter(
      (record) =>
        record.reviewStatus ===
        "review-ready",
    );

  const blocked =
    records.filter(
      (record) =>
        record.reviewStatus ===
        "blocked",
    );

  let code:
    | "C147_7_DECISION_RECORD_PASS"
    | "C147_7_DECISION_RECORD_PARTIAL"
    | "C147_7_DECISION_RECORD_INSUFFICIENT";

  if (
    records.length === 0 ||
    reviewReady.length === 0
  ) {
    code =
      "C147_7_DECISION_RECORD_INSUFFICIENT";
  } else if (
    blocked.length > 0
  ) {
    code =
      "C147_7_DECISION_RECORD_PARTIAL";
  } else {
    code =
      "C147_7_DECISION_RECORD_PASS";
  }

  return {
    success:
      code !==
      "C147_7_DECISION_RECORD_INSUFFICIENT",

    code,

    universeSize:
      universe.length,

    evaluatedCount:
      records.length,

    reviewReadyCount:
      reviewReady.length,

    blockedCount:
      blocked.length,

    records,

    principles: [
      "Decision records inherit security identity verification from C147.5.",
      "Decision records inherit data-quality and freshness gates from C147.5.",
      "Current state is separated from supporting factors.",
      "Risks are separated from invalidation conditions.",
      "Watch metrics define what should be monitored before reassessment.",
      "Scenarios are conditional and do not predict outcomes.",
      "Decision boundaries state what evidence could change or invalidate the current assessment.",
      "Evidence provenance remains visible.",
      "Human review is mandatory.",
      "No security is ranked.",
      "No buy, sell, hold, target price, or probability recommendation is generated.",
      "No automated order or portfolio execution is performed.",
    ],

    humanDecisionRequired:
      true,

    runtime: {
      name:
        "market-decision-record-runtime",

      version:
        "C147.7",

      generatedAt:
        new Date().toISOString(),

      latencyMs:
        Date.now() -
        startedAt,
    },

    disclaimer:
      "This decision record is a structured research artifact derived from market evidence. It does not rank securities, predict outcomes, provide personalized investment advice, or execute trades.",
  };
}
