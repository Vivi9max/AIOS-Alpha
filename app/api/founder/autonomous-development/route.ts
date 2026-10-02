import "server-only";

import { after } from "next/server";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderConfigured,
  isFounderRequest,
} from "@/lib/founder/auth";
import {
  blockAutonomousDevelopmentTask,
  claimAutonomousDevelopmentTask,
  createAutonomousDevelopmentTask,
  findPersistentActiveAutonomousDevelopmentTask,
  getPersistentAutonomousDevelopmentTask,
  listPersistentAutonomousDevelopmentTasks,
  persistAutonomousDevelopmentTasks,
} from "@/lib/github/autonomous-development-control-plane";
import { executeAutonomousDevelopmentAgent } from "@/lib/github/autonomous-development-agent";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

export const maxDuration =
  300;

const DEFAULT_REPOSITORY =
  "Vivi9max/AIOS-Alpha";

const DEFAULT_BRANCH =
  "main";

const ACTIVE_TASK_STATUSES =
  new Set([
    "todo",
    "running",
  ]);

function json(
  body: Record<
    string,
    unknown
  >,
  status = 200,
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function requireFounder(
  request: NextRequest,
) {
  if (
    !isFounderConfigured()
  ) {
    return {
      ok: false as const,
      response: json(
        {
          ok: false,
          code:
            "FOUNDER_NOT_CONFIGURED",
          error:
            "Founder access is not configured.",
        },
        503,
      ),
    };
  }

  if (
    !isFounderRequest(
      request,
    )
  ) {
    return {
      ok: false as const,
      response: json(
        {
          ok: false,
          code:
            "FOUNDER_UNAUTHORIZED",
          error:
            "Founder authorization failed.",
        },
        401,
      ),
    };
  }

  return {
    ok: true as const,
  };
}

function normalizeObjective(
  value: unknown,
) {
  return String(
    value ?? "",
  )
    .trim()
    .replace(
      /\s+/g,
      " ",
    );
}

function buildTaskResponse(
  task: {
    id: string;
    objective: string;
    status: string;
    phase: string;
    repository: string;
    branch: string;
    targetPaths?: string[];
    changedPaths?: string[];
    reason?: string;
    commitSha?: string;
    createdAt: string;
    updatedAt: string;
    startedAt?: string;
    completedAt?: string;
    lastHeartbeatAt?: string;
    phaseHistory?: Array<{
      phase: string;
      at: string;
      reason?: string;
    }>;
    result?: {
      commitSha?: string;
      readbackVerified: boolean;
      verificationPassed: boolean;
      reason?: string;
    };
  },
  options?: {
    duplicate?: boolean;
    message?: string;
  },
) {
  const duplicate =
    options?.duplicate ===
    true;

  return {
    ok: true,
    success: true,
    code: duplicate
      ? "AUTONOMOUS_DEVELOPMENT_ALREADY_RUNNING"
      : task.status ===
          "completed"
        ? "AUTONOMOUS_DEVELOPMENT_COMPLETED"
        : task.status ===
            "blocked"
          ? "AUTONOMOUS_DEVELOPMENT_BLOCKED"
          : task.status ===
              "failed"
            ? "AUTONOMOUS_DEVELOPMENT_FAILED"
            : "AUTONOMOUS_DEVELOPMENT_RUNNING",
    repository:
      task.repository,
    branch:
      task.branch,
    objective:
      task.objective,
    taskId:
      task.id,
    status:
      task.status,
    phase:
      task.phase,
    targetPaths:
      task.targetPaths ??
      [],
    changedPaths:
      task.changedPaths ??
      [],
    reason:
      task.reason,
    commitSha:
      task.commitSha,
    createdAt:
      task.createdAt,
    updatedAt:
      task.updatedAt,
    startedAt:
      task.startedAt,
    completedAt:
      task.completedAt,
    lastHeartbeatAt:
      task.lastHeartbeatAt,
    phaseHistory:
      task.phaseHistory ??
      [],
    result:
      task.result,
    duplicate,
    task,
    message:
      options?.message ??
      (duplicate
        ? "An autonomous development task with the same objective is already active. No duplicate execution was started."
        : task.status ===
            "completed"
          ? "Autonomous development completed successfully."
          : task.status ===
              "blocked"
            ? "Autonomous development is blocked and requires inspection."
            : "Autonomous development started. AIOS is executing the development loop."),
  };
}

function buildTaskListResponse(
  tasks: Awaited<
    ReturnType<
      typeof listPersistentAutonomousDevelopmentTasks
    >
  >,
) {
  return {
    ok: true,
    repository:
      DEFAULT_REPOSITORY,
    branch:
      DEFAULT_BRANCH,
    count:
      tasks.length,
    activeCount:
      tasks.filter(
        (task) =>
          ACTIVE_TASK_STATUSES.has(
            task.status,
          ),
      ).length,
    tasks,
  };
}

export async function GET(
  request: NextRequest,
) {
  const auth =
    requireFounder(
      request,
    );

  if (!auth.ok) {
    return auth.response;
  }

  const taskId =
    request.nextUrl.searchParams.get(
      "taskId",
    );

  const objective =
    request.nextUrl.searchParams.get(
      "objective",
    );

  /*
   * taskId is authoritative.
   *
   * The Founder UI binds polling to the exact task
   * returned by POST. Persistent storage is queried
   * before falling back to the local process state.
   */
  if (
    taskId?.trim()
  ) {
    const normalizedTaskId =
      taskId.trim();

    const task =
      await getPersistentAutonomousDevelopmentTask(
        normalizedTaskId,
      );

    if (!task) {
      return json(
        {
          ok: false,
          code:
            "TASK_NOT_FOUND",
          taskId:
            normalizedTaskId,
          error:
            "Autonomous development task was not found.",
        },
        404,
      );
    }

    return json(
      buildTaskResponse(
        task,
      ),
    );
  }

  let tasks =
    await listPersistentAutonomousDevelopmentTasks();

  if (
    objective?.trim()
  ) {
    const normalizedObjective =
      normalizeObjective(
        objective,
      );

    tasks =
      tasks.filter(
        (task) =>
          normalizeObjective(
            task.objective,
          ) ===
          normalizedObjective,
      );
  }

  return json(
    buildTaskListResponse(
      tasks,
    ),
  );
}

export async function POST(
  request: NextRequest,
) {
  const auth =
    requireFounder(
      request,
    );

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body =
      await request.json();

    if (
      body?.action !==
      "autonomous"
    ) {
      return json(
        {
          ok: false,
          code:
            "UNKNOWN_ACTION",
          error:
            "Only the autonomous development action is exposed by this route.",
        },
        400,
      );
    }

    const objective =
      normalizeObjective(
        body?.objective,
      );

    if (!objective) {
      return json(
        {
          ok: false,
          code:
            "AUTONOMOUS_OBJECTIVE_REQUIRED",
          error:
            "Development objective is required.",
        },
        400,
      );
    }

    /*
     * Persistent idempotency boundary.
     *
     * This lookup is intentionally performed against
     * the persistent task store so two separate Vercel
     * instances do not independently start the same
     * Founder objective when a previous task is still
     * todo/running.
     */
    const existingTask =
      await findPersistentActiveAutonomousDevelopmentTask(
        objective,
      );

    if (
      existingTask
    ) {
      return json(
        buildTaskResponse(
          existingTask,
          {
            duplicate:
              true,
          },
        ),
        202,
      );
    }

    const task =
      createAutonomousDevelopmentTask(
        {
          objective,
          targetPaths: [],
        },
      );

    /*
     * Close the creation-to-execution durability gap.
     *
     * Previously the task remained "todo" until the
     * background Agent called claimAutonomousDevelopmentTask().
     * If the Vercel invocation ended between createTask()
     * and after(), the persistent record could remain queued
     * without ever entering the stale-heartbeat recovery path.
     *
     * The route now claims the task before returning the HTTP
     * response. The task therefore becomes a durable "running"
     * execution lease before after() starts the Agent.
     */
    const claimedTask =
      claimAutonomousDevelopmentTask(
        task.id,
      );

    /*
     * Make the running state durable before the request
     * returns. This is awaited deliberately because this
     * persistence boundary protects the autonomous execution
     * lease across Vercel instances.
     */
    await persistAutonomousDevelopmentTasks();

    /*
     * The HTTP request returns immediately after the durable
     * execution lease has been persisted.
     *
     * AIOS remains the execution authority:
     *
     * Planner
     * -> repository read
     * -> patch
     * -> safety gate
     * -> GitHub write
     * -> readback
     * -> Vercel verification
     *
     * The Agent receives the exact taskId and continues the
     * already-claimed running task without creating another task.
     */
    after(
      async () => {
        try {
          await executeAutonomousDevelopmentAgent(
            {
              objective,
              taskId:
                claimedTask.id,
            },
          );
        } catch (
          error
        ) {
          const reason =
            error instanceof
            Error
              ? error.message
              : "Autonomous development execution failed.";

          try {
            blockAutonomousDevelopmentTask(
              claimedTask.id,
              reason,
            );
          } catch {
            /*
             * Preserve the original execution failure.
             * The Agent/control-plane remains responsible
             * for the authoritative terminal state whenever
             * possible.
             */
          }
        }
      },
    );

    return json(
      buildTaskResponse(
        claimedTask,
        {
          duplicate:
            false,
          message:
            "Autonomous development execution lease persisted. AIOS is executing the development loop.",
        },
      ),
      202,
    );
  } catch (
    error
  ) {
    return json(
      {
        ok: false,
        code:
          "AUTONOMOUS_DEVELOPMENT_REQUEST_FAILED",
        error:
          error instanceof
          Error
            ? error.message
            : "Autonomous development request failed.",
      },
      500,
    );
  }
}
