import "server-only";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  heartbeatPersistentAutonomousDevelopmentTask,
  getPersistentAutonomousDevelopmentTask,
} from "@/lib/github/autonomous-development-control-plane";
import {
  isFounderConfigured,
  isFounderRequest,
} from "@/lib/founder/auth";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

export const maxDuration =
  30;

const MAX_REASON_LENGTH =
  500;

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

function normalizeTaskId(
  value: unknown,
) {
  return String(
    value ?? "",
  ).trim();
}

function normalizeReason(
  value: unknown,
) {
  return String(
    value ?? "",
  )
    .trim()
    .replace(
      /\s+/g,
      " ",
    )
    .slice(
      0,
      MAX_REASON_LENGTH,
    );
}

function buildTaskResponse(
  task: Awaited<
    ReturnType<
      typeof getPersistentAutonomousDevelopmentTask
    >
  >,
) {
  if (!task) {
    return null;
  }

  return {
    id: task.id,
    objective:
      task.objective,
    repository:
      task.repository,
    branch:
      task.branch,
    status:
      task.status,
    phase:
      task.phase,
    reason:
      task.reason,
    commitSha:
      task.commitSha,
    targetPaths:
      task.targetPaths ?? [],
    changedPaths:
      task.changedPaths ?? [],
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
      task.phaseHistory ?? [],
    result:
      task.result,
  };
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

    const taskId =
      normalizeTaskId(
        body?.taskId,
      );

    if (!taskId) {
      return json(
        {
          ok: false,
          code:
            "AUTONOMOUS_DEVELOPMENT_TASK_ID_REQUIRED",
          error:
            "Autonomous development taskId is required.",
        },
        400,
      );
    }

    const existingTask =
      await getPersistentAutonomousDevelopmentTask(
        taskId,
      );

    if (!existingTask) {
      return json(
        {
          ok: false,
          code:
            "TASK_NOT_FOUND",
          taskId,
          error:
            "Autonomous development task was not found.",
        },
        404,
      );
    }

    if (
      existingTask.status ===
        "completed" ||
      existingTask.status ===
        "failed" ||
      existingTask.status ===
        "blocked"
    ) {
      return json(
        {
          ok: true,
          success: true,
          code:
            "AUTONOMOUS_DEVELOPMENT_TERMINAL",
          taskId:
            existingTask.id,
          status:
            existingTask.status,
          phase:
            existingTask.phase,
          task:
            buildTaskResponse(
              existingTask,
            ),
          message:
            "Autonomous development task is already terminal. No heartbeat mutation was required.",
        },
      );
    }

    if (
      existingTask.status !==
      "running"
    ) {
      return json(
        {
          ok: false,
          code:
            "AUTONOMOUS_DEVELOPMENT_TASK_NOT_RUNNING",
          taskId:
            existingTask.id,
          status:
            existingTask.status,
          phase:
            existingTask.phase,
          task:
            buildTaskResponse(
              existingTask,
            ),
          error:
            "Only a running autonomous development task can receive a heartbeat.",
        },
        409,
      );
    }

    const reason =
      normalizeReason(
        body?.reason,
      );

    const heartbeat =
      await heartbeatPersistentAutonomousDevelopmentTask(
        existingTask.id,
        reason || undefined,
      );

    const refreshedTask =
      await getPersistentAutonomousDevelopmentTask(
        existingTask.id,
      );

    return json(
      {
        ok: true,
        success: true,
        code:
          "AUTONOMOUS_DEVELOPMENT_HEARTBEAT_ACCEPTED",
        taskId:
          heartbeat.taskId,
        status:
          heartbeat.status,
        phase:
          heartbeat.phase,
        lastHeartbeatAt:
          heartbeat.lastHeartbeatAt,
        updatedAt:
          heartbeat.updatedAt,
        reason:
          heartbeat.reason,
        task:
          buildTaskResponse(
            refreshedTask,
          ),
        message:
          "Autonomous development heartbeat persisted.",
      },
    );
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "Autonomous development heartbeat failed.";

    const stale =
      message.includes(
        "HEARTBEAT_STALE",
      );

    return json(
      {
        ok: false,
        code: stale
          ? "AUTONOMOUS_DEVELOPMENT_HEARTBEAT_STALE"
          : "AUTONOMOUS_DEVELOPMENT_HEARTBEAT_FAILED",
        error: message,
      },
      stale
        ? 409
        : 500,
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
    normalizeTaskId(
      request.nextUrl.searchParams.get(
        "taskId",
      ),
    );

  if (!taskId) {
    return json(
      {
        ok: false,
        code:
          "AUTONOMOUS_DEVELOPMENT_TASK_ID_REQUIRED",
        error:
          "Autonomous development taskId is required.",
      },
      400,
    );
  }

  const task =
    await getPersistentAutonomousDevelopmentTask(
      taskId,
    );

  if (!task) {
    return json(
      {
        ok: false,
        code:
          "TASK_NOT_FOUND",
        taskId,
        error:
          "Autonomous development task was not found.",
      },
      404,
    );
  }

  const heartbeatAgeMs =
    task.lastHeartbeatAt
      ? Math.max(
          0,
          Date.now() -
            new Date(
              task.lastHeartbeatAt,
            ).getTime(),
        )
      : null;

  return json(
    {
      ok: true,
      success: true,
      code:
        "AUTONOMOUS_DEVELOPMENT_HEARTBEAT_STATUS",
      taskId:
        task.id,
      status:
        task.status,
      phase:
        task.phase,
      lastHeartbeatAt:
        task.lastHeartbeatAt,
      heartbeatAgeMs,
      task:
        buildTaskResponse(
          task,
        ),
    },
  );
}
