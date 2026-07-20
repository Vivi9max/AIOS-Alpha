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

export async function GET(
  request:
    NextRequest
) {
  const identity =
    resolveAlphaIdentity(
      request
    );

  try {
    const tasks =
      await runWithUserContext(
        identity.userId,
        () =>
          listPersistentTasks()
      );

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

    const task =
      await runWithUserContext(
        identity.userId,
        () =>
          createPersistentTask(
            title,
            description
          )
      );

    return jsonResponse(
      {
        success:
          true,

        task,

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

    const task =
      await runWithUserContext(
        identity.userId,
        () =>
          updatePersistentTask(
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
          )
      );

    if (
      !task
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

        task,

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