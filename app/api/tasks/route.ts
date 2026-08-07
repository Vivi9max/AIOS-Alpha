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
  buildPlannerTaskControl,
  evaluatePlannerTaskCreation,
  evaluatePlannerTaskStatusChange,
} from "@/lib/planner/execution-control";

import {
  buildPlannerRuntimeIntelligence,
} from "@/lib/planner/runtime-server";

import {
  appendExecutionLedger,
} from "@/lib/planner/execution-ledger";

import type {
  TaskStatus,
} from "@/lib/task/types";

import {
  clearPersistentTasks,
  createPersistentTask,
  deletePersistentTask,
  listPersistentTasks,
  updatePersistentTask,
} from "@/lib/task/server-store";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

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

async function buildTaskControl(
  tasks:
    Awaited<
      ReturnType<
        typeof listPersistentTasks
      >
    >
) {
  const intelligence =
    await buildPlannerRuntimeIntelligence(
      tasks,
      {
        recordHistory:
          false,
      }
    );

  return buildPlannerTaskControl(
    tasks,
    intelligence.adaptiveStrategy
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
    const result =
      await runWithUserContext(
        identity.userId,
        async () => {
          const tasks =
            await listPersistentTasks();

          return {
            tasks,

            control:
              await buildTaskControl(
                tasks
              ),
          };
        }
      );

    const tasks =
      result.tasks;

    const completedCount =
      tasks.filter(
        (task) =>
          task.status ===
          "done"
      ).length;

    const activeCount =
      tasks.filter(
        (task) =>
          task.status !==
          "done"
      ).length;

    return jsonResponse(
      {
        success:
          true,

        tasks,

        count:
          tasks.length,

        activeCount,

        completedCount,

        control:
          result.control,

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

        tasks:
          [],

        count:
          0,

        activeCount:
          0,

        completedCount:
          0,

        control:
          null,

        identity: {
          userId:
            identity.userId,

          isolated:
            true,
        },

        error:
          error instanceof Error
            ? error.message
            : "Tasks loading failed.",

        timestamp:
          Date.now(),
      },
      identity.userId,
      500
    );
  }
}

export async function POST(
  request:
    NextRequest
) {
  const identity =
    resolveAlphaIdentity(
      request
    );

  try {
    const body =
      (await request.json()) as {
        title?:
          unknown;

        description?:
          unknown;
      };

    const title =
      typeof body.title ===
      "string"
        ? body.title
        : "";

    const description =
      typeof body.description ===
      "string"
        ? body.description
        : "";

    const result =
      await runWithUserContext(
        identity.userId,
        async () => {
          const tasks =
            await listPersistentTasks();

          const control =
            await buildTaskControl(
              tasks
            );

          const decision =
            evaluatePlannerTaskCreation(
              control
            );

          if (
            !decision.allowed
          ) {
            await appendExecutionLedger({
              action: "task-create",
              decision: "blocked",
              mode: control.mode,
              code: decision.code,
              message: decision.message,
              taskTitle: title.trim() || null,
              maxConcurrentTasks: control.maxConcurrentTasks,
              doingCount: control.doingCount,
            });

            return {
              allowed:
                false as const,

              control,

              decision,
            };
          }

          const task =
            await createPersistentTask(
              title,
              description
            );

          await appendExecutionLedger({
            action: "task-create",
            decision: "allowed",
            mode: control.mode,
            message: "Planner 允许创建任务。",
            taskId: task.id,
            taskTitle: task.title,
            maxConcurrentTasks: control.maxConcurrentTasks,
            doingCount: control.doingCount,
          });

          const updatedTasks =
            await listPersistentTasks();

          return {
            allowed:
              true as const,

            task,

            control:
              await buildTaskControl(
                updatedTasks
              ),
          };
        }
      );

    if (
      !result.allowed
    ) {
      return jsonResponse(
        {
          success:
            false,

          code:
            result.decision.code,

          error:
            result.decision.message,

          action:
            result.decision.action,

          control:
            result.control,

          identity: {
            userId:
              identity.userId,

            isolated:
              true,
          },

          timestamp:
            Date.now(),
        },
        identity.userId,
        409
      );
    }

    return jsonResponse(
      {
        success:
          true,

        task:
          result.task,

        control:
          result.control,

        identity: {
          userId:
            identity.userId,

          isolated:
            true,
        },

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
            : "Task creation failed.",

        identity: {
          userId:
            identity.userId,

          isolated:
            true,
        },

        timestamp:
          Date.now(),
      },
      identity.userId,
      400
    );
  }
}

