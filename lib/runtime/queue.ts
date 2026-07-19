import {
  completeExecutionStep,
  failExecutionStep,
  getCurrentExecutionStep,
  getNextExecutionStep,
  startExecutionStep,
  type ExecutionSession,
  type ExecutionStep,
} from "./execution";

export interface ExecutionQueueItem {
  id: string;
  sessionId: string;
  stepId: string;
  key: string;
  title: string;
  description: string;
  capability: string;
  status:
    | "waiting"
    | "running"
    | "completed"
    | "failed"
    | "skipped";
  position: number;
  progress: number;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  durationMs: number | null;
  error: string | null;
  metadata: Record<
    string,
    unknown
  >;
}

export interface ExecutionQueue {
  sessionId: string;
  status:
    | "idle"
    | "running"
    | "completed"
    | "failed"
    | "cancelled";
  currentItemId:
    | string
    | null;
  currentPosition:
    | number
    | null;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  waitingItems: number;
  progress: number;
  items: ExecutionQueueItem[];
  createdAt: number;
  updatedAt: number;
}

export interface AdvanceExecutionQueueResult {
  session: ExecutionSession;
  queue: ExecutionQueue;
  current:
    | ExecutionQueueItem
    | null;
  next:
    | ExecutionQueueItem
    | null;
  finished: boolean;
}

export function createExecutionQueue(
  session: ExecutionSession
): ExecutionQueue {
  const items =
    session.steps.map(
      (
        step,
        index
      ) =>
        mapStepToQueueItem(
          session,
          step,
          index
        )
    );

  return calculateQueueState({
    sessionId:
      session.id,

    status:
      resolveQueueStatus(
        session
      ),

    currentItemId:
      session.currentStepId,

    currentPosition:
      findCurrentPosition(
        session
      ),

    totalItems:
      items.length,

    completedItems: 0,
    failedItems: 0,
    waitingItems:
      items.length,

    progress:
      session.progress,

    items,

    createdAt:
      session.startedAt,

    updatedAt:
      session.updatedAt,
  });
}

export function synchronizeExecutionQueue(
  queue: ExecutionQueue,
  session: ExecutionSession
): ExecutionQueue {
  const existingItems =
    new Map(
      queue.items.map(
        (item) => [
          item.stepId,
          item,
        ]
      )
    );

  const items =
    session.steps.map(
      (
        step,
        index
      ) => {
        const existing =
          existingItems.get(
            step.id
          );

        return {
          ...mapStepToQueueItem(
            session,
            step,
            index
          ),

          createdAt:
            existing?.createdAt ??
            queue.createdAt,

          metadata: {
            ...(existing
              ?.metadata ??
              {}),

            ...step.metadata,
          },
        };
      }
    );

  return calculateQueueState({
    ...queue,

    status:
      resolveQueueStatus(
        session
      ),

    currentItemId:
      session.currentStepId,

    currentPosition:
      findCurrentPosition(
        session
      ),

    progress:
      session.progress,

    items,

    updatedAt:
      session.updatedAt,
  });
}

export function startCurrentQueueItem(
  session: ExecutionSession
): AdvanceExecutionQueueResult {
  const currentStep =
    resolveCurrentStep(
      session
    );

  if (!currentStep) {
    const queue =
      createExecutionQueue(
        session
      );

    return {
      session,
      queue,
      current: null,
      next: null,
      finished: true,
    };
  }

  const nextSession =
    currentStep.status ===
    "running"
      ? session
      : startExecutionStep(
          session,
          currentStep.id
        );

  const queue =
    createExecutionQueue(
      nextSession
    );

  return {
    session:
      nextSession,

    queue,

    current:
      getQueueItemByStepId(
        queue,
        currentStep.id
      ),

    next:
      getNextQueueItem(
        queue
      ),

    finished: false,
  };
}

