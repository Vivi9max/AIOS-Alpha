import {
  ExecutionSession,
  ExecutionStep,
} from "./execution";

import {
  buildExecutionTimeline,
  ExecutionTimelineItem,
  getExecutionEventSummary,
} from "./events";

import {
  createExecutionQueue,
  ExecutionQueue,
} from "./queue";

export interface RuntimeTrace {
  sessionId: string;

  status: string;

  progress: number;

  startedAt: number;

  updatedAt: number;

  durationMs: number;

  queue: ExecutionQueue;

  timeline: ExecutionTimelineItem[];

  summary: ReturnType<
    typeof getExecutionEventSummary
  >;

  currentStep:
    | ExecutionStep
    | null;

  nextStep:
    | ExecutionStep
    | null;
}

export function buildRuntimeTrace(
  session: ExecutionSession
): RuntimeTrace {
  const queue =
    createExecutionQueue(
      session
    );

  const timeline =
    buildExecutionTimeline(
      session
    );

  const summary =
    getExecutionEventSummary(
      session
    );

  const currentStep =
    session.steps.find(
      (step) =>
        step.status ===
        "running"
    ) ??
    null;

  const nextStep =
    session.steps.find(
      (step) =>
        step.status ===
        "waiting"
    ) ??
    null;

  return {
    sessionId:
      session.id,

    status:
      session.status,

    progress:
      session.progress,

    startedAt:
      session.startedAt,

    updatedAt:
      session.updatedAt,

    durationMs:
      Math.max(
        0,
        session.updatedAt -
          session.startedAt
      ),

    queue,

    timeline,

    summary,

    currentStep,

    nextStep,
  };
}

export function traceProgressLabel(
  progress: number
): string {
  if (
    progress >= 100
  )
    return "Completed";

  if (
    progress >= 75
  )
    return "Finishing";

  if (
    progress >= 40
  )
    return "Executing";

  if (
    progress > 0
  )
    return "Preparing";

  return "Waiting";
}

export function traceStatusColor(
  status: string
): string {
  switch (status) {
    case "completed":
      return "#22c55e";

    case "running":
      return "#2563eb";

    case "failed":
      return "#ef4444";

    case "cancelled":
      return "#94a3b8";

    default:
      return "#64748b";
  }
}

export function traceStepProgress(
  session: ExecutionSession
): {
  completed: number;

  total: number;
} {
  const completed =
    session.steps.filter(
      (step) =>
        step.status ===
          "completed" ||
        step.status ===
          "skipped"
    ).length;

  return {
    completed,

    total:
      session.steps.length,
  };
}