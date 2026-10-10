import {
  getNamespacedStorageKey,
  storage,
} from "@/lib/server-storage";
import {
  reserveExecutionUsageAtomic,
} from "@/lib/server-storage/redis";
import {
  createUserStorageKey,
} from "@/lib/storage/data-scope";
import {
  getEntitlement,
  type AIOSCapability,
} from "@/lib/billing/entitlements";
import type {
  AIOSPlanId,
} from "@/lib/billing/plans";
const USAGE_RESOURCE =
  "execution-usage";
interface ExecutionUsageRecord {
  date: string;
  count: number;
  updatedAt: number;
}
export interface ExecutionUsageSnapshot {
  planId: AIOSPlanId;
  date: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  allowed: boolean;
  capability: AIOSCapability;
}
function getStorageKey(): string {
  return createUserStorageKey(
    USAGE_RESOURCE,
  );
}
function getTodayKey(): string {
  const now = new Date();
  const year =
    now.getUTCFullYear();
  const month = String(
    now.getUTCMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    now.getUTCDate(),
  ).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function createEmptyRecord(): ExecutionUsageRecord {
  return {
    date: getTodayKey(),
    count: 0,
    updatedAt: Date.now(),
  };
}
async function readUsage(): Promise<ExecutionUsageRecord> {
  const stored =
    await storage.get<ExecutionUsageRecord>(
      getStorageKey(),
    );
  if (
    !stored ||
    typeof stored !== "object"
  ) {
    return createEmptyRecord();
  }
  if (
    typeof stored.date !== "string" ||
    typeof stored.count !== "number"
  ) {
    return createEmptyRecord();
  }
  const today =
    getTodayKey();
  if (
    stored.date !== today
  ) {
    return createEmptyRecord();
  }
  return {
    date: today,
    count: Math.max(
      0,
      Math.floor(
        stored.count,
      ),
    ),
    updatedAt:
      typeof stored.updatedAt === "number"
        ? stored.updatedAt
        : Date.now(),
  };
}
async function writeUsage(
  record: ExecutionUsageRecord,
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
    planId === "alpha" ||
    planId === "free" ||
    planId === "pro" ||
    planId === "business"
  ) {
    return planId;
  }
  return "alpha";
}
function createUsageSnapshot(
  planId: AIOSPlanId,
  usage: ExecutionUsageRecord,
  limit: number | null,
  allowed: boolean,
): ExecutionUsageSnapshot {
  return {
    planId,
    date: usage.date,
    used: usage.count,
    limit,
    remaining: limit === null
      ? null
      : Math.max(0, limit - usage.count),
    allowed,
    capability: "execution",
  };
}
export async function getExecutionUsage(
  planId?: string,
): Promise<ExecutionUsageSnapshot> {
  const resolvedPlanId =
    resolvePlanId(planId);
  const entitlement =
    getEntitlement(
      resolvedPlanId,
    );
  const usage =
    await readUsage();
  const limit =
    entitlement.limits.executionsPerDay;
  const allowed =
    entitlement.capabilities.includes("execution") &&
    (
      limit === null ||
      usage.count < limit
    );
  return createUsageSnapshot(
    resolvedPlanId,
    usage,
    limit,
    allowed,
  );
}
export async function reserveExecution(
  planId?: string,
): Promise<ExecutionUsageSnapshot> {
  const resolvedPlanId =
    resolvePlanId(planId);
  const entitlement =
    getEntitlement(
      resolvedPlanId,
    );
  const limit =
    entitlement.limits.executionsPerDay;
  if (
    !entitlement.capabilities.includes(
      "execution",
    )
  ) {
    const usage =
      await readUsage();
    return createUsageSnapshot(
      resolvedPlanId,
      usage,
      limit,
      false,
    );
  }
  if (
    storage.mode === "redis"
  ) {
    const date =
      getTodayKey();
    const now =
      Date.now();
    const atomic =
      await reserveExecutionUsageAtomic(
        getNamespacedStorageKey(
          getStorageKey(),
        ),
        date,
        limit,
        now,
      );
    const usage: ExecutionUsageRecord = {
      date: atomic.date,
      count: atomic.count,
      updatedAt: atomic.updatedAt,
    };
    return createUsageSnapshot(
      resolvedPlanId,
      usage,
      limit,
      atomic.reserved,
    );
  }
  const usage =
    await readUsage();
  if (
    limit !== null &&
    usage.count >= limit
  ) {
    return createUsageSnapshot(
      resolvedPlanId,
      usage,
      limit,
      false,
    );
  }
  const updated: ExecutionUsageRecord = {
    date: usage.date,
    count: usage.count + 1,
    updatedAt: Date.now(),
  };
  await writeUsage(
    updated,
  );
  return createUsageSnapshot(
    resolvedPlanId,
    updated,
    limit,
    true,
  );
}
