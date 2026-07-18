import type {
  AIProvider,
} from "@/lib/ai/types";

import type {
  CapabilityTrace,
} from "./capability-router";

import type {
  PlannerIntent,
  RuntimePlanType,
} from "./planner";

export interface RuntimeExecutionTrace {
  requestId: string;

  planId?: string;

  promptPreview: string;

  goal?: string;

  intent?: PlannerIntent;

  planType?: RuntimePlanType;

  provider: AIProvider;

  success: boolean;

  fallbackUsed: boolean;

  latencyMs: number;

  capabilityTrace: CapabilityTrace[];

  error?: string;

  startedAt: number;

  completedAt: number;
}

let lastRuntimeTrace:
  RuntimeExecutionTrace | null =
    null;

export function saveRuntimeTrace(
  trace: RuntimeExecutionTrace
): void {
  lastRuntimeTrace = {
    ...trace,

    capabilityTrace:
      trace.capabilityTrace.map(
        (item) => ({
          ...item,
        })
      ),
  };
}

export function getLastRuntimeTrace():
  RuntimeExecutionTrace | null {
  if (!lastRuntimeTrace) {
    return null;
  }

  return {
    ...lastRuntimeTrace,

    capabilityTrace:
      lastRuntimeTrace.capabilityTrace.map(
        (item) => ({
          ...item,
        })
      ),
  };
}