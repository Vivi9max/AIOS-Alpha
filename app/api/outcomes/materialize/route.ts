import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  AIOS_USER_COOKIE,
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

import {
  getOutcome,
  updateOutcome,
  updateOutcomeMilestone,
} from "@/lib/outcome/store";

import {
  runWithUserContext,
} from "@/lib/runtime/request-context";

import {
  createPersistentTask,
  findDuplicateActiveTask,
} from "@/lib/task/server-store";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

interface MaterializeRequestBody {
  outcomeId?:
    unknown;
}

interface MaterializedTaskResult {
  milestoneId:
    string;

  milestoneTitle:
    string;

  taskId:
    string;

  taskTitle:
    string;

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

      engine: {
        name:
          "Outcome Materialization Engine",

        version:
          "1.0",

        status:
          "online",

        flow: [
          "outcome",
          "milestones",
          "tasks",
          "planner",
          "dashboard",
        ],
      },

      usage: {
        method:
          "POST",

        body: {
          outcomeId:
            "outcome-id",
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
        MaterializeRequestBody;

    const outcomeId =
      typeof body.outcomeId ===
      "string"
        ? body.outcomeId.trim()
        : "";

    if (
      !outcomeId
    ) {
      return jsonResponse(
        {
          success:
            false,

          error:
            "Outcome id is required.",

          code:
            "OUTCOME_ID_REQUIRED",

          timestamp:
            Date.now(),
        },
        identity.userId,
        400
      );
    }

    const result =
      await runWithUserContext(
        identity.userId,
        async () => {
          const outcome =
            await getOutcome(
              outcomeId
            );

          if (
            !outcome
          ) {
            return {
              found:
                false,

              outcome:
                null,

              tasks:
                [] as
                  MaterializedTaskResult[],
            };
          }

          const taskResults:
            MaterializedTaskResult[] =
              [];

          const allTaskIds =
            new Set(
              outcome.taskIds
            );

          for (
            const milestone of
            [...outcome.milestones].sort(
              (
                first,
                second
              ) =>
                first.order -
                second.order
            )
          ) {
            const taskTitle =
              milestone.title;

            const existingLinkedTaskId =
              milestone.taskIds[0];

            if (
              existingLinkedTaskId
            ) {
              allTaskIds.add(
                existingLinkedTaskId
              );

              taskResults.push({
                milestoneId:
                  milestone.id,

                milestoneTitle:
                  milestone.title,

                taskId:
                  existingLinkedTaskId,

                taskTitle,

                created:
                  false,
              });

              continue;
            }

            const duplicate =
              await findDuplicateActiveTask(
                taskTitle
              );

            let taskId:
              string;

            let created:
              boolean;

            if (
              duplicate
            ) {
              taskId =
                duplicate.id;

              created =
                false;
            } else {
              const task =
                await createPersistentTask(
                  taskTitle,
                  [
                    milestone.description,
                    "",
                    `Outcome: ${outcome.title}`,
                    `Outcome ID: ${outcome.id}`,
                    `Milestone ID: ${milestone.id}`,
                    `Execution order: ${milestone.order}`,
                    outcome.successCriteria
                      ? `Success criteria: ${outcome.successCriteria}`
                      : "",
                  ]
                    .filter(
                      Boolean
                    )
                    .join(
                      "\n"
                    )
                );

              taskId =
                task.id;

              created =
                true;
            }

            allTaskIds.add(
              taskId
            );

            await updateOutcomeMilestone(
              outcome.id,
              milestone.id,
              {
                taskIds: [
                  taskId,
                ],
              }
            );

            taskResults.push({
              milestoneId:
                milestone.id,

              milestoneTitle:
                milestone.title,

              taskId,

              taskTitle,

              created,
            });
          }

          const updatedOutcome =
            await updateOutcome(
              outcome.id,
              {
                status:
                  outcome.status ===
                  "planned"
                    ? "active"
                    : outcome.status,

                taskIds:
                  Array.from(
                    allTaskIds
                  ),
              }
            );

          return {
            found:
              true,

            outcome:
              updatedOutcome,

            tasks:
              taskResults,
          };
        }
      );

    if (
      !result.found ||
      !result.outcome
    ) {
      return jsonResponse(
        {
          success:
            false,

          error:
            "Outcome not found.",

          code:
            "OUTCOME_NOT_FOUND",

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

    const createdCount =
      result.tasks.filter(
        (
          task
        ) =>
          task.created
      ).length;

    const reusedCount =
      result.tasks.length -
      createdCount;

    return jsonResponse(
      {
        success:
          true,

        outcome:
          result.outcome,

        workflow: {
          materialized:
            true,

          total:
            result.tasks.length,

          created:
            createdCount,

          reused:
            reusedCount,

          tasks:
            result.tasks,
        },

        planner: {
          refreshRequired:
            true,

          snapshotEndpoint:
            "/api/planner/snapshot",
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
            : "Outcome materialization failed.",

        code:
          "OUTCOME_MATERIALIZATION_ERROR",

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
      500
    );
  }
}