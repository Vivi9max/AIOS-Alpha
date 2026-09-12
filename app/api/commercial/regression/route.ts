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
  getCommercialObjective,
} from "@/lib/commercial/operating-layer";

import {
  ensureCommercialNextAction,
} from "@/lib/commercial/gap-engine";

import {
  getOutcome,
} from "@/lib/outcome/store";

import {
  listPersistentTasks,
} from "@/lib/task/server-store";

const RUNTIME =
  "aios-alpha";

const RUNTIME_VERSION =
  "0.5";

const REGRESSION_CODE =
  "C143_16_COMMERCIAL_CLOSED_LOOP_REGRESSION_PASS";

function response(
  body: Record<string, unknown>,
  userId: string,
  status = 200,
): NextResponse {
  const result =
    NextResponse.json(
      {
        ...body,
        runtime: RUNTIME,
        runtimeVersion:
          RUNTIME_VERSION,
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

  result.cookies.set(
    AIOS_USER_COOKIE,
    userId,
    {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
      path: "/",
      maxAge:
        60 * 60 * 24 * 365,
    },
  );

  return result;
}

function check(
  name: string,
  passed: boolean,
  details?: Record<string, unknown>,
) {
  return {
    name,
    passed,
    ...(details ?? {}),
  };
}

export async function POST(
  request: NextRequest,
) {
  const identity =
    resolveAlphaIdentity(
      request,
    );

  const startedAt =
    Date.now();

  try {
    const body =
      (await request
        .json()
        .catch(
          () => ({}),
        )) as {
        objectiveId?: unknown;
      };

    const objectiveId =
      typeof body.objectiveId ===
      "string"
        ? body.objectiveId.trim()
        : "";

    if (!objectiveId) {
      return response(
        {
          success: false,
          verified: false,
          code:
            "COMMERCIAL_OBJECTIVE_ID_REQUIRED",
        },
        identity.userId,
        400,
      );
    }

    const result =
      await runWithUserContext(
        identity.userId,
        async () => {
          const objective =
            await getCommercialObjective(
              objectiveId,
            );

          if (!objective) {
            return {
              success: false,
              verified: false,
              status: 404,
              code:
                "COMMERCIAL_OBJECTIVE_NOT_FOUND",
            };
          }

          const checks: Array<
            Record<string, unknown>
          > = [];

          checks.push(
            check(
              "Commercial Objective",
              true,
              {
                objectiveId:
                  objective.id,
                status:
                  objective.status,
                stage:
                  objective.stage,
              },
            ),
          );

          const nextAction =
            await ensureCommercialNextAction(
              objectiveId,
            );

          checks.push(
            check(
              "Gap Engine",
              Boolean(
                nextAction.success &&
                nextAction.action &&
                nextAction.taskId,
              ),
              {
                action:
                  nextAction.action,
                priority:
                  nextAction.gap.priority,
                revenueGap:
                  nextAction.gap.revenueGap,
                customerGap:
                  nextAction.gap.customerGap,
              },
            ),
          );

          const refreshedObjective =
            await getCommercialObjective(
              objectiveId,
            );

          const outcomeId =
            refreshedObjective?.outcomeId ??
            null;

          const taskId =
            refreshedObjective?.taskId ??
            null;

          checks.push(
            check(
              "Objective Outcome Link",
              Boolean(
                outcomeId &&
                outcomeId ===
                  nextAction.outcomeId,
              ),
              {
                objectiveOutcomeId:
                  outcomeId,
                nextActionOutcomeId:
                  nextAction.outcomeId,
              },
            ),
          );

          checks.push(
            check(
              "Objective Task Link",
              Boolean(
                taskId &&
                taskId ===
                  nextAction.taskId,
              ),
              {
                objectiveTaskId:
                  taskId,
                nextActionTaskId:
                  nextAction.taskId,
              },
            ),
          );

          const outcome =
            outcomeId
              ? await getOutcome(
                  outcomeId,
                )
              : null;

          checks.push(
            check(
              "Outcome Exists",
              Boolean(
                outcome,
              ),
              {
                outcomeId,
              },
            ),
          );

          const outcomeContainsTask =
            Boolean(
              outcome &&
              outcome.taskIds.includes(
                nextAction.taskId,
              ),
            );

          checks.push(
            check(
              "Outcome Task Link",
              outcomeContainsTask,
              {
                taskId:
                  nextAction.taskId,
                linked:
                  outcomeContainsTask,
              },
            ),
          );

          const milestone =
            outcome?.milestones.find(
              (item) =>
                item.taskIds.includes(
                  nextAction.taskId,
                ),
            ) ??
            null;

          checks.push(
            check(
              "Milestone Task Link",
              Boolean(
                milestone,
              ),
              {
                milestoneId:
                  milestone?.id ??
                  null,
                milestoneStatus:
                  milestone?.status ??
                  null,
              },
            ),
          );

          const tasks =
            await listPersistentTasks();

          const task =
            tasks.find(
              (item) =>
                item.id ===
                nextAction.taskId,
            ) ?? null;

          checks.push(
            check(
              "Executable Task Exists",
              Boolean(
                task,
              ),
              {
                taskId:
                  nextAction.taskId,
                taskStatus:
                  task?.status ??
                  null,
              },
            ),
          );

          const allPassed =
            checks.every(
              (item) =>
                item.passed ===
                true,
            );

          return {
            success:
              allPassed,
            verified:
              allPassed,
            status:
              allPassed
                ? 200
                : 409,
            code:
              allPassed
                ? REGRESSION_CODE
                : "C143_16_COMMERCIAL_CLOSED_LOOP_REGRESSION_FAILED",
            checks,
            chain: {
              objectiveId:
                refreshedObjective?.id ??
                objective.id,
              outcomeId:
                outcome?.id ??
                null,
              milestoneId:
                milestone?.id ??
                null,
              taskId:
                task?.id ??
                null,
              action:
                nextAction.action,
            },
            nextAction,
            mutationPolicy:
              "Regression validates and repairs commercial linkage only. It does not fabricate revenue, customers, or verified business results.",
          };
        },
      );

    return response(
      {
        ...result,
        latencyMs:
          Date.now() -
          startedAt,
        identity: {
          userId:
            identity.userId,
          isolated: true,
        },
      },
      identity.userId,
      result.status ??
        (result.success
          ? 200
          : 500),
    );
  } catch (error) {
    return response(
      {
        success: false,
        verified: false,
        code:
          "C143_16_COMMERCIAL_CLOSED_LOOP_REGRESSION_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Commercial closed-loop regression failed.",
        latencyMs:
          Date.now() -
          startedAt,
        identity: {
          userId:
            identity.userId,
          isolated: true,
        },
      },
      identity.userId,
      500,
    );
  }
}
