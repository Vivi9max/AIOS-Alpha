import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function jsonResponse(
  payload: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(
    payload,
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

/**
 * C142.11
 *
 * Autonomous Runtime verification route.
 *
 * IMPORTANT:
 * - GET must remain dependency-light.
 * - GET must never execute autonomous work.
 * - Heavy Runtime / Storage modules are loaded lazily.
 *
 * This prevents an import-time Runtime/Storage failure
 * from making the verification endpoint appear blank.
 */

export async function GET(
  request: NextRequest,
) {
  try {
    const identity =
      resolveAlphaIdentity(
        request,
      );

    return jsonResponse({
      success: true,

      service:
        "AIOS Autonomous Runtime",

      status:
        "online",

      mode:
        "read-only",

      probe:
        "C142.11_RUNTIME_ROUTE",

      method:
        "GET",

      execution:
        {
          executed:
            false,

          bounded:
            true,
        },

      identity:
        {
          userId:
            identity.userId,

          isolated:
            true,
        },

      timestamp:
        Date.now(),
    });
  } catch (error) {
    return jsonResponse(
      {
        success:
          false,

        service:
          "AIOS Autonomous Runtime",

        status:
          "route-error",

        mode:
          "read-only",

        probe:
          "C142.11_RUNTIME_ROUTE",

        error:
          error instanceof Error
            ? error.message
            : "Runtime route initialization failed.",

        timestamp:
          Date.now(),
      },
      500,
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const identity =
      resolveAlphaIdentity(
        request,
      );

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
      body =
        null;
    }

    /*
     * Lazy imports:
     *
     * These modules are intentionally NOT loaded
     * while the GET verification route starts.
     */
    const [
      { runWithUserContext },
      { runAutonomousTaskLifecycle },
    ] = await Promise.all([
      import(
        "@/lib/runtime/request-context"
      ),
      import(
        "@/lib/runtime/autonomous-task-lifecycle"
      ),
    ]);

    const result =
      await runWithUserContext(
        identity.userId,
        () =>
          runAutonomousTaskLifecycle(
            {
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
            },
          ),
      );

    const status =
      result.status ===
      "completed"
        ? 200
        : result.status ===
            "blocked"
          ? 409
          : 500;

    return jsonResponse(
      {
        success:
          result.success,

        service:
          "AIOS Autonomous Runtime",

        lifecycle:
          result,

        identity:
          {
            userId:
              identity.userId,

            isolated:
              true,
          },

        timestamp:
          Date.now(),
      },
      status,
    );
  } catch (error) {
    return jsonResponse(
      {
        success:
          false,

        service:
          "AIOS Autonomous Runtime",

        status:
          "error",

        error:
          error instanceof Error
            ? error.message
            : "Autonomous task lifecycle failed.",

        identity:
          (() => {
            try {
              const identity =
                resolveAlphaIdentity(
                  request,
                );

              return {
                userId:
                  identity.userId,

                isolated:
                  true,
              };
            } catch {
              return {
                isolated:
                  true,
              };
            }
          })(),

        timestamp:
          Date.now(),
      },
      500,
    );
  }
}
