import { storage } from "@/lib/server-storage";
import { createUserStorageKey } from "@/lib/storage/data-scope";

import type {
  ExecutionJob,
  ExecutionJobStatus,
  ExecutionJobVerification,
} from "./job-types";

const MAX_EXECUTION_JOBS = 200;

function getStorageKey(): string {
  return createUserStorageKey("execution-jobs");
}

function createJobId(): string {
  return [
    "job",
    Date.now(),
    Math.random().toString(36).slice(2, 10),
  ].join("-");
}

function isExecutionJob(
  value: unknown,
): value is ExecutionJob {
  if (!value || typeof value !== "object") {
    return false;
  }

  const job = value as Partial<ExecutionJob>;

  return (
    typeof job.id === "string" &&
    typeof job.goal === "string" &&
    typeof job.input === "string" &&
    typeof job.status === "string" &&
    ["queued", "running", "completed", "failed"].includes(
      job.status,
    ) &&
    typeof job.retryCount === "number" &&
    typeof job.createdAt === "number" &&
    typeof job.updatedAt === "number" &&
    typeof job.verification === "object"
  );
}

async function readJobs(): Promise<ExecutionJob[]> {
  const stored =
    await storage.get<ExecutionJob[]>(
      getStorageKey(),
    );

  if (!Array.isArray(stored)) {
    return [];
  }

  return stored
    .filter(isExecutionJob)
    .slice(-MAX_EXECUTION_JOBS);
}

async function writeJobs(
  jobs: ExecutionJob[],
): Promise<void> {
  await storage.set(
    getStorageKey(),
    jobs.slice(-MAX_EXECUTION_JOBS),
  );
}

export async function listExecutionJobs(): Promise<
  ExecutionJob[]
> {
  const jobs = await readJobs();

  return jobs.sort(
    (a, b) => b.createdAt - a.createdAt,
  );
}

export async function getExecutionJob(
  id: string,
): Promise<ExecutionJob | null> {
  const jobs = await readJobs();

  return (
    jobs.find(
      (job) => job.id === id,
    ) ?? null
  );
}

export async function createExecutionJob(
  input: {
    goal: string;
    planId?: string;
    taskId?: string;
    input: string;
  },
): Promise<ExecutionJob> {
  const now = Date.now();

  const job: ExecutionJob = {
    id: createJobId(),

    planId: input.planId,

    goal: input.goal.trim(),

    taskId: input.taskId,

    status: "queued",

    input: input.input.trim(),

    retryCount: 0,

    verification: {
      status: "pending",
      checkedAt: now,
    },

    createdAt: now,

    updatedAt: now,
  };

  const jobs = await readJobs();

  jobs.push(job);

  await writeJobs(jobs);

  return job;
}

export async function updateExecutionJob(
  id: string,
  updates: {
    status?: ExecutionJobStatus;

    result?: string | null;

    error?: string | null;

    retryCount?: number;

    verification?: ExecutionJobVerification;

    startedAt?: number | null;

    completedAt?: number | null;
  },
): Promise<ExecutionJob | null> {
  const jobs = await readJobs();

  const index = jobs.findIndex(
    (job) => job.id === id,
  );

  if (index === -1) {
    return null;
  }

  const current = jobs[index];

  const updated: ExecutionJob = {
    ...current,

    status:
      updates.status ??
      current.status,

    result:
      updates.result === null
        ? undefined
        : updates.result ??
          current.result,

    error:
      updates.error === null
        ? undefined
        : updates.error ??
          current.error,

    retryCount:
      updates.retryCount ??
      current.retryCount,

    verification:
      updates.verification ??
      current.verification,

    startedAt:
      updates.startedAt === null
        ? undefined
        : updates.startedAt ??
          current.startedAt,

    completedAt:
      updates.completedAt === null
        ? undefined
        : updates.completedAt ??
          current.completedAt,

    updatedAt: Date.now(),
  };

  jobs[index] = updated;

  await writeJobs(jobs);

  return updated;
}

export async function markExecutionJobRunning(
  id: string,
): Promise<ExecutionJob | null> {
  return updateExecutionJob(id, {
    status: "running",

    startedAt: Date.now(),

    completedAt: null,

    error: null,
  });
}

export async function markExecutionJobCompleted(
  id: string,
  result: string,
): Promise<ExecutionJob | null> {
  const now = Date.now();

  return updateExecutionJob(id, {
    status: "completed",

    result,

    error: null,

    verification: {
      status: "passed",

      message:
        "Runtime execution completed successfully.",

      checkedAt: now,
    },

    completedAt: now,
  });
}

export async function markExecutionJobFailed(
  id: string,
  error: string,
): Promise<ExecutionJob | null> {
  const now = Date.now();

  return updateExecutionJob(id, {
    status: "failed",

    error,

    verification: {
      status: "failed",

      message: error,

      checkedAt: now,
    },

    completedAt: now,
  });
}

export async function retryExecutionJob(
  id: string,
): Promise<ExecutionJob | null> {
  const job = await getExecutionJob(id);

  if (!job) {
    return null;
  }

  if (job.status !== "failed") {
    return job;
  }

  return updateExecutionJob(id, {
    status: "queued",

    retryCount:
      job.retryCount + 1,

    result: null,

    error: null,

    verification: {
      status: "pending",

      checkedAt: Date.now(),
    },

    startedAt: null,

    completedAt: null,
  });
}
