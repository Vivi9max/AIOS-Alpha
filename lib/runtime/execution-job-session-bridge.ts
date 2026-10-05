import {
  completeExecutionSession,
  completeExecutionStep,
  createExecutionSession,
  failExecutionStep,
  startExecutionStep,
  type ExecutionOutcome,
  type ExecutionSession,
} from "@/lib/runtime/execution";

import {
  createPersistentExecutionSession,
  saveExecutionSession,
} from "@/lib/runtime/session";

import {
  getExecutionJob,
} from "@/lib/execution/job-store";

import {
  updatePersistentTask,
} from "@/lib/task/server-store";

import type {
  ExecutionJob,
} from "@/lib/execution/job-types";

export interface ExecutionJobSessionBridgeResult {
  success: boolean;

  jobId: string;

  taskId: string | null;

  session:
    | ExecutionSession
    | null;

  task:
    | {
        id: string;
        title: string;
        status: "todo" | "doing" | "done";
        createdAt: number;
        updatedAt: number;
      }
    | null;

  action:
    | "created"
    | "running"
    | "completed"
    | "failed"
    | "not_found";

  error:
    | string
    | null;
}

const RUNTIME_STEP = {
  key:
    "execute_runtime",

  title:
    "执行 Runtime",

  description:
    "调用 AI Runtime 执行当前任务并保存执行结果。",

  capability:
    "Runtime",
};

export async function createExecutionSessionForJob(
  jobId: string
): Promise<ExecutionJobSessionBridgeResult> {
  const job =
    await getExecutionJob(
      jobId
    );

  if (!job) {
    return {
      success:
        false,

      jobId,

      taskId:
        null,

      session:
        null,

      task:
        null,

      action:
        "not_found",

      error:
        "Execution job not found.",
    };
  }

  const existingSessionId =
    getSessionIdFromJob(
      job
    );

  if (existingSessionId) {
    return {
      success:
        true,

      jobId,

      taskId:
        job.taskId ??
        null,

      session:
        null,

      task:
        null,

      action:
        "created",

      error:
        null,
    };
  }

  const session =
    await createPersistentExecutionSession(
      createSessionInput(
        job
      )
    );

  const task =
    job.taskId
      ? await updatePersistentTask(
          job.taskId,
          {
            status:
              "doing",
          }
        )
      : null;

  const metadata = {
    ...session.metadata,

    jobId,

    taskId:
      job.taskId ??
      null,
  };

  const saved =
    await saveExecutionSession({
      ...session,

      metadata,
    });

  return {
    success:
      true,

    jobId,

    taskId:
      job.taskId ??
      null,

    session:
      saved,

    task:
      task
        ? normalizeTask(
            task
          )
        : null,

    action:
      "created",

    error:
      null,
  };
}

export async function markExecutionJobSessionRunning(
  jobId: string,
  session: ExecutionSession
): Promise<
  ExecutionJobSessionBridgeResult
> {
  const job =
    await getExecutionJob(
      jobId
    );

  if (!job) {
    return {
      success:
        false,

      jobId,

      taskId:
        null,

      session:
        null,

      task:
        null,

      action:
        "not_found",

      error:
        "Execution job not found.",
    };
  }

  const runtimeStep =
    getRuntimeStep(
      session
    );

  if (!runtimeStep) {
    return {
      success:
        false,

      jobId,

      taskId:
        job.taskId ??
        null,

      session,

      task:
        null,

      action:
        "running",

      error:
        "Runtime execution step not found.",
    };
  }

  let updated =
    startExecutionStep(
      session,
      runtimeStep.id
    );

  updated = {
    ...updated,

    metadata: {
      ...updated.metadata,

      jobId,

      taskId:
        job.taskId ??
        null,
    },
  };

  const saved =
    await saveExecutionSession(
      updated
    );

  const task =
    job.taskId
      ? await updatePersistentTask(
          job.taskId,
          {
            status:
              "doing",
          }
        )
      : null;

  return {
    success:
      true,

    jobId,

    taskId:
      job.taskId ??
      null,

    session:
      saved,

    task:
      task
        ? normalizeTask(
            task
          )
        : null,

    action:
      "running",

    error:
      null,
  };
}

export async function markExecutionJobSessionCompleted(
  jobId: string,
  session: ExecutionSession,
  result: string
): Promise<
  ExecutionJobSessionBridgeResult
