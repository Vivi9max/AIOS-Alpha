import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createPersistentExecutionSession,
  getActiveExecutionSession,
  getExecutionSession,
  getExecutionSessionSummary,
  listExecutionSessions,
  saveExecutionSession,
  updatePersistentExecutionSession,
} from "@/lib/runtime/session";

import {
  completeExecutionSession,
  completeExecutionStep,
  failExecutionStep,
  startExecutionStep,
  updateExecutionStepProgress,
  type ExecutionOutcome,
  type ExecutionSession,
} from "@/lib/runtime/execution";

import {
  listPersistentTasks,
} from "@/lib/task/server-store";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

const API_VERSION =
  "v1";

const MAX_GOAL_LENGTH =
  1000;

type SessionAction =
  | "start"
  | "complete-step"
  | "fail-step"
  | "progress"
  | "complete"
  | "cancel";

interface CreateSessionBody {
  goal?: unknown;
  planId?: unknown;
  requestId?: unknown;
  provider?: unknown;
  fallbackUsed?: unknown;
  taskId?: unknown;
  metadata?: unknown;
}

interface UpdateSessionBody {
  sessionId?: unknown;
  action?: unknown;
  stepId?: unknown;
  progress?: unknown;
  error?: unknown;
  summary?: unknown;
  success?: unknown;
  generatedTaskCount?: unknown;
  reusedTaskCount?: unknown;
  memoryUpdated?: unknown;
  storageSaved?: unknown;
  nextRecommendedAction?: unknown;
  metadata?: unknown;
}

function getRequestId(
  request: NextRequest
): string {
  return (
    request.headers.get(
      "x-request-id"
    ) ??
    crypto.randomUUID()
  );
}

function normalizeString(
  value: unknown
): string {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function normalizeGoal(
  value: unknown
): string {
  return normalizeString(
    value
  )
    .replace(
      /\r\n/g,
      "\n"
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .slice(
      0,
      MAX_GOAL_LENGTH
    );
}

function normalizeProgress(
  value: unknown
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(value)
    )
  );
}

function normalizeAction(
  value: unknown
): SessionAction | null {
  switch (value) {
    case "start":
    case "complete-step":
    case "fail-step":
    case "progress":
    case "complete":
    case "cancel":
      return value;

    default:
      return null;
  }
}

function normalizeMetadata(
  value: unknown
): Record<string, unknown> {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return {
    ...(value as Record<
      string,
      unknown
    >),
  };
}

function buildOutcome(
  body: UpdateSessionBody
): ExecutionOutcome {
  const success =
    body.success !== false;

  return {
    success,

    summary:
      normalizeString(
        body.summary
      ) ||
      (
        success
          ? "Execution session completed."
          : "Execution session failed."
      ),

    generatedTaskCount:
      normalizeNonNegativeInteger(
        body.generatedTaskCount
      ),

    reusedTaskCount:
      normalizeNonNegativeInteger(
        body.reusedTaskCount
      ),

    memoryUpdated:
      body.memoryUpdated ===
      true,

    storageSaved:
      body.storageSaved ===
      true,

    nextRecommendedAction:
      normalizeString(
        body.nextRecommendedAction
      ) || null,

    metadata:
      normalizeMetadata(
        body.metadata
      ),
  };
}

function normalizeNonNegativeInteger(
  value: unknown
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(value)
  );
}

function getSessionResponse(
  session: ExecutionSession
) {
  return {
    id:
      session.id,

    goal:
      session.goal,

    planId:
      session.planId,

    requestId:
      session.requestId,

    provider:
      session.provider,

    status:
      session.status,

    progress:
      session.progress,

    currentStepId:
      session.currentStepId,

    currentCapability:
      session.currentCapability,

    nextCapability:
      session.nextCapability,

    startedAt:
      session.startedAt,

    updatedAt:
      session.updatedAt,

    completedAt:
      session.completedAt,

    durationMs:
      session.durationMs,

    fallbackUsed:
      session.fallbackUsed,

    steps:
      session.steps,

    events:
      session.events,

    metrics:
      session.metrics,

    outcome:
      session.outcome,

    error:
      session.error,

    metadata:
      session.metadata,
  };
}

async function enrichSession(
  session: ExecutionSession
) {
  const tasks =
    await listPersistentTasks();

  const taskId =
    typeof session.metadata
      ?.taskId ===
    "string"
      ? session.metadata.taskId
      : null;

  const task =
    taskId
      ? tasks.find(
          (item) =>
            item.id ===
            taskId
        ) ?? null
      : null;

  return {
    session:
      getSessionResponse(
        session
      ),

    task: task
      ? {
          id:
            task.id,

          title:
            task.title,

          status:
            task.status,

          createdAt:
            task.createdAt,

          updatedAt:
            task.updatedAt,
        }
      : null,
  };
}

