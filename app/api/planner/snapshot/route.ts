import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  AIOS_USER_COOKIE,
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

import {
  runWithUserContext,
} from "@/lib/runtime/request-context";

import {
  buildPlannerSnapshot,
} from "@/lib/planner/engine";

import {
  buildPlannerLearningSnapshot,
} from "@/lib/planner/learning";

import {
  buildPlannerAdaptiveStrategy,
  buildPlannerLearningHistory,
  MAX_PLANNER_LEARNING_HISTORY,
  toPlannerHistoryPoint,
} from "@/lib/planner/runtime";

import type {
  PlannerLearningHistory,
} from "@/lib/planner/runtime";

import {
  storage,
} from "@/lib/server-storage";

import {
  createUserStorageKey,
} from "@/lib/storage/data-scope";

import {
  listPersistentTasks,
} from "@/lib/task/server-store";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function learningHistoryKey(): string {
  return createUserStorageKey(
    "planner-learning-history"
  );
}

async function recordLearningHistory(
  learning: Parameters<typeof toPlannerHistoryPoint>[0]
): Promise<PlannerLearningHistory> {
  const current =
    toPlannerHistoryPoint(learning);
  const stored =
    await storage.get<unknown[]>(
      learningHistoryKey()
    );
  const history = buildPlannerLearningHistory(current, stored);

  if (history.changed) {
    await storage.set(
      learningHistoryKey(),
      history.history.slice(-MAX_PLANNER_LEARNING_HISTORY)
    );
  }
  return history.result;
}

function applyIdentityCookie(
  response:
    NextResponse,

  userId:
    string
): NextResponse {
  response.cookies.set(
    AIOS_USER_COOKIE,
    userId,
    {
      httpOnly:
        true,

      sameSite:
        "lax",

      secure:
        process.env
          .NODE_ENV ===
        "production",

      path:
        "/",

      maxAge:
        60 *
        60 *
        24 *
        365,
    }
  );

  return response;
}

function jsonResponse(
  body:
    Record<
      string,
      unknown
    >,

  userId:
    string,

  status =
    200
): NextResponse {
  const response =
    NextResponse.json(
      body,
      {
        status,

        headers: {
          "Cache-Control":
            "no-store",

          "Content-Type":
            "application/json; charset=utf-8",
        },
      }
    );

  return applyIdentityCookie(
    response,
    userId
  );
}

export async function GET(
  request:
    NextRequest
) {
  const identity =
    resolveAlphaIdentity(
      request
    );

  try {
    const snapshot =
      await runWithUserContext(
        identity.userId,
        async () => {
          const tasks =
            await listPersistentTasks();

          const generatedAt =
            Date.now();

          const learning =
            buildPlannerLearningSnapshot(
              tasks,
              generatedAt
            );

          const learningHistory =
            await recordLearningHistory(
              learning
            );

          const adaptiveStrategy =
            buildPlannerAdaptiveStrategy(
              learning,
              learningHistory
            );

          return {
            planner:
              buildPlannerSnapshot(
                tasks
              ),

            learning,

            learningHistory,

            adaptiveStrategy,

            taskCount:
              tasks.length,

            generatedAt,
          };
        }
      );

    return jsonResponse(
      {
        success:
          true,

        planner:
          snapshot.planner,

        learning:
          snapshot.learning,

        learningHistory:
          snapshot.learningHistory,

        adaptiveStrategy:
          snapshot.adaptiveStrategy,

        taskCount:
          snapshot.taskCount,

        generatedAt:
          snapshot.generatedAt,

        identity: {
          userId:
            identity.userId,

          isolated:
            true,
        },

        timestamp:
          Date.now(),
      },
      identity.userId
    );
  } catch (error) {
    return jsonResponse(
      {
        success:
          false,

        planner:
          null,

        learning:
          null,

        learningHistory:
          null,

        adaptiveStrategy:
          null,

        taskCount:
          0,

        identity: {
          userId:
            identity.userId,

          isolated:
            true,
        },

        error:
          error instanceof Error
            ? error.message
            : "Planner generation failed.",

        timestamp:
          Date.now(),
      },
      identity.userId,
      500
    );
  }
}
