import "server-only";

export type AutonomousDevelopmentTaskStatus =
  | "todo"
  | "running"
  | "completed"
  | "failed"
  | "blocked";

export type AutonomousDevelopmentTaskPhase =
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

export type AutonomousDevelopmentPhaseEvent = {
  phase: AutonomousDevelopmentTaskPhase;
  at: string;
  reason?: string;
};

export type AutonomousDevelopmentTask = {
  id: string;
  objective: string;
  repository: string;
  branch: string;
  targetPaths: string[];
  status: AutonomousDevelopmentTaskStatus;
  phase: AutonomousDevelopmentTaskPhase;
  reason?: string;
  commitSha?: string;
  changedPaths?: string[];
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  lastHeartbeatAt?: string;
  phaseHistory: AutonomousDevelopmentPhaseEvent[];
};

export type AutonomousDevelopmentReceipt = {
  taskId: string;
  status: AutonomousDevelopmentTaskStatus;
  repository: string;
  branch: string;
  targetPaths: string[];
  phases: string[];
  commitSha?: string;
  readbackVerified: boolean;
  verificationPassed: boolean;
  reason?: string;
  startedAt?: string;
  completedAt: string;
};

const tasks = new Map<
  string,
  AutonomousDevelopmentTask
>();

const ALLOWED_REPOSITORY =
  "Vivi9max/AIOS-Alpha";

const ALLOWED_BRANCH =
  "main";

const MAX_OBJECTIVE_LENGTH =
  4000;

const MAX_TARGET_PATHS =
  6;

const TERMINAL_STATUSES =
  new Set<AutonomousDevelopmentTaskStatus>([
    "completed",
    "failed",
    "blocked",
  ]);

const PHASE_TRANSITIONS: Record<
  AutonomousDevelopmentTaskPhase,
  AutonomousDevelopmentTaskPhase[]
> = {
  QUEUED: [
    "DISCOVERING",
    "READING",
    "BLOCKED",
  ],

  DISCOVERING: [
    "PLANNING",
    "READING",
    "BLOCKED",
  ],

  PLANNING: [
    "READING",
    "BLOCKED",
  ],

  READING: [
    "READING",
    "GENERATING",
    "BLOCKED",
  ],

  GENERATING: [
    "GENERATING",
    "WRITING",
    "READING",
    "BLOCKED",
  ],

  WRITING: [
    "WRITING",
    "READBACK",
    "BLOCKED",
  ],

  READBACK: [
    "READBACK",
    "BUILD",
    "BLOCKED",
  ],

  BUILD: [
    "BUILD",
    "REPAIR",
    "COMPLETED",
    "BLOCKED",
  ],

  REPAIR: [
    "READING",
    "GENERATING",
    "WRITING",
    "READBACK",
    "BUILD",
    "BLOCKED",
  ],

  COMPLETED: [],

  BLOCKED: [],
};

function now() {
  return new Date().toISOString();
}

