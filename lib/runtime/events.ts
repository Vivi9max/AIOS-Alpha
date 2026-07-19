import {
  appendExecutionEvent,
  type ExecutionEvent,
  type ExecutionEventType,
  type ExecutionSession,
  type ExecutionStatus,
} from "./execution";

export interface ExecutionEventInput {
  type: ExecutionEventType;
  message: string;
  status?: ExecutionStatus;
  stepId?: string | null;
  capability?: string | null;
  metadata?: Record<
    string,
    unknown
  >;
}

export interface ExecutionEventFilter {
  type?: ExecutionEventType;
  status?: ExecutionStatus;
  capability?: string;
  stepId?: string;
  from?: number;
  to?: number;
  limit?: number;
}

export interface ExecutionEventSummary {
  total: number;
  started: number;
  completed: number;
  failed: number;
  taskEvents: number;
  runtimeEvents: number;
  memoryEvents: number;
  storageEvents: number;
  firstEvent:
    | ExecutionEvent
    | null;
  latestEvent:
    | ExecutionEvent
    | null;
}

export interface ExecutionTimelineItem {
  id: string;
  sessionId: string;
  timestamp: number;
  timeLabel: string;
  title: string;
  message: string;
  capability: string | null;
  status: ExecutionStatus;
  type: ExecutionEventType;
  stepId: string | null;
  tone:
    | "neutral"
    | "running"
    | "success"
    | "danger";
  icon: string;
  metadata: Record<
    string,
    unknown
  >;
}

const DEFAULT_EVENT_LIMIT = 100;
const MAX_EVENT_LIMIT = 500;

export function addExecutionEvent(
  session: ExecutionSession,
  input: ExecutionEventInput
): ExecutionSession {
  return appendExecutionEvent(
    session,
    {
      type:
        input.type,

      message:
        input.message,

      status:
        input.status,

      stepId:
        input.stepId,

      capability:
        input.capability,

      metadata:
        input.metadata,
    }
  );
}

export function addStatusChangeEvent(
  session: ExecutionSession,
  input: {
    from: ExecutionStatus;
    to: ExecutionStatus;
    message?: string;
    capability?: string | null;
    stepId?: string | null;
  }
): ExecutionSession {
  return addExecutionEvent(
    session,
    {
      type:
        "status_changed",

      status:
        input.to,

      capability:
        input.capability ??
        null,

      stepId:
        input.stepId ??
        null,

      message:
        input.message ??
        `Execution status changed from ${input.from} to ${input.to}.`,

      metadata: {
        from:
          input.from,

        to:
          input.to,
      },
    }
  );
}

export function addTaskCreationEvent(
  session: ExecutionSession,
  input: {
    createdCount: number;
    reusedCount?: number;
    taskIds?: string[];
    message?: string;
  }
): ExecutionSession {
  const reusedCount =
    input.reusedCount ??
    0;

  return addExecutionEvent(
    session,
    {
      type:
        "tasks_created",

      status:
        session.status,

      capability:
        "Tasks",

      stepId:
        findStepIdByCapability(
          session,
          "Tasks"
        ),

      message:
        input.message ??
        `Created ${input.createdCount} task(s) and reused ${reusedCount} task(s).`,

      metadata: {
        createdCount:
          input.createdCount,

        reusedCount,

        taskIds:
          input.taskIds ??
          [],
      },
    }
  );
}

export function addRuntimeCompletionEvent(
  session: ExecutionSession,
  input: {
    requestId?: string | null;
    provider?: string | null;
    latencyMs?: number;
    fallbackUsed?: boolean;
    success?: boolean;
    message?: string;
  }
): ExecutionSession {
  const success =
    input.success ??
    true;

  return addExecutionEvent(
    session,
    {
      type:
        "runtime_completed",

      status:
        success
          ? session.status
          : "failed",

      capability:
        "Runtime",

      stepId:
        findStepIdByCapability(
          session,
          "Runtime"
        ),

      message:
        input.message ??
        (
          success
            ? "Runtime execution completed."
            : "Runtime execution failed."
        ),

      metadata: {
        requestId:
          input.requestId ??
          null,

        provider:
          input.provider ??
          null,

        latencyMs:
          input.latencyMs ??
          0,

        fallbackUsed:
          input.fallbackUsed ??
          false,

        success,
      },
    }
  );
}

