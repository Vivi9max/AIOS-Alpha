export type ExecutionStatus =
  | "idle"
  | "planning"
  | "routing"
  | "creating_tasks"
  | "executing"
  | "updating_memory"
  | "saving"
  | "completed"
  | "failed"
  | "cancelled";

export type ExecutionStepStatus =
  | "waiting"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export type ExecutionEventType =
  | "session_started"
  | "status_changed"
  | "step_started"
  | "step_completed"
  | "step_failed"
  | "tasks_created"
  | "runtime_completed"
  | "memory_updated"
  | "storage_saved"
  | "session_completed"
  | "session_failed"
  | "session_cancelled";

export interface ExecutionStep {
  id: string;
  key: string;
  title: string;
  description: string;
  capability: string;
  status: ExecutionStepStatus;
  progress: number;
  startedAt: number | null;
  completedAt: number | null;
  durationMs: number | null;
  error: string | null;
  metadata: Record<
    string,
    unknown
  >;
}

export interface ExecutionEvent {
  id: string;
  sessionId: string;
  type: ExecutionEventType;
  status: ExecutionStatus;
  stepId: string | null;
  capability: string | null;
  message: string;
  timestamp: number;
  metadata: Record<
    string,
    unknown
  >;
}

export interface ExecutionMetrics {
  totalDurationMs: number;
  planningDurationMs: number;
  routingDurationMs: number;
  taskCreationDurationMs: number;
  runtimeDurationMs: number;
  memoryDurationMs: number;
  storageDurationMs: number;
  waitingDurationMs: number;
}

export interface ExecutionOutcome {
  success: boolean;
  summary: string;
  generatedTaskCount: number;
  reusedTaskCount: number;
  memoryUpdated: boolean;
  storageSaved: boolean;
  nextRecommendedAction:
    | string
    | null;
  metadata: Record<
    string,
    unknown
  >;
}

export interface ExecutionSession {
  id: string;
  goal: string;
  planId: string | null;
  requestId: string | null;
  provider: string | null;
  status: ExecutionStatus;
  progress: number;
  currentStepId:
    | string
    | null;
  currentCapability:
    | string
    | null;
  nextCapability:
    | string
    | null;
  startedAt: number;
  updatedAt: number;
  completedAt: number | null;
  durationMs: number | null;
  fallbackUsed: boolean;
  steps: ExecutionStep[];
  events: ExecutionEvent[];
  metrics: ExecutionMetrics;
  outcome:
    | ExecutionOutcome
    | null;
  error: string | null;
  metadata: Record<
    string,
    unknown
  >;
}

export interface CreateExecutionSessionInput {
  goal: string;
  planId?: string | null;
  requestId?: string | null;
  provider?: string | null;
  fallbackUsed?: boolean;
  steps?: Array<
    Partial<
      Pick<
        ExecutionStep,
        | "id"
        | "key"
        | "title"
        | "description"
        | "capability"
        | "metadata"
      >
    >
  >;
  metadata?: Record<
    string,
    unknown
  >;
}

export interface UpdateExecutionSessionInput {
  status?: ExecutionStatus;
  progress?: number;
  currentStepId?:
    | string
    | null;
  currentCapability?:
    | string
    | null;
  nextCapability?:
    | string
    | null;
  requestId?:
    | string
    | null;
  provider?:
    | string
    | null;
  fallbackUsed?: boolean;
  outcome?:
    | ExecutionOutcome
    | null;
  error?: string | null;
  metadata?: Record<
    string,
    unknown
  >;
}

const DEFAULT_EXECUTION_STEPS: Array<{
  key: string;
  title: string;
  description: string;
  capability: string;
}> = [
  {
    key:
      "analyze_goal",
    title:
      "理解目标",
    description:
      "分析最终目标、成功标准、时间范围和限制条件。",
    capability:
      "Planner",
  },
  {
    key:
      "generate_plan",
    title:
      "生成执行计划",
    description:
      "拆解执行阶段并确定合理的推进顺序。",
    capability:
      "Planner",
  },
  {
    key:
      "route_capabilities",
    title:
      "选择能力",
    description:
      "根据计划选择 Runtime、Tasks、Memory 和 Storage 能力。",
    capability:
      "Capability Router",
  },
  {
    key:
      "create_tasks",
    title:
      "创建任务",
    description:
      "把执行阶段转换为可追踪的持久化任务。",
    capability:
      "Tasks",
  },
  {
    key:
      "execute_runtime",
    title:
      "执行 Runtime",
    description:
      "调用 AI Provider 执行当前计划并生成结果。",
    capability:
      "Runtime",
  },
  {
    key:
      "update_memory",
    title:
      "更新记忆",
    description:
      "保存目标、关键判断、结果和后续行动。",
    capability:
      "Memory",
  },
  {
    key:
      "save_storage",
    title:
      "保存执行状态",
    description:
      "持久化执行会话、事件、指标和成果。",
    capability:
      "Storage",
  },
];

