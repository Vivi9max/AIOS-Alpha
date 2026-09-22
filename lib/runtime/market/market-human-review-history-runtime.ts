import {
  listPersistentTasks,
} from "@/lib/task/server-store";

import {
  storage,
} from "@/lib/server-storage";

import type {
  MarketRegion,
} from "./market-types";

import type {
  MarketHumanReviewDecision,
  MarketHumanReviewRecord,
} from "./market-human-review-types";

import {
  toMarketHumanReviewHistoryItem,
} from "./market-human-review-history-types";

import type {
  MarketHumanReviewHistoryRequest,
  MarketHumanReviewHistoryResult,
} from "./market-human-review-history-types";

const STORAGE_PREFIX =
  "aios:market:human-review:v1:";

const DEFAULT_LIMIT =
  20;

const MAX_LIMIT =
  100;

function normalizeSymbol(
  value: unknown,
): string {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .trim()
    .toUpperCase()
    .slice(0, 32);
}

function isMarket(
  value: unknown,
): value is MarketRegion {
  return (
    value === "us" ||
    value === "hk" ||
    value === "cn" ||
    value === "jp" ||
    value === "global"
  );
}

function isDecision(
  value: unknown,
): value is MarketHumanReviewDecision {
  return (
    value ===
      "acknowledged" ||
    value ===
      "accepted" ||
    value ===
      "rejected" ||
    value ===
      "deferred"
  );
}

function normalizeLimit(
  value: unknown,
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value)
  ) {
    return DEFAULT_LIMIT;
  }

  return Math.max(
    1,
    Math.min(
      Math.floor(value),
      MAX_LIMIT,
    ),
  );
}

function reviewStorageKey(
  taskId: string,
): string {
  return [
    STORAGE_PREFIX,
    taskId.trim(),
  ].join("");
}

async function readReview(
  taskId: string,
): Promise<MarketHumanReviewRecord | null> {
  if (!taskId.trim()) {
    return null;
  }

  return (
    await storage.get<MarketHumanReviewRecord>(
      reviewStorageKey(
        taskId,
      ),
    )
  ) ?? null;
}

function sortReviews(
  reviews: MarketHumanReviewRecord[],
): MarketHumanReviewRecord[] {
  return reviews.sort(
    (a, b) => {
      const aTime =
        Date.parse(
          a.createdAt,
        );

      const bTime =
        Date.parse(
          b.createdAt,
        );

      if (
        Number.isFinite(aTime) &&
        Number.isFinite(bTime)
      ) {
        return (
          bTime -
          aTime
        );
      }

      return (
        b.createdAt.localeCompare(
          a.createdAt,
        )
      );
    },
  );
}

function matchesFilter(
  review: MarketHumanReviewRecord,
  request: MarketHumanReviewHistoryRequest,
): boolean {
  const symbol =
    normalizeSymbol(
      request.symbol,
    );

  if (
    symbol &&
    review.symbol !==
      symbol
  ) {
    return false;
  }

  if (
    request.market &&
    review.market !==
      request.market
  ) {
    return false;
  }

  if (
    request.decision &&
    review.decision !==
      request.decision
  ) {
    return false;
  }

  return true;
}

function emptyResult(
  startedAt: number,
  request: MarketHumanReviewHistoryRequest,
  code:
    | "C147_16_HUMAN_REVIEW_HISTORY_EMPTY"
    | "C147_16_HUMAN_REVIEW_HISTORY_INSUFFICIENT",
): MarketHumanReviewHistoryResult {
  const symbol =
    normalizeSymbol(
      request.symbol,
    );

  const market =
    isMarket(
      request.market,
    )
      ? request.market
      : null;

  const decision =
    isDecision(
      request.decision,
    )
      ? request.decision
      : null;

  return {
    success:
      code ===
      "C147_16_HUMAN_REVIEW_HISTORY_EMPTY",

    code,

    readOnly:
      true,

    historyFound:
      false,

    symbol:
      symbol || null,

    market,

    decision,

    totalReviews:
      0,

    returnedReviews:
      0,

    items: [],

    sourceTasksScanned:
      0,

    sourceReviewsFound:
      0,

    principles: [
      "C147.16 is a read-only audit layer over persisted C147.15 human-review records.",
      "Historical records are never overwritten by the query.",
      "No new human decision is inferred from historical records.",
      "Historical review data does not become an investment recommendation.",
      "Human review remains mandatory.",
      "No Planner dispatch is performed.",
      "No trading execution is performed.",
    ],

    humanDecisionRequired:
      true,

    automatedExecutionStarted:
      false,

    plannerDispatched:
      false,

    tradingExecuted:
      false,

    runtime: {
      name:
        "market-human-review-history-runtime",

      version:
        "C147.16",

      upstream:
        "C147.15",

      generatedAt:
        new Date().toISOString(),

      latencyMs:
        Date.now() -
        startedAt,
    },

    disclaimer:
      "C147.16 is a read-only professional market-review audit layer. It retrieves persisted human decisions and does not rank securities, predict returns, provide personalized investment advice, dispatch Planner work, or execute trades.",
  };
}

