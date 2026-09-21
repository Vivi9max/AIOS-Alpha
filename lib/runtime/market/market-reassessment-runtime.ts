import type {
  MarketDecisionRecord,
} from "./market-decision-record-types";

import type {
  MarketReassessmentFieldChange,
  MarketReassessmentRequest,
  MarketReassessmentResult,
  MarketReassessmentRuntimeResult,
} from "./market-reassessment-types";

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

function normalizeText(
  value: string | null | undefined,
): string {
  return (
    value ??
    ""
  )
    .trim()
    .toLowerCase();
}

function numericChanged(
  previous: number | null,
  current: number | null,
): boolean {
  if (
    previous === null &&
    current === null
  ) {
    return false;
  }

  if (
    previous === null ||
    current === null
  ) {
    return true;
  }

  if (
    !Number.isFinite(previous) ||
    !Number.isFinite(current)
  ) {
    return previous !== current;
  }

  if (previous === 0) {
    return current !== 0;
  }

  return (
    Math.abs(
      current - previous,
    ) /
      Math.abs(previous) >=
    0.05
  );
}

function compareField(
  field: string,
  previousValue:
    | string
    | number
    | null,
  currentValue:
    | string
    | number
    | null,
  material: boolean,
  explanation: string,
): MarketReassessmentFieldChange {
  let changed = false;

  if (
    typeof previousValue ===
      "number" &&
    typeof currentValue ===
      "number"
  ) {
    changed =
      numericChanged(
        previousValue,
        currentValue,
      );
  } else {
    changed =
      normalizeText(
        String(
          previousValue ?? "",
        ),
      ) !==
      normalizeText(
        String(
          currentValue ?? "",
        ),
      );
  }

  return {
    field,
    previousValue,
    currentValue,
    changed,
    material:
      changed &&
      material,
    explanation:
      changed
        ? explanation
        : `${field} has no material change under the current reassessment threshold.`,
  };
}

function compareArray(
  field: string,
  previousValue: string[],
  currentValue: string[],
): MarketReassessmentFieldChange {
  const previous =
    unique(previousValue).sort();

  const current =
    unique(currentValue).sort();

  const changed =
    JSON.stringify(previous) !==
    JSON.stringify(current);

  return {
    field,
    previousValue:
      previous.join(" | "),
    currentValue:
      current.join(" | "),
    changed,
    material:
      changed,
    explanation:
      changed
        ? `${field} changed between the two decision records.`
        : `${field} remained unchanged.`,
  };
}

function sameInstrument(
  previous: MarketDecisionRecord,
  current: MarketDecisionRecord,
): boolean {
  return (
    previous.symbol
      .trim()
      .toUpperCase() ===
      current.symbol
        .trim()
        .toUpperCase() &&
    previous.market ===
      current.market
  );
}

function createReassessmentId(
  previous: MarketDecisionRecord,
  current: MarketDecisionRecord,
): string {
  const symbol =
    current.symbol
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

  return `C1478-${current.market}-${symbol}-${previous.generatedAt
    .replace(/\D/g, "")
    .slice(-8)}`;
}

function buildInvalidationChanges(
  previous: MarketDecisionRecord,
  current: MarketDecisionRecord,
): string[] {
  const previousSet =
    new Set(
      previous.invalidationConditions,
    );

  return unique(
    current.invalidationConditions.filter(
      (condition) =>
        !previousSet.has(
          condition,
        ),
    ),
  );
}

function buildChangedWatchMetrics(
  previous: MarketDecisionRecord,
  current: MarketDecisionRecord,
): string[] {
  const previousSet =
    new Set(
      previous.watchMetrics,
    );

  return unique(
    current.watchMetrics.filter(
      (metric) =>
        !previousSet.has(
          metric,
        ),
    ),
  );
}

