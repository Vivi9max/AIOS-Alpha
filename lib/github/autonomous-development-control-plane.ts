import "server-only";

import {
  storage,
} from "@/lib/server-storage";

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

export type AutonomousDevelopmentTaskResult = {
  commitSha?: string;
  readbackVerified: boolean;
  verificationPassed: boolean;
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
  result?: AutonomousDevelopmentTaskResult;
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

const MAX_CHANGED_PATHS =
  20;

const MAX_PHASE_HISTORY =
  100;

const ACTIVE_TASK_STALE_MS =
  7 * 60 * 1000;

const TASK_STORAGE_KEY =
  "aios:autonomous-development:tasks";

const TERMINAL_STATUSES =
  new Set<AutonomousDevelopmentTaskStatus>([
    "completed",
    "failed",
    "blocked",
  ]);

const ACTIVE_STATUSES =
  new Set<AutonomousDevelopmentTaskStatus>([
    "todo",
    "running",
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

let persistenceQueue: Promise<void> =
  Promise.resolve();

function now(): string {
  return new Date().toISOString();
}

function createTaskId(): string {
  return [
    "ad",
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 8),
  ].join("-");
}

function normalizeObjective(
  objective: string,
): string {
  return objective
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeTargetPaths(
  targetPaths: string[],
): string[] {
  return Array.from(
    new Set(
      targetPaths
        .map((path) =>
          path
            .trim()
            .replace(/^\/+/, ""),
        )
        .filter(Boolean),
    ),
  );
}

function normalizeChangedPaths(
  changedPaths: string[],
): string[] {
  return Array.from(
    new Set(
      changedPaths
        .map((path) =>
          path
            .trim()
            .replace(/^\/+/, ""),
        )
        .filter(Boolean),
    ),
  );
}

function normalizePhaseHistory(
  value: unknown,
): AutonomousDevelopmentPhaseEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (
        event,
      ): event is AutonomousDevelopmentPhaseEvent =>
        Boolean(event) &&
        typeof event === "object" &&
        typeof (
          event as AutonomousDevelopmentPhaseEvent
        ).phase === "string" &&
        typeof (
          event as AutonomousDevelopmentPhaseEvent
        ).at === "string",
    )
    .slice(-MAX_PHASE_HISTORY);
}

function normalizeTask(
  value: unknown,
): AutonomousDevelopmentTask | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const candidate =
    value as Partial<AutonomousDevelopmentTask>;

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.objective !== "string" ||
    typeof candidate.repository !== "string" ||
    typeof candidate.branch !== "string" ||
    typeof candidate.status !== "string" ||
    typeof candidate.phase !== "string" ||
    typeof candidate.createdAt !== "string" ||
    typeof candidate.updatedAt !== "string"
  ) {
    return null;
  }

  if (
    ![
      "todo",
      "running",
      "completed",
      "failed",
      "blocked",
    ].includes(candidate.status)
  ) {
    return null;
  }

  if (
    ![
      "QUEUED",
      "DISCOVERING",
      "PLANNING",
      "READING",
      "GENERATING",
      "WRITING",
      "READBACK",
      "BUILD",
      "REPAIR",
      "COMPLETED",
      "BLOCKED",
    ].includes(candidate.phase)
  ) {
    return null;
  }

  const task: AutonomousDevelopmentTask =
    {
      id:
        candidate.id,

      objective:
        normalizeObjective(
          candidate.objective,
        ),

      repository:
        candidate.repository,

      branch:
        candidate.branch,

      targetPaths:
        normalizeTargetPaths(
          Array.isArray(
            candidate.targetPaths,
          )
            ? candidate.targetPaths
            : [],
        ),

      status:
        candidate.status as AutonomousDevelopmentTaskStatus,

      phase:
        candidate.phase as AutonomousDevelopmentTaskPhase,

      reason:
        typeof candidate.reason === "string"
          ? candidate.reason
          : undefined,

      commitSha:
        typeof candidate.commitSha === "string"
          ? candidate.commitSha
          : undefined,

      changedPaths:
        Array.isArray(
          candidate.changedPaths,
        )
          ? normalizeChangedPaths(
              candidate.changedPaths,
            )
          : undefined,

      result:
        candidate.result &&
        typeof candidate.result === "object"
          ? {
              commitSha:
                typeof candidate.result.commitSha ===
                "string"
                  ? candidate.result.commitSha
                  : undefined,

              readbackVerified:
                candidate.result
                  .readbackVerified === true,

              verificationPassed:
                candidate.result
                  .verificationPassed === true,

              reason:
                typeof candidate.result.reason ===
                "string"
                  ? candidate.result.reason
                  : undefined,
            }
          : undefined,

      createdAt:
        candidate.createdAt,

      updatedAt:
        candidate.updatedAt,

      startedAt:
        typeof candidate.startedAt === "string"
          ? candidate.startedAt
          : undefined,

      completedAt:
        typeof candidate.completedAt === "string"
          ? candidate.completedAt
          : undefined,

      lastHeartbeatAt:
        typeof candidate.lastHeartbeatAt ===
        "string"
          ? candidate.lastHeartbeatAt
          : undefined,

      phaseHistory:
        normalizePhaseHistory(
          candidate.phaseHistory,
        ),
    };

  try {
    assertSafeTask(task);
  } catch {
    return null;
  }

  return task;
}

