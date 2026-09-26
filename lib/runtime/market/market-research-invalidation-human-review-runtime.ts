import {
  storage,
} from "@/lib/server-storage";

import {
  getMarketResearchInvalidationLedger,
} from "./market-research-invalidation-ledger-runtime";

import type {
  MarketResearchInvalidationHumanReviewDecision,
  MarketResearchInvalidationHumanReviewRecord,
  MarketResearchInvalidationHumanReviewRequest,
  MarketResearchInvalidationHumanReviewResult,
} from "./market-research-invalidation-human-review-types";

function normalizeText(
  value: unknown,
  maxLength: number,
): string {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .trim()
    .slice(0, maxLength);
}

function reviewKey(
  ledgerId: string,
): string {
  return `market:research-invalidation-human-review:${normalizeText(
    ledgerId,
    300,
  )}`;
}

function reviewId(
  ledgerId: string,
): string {
  return `C1613-${normalizeText(
    ledgerId,
    280,
  )}`;
}

function validDecision(
  value: unknown,
): value is MarketResearchInvalidationHumanReviewDecision {
  return (
    value ===
      "accept-current-research" ||
    value ===
      "invalidate-current-research" ||
    value ===
      "request-research-update"
  );
}

function boundary() {
  return {
    automaticInvalidationEvaluation:
      false as const,

    decisionAutomaticallyGenerated:
      false as const,

    plannerDispatched:
      false as const,

    brokerConnected:
      false as const,

    liveOrderPlaced:
      false as const,

    tradingExecuted:
      false as const,
  };
}

function principles(): string[] {
  return [
    "C161.3 reads the persistent C161.1 Ledger through its existing read boundary.",
    "C161.3 creates a separate human-review record and does not mutate the immutable Ledger.",
    "A review decision exists only after an explicit human request.",
    "No review decision is inferred from market evidence.",
    "No invalidation condition is automatically evaluated.",
    "Human rationale is preserved as submitted.",
    "No Planner task is created.",
    "No broker is connected.",
    "No live order is placed.",
    "No live trading is executed.",
  ];
}

function insufficient(
  reason: string,
  startedAt: number,
): MarketResearchInvalidationHumanReviewResult {
  return {
    success: false,

    code:
      "C161_3_RESEARCH_INVALIDATION_HUMAN_REVIEW_INSUFFICIENT",

    review: null,

    ledger: null,

    humanDecisionRequired: true,

    mutationPerformed: false,

    boundary:
      boundary(),

    runtime: {
      name:
        "market-research-invalidation-human-review-runtime",

      version:
        "C161.3",

      upstream:
        "C161.2",

      generatedAt:
        new Date().toISOString(),

      latencyMs:
        Date.now() -
        startedAt,
    },

    principles: [
      "A valid C161.1 ledger is required.",
      reason,
    ],

    disclaimer:
      "C161.3 provides an explicit human review boundary for C161.1 research invalidation records. It does not automatically invalidate research, generate recommendations, dispatch Planner work, or execute trading.",
  };
}

export async function getMarketResearchInvalidationHumanReview(
  ledgerId: string,
): Promise<MarketResearchInvalidationHumanReviewRecord | null> {
  const normalized =
    normalizeText(
      ledgerId,
      300,
    );

  if (!normalized) {
    return null;
  }

  return (
    await storage.get<MarketResearchInvalidationHumanReviewRecord>(
      reviewKey(normalized),
    )
  ) ?? null;
}

export async function runMarketResearchInvalidationHumanReview(
  request:
    MarketResearchInvalidationHumanReviewRequest,
): Promise<MarketResearchInvalidationHumanReviewResult> {
  const startedAt =
    Date.now();

  const ledgerId =
    normalizeText(
      request?.ledgerId,
      300,
    );

  if (!ledgerId) {
    return insufficient(
      "A C161.1 ledgerId is required.",
      startedAt,
    );
  }

  const ledger =
    await getMarketResearchInvalidationLedger(
      ledgerId,
    );

  if (!ledger) {
    return {
      ...insufficient(
        "The requested C161.1 Ledger does not exist.",
        startedAt,
      ),

      code:
        "C161_3_RESEARCH_INVALIDATION_HUMAN_REVIEW_NOT_FOUND",
    };
  }

  const existing =
    await getMarketResearchInvalidationHumanReview(
      ledgerId,
    );

  if (existing) {
    return {
      success: true,

      code:
        existing.status ===
        "decided"
          ? "C161_3_RESEARCH_INVALIDATION_HUMAN_REVIEW_PASS"
          : "C161_3_RESEARCH_INVALIDATION_HUMAN_REVIEW_PENDING",

      review:
        existing,

      ledger,

      humanDecisionRequired:
        true,

      mutationPerformed:
        false,

      boundary:
        boundary(),

      runtime: {
        name:
          "market-research-invalidation-human-review-runtime",

        version:
          "C161.3",

        upstream:
          "C161.2",

        generatedAt:
          new Date().toISOString(),

        latencyMs:
          Date.now() -
          startedAt,
      },

      principles:
        principles(),

      disclaimer:
        "C161.3 provides an explicit human review boundary for C161.1 research invalidation records. It does not automatically invalidate research, generate recommendations, dispatch Planner work, or execute trading.",
    };
  }

  const now =
    new Date().toISOString();

  const review:
    MarketResearchInvalidationHumanReviewRecord =
    {
      reviewId:
        reviewId(
          ledgerId,
        ),

      ledgerId,

      symbol:
        ledger.symbol,

      market:
        ledger.market,

      status:
        "pending",

      decision:
        null,

      rationale:
        null,

      reviewedAt:
        null,

      createdAt:
        now,

      updatedAt:
        now,

      ledgerSnapshot: {
        status:
          ledger.status,

        invalidationConditions:
          [
            ...ledger.invalidationConditions,
          ],

        sourceGeneratedAt:
          ledger.sourceGeneratedAt,

        ledgerCreatedAt:
          ledger.createdAt,
      },

      humanDecisionRequired:
        true,

      boundary:
        boundary(),
    };

  await storage.set(
    reviewKey(
      ledgerId,
    ),
    review,
  );

  return {
    success: true,

    code:
      "C161_3_RESEARCH_INVALIDATION_HUMAN_REVIEW_PENDING",

    review,

    ledger,

    humanDecisionRequired:
      true,

    mutationPerformed:
      true,

    boundary:
      boundary(),

    runtime: {
      name:
        "market-research-invalidation-human-review-runtime",

      version:
        "C161.3",

      upstream:
        "C161.2",

      generatedAt:
        now,

      latencyMs:
        Date.now() -
        startedAt,
    },

    principles:
      principles(),

    disclaimer:
      "C161.3 provides an explicit human review boundary for C161.1 research invalidation records. It does not automatically invalidate research, generate recommendations, dispatch Planner work, or execute trading.",
  };
}