export function completeCurrentQueueItem(
  session: ExecutionSession,
  metadata?: Record<
    string,
    unknown
  >
): AdvanceExecutionQueueResult {
  const currentStep =
    getCurrentExecutionStep(
      session
    ) ??
    session.steps.find(
      (step) =>
        step.status ===
        "running"
    ) ??
    null;

  if (!currentStep) {
    const queue =
      createExecutionQueue(
        session
      );

    return {
      session,
      queue,
      current: null,
      next:
        getNextQueueItem(
          queue
        ),
      finished:
        isQueueFinished(
          queue
        ),
    };
  }

  const nextSession =
    completeExecutionStep(
      session,
      currentStep.id,
      metadata
    );

  const nextStep =
    resolveCurrentStep(
      nextSession
    );

  const advancedSession =
    nextStep &&
    nextStep.status ===
      "waiting"
      ? startExecutionStep(
          nextSession,
          nextStep.id
        )
      : nextSession;

  const queue =
    createExecutionQueue(
      advancedSession
    );

  return {
    session:
      advancedSession,

    queue,

    current:
      advancedSession.currentStepId
        ? getQueueItemByStepId(
            queue,
            advancedSession.currentStepId
          )
        : null,

    next:
      getNextQueueItem(
        queue
      ),

    finished:
      isQueueFinished(
        queue
      ),
  };
}

export function failCurrentQueueItem(
  session: ExecutionSession,
  error: string
): AdvanceExecutionQueueResult {
  const currentStep =
    getCurrentExecutionStep(
      session
    ) ??
    session.steps.find(
      (step) =>
        step.status ===
        "running"
    ) ??
    null;

  if (!currentStep) {
    const queue =
      createExecutionQueue(
        session
      );

    return {
      session,
      queue,
      current: null,
      next: null,
      finished:
        isQueueFinished(
          queue
        ),
    };
  }

  const nextSession =
    failExecutionStep(
      session,
      currentStep.id,
      error
    );

  const queue =
    createExecutionQueue(
      nextSession
    );

  return {
    session:
      nextSession,

    queue,

    current:
      getQueueItemByStepId(
        queue,
        currentStep.id
      ),

    next: null,

    finished: true,
  };
}

export function skipQueueItem(
  session: ExecutionSession,
  stepId: string,
  reason =
    "Step skipped."
): ExecutionSession {
  const now =
    Date.now();

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
            "skipped" as const,

          progress: 0,

          startedAt:
            step.startedAt ??
            now,

          completedAt:
            now,

          durationMs:
            step.startedAt
              ? Math.max(
                  0,
                  now -
                    step.startedAt
                )
              : 0,

          error:
            reason,

          metadata: {
            ...step.metadata,

            skipped:
              true,

            skipReason:
              reason,
          },
        };
      }
    );

  const nextWaitingStep =
    steps.find(
      (step) =>
        step.status ===
        "waiting"
    );

  return {
    ...session,

    steps,

    currentStepId:
      nextWaitingStep?.id ??
      null,

    currentCapability:
      nextWaitingStep
        ?.capability ??
      null,

    nextCapability:
      getCapabilityAfterStep(
        steps,
        nextWaitingStep?.id
      ),

    updatedAt:
      now,
  };
}

export function getQueueItemByStepId(
  queue: ExecutionQueue,
  stepId: string
): ExecutionQueueItem | null {
  return (
    queue.items.find(
      (item) =>
        item.stepId ===
        stepId
    ) ?? null
  );
}

export function getCurrentQueueItem(
  queue: ExecutionQueue
): ExecutionQueueItem | null {
  if (
    queue.currentItemId
  ) {
    return (
      queue.items.find(
        (item) =>
          item.stepId ===
          queue.currentItemId
      ) ?? null
    );
  }

  return (
    queue.items.find(
      (item) =>
        item.status ===
        "running"
    ) ?? null
  );
}

export function getNextQueueItem(
  queue: ExecutionQueue
): ExecutionQueueItem | null {
  const current =
    getCurrentQueueItem(
      queue
    );

  if (!current) {
    return (
      queue.items.find(
        (item) =>
          item.status ===
          "waiting"
      ) ?? null
    );
  }

  return (
    queue.items.find(
      (item) =>
        item.position >
          current.position &&
        item.status ===
          "waiting"
    ) ?? null
  );
}