function createTaskId() {
  return `ad-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeTargetPaths(
  targetPaths: string[],
) {
  return Array.from(
    new Set(
      targetPaths
        .map((path) =>
          path.trim().replace(/^\/+/, ""),
        )
        .filter(Boolean),
    ),
  );
}

function assertSafeTask(
  task: AutonomousDevelopmentTask,
) {
  if (
    task.repository !==
    ALLOWED_REPOSITORY
  ) {
    throw new Error(
      "Repository is outside the Founder development boundary.",
    );
  }

  if (
    task.branch !==
    ALLOWED_BRANCH
  ) {
    throw new Error(
      "Branch is outside the Founder development boundary.",
    );
  }

  const objective =
    task.objective.trim();

  if (!objective) {
    throw new Error(
      "Development objective is required.",
    );
  }

  if (
    objective.length >
    MAX_OBJECTIVE_LENGTH
  ) {
    throw new Error(
      "Development objective exceeds the maximum allowed length.",
    );
  }

  if (
    task.targetPaths.length >
    MAX_TARGET_PATHS
  ) {
    throw new Error(
      `A maximum of ${MAX_TARGET_PATHS} target paths is allowed.`,
    );
  }

  for (
    const targetPath of task.targetPaths
  ) {
    if (
      !targetPath ||
      targetPath.startsWith("/") ||
      targetPath.includes("..") ||
      targetPath.includes("\\") ||
      targetPath.includes("\0")
    ) {
      throw new Error(
        `Unsafe target path: ${targetPath}`,
      );
    }
  }
}

function assertPhaseTransition(
  current:
    AutonomousDevelopmentTaskPhase,
  next:
    AutonomousDevelopmentTaskPhase,
) {
  if (current === next) {
    return;
  }

  const allowed =
    PHASE_TRANSITIONS[current] ||
    [];

  if (
    !allowed.includes(next)
  ) {
    throw new Error(
      `Invalid autonomous development phase transition: ${current} -> ${next}`,
    );
  }
}

function appendPhaseEvent(
  task: AutonomousDevelopmentTask,
  phase:
    AutonomousDevelopmentTaskPhase,
  reason?: string,
) {
  const timestamp =
    now();

  const previous =
    task.phaseHistory[
      task.phaseHistory.length - 1
    ];

  if (
    previous?.phase === phase &&
    previous.reason === reason
  ) {
    return;
  }

  task.phaseHistory.push({
    phase,
    at: timestamp,
    reason,
  });

  if (
    task.phaseHistory.length >
    100
  ) {
    task.phaseHistory =
      task.phaseHistory.slice(
        -100,
      );
  }
}

function touchTask(
  task: AutonomousDevelopmentTask,
) {
  const timestamp =
    now();

  task.updatedAt =
    timestamp;

  task.lastHeartbeatAt =
    timestamp;
}

export function createAutonomousDevelopmentTask(
  input: {
    objective: string;
    targetPaths?: string[];
  },
) {
  const timestamp =
    now();

  const task: AutonomousDevelopmentTask =
    {
      id: createTaskId(),
      objective:
        input.objective.trim(),
      repository:
        ALLOWED_REPOSITORY,
      branch:
        ALLOWED_BRANCH,
      targetPaths:
        normalizeTargetPaths(
          input.targetPaths ??
            [],
        ),
      status: "todo",
      phase: "QUEUED",
      createdAt:
        timestamp,
      updatedAt:
        timestamp,
      lastHeartbeatAt:
        timestamp,
      phaseHistory: [
        {
          phase: "QUEUED",
          at: timestamp,
        },
      ],
    };

  assertSafeTask(task);

  tasks.set(
    task.id,
    task,
  );

  return task;
}

export function getAutonomousDevelopmentTask(
  taskId: string,
) {
  return (
    tasks.get(taskId) ??
    null
  );
}

export function listAutonomousDevelopmentTasks() {
  return Array.from(
    tasks.values(),
  ).sort(
    (a, b) =>
      new Date(
        b.createdAt,
      ).getTime() -
      new Date(
        a.createdAt,
      ).getTime(),
  );
}

export function claimAutonomousDevelopmentTask(
  taskId: string,
) {
  const task =
    tasks.get(taskId);

  if (!task) {
    throw new Error(
      "Development task not found.",
    );
  }

  if (
    task.status !==
    "todo"
  ) {
    throw new Error(
      `Task cannot be claimed from status: ${task.status}`,
    );
  }

  const timestamp =
    now();

  assertPhaseTransition(
    task.phase,
    "DISCOVERING",
  );

  task.status =
    "running";

  task.phase =
    "DISCOVERING";

  task.reason =
    undefined;

  task.startedAt =
    timestamp;

  task.completedAt =
    undefined;

  task.lastHeartbeatAt =
    timestamp;

  task.updatedAt =
    timestamp;

  appendPhaseEvent(
    task,
    "DISCOVERING",
  );

  tasks.set(
    taskId,
    task,
  );

  return task;
}

export function updateAutonomousDevelopmentTask(
  taskId: string,
  update: {
    phase?: AutonomousDevelopmentTaskPhase;
    reason?: string;
    targetPaths?: string[];
    commitSha?: string;
    changedPaths?: string[];
  },
) {
  const task =
    tasks.get(taskId);

  if (!task) {
    throw new Error(
      "Development task not found.",
    );
  }

  if (
    TERMINAL_STATUSES.has(
      task.status,
    )
  ) {
    throw new Error(
      `Task cannot be updated from terminal status: ${task.status}`,
    );
  }

  if (
    task.status !==
    "running"
  ) {
    throw new Error(
      `Task cannot be updated from status: ${task.status}`,
    );
  }

  if (
    update.phase
  ) {
    assertPhaseTransition(
      task.phase,
      update.phase,
    );

    task.phase =
      update.phase;

    appendPhaseEvent(
      task,
      update.phase,
      update.reason,
    );
  }

  if (
    update.reason !==
    undefined
  ) {
    task.reason =
      update.reason;
  }

  if (
    update.targetPaths
  ) {
    task.targetPaths =
      normalizeTargetPaths(
        update.targetPaths,
      );

    assertSafeTask(
      task,
    );
  }

  if (
    update.commitSha
  ) {
    task.commitSha =
      update.commitSha.trim() ||
      undefined;
  }

  if (
    update.changedPaths
  ) {
    task.changedPaths =
      normalizeTargetPaths(
        update.changedPaths,
      );
  }

  touchTask(task);

  tasks.set(
    taskId,
    task,
  );

  return task;
}

export function completeAutonomousDevelopmentTask(
  taskId: string,
  result: {
    commitSha: string;
    readbackVerified: boolean;
    verificationPassed: boolean;
    reason?: string;
  },
): AutonomousDevelopmentReceipt {
  const task =
    tasks.get(taskId);

  if (!task) {
    throw new Error(
      "Development task not found.",
    );
  }

  if (
    task.status !==
    "running"
  ) {
    throw new Error(
      `Task cannot complete from status: ${task.status}`,
    );
  }

  const passed =
    Boolean(
      result.commitSha,
    ) &&
    result.readbackVerified ===
      true &&
    result.verificationPassed ===
      true;

  const finalPhase =
    passed
      ? "COMPLETED"
      : "BLOCKED";

  assertPhaseTransition(
    task.phase,
    finalPhase,
  );

  const timestamp =
    now();

  task.status =
    passed
      ? "completed"
      : "failed";

  task.phase =
    finalPhase;

  task.reason =
    result.reason;

  task.commitSha =
    result.commitSha ||
    undefined;

  task.completedAt =
    timestamp;

  task.updatedAt =
    timestamp;

  task.lastHeartbeatAt =
    timestamp;

  appendPhaseEvent(
    task,
    finalPhase,
    result.reason,
  );

  tasks.set(
    taskId,
    task,
  );

  return {
    taskId,
    status:
      task.status,
    repository:
      task.repository,
    branch:
      task.branch,
    targetPaths:
      task.targetPaths,
    phases:
      task.phaseHistory.map(
        (event) =>
          event.phase,
      ),
    commitSha:
      result.commitSha,
    readbackVerified:
      result.readbackVerified,
    verificationPassed:
      result.verificationPassed,
    reason:
      result.reason,
    startedAt:
      task.startedAt,
    completedAt:
      timestamp,
  };
}

export function blockAutonomousDevelopmentTask(
  taskId: string,
  reason: string,
) {
  const task =
    tasks.get(taskId);

  if (!task) {
    throw new Error(
      "Development task not found.",
    );
  }

  if (
    task.status ===
    "completed"
  ) {
    throw new Error(
      "Completed autonomous development tasks cannot be blocked.",
    );
  }

  if (
    task.status ===
    "blocked"
  ) {
    return {
      taskId,
      status:
        "blocked" as const,
      reason:
        task.reason ||
        reason,
      completedAt:
        task.completedAt ||
        now(),
    };
  }

  if (
    task.phase !==
    "BLOCKED"
  ) {
    assertPhaseTransition(
      task.phase,
      "BLOCKED",
    );
  }

  const timestamp =
    now();

  task.status =
    "blocked";

  task.phase =
    "BLOCKED";

  task.reason =
    reason;

  task.completedAt =
    timestamp;

  task.updatedAt =
    timestamp;

  task.lastHeartbeatAt =
    timestamp;

  appendPhaseEvent(
    task,
    "BLOCKED",
    reason,
  );

  tasks.set(
    taskId,
    task,
  );

  return {
    taskId,
    status:
      "blocked" as const,
    reason,
    completedAt:
      timestamp,
  };
}

export function isAutonomousDevelopmentTaskTerminal(
  taskId: string,
) {
  const task =
    tasks.get(taskId);

  if (!task) {
    return false;
  }

  return TERMINAL_STATUSES.has(
    task.status,
  );
}

export function getAutonomousDevelopmentTaskHeartbeat(
  taskId: string,
) {
  const task =
    tasks.get(taskId);

  if (!task) {
    return null;
  }

  return {
    taskId:
      task.id,
    status:
      task.status,
    phase:
      task.phase,
    updatedAt:
      task.updatedAt,
    lastHeartbeatAt:
      task.lastHeartbeatAt,
  };
}
