import {
  getPlanLimit,
} from "@/lib/billing/entitlements";

export type AIOSUsageType =
  | "execution"
  | "memory"
  | "automation"
  | "market-research";

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

export interface MarketResearchUsage {
  reportsThisMonth: number;
}

export interface MarketResearchUsageCheck
  extends UsageCheckResult {
  type: "market-research";
  period: "month";
}

function normalizeCurrentUsage(
  current: number,
): number {
  if (
    !Number.isFinite(
      current,
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(
      current,
    ),
  );
}

function getLimit(
  planId: string,
  type: AIOSUsageType,
): number | null {
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

  if (
    type ===
    "automation"
  ) {
    return getPlanLimit(
      planId,
      "automationJobs",
    );
  }

  return getPlanLimit(
    planId,
    "marketResearchReportsPerMonth",
  );
}

export function checkUsageLimit(
  planId: string,
  type: AIOSUsageType,
  current: number,
): UsageCheckResult {
  const normalizedCurrent =
    normalizeCurrentUsage(
      current,
    );

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
      current:
        normalizedCurrent,
      limit: null,
      remaining: null,
      reason:
        "unlimited",
    };
  }

  const remaining =
    Math.max(
      0,
      limit -
        normalizedCurrent,
    );

  if (
    normalizedCurrent >=
    limit
  ) {
    return {
      allowed: false,
      type,
      planId,
      current:
        normalizedCurrent,
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
    current:
      normalizedCurrent,
    limit,
    remaining,
    reason:
      "allowed",
  };
}

export function checkMarketResearchUsage(
  planId: string,
  reportsThisMonth: number,
): MarketResearchUsageCheck {
  const result =
    checkUsageLimit(
      planId,
      "market-research",
      reportsThisMonth,
    );

  return {
    ...result,
    type:
      "market-research",
    period:
      "month",
  };
}

export function getMarketResearchUsageSnapshot(
  planId: string,
  usage?: MarketResearchUsage,
): MarketResearchUsageCheck {
  return checkMarketResearchUsage(
    planId,
    usage?.reportsThisMonth ??
      0,
  );
}

export function getUsageSnapshot(
  planId: string,
  usage?: {
    executionsToday?: number;
    memoryItems?: number;
    automationJobs?: number;
    marketResearchReportsThisMonth?: number;
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

  const marketResearchReportsThisMonth =
    usage?.marketResearchReportsThisMonth ??
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

    marketResearch:
      getMarketResearchUsageSnapshot(
        planId,
        {
          reportsThisMonth:
            marketResearchReportsThisMonth,
        },
      ),
  };
}
