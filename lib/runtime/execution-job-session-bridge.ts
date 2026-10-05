import {
  completeExecutionSession,
  completeExecutionStep,
  failExecutionStep,
  startExecutionStep,
  type ExecutionOutcome,
  type ExecutionSession,
} from "@/lib/runtime/execution";

import {
  createPersistentExecutionSession,
  listExecutionSessions,
  saveExecutionSession,
} from "@/lib/runtime/session";

import {
  getExecutionJob,
} from "@/lib/execution/job-store";

import {
  createOutcome,
  getOutcome,
  listOutcomes,
  updateOutcome,
  updateOutcomeMilestone,
} from "@/lib/outcome/store";

import {
  addAndSaveExecutionMemory,
} from "@/lib/memory/execution-memory";

import {
  appendExecutionLedger,
} from "@/lib/planner/execution-ledger";

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

  outcomeId: string | null;

  milestoneId: string | null;

  session:
    | ExecutionSession
    | null;

  task:
    | {
        id: string;
        title: string;
        status:
          | "todo"
          | "doing"
          | "done";
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
  jobId: string,
): Promise<ExecutionJobSessionBridgeResult> {
  const job =
    await getExecutionJob(
      jobId,
    );

  if (!job) {
    return failureResult(
      jobId,
      "Execution job not found.",
    );
  }

  const existingSessions =
    await listExecutionSessions({
      limit: 50,
    });

  const existingActiveSession =
    existingSessions.find(
      (session) =>
        session.metadata?.jobId ===
          jobId &&
        session.status !==
          "completed" &&
        session.status !==
          "failed" &&
        session.status !==
          "cancelled",
    ) ?? null;

  if (
    existingActiveSession
  ) {
    const outcomeId =
      getStringMetadata(
        existingActiveSession.metadata,
        "outcomeId",
      );

    const milestoneId =
      getStringMetadata(
        existingActiveSession.metadata,
        "milestoneId",
      );

    let task = null;

    if (
      job.taskId &&
      existingActiveSession.status ===
        "idle"
    ) {
      task =
        await updatePersistentTask(
          job.taskId,
          {
            status:
              "doing",
          },
        );
    }

    return {
      success:
        true,

      jobId,

      taskId:
        job.taskId ??
        null,

      outcomeId,

      milestoneId,

      session:
        existingActiveSession,

      task:
        task
          ? normalizeTask(
              task,
            )
          : null,

      action:
        "created",

      error:
        null,
    };
  }

  const lineage =
    await resolveOutcomeLineage(
      job,
    );

  const session =
    await createPersistentExecutionSession(
      createSessionInput(
        job,
        lineage,
      ),
    );

  const task =
    job.taskId
      ? await updatePersistentTask(
          job.taskId,
          {
            status:
              "doing",
          },
        )
      : null;

  const metadata = {
    ...session.metadata,

    jobId,

    taskId:
      job.taskId ??
      null,

    outcomeId:
      lineage.outcomeId,

    milestoneId:
      lineage.milestoneId,

    source:
      "execution-job",
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

    outcomeId:
      lineage.outcomeId,

    milestoneId:
      lineage.milestoneId,

    session:
      saved,

    task:
      task
        ? normalizeTask(
            task,
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
  session: ExecutionSession,
): Promise<ExecutionJobSessionBridgeResult> {
  const job =
    await getExecutionJob(
      jobId,
    );

  if (!job) {
    return failureResult(
      jobId,
      "Execution job not found.",
    );
  }

  const runtimeStep =
    getRuntimeStep(
      session,
    );

  if (!runtimeStep) {
    return {
      ...failureResult(
        jobId,
        "Runtime execution step not found.",
      ),

      taskId:
        job.taskId ??
        null,

      outcomeId:
        getStringMetadata(
          session.metadata,
          "outcomeId",
        ),

      milestoneId:
        getStringMetadata(
          session.metadata,
          "milestoneId",
        ),

      session,

      action:
        "running",
    };
  }

  /*
   * Idempotency boundary.
   *
   * ExecutionSession uses "executing" for Runtime execution.
   * ExecutionStep uses "running" for the currently running step.
   */
  if (
    session.status ===
      "executing" &&
    runtimeStep.status ===
      "running"
  ) {
    return {
      success:
        true,

      jobId,

      taskId:
        job.taskId ??
        null,

      outcomeId:
        getStringMetadata(
          session.metadata,
          "outcomeId",
        ),

      milestoneId:
        getStringMetadata(
          session.metadata,
          "milestoneId",
        ),

      session,

      task:
        null,

      action:
        "running",

      error:
        null,
    };
  }

  if (
    session.status ===
    "completed"
  ) {
    return {
      success:
        true,

      jobId,

      taskId:
        job.taskId ??
        null,

      outcomeId:
        getStringMetadata(
          session.metadata,
          "outcomeId",
        ),

      milestoneId:
        getStringMetadata(
          session.metadata,
          "milestoneId",
        ),

      session,

      task:
        null,

      action:
        "running",

      error:
        null,
    };
  }

  let updated =
    startExecutionStep(
      session,
      runtimeStep.id,
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
      updated,
    );

  const task =
    job.taskId
      ? await updatePersistentTask(
          job.taskId,
          {
            status:
              "doing",
          },
        )
      : null;

  await appendExecutionLedger({
    action:
      "task-start",

    decision:
      "allowed",

    mode:
      "baseline",

    message:
      "Execution Job entered Runtime execution.",

    taskId:
      job.taskId ??
      null,

    taskTitle:
      task?.title ??
      null,

    outcomeId:
      getStringMetadata(
        saved.metadata,
        "outcomeId",
      ),

    maxConcurrentTasks:
      1,

    doingCount:
      1,
  });

  await addAndSaveExecutionMemory({
    eventType:
      "task-started",

    source:
      "runtime",

    title:
      "Execution Job started",

    summary:
      "Execution Job entered Runtime execution through a persistent Execution Session.",

    outcomeId:
      getStringMetadata(
        saved.metadata,
        "outcomeId",
      ),

    milestoneId:
      getStringMetadata(
        saved.metadata,
        "milestoneId",
      ),

    task:
      task ??
      undefined,

    taskId:
      job.taskId ??
      null,

    metadata: {
      jobId,

      sessionId:
        saved.id,
    },

    success:
      true,
  });

  return {
    success:
      true,

    jobId,

    taskId:
      job.taskId ??
      null,

    outcomeId:
      getStringMetadata(
        saved.metadata,
        "outcomeId",
      ),

    milestoneId:
      getStringMetadata(
        saved.metadata,
        "milestoneId",
      ),

    session:
      saved,

    task:
      task
        ? normalizeTask(
            task,
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
  result: string,
): Promise<ExecutionJobSessionBridgeResult> {
  const job =
    await getExecutionJob(
      jobId,
    );

  if (!job) {
    return failureResult(
      jobId,
      "Execution job not found.",
    );
  }

  const runtimeStep =
    getRuntimeStep(
      session,
    );

  let updated =
    session;

  if (
    runtimeStep &&
    runtimeStep.status !==
      "completed"
  ) {
    updated =
      completeExecutionStep(
        updated,
        runtimeStep.id,
        {
          jobId,

          result,

          completed:
            true,
        },
      );
  }

  const outcomeId =
    getStringMetadata(
      updated.metadata,
      "outcomeId",
    );

  const milestoneId =
    getStringMetadata(
      updated.metadata,
      "milestoneId",
    );

  const outcome =
    outcomeId
      ? await getOutcome(
          outcomeId,
        )
      : null;

  const previousProgress =
    outcome?.progress ??
    null;

  let finalOutcome =
    outcome;

  if (
    outcome &&
    milestoneId
  ) {
    finalOutcome =
      (await updateOutcomeMilestone(
        outcome.id,
        milestoneId,
        {
          status:
            "completed",

          taskIds:
            job.taskId
              ? [
                  job.taskId,
                ]
              : undefined,
        },
      )) ??
      outcome;
  } else if (
    outcome
  ) {
    finalOutcome =
      (await updateOutcome(
        outcome.id,
        {
          status:
            "completed",

          progress:
            100,

          taskIds:
            job.taskId
              ? Array.from(
                  new Set([
                    ...outcome.taskIds,
                    job.taskId,
                  ]),
                )
              : outcome.taskIds,
        },
      )) ??
      outcome;
  }

  const executionOutcome:
    ExecutionOutcome = {
    success:
      true,

    summary:
      "Runtime execution completed successfully and the linked Outcome lineage was synchronized.",

    generatedTaskCount:
      0,

    reusedTaskCount:
      job.taskId
        ? 1
        : 0,

    memoryUpdated:
      true,

    storageSaved:
      true,

    nextRecommendedAction:
      finalOutcome?.status ===
        "completed"
        ? "Review the completed Outcome and create the next Planner cycle."
        : null,

    metadata: {
      jobId,

      taskId:
        job.taskId ??
        null,

      outcomeId:
        outcomeId ??
        null,

      milestoneId:
        milestoneId ??
        null,

      resultLength:
        result.length,
    },
  };

  updated =
    completeExecutionSession(
      updated,
      executionOutcome,
    );

  updated = {
    ...updated,

    metadata: {
      ...updated.metadata,

      jobId,

      taskId:
        job.taskId ??
        null,

      outcomeId:
        outcomeId ??
        null,

      milestoneId:
        milestoneId ??
        null,

      runtimeResult:
        result,
    },
  };

  const saved =
    await saveExecutionSession(
      updated,
    );

  const task =
    job.taskId
      ? await updatePersistentTask(
          job.taskId,
          {
            status:
              "done",
          },
        )
      : null;

  await appendExecutionLedger({
    action:
      "task-complete",

    decision:
      "allowed",

    mode:
      "baseline",

    message:
      "Execution Job completed after Runtime verification and Outcome synchronization.",

    taskId:
      job.taskId ??
      null,

    taskTitle:
      task?.title ??
      null,

    outcomeId:
      outcomeId ??
      null,

    maxConcurrentTasks:
      1,

    doingCount:
      0,
  });

  await addAndSaveExecutionMemory({
    eventType:
      finalOutcome?.status ===
        "completed"
        ? "outcome-completed"
        : "execution-synced",

    source:
      "runtime",

    title:
      finalOutcome?.status ===
        "completed"
        ? "Execution Outcome completed"
        : "Execution state synchronized",

    summary:
      finalOutcome?.status ===
        "completed"
        ? "Execution Job, Session, Task, Milestone, Outcome and Execution Memory are now synchronized."
        : "Execution Job and Session completed and the linked Outcome was updated.",

    outcome:
      finalOutcome ??
      undefined,

    outcomeId:
      outcomeId ??
      null,

    milestone:
      finalOutcome?.milestones.find(
        (item) =>
          item.id ===
          milestoneId,
      ),

    milestoneId:
      milestoneId ??
      null,

    task:
      task ??
      undefined,

    taskId:
      job.taskId ??
      null,

    previousProgress,

    currentProgress:
      finalOutcome?.progress ??
      null,

    completedTaskCount:
      task
        ? 1
        : 0,

    remainingTaskCount:
      0,

    queueSize:
      0,

    latencyMs:
      saved.durationMs ??
      null,

    metadata: {
      jobId,

      sessionId:
        saved.id,

      resultLength:
        result.length,
    },

    success:
      true,
  });

  return {
    success:
      true,

    jobId,

    taskId:
      job.taskId ??
      null,

    outcomeId:
      outcomeId ??
      null,

    milestoneId:
      milestoneId ??
      null,

    session:
      saved,

    task:
      task
        ? normalizeTask(
            task,
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
  error: string,
): Promise<ExecutionJobSessionBridgeResult> {
  const job =
    await getExecutionJob(
      jobId,
    );

  if (!job) {
    return failureResult(
      jobId,
      "Execution job not found.",
    );
  }

  const runtimeStep =
    getRuntimeStep(
      session,
    );

  let updated =
    session;

  if (
    runtimeStep &&
    runtimeStep.status !==
      "failed"
  ) {
    updated =
      failExecutionStep(
        updated,
        runtimeStep.id,
        error,
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
            updated.startedAt,
        ),
    };
  }

  const saved =
    await saveExecutionSession({
      ...updated,

      metadata: {
        ...updated.metadata,

        jobId,

        taskId:
          job.taskId ??
          null,

        runtimeError:
          error,
      },
    });

  const outcomeId =
    getStringMetadata(
      saved.metadata,
      "outcomeId",
    );

  const milestoneId =
    getStringMetadata(
      saved.metadata,
      "milestoneId",
    );

  const outcome =
    outcomeId
      ? await getOutcome(
          outcomeId,
        )
      : null;

  if (outcome) {
    await updateOutcome(
      outcome.id,
      {
        status:
          "blocked",
      },
    );
  }

  const task =
    job.taskId
      ? await updatePersistentTask(
          job.taskId,
          {
            status:
              "todo",
          },
        )
      : null;

  await appendExecutionLedger({
    action:
      "task-update",

    decision:
      "allowed",

    mode:
      "baseline",

    code:
      "EXECUTION_RUNTIME_FAILED",

    message:
      "Execution Job failed during Runtime execution. Task remains available for retry.",

    taskId:
      job.taskId ??
      null,

    taskTitle:
      task?.title ??
      null,

    outcomeId:
      outcomeId ??
      null,

    maxConcurrentTasks:
      1,

    doingCount:
      0,
  });

  await addAndSaveExecutionMemory({
    eventType:
      "execution-failed",

    source:
      "runtime",

    title:
      "Execution Runtime failed",

    summary:
      "Execution Job failed during Runtime execution. The linked Task remains available for retry.",

    outcome:
      outcome ??
      undefined,

    outcomeId:
      outcomeId ??
      null,

    milestone:
      outcome?.milestones.find(
        (item) =>
          item.id ===
          milestoneId,
      ),

    milestoneId:
      milestoneId ??
      null,

    task:
      task ??
      undefined,

    taskId:
      job.taskId ??
      null,

    latencyMs:
      saved.durationMs ??
      null,

    metadata: {
      jobId,

      sessionId:
        saved.id,

      error,
    },

    success:
      false,
  });

  return {
    success:
      false,

    jobId,

    taskId:
      job.taskId ??
      null,

    outcomeId:
      outcomeId ??
      null,

    milestoneId:
      milestoneId ??
      null,

    session:
      saved,

    task:
      task
        ? normalizeTask(
            task,
          )
        : null,

    action:
      "failed",

    error,
  };
}

export async function syncExecutionJobSession(
  jobId: string,
  session: ExecutionSession,
): Promise<ExecutionJobSessionBridgeResult> {
  const job =
    await getExecutionJob(
      jobId,
    );

  if (!job) {
    return failureResult(
      jobId,
      "Execution job not found.",
    );
  }

  if (
    job.status ===
    "running"
  ) {
    return markExecutionJobSessionRunning(
      jobId,
      session,
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
        "",
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
        "Execution job failed.",
    );
  }

  return {
    success:
      true,

    jobId,

    taskId:
      job.taskId ??
      null,

    outcomeId:
      getStringMetadata(
        session.metadata,
        "outcomeId",
      ),

    milestoneId:
      getStringMetadata(
        session.metadata,
        "milestoneId",
      ),

    session,

    task:
      null,

    action:
      "created",

    error:
      null,
  };
}

async function resolveOutcomeLineage(
  job: ExecutionJob,
): Promise<{
  outcomeId: string;
  milestoneId:
    | string
    | null;
}> {
  const outcomes =
    await listOutcomes();

  const taskLinkedOutcome =
    job.taskId
      ? outcomes.find(
          (outcome) =>
            outcome.taskIds.includes(
              job.taskId as string,
            ) &&
            outcome.status !==
              "archived",
        ) ??
        null
      : null;

  if (
    taskLinkedOutcome
  ) {
    const activeMilestone =
      job.taskId
        ? taskLinkedOutcome.milestones.find(
            (milestone) =>
              milestone.taskIds.includes(
                job.taskId as string,
              ) &&
              milestone.status !==
                "completed",
          ) ??
          null
        : null;

    const fallbackMilestone =
      taskLinkedOutcome.milestones.find(
        (milestone) =>
          milestone.status ===
          "active",
      ) ??
      null;

    const milestone =
      activeMilestone ??
      fallbackMilestone;

    await updateOutcome(
      taskLinkedOutcome.id,
      {
        status:
          "active",

        taskIds:
          job.taskId
            ? Array.from(
                new Set([
                  ...taskLinkedOutcome.taskIds,
                  job.taskId,
                ]),
              )
            : taskLinkedOutcome.taskIds,
      },
    );

    if (
      milestone &&
      job.taskId
    ) {
      await updateOutcomeMilestone(
        taskLinkedOutcome.id,
        milestone.id,
        {
          status:
            "active",

          taskIds:
            Array.from(
              new Set([
                ...milestone.taskIds,
                job.taskId,
              ]),
            ),
        },
      );
    }

    return {
      outcomeId:
        taskLinkedOutcome.id,

      milestoneId:
        milestone?.id ??
        null,
    };
  }

  const matchingOutcome =
    outcomes.find(
      (outcome) =>
        outcome.title
          .trim()
          .toLowerCase() ===
          job.goal
            .trim()
            .toLowerCase() &&
        outcome.status !==
          "archived",
    ) ??
    null;

  if (
    matchingOutcome
  ) {
    const milestone =
      matchingOutcome.milestones.find(
        (item) =>
          item.status ===
          "active",
      ) ??
      matchingOutcome.milestones[0] ??
      null;

    await updateOutcome(
      matchingOutcome.id,
      {
        status:
          "active",

        taskIds:
          job.taskId
            ? Array.from(
                new Set([
                  ...matchingOutcome.taskIds,
                  job.taskId,
                ]),
              )
            : matchingOutcome.taskIds,
      },
    );

    if (
      milestone &&
      job.taskId
    ) {
      await updateOutcomeMilestone(
        matchingOutcome.id,
        milestone.id,
        {
          status:
            "active",

          taskIds:
            Array.from(
              new Set([
                ...milestone.taskIds,
                job.taskId,
              ]),
            ),
        },
      );
    }

    return {
      outcomeId:
        matchingOutcome.id,

      milestoneId:
        milestone?.id ??
        null,
    };
  }

  const outcome =
    await createOutcome({
      title:
        job.goal,

      description:
        "Execution outcome created from the persisted Execution Job lineage.",

      successCriteria:
        "Runtime execution completes successfully, verification passes, and the linked Task and execution state are synchronized.",

      priority:
        "normal",

      milestones: [
        {
          title:
            "Execute and verify",

          description:
            "Execute the Runtime job and synchronize the resulting Task, Session and Outcome state.",
        },
      ],
    });

  await updateOutcome(
    outcome.id,
    {
      status:
        "active",

      taskIds:
        job.taskId
          ? [
              job.taskId,
            ]
          : [],
    },
  );

  const milestone =
    outcome.milestones[0] ??
    null;

  if (
    milestone &&
    job.taskId
  ) {
    await updateOutcomeMilestone(
      outcome.id,
      milestone.id,
      {
        status:
          "active",

        taskIds: [
          job.taskId,
        ],
      },
    );
  }

  return {
    outcomeId:
      outcome.id,

    milestoneId:
      milestone?.id ??
      null,
  };
}

function createSessionInput(
  job: ExecutionJob,
  lineage: {
    outcomeId: string;
    milestoneId:
      | string
      | null;
  },
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

      outcomeId:
        lineage.outcomeId,

      milestoneId:
        lineage.milestoneId,

      source:
        "execution-job",
    },
  };
}

function getRuntimeStep(
  session: ExecutionSession,
) {
  return (
    session.steps.find(
      (step) =>
        step.key ===
        RUNTIME_STEP.key,
    ) ??
    session.steps.find(
      (step) =>
        step.capability ===
        RUNTIME_STEP.capability,
    ) ??
    null
  );
}

function getStringMetadata(
  metadata:
    Record<string, unknown>,
  key:
    string,
): string | null {
  const value =
    metadata[key];

  return typeof value ===
    "string" &&
    value.trim()
    ? value.trim()
    : null;
}

function failureResult(
  jobId: string,
  error: string,
): ExecutionJobSessionBridgeResult {
  return {
    success:
      false,

    jobId,

    taskId:
      null,

    outcomeId:
      null,

    milestoneId:
      null,

    session:
      null,

    task:
      null,

    action:
      "not_found",

    error,
  };
}

function normalizeTask(
  task: {
    id: string;

    title: string;

    status:
      | "todo"
      | "doing"
      | "done";

    createdAt:
      number;

    updatedAt:
      number;
  },
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
