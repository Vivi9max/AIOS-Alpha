import {
  storage,
} from "@/lib/server-storage";

import {
  getMarketResearchInvalidationHumanReview,
} from "./market-research-invalidation-human-review-runtime";

import type {
  MarketRegion,
} from "./market-types";

import type {
  MarketResearchInvalidationHumanReviewRecord,
} from "./market-research-invalidation-human-review-types";

import type {
  MarketResearchInvalidationHumanReviewIndex,
  MarketResearchInvalidationHumanReviewIndexEntry,
  MarketResearchInvalidationHumanReviewHistoryItem,
  MarketResearchInvalidationHumanReviewHistoryRequest,
  MarketResearchInvalidationHumanReviewHistoryResult,
} from "./market-research-invalidation-human-review-history-types";

const INDEX_KEY =
  "aios:market:research-invalidation-human-review:index:v1";

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

function normalizeSymbol(
  value: unknown,
): string {
  return normalizeText(
    value,
    32,
  ).toUpperCase();
}

function normalizeMarket(
  value: unknown,
): MarketRegion | null {
  if (
    value === "us" ||
    value === "hk" ||
    value === "cn"
  ) {
    return value;
  }

  return null;
}

function normalizeStatus(
  value: unknown,
): MarketResearchInvalidationHumanReviewRecord["status"] | null {
  if (
    value === "pending" ||
    value === "decided"
  ) {
    return value;
  }

  return null;
}

function normalizeLimit(
  value: unknown,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 20;
  }

  return Math.max(
    1,
    Math.min(
      Math.floor(value),
      100,
    ),
  );
}

function boundary() {
  return {
    automaticInvalidationEvaluation:
      false as const,

    decisionAutomaticallyGenerated:
      false as const,

    decisionRecorded:
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
    "C161.4 reads explicit C161.3 human-review records through their existing read boundary.",
    "C161.4 persists a separate review index for deterministic historical lookup.",
    "Review history is descriptive and traceable.",
    "A human decision is never inferred from market evidence.",
    "Historical review records are not converted into automatic invalidation.",
    "The original C161.1 Ledger remains unchanged.",
    "The C161.3 human-review record remains the source of the review decision.",
    "No recommendation is generated.",
    "No Planner task is created.",
    "No broker is connected.",
    "No live order is placed.",
    "No live trading is executed.",
  ];
}

function emptyIndex(): MarketResearchInvalidationHumanReviewIndex {
  return {
    version:
      1,

    entries:
      [],

    updatedAt:
      new Date(0).toISOString(),
  };
}

export async function getMarketResearchInvalidationHumanReviewIndex(): Promise<MarketResearchInvalidationHumanReviewIndex> {
  return (
    await storage.get<MarketResearchInvalidationHumanReviewIndex>(
      INDEX_KEY,
    )
  ) ?? emptyIndex();
}

export async function registerMarketResearchInvalidationHumanReviewIndex(
  review:
    MarketResearchInvalidationHumanReviewRecord,
): Promise<void> {
  const existing =
    await getMarketResearchInvalidationHumanReviewIndex();

  const duplicate =
    existing.entries.some(
      (entry) =>
        entry.reviewId ===
        review.reviewId,
    );

  if (
    duplicate
  ) {
    return;
  }

  const entry:
    MarketResearchInvalidationHumanReviewIndexEntry =
    {
      reviewId:
        review.reviewId,

      ledgerId:
        review.ledgerId,

      symbol:
        review.symbol,

      market:
        review.market,

      status:
        review.status,

      decision:
        review.decision,

      createdAt:
        review.createdAt,

      updatedAt:
        review.updatedAt,

      reviewedAt:
        review.reviewedAt,
    };

  const nextEntries =
    [
      ...existing.entries,
      entry,
    ].slice(
      -500,
    );

  await storage.set(
    INDEX_KEY,
    {
      version:
        1 as const,

      entries:
        nextEntries,

      updatedAt:
        new Date().toISOString(),
    },
  );
}