export function createExecutionSession(
  input: CreateExecutionSessionInput
): ExecutionSession {
  const now =
    Date.now();

  const sessionId =
    createExecutionId(
      "exec"
    );

  const steps =
    createExecutionSteps(
      input.steps
    );

  const session: ExecutionSession =
    {
      id:
        sessionId,

      goal:
        input.goal.trim(),

      planId:
        input.planId ??
        null,

      requestId:
        input.requestId ??
        null,

      provider:
        input.provider ??
        null,

      status:
        "idle",

      progress: 0,

      currentStepId:
        null,

      currentCapability:
        null,

      nextCapability:
        steps[0]
          ?.capability ??
        null,

      startedAt:
        now,

      updatedAt:
        now,

      completedAt:
        null,

      durationMs:
        null,

      fallbackUsed:
        input.fallbackUsed ??
        false,

      steps,

      events: [],

      metrics:
        createEmptyExecutionMetrics(),

      outcome:
        null,

      error:
        null,

      metadata: {
        ...(input.metadata ??
          {}),
      },
    };

  return appendExecutionEvent(
    session,
    {
      type:
        "session_started",

      message:
        "Execution session started.",

      status:
        "idle",

      capability:
        null,

      stepId:
        null,
    }
  );
}

export function createExecutionSteps(
  customSteps?: CreateExecutionSessionInput["steps"]
): ExecutionStep[] {
  const source: NonNullable<
    CreateExecutionSessionInput["steps"]
  > =
    customSteps &&
    customSteps.length > 0
      ? customSteps
      : DEFAULT_EXECUTION_STEPS.map(
          (step) => ({
            key: step.key,
            title: step.title,
            description:
              step.description,
            capability:
              step.capability,
          })
        );

  return source.map(
    (
      step,
      index
    ) => {
      const fallback =
        DEFAULT_EXECUTION_STEPS[
          index
        ] ??
        DEFAULT_EXECUTION_STEPS[
          DEFAULT_EXECUTION_STEPS.length -
            1
        ];

      return {
        id:
          step.id ??
          createExecutionId(
            "step"
          ),

        key:
          step.key ??
          fallback.key,

        title:
          step.title ??
          fallback.title,

        description:
          step.description ??
          fallback.description,

        capability:
          step.capability ??
          fallback.capability,

        status:
          "waiting",

        progress: 0,

        startedAt:
          null,

        completedAt:
          null,

        durationMs:
          null,

        error:
          null,

        metadata: {
          ...(step.metadata ??
            {}),
        },
      };
    }
  );
}

export function updateExecutionSession(
  session: ExecutionSession,
  updates: UpdateExecutionSessionInput
): ExecutionSession {
  const now =
    Date.now();

  const status =
    updates.status ??
    session.status;

  const completed =
    status ===
      "completed" ||
    status ===
      "failed" ||
    status ===
      "cancelled";

  const completedAt =
    completed
      ? session.completedAt ??
        now
      : session.completedAt;

  return {
    ...session,

    status,

    progress:
      updates.progress !==
      undefined
        ? clampProgress(
            updates.progress
          )
        : session.progress,

    currentStepId:
      updates.currentStepId !==
      undefined
        ? updates.currentStepId
        : session.currentStepId,

    currentCapability:
      updates.currentCapability !==
      undefined
        ? updates.currentCapability
        : session.currentCapability,

    nextCapability:
      updates.nextCapability !==
      undefined
        ? updates.nextCapability
        : session.nextCapability,

    requestId:
      updates.requestId !==
      undefined
        ? updates.requestId
        : session.requestId,

    provider:
      updates.provider !==
      undefined
        ? updates.provider
        : session.provider,

    fallbackUsed:
      updates.fallbackUsed !==
      undefined
        ? updates.fallbackUsed
        : session.fallbackUsed,

    outcome:
      updates.outcome !==
      undefined
        ? updates.outcome
        : session.outcome,

    error:
      updates.error !==
      undefined
        ? updates.error
        : session.error,

    metadata: {
      ...session.metadata,
      ...(updates.metadata ??
        {}),
    },

    updatedAt:
      now,

    completedAt,

    durationMs:
      completedAt !==
      null
        ? Math.max(
            0,
            completedAt -
              session.startedAt
          )
        : null,
  };
}

