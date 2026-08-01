import {
  storage,
} from "@/lib/server-storage";

import {
  createUserStorageKey,
  getUserStorageScope,
} from "@/lib/storage/data-scope";

import type {
  Outcome,
  OutcomeMilestone,
  OutcomePriority,
  OutcomeStatus,
} from "@/lib/outcome/types";

import type {
  Task,
  TaskStatus,
} from "@/lib/task/types";

export type ExecutionMemoryEventType =
  | "planner-inspected"
  | "task-started"
  | "task-completed"
  | "milestone-activated"
  | "milestone-completed"
  | "outcome-progressed"
  | "outcome-completed"
  | "execution-synced"
  | "execution-failed";

export type ExecutionMemorySource =
  | "planner"
  | "runtime"
  | "outcome"
  | "task"
  | "system"
  | "user";

export interface ExecutionMemoryTaskSnapshot {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
}

export interface ExecutionMemoryMilestoneSnapshot {
  id: string;
  title: string;
  description: string;
  status:
    OutcomeMilestone["status"];
  order: number;
  taskIds: string[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface ExecutionMemoryOutcomeSnapshot {
  id: string;
  title: string;
  description: string;
  successCriteria: string;
  status: OutcomeStatus;
  priority: OutcomePriority;
  progress: number;
  targetDate: number | null;
  taskIds: string[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface ExecutionMemoryMetrics {
  latencyMs: number | null;
  previousProgress: number | null;
  currentProgress: number | null;
  progressDelta: number | null;
  completedTaskCount: number;
  remainingTaskCount: number;
  queueSize: number;
}

export interface ExecutionMemoryRecord {
  id: string;
  eventType:
    ExecutionMemoryEventType;
  source:
    ExecutionMemorySource;
  title: string;
  summary: string;
  outcomeId: string | null;
  milestoneId: string | null;
  taskId: string | null;
  outcome:
    ExecutionMemoryOutcomeSnapshot | null;
  milestone:
    ExecutionMemoryMilestoneSnapshot | null;
  task:
    ExecutionMemoryTaskSnapshot | null;
  metrics:
    ExecutionMemoryMetrics;
  metadata:
    Record<
      string,
      string | number | boolean | null
    >;
  success: boolean;
  createdAt: number;
}

export interface CreateExecutionMemoryInput {
  eventType:
    ExecutionMemoryEventType;
  source?:
    ExecutionMemorySource;
  title: string;
  summary?: string;
  outcome?: Outcome | null;
  milestone?:
    OutcomeMilestone | null;
  task?: Task | null;
  outcomeId?: string | null;
  milestoneId?: string | null;
  taskId?: string | null;
  latencyMs?: number | null;
  previousProgress?: number | null;
  currentProgress?: number | null;
  completedTaskCount?: number;
  remainingTaskCount?: number;
  queueSize?: number;
  metadata?: Record<
    string,
    string | number | boolean | null
  >;
  success?: boolean;
  createdAt?: number;
}

export interface ExecutionMemorySummary {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
  completedTasks: number;
  completedMilestones: number;
  completedOutcomes: number;
  averageLatencyMs: number | null;
  todayCount: number;
  weekCount: number;
  latestAt: number | null;
}

export interface ExecutionMemoryQuery {
  outcomeId?: string;
  milestoneId?: string;
  taskId?: string;
  eventType?:
    ExecutionMemoryEventType;
  source?:
    ExecutionMemorySource;
  success?: boolean;
  from?: number;
  to?: number;
  limit?: number;
}

interface UserExecutionMemoryState {
  records:
    ExecutionMemoryRecord[];
  sequence: number;
  hydrated: boolean;
  hydrationPromise?:
    Promise<void>;
}

type ExecutionMemoryGlobal =
  typeof globalThis & {
    __aiosExecutionMemoryStates?: Map<
      string,
      UserExecutionMemoryState
    >;
  };

const globalExecutionMemory =
  globalThis as ExecutionMemoryGlobal;

const MAX_EXECUTION_MEMORY_RECORDS =
  500;

const DEFAULT_QUERY_LIMIT =
  100;

const executionMemoryStates =
  globalExecutionMemory
    .__aiosExecutionMemoryStates ??
  (globalExecutionMemory
    .__aiosExecutionMemoryStates =
    new Map());

function getExecutionMemoryStorageKey():
  string {
  return createUserStorageKey(
    "execution-memory"
  );
}

function getExecutionMemoryState():
  UserExecutionMemoryState {
  const scope =
    getUserStorageScope();

  const existing =
    executionMemoryStates.get(
      scope
    );

  if (existing) {
    return existing;
  }

  const created:
    UserExecutionMemoryState = {
    records: [],
    sequence: 0,
    hydrated: false,
  };

  executionMemoryStates.set(
    scope,
    created
  );

  return created;
}

function createExecutionMemoryId():
  string {
  const state =
    getExecutionMemoryState();

  state.sequence =
    (
      state.sequence +
      1
    ) %
    1000;

  return [
    "execution",
    Date.now(),
    state.sequence
      .toString()
      .padStart(
        3,
        "0"
      ),
  ].join("-");
}

function normalizeText(
  value: unknown
): string {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function normalizeNullableNumber(
  value: unknown
): number | null {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  return value;
}

function normalizeCount(
  value: unknown
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(value)
  );
}

function clampProgress(
  value: number | null
): number | null {
  if (value === null) {
    return null;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(value)
    )
  );
}

function snapshotTask(
  task: Task | null | undefined
): ExecutionMemoryTaskSnapshot | null {
  if (!task) {
    return null;
  }

  return {
    id: task.id,
    title: task.title,
    description:
      task.description ?? "",
    status: task.status,
    createdAt:
      task.createdAt,
    updatedAt:
      task.updatedAt,
  };
}

function snapshotMilestone(
  milestone:
    | OutcomeMilestone
    | null
    | undefined
): ExecutionMemoryMilestoneSnapshot | null {
  if (!milestone) {
    return null;
  }

  return {
    id: milestone.id,
    title:
      milestone.title,
    description:
      milestone.description,
    status:
      milestone.status,
    order:
      milestone.order,
    taskIds: [
      ...milestone.taskIds,
    ],
    createdAt:
      milestone.createdAt,
    updatedAt:
      milestone.updatedAt,
    completedAt:
      milestone.completedAt,
  };
}

function snapshotOutcome(
  outcome:
    | Outcome
    | null
    | undefined
): ExecutionMemoryOutcomeSnapshot | null {
  if (!outcome) {
    return null;
  }

  return {
    id: outcome.id,
    title:
      outcome.title,
    description:
      outcome.description,
    successCriteria:
      outcome.successCriteria,
    status:
      outcome.status,
    priority:
      outcome.priority,
    progress:
      outcome.progress,
    targetDate:
      outcome.targetDate,
    taskIds: [
      ...outcome.taskIds,
    ],
    createdAt:
      outcome.createdAt,
    updatedAt:
      outcome.updatedAt,
    completedAt:
      outcome.completedAt,
  };
}

function isEventType(
  value: unknown
): value is ExecutionMemoryEventType {
  return (
    value ===
      "planner-inspected" ||
    value ===
      "task-started" ||
    value ===
      "task-completed" ||
    value ===
      "milestone-activated" ||
    value ===
      "milestone-completed" ||
    value ===
      "outcome-progressed" ||
    value ===
      "outcome-completed" ||
    value ===
      "execution-synced" ||
    value ===
      "execution-failed"
  );
}

function isSource(
  value: unknown
): value is ExecutionMemorySource {
  return (
    value === "planner" ||
    value === "runtime" ||
    value === "outcome" ||
    value === "task" ||
    value === "system" ||
    value === "user"
  );
}

function isExecutionMemoryRecord(
  value: unknown
): value is ExecutionMemoryRecord {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return false;
  }

  const item =
    value as Partial<
      ExecutionMemoryRecord
    >;

  return (
    typeof item.id ===
      "string" &&
    isEventType(
      item.eventType
    ) &&
    isSource(
      item.source
    ) &&
    typeof item.title ===
      "string" &&
    typeof item.summary ===
      "string" &&
    typeof item.success ===
      "boolean" &&
    typeof item.createdAt ===
      "number" &&
    typeof item.metrics ===
      "object" &&
    item.metrics !== null &&
    typeof item.metadata ===
      "object" &&
    item.metadata !== null
  );
}

function normalizeStoredExecutionMemory(
  value: unknown
): ExecutionMemoryRecord[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value
    .filter(
      isExecutionMemoryRecord
    )
    .sort(
      (a, b) =>
        a.createdAt -
        b.createdAt
    )
    .slice(
      -MAX_EXECUTION_MEMORY_RECORDS
    );
}

async function persistExecutionMemory():
  Promise<void> {
  const state =
    getExecutionMemoryState();

  await storage.set(
    getExecutionMemoryStorageKey(),
    [
      ...state.records,
    ]
  );
}

export async function hydrateExecutionMemory():
  Promise<void> {
  const state =
    getExecutionMemoryState();

  if (
    state.hydrated
  ) {
    return;
  }

  if (
    state.hydrationPromise
  ) {
    return state
      .hydrationPromise;
  }

  const hydrationPromise =
    (async () => {
      try {
        const stored =
          await storage.get<
            ExecutionMemoryRecord[]
          >(
            getExecutionMemoryStorageKey()
          );

        const restored =
          normalizeStoredExecutionMemory(
            stored
          );

        state.records.length =
          0;

        state.records.push(
          ...restored
        );
      } catch (error) {
        console.error(
          "[AIOS Execution Memory Hydration]",
          error
        );
      } finally {
        state.hydrated =
          true;

        state.hydrationPromise =
          undefined;
      }
    })();

  state.hydrationPromise =
    hydrationPromise;

  return hydrationPromise;
}

export function createExecutionMemoryRecord(
  input:
    CreateExecutionMemoryInput
): ExecutionMemoryRecord {
  const previousProgress =
    clampProgress(
      normalizeNullableNumber(
        input.previousProgress
      )
    );

  const currentProgress =
    clampProgress(
      normalizeNullableNumber(
        input.currentProgress ??
          input.outcome
            ?.progress
      )
    );

  const progressDelta =
    previousProgress !==
      null &&
    currentProgress !==
      null
      ? currentProgress -
        previousProgress
      : null;

  const outcome =
    snapshotOutcome(
      input.outcome
    );

  const milestone =
    snapshotMilestone(
      input.milestone
    );

  const task =
    snapshotTask(
      input.task
    );

  return {
    id:
      createExecutionMemoryId(),

    eventType:
      input.eventType,

    source:
      input.source ??
      "system",

    title:
      normalizeText(
        input.title
      ) ||
      formatExecutionMemoryTitle(
        input.eventType
      ),

    summary:
      normalizeText(
        input.summary
      ),

    outcomeId:
      input.outcomeId ??
      outcome?.id ??
      null,

    milestoneId:
      input.milestoneId ??
      milestone?.id ??
      null,

    taskId:
      input.taskId ??
      task?.id ??
      null,

    outcome,

    milestone,

    task,

    metrics: {
      latencyMs:
        normalizeNullableNumber(
          input.latencyMs
        ),

      previousProgress,

      currentProgress,

      progressDelta,

      completedTaskCount:
        normalizeCount(
          input.completedTaskCount
        ),

      remainingTaskCount:
        normalizeCount(
          input.remainingTaskCount
        ),

      queueSize:
        normalizeCount(
          input.queueSize
        ),
    },

    metadata: {
      ...(input.metadata ??
        {}),
    },

    success:
      input.success ??
      true,

    createdAt:
      normalizeNullableNumber(
        input.createdAt
      ) ??
      Date.now(),
  };
}

export function addExecutionMemory(
  input:
    CreateExecutionMemoryInput
): ExecutionMemoryRecord {
  const state =
    getExecutionMemoryState();

  const record =
    createExecutionMemoryRecord(
      input
    );

  state.records.push(
    record
  );

  if (
    state.records.length >
    MAX_EXECUTION_MEMORY_RECORDS
  ) {
    state.records.splice(
      0,
      state.records.length -
        MAX_EXECUTION_MEMORY_RECORDS
    );
  }

  return record;
}

export async function addAndSaveExecutionMemory(
  input:
    CreateExecutionMemoryInput
): Promise<ExecutionMemoryRecord> {
  await hydrateExecutionMemory();

  const record =
    addExecutionMemory(
      input
    );

  await persistExecutionMemory();

  return record;
}

export function getExecutionMemory():
  ExecutionMemoryRecord[] {
  const state =
    getExecutionMemoryState();

  return [
    ...state.records,
  ];
}

export async function getPersistentExecutionMemory():
  Promise<ExecutionMemoryRecord[]> {
  await hydrateExecutionMemory();

  return getExecutionMemory();
}

export function queryExecutionMemory(
  query:
    ExecutionMemoryQuery = {}
): ExecutionMemoryRecord[] {
  const safeLimit =
    Math.max(
      1,
      Math.min(
        MAX_EXECUTION_MEMORY_RECORDS,
        Math.floor(
          query.limit ??
            DEFAULT_QUERY_LIMIT
        )
      )
    );

  return getExecutionMemory()
    .filter((record) => {
      if (
        query.outcomeId &&
        record.outcomeId !==
          query.outcomeId
      ) {
        return false;
      }

      if (
        query.milestoneId &&
        record.milestoneId !==
          query.milestoneId
      ) {
        return false;
      }

      if (
        query.taskId &&
        record.taskId !==
          query.taskId
      ) {
        return false;
      }

      if (
        query.eventType &&
        record.eventType !==
          query.eventType
      ) {
        return false;
      }

      if (
        query.source &&
        record.source !==
          query.source
      ) {
        return false;
      }

      if (
        typeof query.success ===
          "boolean" &&
        record.success !==
          query.success
      ) {
        return false;
      }

      if (
        typeof query.from ===
          "number" &&
        record.createdAt <
          query.from
      ) {
        return false;
      }

      if (
        typeof query.to ===
          "number" &&
        record.createdAt >
          query.to
      ) {
        return false;
      }

      return true;
    })
    .slice(
      -safeLimit
    )
    .reverse();
}

export async function queryPersistentExecutionMemory(
  query:
    ExecutionMemoryQuery = {}
): Promise<
  ExecutionMemoryRecord[]
> {
  await hydrateExecutionMemory();

  return queryExecutionMemory(
    query
  );
}

export function getRecentExecutionMemory(
  limit = 20
): ExecutionMemoryRecord[] {
  return queryExecutionMemory({
    limit,
  });
}

export async function getPersistentRecentExecutionMemory(
  limit = 20
): Promise<
  ExecutionMemoryRecord[]
> {
  await hydrateExecutionMemory();

  return getRecentExecutionMemory(
    limit
  );
}

export function summarizeExecutionMemory(
  records =
    getExecutionMemory()
): ExecutionMemorySummary {
  const now =
    Date.now();

  const startOfToday =
    new Date(
      new Date(
        now
      ).setHours(
        0,
        0,
        0,
        0
      )
    ).getTime();

  const startOfWeek =
    now -
    7 *
      24 *
      60 *
      60 *
      1000;

  const successful =
    records.filter(
      (record) =>
        record.success
    ).length;

  const failed =
    records.length -
    successful;

  const latencyValues =
    records
      .map(
        (record) =>
          record.metrics
            .latencyMs
      )
      .filter(
        (
          value
        ): value is number =>
          typeof value ===
            "number"
      );

  const averageLatencyMs =
    latencyValues.length > 0
      ? Math.round(
          latencyValues.reduce(
            (
              total,
              value
            ) =>
              total +
              value,
            0
          ) /
            latencyValues.length
        )
      : null;

  return {
    total:
      records.length,

    successful,

    failed,

    successRate:
      records.length > 0
        ? Math.round(
            (
              successful /
              records.length
            ) *
              100
          )
        : 0,

    completedTasks:
      records.filter(
        (record) =>
          record.eventType ===
          "task-completed"
      ).length,

    completedMilestones:
      records.filter(
        (record) =>
          record.eventType ===
          "milestone-completed"
      ).length,

    completedOutcomes:
      records.filter(
        (record) =>
          record.eventType ===
          "outcome-completed"
      ).length,

    averageLatencyMs,

    todayCount:
      records.filter(
        (record) =>
          record.createdAt >=
          startOfToday
      ).length,

    weekCount:
      records.filter(
        (record) =>
          record.createdAt >=
          startOfWeek
      ).length,

    latestAt:
      records.length > 0
        ? Math.max(
            ...records.map(
              (record) =>
                record.createdAt
            )
          )
        : null,
  };
}

export async function getPersistentExecutionMemorySummary():
  Promise<ExecutionMemorySummary> {
  const records =
    await getPersistentExecutionMemory();

  return summarizeExecutionMemory(
    records
  );
}

export function buildExecutionLearningContext(
  outcomeId?: string,
  limit = 20
): string {
  const records =
    queryExecutionMemory({
      outcomeId,
      limit,
    });

  if (
    records.length === 0
  ) {
    return "";
  }

  const summary =
    summarizeExecutionMemory(
      records
    );

  const lines = [
    "AIOS Execution Memory:",
    `- Records: ${summary.total}`,
    `- Success rate: ${summary.successRate}%`,
    `- Completed tasks: ${summary.completedTasks}`,
    `- Completed milestones: ${summary.completedMilestones}`,
    `- Completed outcomes: ${summary.completedOutcomes}`,
  ];

  if (
    summary.averageLatencyMs !==
    null
  ) {
    lines.push(
      `- Average latency: ${summary.averageLatencyMs}ms`
    );
  }

  lines.push(
    "",
    "Recent execution events:"
  );

  records
    .slice(
      0,
      10
    )
    .forEach(
      (record) => {
        const details = [
          record.eventType,
          record.title,
        ];

        if (
          record.metrics
            .progressDelta !==
          null
        ) {
          details.push(
            `progress ${record.metrics.progressDelta >= 0 ? "+" : ""}${record.metrics.progressDelta}%`
          );
        }

        if (
          record.task?.title
        ) {
          details.push(
            `task: ${record.task.title}`
          );
        }

        if (
          record.milestone
            ?.title
        ) {
          details.push(
            `milestone: ${record.milestone.title}`
          );
        }

        lines.push(
          `- ${details.join(" | ")}`
        );
      }
    );

  return lines.join(
    "\n"
  );
}

export async function buildPersistentExecutionLearningContext(
  outcomeId?: string,
  limit = 20
): Promise<string> {
  await hydrateExecutionMemory();

  return buildExecutionLearningContext(
    outcomeId,
    limit
  );
}

export function clearExecutionMemory():
  void {
  const state =
    getExecutionMemoryState();

  state.records.length =
    0;

  state.sequence =
    0;
}

export async function clearPersistentExecutionMemory():
  Promise<void> {
  const state =
    getExecutionMemoryState();

  clearExecutionMemory();

  state.hydrated =
    true;

  await storage.delete(
    getExecutionMemoryStorageKey()
  );
}

export function formatExecutionMemoryTitle(
  eventType:
    ExecutionMemoryEventType
): string {
  switch (eventType) {
    case "planner-inspected":
      return "Planner inspected execution state";

    case "task-started":
      return "Task started";

    case "task-completed":
      return "Task completed";

    case "milestone-activated":
      return "Milestone activated";

    case "milestone-completed":
      return "Milestone completed";

    case "outcome-progressed":
      return "Outcome progress updated";

    case "outcome-completed":
      return "Outcome completed";

    case "execution-synced":
      return "Execution state synchronized";

    case "execution-failed":
      return "Execution failed";
  }
}

export function getExecutionMemoryKey():
  string {
  return getExecutionMemoryStorageKey();
}