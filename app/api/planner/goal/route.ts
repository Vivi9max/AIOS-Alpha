import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  AIOS_USER_COOKIE,
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

import {
  parseGoal,
} from "@/lib/planner/goal-parser";

import {
  runWithUserContext,
} from "@/lib/runtime/request-context";

import {
  createPersistentTask,
  findDuplicateActiveTask,
  listPersistentTasks,
} from "@/lib/task/server-store";

import type {
  Task,
} from "@/lib/task/types";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

interface GoalRequestBody {
  goal?:
    unknown;

  materialize?:
    unknown;
}

interface MaterializedTask {
  id:
    string;

  title:
    string;

  status:
    Task["status"];

  created:
    boolean;
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

  return jsonResponse(
    {
      success:
        true,

      goalParser: {
        name:
          "AIOS Goal Parser",

        version:
          "1.0",

        status:
          "online",

        capabilities: [
          "goal-normalization",
          "goal-category-detection",
          "mission-generation",
          "task-decomposition",
          "success-signal-generation",
          "task-materialization",
        ],
      },

      usage: {
        method:
          "POST",

        body: {
          goal:
            "我要上线 AIOS Alpha",

          materialize:
            true,
        },
      },

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
}

export async function POST(
  request:
    NextRequest
) {
  const identity =
    resolveAlphaIdentity(
      request
    );

  const startedAt =
    Date.now();

  try {
    const body =
      (await request.json()) as
        GoalRequestBody;

    const parsedGoal =
      parseGoal(
        body.goal
      );

    const materialize =
      body.materialize ===
        undefined ||
      body.materialize ===
        true;

    const workflow =
      await runWithUserContext(
        identity.userId,
        async () => {
          if (
            !materialize
          ) {
            return {
              materialized:
                false,

              created:
                0,

              reused:
                0,

              tasks:
                [] as
                  MaterializedTask[],
            };
          }

          const taskResults:
            MaterializedTask[] =
              [];

          for (
            const task of
            parsedGoal.tasks
          ) {
            const duplicate =
              await findDuplicateActiveTask(
                task.title
              );

            if (
              duplicate
            ) {
              taskResults.push({
                id:
                  duplicate.id,

                title:
                  duplicate.title,

                status:
                  duplicate.status,

                created:
                  false,
              });

              continue;
            }

            const createdTask =
              await createPersistentTask(
                task.title,
                [
                  task.description,
                  "",
                  `Mission: ${parsedGoal.mission}`,
                  `Goal category: ${parsedGoal.category}`,
                  `Execution order: ${task.order}`,
                ].join(
                  "\n"
                )
              );

            taskResults.push({
              id:
                createdTask.id,

              title:
                createdTask.title,

              status:
                createdTask.status,

              created:
                true,
            });
          }

          return {
            materialized:
              true,

            created:
              taskResults.filter(
                (task) =>
                  task.created
              ).length,

            reused:
              taskResults.filter(
                (task) =>
                  !task.created
              ).length,

            tasks:
              taskResults,
          };
        }
      );

    const currentTasks =
      await runWithUserContext(
        identity.userId,
        () =>
          listPersistentTasks()
      );

    return jsonResponse(
      {
        success:
          true,

        parser:
          "AIOS Goal Parser",

        goal:
          parsedGoal,

        workflow,

        planner: {
          state:
            currentTasks.some(
              (task) =>
                task.status ===
                "doing"
            )
              ? "executing"
              : currentTasks.some(
                    (task) =>
                      task.status ===
                      "todo"
                  )
                ? "ready"
                : "idle",

          taskCount:
            currentTasks.length,

          activeTaskCount:
            currentTasks.filter(
              (task) =>
                task.status !==
                "done"
            ).length,

          completedTaskCount:
            currentTasks.filter(
              (task) =>
                task.status ===
                "done"
            ).length,
        },

        identity: {
          userId:
            identity.userId,

          isolated:
            true,
        },

        latencyMs:
          Date.now() -
          startedAt,

        timestamp:
          Date.now(),
      },
      identity.userId,
      201
    );
  } catch (error) {
    return jsonResponse(
      {
        success:
          false,

        error:
          error instanceof Error
            ? error.message
            : "Goal parsing failed.",

        code:
          "GOAL_PARSER_ERROR",

        identity: {
          userId:
            identity.userId,

          isolated:
            true,
        },

        latencyMs:
          Date.now() -
          startedAt,

        timestamp:
          Date.now(),
      },
      identity.userId,
      400
    );
  }
}