function cloneTask(
  task: AutonomousDevelopmentTask,
): AutonomousDevelopmentTask {
  return {
    ...task,

    targetPaths: [
      ...task.targetPaths,
    ],

    changedPaths:
      task.changedPaths
        ? [
            ...task.changedPaths,
          ]
        : undefined,

    phaseHistory:
      task.phaseHistory.map(
        (event) => ({
          ...event,
        }),
      ),

    result:
      task.result
        ? {
            ...task.result,
          }
        : undefined,
  };
}

function serializeTasks(): AutonomousDevelopmentTask[] {
  return Array.from(
    tasks.values(),
  ).map(cloneTask);
}

function compareTaskVersion(
  left: AutonomousDevelopmentTask,
  right: AutonomousDevelopmentTask,
): number {
  const leftUpdated =
    new Date(
      left.updatedAt,
    ).getTime();

  const rightUpdated =
    new Date(
      right.updatedAt,
    ).getTime();

  if (
    Number.isFinite(
      leftUpdated,
    ) &&
    Number.isFinite(
      rightUpdated,
    ) &&
    leftUpdated !== rightUpdated
  ) {
    return (
      leftUpdated -
      rightUpdated
    );
  }

  const leftCreated =
    new Date(
      left.createdAt,
    ).getTime();

  const rightCreated =
    new Date(
      right.createdAt,
    ).getTime();

  if (
    Number.isFinite(
      leftCreated,
    ) &&
    Number.isFinite(
      rightCreated,
    ) &&
    leftCreated !== rightCreated
  ) {
    return (
      leftCreated -
      rightCreated
    );
  }

  return 0;
}

function mergeTaskCollections(
  localTasks: AutonomousDevelopmentTask[],
  persistentTasks: AutonomousDevelopmentTask[],
): AutonomousDevelopmentTask[] {
  const merged =
    new Map<
      string,
      AutonomousDevelopmentTask
    >();

  for (
    const task of persistentTasks
  ) {
    merged.set(
      task.id,
      cloneTask(task),
    );
  }

  for (
    const task of localTasks
  ) {
    const existing =
      merged.get(
        task.id,
      );

    if (
      !existing ||
      compareTaskVersion(
        existing,
        task,
      ) <= 0
    ) {
      merged.set(
        task.id,
        cloneTask(task),
      );
    }
  }

  return Array.from(
    merged.values(),
  );
}

function queuePersistence(
  snapshot: AutonomousDevelopmentTask[],
): void {
  const immutableSnapshot =
    snapshot.map(cloneTask);

  persistenceQueue =
    persistenceQueue
      .catch(() => undefined)
      .then(
        async () => {
          try {
            await storage.set(
              TASK_STORAGE_KEY,
              immutableSnapshot,
            );
          } catch {
            /*
             * Persistence is intentionally
             * best-effort for synchronous
             * execution paths.
             */
          }
        },
      );
}

function persistTasks(): void {
  queuePersistence(
    serializeTasks(),
  );
}

async function persistTasksAwaited(): Promise<void> {
  const snapshot =
    serializeTasks();

  persistenceQueue =
    persistenceQueue
      .catch(() => undefined)
      .then(
        async () => {
          await storage.set(
            TASK_STORAGE_KEY,
            snapshot,
          );
        },
      );

  await persistenceQueue;
}