export async function GET(
  request: NextRequest
) {
  const requestId =
    getRequestId(
      request
    );

  try {
    const sessionId =
      request.nextUrl.searchParams.get(
        "sessionId"
      );

    const status =
      request.nextUrl.searchParams.get(
        "status"
      );

    const limitParam =
      request.nextUrl.searchParams.get(
        "limit"
      );

    if (sessionId) {
      const session =
        await getExecutionSession(
          sessionId
        );

      if (!session) {
        return NextResponse.json(
          {
            success: false,

            apiVersion:
              API_VERSION,

            requestId,

            error:
              "Execution session not found.",

            code:
              "SESSION_NOT_FOUND",

            timestamp:
              Date.now(),
          },
          {
            status: 404,
          }
        );
      }

      return NextResponse.json({
        success: true,

        apiVersion:
          API_VERSION,

        requestId,

        ...(
          await enrichSession(
            session
          )
        ),

        timestamp:
          Date.now(),
      });
    }

    if (
      status &&
      !isExecutionStatus(
        status
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          apiVersion:
            API_VERSION,

          requestId,

          error:
            "Invalid execution session status.",

          code:
            "INVALID_SESSION_STATUS",

          timestamp:
            Date.now(),
        },
        {
          status: 400,
        }
      );
    }

    const limit =
      limitParam
        ? Number(
            limitParam
          )
        : undefined;

    const sessions =
      await listExecutionSessions({
        limit,
        status:
          status as
            | ExecutionSession["status"]
            | undefined,
      });

    const summary =
      await getExecutionSessionSummary();

    return NextResponse.json({
      success: true,

      apiVersion:
        API_VERSION,

      requestId,

      sessions:
        await Promise.all(
          sessions.map(
            (
              session
            ) =>
              enrichSession(
                session
              )
          )
        ),

      count:
        sessions.length,

      summary,

      timestamp:
        Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        apiVersion:
          API_VERSION,

        requestId,

        error:
          error instanceof Error
            ? error.message
            : "Execution session loading failed.",

        code:
          "EXECUTION_SESSION_LOAD_ERROR",

        timestamp:
          Date.now(),
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  const requestId =
    getRequestId(
      request
    );

  try {
    const body =
      (await request.json()) as
        CreateSessionBody;

    const goal =
      normalizeGoal(
        body.goal
      );

    if (!goal) {
      return NextResponse.json(
        {
          success: false,

          apiVersion:
            API_VERSION,

          requestId,

          error:
            "Execution session goal is required.",

          code:
            "INVALID_GOAL",

          timestamp:
            Date.now(),
        },
        {
          status: 400,
        }
      );
    }

    const activeSession =
      await getActiveExecutionSession();

    if (
      activeSession &&
      activeSession.goal ===
        goal
    ) {
      return NextResponse.json({
        success: true,

        apiVersion:
          API_VERSION,

        requestId,

        reused:
          true,

        session:
          await enrichSession(
            activeSession
          ),

        timestamp:
          Date.now(),
      });
    }

    const taskId =
      normalizeString(
        body.taskId
      );

    const metadata =
      normalizeMetadata(
        body.metadata
      );

    if (taskId) {
      metadata.taskId =
        taskId;
    }

    const session =
      await createPersistentExecutionSession(
        {
          goal,

          planId:
            normalizeString(
              body.planId
            ) || null,

          requestId:
            normalizeString(
              body.requestId
            ) ||
            requestId,

          provider:
            normalizeString(
              body.provider
            ) || null,

          fallbackUsed:
            body.fallbackUsed ===
            true,

          metadata,
        }
      );

    return NextResponse.json(
      {
        success: true,

        apiVersion:
          API_VERSION,

        requestId,

        reused:
          false,

        session:
          await enrichSession(
            session
          ),

        timestamp:
          Date.now(),
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        apiVersion:
          API_VERSION,

        requestId,

        error:
          error instanceof Error
            ? error.message
            : "Execution session creation failed.",

        code:
          "EXECUTION_SESSION_CREATE_ERROR",

        timestamp:
          Date.now(),
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: NextRequest
) {
  const requestId =
    getRequestId(
      request
    );

  try {
    const body =
      (await request.json()) as
        UpdateSessionBody;

    const sessionId =
      normalizeString(
        body.sessionId
      );

    const action =
      normalizeAction(
        body.action
      );

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,

          apiVersion:
            API_VERSION,

          requestId,

          error:
            "Execution session id is required.",

          code:
            "INVALID_SESSION_ID",

          timestamp:
            Date.now(),
        },
        {
          status: 400,
        }
      );
    }

    if (!action) {
      return NextResponse.json(
        {
          success: false,

          apiVersion:
            API_VERSION,

          requestId,

          error:
            "A valid execution session action is required.",

          code:
            "INVALID_SESSION_ACTION",

          timestamp:
            Date.now(),
        },
        {
          status: 400,
        }
      );
    }

    const existing =
      await getExecutionSession(
        sessionId
      );

    if (!existing) {
      return NextResponse.json(
        {
          success: false,

          apiVersion:
            API_VERSION,

          requestId,

          error:
            "Execution session not found.",

          code:
            "SESSION_NOT_FOUND",

          timestamp:
            Date.now(),
        },
        {
          status: 404,
        }
      );
    }

    let updated:
      ExecutionSession | null =
      existing;

    switch (action) {
      case "start": {
        const stepId =
          normalizeString(
            body.stepId
          ) ||
          existing.currentStepId ||
          existing.steps.find(
            (step) =>
              step.status ===
              "waiting"
          )?.id ||
          null;

        if (!stepId) {
          return NextResponse.json(
            {
              success: false,

              apiVersion:
                API_VERSION,

              requestId,

              error:
                "No executable step is available.",

              code:
                "NO_EXECUTABLE_STEP",

              timestamp:
                Date.now(),
            },
            {
              status: 409,
            }
          );
        }

        updated =
          startExecutionStep(
            existing,
            stepId
          );

        break;
      }

      case "progress": {
        const stepId =
          normalizeString(
            body.stepId
          );

        if (!stepId) {
          return NextResponse.json(
            {
              success: false,

              apiVersion:
                API_VERSION,

              requestId,

              error:
                "Step id is required for progress updates.",

              code:
                "INVALID_STEP_ID",

              timestamp:
                Date.now(),
            },
            {
              status: 400,
            }
          );
        }

        updated =
          updateExecutionStepProgress(
            existing,
            stepId,
            normalizeProgress(
              body.progress
            )
          );

        break;
      }

      case "complete-step": {
        const stepId =
          normalizeString(
            body.stepId
          );

        if (!stepId) {
          return NextResponse.json(
            {
              success: false,

              apiVersion:
                API_VERSION,

              requestId,

              error:
                "Step id is required.",

              code:
                "INVALID_STEP_ID",

              timestamp:
                Date.now(),
            },
            {
              status: 400,
            }
          );
        }

        updated =
          completeExecutionStep(
            existing,
            stepId,
            normalizeMetadata(
              body.metadata
            )
          );

        break;
      }

      case "fail-step": {
        const stepId =
          normalizeString(
            body.stepId
          );

        const errorMessage =
          normalizeString(
            body.error
          );

        if (!stepId) {
          return NextResponse.json(
            {
              success: false,

              apiVersion:
                API_VERSION,

              requestId,

              error:
                "Step id is required.",

              code:
                "INVALID_STEP_ID",

              timestamp:
                Date.now(),
            },
            {
              status: 400,
            }
          );
        }

        if (!errorMessage) {
          return NextResponse.json(
            {
              success: false,

              apiVersion:
                API_VERSION,

              requestId,

              error:
                "Step failure reason is required.",

              code:
                "INVALID_STEP_ERROR",

              timestamp:
                Date.now(),
            },
            {
              status: 400,
            }
          );
        }

        updated =
          failExecutionStep(
            existing,
            stepId,
            errorMessage
          );

        break;
      }

      case "complete": {
        updated =
          completeExecutionSession(
            existing,
            buildOutcome(
              body
            )
          );

        break;
      }

      case "cancel": {
        updated =
          await updatePersistentExecutionSession(
            sessionId,
            {
              status:
                "cancelled",

              progress:
                existing.progress,

              currentStepId:
                null,

              currentCapability:
                null,

              nextCapability:
                null,

              error:
                normalizeString(
                  body.error
                ) ||
                "Execution session cancelled.",
            }
          );

        break;
      }

      default:
        break;
    }

    if (!updated) {
      return NextResponse.json(
        {
          success: false,

          apiVersion:
            API_VERSION,

          requestId,

          error:
            "Execution session could not be updated.",

          code:
            "SESSION_UPDATE_FAILED",

          timestamp:
            Date.now(),
        },
        {
          status: 500,
        }
      );
    }

    const saved =
      await saveExecutionSession(
        updated
      );

    return NextResponse.json({
      success: true,

      apiVersion:
        API_VERSION,

      requestId,

      action,

      session:
        await enrichSession(
          saved
        ),

      timestamp:
        Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        apiVersion:
          API_VERSION,

        requestId,

        error:
          error instanceof Error
            ? error.message
            : "Execution session update failed.",

        code:
          "EXECUTION_SESSION_UPDATE_ERROR",

        timestamp:
          Date.now(),
      },
      {
        status: 500,
      }
    );
  }
}

function isExecutionStatus(
  value: string
): value is ExecutionSession["status"] {
  return [
    "idle",
    "planning",
    "routing",
    "creating_tasks",
    "executing",
    "updating_memory",
    "saving",
    "completed",
    "failed",
    "cancelled",
  ].includes(
    value
  );
}
