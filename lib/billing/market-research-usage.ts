import { storage, getNamespacedStorageKey } from "@/lib/server-storage";
import { redisStorage, reserveMarketResearchUsageAtomic, releaseMarketResearchUsageAtomic } from "@/lib/server-storage/redis";
import { createUserStorageKey } from "@/lib/storage/data-scope";
import { getEntitlement } from "@/lib/billing/entitlements";
import { checkMarketResearchUsage, type MarketResearchUsageCheck } from "@/lib/billing/usage";
import type { AIOSPlanId } from "@/lib/billing/plans";
const USAGE_RESOURCE = "market-research-usage";
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
  return createUserStorageKey(USAGE_RESOURCE);
}
function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}
function createEmptyRecord(): MarketResearchUsageRecord {
  return {
    month: getCurrentMonthKey(),
    count: 0,
    updatedAt: Date.now(),
  };
}
function normalizeCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}
function resolvePlanId(planId?: string): AIOSPlanId {
  if (planId === "alpha" || planId === "free" || planId === "pro" || planId === "business") {
    return planId;
  }
  return "alpha";
}
function buildSnapshot(
  planId: AIOSPlanId,
  usage: MarketResearchUsageRecord,
): MarketResearchUsageSnapshot {
  const entitlement = getEntitlement(planId);
  const check = checkMarketResearchUsage(planId, usage.count);
  return {
    planId,
    month: usage.month,
    used: usage.count,
    limit: check.limit,
    remaining: check.remaining,
    allowed: entitlement.capabilities.includes("market-research") && check.allowed,
    capability: "market-research",
  };
}
function assertDurableStorage(): void {
  if (storage.mode !== "redis" || redisStorage.mode !== "redis") {
    throw new Error("Durable Redis storage is required for market research quota enforcement.");
  }
}
async function readUsage(): Promise<MarketResearchUsageRecord> {
  assertDurableStorage();
  const stored = await storage.get<MarketResearchUsageRecord>(getStorageKey());
  if (!stored || typeof stored !== "object") return createEmptyRecord();
  if (typeof stored.month !== "string" || typeof stored.count !== "number") return createEmptyRecord();
  const currentMonth = getCurrentMonthKey();
  if (stored.month !== currentMonth) return createEmptyRecord();
  return {
    month: currentMonth,
    count: normalizeCount(stored.count),
    updatedAt: typeof stored.updatedAt === "number" ? stored.updatedAt : Date.now(),
  };
}
export async function getMarketResearchUsage(planId?: string): Promise<MarketResearchUsageSnapshot> {
  const resolvedPlanId = resolvePlanId(planId);
  const usage = await readUsage();
  return buildSnapshot(resolvedPlanId, usage);
}
export async function reserveMarketResearchReport(planId?: string): Promise<MarketResearchUsageSnapshot> {
  assertDurableStorage();
  const resolvedPlanId = resolvePlanId(planId);
  const entitlement = getEntitlement(resolvedPlanId);
  const month = getCurrentMonthKey();
  if (!entitlement.capabilities.includes("market-research")) {
    return buildSnapshot(resolvedPlanId, await readUsage());
  }
  const limit = entitlement.limits.marketResearchReportsPerMonth;
  const result = await reserveMarketResearchUsageAtomic(
    getNamespacedStorageKey(getStorageKey()),
    month,
    limit,
    Date.now(),
  );
  const snapshot = buildSnapshot(resolvedPlanId, {
    month: result.month,
    count: result.count,
    updatedAt: result.updatedAt,
  });
  return {
    ...snapshot,
    allowed: result.reserved && entitlement.capabilities.includes("market-research"),
  };
}
export async function releaseMarketResearchReportReservation(): Promise<void> {
  assertDurableStorage();
  await releaseMarketResearchUsageAtomic(
    getNamespacedStorageKey(getStorageKey()),
    getCurrentMonthKey(),
    Date.now(),
  );
}
export async function getMarketResearchUsageCheck(planId?: string): Promise<MarketResearchUsageCheck> {
  const resolvedPlanId = resolvePlanId(planId);
  const usage = await readUsage();
  return checkMarketResearchUsage(resolvedPlanId, usage.count);
}
export function getMarketResearchUsageStorageKey(): string {
  return getStorageKey();
}