function buildReassessment(
  request: MarketReassessmentRequest,
): MarketReassessmentResult {
  const previous =
    request.previousRecord;

  const current =
    request.currentRecord;

  const changes: MarketReassessmentFieldChange[] =
    [];

  changes.push(
    compareField(
      "state",
      previous.state,
      current.state,
      true,
      "The research state changed and therefore requires human reassessment.",
    ),
  );

  changes.push(
    compareField(
      "reviewStatus",
      previous.reviewStatus,
      current.reviewStatus,
      true,
      "The human-review state changed.",
    ),
  );

  changes.push(
    compareField(
      "dataQuality",
      previous.dataQuality,
      current.dataQuality,
      true,
      "Data quality changed and may affect whether the record can remain review-ready.",
    ),
  );

  changes.push(
    compareField(
      "freshness",
      previous.evidence.freshness,
      current.evidence.freshness,
      true,
      "Evidence freshness changed.",
    ),
  );

  changes.push(
    compareField(
      "sourceCount",
      previous.evidence.sourceCount,
      current.evidence.sourceCount,
      false,
      "The amount of retrieved evidence changed.",
    ),
  );

  changes.push(
    compareField(
      "independentDomains",
      previous.evidence
        .independentDomains,
      current.evidence
        .independentDomains,
      true,
      "Independent evidence coverage changed.",
    ),
  );

  changes.push(
    compareField(
      "revenueGrowth",
      previous.fundamentals
        .revenueGrowth,
      current.fundamentals
        .revenueGrowth,
      true,
      "Revenue growth changed materially under the reassessment threshold.",
    ),
  );

  changes.push(
    compareField(
      "eps",
      previous.fundamentals.eps,
      current.fundamentals.eps,
      true,
      "EPS changed materially under the reassessment threshold.",
    ),
  );

  changes.push(
    compareField(
      "pe",
      previous.valuation.pe,
      current.valuation.pe,
      true,
      "P/E changed materially under the reassessment threshold.",
    ),
  );

  changes.push(
    compareField(
      "pb",
      previous.valuation.pb,
      current.valuation.pb,
      true,
      "P/B changed materially under the reassessment threshold.",
    ),
  );

  changes.push(
    compareArray(
      "supportingFactors",
      previous.supportingFactors,
      current.supportingFactors,
    ),
  );

  changes.push(
    compareArray(
      "risks",
      previous.risks,
      current.risks,
    ),
  );

  changes.push(
    compareArray(
      "invalidationConditions",
      previous.invalidationConditions,
      current.invalidationConditions,
    ),
  );

  changes.push(
    compareArray(
      "watchMetrics",
      previous.watchMetrics,
      current.watchMetrics,
    ),
  );

  changes.push(
    compareArray(
      "scenarios",
      previous.scenarios.map(
        (scenario) =>
          `${scenario.name}:${scenario.condition}:${scenario.implication}`,
      ),
      current.scenarios.map(
        (scenario) =>
          `${scenario.name}:${scenario.condition}:${scenario.implication}`,
      ),
    ),
  );

  const materialChanges =
    changes.filter(
      (change) =>
        change.changed &&
        change.material,
    );

  const unchangedFields =
    changes
      .filter(
        (change) =>
          !change.changed,
      )
      .map(
        (change) =>
          change.field,
      );

  const triggeredInvalidations =
    buildInvalidationChanges(
      previous,
      current,
    );

  const changedWatchMetrics =
    buildChangedWatchMetrics(
      previous,
      current,
    );

  const stateChanged =
    previous.state !==
    current.state;

  const blocked =
    current.reviewStatus ===
      "blocked" ||
    current.state ===
      "insufficient-data";

  const invalidationRisk =
    triggeredInvalidations.length >
      0 ||
    (
      current.state ===
        "insufficient-data" &&
      previous.state !==
        "insufficient-data"
    );

  let changeType:
    | "no-material-change"
    | "assessment-change"
    | "invalidation-risk"
    | "insufficient-data";

  if (blocked) {
    changeType =
      "insufficient-data";
  } else if (
    invalidationRisk
  ) {
    changeType =
      "invalidation-risk";
  } else if (
    stateChanged ||
    materialChanges.length > 0
  ) {
    changeType =
      "assessment-change";
  } else {
    changeType =
      "no-material-change";
  }

  let severity:
    | "none"
    | "low"
    | "medium"
    | "high"
    | "blocked";

  if (blocked) {
    severity =
      "blocked";
  } else if (
    invalidationRisk
  ) {
    severity =
      "high";
  } else if (
    materialChanges.length >= 3
  ) {
    severity =
      "medium";
  } else if (
    materialChanges.length > 0
  ) {
    severity =
      "low";
  } else {
    severity =
      "none";
  }

  const whatChanged =
    unique(
      materialChanges.map(
        (change) =>
          `${change.field}: ${change.explanation}`,
      ),
    );

  const whyItMatters =
    unique([
      ...(stateChanged
        ? [
            "The current research state differs from the previous decision record.",
          ]
        : []),
      ...(triggeredInvalidations.length
        ? [
            "New invalidation conditions require human reassessment.",
          ]
        : []),
      ...(current.dataQuality !==
        previous.dataQuality
        ? [
            "Data quality changed and may alter the reliability of the current assessment.",
          ]
        : []),
      ...(current.evidence.freshness !==
        previous.evidence.freshness
        ? [
            "Evidence freshness changed and should be reviewed before relying on the current assessment.",
          ]
        : []),
      ...(materialChanges.length ===
        0
        ? [
            "No material change was detected under the current reassessment rules.",
          ]
        : []),
    ]);

  const whatRequiresHumanReview =
    unique([
      "Review the changed evidence before changing the decision state.",
      ...(triggeredInvalidations.length
        ? triggeredInvalidations.map(
            (condition) =>
              `Review invalidation condition: ${condition}`,
          )
        : []),
      ...(changedWatchMetrics.length
        ? changedWatchMetrics.map(
            (metric) =>
              `Review watch metric: ${metric}`,
          )
        : []),
      ...(blocked
        ? [
            "Resolve insufficient evidence or blocked review status before treating the record as review-ready.",
          ]
        : []),
    ]);

  return {
    reassessmentId:
      createReassessmentId(
        previous,
        current,
      ),

    symbol:
      current.symbol,

    market:
      current.market,

    changeType,

    severity,

    previousState:
      previous.state,

    currentState:
      current.state,

    previousReviewStatus:
      previous.reviewStatus,

    currentReviewStatus:
      current.reviewStatus,

    materialChanges,

    unchangedFields,

    changedWatchMetrics,

    triggeredInvalidationConditions:
      triggeredInvalidations,

    whatChanged,

    whyItMatters,

    whatRequiresHumanReview,

    humanDecisionRequired:
      true,

    previousRecordGeneratedAt:
      previous.generatedAt,

    currentRecordGeneratedAt:
      current.generatedAt,

    previousRecordId:
      previous.recordId,

    currentRecordId:
      current.recordId,

    sourceVersions:
      unique([
        previous.sourceVersion,
        current.sourceVersion,
      ]),

    generatedAt:
      new Date().toISOString(),
  };
}

