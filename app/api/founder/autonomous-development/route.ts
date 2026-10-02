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
  claimPersistentAutonomousDevelopmentTask,
  createAutonomousDevelopmentTask,
  findPersistentActiveAutonomousDevelopmentTask,
  getPersistentAutonomousDevelopmentTask,
  listPersistentAutonomousDevelopmentTasks,
} from "@/lib/github/autonomous-development-control-plane";
import {
  heartbeatAutonomousDevelopmentExecution,
  clearAutonomousDevelopmentHeartbeatState,
  getAutonomousDevelopmentHeartbeatInterval,
} from "@/lib/github/autonomous-development-heartbeat";
import { executeAutonomousDevelopmentAgent } from "@/lib/github/autonomous-development-agent";
import {
  finalizeAutonomousDevelopmentFailure,
  finalizeAutonomousDevelopmentTask,
} from "@/lib/github/autonomous-development-finalization";
import {
  buildAutonomousDevelopmentReceipt,
} from "@/lib/github/autonomous-development-receipt";

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

type TaskResult = {
  commitSha?: string;
  readbackVerified: boolean;
  verificationPassed: boolean;
  reason?: string;
};

type TaskLike = {
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
  result?: TaskResult;
};

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

function buildReceipt(
  task: {
    status: string;
    result?: TaskResult;
    commitSha?: string;
  },
) {
  const result =
    task.result;

  const receipt =
    buildAutonomousDevelopmentReceipt(
      {
        status:
          task.status as
            | "todo"
            | "running"
            | "completed"
            | "failed"
            | "blocked",
        commitSha:
          result?.commitSha ??
          task.commitSha,
        readbackVerified:
          result?.readbackVerified ??
          false,
        verificationPassed:
          result?.verificationPassed ??
          false,
      },
    );

  return {
    terminal:
      receipt.terminal,
    successful:
      receipt.successful,
    valid:
      receipt.valid,
    receiptValid:
      receipt.valid,
    commitSha:
      receipt.commitSha,
    readbackVerified:
      receipt.readbackVerified,
    verificationPassed:
      receipt.verificationPassed,
    missingEvidence:
      receipt.missingEvidence,
  };
}

function buildTaskResponse(
  task: TaskLike,
  options?: {
    duplicate?: boolean;
    message?: string;
  },
) {
  const duplicate =
    options?.duplicate ===
    true;

  const receipt =
    buildReceipt(
      task,
    );

  const message =
    options?.message ??
    (duplicate
      ? "An autonomous development task with the same objective is already active. No duplicate execution was started."
      : task.status ===
          "completed"
        ? receipt.successful
          ? "Autonomous development completed successfully and its terminal receipt is valid."
          : "Autonomous development reported completed status, but its terminal receipt evidence is incomplete or invalid."
        : task.status ===
            "blocked"
          ? "Autonomous development is blocked and requires inspection."
          : task.status ===
              "failed"
            ? "Autonomous development failed."
            : "Autonomous development started. AIOS is executing the development loop.");

  const success =
    receipt.successful;

  const code =
    duplicate
      ? "AUTONOMOUS_DEVELOPMENT_ALREADY_RUNNING"
      : task.status ===
          "completed"
        ? receipt.successful
          ? "AUTONOMOUS_DEVELOPMENT_COMPLETED"
          : "AUTONOMOUS_DEVELOPMENT_COMPLETED_RECEIPT_INVALID"
        : task.status ===
            "blocked"
          ? "AUTONOMOUS_DEVELOPMENT_BLOCKED"
          : task.status ===
              "failed"
            ? "AUTONOMOUS_DEVELOPMENT_FAILED"
            : "AUTONOMOUS_DEVELOPMENT_RUNNING";

  return {
    ok: true,
    success,
    code,
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
    receipt,
    receiptValid:
      receipt.receiptValid,
    successfulReceipt:
      receipt.successful,
    missingEvidence:
      receipt.missingEvidence,
    duplicate,
    task,
    message,
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
    tasks:
      tasks.map(
        (task) => {
          const receipt =
            buildReceipt(
              task,
            );

          return {
            ...task,
            receipt,
            receiptValid:
              receipt.receiptValid,
            successfulReceipt:
              receipt.successful,
            missingEvidence:
              receipt.missingEvidence,
          };
        },
      ),
  };
}