async function loadPersistentTasks(): Promise<
  AutonomousDevelopmentTask[]
> {
  try {
    const stored =
      await storage.get<unknown>(
        TASK_STORAGE_KEY,
      );

    if (!Array.isArray(stored)) {
      return [];
    }

    return stored
      .map(normalizeTask)
      .filter(
        (
          task,
        ): task is AutonomousDevelopmentTask =>
          task !== null,
      );
  } catch {
    return [];
  }
}

async function hydratePersistentTasks(): Promise<
  AutonomousDevelopmentTask[]
> {
  const stored =
    await loadPersistentTasks();

  const local =
    Array.from(
      tasks.values(),
    );

  const merged =
    mergeTaskCollections(
      local,
      stored,
    );

  tasks.clear();

  for (
    const task of merged
  ) {
    tasks.set(
      task.id,
      task,
    );
  }

  return merged;
}

function assertSafeRepository(
  task: AutonomousDevelopmentTask,
): void {
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
}

function assertSafeObjective(
  objective: string,
): string {
  const normalized =
    normalizeObjective(
      objective,
    );

  if (!normalized) {
    throw new Error(
      "Development objective is required.",
    );
  }

  if (
    normalized.length >
    MAX_OBJECTIVE_LENGTH
  ) {
    throw new Error(
      "Development objective exceeds the maximum allowed length.",
    );
  }

  return normalized;
}

function assertSafePath(
  targetPath: string,
): void {
  if (
    !targetPath ||
    targetPath.startsWith("/") ||
    targetPath.includes("..") ||
    targetPath.includes("\\") ||
    targetPath.includes("\0")
  ) {
    throw new Error(
      `Unsafe repository path: ${targetPath}`,
    );
  }
}

function assertSafeTask(
  task: AutonomousDevelopmentTask,
): void {
  assertSafeRepository(task);

  task.objective =
    assertSafeObjective(
      task.objective,
    );

  if (
    task.targetPaths.length >
    MAX_TARGET_PATHS
  ) {
    throw new Error(
      `A maximum of ${MAX_TARGET_PATHS} target paths is allowed.`,
    );
  }

  for (
    const targetPath of
    task.targetPaths
  ) {
    assertSafePath(
      targetPath,
    );
  }

  if (
    task.changedPaths &&
    task.changedPaths.length >
      MAX_CHANGED_PATHS
  ) {
    throw new Error(
      `A maximum of ${MAX_CHANGED_PATHS} changed paths is allowed.`,
    );
  }

  for (
    const changedPath of
    task.changedPaths ?? []
  ) {
    assertSafePath(
      changedPath,
    );
  }
}

function assertPhaseTransition(
  current:
    AutonomousDevelopmentTaskPhase,
  next:
    AutonomousDevelopmentTaskPhase,
): void {
  if (
    current === next
  ) {
    return;
  }

  const allowed =
    PHASE_TRANSITIONS[
      current
    ] ?? [];

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
): void {
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
    MAX_PHASE_HISTORY
  ) {
    task.phaseHistory =
      task.phaseHistory.slice(
        -MAX_PHASE_HISTORY,
      );
  }
}

function touchTask(
  task: AutonomousDevelopmentTask,
): void {
  const timestamp =
    now();

  task.updatedAt =
    timestamp;

  task.lastHeartbeatAt =
    timestamp;
}

function isTaskHeartbeatStale(
  task: AutonomousDevelopmentTask,
  referenceTime = Date.now(),
): boolean {
  if (
    task.status !==
    "running"
  ) {
    return false;
  }

  const heartbeat =
    task.lastHeartbeatAt ||
    task.updatedAt ||
    task.startedAt ||
    task.createdAt;

  const heartbeatTime =
    new Date(
      heartbeat,
    ).getTime();

  if (
    !Number.isFinite(
      heartbeatTime,
    )
  ) {
    return true;
  }

  return (
    referenceTime -
      heartbeatTime >
    ACTIVE_TASK_STALE_MS
  );
}

