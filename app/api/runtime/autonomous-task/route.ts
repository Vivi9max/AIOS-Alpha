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

import {
  listPersistentTasks,
} from "@/lib/task/server-store";

import {
  listOutcomes,
} from "@/lib/outcome/store";

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
 * Runtime verification endpoint.
 *
 * GET:
 * Read-only health/state inspection.
 * It MUST NOT execute an autonomous task.
 *
 * POST:
 * Execute exactly one bounded autonomous lifecycle
 * through the existing Safety Gate and verification path.
 */
export async function GET(
  request: NextRequest,
) {
  const identity =
    resolveAlphaIdentity(
      request,
    );

  try {
    const state =
      await runWithUserContext(
        identity.userId,
        async () => {
          const [
            tasks,
            outcomes,
          ] = await Promise.all([
            listPersistentTasks(),
            listOutcomes(),
          ]);

          const doing =
            tasks.filter(
              (task) =>
                task.status ===
                "doing",
            );

          const todo =
            tasks.filter(
              (task) =>
                task.status ===
                "todo",
            );

          const done =
            tasks.filter(
              (task) =>
                task.status ===
                "done",
            );

          const activeOutcomes =
            outcomes.filter(
              (outcome) =>
                outcome.status ===
                  "active" ||
                outcome.status ===
                  "blocked",
            );

          return {
            tasks: {
              total:
                tasks.length,
              doing:
                doing.length,
              todo:
                todo.length,
              done:
                done.length,
            },

            outcomes: {
              total:
                outcomes.length,
              active:
                activeOutcomes.length,
            },

            safetyBoundary: {
              singleDoingTask:
                doing.length <= 1,
              currentlyBusy:
                doing.length > 0,
            },

            autonomousExecution: {
              endpoint:
                "/api/runtime/autonomous-task",
              method:
                "POST",
              bounded:
                true,
              verification:
                "autonomous-loop-regression",
            },
          };
        },
      );

    return jsonResponse({
      success: true,

      service:
        "AIOS Autonomous Runtime",

      status:
        "ready",

      mode:
        "read-only",

      identity: {
        userId:
          identity.userId,
        isolated:
          true,
      },

      state,

      timestamp:
        Date.now(),
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,

        service:
          "AIOS Autonomous Runtime",

        status:
          "error",

        mode:
          "read-only",

        error:
          error instanceof Error
            ? error.message
            : "Autonomous runtime state inspection failed.",

        identity: {
          userId:
            identity.userId,
          isolated:
            true,
        },

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
      body =
        null;
    }

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
      status,
    );
  } catch (error) {
    return jsonResponse(
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
      500,
    );
  }
}