export function addMemoryUpdateEvent(
  session: ExecutionSession,
  input?: {
    updated?: boolean;
    memoryId?: string | null;
    message?: string;
    metadata?: Record<
      string,
      unknown
    >;
  }
): ExecutionSession {
  const updated =
    input?.updated ??
    true;

  return addExecutionEvent(
    session,
    {
      type:
        "memory_updated",

      status:
        session.status,

      capability:
        "Memory",

      stepId:
        findStepIdByCapability(
          session,
          "Memory"
        ),

      message:
        input?.message ??
        (
          updated
            ? "Execution memory updated."
            : "Execution memory update skipped."
        ),

      metadata: {
        updated,

        memoryId:
          input?.memoryId ??
          null,

        ...(input?.metadata ??
          {}),
      },
    }
  );
}

export function addStorageSavedEvent(
  session: ExecutionSession,
  input?: {
    saved?: boolean;
    storageKey?: string | null;
    message?: string;
    metadata?: Record<
      string,
      unknown
    >;
  }
): ExecutionSession {
  const saved =
    input?.saved ??
    true;

  return addExecutionEvent(
    session,
    {
      type:
        "storage_saved",

      status:
        session.status,

      capability:
        "Storage",

      stepId:
        findStepIdByCapability(
          session,
          "Storage"
        ),

      message:
        input?.message ??
        (
          saved
            ? "Execution state saved."
            : "Execution state save skipped."
        ),

      metadata: {
        saved,

        storageKey:
          input?.storageKey ??
          null,

        ...(input?.metadata ??
          {}),
      },
    }
  );
}

export function listExecutionEvents(
  session: ExecutionSession,
  filter?: ExecutionEventFilter
): ExecutionEvent[] {
  const limit =
    normalizeEventLimit(
      filter?.limit
    );

  return session.events
    .filter((event) => {
      if (
        filter?.type &&
        event.type !==
          filter.type
      ) {
        return false;
      }

      if (
        filter?.status &&
        event.status !==
          filter.status
      ) {
        return false;
      }

      if (
        filter?.capability &&
        normalizeText(
          event.capability
        ) !==
          normalizeText(
            filter.capability
          )
      ) {
        return false;
      }

      if (
        filter?.stepId &&
        event.stepId !==
          filter.stepId
      ) {
        return false;
      }

      if (
        filter?.from !==
          undefined &&
        event.timestamp <
          filter.from
      ) {
        return false;
      }

      if (
        filter?.to !==
          undefined &&
        event.timestamp >
          filter.to
      ) {
        return false;
      }

      return true;
    })
    .sort(
      (a, b) =>
        a.timestamp -
        b.timestamp
    )
    .slice(
      -limit
    );
}

export function getLatestExecutionEvent(
  session: ExecutionSession
): ExecutionEvent | null {
  if (
    session.events.length ===
    0
  ) {
    return null;
  }

  return session.events.reduce(
    (
      latest,
      event
    ) =>
      event.timestamp >
      latest.timestamp
        ? event
        : latest
  );
}

export function getLatestCapabilityEvent(
  session: ExecutionSession,
  capability: string
): ExecutionEvent | null {
  const normalized =
    normalizeText(
      capability
    );

  const events =
    session.events.filter(
      (event) =>
        normalizeText(
          event.capability
        ) === normalized
    );

  if (
    events.length ===
    0
  ) {
    return null;
  }

  return events.reduce(
    (
      latest,
      event
    ) =>
      event.timestamp >
      latest.timestamp
        ? event
        : latest
  );
}