function assertTaskIsActive(
  task: AutonomousDevelopmentTask,
): void {
  if (
    TERMINAL_STATUSES.has(
      task.status,
    )
  ) {
    throw new Error(
      `Task cannot be modified from terminal status: ${task.status}`,
    );
  }

  if (
    task.status !==
    "running"
  ) {
    throw new Error(
      `Task cannot be modified from status: ${task.status}`,
    );
  }

  if (
    isTaskHeartbeatStale(
      task,
    )
  ) {
    throw new Error(
      "AUTONOMOUS_DEVELOPMENT_HEARTBEAT_STALE: task heartbeat has expired.",
    );
  }
}

function createReceipt(
  task: AutonomousDevelopmentTask,
): AutonomousDevelopmentReceipt {
  const result =
    task.result;

  return {
    taskId:
      task.id,

    status:
      task.status,

    repository:
      task.repository,

    branch:
      task.branch,

    targetPaths:
      [
        ...task.targetPaths,
      ],

    phases:
      task.phaseHistory.map(
        (event) =>
          event.phase,
      ),

    commitSha:
      result?.commitSha ||
      task.commitSha,

    readbackVerified:
      result?.readbackVerified ===
      true,

    verificationPassed:
      result?.verificationPassed ===
      true,

    reason:
      result?.reason ||
      task.reason,

    startedAt:
      task.startedAt,

    completedAt:
      task.completedAt ||
      task.updatedAt,
  };
}

function recoverStaleTask(
  task: AutonomousDevelopmentTask,
): AutonomousDevelopmentTask {
  if (
    !isTaskHeartbeatStale(
      task,
    )
  ) {
    return task;
  }

  const timestamp =
    now();

  if (
    task.phase !==
    "BLOCKED"
  ) {
    assertPhaseTransition(
      task.phase,
      "BLOCKED",
    );
  }

  task.status =
    "blocked";

  task.phase =
    "BLOCKED";

  task.reason =
    "AUTONOMOUS_DEVELOPMENT_HEARTBEAT_STALE: no execution heartbeat was received within the allowed execution window.";

  task.result = {
    commitSha:
      task.commitSha,

    readbackVerified:
      false,

    verificationPassed:
      false,

    reason:
      task.reason,
  };

  task.completedAt =
    timestamp;

  task.updatedAt =
    timestamp;

  task.lastHeartbeatAt =
    timestamp;

  appendPhaseEvent(
    task,
    "BLOCKED",
    task.reason,
  );

  tasks.set(
    task.id,
    task,
  );

  persistTasks();

  return task;
}

export function createAutonomousDevelopmentTask(
  input: {
    objective: string;
    targetPaths?: string[];
  },
): AutonomousDevelopmentTask {
  const timestamp =
    now();

  const objective =
    assertSafeObjective(
      input.objective,
    );

  const targetPaths =
    normalizeTargetPaths(
      input.targetPaths ??
        [],
    );

  const task: AutonomousDevelopmentTask =
    {
      id:
        createTaskId(),

      objective,

      repository:
        ALLOWED_REPOSITORY,

      branch:
        ALLOWED_BRANCH,

      targetPaths,

      status:
        "todo",

      phase:
        "QUEUED",

      createdAt:
        timestamp,

      updatedAt:
        timestamp,

      lastHeartbeatAt:
        timestamp,

      phaseHistory: [
        {
          phase:
            "QUEUED",

          at:
            timestamp,
        },
      ],
    };

  assertSafeTask(
    task,
  );

  tasks.set(
    task.id,
    task,
  );

  persistTasks();

  return task;
}

export function getAutonomousDevelopmentTask(
  taskId: string,
): AutonomousDevelopmentTask | null {
  const task =
    tasks.get(
      taskId,
    );

  if (!task) {
    return null;
  }

  if (
    task.status ===
      "running" &&
    isTaskHeartbeatStale(
      task,
    )
  ) {
    return recoverStaleTask(
      task,
    );
  }

  return task;
}

export async function getPersistentAutonomousDevelopmentTask(
  taskId: string,
): Promise<AutonomousDevelopmentTask | null> {
  await hydratePersistentTasks();

  const task =
    tasks.get(
      taskId,
    );

  if (!task) {
    return null;
  }

  if (
    task.status ===
      "running" &&
    isTaskHeartbeatStale(
      task,
    )
  ) {
    return recoverStaleTask(
      task,
    );
  }

  return task;
}

