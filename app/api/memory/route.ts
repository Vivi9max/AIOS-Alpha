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
  clearPersistentMemory,
  getPersistentMemory,
  removeAndSaveMemory,
  restoreAndSaveMemory,
  type MemoryRecord,
} from "@/lib/memory/store";

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

function isMemoryRecord(
  value: unknown
): value is MemoryRecord {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return false;
  }

  const item =
    value as Partial<MemoryRecord>;

  return (
    typeof item.id ===
      "number" &&
    (
      item.role ===
        "user" ||
      item.role ===
        "assistant"
    ) &&
    typeof item.content ===
      "string" &&
    typeof item.timestamp ===
      "number"
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
    const items =
      await runWithUserContext(
        identity.userId,
        () =>
          getPersistentMemory()
      );

    const userMessages =
      items.filter(
        (item) =>
          item.role ===
          "user"
      ).length;

    const assistantMessages =
      items.filter(
        (item) =>
          item.role ===
          "assistant"
      ).length;

    return jsonResponse(
      {
        success:
          true,

        items,

        count:
          items.length,

        userMessages,

        assistantMessages,

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
    console.error(
      "[AIOS Memory GET]",
      error
    );

    return jsonResponse(
      {
        success:
          false,

        items:
          [],

        count:
          0,

        userMessages:
          0,

        assistantMessages:
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
            : "Memory loading failed.",

        timestamp:
          Date.now(),
      },
      identity.userId,
      500
    );
  }
}

/**
 * C143.18
 *
 * DELETE without an id keeps the existing "clear all" behaviour.
 *
 * DELETE with { id } removes exactly one conversation record.
 */
export async function DELETE(
  request:
    NextRequest
) {
  const identity =
    resolveAlphaIdentity(
      request
    );

  try {
    let body:
      unknown = null;

    try {
      body =
        await request.json();
    } catch {
      body =
        null;
    }

    const requestedId =
      body &&
      typeof body ===
        "object"
        ? (
            body as {
              id?: unknown;
            }
          ).id
        : undefined;

    if (
      typeof requestedId ===
      "number" &&
      Number.isFinite(
        requestedId
      )
    ) {
      const removed =
        await runWithUserContext(
          identity.userId,
          () =>
            removeAndSaveMemory(
              requestedId
            )
        );

      if (!removed) {
        return jsonResponse(
          {
            success:
              false,

            error:
              "Memory record not found.",

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
          404
        );
      }

      return jsonResponse(
        {
          success:
            true,

          action:
            "deleted",

          deleted:
            removed,

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

    await runWithUserContext(
      identity.userId,
      () =>
        clearPersistentMemory()
    );

    return jsonResponse(
      {
        success:
          true,

        action:
          "cleared",

        items:
          [],

        count:
          0,

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
    console.error(
      "[AIOS Memory DELETE]",
      error
    );

    return jsonResponse(
      {
        success:
          false,

        items:
          [],

        count:
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
            : "Memory operation failed.",

        timestamp:
          Date.now(),
      },
      identity.userId,
      500
    );
  }
}

/**
 * C143.18
 *
 * Undo a previous single-message deletion.
 *
 * The record is accepted only after being validated and is restored
 * inside the authenticated user's own storage scope.
 */
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
      await request.json();

    const action =
      body &&
      typeof body ===
        "object"
        ? (
            body as {
              action?: unknown;
            }
          ).action
        : undefined;

    if (
      action !==
      "undo"
    ) {
      return jsonResponse(
        {
          success:
            false,

          error:
            "Unsupported memory action.",

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

    const record =
      body &&
      typeof body ===
        "object"
        ? (
            body as {
              record?: unknown;
            }
          ).record
        : undefined;

    if (
      !isMemoryRecord(
        record
      )
    ) {
      return jsonResponse(
        {
          success:
            false,

          error:
            "A valid deleted memory record is required.",

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

    const restored =
      await runWithUserContext(
        identity.userId,
        () =>
          restoreAndSaveMemory(
            record
          )
      );

    if (!restored) {
      return jsonResponse(
        {
          success:
            false,

          error:
            "Memory record could not be restored.",

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

    return jsonResponse(
      {
        success:
          true,

        action:
          "restored",

        restored,

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
    console.error(
      "[AIOS Memory POST]",
      error
    );

    return jsonResponse(
      {
        success:
          false,

        error:
          error instanceof Error
            ? error.message
            : "Memory restore failed.",

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
      500
    );
  }
}
