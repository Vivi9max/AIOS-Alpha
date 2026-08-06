import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  AIOS_USER_COOKIE,
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

import {
  buildExecutionPlan,
  getNextAction,
  plannerSummary,
} from "@/lib/planner/execution-engine";

import {
  buildPlannerTaskControl,
  evaluatePlannerTaskStatusChange,
} from "@/lib/planner/execution-control";

import {
  buildPlannerRuntimeIntelligence,
} from "@/lib/planner/runtime-server";

import type {
  Outcome as ExecutionOutcome,
  Milestone as ExecutionMilestone,
} from "@/lib/planner/execution-engine";

import {
  getOutcome,
  listOutcomes,
  updateOutcome,
  updateOutcomeMilestone,
} from "@/lib/outcome/store";

import type {
  Outcome,
  OutcomeMilestone,
} from "@/lib/outcome/types";

import {
  runWithUserContext,
} from "@/lib/runtime/request-context";

import {
  listPersistentTasks,
  updatePersistentTask,
} from "@/lib/task/server-store";

import type {
  Task,
} from "@/lib/task/types";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

interface ExecuteRequestBody {
  outcomeId?:
    unknown;

  action?:
    unknown;
}

type ExecutionAction =
  | "inspect"
  | "start-next"
  | "complete-current"
  | "sync";

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

function normalizeAction(
  value:
    unknown
): ExecutionAction {
  if (
    value ===
      "start-next" ||
    value ===
      "complete-current" ||
    value ===
      "sync"
  ) {
    return value;
  }

  return "inspect";
}

function toExecutionMilestone(
  milestone:
    OutcomeMilestone
): ExecutionMilestone {
  return {
    id:
      milestone.id,

    title:
      milestone.title,

    description:
      milestone.description,

    order:
      milestone.order,

    status:
      milestone.status ===
      "blocked"
        ? "pending"
        : milestone.status,

    taskIds:
      milestone.taskIds,
  };
}

function toExecutionOutcome(
  outcome:
    Outcome
): ExecutionOutcome {
  return {
    id:
      outcome.id,

    title:
      outcome.title,

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
        toExecutionMilestone
      ),

    taskIds:
      outcome.taskIds,
  };
}

function selectOutcomeTasks(
  outcome:
    Outcome,

  allTasks:
    Task[]
): Task[] {
  const linkedTaskIds =
    new Set(
      [
        ...outcome.taskIds,

        ...outcome.milestones.flatMap(
          (
            milestone
          ) =>
            milestone.taskIds
        ),
      ]
    );

  if (
    linkedTaskIds.size ===
    0
  ) {
    return [];
  }

  return allTasks.filter(
    (
      task
    ) =>
      linkedTaskIds.has(
        task.id
      )
  );
}

function selectCurrentOutcome(
  outcomes:
    Outcome[],

  requestedOutcomeId:
    string
): Outcome | null {
  if (
    requestedOutcomeId
  ) {
    return (
      outcomes.find(
        (
          outcome
        ) =>
          outcome.id ===
          requestedOutcomeId
      ) ??
      null
    );
  }

  return (
    outcomes.find(
      (
        outcome
      ) =>
        outcome.status ===
        "active"
    ) ??
    outcomes.find(
      (
        outcome
      ) =>
        outcome.status ===
        "planned"
    ) ??
    outcomes.find(
      (
        outcome
      ) =>
        outcome.status ===
        "blocked"
    ) ??
    null
  );
}

function findMilestoneForTask(
  outcome:
    Outcome,

  taskId:
    string
): OutcomeMilestone | null {
  return (
    outcome.milestones.find(
      (
        milestone
      ) =>
        milestone.taskIds.includes(
          taskId
        )
    ) ??
    null
  );
}

function areMilestoneTasksCompleted(
  milestone:
    OutcomeMilestone,

  tasks:
    Task[]
): boolean {
  if (
    milestone.taskIds.length ===
    0
  ) {
    return false;
  }

  const taskMap =
    new Map(
      tasks.map(
        (
          task
        ) => [
          task.id,
          task,
        ]
      )
    );

  return milestone.taskIds.every(
    (
      taskId
    ) =>
      taskMap.get(
        taskId
      )?.status ===
      "done"
  );
}

async function syncMilestones(
  outcome:
    Outcome,

  tasks:
    Task[]
): Promise<void> {
  for (
    const milestone of
    outcome.milestones
  ) {
    if (
      milestone.status ===
      "completed"
    ) {
      continue;
    }

    if (
      areMilestoneTasksCompleted(
        milestone,
        tasks
      )
    ) {
      await updateOutcomeMilestone(
        outcome.id,
        milestone.id,
        {
          status:
            "completed",
        }
      );
    }
  }
}

