import type {
  PlannerLearningSnapshot,
} from "@/lib/planner/learning";

import type {
  PlannerSnapshot,
} from "@/lib/planner/types";

export interface PlannerApiResponse {
  success: boolean;
  planner: PlannerSnapshot | null;
  learning?: PlannerLearningSnapshot | null;
  taskCount?: number;
  generatedAt?: number;
  error?: string;
  timestamp: number;
}

export interface PlannerRuntimeSnapshot {
  planner: PlannerSnapshot;
  learning: PlannerLearningSnapshot | null;
  taskCount: number;
  generatedAt: number;
}

export interface PlannerClientOptions {
  signal?: AbortSignal;
  cache?: RequestCache;
}

export class PlannerClientError extends Error {
  status: number;

  constructor(
    message: string,
    status = 500
  ) {
    super(message);

    this.name =
      "PlannerClientError";

    this.status =
      status;
  }
}

function normalizeErrorMessage(
  value: unknown
): string {
  if (
    typeof value === "string" &&
    value.trim()
  ) {
    return value.trim();
  }

  return "Planner request failed.";
}

function safeCount(
  value: unknown,
  fallback: number
): number {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
    ? Math.floor(value)
    : fallback;
}

function safeTimestamp(
  value: unknown,
  fallback: number
): number {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
    ? value
    : fallback;
}

async function requestPlannerSnapshot(
  options: PlannerClientOptions
): Promise<PlannerApiResponse> {
  const response =
    await fetch(
      "/api/planner/snapshot",
      {
        method: "GET",

        headers: {
          Accept:
            "application/json",
        },

        cache:
          options.cache ??
          "no-store",

        signal:
          options.signal,
      }
    );

  let result:
    | PlannerApiResponse
    | null = null;

  try {
    result =
      (await response.json()) as
        PlannerApiResponse;
  } catch {
    throw new PlannerClientError(
      "Planner returned an invalid response.",
      response.status
    );
  }

  if (
    !response.ok ||
    !result.success ||
    !result.planner
  ) {
    throw new PlannerClientError(
      normalizeErrorMessage(
        result.error
      ),
      response.status
    );
  }

  return result;
}

export async function fetchPlannerRuntimeSnapshot(
  options: PlannerClientOptions = {}
): Promise<PlannerRuntimeSnapshot> {
  const result =
    await requestPlannerSnapshot(
      options
    );

  const planner =
    result.planner as PlannerSnapshot;

  return {
    planner,

    learning:
      result.learning ??
      null,

    taskCount:
      safeCount(
        result.taskCount,
        planner.progress.total
      ),

    generatedAt:
      safeTimestamp(
        result.generatedAt,
        planner.generatedAt
      ),
  };
}

export async function fetchPlannerSnapshot(
  options: PlannerClientOptions = {}
): Promise<PlannerSnapshot> {
  const runtimeSnapshot =
    await fetchPlannerRuntimeSnapshot(
      options
    );

  return runtimeSnapshot.planner;
}

export const plannerClient = {
  getSnapshot:
    fetchPlannerSnapshot,

  getRuntimeSnapshot:
    fetchPlannerRuntimeSnapshot,
};
