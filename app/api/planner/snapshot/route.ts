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
  listPersistentTasks,
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
    const planner =
      await runWithUserContext(
        identity.userId,
        async () => {
          const tasks =
            await listPersistentTasks();

          return buildPlannerSnapshot(
            tasks
          );
        }
      );

    return jsonResponse(
      {
        success:
          true,

        planner,

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