export async function runMarketHumanReviewHistory(
  request:
    MarketHumanReviewHistoryRequest = {},
): Promise<MarketHumanReviewHistoryResult> {
  const startedAt =
    Date.now();

  const limit =
    normalizeLimit(
      request.limit,
    );

  const includeNotes =
    request.includeNotes ===
    true;

  const symbol =
    normalizeSymbol(
      request.symbol,
    );

  const market =
    request.market;

  const decision =
    request.decision;

  if (
    request.market !==
      undefined &&
    request.market !==
      null &&
    !isMarket(
      request.market,
    )
  ) {
    return emptyResult(
      startedAt,
      request,
      "C147_16_HUMAN_REVIEW_HISTORY_INSUFFICIENT",
    );
  }

  if (
    request.decision !==
      undefined &&
    request.decision !==
      null &&
    !isDecision(
      request.decision,
    )
  ) {
    return emptyResult(
      startedAt,
      request,
      "C147_16_HUMAN_REVIEW_HISTORY_INSUFFICIENT",
    );
  }

  const tasks =
    await listPersistentTasks();

  const reviews:
    MarketHumanReviewRecord[] =
    [];

  for (
    const task of tasks
  ) {
    const review =
      await readReview(
        task.id,
      );

    if (!review) {
      continue;
    }

    if (
      !matchesFilter(
        review,
        request,
      )
    ) {
      continue;
    }

    reviews.push(
      review,
    );
  }

  const sorted =
    sortReviews(
      reviews,
    );

  const limited =
    sorted.slice(
      0,
      limit,
    );

  if (
    reviews.length ===
    0
  ) {
    return {
      ...emptyResult(
        startedAt,
        request,
        "C147_16_HUMAN_REVIEW_HISTORY_EMPTY",
      ),

      sourceTasksScanned:
        tasks.length,

      sourceReviewsFound:
        0,
    };
  }

  return {
    success:
      true,

    code:
      "C147_16_HUMAN_REVIEW_HISTORY_PASS",

    readOnly:
      true,

    historyFound:
      true,

    symbol:
      symbol || null,

    market:
      isMarket(
        market,
      )
        ? market
        : null,

    decision:
      isDecision(
        decision,
      )
        ? decision
        : null,

    totalReviews:
      reviews.length,

    returnedReviews:
      limited.length,

    items:
      limited.map(
        (
          review,
        ) =>
          toMarketHumanReviewHistoryItem(
            review,
            includeNotes,
          ),
      ),

    sourceTasksScanned:
      tasks.length,

    sourceReviewsFound:
      reviews.length,

    principles: [
      "C147.16 provides a persistent read-only audit view over C147.15 human-review decisions.",
      "Review history is filtered by explicit market identity and security identity when supplied.",
      "Historical records remain immutable through this query path.",
      "The latest review is not treated as a recommendation or trading signal.",
      "Decision changes are visible as historical evidence rather than automatically interpreted as buy or sell instructions.",
      "Review records remain connected to source Task, Event ID, Reassessment ID, and decision version when available.",
      "Human review remains mandatory.",
      "No Planner development dispatch occurs.",
      "No automated execution occurs.",
      "No trading execution occurs.",
    ],

    humanDecisionRequired:
      true,

    automatedExecutionStarted:
      false,

    plannerDispatched:
      false,

    tradingExecuted:
      false,

    runtime: {
      name:
        "market-human-review-history-runtime",

      version:
        "C147.16",

      upstream:
        "C147.15",

      generatedAt:
        new Date().toISOString(),

      latencyMs:
        Date.now() -
        startedAt,
    },

    disclaimer:
      "C147.16 is a read-only professional market-review audit layer. It preserves the distinction between market evidence, reassessment, human judgment, and execution. It does not rank securities, predict returns, provide personalized investment advice, or execute trades.",
  };
}