export function startExecutionStep(
  session: ExecutionSession,
  stepId: string
): ExecutionSession {
  const now =
    Date.now();

  const stepIndex =
    session.steps.findIndex(
      (step) =>
        step.id ===
        stepId
    );

  if (
    stepIndex === -1
  ) {
    return session;
  }

  const currentStep =
    session.steps[
      stepIndex
    ];

  const nextStep =
    session.steps[
      stepIndex + 1
    ] ?? null;

  const steps =
    session.steps.map(
      (step) => {
        if (
          step.id !==
          stepId
        ) {
          return step;
        }

        return {
          ...step,

          status:
            "running" as const,

          progress: 10,

          startedAt:
            step.startedAt ??
            now,

          completedAt:
            null,

          durationMs:
            null,

          error:
            null,
        };
      }
    );

  let updated =
    updateExecutionSession(
      {
        ...session,
        steps,
      },
      {
        status:
          statusForCapability(
            currentStep.capability
          ),

        currentStepId:
          currentStep.id,

        currentCapability:
          currentStep.capability,

        nextCapability:
          nextStep?.capability ??
          null,

        progress:
          calculateSessionProgress(
            steps
          ),
      }
    );

  updated =
    appendExecutionEvent(
      updated,
      {
        type:
          "step_started",

        message:
          `${currentStep.title} started.`,

        status:
          updated.status,

        capability:
          currentStep.capability,

        stepId:
          currentStep.id,
      }
    );

  return updated;
}

export function updateExecutionStepProgress(
  session: ExecutionSession,
  stepId: string,
  progress: number
): ExecutionSession {
  const normalized =
    clampProgress(
      progress
    );

  const steps =
    session.steps.map(
      (step) => {
        if (
          step.id !==
          stepId
        ) {
          return step;
        }

        return {
          ...step,

          status:
            normalized >= 100
              ? ("completed" as const)
              : ("running" as const),

          progress:
            normalized,
        };
      }
    );

  return updateExecutionSession(
    {
      ...session,
      steps,
    },
    {
      progress:
        calculateSessionProgress(
          steps
        ),
    }
  );
}

export function completeExecutionStep(
  session: ExecutionSession,
  stepId: string,
  metadata?: Record<
    string,
    unknown
  >
): ExecutionSession {
  const now =
    Date.now();

  const stepIndex =
    session.steps.findIndex(
      (step) =>
        step.id ===
        stepId
    );

  if (
    stepIndex === -1
  ) {
    return session;
  }

  const completedStep =
    session.steps[
      stepIndex
    ];

  const nextStep =
    session.steps[
      stepIndex + 1
    ] ?? null;

  const steps =
    session.steps.map(
      (step) => {
        if (
          step.id !==
          stepId
        ) {
          return step;
        }

        const startedAt =
          step.startedAt ??
          now;

        return {
          ...step,

          status:
            "completed" as const,

          progress: 100,

          startedAt,

          completedAt:
            now,

          durationMs:
            Math.max(
              0,
              now -
                startedAt
            ),

          metadata: {
            ...step.metadata,
            ...(metadata ??
              {}),
          },

          error:
            null,
        };
      }
    );

  let updated =
    updateExecutionSession(
      {
        ...session,
        steps,
      },
      {
        progress:
          calculateSessionProgress(
            steps
          ),

        currentStepId:
          nextStep?.id ??
          null,

        currentCapability:
          nextStep?.capability ??
          null,

        nextCapability:
          session.steps[
            stepIndex + 2
          ]?.capability ??
          null,
      }
    );

  updated =
    appendExecutionEvent(
      updated,
      {
        type:
          eventTypeForCompletedStep(
            completedStep.key
          ),

        message:
          `${completedStep.title} completed.`,

        status:
          updated.status,

        capability:
          completedStep.capability,

        stepId:
          completedStep.id,

        metadata,
      }
    );

  return updated;
}