export function getExecutionEventSummary(
  session: ExecutionSession
): ExecutionEventSummary {
  const events =
    [...session.events].sort(
      (a, b) =>
        a.timestamp -
        b.timestamp
    );

  return {
    total:
      events.length,

    started:
      events.filter(
        (event) =>
          event.type ===
            "session_started" ||
          event.type ===
            "step_started"
      ).length,

    completed:
      events.filter(
        (event) =>
          event.type ===
            "session_completed" ||
          event.type ===
            "step_completed" ||
          event.type ===
            "runtime_completed" ||
          event.type ===
            "tasks_created" ||
          event.type ===
            "memory_updated" ||
          event.type ===
            "storage_saved"
      ).length,

    failed:
      events.filter(
        (event) =>
          event.type ===
            "session_failed" ||
          event.type ===
            "step_failed"
      ).length,

    taskEvents:
      events.filter(
        (event) =>
          normalizeText(
            event.capability
          ) ===
          "tasks"
      ).length,

    runtimeEvents:
      events.filter(
        (event) =>
          normalizeText(
            event.capability
          ) ===
          "runtime"
      ).length,

    memoryEvents:
      events.filter(
        (event) =>
          normalizeText(
            event.capability
          ) ===
          "memory"
      ).length,

    storageEvents:
      events.filter(
        (event) =>
          normalizeText(
            event.capability
          ) ===
          "storage"
      ).length,

    firstEvent:
      events[0] ??
      null,

    latestEvent:
      events[
        events.length - 1
      ] ?? null,
  };
}

export function buildExecutionTimeline(
  session: ExecutionSession,
  filter?: ExecutionEventFilter
): ExecutionTimelineItem[] {
  return listExecutionEvents(
    session,
    filter
  ).map(
    (event) => ({
      id:
        event.id,

      sessionId:
        event.sessionId,

      timestamp:
        event.timestamp,

      timeLabel:
        formatEventTime(
          event.timestamp
        ),

      title:
        getEventTitle(
          event
        ),

      message:
        event.message,

      capability:
        event.capability,

      status:
        event.status,

      type:
        event.type,

      stepId:
        event.stepId,

      tone:
        getEventTone(
          event
        ),

      icon:
        getEventIcon(
          event
        ),

      metadata: {
        ...event.metadata,
      },
    })
  );
}

export function groupExecutionEventsByCapability(
  session: ExecutionSession
): Record<
  string,
  ExecutionEvent[]
> {
  return session.events.reduce<
    Record<
      string,
      ExecutionEvent[]
    >
  >(
    (
      groups,
      event
    ) => {
      const key =
        event.capability?.trim() ||
        "System";

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(
        event
      );

      return groups;
    },
    {}
  );
}

export function groupExecutionEventsByStep(
  session: ExecutionSession
): Record<
  string,
  ExecutionEvent[]
> {
  return session.events.reduce<
    Record<
      string,
      ExecutionEvent[]
    >
  >(
    (
      groups,
      event
    ) => {
      const key =
        event.stepId ??
        "session";

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(
        event
      );

      return groups;
    },
    {}
  );
}

export function trimExecutionEvents(
  session: ExecutionSession,
  limit =
    DEFAULT_EVENT_LIMIT
): ExecutionSession {
  const normalizedLimit =
    normalizeEventLimit(
      limit
    );

  if (
    session.events.length <=
    normalizedLimit
  ) {
    return session;
  }

  return {
    ...session,

    events:
      session.events
        .sort(
          (a, b) =>
            a.timestamp -
            b.timestamp
        )
        .slice(
          -normalizedLimit
        ),

    updatedAt:
      Date.now(),
  };
}

export function sanitizeExecutionEvent(
  event: ExecutionEvent
): ExecutionEvent {
  return {
    ...event,

    message:
      sanitizeText(
        event.message
      ),

    metadata:
      sanitizeMetadata(
        event.metadata
      ),
  };
}

export function sanitizeExecutionEvents(
  events: ExecutionEvent[]
): ExecutionEvent[] {
  return events.map(
    sanitizeExecutionEvent
  );
}

function findStepIdByCapability(
  session: ExecutionSession,
  capability: string
): string | null {
  const normalized =
    normalizeText(
      capability
    );

  return (
    session.steps.find(
      (step) =>
        normalizeText(
          step.capability
        ) === normalized
    )?.id ?? null
  );
}

