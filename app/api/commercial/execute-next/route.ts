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
  listOutcomes,
} from "@/lib/outcome/store";

import {
  listPersistentTasks,
} from "@/lib/task/server-store";

import {
  buildExecutionPlan,
} from "@/lib/planner/execution-engine";

import type {
  Task,
} from "@/lib/task/types";

const RUNTIME =
  "aios-alpha";

const RUNTIME_VERSION =
  "0.5";

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

function linkedTasks(
  outcome: Awaited<
    ReturnType<typeof listOutcomes>
  >[number],
  tasks: Task[],
): Task[] {
  const ids =
    new Set([
      ...outcome.taskIds,
      ...outcome.milestones.flatMap(
        (milestone) =>
          milestone.taskIds,
      ),
    ]);

  if (ids.size === 0) {
    return [];
  }

  return tasks.filter(
    (task) =>
      ids.has(task.id),
  );
}

function plannerOutcome(
  outcome: Awaited<
    ReturnType<typeof listOutcomes>
  >[number],
) {
  return {
    id: outcome.id,
    title: outcome.title,
    description:
      outcome.description,
    successCriteria:
      outcome.successCriteria,
    status:
      outcome.status,
    priority:
      outcome.priority,
    progress:
      outcome.progress,
    milestones:
      outcome.milestones.map(
        (milestone) => ({
          id: milestone.id,
          title:
            milestone.title,
          description:
            milestone.description,
          order:
            milestone.order,
          status:
            milestone.status ===
            "blocked"
              ? ("pending" as const)
              : milestone.status,
          taskIds:
            milestone.taskIds,
        }),
      ),
    taskIds:
      outcome.taskIds,
  };
}

