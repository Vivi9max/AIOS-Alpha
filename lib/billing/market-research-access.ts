import {
  getEntitlement,
} from "@/lib/billing/entitlements";

import type {
  AIOSPlanId,
} from "@/lib/billing/plans";

import {
  checkMarketResearchUsage,
  type MarketResearchUsageCheck,
} from "@/lib/billing/usage";

export type MarketResearchAccessCode =
  | "allowed"
  | "capability_not_in_plan"
  | "monthly_limit_reached";

export interface MarketResearchAccessRequest {
  planId: AIOSPlanId;
  reportsThisMonth?: number;
}

export interface MarketResearchAccessResult {
  allowed: boolean;
  planId: AIOSPlanId;
  capability: "market-research";
  code: MarketResearchAccessCode;
  reason: string;
  usage: MarketResearchUsageCheck;
  limit: number | null;
  remaining: number | null;
}

function normalizeUsage(
  value: number | undefined,
): number {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(
      value,
    ),
  );
}

export function checkMarketResearchAccess(
  request: MarketResearchAccessRequest,
): MarketResearchAccessResult {
  const entitlement =
    getEntitlement(
      request.planId,
    );

  const hasCapability =
    entitlement.capabilities.includes(
      "market-research",
    );

  const usage =
    checkMarketResearchUsage(
      request.planId,
      normalizeUsage(
        request.reportsThisMonth,
      ),
    );

  if (
    !hasCapability
  ) {
    return {
      allowed: false,

      planId:
        request.planId,

      capability:
        "market-research",

      code:
        "capability_not_in_plan",

      reason:
        "The current AIOS plan does not include market research.",

      usage,

      limit:
        usage.limit,

      remaining:
        usage.remaining,
    };
  }

  if (
    !usage.allowed
  ) {
    return {
      allowed: false,

      planId:
        request.planId,

      capability:
        "market-research",

      code:
        "monthly_limit_reached",

      reason:
        "The monthly market research report limit has been reached.",

      usage,

      limit:
        usage.limit,

      remaining:
        usage.remaining,
    };
  }

  return {
    allowed: true,

    planId:
      request.planId,

    capability:
      "market-research",

    code:
      "allowed",

    reason:
      "Market research access is available.",

    usage,

    limit:
      usage.limit,

    remaining:
      usage.remaining,
  };
}

export function isMarketResearchAccessAllowed(
  request: MarketResearchAccessRequest,
): boolean {
  return checkMarketResearchAccess(
    request,
  ).allowed;
}