export function failExecutionStep(
  session: ExecutionSession,
  stepId: string,
  error: string
): ExecutionSession {
  const now =
    Date.now();

  const failedStep =
    session.steps.find(
      (step) =>
        step.id ===
        stepId
    );

  if (!failedStep) {
    return session;
  }

  const steps =
    session.steps.map(
      (step) => {
        if (
          step.id !==
          stepId
        ) {
          return step;
        }

        const startedAt =
          step.startedAt ??
          now;

        return {
          ...step,

          status:
            "failed" as const,

          completedAt:
            now,

          durationMs:
            Math.max(
              0,
              now -
                startedAt
            ),

          error,
        };
      }
    );

  let updated =
    updateExecutionSession(
      {
        ...session,
        steps,
      },
      {
        status:
          "failed",

        error,

        currentStepId:
          failedStep.id,

        currentCapability:
          failedStep.capability,

        nextCapability:
          null,

        progress:
          calculateSessionProgress(
            steps
          ),
      }
    );

  updated =
    appendExecutionEvent(
      updated,
      {
        type:
          "step_failed",

        message:
          `${failedStep.title} failed: ${error}`,

        status:
          "failed",

        capability:
          failedStep.capability,

        stepId:
          failedStep.id,

        metadata: {
          error,
        },
      }
    );

  return appendExecutionEvent(
    updated,
    {
      type:
        "session_failed",

      message:
        "Execution session failed.",

      status:
        "failed",

      capability:
        failedStep.capability,

      stepId:
        failedStep.id,

      metadata: {
        error,
      },
    }
  );
}

export function completeExecutionSession(
  session: ExecutionSession,
  outcome: ExecutionOutcome
): ExecutionSession {
  const completedSteps =
    session.steps.map(
      (step) => {
        if (
          step.status ===
          "waiting"
        ) {
          return {
            ...step,
            status:
              "skipped" as const,
          };
        }

        return step;
      }
    );

  let updated =
    updateExecutionSession(
      {
        ...session,
        steps:
          completedSteps,
      },
      {
        status:
          outcome.success
            ? "completed"
            : "failed",

        progress:
          outcome.success
            ? 100
            : calculateSessionProgress(
                completedSteps
              ),

        currentStepId:
          null,

        currentCapability:
          null,

        nextCapability:
          null,

        outcome,

        error:
          outcome.success
            ? null
            : outcome.summary,
      }
    );

  updated = {
    ...updated,

    metrics:
      calculateExecutionMetrics(
        updated
      ),
  };

  return appendExecutionEvent(
    updated,
    {
      type:
        outcome.success
          ? "session_completed"
          : "session_failed",

      message:
        outcome.summary,

      status:
        updated.status,

      capability:
        null,

      stepId:
        null,

      metadata: {
        generatedTaskCount:
          outcome.generatedTaskCount,

        reusedTaskCount:
          outcome.reusedTaskCount,

        memoryUpdated:
          outcome.memoryUpdated,

        storageSaved:
          outcome.storageSaved,

        nextRecommendedAction:
          outcome.nextRecommendedAction,
      },
    }
  );
}

export function cancelExecutionSession(
  session: ExecutionSession,
  reason =
    "Execution cancelled."
): ExecutionSession {
  const steps =
    session.steps.map(
      (step) => {
        if (
          step.status ===
            "waiting" ||
          step.status ===
            "running"
        ) {
          return {
            ...step,

            status:
              "skipped" as const,
          };
        }

        return step;
      }
    );

  let updated =
    updateExecutionSession(
      {
        ...session,
        steps,
      },
      {
        status:
          "cancelled",

        currentStepId:
          null,

        currentCapability:
          null,

        nextCapability:
          null,

        error:
          reason,
      }
    );

  updated = {
    ...updated,

    metrics:
      calculateExecutionMetrics(
        updated
      ),
  };

  return appendExecutionEvent(
    updated,
    {
      type:
        "session_cancelled",

      message:
        reason,

      status:
        "cancelled",

      capability:
        null,

      stepId:
        null,
    }
  );
}

export function appendExecutionEvent(
  session: ExecutionSession,
  input: {
    type: ExecutionEventType;
    message: string;
    status?: ExecutionStatus;
    stepId?: string | null;
    capability?:
      | string
      | null;
    metadata?: Record<
      string,
      unknown
    >;
  }
): ExecutionSession {
  const event: ExecutionEvent =
    {
      id:
        createExecutionId(
          "event"
        ),

      sessionId:
        session.id,

      type:
        input.type,

      status:
        input.status ??
        session.status,

      stepId:
        input.stepId ??
        null,

      capability:
        input.capability ??
        null,

      message:
        input.message,

      timestamp:
        Date.now(),

      metadata: {
        ...(input.metadata ??
          {}),
      },
    };

  return {
    ...session,

    events: [
      ...session.events,
      event,
    ],

    updatedAt:
      event.timestamp,
  };
}

