import type {
  PlannerSnapshot,
} from "@/lib/planner/types";

export interface PlannerApiResponse {
  success: boolean;
  planner: PlannerSnapshot | null;
  error?: string;
  timestamp: number;
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

export async function fetchPlannerSnapshot(
  options: PlannerClientOptions = {}
): Promise<PlannerSnapshot> {
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

  return result.planner;
}

export const plannerClient = {
  getSnapshot:
    fetchPlannerSnapshot,
};