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

export async function DELETE(
  request:
    NextRequest
) {
  const identity =
    resolveAlphaIdentity(
      request
    );

  try {
    await runWithUserContext(
      identity.userId,
      () =>
        clearPersistentMemory()
    );

    return jsonResponse(
      {
        success:
          true,

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
            : "Memory clearing failed.",

        timestamp:
          Date.now(),
      },
      identity.userId,
      500
    );
  }
}