export function runMarketReassessment(
  request: MarketReassessmentRequest,
): MarketReassessmentRuntimeResult {
  const startedAt =
    Date.now();

  const previous =
    request?.previousRecord;

  const current =
    request?.currentRecord;

  if (
    !previous ||
    !current
  ) {
    return {
      success: false,

      code:
        "C147_8_REASSESSMENT_INSUFFICIENT",

      reassessment: null,

      principles: [
        "A previous and current decision record are required.",
        "Human review remains mandatory.",
      ],

      humanDecisionRequired:
        true,

      runtime: {
        name:
          "market-reassessment-runtime",

        version:
          "C147.8",

        generatedAt:
          new Date().toISOString(),

        latencyMs:
          Date.now() -
          startedAt,
      },

      disclaimer:
        "Reassessment compares structured decision records. It does not provide personalized investment advice or execute trades.",
    };
  }

  if (
    !sameInstrument(
      previous,
      current,
    )
  ) {
    return {
      success: false,

      code:
        "C147_8_REASSESSMENT_INSUFFICIENT",

      reassessment: null,

      principles: [
        "Previous and current records must reference the same security and market.",
        "Cross-security comparisons are not treated as reassessments.",
        "Human review remains mandatory.",
      ],

      humanDecisionRequired:
        true,

      runtime: {
        name:
          "market-reassessment-runtime",

        version:
          "C147.8",

        generatedAt:
          new Date().toISOString(),

        latencyMs:
          Date.now() -
          startedAt,
      },

      disclaimer:
        "Reassessment compares one security's decision records over time. It does not rank securities or execute trades.",
    };
  }

  const reassessment =
    buildReassessment(
      request,
    );

  const success =
    reassessment.changeType !==
    "insufficient-data";

  return {
    success,

    code:
      success
        ? reassessment.changeType ===
            "no-material-change"
          ? "C147_8_REASSESSMENT_PASS"
          : "C147_8_REASSESSMENT_PARTIAL"
        : "C147_8_REASSESSMENT_INSUFFICIENT",

    reassessment,

    principles: [
      "Reassessment compares the same security across two decision records.",
      "Material changes are separated from unchanged fields.",
      "Invalidation risk is surfaced explicitly.",
      "Data-quality and freshness changes remain visible.",
      "Watch-metric changes remain visible.",
      "The runtime does not predict future market outcomes.",
      "Human review remains mandatory.",
      "No ranking is produced.",
      "No buy, sell, hold, target price, or probability recommendation is generated.",
      "No automated order or portfolio execution is performed.",
    ],

    humanDecisionRequired:
      true,

    runtime: {
      name:
        "market-reassessment-runtime",

      version:
        "C147.8",

      generatedAt:
        new Date().toISOString(),

      latencyMs:
        Date.now() -
        startedAt,
    },

    disclaimer:
      "This reassessment compares structured market decision records and identifies material changes requiring human review. It does not provide personalized investment advice, predict outcomes, rank securities, or execute trades.",
  };
}