export function calculateSessionProgress(
  steps: ExecutionStep[]
): number {
  if (
    steps.length === 0
  ) {
    return 0;
  }

  const total =
    steps.reduce(
      (
        sum,
        step
      ) =>
        sum +
        clampProgress(
          step.progress
        ),
      0
    );

  return Math.round(
    total /
      steps.length
  );
}

export function calculateExecutionMetrics(
  session: ExecutionSession
): ExecutionMetrics {
  const metrics =
    createEmptyExecutionMetrics();

  for (const step of session.steps) {
    const duration =
      step.durationMs ??
      0;

    switch (
      step.capability
        .trim()
        .toLowerCase()
    ) {
      case "planner":
        metrics.planningDurationMs +=
          duration;
        break;

      case "capability router":
        metrics.routingDurationMs +=
          duration;
        break;

      case "tasks":
        metrics.taskCreationDurationMs +=
          duration;
        break;

      case "runtime":
        metrics.runtimeDurationMs +=
          duration;
        break;

      case "memory":
        metrics.memoryDurationMs +=
          duration;
        break;

      case "storage":
        metrics.storageDurationMs +=
          duration;
        break;

      default:
        metrics.waitingDurationMs +=
          duration;
        break;
    }
  }

  metrics.totalDurationMs =
    session.durationMs ??
    Math.max(
      0,
      Date.now() -
        session.startedAt
    );

  const measured =
    metrics.planningDurationMs +
    metrics.routingDurationMs +
    metrics.taskCreationDurationMs +
    metrics.runtimeDurationMs +
    metrics.memoryDurationMs +
    metrics.storageDurationMs;

  metrics.waitingDurationMs =
    Math.max(
      metrics.waitingDurationMs,
      metrics.totalDurationMs -
        measured
    );

  return metrics;
}

export function getCurrentExecutionStep(
  session: ExecutionSession
): ExecutionStep | null {
  if (
    !session.currentStepId
  ) {
    return null;
  }

  return (
    session.steps.find(
      (step) =>
        step.id ===
        session.currentStepId
    ) ?? null
  );
}

export function getNextExecutionStep(
  session: ExecutionSession
): ExecutionStep | null {
  const currentIndex =
    session.steps.findIndex(
      (step) =>
        step.id ===
        session.currentStepId
    );

  if (
    currentIndex === -1
  ) {
    return (
      session.steps.find(
        (step) =>
          step.status ===
          "waiting"
      ) ?? null
    );
  }

  return (
    session.steps[
      currentIndex + 1
    ] ?? null
  );
}

export function isExecutionFinished(
  session: ExecutionSession
): boolean {
  return [
    "completed",
    "failed",
    "cancelled",
  ].includes(
    session.status
  );
}

export function createEmptyExecutionMetrics():
  ExecutionMetrics {
  return {
    totalDurationMs: 0,
    planningDurationMs: 0,
    routingDurationMs: 0,
    taskCreationDurationMs: 0,
    runtimeDurationMs: 0,
    memoryDurationMs: 0,
    storageDurationMs: 0,
    waitingDurationMs: 0,
  };
}

function statusForCapability(
  capability: string
): ExecutionStatus {
  const normalized =
    capability
      .trim()
      .toLowerCase();

  if (
    normalized ===
    "planner"
  ) {
    return "planning";
  }

  if (
    normalized ===
    "capability router"
  ) {
    return "routing";
  }

  if (
    normalized ===
    "tasks"
  ) {
    return "creating_tasks";
  }

  if (
    normalized ===
    "runtime"
  ) {
    return "executing";
  }

  if (
    normalized ===
    "memory"
  ) {
    return "updating_memory";
  }

  if (
    normalized ===
    "storage"
  ) {
    return "saving";
  }

  return "executing";
}

function eventTypeForCompletedStep(
  stepKey: string
): ExecutionEventType {
  switch (stepKey) {
    case "create_tasks":
      return "tasks_created";

    case "execute_runtime":
      return "runtime_completed";

    case "update_memory":
      return "memory_updated";

    case "save_storage":
      return "storage_saved";

    default:
      return "step_completed";
  }
}

function createExecutionId(
  prefix: string
): string {
  return [
    prefix,
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 10),
  ].join("-");
}

function clampProgress(
  value: number
): number {
  if (
    !Number.isFinite(
      value
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(value)
    )
  );
}