function getEventTitle(
  event: ExecutionEvent
): string {
  switch (event.type) {
    case "session_started":
      return "Execution Started";

    case "status_changed":
      return "Status Changed";

    case "step_started":
      return "Step Started";

    case "step_completed":
      return "Step Completed";

    case "step_failed":
      return "Step Failed";

    case "tasks_created":
      return "Tasks Created";

    case "runtime_completed":
      return "Runtime Completed";

    case "memory_updated":
      return "Memory Updated";

    case "storage_saved":
      return "Storage Saved";

    case "session_completed":
      return "Execution Completed";

    case "session_failed":
      return "Execution Failed";

    case "session_cancelled":
      return "Execution Cancelled";

    default:
      return "Execution Event";
  }
}

function getEventTone(
  event: ExecutionEvent
): ExecutionTimelineItem["tone"] {
  if (
    event.type ===
      "session_failed" ||
    event.type ===
      "step_failed" ||
    event.status ===
      "failed"
  ) {
    return "danger";
  }

  if (
    event.type ===
      "session_completed" ||
    event.type ===
      "step_completed" ||
    event.type ===
      "tasks_created" ||
    event.type ===
      "runtime_completed" ||
    event.type ===
      "memory_updated" ||
    event.type ===
      "storage_saved" ||
    event.status ===
      "completed"
  ) {
    return "success";
  }

  if (
    event.type ===
      "step_started" ||
    event.type ===
      "session_started" ||
    [
      "planning",
      "routing",
      "creating_tasks",
      "executing",
      "updating_memory",
      "saving",
    ].includes(
      event.status
    )
  ) {
    return "running";
  }

  return "neutral";
}

function getEventIcon(
  event: ExecutionEvent
): string {
  switch (event.type) {
    case "session_started":
      return "▶️";

    case "status_changed":
      return "🔄";

    case "step_started":
      return "⏳";

    case "step_completed":
      return "✅";

    case "step_failed":
      return "❌";

    case "tasks_created":
      return "📋";

    case "runtime_completed":
      return "⚡";

    case "memory_updated":
      return "🗃️";

    case "storage_saved":
      return "💾";

    case "session_completed":
      return "🏁";

    case "session_failed":
      return "🚨";

    case "session_cancelled":
      return "⛔";

    default:
      return "•";
  }
}

function formatEventTime(
  timestamp: number
): string {
  const date =
    new Date(timestamp);

  return date.toLocaleTimeString(
    "zh-CN",
    {
      hour:
        "2-digit",

      minute:
        "2-digit",

      second:
        "2-digit",

      hour12:
        false,
    }
  );
}

function normalizeText(
  value:
    | string
    | null
    | undefined
): string {
  return (
    value ??
    ""
  )
    .trim()
    .toLowerCase();
}

function normalizeEventLimit(
  value?: number
): number {
  if (
    value === undefined ||
    !Number.isFinite(
      value
    )
  ) {
    return DEFAULT_EVENT_LIMIT;
  }

  return Math.max(
    1,
    Math.min(
      Math.floor(value),
      MAX_EVENT_LIMIT
    )
  );
}

function sanitizeText(
  value: string
): string {
  return value
    .replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
      "[email]"
    )
    .replace(
      /\b(?:\+?\d[\d\s\-()]{7,}\d)\b/g,
      "[phone]"
    )
    .replace(
      /\bsk-[A-Za-z0-9_-]{12,}\b/g,
      "[api-key]"
    )
    .replace(
      /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
      "[github-token]"
    );
}

function sanitizeMetadata(
  metadata: Record<
    string,
    unknown
  >
): Record<
  string,
  unknown
> {
  const sensitiveKeys =
    new Set([
      "token",
      "apiKey",
      "api_key",
      "authorization",
      "password",
      "secret",
      "email",
      "phone",
    ]);

  return Object.entries(
    metadata
  ).reduce<
    Record<
      string,
      unknown
    >
  >(
    (
      result,
      [
        key,
        value,
      ]
    ) => {
      if (
        sensitiveKeys.has(
          key
        )
      ) {
        result[key] =
          "[redacted]";

        return result;
      }

      if (
        typeof value ===
        "string"
      ) {
        result[key] =
          sanitizeText(
            value
          );

        return result;
      }

      result[key] =
        value;

      return result;
    },
    {}
  );
}