> {
  const job =
    await getExecutionJob(
      jobId
    );

  if (!job) {
    return {
      success:
        false,

      jobId,

      taskId:
        null,

      session:
        null,

      task:
        null,

      action:
        "not_found",

      error:
        "Execution job not found.",
    };
  }

  const runtimeStep =
    getRuntimeStep(
      session
    );

  let updated =
    session;

  if (runtimeStep) {
    updated =
      completeExecutionStep(
        updated,
        runtimeStep.id,
        {
          jobId,

          result,

          completed:
            true,
        }
      );
  }

  const outcome:
    ExecutionOutcome = {
    success:
      true,

    summary:
      "Runtime execution completed successfully.",

    generatedTaskCount:
      0,

    reusedTaskCount:
      0,

    memoryUpdated:
      false,

    storageSaved:
      true,

    nextRecommendedAction:
      null,

    metadata: {
      jobId,

      taskId:
        job.taskId ??
        null,

      resultLength:
        result.length,
    },
  };

  updated =
    completeExecutionSession(
      updated,
      outcome
    );

  updated = {
    ...updated,

    metadata: {
      ...updated.metadata,

      jobId,

      taskId:
        job.taskId ??
        null,

      runtimeResult:
        result,
    },
  };

  const saved =
    await saveExecutionSession(
      updated
    );

  const task =
    job.taskId
      ? await updatePersistentTask(
          job.taskId,
          {
            status:
              "done",
          }
        )
      : null;

  return {
    success:
      true,

    jobId,

    taskId:
      job.taskId ??
      null,

    session:
      saved,

    task:
      task
        ? normalizeTask(
            task
          )
        : null,

    action:
      "completed",

    error:
      null,
  };
}

export async function markExecutionJobSessionFailed(
  jobId: string,
  session: ExecutionSession,
  error: string
): Promise<
  ExecutionJobSessionBridgeResult
> {
  const job =
    await getExecutionJob(
      jobId
    );

  if (!job) {
    return {
      success:
        false,

      jobId,

      taskId:
        null,

      session:
        null,

      task:
        null,

      action:
        "not_found",

      error:
        "Execution job not found.",
    };
  }

  const runtimeStep =
    getRuntimeStep(
      session
    );

  let updated =
    session;

  if (runtimeStep) {
    updated =
      failExecutionStep(
        updated,
        runtimeStep.id,
        error
      );
  } else {
    updated = {
      ...updated,

      status:
        "failed",

      error,

      completedAt:
        Date.now(),

      durationMs:
        Math.max(
          0,
          Date.now() -
            updated.startedAt
        ),
    };
  }

  updated = {
    ...updated,

    metadata: {
      ...updated.metadata,

      jobId,

      taskId:
        job.taskId ??
        null,
    },
  };

  const saved =
    await saveExecutionSession(
      updated
    );

  const task =
    job.taskId
      ? await updatePersistentTask(
          job.taskId,
          {
            status:
              "doing",
          }
        )
      : null;

  return {
    success:
      false,

    jobId,

    taskId:
      job.taskId ??
      null,

    session:
      saved,

    task:
      task
        ? normalizeTask(
            task
          )
        : null,

    action:
      "failed",

    error,
  };
}

export async function syncExecutionJobSession(
  jobId: string,
  session: ExecutionSession
): Promise<
  ExecutionJobSessionBridgeResult
> {
  const job =
    await getExecutionJob(
      jobId
    );

  if (!job) {
    return {
      success:
        false,

      jobId,

      taskId:
        null,

      session:
        null,

      task:
        null,

      action:
        "not_found",

      error:
        "Execution job not found.",
    };
  }

  if (
    job.status ===
    "running"
  ) {
    return markExecutionJobSessionRunning(
      jobId,
      session
    );
  }

  if (
    job.status ===
    "completed"
  ) {
    return markExecutionJobSessionCompleted(
      jobId,
      session,
      job.result ??
        ""
    );
  }

  if (
    job.status ===
    "failed"
  ) {
    return markExecutionJobSessionFailed(
      jobId,
      session,
      job.error ??
        "Execution job failed."
    );
  }

  return {
    success:
      true,

    jobId,

    taskId:
      job.taskId ??
      null,

    session,

    task:
      null,

    action:
      "created",

    error:
      null,
  };
}

function createSessionInput(
  job: ExecutionJob
) {
  return {
    goal:
      job.goal,

    planId:
      job.planId ??
      null,

    requestId:
      null,

    provider:
      null,

    fallbackUsed:
      false,

    steps: [
      {
        key:
          RUNTIME_STEP.key,

        title:
          RUNTIME_STEP.title,

        description:
          RUNTIME_STEP.description,

        capability:
          RUNTIME_STEP.capability,
      },
    ],

    metadata: {
      jobId:
        job.id,

      taskId:
        job.taskId ??
        null,

      source:
        "execution-job",
    },
  };
}

function getRuntimeStep(
  session: ExecutionSession
) {
  return (
    session.steps.find(
      (step) =>
        step.key ===
        RUNTIME_STEP.key
    ) ??
    session.steps.find(
      (step) =>
        step.capability ===
        RUNTIME_STEP.capability
    ) ??
    null
  );
}

function getSessionIdFromJob(
  job: ExecutionJob
): string | null {
  const candidate =
    (
      job as ExecutionJob & {
        sessionId?: unknown;
      }
    ).sessionId;

  return typeof candidate ===
    "string" &&
    candidate.trim()
    ? candidate.trim()
    : null;
}

function normalizeTask(
  task: {
    id: string;
    title: string;
    status:
      | "todo"
      | "doing"
      | "done";
    createdAt: number;
    updatedAt: number;
  }
) {
  return {
    id:
      task.id,

    title:
      task.title,

    status:
      task.status,

    createdAt:
      task.createdAt,

    updatedAt:
      task.updatedAt,
  };
}