export function listAutonomousDevelopmentTasks(): AutonomousDevelopmentTask[] {
  const currentTime =
    Date.now();

  const result =
    Array.from(
      tasks.values(),
    ).map(
      (task) => {
        if (
          task.status ===
            "running" &&
          isTaskHeartbeatStale(
            task,
            currentTime,
          )
        ) {
          return recoverStaleTask(
            task,
          );
        }

        return task;
      },
    );

  return result.sort(
    (a, b) =>
      new Date(
        b.createdAt,
      ).getTime() -
      new Date(
        a.createdAt,
      ).getTime(),
  );
}

export async function listPersistentAutonomousDevelopmentTasks(): Promise<
  AutonomousDevelopmentTask[]
> {
  await hydratePersistentTasks();

  return listAutonomousDevelopmentTasks();
}

export function findActiveAutonomousDevelopmentTask(
  objective: string,
): AutonomousDevelopmentTask | null {
  const normalizedObjective =
    normalizeObjective(
      objective,
    );

  if (
    !normalizedObjective
  ) {
    return null;
  }

  const activeTasks =
    listAutonomousDevelopmentTasks().filter(
      (task) =>
        ACTIVE_STATUSES.has(
          task.status,
        ),
    );

  return (
    activeTasks.find(
      (task) =>
        normalizeObjective(
          task.objective,
        ) ===
        normalizedObjective,
    ) ?? null
  );
}

export async function findPersistentActiveAutonomousDevelopmentTask(
  objective: string,
): Promise<AutonomousDevelopmentTask | null> {
  await hydratePersistentTasks();

  return findActiveAutonomousDevelopmentTask(
    objective,
  );
}

export function claimAutonomousDevelopmentTask(
  taskId: string,
): AutonomousDevelopmentTask {
  const task =
    tasks.get(
      taskId,
    );

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

  assertSafeTask(
    task,
  );

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

  task.result =
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

  persistTasks();

  return task;
}

export async function claimPersistentAutonomousDevelopmentTask(
  taskId: string,
): Promise<AutonomousDevelopmentTask> {
  await hydratePersistentTasks();

  const task =
    tasks.get(
      taskId,
    );

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

  const claimedTask =
    claimAutonomousDevelopmentTask(
      taskId,
    );

  await persistTasksAwaited();

  return claimedTask;
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
): AutonomousDevelopmentTask {
  const task =
    tasks.get(
      taskId,
    );

  if (!task) {
    throw new Error(
      "Development task not found.",
    );
  }

  assertTaskIsActive(
    task,
  );

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
    update.targetPaths !==
    undefined
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
    update.commitSha !==
    undefined
  ) {
    const commitSha =
      update.commitSha.trim();

    task.commitSha =
      commitSha ||
      undefined;

    if (
      task.result
    ) {
      task.result.commitSha =
        commitSha ||
        undefined;
    }
  }

  if (
    update.changedPaths !==
    undefined
  ) {
    task.changedPaths =
      normalizeChangedPaths(
        update.changedPaths,
      );

    assertSafeTask(
      task,
    );
  }

  touchTask(
    task,
  );

  tasks.set(
    taskId,
    task,
  );

  persistTasks();

  return task;
}

export function heartbeatAutonomousDevelopmentTask(
  taskId: string,
  reason?: string,
) {
  const task =
    tasks.get(
      taskId,
    );

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

      reason:
        task.reason,
    };
  }

  if (
    task.status !==
    "running"
  ) {
    throw new Error(
      `Task heartbeat is not allowed from status: ${task.status}`,
    );
  }

  if (
    isTaskHeartbeatStale(
      task,
    )
  ) {
    recoverStaleTask(
      task,
    );

    throw new Error(
      "AUTONOMOUS_DEVELOPMENT_HEARTBEAT_STALE: task was automatically blocked.",
    );
  }

  if (
    reason !==
    undefined
  ) {
    task.reason =
      reason;
  }

  touchTask(
    task,
  );

  tasks.set(
    taskId,
    task,
  );

  persistTasks();

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

    reason:
      task.reason,
  };
}

export async function heartbeatPersistentAutonomousDevelopmentTask(
  taskId: string,
  reason?: string,
) {
  await hydratePersistentTasks();

  return heartbeatAutonomousDevelopmentTask(
    taskId,
    reason,
  );
}

