import {
  storage,
} from "@/lib/server-storage";
import {
  listPersistentTasks,
} from "@/lib/task/server-store";
import type {
  Task,
} from "@/lib/task/types";
import type {
  MarketHumanReviewDecision,
  MarketHumanReviewRecord,
  MarketHumanReviewRequest,
  MarketHumanReviewResult,
} from "./market-human-review-types";
import type {
  MarketRegion,
} from "./market-types";
const STORAGE_PREFIX =
  "aios:market:human-review:v1:";
const DISCLAIMER =
  "C147.15 records an explicit human review decision. It does not generate investment advice, automatically execute actions, dispatch Planner development work, or execute trading.";
function normalizeText(
  value: unknown,
  maxLength: number,
): string {
  if (
    typeof value !==
    "string"
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
function isDecision(
  value: unknown,
): value is MarketHumanReviewDecision {
  return (
    value === "acknowledged" ||
    value === "accepted" ||
    value === "rejected" ||
    value === "deferred"
  );
}
function getStorageKey(
  taskId: string,
): string {
  return [
    STORAGE_PREFIX,
    taskId.trim(),
  ].join("");
}
function createReviewId(
  taskId: string,
): string {
  return [
    "C14715",
    taskId,
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 9),
  ].join("-");
}
function parseMarketContext(
  task: Task,
): {
  symbol: string;
  market: MarketRegion | null;
  sourceEventId: string | null;
  reassessmentId: string | null;
  currentVersion: number | null;
} {
  const description =
    task.description ??
    "";
  const symbolMatch =
    description.match(
      /Symbol:\s*([^\s]+)/i,
    );
  const marketMatch =
    description.match(
      /Market:\s*([^\s]+)/i,
    );
  const eventMatch =
    description.match(
      /Event ID:\s*([^\s]+)/i,
    );
  const reassessmentMatch =
    description.match(
      /Reassessment ID:\s*([^\s]+)/i,
    );
  const versionMatch =
    description.match(
      /Current Version:\s*(\d+)/i,
    );
  const rawMarket =
    normalizeText(
      marketMatch?.[1],
      32,
    );
  const market =
    rawMarket === "us" ||
    rawMarket === "hk" ||
    rawMarket === "cn" ||
    rawMarket === "jp" ||
    rawMarket === "global"
      ? (rawMarket as MarketRegion)
      : null;
  const version =
    versionMatch?.[1]
      ? Number(
          versionMatch[1],
        )
      : null;
  return {
    symbol:
      normalizeSymbol(
        symbolMatch?.[1],
      ),
    market,
    sourceEventId:
      normalizeText(
        eventMatch?.[1],
        160,
      ) || null,
    reassessmentId:
      normalizeText(
        reassessmentMatch?.[1],
        160,
      ) || null,
    currentVersion:
      Number.isFinite(version)
        ? version
        : null,
  };
}
async function getExistingReview(
  taskId: string,
): Promise<MarketHumanReviewRecord | null> {
  return (
    (await storage.get<MarketHumanReviewRecord>(
      getStorageKey(taskId),
    )) ?? null
  );
}
function buildBaseResult(
  taskId: string,
  startedAt: number,
): Pick<
  MarketHumanReviewResult,
  | "taskId"
  | "automatedExecutionStarted"
  | "plannerDispatched"
  | "tradingExecuted"
  | "humanDecisionRequired"
  | "runtime"
  | "principles"
  | "disclaimer"
> {
  return {
    taskId,
    automatedExecutionStarted:
      false,
    plannerDispatched:
      false,
    tradingExecuted:
      false,
    humanDecisionRequired:
      true,
    runtime: {
      name:
        "market-human-review-runtime",
      version:
        "C147.15",
      upstream:
        "C147.14",
      generatedAt:
        new Date().toISOString(),
      latencyMs:
        Date.now() -
        startedAt,
    },
    principles: [
      "C147.15 consumes the persistent human-review Task created by C147.14.",
      "Only an explicit human decision is recorded.",
      "The runtime never infers a human decision.",
      "The runtime never converts silence into approval.",
      "The runtime never performs trading.",
      "The runtime never dispatches Planner development work.",
      "Existing review records are immutable for idempotency.",
      "A second decision for the same Task is blocked rather than silently overwritten.",
      "Human review remains mandatory.",
    ],
    disclaimer:
      DISCLAIMER,
  };
}
export async function runMarketHumanReview(
  request: MarketHumanReviewRequest,
): Promise<MarketHumanReviewResult> {
  const startedAt =
    Date.now();
  const taskId =
    normalizeText(
      request?.taskId,
      200,
    );
  const base =
    buildBaseResult(
      taskId,
      startedAt,
    );
  if (
    !taskId ||
    !isDecision(
      request?.decision,
    )
  ) {
    return {
      success: false,
      code:
        "C147_15_HUMAN_REVIEW_INSUFFICIENT",
      action:
        "review-blocked",
      taskFound:
        false,
      review:
        null,
      existingReview:
        null,
      mutationPerformed:
        false,
      ...base,
    };
  }
  const tasks =
    await listPersistentTasks();
  const task =
    tasks.find(
      (item) =>
        item.id ===
        taskId,
    ) ?? null;
  if (!task) {
    return {
      success: false,
      code:
        "C147_15_HUMAN_REVIEW_TASK_NOT_FOUND",
      action:
        "task-not-found",
      taskFound:
        false,
      review:
        null,
      existingReview:
        null,
      mutationPerformed:
        false,
      ...base,
      runtime: {
        ...base.runtime,
        latencyMs:
          Date.now() -
          startedAt,
      },
    };
  }
  const existing =
    await getExistingReview(
      taskId,
    );
  if (existing) {
    return {
      success: false,
      code:
        "C147_15_HUMAN_REVIEW_ALREADY_RECORDED",
      action:
        "review-already-recorded",
      taskFound:
        true,
      review:
        null,
      existingReview:
        existing,
      mutationPerformed:
        false,
      ...base,
      runtime: {
        ...base.runtime,
        latencyMs:
          Date.now() -
          startedAt,
      },
    };
  }
  const context =
    parseMarketContext(
      task,
    );
  if (
    !context.symbol ||
    !context.market
  ) {
    return {
      success: false,
      code:
        "C147_15_HUMAN_REVIEW_BLOCKED",
      action:
        "review-blocked",
      taskFound:
        true,
      review:
        null,
      existingReview:
        null,
      mutationPerformed:
        false,
      ...base,
      runtime: {
        ...base.runtime,
        latencyMs:
          Date.now() -
          startedAt,
      },
    };
  }
  const now =
    new Date().toISOString();
  const review:
    MarketHumanReviewRecord = {
    reviewId:
      createReviewId(
        taskId,
      ),
    taskId,
    symbol:
      context.symbol,
    market:
      context.market,
    taskTitle:
      task.title,
    decision:
      request.decision,
    reviewerNote:
      normalizeText(
        request.reviewerNote,
        2000,
      ),
    sourceEventId:
      context.sourceEventId,
    reassessmentId:
      context.reassessmentId,
    currentVersion:
      context.currentVersion,
    humanDecisionRequired:
      true,
    automatedExecutionStarted:
      false,
    plannerDispatched:
      false,
    tradingExecuted:
      false,
    createdAt:
      now,
    updatedAt:
      now,
  };
  await storage.set(
    getStorageKey(
      taskId,
    ),
    review,
  );
  return {
    success: true,
    code:
      "C147_15_HUMAN_REVIEW_PASS",
    action:
      "review-recorded",
    taskFound:
      true,
    review,
    existingReview:
      null,
    mutationPerformed:
      true,
    ...base,
    runtime: {
      ...base.runtime,
      latencyMs:
        Date.now() -
        startedAt,
    },
  };
}
export async function getMarketHumanReview(
  taskId: string,
): Promise<MarketHumanReviewRecord | null> {
  const normalized =
    normalizeText(
      taskId,
      200,
    );
  if (!normalized) {
    return null;
  }
  return getExistingReview(
    normalized,
  );
}
/**
 * Internal regression cleanup.
 *
 * This is intentionally not exposed through the public
 * Human Review API. It exists only so C147.15.1 can remove
 * its temporary Founder regression record after verification.
 */
export async function deleteMarketHumanReview(
  taskId: string,
): Promise<void> {
  const normalized =
    normalizeText(
      taskId,
      200,
    );
  if (!normalized) {
    return;
  }
  await storage.delete(
    getStorageKey(
      normalized,
    ),
  );
}
