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
  completedAt: string;
};

const tasks = new Map<string, AutonomousDevelopmentTask>();

const ALLOWED_REPOSITORY = "Vivi9max/AIOS-Alpha";
const ALLOWED_BRANCH = "main";

function now() {
  return new Date().toISOString();
}

function createTaskId() {
  return `ad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function assertSafeTask(task: AutonomousDevelopmentTask) {
  if (task.repository !== ALLOWED_REPOSITORY) {
    throw new Error("Repository is outside the Founder development boundary.");
  }

  if (task.branch !== ALLOWED_BRANCH) {
    throw new Error("Branch is outside the Founder development boundary.");
  }

  if (!task.objective.trim()) {
    throw new Error("Development objective is required.");
  }

  for (const targetPath of task.targetPaths) {
    if (
      !targetPath ||
      targetPath.startsWith("/") ||
      targetPath.includes("..") ||
      targetPath.includes("\\")
    ) {
      throw new Error(`Unsafe target path: ${targetPath}`);
    }
  }
}

export function createAutonomousDevelopmentTask(input: {
  objective: string;
  targetPaths?: string[];
}) {
  const task: AutonomousDevelopmentTask = {
    id: createTaskId(),
    objective: input.objective.trim(),
    repository: ALLOWED_REPOSITORY,
    branch: ALLOWED_BRANCH,
    targetPaths: input.targetPaths ?? [],
    status: "todo",
    phase: "QUEUED",
    createdAt: now(),
    updatedAt: now(),
  };

  assertSafeTask(task);
  tasks.set(task.id, task);

  return task;
}

export function getAutonomousDevelopmentTask(taskId: string) {
  return tasks.get(taskId) ?? null;
}

export function listAutonomousDevelopmentTasks() {
  return Array.from(tasks.values()).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime(),
  );
}

export function claimAutonomousDevelopmentTask(taskId: string) {
  const task = tasks.get(taskId);

  if (!task) {
    throw new Error("Development task not found.");
  }

  if (task.status !== "todo") {
    throw new Error(`Task cannot be claimed from status: ${task.status}`);
  }

  task.status = "running";
  task.phase = "DISCOVERING";
  task.reason = undefined;
  task.updatedAt = now();
  tasks.set(taskId, task);

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
  const task = tasks.get(taskId);

  if (!task) {
    throw new Error("Development task not found.");
  }

  if (update.phase) {
    task.phase = update.phase;
  }

  if (update.reason !== undefined) {
    task.reason = update.reason;
  }

  if (update.targetPaths) {
    task.targetPaths = Array.from(new Set(update.targetPaths));
    assertSafeTask(task);
  }

  if (update.commitSha) {
    task.commitSha = update.commitSha;
  }

  if (update.changedPaths) {
    task.changedPaths = Array.from(new Set(update.changedPaths));
  }

  task.updatedAt = now();
  tasks.set(taskId, task);
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
  const task = tasks.get(taskId);

  if (!task) {
    throw new Error("Development task not found.");
  }

  if (task.status !== "running") {
    throw new Error(`Task cannot complete from status: ${task.status}`);
  }

  const passed =
    Boolean(result.commitSha) &&
    result.readbackVerified === true &&
    result.verificationPassed === true;

  task.status = passed ? "completed" : "failed";
  task.phase = passed ? "COMPLETED" : "BLOCKED";
  task.reason = result.reason;
  task.commitSha = result.commitSha || undefined;
  task.updatedAt = now();
  tasks.set(taskId, task);

  return {
    taskId,
    status: task.status,
    repository: task.repository,
    branch: task.branch,
    targetPaths: task.targetPaths,
    phases: [
      "FOUNDER_AUTH",
      "ELIGIBILITY",
      "READ",
      "ANALYZE",
      "PLAN",
      "WRITE",
      "COMMIT",
      "READBACK",
      "VERIFY",
    ],
    commitSha: result.commitSha,
    readbackVerified: result.readbackVerified,
    verificationPassed: result.verificationPassed,
    reason: result.reason,
    completedAt: now(),
  };
}

export function blockAutonomousDevelopmentTask(
  taskId: string,
  reason: string,
) {
  const task = tasks.get(taskId);

  if (!task) {
    throw new Error("Development task not found.");
  }

  task.status = "blocked";
  task.phase = "BLOCKED";
  task.reason = reason;
  task.updatedAt = now();
  tasks.set(taskId, task);

  return {
    taskId,
    status: "blocked" as const,
    reason,
    completedAt: now(),
  };
}