export function getWaitingQueueItems(
  queue: ExecutionQueue
): ExecutionQueueItem[] {
  return queue.items.filter(
    (item) =>
      item.status ===
      "waiting"
  );
}

export function getCompletedQueueItems(
  queue: ExecutionQueue
): ExecutionQueueItem[] {
  return queue.items.filter(
    (item) =>
      item.status ===
      "completed"
  );
}

export function getFailedQueueItems(
  queue: ExecutionQueue
): ExecutionQueueItem[] {
  return queue.items.filter(
    (item) =>
      item.status ===
      "failed"
  );
}

export function isQueueFinished(
  queue: ExecutionQueue
): boolean {
  return (
    queue.status ===
      "completed" ||
    queue.status ===
      "failed" ||
    queue.status ===
      "cancelled"
  );
}

export function calculateQueueProgress(
  items: ExecutionQueueItem[]
): number {
  if (
    items.length === 0
  ) {
    return 0;
  }

  const total =
    items.reduce(
      (
        sum,
        item
      ) =>
        sum +
        clampProgress(
          item.progress
        ),
      0
    );

  return Math.round(
    total /
      items.length
  );
}

function mapStepToQueueItem(
  session: ExecutionSession,
  step: ExecutionStep,
  index: number
): ExecutionQueueItem {
  return {
    id:
      `queue-${session.id}-${step.id}`,

    sessionId:
      session.id,

    stepId:
      step.id,

    key:
      step.key,

    title:
      step.title,

    description:
      step.description,

    capability:
      step.capability,

    status:
      step.status,

    position:
      index + 1,

    progress:
      step.progress,

    createdAt:
      session.startedAt,

    startedAt:
      step.startedAt,

    completedAt:
      step.completedAt,

    durationMs:
      step.durationMs,

    error:
      step.error,

    metadata: {
      ...step.metadata,
    },
  };
}

function calculateQueueState(
  queue: ExecutionQueue
): ExecutionQueue {
  const completedItems =
    queue.items.filter(
      (item) =>
        item.status ===
          "completed" ||
        item.status ===
          "skipped"
    ).length;

  const failedItems =
    queue.items.filter(
      (item) =>
        item.status ===
        "failed"
    ).length;

  const waitingItems =
    queue.items.filter(
      (item) =>
        item.status ===
        "waiting"
    ).length;

  return {
    ...queue,

    totalItems:
      queue.items.length,

    completedItems,

    failedItems,

    waitingItems,

    progress:
      calculateQueueProgress(
        queue.items
      ),
  };
}

function resolveQueueStatus(
  session: ExecutionSession
): ExecutionQueue["status"] {
  if (
    session.status ===
    "completed"
  ) {
    return "completed";
  }

  if (
    session.status ===
    "failed"
  ) {
    return "failed";
  }

  if (
    session.status ===
    "cancelled"
  ) {
    return "cancelled";
  }

  if (
    session.steps.some(
      (step) =>
        step.status ===
        "running"
    )
  ) {
    return "running";
  }

  return "idle";
}

function resolveCurrentStep(
  session: ExecutionSession
): ExecutionStep | null {
  return (
    getCurrentExecutionStep(
      session
    ) ??
    session.steps.find(
      (step) =>
        step.status ===
        "running"
    ) ??
    session.steps.find(
      (step) =>
        step.status ===
        "waiting"
    ) ??
    null
  );
}

function findCurrentPosition(
  session: ExecutionSession
): number | null {
  const current =
    resolveCurrentStep(
      session
    );

  if (!current) {
    return null;
  }

  const index =
    session.steps.findIndex(
      (step) =>
        step.id ===
        current.id
    );

  return index === -1
    ? null
    : index + 1;
}

function getCapabilityAfterStep(
  steps: ExecutionStep[],
  stepId:
    | string
    | undefined
): string | null {
  if (!stepId) {
    return null;
  }

  const index =
    steps.findIndex(
      (step) =>
        step.id ===
        stepId
    );

  if (
    index === -1
  ) {
    return null;
  }

  return (
    steps[index + 1]
      ?.capability ??
    null
  );
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