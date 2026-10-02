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
  createAutonomousDevelopmentTask,
  getAutonomousDevelopmentTask,
  listAutonomousDevelopmentTasks,
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

function findActiveTaskByObjective(
  objective: string,
) {
  const normalizedObjective =
    normalizeObjective(
      objective,
    );

  if (
    !normalizedObjective
  ) {
    return null;
  }

  return (
    listAutonomousDevelopmentTasks().find(
      (task) =>
        ACTIVE_TASK_STATUSES.has(
          task.status,
        ) &&
        normalizeObjective(
          task.objective,
        ) ===
          normalizedObjective,
    ) ?? null
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
  tasks: ReturnType<
    typeof listAutonomousDevelopmentTasks
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
   * The Founder UI binds polling to the exact task returned by POST.
   * Objective-based lookup remains available as a compatibility
   * fallback, but must never override an explicit taskId.
   */
  if (
    taskId?.trim()
  ) {
    const task =
      getAutonomousDevelopmentTask(
        taskId.trim(),
      );

    if (!task) {
      return json(
        {
          ok: false,
          code:
            "TASK_NOT_FOUND",
          taskId:
            taskId.trim(),
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
    listAutonomousDevelopmentTasks();

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
     * Idempotency boundary:
     *
     * Before creating a task, inspect the authoritative control-plane
     * task collection. A todo/running task with the same normalized
     * objective is reused instead of starting a second Agent.
     */
    const existingTask =
      findActiveTaskByObjective(
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
     * The HTTP request returns immediately.
     *
     * AIOS remains the actual execution authority:
     * Planner -> repository read -> patch -> safety gate ->
     * GitHub write -> readback -> Vercel verification.
     */
    after(
      async () => {
        try {
          await executeAutonomousDevelopmentAgent(
            {
              objective,
              taskId:
                task.id,
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
              task.id,
              reason,
            );
          } catch {
            /*
             * Preserve the original execution failure.
             * The Agent/control-plane is responsible for the
             * authoritative terminal state whenever possible.
             */
          }
        }
      },
    );

    return json(
      buildTaskResponse(
        task,
        {
          duplicate:
            false,
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
          error instanceof Error
            ? error.message
            : "Autonomous development request failed.",
      },
      500,
    );
  }
}
