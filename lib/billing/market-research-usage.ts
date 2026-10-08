import {
  storage,
} from "@/lib/server-storage";

import {
  createUserStorageKey,
} from "@/lib/storage/data-scope";

import {
  getEntitlement,
} from "@/lib/billing/entitlements";

import {
  checkMarketResearchUsage,
  type MarketResearchUsageCheck,
} from "@/lib/billing/usage";

import type {
  AIOSPlanId,
} from "@/lib/billing/plans";

const USAGE_RESOURCE =
  "market-research-usage";

interface MarketResearchUsageRecord {
  month: string;
  count: number;
  updatedAt: number;
}

export interface MarketResearchUsageSnapshot {
  planId: AIOSPlanId;
  month: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  allowed: boolean;
  capability: "market-research";
}

function getStorageKey(): string {
  return createUserStorageKey(
    USAGE_RESOURCE,
  );
}

function getCurrentMonthKey(): string {
  const now =
    new Date();

  const year =
    now.getUTCFullYear();

  const month =
    String(
      now.getUTCMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}`;
}

function createEmptyRecord():
  MarketResearchUsageRecord {
  return {
    month:
      getCurrentMonthKey(),

    count:
      0,

    updatedAt:
      Date.now(),
  };
}

function normalizeCount(
  value: number,
): number {
  if (
    !Number.isFinite(
      value,
    )
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

async function readUsage():
  Promise<MarketResearchUsageRecord> {
  const stored =
    await storage.get<
      MarketResearchUsageRecord
    >(
      getStorageKey(),
    );

  if (
    !stored ||
    typeof stored !==
      "object"
  ) {
    return createEmptyRecord();
  }

  if (
    typeof stored.month !==
      "string" ||
    typeof stored.count !==
      "number"
  ) {
    return createEmptyRecord();
  }

  const currentMonth =
    getCurrentMonthKey();

  if (
    stored.month !==
    currentMonth
  ) {
    return createEmptyRecord();
  }

  return {
    month:
      currentMonth,

    count:
      normalizeCount(
        stored.count,
      ),

    updatedAt:
      typeof stored.updatedAt ===
      "number"
        ? stored.updatedAt
        : Date.now(),
  };
}

async function writeUsage(
  record:
    MarketResearchUsageRecord,
): Promise<void> {
  await storage.set(
    getStorageKey(),
    record,
  );
}

function resolvePlanId(
  planId?: string,
): AIOSPlanId {
  if (
    planId ===
      "alpha" ||
    planId ===
      "free" ||
    planId ===
      "pro" ||
    planId ===
      "business"
  ) {
    return planId;
  }

  return "alpha";
}

function buildSnapshot(
  planId:
    AIOSPlanId,
  usage:
    MarketResearchUsageRecord,
): MarketResearchUsageSnapshot {
  const entitlement =
    getEntitlement(
      planId,
    );

  const check =
    checkMarketResearchUsage(
      planId,
      usage.count,
    );

  return {
    planId,

    month:
      usage.month,

    used:
      usage.count,

    limit:
      check.limit,

    remaining:
      check.remaining,

    allowed:
      entitlement.capabilities.includes(
        "market-research",
      ) &&
      check.allowed,

    capability:
      "market-research",
  };
}

export async function getMarketResearchUsage(
  planId?: string,
): Promise<MarketResearchUsageSnapshot> {
  const resolvedPlanId =
    resolvePlanId(
      planId,
    );

  const usage =
    await readUsage();

  return buildSnapshot(
    resolvedPlanId,
    usage,
  );
}

export async function reserveMarketResearchReport(
  planId?: string,
): Promise<MarketResearchUsageSnapshot> {
  const resolvedPlanId =
    resolvePlanId(
      planId,
    );

  const entitlement =
    getEntitlement(
      resolvedPlanId,
    );

  const usage =
    await readUsage();

  if (
    !entitlement.capabilities.includes(
      "market-research",
    )
  ) {
    return buildSnapshot(
      resolvedPlanId,
      usage,
    );
  }

  const limit =
    entitlement.limits
      .marketResearchReportsPerMonth;

  if (
    limit !== null &&
    usage.count >=
      limit
  ) {
    return buildSnapshot(
      resolvedPlanId,
      usage,
    );
  }

  const updated:
    MarketResearchUsageRecord =
    {
      month:
        usage.month,

      count:
        usage.count + 1,

      updatedAt:
        Date.now(),
    };

  await writeUsage(
    updated,
  );

  return buildSnapshot(
    resolvedPlanId,
    updated,
  );
}

export async function getMarketResearchUsageCheck(
  planId?: string,
): Promise<MarketResearchUsageCheck> {
  const resolvedPlanId =
    resolvePlanId(
      planId,
    );

  const usage =
    await readUsage();

  return checkMarketResearchUsage(
    resolvedPlanId,
    usage.count,
  );
}

export function getMarketResearchUsageStorageKey():
  string {
  return getStorageKey();
}