export async function completePersistentAutonomousDevelopmentTask(
  taskId: string,
  result: {
    commitSha: string;
    readbackVerified: boolean;
    verificationPassed: boolean;
    reason?: string;
  },
): Promise<AutonomousDevelopmentReceipt> {
  await hydratePersistentTasks();

  const task =
    tasks.get(
      taskId,
    );

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
    return createReceipt(
      task,
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

  const exactCommitSha =
    result.commitSha.trim();

  const passed =
    Boolean(
      exactCommitSha,
    ) &&
    result.readbackVerified ===
      true &&
    result.verificationPassed ===
      true;

  if (!passed) {
    const blocked =
      blockAutonomousDevelopmentTask(
        taskId,
        result.reason ||
          "Autonomous development verification did not pass.",
      );

    await persistTasksAwaited();

    return blocked.receipt;
  }

  assertPhaseTransition(
    task.phase,
    "COMPLETED",
  );

  const timestamp =
    now();

  task.status =
    "completed";

  task.phase =
    "COMPLETED";

  task.reason =
    result.reason;

  task.commitSha =
    exactCommitSha;

  task.result = {
    commitSha:
      exactCommitSha,

    readbackVerified:
      result.readbackVerified,

    verificationPassed:
      result.verificationPassed,

    reason:
      result.reason,
  };

  task.completedAt =
    timestamp;

  task.updatedAt =
    timestamp;

  task.lastHeartbeatAt =
    timestamp;

  appendPhaseEvent(
    task,
    "COMPLETED",
    result.reason,
  );

  tasks.set(
    taskId,
    task,
  );

  await persistTasksAwaited();

  return createReceipt(
    task,
  );
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
    tasks.get(
      taskId,
    );
SEARCH_END
  const task =
    tasks.get(
      taskId,
    );

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
    return createReceipt(
      task,
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

  if (!passed) {
    return blockAutonomousDevelopmentTask(
      taskId,
      result.reason ||
        "Autonomous development verification did not pass.",
    ).receipt;
  }

  assertPhaseTransition(
    task.phase,
    "COMPLETED",
  );

  const timestamp =
    now();

  task.status =
    "completed";

  task.phase =
    "COMPLETED";

  task.reason =
    result.reason;

  task.commitSha =
    result.commitSha.trim();

  task.result = {
    commitSha:
      result.commitSha.trim(),

    readbackVerified:
      result.readbackVerified,

    verificationPassed:
      result.verificationPassed,

    reason:
      result.reason,
  };

  task.completedAt =
    timestamp;

  task.updatedAt =
    timestamp;

  task.lastHeartbeatAt =
    timestamp;

  appendPhaseEvent(
    task,
    "COMPLETED",
    result.reason,
  );

  tasks.set(
    taskId,
    task,
  );

  persistTasks();

  return createReceipt(
    task,
  );
}

export function blockAutonomousDevelopmentTask(
  taskId: string,
  reason: string,
) {
  const task =
    tasks.get(
      taskId,
    );

  if (!task) {
    throw new Error(
      "Development task not found.",
    );
  }

  if (
    task.status ===
    "completed"
  ) {
    return {
      taskId,

      status:
        "completed" as const,

      reason:
        task.reason ||
        reason,

      completedAt:
        task.completedAt ||
        now(),

      receipt:
        createReceipt(
          task,
        ),
    };
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

      receipt:
        createReceipt(
          task,
        ),
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

  task.result = {
    commitSha:
      task.commitSha,

    readbackVerified:
      false,

    verificationPassed:
      false,

    reason,
  };

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

  persistTasks();

  return {
    taskId,

    status:
      "blocked" as const,

    reason,

    completedAt:
      timestamp,

    receipt:
      createReceipt(
        task,
      ),
  };
}

export function isAutonomousDevelopmentTaskTerminal(
  taskId: string,
): boolean {
  const task =
    tasks.get(
      taskId,
    );

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
    tasks.get(
      taskId,
    );

  if (!task) {
    return null;
  }

  if (
    task.status ===
      "running" &&
    isTaskHeartbeatStale(
      task,
    )
  ) {
    recoverStaleTask(
      task,
    );
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

    reason:
      task.reason,
  };
}

export async function getPersistentAutonomousDevelopmentTaskHeartbeat(
  taskId: string,
) {
  const task =
    await getPersistentAutonomousDevelopmentTask(
      taskId,
    );

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

    reason:
      task.reason,
  };
}

export async function persistAutonomousDevelopmentTasks(): Promise<void> {
  await persistTasksAwaited();
}
