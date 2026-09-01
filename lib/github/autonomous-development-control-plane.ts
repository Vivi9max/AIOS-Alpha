import "server-only";

export type AutonomousDevelopmentTaskStatus =
  | "todo"
  | "running"
  | "completed"
  | "failed"
  | "blocked";

export type AutonomousDevelopmentTask = {
  id: string;
  objective: string;
  repository: string;
  branch: string;
  targetPaths: string[];
  status: AutonomousDevelopmentTaskStatus;
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

  if (!task.targetPaths.length) {
    throw new Error("At least one target path is required.");
  }

  for (const targetPath of task.targetPaths) {
    if (!targetPath || targetPath.startsWith("/") || targetPath.includes("..")) {
      throw new Error(`Unsafe target path: ${targetPath}`);
    }
  }
}

export function createAutonomousDevelopmentTask(input: {
  objective: string;
  targetPaths: string[];
}) {
  const task: AutonomousDevelopmentTask = {
    id: createTaskId(),
    objective: input.objective,
    repository: ALLOWED_REPOSITORY,
    branch: ALLOWED_BRANCH,
    targetPaths: input.targetPaths,
    status: "todo",
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
  return Array.from(tasks.values());
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
    reason: passed
      ? undefined
      : "Development result failed final verification requirements.",
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
  task.updatedAt = now();

  tasks.set(taskId, task);

  return {
    taskId,
    status: "blocked" as const,
    reason,
    completedAt: now(),
  };
}