export async function PATCH(
  request:
    NextRequest
) {
  const identity =
    resolveAlphaIdentity(
      request
    );

  try {
    const body =
      (await request.json()) as {
        id?:
          unknown;

        title?:
          unknown;

        description?:
          unknown;

        status?:
          unknown;
      };

    const id =
      typeof body.id ===
      "string"
        ? body.id
        : "";

    if (
      !id.trim()
    ) {
      return jsonResponse(
        {
          success:
            false,

          error:
            "Task id is required.",

          timestamp:
            Date.now(),
        },
        identity.userId,
        400
      );
    }

    const status =
      body.status ===
        "todo" ||
      body.status ===
        "doing" ||
      body.status ===
        "done"
        ? (
            body.status as
              TaskStatus
          )
        : undefined;

    const result =
      await runWithUserContext(
        identity.userId,
        async () => {
          const tasks =
            await listPersistentTasks();

          const currentTask =
            tasks.find(
              (task) =>
                task.id ===
                id
            );

          if (
            !currentTask
          ) {
            return {
              found:
                false as const,
            };
          }

          const control =
            await buildTaskControl(
              tasks
            );

          const decision =
            evaluatePlannerTaskStatusChange(
              tasks,
              id,
              status,
              control
            );

          if (
            !decision.allowed
          ) {
            await appendExecutionLedger({
              action: status === "doing" ? "task-start" : "task-update",
              decision: "blocked",
              mode: control.mode,
              code: decision.code,
              message: decision.message,
              taskId: currentTask.id,
              taskTitle: currentTask.title,
              maxConcurrentTasks: control.maxConcurrentTasks,
              doingCount: control.doingCount,
            });

            return {
              found:
                true as const,

              allowed:
                false as const,

              control,

              decision,
            };
          }

          const task =
            await updatePersistentTask(
              id,
              {
                title:
                  typeof body.title ===
                  "string"
                    ? body.title
                    : undefined,

                description:
                  typeof body.description ===
                  "string"
                    ? body.description
                    : undefined,

                status,
              }
            );

          if (task) {
            await appendExecutionLedger({
              action: status === "doing"
                ? "task-start"
                : status === "done"
                  ? "task-complete"
                  : "task-update",
              decision: "allowed",
              mode: control.mode,
              message: status === "done"
                ? "任务已完成。"
                : status === "doing"
                  ? "Planner 允许任务开始执行。"
                  : "任务已更新。",
              taskId: task.id,
              taskTitle: task.title,
              maxConcurrentTasks: control.maxConcurrentTasks,
              doingCount: control.doingCount,
            });
          }

          const updatedTasks =
            await listPersistentTasks();

          return {
            found:
              true as const,

            allowed:
              true as const,

            task,

            control:
              await buildTaskControl(
                updatedTasks
              ),
          };
        }
      );

    if (
      !result.found
    ) {
      return jsonResponse(
        {
          success:
            false,

          error:
            "Task not found.",

          timestamp:
            Date.now(),
        },
        identity.userId,
        404
      );
    }

    if (
      !result.allowed
    ) {
      return jsonResponse(
        {
          success:
            false,

          code:
            result.decision.code,

          error:
            result.decision.message,

          action:
            result.decision.action,

          control:
            result.control,

          timestamp:
            Date.now(),
        },
        identity.userId,
        409
      );
    }

    if (
      !result.task
    ) {
      return jsonResponse(
        {
          success:
            false,

          error:
            "Task not found.",

          timestamp:
            Date.now(),
        },
        identity.userId,
        404
      );
    }

    return jsonResponse(
      {
        success:
          true,

        task:
          result.task,

        control:
          result.control,

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

        error:
          error instanceof Error
            ? error.message
            : "Task update failed.",

        timestamp:
          Date.now(),
      },
      identity.userId,
      500
    );
  }
}

export async function DELETE(
  request:
    NextRequest
) {
  const identity =
    resolveAlphaIdentity(
      request
    );

  try {
    const url =
      new URL(
        request.url
      );

    const id =
      url.searchParams.get(
        "id"
      );

    if (
      !id
    ) {
      await runWithUserContext(
        identity.userId,
        () =>
          clearPersistentTasks()
      );

      return jsonResponse(
        {
          success:
            true,

          cleared:
            true,

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

    const deleted =
      await runWithUserContext(
        identity.userId,
        () =>
          deletePersistentTask(
            id
          )
      );

    if (
      !deleted
    ) {
      return jsonResponse(
        {
          success:
            false,

          error:
            "Task not found.",

          timestamp:
            Date.now(),
        },
        identity.userId,
        404
      );
    }

    return jsonResponse(
      {
        success:
          true,

        deleted:
          true,

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

        error:
          error instanceof Error
            ? error.message
            : "Task deletion failed.",

        timestamp:
          Date.now(),
      },
      identity.userId,
      500
    );
  }
}
