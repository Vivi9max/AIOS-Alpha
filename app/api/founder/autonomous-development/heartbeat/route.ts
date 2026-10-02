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
import {
  buildAutonomousDevelopmentReceipt,
} from "@/lib/github/autonomous-development-receipt";

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

function buildReceipt(
  task: {
    status: string;
    commitSha?: string;
    result?: {
      commitSha?: string;
      readbackVerified: boolean;
      verificationPassed: boolean;
      reason?: string;
    };
  },
) {
  return buildAutonomousDevelopmentReceipt(
    {
      status:
        task.status as
          | "todo"
          | "running"
          | "completed"
          | "failed"
          | "blocked",
      commitSha:
        task.result?.commitSha ??
        task.commitSha,
      readbackVerified:
        task.result
          ?.readbackVerified ??
        false,
      verificationPassed:
        task.result
          ?.verificationPassed ??
        false,
    },
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

  const receipt =
    buildReceipt(
      task,
    );

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
    receipt: {
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
    },
    receiptValid:
      receipt.valid,
    successfulReceipt:
      receipt.successful,
    missingEvidence:
      receipt.missingEvidence,
  };
}

function buildTerminalCode(
  task: {
    status: string;
    commitSha?: string;
    result?: {
      commitSha?: string;
      readbackVerified: boolean;
      verificationPassed: boolean;
      reason?: string;
    };
  },
) {
  const receipt =
    buildReceipt(
      task,
    );

  if (
    task.status ===
      "completed"
  ) {
    return receipt.successful
      ? "AUTONOMOUS_DEVELOPMENT_HEARTBEAT_COMPLETED"
      : "AUTONOMOUS_DEVELOPMENT_HEARTBEAT_COMPLETED_RECEIPT_INVALID";
  }

  if (
    task.status ===
      "failed"
  ) {
    return "AUTONOMOUS_DEVELOPMENT_HEARTBEAT_FAILED";
  }

  if (
    task.status ===
      "blocked"
  ) {
    return "AUTONOMOUS_DEVELOPMENT_HEARTBEAT_BLOCKED";
  }

  return "AUTONOMOUS_DEVELOPMENT_HEARTBEAT_TERMINAL";
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

    const existingReceipt =
      buildReceipt(
        existingTask,
      );

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
          success:
            existingReceipt.successful,
          code:
            buildTerminalCode(
              existingTask,
            ),
          taskId:
            existingTask.id,
          status:
            existingTask.status,
          phase:
            existingTask.phase,
          receipt: {
            terminal:
              existingReceipt.terminal,
            successful:
              existingReceipt.successful,
            valid:
              existingReceipt.valid,
            receiptValid:
              existingReceipt.valid,
            commitSha:
              existingReceipt.commitSha,
            readbackVerified:
              existingReceipt.readbackVerified,
            verificationPassed:
              existingReceipt.verificationPassed,
            missingEvidence:
              existingReceipt.missingEvidence,
          },
          receiptValid:
            existingReceipt.valid,
          successfulReceipt:
            existingReceipt.successful,
          missingEvidence:
            existingReceipt.missingEvidence,
          task:
            buildTaskResponse(
              existingTask,
            ),
          message:
            existingTask.status ===
              "completed"
              ? existingReceipt.successful
                ? "Autonomous development task is completed and its terminal receipt is valid."
                : "Autonomous development task reports completed status, but its terminal receipt evidence is incomplete or invalid."
              : "Autonomous development task is already terminal. No heartbeat mutation was required.",
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

    if (!refreshedTask) {
      return json(
        {
          ok: false,
          code:
            "AUTONOMOUS_DEVELOPMENT_TASK_DISAPPEARED",
          taskId:
            existingTask.id,
          error:
            "Autonomous development task could not be reloaded after heartbeat persistence.",
        },
        500,
      );
    }

    const refreshedReceipt =
      buildReceipt(
        refreshedTask,
      );

    return json(
      {
        ok: true,
        success:
          refreshedReceipt.successful,
        code:
          refreshedReceipt.terminal
            ? buildTerminalCode(
                refreshedTask,
              )
            : "AUTONOMOUS_DEVELOPMENT_HEARTBEAT_ACCEPTED",
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
        receipt: {
          terminal:
            refreshedReceipt.terminal,
          successful:
            refreshedReceipt.successful,
          valid:
            refreshedReceipt.valid,
          receiptValid:
            refreshedReceipt.valid,
          commitSha:
            refreshedReceipt.commitSha,
          readbackVerified:
            refreshedReceipt.readbackVerified,
          verificationPassed:
            refreshedReceipt.verificationPassed,
          missingEvidence:
            refreshedReceipt.missingEvidence,
        },
        receiptValid:
          refreshedReceipt.valid,
        successfulReceipt:
          refreshedReceipt.successful,
        missingEvidence:
          refreshedReceipt.missingEvidence,
        task:
          buildTaskResponse(
            refreshedTask,
          ),
        message:
          refreshedReceipt.terminal
            ? refreshedReceipt.successful
              ? "Autonomous development reached a valid successful terminal receipt."
              : "Autonomous development reached a terminal state without a valid successful receipt."
            : "Autonomous development heartbeat persisted.",
      },
    );
  } catch (
    error
  ) {
    const message =
      error instanceof
      Error
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

  const receipt =
    buildReceipt(
      task,
    );

  return json(
    {
      ok: true,
      success:
        receipt.successful,
      code:
        task.status ===
          "completed"
          ? receipt.successful
            ? "AUTONOMOUS_DEVELOPMENT_HEARTBEAT_COMPLETED"
            : "AUTONOMOUS_DEVELOPMENT_HEARTBEAT_COMPLETED_RECEIPT_INVALID"
          : "AUTONOMOUS_DEVELOPMENT_HEARTBEAT_STATUS",
      taskId:
        task.id,
      status:
        task.status,
      phase:
        task.phase,
      lastHeartbeatAt:
        task.lastHeartbeatAt,
      heartbeatAgeMs,
      receipt: {
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
      },
      receiptValid:
        receipt.valid,
      successfulReceipt:
        receipt.successful,
      missingEvidence:
        receipt.missingEvidence,
      task:
        buildTaskResponse(
          task,
        ),
    },
  );
}