/**
 * Keeps the persistent execution lease alive while the
 * autonomous development Agent is executing.
 *
 * This watchdog is intentionally outside the Agent so the
 * large Agent implementation does not need to be rewritten.
 *
 * The Agent remains the execution authority. The watchdog
 * only maintains durable execution liveness.
 */
async function executeWithHeartbeatWatchdog(
  taskId: string,
  objective: string,
) {
  const intervalMs =
    getAutonomousDevelopmentHeartbeatInterval();

  let stopped =
    false;

  const sendHeartbeat =
    async (
      reason: string,
      force = false,
    ) => {
      if (stopped) {
        return;
      }

      try {
        const heartbeat =
          await heartbeatAutonomousDevelopmentExecution(
            taskId,
            {
              reason,
              force,
            },
          );

        if (
          heartbeat.status ===
            "completed" ||
          heartbeat.status ===
            "failed" ||
          heartbeat.status ===
            "blocked" ||
          heartbeat.stale
        ) {
          stopped = true;
        }
      } catch {
        /*
         * Heartbeat failure must not replace the Agent's
         * authoritative execution result.
         *
         * The persistent control plane remains the source
         * of truth and can recover stale tasks separately.
         */
      }
    };

  await sendHeartbeat(
    `AIOS autonomous development execution started: ${objective}`,
    true,
  );

  const timer =
    setInterval(
      () => {
        void sendHeartbeat(
          "AIOS autonomous development execution is still running.",
          false,
        );
      },
      intervalMs,
    );

  try {
    return await executeAutonomousDevelopmentAgent(
      {
        objective,
        taskId,
      },
    );
  } finally {
    stopped = true;

    clearInterval(
      timer,
    );

    try {
      await heartbeatAutonomousDevelopmentExecution(
        taskId,
        {
          reason:
            "AIOS autonomous development execution finished. Final task state is authoritative.",
          force: true,
        },
      );
    } catch {
      /*
       * The Agent's terminal state remains authoritative.
       */
    }

    clearAutonomousDevelopmentHeartbeatState(
      taskId,
    );
  }
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
     * Persistent execution lease.
     *
     * The claim operation hydrates persistent state,
     * verifies that the task is still todo, changes it
     * to running, and awaits persistence before the
     * background Agent starts.
     */
    const claimedTask =
      await claimPersistentAutonomousDevelopmentTask(
        task.id,
      );

    /*
     * The durable running state now exists before the
     * background Agent starts.
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
     * The heartbeat watchdog runs alongside the Agent
     * without modifying the Agent implementation.
     */
    after(
      async () => {
        try {
          await executeWithHeartbeatWatchdog(
            claimedTask.id,
            objective,
          );

          /*
           * Explicit terminal persistence boundary.
           *
           * The Agent remains responsible for the actual
           * development result. This finalization step makes
           * the terminal receipt durable after the Agent has
           * returned and after the final heartbeat has been
           * attempted.
           */
          await finalizeAutonomousDevelopmentTask(
            claimedTask.id,
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
             * The persistent control plane remains
             * responsible for the authoritative terminal
             * state whenever possible.
             */
          }

          try {
            await finalizeAutonomousDevelopmentFailure(
              claimedTask.id,
            );
          } catch {
            /*
             * Finalization failure must not hide the
             * original autonomous execution failure.
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
            "Autonomous development execution lease persisted. AIOS is executing the development loop with persistent heartbeat monitoring.",
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
