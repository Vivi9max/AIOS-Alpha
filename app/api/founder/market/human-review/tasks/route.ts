import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

import {
  runWithUserContext,
} from "@/lib/runtime/request-context";

import {
  listPersistentTasks,
} from "@/lib/task/server-store";

import type {
  Task,
} from "@/lib/task/types";

import {
  getMarketHumanReview,
} from "@/lib/runtime/market/market-human-review-runtime";

import type {
  MarketHumanReviewDecision,
} from "@/lib/runtime/market/market-human-review-types";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

const STAGE =
  "C167.5.25";

const CODE =
  "C167_5_25_MARKET_HUMAN_REVIEW_TASK_DISCOVERY";

const MAX_RESULTS =
  50;

type SupportedMarket =
  | "us"
  | "hk"
  | "cn"
  | "jp"
  | "global";

type ReviewDiscoveryStatus =
  | "pending"
  | MarketHumanReviewDecision;

interface MarketReviewTaskCandidate {
  task: Task;
  symbol: string;
  market: SupportedMarket;
  reviewStatus: ReviewDiscoveryStatus;
  reviewId: string | null;
  selectable: boolean;
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): NextResponse {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control":
          "no-store",
        "Content-Type":
          "application/json; charset=utf-8",
      },
    },
  );
}

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

function parseMarketContext(
  task: Task,
): {
  symbol: string;
  market:
    | SupportedMarket
    | null;
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

  const rawMarket =
    normalizeText(
      marketMatch?.[1],
      32,
    ).toLowerCase();

  const market =
    rawMarket === "us" ||
    rawMarket === "hk" ||
    rawMarket === "cn" ||
    rawMarket === "jp" ||
    rawMarket === "global"
      ? (
          rawMarket as SupportedMarket
        )
      : null;

  return {
    symbol:
      normalizeSymbol(
        symbolMatch?.[1],
      ),
    market,
  };
}

function isMarketReviewCandidate(
  task: Task,
): boolean {
  const context =
    parseMarketContext(
      task,
    );

  if (
    !context.symbol ||
    !context.market
  ) {
    return false;
  }

  const title =
    task.title.toLowerCase();

  const description =
    (
      task.description ??
      ""
    ).toLowerCase();

  const reviewSignals = [
    "human review",
    "human-review",
    "market review",
    "market-review",
    "reassessment",
    "investment review",
    "risk review",
  ];

  return reviewSignals.some(
    (signal) =>
      title.includes(signal) ||
      description.includes(signal),
  );
}

async function discoverTasks(): Promise<
  MarketReviewTaskCandidate[]
> {
  const tasks =
    await listPersistentTasks();

  const candidates =
    tasks
      .filter(
        (task) =>
          task.status !==
          "done",
      )
      .filter(
        isMarketReviewCandidate,
      );

  const results =
    await Promise.all(
      candidates.map(
        async (
          task,
        ): Promise<
          MarketReviewTaskCandidate | null
        > => {
          const context =
            parseMarketContext(
              task,
            );

          if (
            !context.symbol ||
            !context.market
          ) {
            return null;
          }

          const review =
            await getMarketHumanReview(
              task.id,
            );

          if (review) {
            return {
              task,
              symbol:
                review.symbol ||
                context.symbol,
              market:
                review.market as SupportedMarket,
              reviewStatus:
                review.decision,
              reviewId:
                review.reviewId,
              selectable:
                false,
            };
          }

          return {
            task,
            symbol:
              context.symbol,
            market:
              context.market,
            reviewStatus:
              "pending" as const,
            reviewId:
              null,
            selectable:
              true,
          };
        },
      ),
    );

  return results
    .filter(
      (
        item,
      ): item is MarketReviewTaskCandidate =>
        item !== null,
    )
    .sort(
      (a, b) =>
        b.task.updatedAt -
        a.task.updatedAt,
    )
    .slice(
      0,
      MAX_RESULTS,
    );
}

export async function GET(
  request: NextRequest,
) {
  if (
    !isFounderRequest(
      request,
    )
  ) {
    return jsonResponse(
      {
        success:
          false,
        code:
          "FOUNDER_ACCESS_REQUIRED",
        error:
          "Founder access is required.",
      },
      401,
    );
  }

  const identity =
    resolveAlphaIdentity(
      request,
    );

  try {
    const result =
      await runWithUserContext(
        identity.userId,
        async () => {
          const discovered =
            await discoverTasks();

          const selectable =
            discovered.filter(
              (item) =>
                item.selectable,
            );

          return {
            discovered,
            selectable,
          };
        },
      );

    return jsonResponse({
      success:
        true,

      code:
        CODE,

      stage:
        STAGE,

      identity: {
        userId:
          identity.userId,
        isolated:
          true,
      },

      taskDiscovery: {
        source:
          "C147.14-persistent-task-store",

        reviewRuntime:
          "C147.15-market-human-review-runtime",

        total:
          result.discovered.length,

        selectable:
          result.selectable.length,

        maxResults:
          MAX_RESULTS,
      },

      tasks:
        result.discovered.map(
          (item) => ({
            taskId:
              item.task.id,

            title:
              item.task.title,

            description:
              item.task.description ??
              "",

            status:
              item.task.status,

            createdAt:
              item.task.createdAt,

            updatedAt:
              item.task.updatedAt,

            symbol:
              item.symbol,

            market:
              item.market,

            reviewStatus:
              item.reviewStatus,

            reviewId:
              item.reviewId,

            selectable:
              item.selectable,
          }),
        ),

      selectableTasks:
        result.selectable.map(
          (item) => ({
            taskId:
              item.task.id,

            title:
              item.task.title,

            symbol:
              item.symbol,

            market:
              item.market,

            status:
              item.task.status,

            reviewStatus:
              item.reviewStatus,

            selectable:
              true,
          }),
        ),

      policy: {
        manualTaskIdStillSupported:
          true,

        automaticDiscovery:
          true,

        userScopeIsolation:
          true,

        completedTasksExcluded:
          true,

        existingReviewExcluded:
          true,

        explicitHumanDecisionRequired:
          true,

        automaticApproval:
          false,

        tradingExecution:
          false,
      },

      safetyBoundary: {
        taskDiscoveryOnly:
          true,

        humanReviewMutation:
          false,

        orderExecution:
          false,

        liveTrading:
          false,

        plannerDispatch:
          false,
      },

      runtime: {
        name:
          "market-human-review-task-discovery",

        version:
          STAGE,

        upstream:
          "C147.14 + C147.15",

        generatedAt:
          new Date().toISOString(),
      },
    });
  } catch (error) {
    return jsonResponse(
      {
        success:
          false,

        code:
          "C167_5_25_MARKET_HUMAN_REVIEW_TASK_DISCOVERY_FAILED",

        stage:
          STAGE,

        identity: {
          userId:
            identity.userId,

          isolated:
            true,
        },

        error:
          error instanceof Error
            ? error.message
            : "Market human review task discovery failed.",

        safetyBoundary: {
          taskDiscoveryOnly:
            true,

          tradingExecution:
            false,

          liveTrading:
            false,
        },
      },
      500,
    );
  }
}