function toHistoryItem(
  review:
    MarketResearchInvalidationHumanReviewRecord,
): MarketResearchInvalidationHumanReviewHistoryItem {
  return {
    reviewId:
      review.reviewId,

    ledgerId:
      review.ledgerId,

    symbol:
      review.symbol,

    market:
      review.market,

    status:
      review.status,

    decision:
      review.decision,

    rationale:
      review.rationale,

    createdAt:
      review.createdAt,

    updatedAt:
      review.updatedAt,

    reviewedAt:
      review.reviewedAt,

    review,
  };
}

export async function runMarketResearchInvalidationHumanReviewHistory(
  request:
    MarketResearchInvalidationHumanReviewHistoryRequest = {},
): Promise<MarketResearchInvalidationHumanReviewHistoryResult> {
  const startedAt =
    Date.now();

  const ledgerId =
    normalizeText(
      request.ledgerId,
      300,
    );

  const symbol =
    normalizeSymbol(
      request.symbol,
    );

  const market =
    normalizeMarket(
      request.market,
    );

  const status =
    normalizeStatus(
      request.status,
    );

  const limit =
    normalizeLimit(
      request.limit,
    );

  const index =
    await getMarketResearchInvalidationHumanReviewIndex();

  let entries =
    index.entries;

  if (
    ledgerId
  ) {
    entries =
      entries.filter(
        (entry) =>
          entry.ledgerId ===
          ledgerId,
      );
  }

  if (
    symbol
  ) {
    entries =
      entries.filter(
        (entry) =>
          entry.symbol ===
          symbol,
      );
  }

  if (
    market
  ) {
    entries =
      entries.filter(
        (entry) =>
          entry.market ===
          market,
      );
  }

  if (
    status
  ) {
    entries =
      entries.filter(
        (entry) =>
          entry.status ===
          status,
      );
  }

  entries =
    [
      ...entries,
    ]
      .sort(
        (a, b) =>
          b.updatedAt.localeCompare(
            a.updatedAt,
          ),
      )
      .slice(
        0,
        limit,
      );

  const items:
    MarketResearchInvalidationHumanReviewHistoryItem[] =
    [];

  for (
    const entry of entries
  ) {
    const review =
      await getMarketResearchInvalidationHumanReview(
        entry.ledgerId,
      );

    if (
      !review
    ) {
      continue;
    }

    items.push(
      toHistoryItem(
        review,
      ),
    );
  }

  const code =
    items.length > 0
      ? "C161_4_RESEARCH_INVALIDATION_HUMAN_REVIEW_HISTORY_PASS"
      : entries.length === 0
        ? "C161_4_RESEARCH_INVALIDATION_HUMAN_REVIEW_HISTORY_EMPTY"
        : "C161_4_RESEARCH_INVALIDATION_HUMAN_REVIEW_HISTORY_INSUFFICIENT";

  return {
    success:
      items.length > 0,

    code,

    ledgerId:
      ledgerId ||
      null,

    symbol:
      symbol ||
      null,

    market,

    status,

    total:
      items.length,

    items,

    index: {
      version:
        1,

      entryCount:
        index.entries.length,

      updatedAt:
        index.updatedAt,
    },

    humanDecisionRequired:
      true,

    boundary:
      boundary(),

    runtime: {
      name:
        "market-research-invalidation-human-review-history-runtime",

      version:
        "C161.4",

      upstream:
        "C161.3",

      generatedAt:
        new Date().toISOString(),

      latencyMs:
        Date.now() -
        startedAt,
    },

    principles:
      principles(),

    disclaimer:
      "C161.4 provides persistent traceability for explicit C161.3 human-review records. It does not automatically invalidate research, generate recommendations, record decisions on behalf of a human, dispatch Planner work, or execute trading.",
  };
}
