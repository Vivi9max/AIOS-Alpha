import "server-only";

import {
  heartbeatPersistentAutonomousDevelopmentTask,
  getPersistentAutonomousDevelopmentTask,
} from "@/lib/github/autonomous-development-control-plane";

export type AutonomousDevelopmentHeartbeatResult = {
  ok: boolean;
  taskId: string;
  status:
    | "todo"
    | "running"
    | "completed"
    | "failed"
    | "blocked";
  phase:
    | "QUEUED"
    | "DISCOVERING"
    | "PLANNING"
    | "READING"
    | "GENERATING"
    | "WRITING"
    | "READBACK"
    | "BUILD"
    | "REPAIR"
    | "COMPLETED"
    | "BLOCKED";
  lastHeartbeatAt?: string;
  updatedAt?: string;
  reason?: string;
  stale?: boolean;
};

const HEARTBEAT_MIN_INTERVAL_MS =
  30 * 1000;

const heartbeatLocks =
  new Map<string, Promise<void>>();

const lastHeartbeatAt =
  new Map<string, number>();

function isTerminalStatus(
  status: AutonomousDevelopmentHeartbeatResult["status"],
) {
  return (
    status === "completed" ||
    status === "failed" ||
    status === "blocked"
  );
}

function shouldSendHeartbeat(
  taskId: string,
  force: boolean,
) {
  if (force) {
    return true;
  }

  const previous =
    lastHeartbeatAt.get(
      taskId,
    );

  if (
    previous === undefined
  ) {
    return true;
  }

  return (
    Date.now() -
      previous >=
    HEARTBEAT_MIN_INTERVAL_MS
  );
}

async function runHeartbeat(
  taskId: string,
  reason?: string,
): Promise<AutonomousDevelopmentHeartbeatResult> {
  const task =
    await getPersistentAutonomousDevelopmentTask(
      taskId,
    );

  if (!task) {
    return {
      ok: false,
      taskId,
      status: "failed",
      phase: "BLOCKED",
      reason:
        "AUTONOMOUS_DEVELOPMENT_TASK_NOT_FOUND",
      stale: true,
    };
  }

  if (
    isTerminalStatus(
      task.status,
    )
  ) {
    return {
      ok: true,
      taskId: task.id,
      status: task.status,
      phase: task.phase,
      lastHeartbeatAt:
        task.lastHeartbeatAt,
      updatedAt:
        task.updatedAt,
      reason:
        task.reason,
      stale: false,
    };
  }

  if (
    task.status !==
    "running"
  ) {
    return {
      ok: false,
      taskId: task.id,
      status: task.status,
      phase: task.phase,
      lastHeartbeatAt:
        task.lastHeartbeatAt,
      updatedAt:
        task.updatedAt,
      reason:
        task.reason ||
        "AUTONOMOUS_DEVELOPMENT_TASK_NOT_RUNNING",
      stale: false,
    };
  }

  try {
    const heartbeat =
      await heartbeatPersistentAutonomousDevelopmentTask(
        task.id,
        reason,
      );

    lastHeartbeatAt.set(
      task.id,
      Date.now(),
    );

    return {
      ok: true,
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
      stale: false,
    };
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "AUTONOMOUS_DEVELOPMENT_HEARTBEAT_FAILED";

    return {
      ok: false,
      taskId: task.id,
      status: task.status,
      phase: task.phase,
      lastHeartbeatAt:
        task.lastHeartbeatAt,
      updatedAt:
        task.updatedAt,
      reason: message,
      stale:
        message.includes(
          "HEARTBEAT_STALE",
        ),
    };
  }
}

export async function heartbeatAutonomousDevelopmentExecution(
  taskId: string,
  options?: {
    reason?: string;
    force?: boolean;
  },
): Promise<AutonomousDevelopmentHeartbeatResult> {
  const normalizedTaskId =
    taskId.trim();

  if (
    !normalizedTaskId
  ) {
    return {
      ok: false,
      taskId: "",
      status: "failed",
      phase: "BLOCKED",
      reason:
        "AUTONOMOUS_DEVELOPMENT_TASK_ID_REQUIRED",
      stale: false,
    };
  }

  const force =
    options?.force === true;

  if (
    !shouldSendHeartbeat(
      normalizedTaskId,
      force,
    )
  ) {
    const task =
      await getPersistentAutonomousDevelopmentTask(
        normalizedTaskId,
      );

    if (!task) {
      return {
        ok: false,
        taskId:
          normalizedTaskId,
        status: "failed",
        phase: "BLOCKED",
        reason:
          "AUTONOMOUS_DEVELOPMENT_TASK_NOT_FOUND",
        stale: true,
      };
    }

    return {
      ok: true,
      taskId:
        task.id,
      status:
        task.status,
      phase:
        task.phase,
      lastHeartbeatAt:
        task.lastHeartbeatAt,
      updatedAt:
        task.updatedAt,
      reason:
        task.reason,
      stale: false,
    };
  }

  const existingLock =
    heartbeatLocks.get(
      normalizedTaskId,
    );

  if (existingLock) {
    await existingLock;

    const task =
      await getPersistentAutonomousDevelopmentTask(
        normalizedTaskId,
      );

    if (!task) {
      return {
        ok: false,
        taskId:
          normalizedTaskId,
        status: "failed",
        phase: "BLOCKED",
        reason:
          "AUTONOMOUS_DEVELOPMENT_TASK_NOT_FOUND",
        stale: true,
      };
    }

    return {
      ok: true,
      taskId:
        task.id,
      status:
        task.status,
      phase:
        task.phase,
      lastHeartbeatAt:
        task.lastHeartbeatAt,
      updatedAt:
        task.updatedAt,
      reason:
        task.reason,
      stale: false,
    };
  }

  let releaseLock:
    | (() => void)
    | undefined;

  const lock =
    new Promise<void>(
      (resolve) => {
        releaseLock =
          resolve;
      },
    );

  heartbeatLocks.set(
    normalizedTaskId,
    lock,
  );

  try {
    return await runHeartbeat(
      normalizedTaskId,
      options?.reason,
    );
  } finally {
    heartbeatLocks.delete(
      normalizedTaskId,
    );

    releaseLock?.();
  }
}

export async function heartbeatBeforeAutonomousDevelopmentPhase(
  taskId: string,
  phase: string,
) {
  return heartbeatAutonomousDevelopmentExecution(
    taskId,
    {
      reason:
        `AIOS autonomous development phase active: ${phase}`,
      force: true,
    },
  );
}

export async function heartbeatDuringAutonomousDevelopmentPhase(
  taskId: string,
  phase: string,
) {
  return heartbeatAutonomousDevelopmentExecution(
    taskId,
    {
      reason:
        `AIOS autonomous development phase running: ${phase}`,
      force: false,
    },
  );
}

export async function heartbeatAfterAutonomousDevelopmentPhase(
  taskId: string,
  phase: string,
) {
  return heartbeatAutonomousDevelopmentExecution(
    taskId,
    {
      reason:
        `AIOS autonomous development phase completed: ${phase}`,
      force: true,
    },
  );
}

export function clearAutonomousDevelopmentHeartbeatState(
  taskId: string,
) {
  const normalizedTaskId =
    taskId.trim();

  lastHeartbeatAt.delete(
    normalizedTaskId,
  );

  heartbeatLocks.delete(
    normalizedTaskId,
  );
}

export function getAutonomousDevelopmentHeartbeatInterval() {
  return HEARTBEAT_MIN_INTERVAL_MS;
}
