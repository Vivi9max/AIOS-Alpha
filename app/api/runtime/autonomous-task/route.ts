import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

import {
  runWithUserContext,
} from "@/lib/runtime/request-context";

import {
  runAutonomousTaskLifecycle,
} from "@/lib/runtime/autonomous-task-lifecycle";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

export async function POST(
  request: NextRequest,
) {
  const identity =
    resolveAlphaIdentity(
      request,
    );

  try {
    let body:
      | Record<string, unknown>
      | null =
      null;

    try {
      body =
        (await request.json()) as Record<
          string,
          unknown
        >;
    } catch {
      body = null;
    }

    const result =
      await runWithUserContext(
        identity.userId,
        () =>
          runAutonomousTaskLifecycle({
            title:
              typeof body?.title ===
              "string"
                ? body.title
                : undefined,

            description:
              typeof body?.description ===
              "string"
                ? body.description
                : undefined,

            successCriteria:
              typeof body?.successCriteria ===
              "string"
                ? body.successCriteria
                : undefined,
          }),
      );

    const status =
      result.status ===
      "completed"
        ? 200
        : result.status ===
            "blocked"
          ? 409
          : 500;

    return NextResponse.json(
      {
        success:
          result.success,

        lifecycle:
          result,

        identity: {
          userId:
            identity.userId,

          isolated:
            true,
        },

        timestamp:
          Date.now(),
      },
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
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Autonomous task lifecycle failed.",

        identity: {
          userId:
            identity.userId,

          isolated:
            true,
        },

        timestamp:
          Date.now(),
      },
      {
        status: 500,

        headers: {
          "Cache-Control":
            "no-store",

          "Content-Type":
            "application/json; charset=utf-8",
        },
      },
    );
  }
}
