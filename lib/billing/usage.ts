import {
  getPlanLimit,
} from "@/lib/billing/entitlements";

export type AIOSUsageType =
  | "execution"
  | "memory"
  | "automation";

export interface UsageCheckResult {
  allowed: boolean;
  type: AIOSUsageType;
  planId: string;
  current: number;
  limit: number | null;
  remaining: number | null;
  reason:
    | "allowed"
    | "limit_reached"
    | "unlimited";
}

function getLimit(
  planId: string,
  type: AIOSUsageType,
) {
  if (
    type ===
    "execution"
  ) {
    return getPlanLimit(
      planId,
      "executionsPerDay",
    );
  }

  if (
    type ===
    "memory"
  ) {
    return getPlanLimit(
      planId,
      "memoryItems",
    );
  }

  return getPlanLimit(
    planId,
    "automationJobs",
  );
}

export function checkUsageLimit(
  planId: string,
  type: AIOSUsageType,
  current: number,
): UsageCheckResult {
  const limit =
    getLimit(
      planId,
      type,
    );

  if (
    limit ===
    null
  ) {
    return {
      allowed: true,
      type,
      planId,
      current,
      limit: null,
      remaining: null,
      reason:
        "unlimited",
    };
  }

  const remaining =
    Math.max(
      0,
      limit - current,
    );

  if (
    current >=
    limit
  ) {
    return {
      allowed: false,
      type,
      planId,
      current,
      limit,
      remaining: 0,
      reason:
        "limit_reached",
    };
  }

  return {
    allowed: true,
    type,
    planId,
    current,
    limit,
    remaining,
    reason:
      "allowed",
  };
}

export function getUsageSnapshot(
  planId: string,
  usage?: {
    executionsToday?: number;
    memoryItems?: number;
    automationJobs?: number;
  },
) {
  const executionsToday =
    usage?.executionsToday ??
    0;

  const memoryItems =
    usage?.memoryItems ??
    0;

  const automationJobs =
    usage?.automationJobs ??
    0;

  return {
    execution:
      checkUsageLimit(
        planId,
        "execution",
        executionsToday,
      ),

    memory:
      checkUsageLimit(
        planId,
        "memory",
        memoryItems,
      ),

    automation:
      checkUsageLimit(
        planId,
        "automation",
        automationJobs,
      ),
  };
}