export async function decideMarketResearchInvalidationHumanReview(
  request:
    MarketResearchInvalidationHumanReviewRequest,
): Promise<MarketResearchInvalidationHumanReviewResult> {
  const startedAt =
    Date.now();

  const ledgerId =
    normalizeText(
      request?.ledgerId,
      300,
    );

  if (!ledgerId) {
    return insufficient(
      "A C161.1 ledgerId is required.",
      startedAt,
    );
  }

  if (
    !validDecision(
      request?.decision,
    )
  ) {
    return insufficient(
      "An explicit human review decision is required.",
      startedAt,
    );
  }

  const ledger =
    await getMarketResearchInvalidationLedger(
      ledgerId,
    );

  if (!ledger) {
    return {
      ...insufficient(
        "The requested C161.1 Ledger does not exist.",
        startedAt,
      ),

      code:
        "C161_3_RESEARCH_INVALIDATION_HUMAN_REVIEW_NOT_FOUND",
    };
  }

  const existing =
    await getMarketResearchInvalidationHumanReview(
      ledgerId,
    );

  const now =
    new Date().toISOString();

  const review:
    MarketResearchInvalidationHumanReviewRecord =
    existing ?? {
      reviewId:
        reviewId(
          ledgerId,
        ),

      ledgerId,

      symbol:
        ledger.symbol,

      market:
        ledger.market,

      status:
        "pending",

      decision:
        null,

      rationale:
        null,

      reviewedAt:
        null,

      createdAt:
        now,

      updatedAt:
        now,

      ledgerSnapshot: {
        status:
          ledger.status,

        invalidationConditions:
          [
            ...ledger.invalidationConditions,
          ],

        sourceGeneratedAt:
          ledger.sourceGeneratedAt,

        ledgerCreatedAt:
          ledger.createdAt,
      },

      humanDecisionRequired:
        true,

      boundary:
        boundary(),
    };

  if (
    review.status ===
    "decided"
  ) {
    return {
      success: true,

      code:
        "C161_3_RESEARCH_INVALIDATION_HUMAN_REVIEW_PASS",

      review,

      ledger,

      humanDecisionRequired:
        true,

      mutationPerformed:
        false,

      boundary:
        boundary(),

      runtime: {
        name:
          "market-research-invalidation-human-review-runtime",

        version:
          "C161.3",

        upstream:
          "C161.2",

        generatedAt:
          now,

        latencyMs:
          Date.now() -
          startedAt,
      },

      principles:
        principles(),

      disclaimer:
        "C161.3 records an explicit human review decision but does not itself invalidate research, create tasks, connect a broker, or execute trading.",
    };
  }

  const next: MarketResearchInvalidationHumanReviewRecord =
    {
      ...review,

      status:
        "decided",

      decision:
        request.decision!,

      rationale:
        normalizeText(
          request.rationale,
          4000,
        ) || null,

      reviewedAt:
        now,

      updatedAt:
        now,
    };

  await storage.set(
    reviewKey(
      ledgerId,
    ),
    next,
  );

  return {
    success: true,

    code:
      "C161_3_RESEARCH_INVALIDATION_HUMAN_REVIEW_PASS",

    review:
      next,

    ledger,

    humanDecisionRequired:
      true,

    mutationPerformed:
      true,

    boundary:
      boundary(),

    runtime: {
      name:
        "market-research-invalidation-human-review-runtime",

      version:
        "C161.3",

      upstream:
        "C161.2",

      generatedAt:
        now,

      latencyMs:
        Date.now() -
        startedAt,
    },

    principles:
      principles(),

    disclaimer:
      "C161.3 records an explicit human review decision but does not itself invalidate research, create tasks, connect a broker, or execute trading.",
  };
}