function findOutcomeForObjective(
  objective: Awaited<
    ReturnType<
      typeof getCommercialObjective
    >
  >,
  outcomes: Awaited<
    ReturnType<typeof listOutcomes>
  >,
) {
  if (
    objective?.outcomeId
  ) {
    return (
      outcomes.find(
        (item) =>
          item.id ===
          objective.outcomeId,
      ) ?? null
    );
  }

  return (
    outcomes.find(
      (item) =>
        item.status ===
        "active",
    ) ??
    null
  );
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
        planId?: unknown;
        workspaceId?: unknown;
      };

    const objectiveId =
      typeof body.objectiveId ===
      "string"
        ? body.objectiveId.trim()
        : "";

    const planId =
      body.planId ===
        "free" ||
      body.planId ===
        "pro" ||
      body.planId ===
        "business"
        ? body.planId
        : "alpha";

    const workspaceId =
      typeof body.workspaceId ===
        "string" &&
      body.workspaceId.trim()
        ? body.workspaceId.trim()
        : "default";

    if (!objectiveId) {
      return response(
        {
          success: false,
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
              status: 404,
              code:
                "COMMERCIAL_OBJECTIVE_NOT_FOUND",
              error:
                "Commercial objective was not found.",
            };
          }

          if (
            objective.status ===
            "completed"
          ) {
            return {
              success: true,
              status: 200,
              code:
                "COMMERCIAL_OBJECTIVE_COMPLETED",
              message:
                "Commercial objective is already completed.",
              objectiveId,
              executed: false,
            };
          }

          if (
            objective.status ===
            "cancelled"
          ) {
            return {
              success: false,
              status: 409,
              code:
                "COMMERCIAL_OBJECTIVE_CANCELLED",
              error:
                "Cancelled commercial objectives cannot be executed.",
            };
          }

          /*
           * C143.13:
           * determine the next commercial action
           * and reuse an existing open task when possible.
           */
          const nextAction =
            await ensureCommercialNextAction(
              objectiveId,
            );

          const [
            outcomes,
            tasks,
          ] =
            await Promise.all([
              listOutcomes(),
              listPersistentTasks(),
            ]);

          const outcome =
            findOutcomeForObjective(
              objective,
              outcomes,
            );

          if (!outcome) {
            return {
              success: false,
              status: 409,
              code:
                "COMMERCIAL_OUTCOME_NOT_FOUND",
              error:
                "Commercial objective has no linked Outcome.",
              nextAction,
            };
          }

          const linked =
            linkedTasks(
              outcome,
              tasks,
            );

          const plan =
            buildExecutionPlan(
              plannerOutcome(
                outcome,
              ),
              linked,
            );

          const selectedTask =
            linked.find(
              (task) =>
                task.id ===
                nextAction.taskId,
            ) ??
            plan.nextTask;

          if (!selectedTask) {
            return {
              success: false,
              status: 409,
              code:
                "COMMERCIAL_NEXT_TASK_NOT_EXECUTABLE",
              error:
                "Commercial next action does not currently resolve to an executable Planner task.",
              nextAction,
            };
          }

          /*
           * Delegate actual execution to the existing
           * Planner → Runtime execution pipeline.
           *
           * We intentionally do not duplicate Runtime
           * execution logic here.
           */
          const {
            canUseCapability,
          } = await import(
            "@/lib/billing/entitlements"
          );

          const capability =
            canUseCapability(
              planId,
              "execution",
            );

          if (
            !capability.allowed
          ) {
            return {
              success: false,
              status: 403,
              code:
                "EXECUTION_CAPABILITY_DENIED",
              error:
                "Execution capability is not available for this plan.",
              entitlement: {
                planId,
                capability:
                  "execution",
                reason:
                  capability.reason,
              },
              nextAction,
            };
          }

          const {
            reserveExecution,
          } = await import(
            "@/lib/billing/execution-usage"
          );

          const usage =
            await reserveExecution(
              planId,
            );

          if (
            !usage.allowed
          ) {
            return {
              success: false,
              status: 429,
              code:
                "EXECUTION_LIMIT_REACHED",
              error:
                "Daily execution limit reached.",
              usage,
              nextAction,
            };
          }

          const {
            createExecutionJob,
            markExecutionJobRunning,
            markExecutionJobCompleted,
            markExecutionJobFailed,
          } = await import(
            "@/lib/execution/job-store"
          );

          const {
            executeRuntime,
          } = await import(
            "@/lib/runtime/engine"
          );

          const input =
            [
              `AIOS Commercial Objective: ${objective.title}`,
              `Commercial Stage: ${objective.stage}`,
              `Next Commercial Action: ${nextAction.action}`,
              `Revenue Gap: ${nextAction.gap.revenueGap}`,
              `Customer Gap: ${nextAction.gap.customerGap}`,
              `Cost Variance: ${nextAction.gap.costVariance}`,
              `Priority: ${nextAction.gap.priority}`,
              `Reason: ${nextAction.gap.reason}`,
              "",
              `Planner Outcome: ${outcome.title}`,
              `Task: ${selectedTask.title}`,
              selectedTask.description
                ? `Task Description: ${selectedTask.description}`
                : "",
              `Success Criteria: ${outcome.successCriteria}`,
              "",
              "Execute the commercial task using the available AIOS Runtime capabilities.",
              "Do not claim revenue or customer results unless they are explicitly verified.",
              "Return a concise execution result suitable for commercial verification.",
            ]
              .filter(Boolean)
              .join("\n");

          const job =
            await createExecutionJob({
              goal:
                `Execute commercial action: ${selectedTask.title}`,
              planId,
              taskId:
                selectedTask.id,
              input,
            });

          await markExecutionJobRunning(
            job.id,
          );

          const runtime =
            await executeRuntime({
              prompt: input,
            });

          if (
            !runtime.success
          ) {
            const failed =
              await markExecutionJobFailed(
                job.id,
                runtime.error ??
                  "Commercial Runtime execution failed.",
              );

            return {
              success: false,
              status: 502,
              code:
                "COMMERCIAL_RUNTIME_EXECUTION_FAILED",
              error:
                runtime.error ??
                "Commercial Runtime execution failed.",
              objectiveId,
              outcomeId:
                outcome.id,
              taskId:
                selectedTask.id,
              nextAction,
              job: failed,
              execution: {
                provider:
                  runtime.provider,
                fallbackUsed:
                  runtime.fallbackUsed ??
                  false,
                latencyMs:
                  runtime.latencyMs,
                capabilityTrace:
                  runtime.capabilityTrace ??
                  [],
              },
              usage,
            };
          }

          const completedJob =
            await markExecutionJobCompleted(
              job.id,
              runtime.content,
            );

          return {
            success: true,
            status: 200,
            code:
              "C143_14_COMMERCIAL_ACTION_EXECUTED",
            objectiveId,
            outcomeId:
              outcome.id,
            taskId:
              selectedTask.id,
            nextAction,
            executed: true,
            job:
              completedJob,
            execution: {
              provider:
                runtime.provider,
              fallbackUsed:
                runtime.fallbackUsed ??
                false,
              latencyMs:
                runtime.latencyMs,
              content:
                runtime.content,
              capabilityTrace:
                runtime.capabilityTrace ??
                [],
            },
            usage,
            scope: {
              workspaceId,
            },
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
        code:
          "C143_14_COMMERCIAL_ACTION_EXECUTION_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Commercial action execution failed.",
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