async function activateTaskMilestone(
  outcome:
    Outcome,

  taskId:
    string
): Promise<void> {
  const milestone =
    findMilestoneForTask(
      outcome,
      taskId
    );

  if (
    !milestone ||
    milestone.status ===
      "active" ||
    milestone.status ===
      "completed"
  ) {
    return;
  }

  await updateOutcomeMilestone(
    outcome.id,
    milestone.id,
    {
      status:
        "active",
    }
  );
}

async function buildExecutionResult(
  outcome:
    Outcome,

  tasks:
    Task[]
) {
  const plan =
    buildExecutionPlan(
      toExecutionOutcome(
        outcome
      ),
      tasks
    );

  const nextAction =
    getNextAction(
      plan
    );

  return {
    outcome: {
      id:
        outcome.id,

      title:
        outcome.title,

      status:
        outcome.status,

      priority:
        outcome.priority,

      storedProgress:
        outcome.progress,
    },

    execution: {
      ...plannerSummary(
        plan
      ),

      currentMilestone:
        plan.currentMilestone
          ? {
              id:
                plan.currentMilestone.id,

              title:
                plan.currentMilestone.title,

              status:
                plan.currentMilestone.status,

              order:
                plan.currentMilestone.order,
            }
          : null,

      nextTask:
        plan.nextTask
          ? {
              id:
                plan.nextTask.id,

              title:
                plan.nextTask.title,

              description:
                plan.nextTask.description ??
                "",

              status:
                plan.nextTask.status,

              updatedAt:
                plan.nextTask.updatedAt,
            }
          : null,

      nextAction,

      queue:
        plan.queue.map(
          (
            task
          ) => ({
            id:
              task.id,

            title:
              task.title,

            description:
              task.description ??
              "",

            status:
              task.status,

            createdAt:
              task.createdAt,

            updatedAt:
              task.updatedAt,
          })
        ),
    },
  };
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
    const url =
      new URL(
        request.url
      );

    const requestedOutcomeId =
      url.searchParams.get(
        "outcomeId"
      )?.trim() ??
      "";

    const result =
      await runWithUserContext(
        identity.userId,
        async () => {
          const [
            outcomes,
            allTasks,
          ] =
            await Promise.all([
              listOutcomes(),
              listPersistentTasks(),
            ]);

          const outcome =
            selectCurrentOutcome(
              outcomes,
              requestedOutcomeId
            );

          if (
            !outcome
          ) {
            return {
              found:
                false,

              content:
                null,
            };
          }

          const tasks =
            selectOutcomeTasks(
              outcome,
              allTasks
            );

          return {
            found:
              true,

            content:
              await buildExecutionResult(
                outcome,
                tasks
              ),
          };
        }
      );

    if (
      !result.found ||
      !result.content
    ) {
      return jsonResponse(
        {
          success:
            true,

          state:
            "idle",

          outcome:
            null,

          execution: {
            progress:
              0,

            completedTasks:
              0,

            remainingTasks:
              0,

            queueSize:
              0,

            nextTaskId:
              null,

            milestoneId:
              null,

            currentMilestone:
              null,

            nextTask:
              null,

            nextAction: {
              type:
                "idle",

              title:
                "尚未找到可执行 Outcome",

              description:
                "请先创建 Outcome，并生成执行任务。",
            },

            queue:
              [],
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

    return jsonResponse(
      {
        success:
          true,

        state:
          result.content
            .execution
            .nextTask
            ? "ready"
            : "completed",

        ...result.content,

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
            : "Execution plan loading failed.",

        code:
          "EXECUTION_PLAN_LOAD_ERROR",

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
        ExecuteRequestBody;

    const requestedOutcomeId =
      typeof body.outcomeId ===
      "string"
        ? body.outcomeId.trim()
        : "";

    const action =
      normalizeAction(
        body.action
      );

    const result =
      await runWithUserContext(
        identity.userId,
        async () => {
          const [
            outcomes,
            initialTasks,
          ] =
            await Promise.all([
              listOutcomes(),
              listPersistentTasks(),
            ]);

          const outcome =
            selectCurrentOutcome(
              outcomes,
              requestedOutcomeId
            );

          if (
            !outcome
          ) {
            return {
              found:
                false,

              content:
                null,

              performedAction:
                "none",
            };
          }

          let linkedTasks =
            selectOutcomeTasks(
              outcome,
              initialTasks
            );

          let initialPlan =
            buildExecutionPlan(
              toExecutionOutcome(
                outcome
              ),
              linkedTasks
            );

          const initialIntelligence =
            await buildPlannerRuntimeIntelligence(
              initialTasks,
              {
                recordHistory:
                  false,
              }
            );

          let executionControl =
            buildPlannerTaskControl(
              initialTasks,
              initialIntelligence.adaptiveStrategy
            );

          let performedAction:
            string =
              "inspect";

          if (
            action ===
            "start-next"
          ) {
            const currentDoingTask =
              initialPlan.queue.find(
                (
                  task
                ) =>
                  task.status ===
                  "doing"
              );

            const nextTodoTask =
              initialPlan.queue.find(
                (
                  task
                ) =>
                  task.status ===
                  "todo"
              );

            const taskToStart =
              currentDoingTask ??
              nextTodoTask;

            if (
              taskToStart &&
              taskToStart.status ===
                "todo"
            ) {
              const decision =
                evaluatePlannerTaskStatusChange(
                  initialTasks,
                  taskToStart.id,
                  "doing",
                  executionControl
                );

              if (
                decision.allowed
              ) {
                await updatePersistentTask(
                  taskToStart.id,
                  {
                    status:
                      "doing",
                  }
                );

                await activateTaskMilestone(
                  outcome,
                  taskToStart.id
                );

                performedAction =
                  "task-started";
              } else {
                performedAction =
                  "planner-concurrency-blocked";
              }
            } else if (
              currentDoingTask
            ) {
              performedAction =
                "task-already-doing";
            } else {
              performedAction =
                "no-task-to-start";
            }
          }

          if (
            action ===
            "complete-current"
          ) {
            const currentTask =
              initialPlan.queue.find(
                (
                  task
                ) =>
                  task.status ===
                  "doing"
              ) ??
              initialPlan.queue.find(
                (
                  task
                ) =>
                  task.status ===
                  "todo"
              );

            if (
              currentTask
            ) {
              await updatePersistentTask(
                currentTask.id,
                {
                  status:
                    "done",
                }
              );

              performedAction =
                "task-completed";
            } else {
              performedAction =
                "no-task-to-complete";
            }
          }

          const refreshedTasks =
            await listPersistentTasks();

          linkedTasks =
            selectOutcomeTasks(
              outcome,
              refreshedTasks
            );

          await syncMilestones(
            outcome,
            linkedTasks
          );

          const completedTasks =
            linkedTasks.filter(
              (
                task
              ) =>
                task.status ===
                "done"
            ).length;

          const progress =
            linkedTasks.length >
            0
              ? Math.round(
                  (
                    completedTasks /
                    linkedTasks.length
                  ) *
                    100
                )
              : 0;

          const allTasksCompleted =
            linkedTasks.length >
              0 &&
            completedTasks ===
              linkedTasks.length;

          await updateOutcome(
            outcome.id,
            {
              progress,

              status:
                allTasksCompleted
                  ? "completed"
                  : outcome.status ===
                      "planned" ||
                    outcome.status ===
                      "blocked"
                    ? "active"
                    : outcome.status,
            }
          );

          const updatedOutcome =
            await getOutcome(
              outcome.id
            );

          if (
            !updatedOutcome
          ) {
            throw new Error(
              "Outcome disappeared during execution sync."
            );
          }

          const finalTasks =
            await listPersistentTasks();

          const finalIntelligence =
            await buildPlannerRuntimeIntelligence(
              finalTasks,
              {
                recordHistory:
                  false,
              }
            );

          executionControl =
            buildPlannerTaskControl(
              finalTasks,
              finalIntelligence.adaptiveStrategy
            );

          const latestTasks =
            selectOutcomeTasks(
              updatedOutcome,
              finalTasks
            );

          return {
            found:
              true,

            performedAction,

            executionControl,

            content:
              await buildExecutionResult(
                updatedOutcome,
                latestTasks
              ),
          };
        }
      );

    if (
      !result.found ||
      !result.content
    ) {
      return jsonResponse(
        {
          success:
            false,

          error:
            "No executable Outcome found.",

          code:
            "EXECUTABLE_OUTCOME_NOT_FOUND",

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
        404
      );
    }

    return jsonResponse(
      {
        success:
          true,

        action,

        performedAction:
          result.performedAction,

        state:
          result.content
            .execution
            .nextTask
            ? "executing"
            : "completed",

        ...result.content,

        planner: {
          refreshRequired:
            true,

          snapshotEndpoint:
            "/api/planner/snapshot",

          executionControl:
            result.executionControl,
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
            : "Execution action failed.",

        code:
          "EXECUTION_ACTION_ERROR",

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
