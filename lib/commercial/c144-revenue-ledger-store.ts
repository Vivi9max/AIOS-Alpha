import "server-only";

import { storage } from "@/lib/server-storage";

export type RevenueOfferStatus = "draft" | "active" | "paused" | "archived";
export type RevenueOrderStatus =
  | "quoted"
  | "awaiting-payment"
  | "paid"
  | "in-delivery"
  | "delivered"
  | "cancelled"
  | "refunded";
export type RevenueDeliveryStatus = "not-started" | "in-progress" | "delivered" | "revision-requested";
export type RevenuePaymentStatus = "pending" | "received" | "refunded" | "void";
export type RevenuePaymentMethod = "bank-transfer" | "platform-order" | "cash" | "other" | "unknown";

export interface RevenueOfferRecord {
  id: string;
  name: string;
  description: string;
  currency: string;
  price: number;
  deliverables: string[];
  exclusions: string[];
  deliveryDays: number;
  status: RevenueOfferStatus;
  createdAt: number;
  updatedAt: number;
}

export interface RevenueOrderRecord {
  id: string;
  leadId: string | null;
  offerId: string | null;
  customerLabel: string;
  customerContactNote: string;
  title: string;
  scope: string;
  currency: string;
  amount: number;
  status: RevenueOrderStatus;
  agreedAt: number | null;
  dueAt: number | null;
  note: string;
  createdAt: number;
  updatedAt: number;
}

export interface RevenueDeliveryRecord {
  id: string;
  orderId: string;
  title: string;
  description: string;
  status: RevenueDeliveryStatus;
  dueAt: number | null;
  deliveredAt: number | null;
  acceptanceNote: string;
  revisionCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface RevenuePaymentRecord {
  id: string;
  orderId: string;
  currency: string;
  amount: number;
  method: RevenuePaymentMethod;
  status: RevenuePaymentStatus;
  receivedAt: number | null;
  evidenceNote: string;
  externalReference: string;
  note: string;
  createdAt: number;
  updatedAt: number;
}

const OFFERS_KEY = "aios:founder:revenue-offers";
const ORDERS_KEY = "aios:founder:revenue-orders";
const DELIVERIES_KEY = "aios:founder:revenue-deliveries";
const PAYMENTS_KEY = "aios:founder:revenue-payments";
const MAX_RECORDS = 2000;
const MAX_TEXT = 4000;

function createId(prefix: string): string {
  return [prefix, Date.now().toString(36), Math.random().toString(36).slice(2, 10)].join("-");
}

function cleanText(value: unknown, maxLength = MAX_TEXT): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanCurrency(value: unknown): string {
  const currency = typeof value === "string" ? value.trim().toUpperCase() : "CNY";
  return /^[A-Z]{3}$/.test(currency) ? currency : "CNY";
}

function cleanMoneyAmount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  const bounded = Math.min(1000000000, Math.max(0, value));
  return Math.round((bounded + Number.EPSILON) * 100) / 100;
}

function cleanPositiveInteger(value: unknown, fallback = 1): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(3650, Math.max(1, Math.floor(value)));
}

function cleanTimestamp(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : null;
}

function cleanTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => cleanText(item, 500))
    .filter(Boolean)
    .slice(0, 50);
}

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function migrateLegacyMoneyRecord(key: string, value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const item = value as Record<string, unknown>;
  if (key === OFFERS_KEY && typeof item.priceMinor === "number" && typeof item.price !== "number") {
    const { priceMinor, ...rest } = item;
    return { ...rest, price: cleanMoneyAmount(priceMinor / 100) };
  }
  if ((key === ORDERS_KEY || key === PAYMENTS_KEY) && typeof item.amountMinor === "number" && typeof item.amount !== "number") {
    const { amountMinor, ...rest } = item;
    return { ...rest, amount: cleanMoneyAmount(amountMinor / 100) };
  }
  return value;
}

async function readList<T>(key: string, isValid: (value: unknown) => value is T): Promise<T[]> {
  const value = await storage.get<unknown>(key);
  if (!Array.isArray(value)) return [];
  return value.map((item) => migrateLegacyMoneyRecord(key, item)).filter(isValid).slice(-MAX_RECORDS);
}

async function writeList<T>(key: string, records: T[]): Promise<void> {
  await storage.set(key, records.slice(-MAX_RECORDS));
}

function isOffer(value: unknown): value is RevenueOfferRecord {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<RevenueOfferRecord>;
  return typeof item.id === "string" && typeof item.name === "string" &&
    typeof item.description === "string" && typeof item.currency === "string" &&
    typeof item.price === "number" && Array.isArray(item.deliverables) &&
    Array.isArray(item.exclusions) && typeof item.deliveryDays === "number" &&
    isOneOf(item.status, ["draft", "active", "paused", "archived"] as const) &&
    typeof item.createdAt === "number" && typeof item.updatedAt === "number";
}

function isOrder(value: unknown): value is RevenueOrderRecord {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<RevenueOrderRecord>;
  return typeof item.id === "string" && typeof item.customerLabel === "string" &&
    typeof item.title === "string" && typeof item.currency === "string" &&
    typeof item.amount === "number" &&
    isOneOf(item.status, ["quoted", "awaiting-payment", "paid", "in-delivery", "delivered", "cancelled", "refunded"] as const) &&
    typeof item.createdAt === "number" && typeof item.updatedAt === "number";
}

function isDelivery(value: unknown): value is RevenueDeliveryRecord {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<RevenueDeliveryRecord>;
  return typeof item.id === "string" && typeof item.orderId === "string" &&
    typeof item.title === "string" &&
    isOneOf(item.status, ["not-started", "in-progress", "delivered", "revision-requested"] as const) &&
    typeof item.revisionCount === "number" && typeof item.createdAt === "number" &&
    typeof item.updatedAt === "number";
}

function isPayment(value: unknown): value is RevenuePaymentRecord {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<RevenuePaymentRecord>;
  return typeof item.id === "string" && typeof item.orderId === "string" &&
    typeof item.currency === "string" && typeof item.amount === "number" &&
    isOneOf(item.method, ["bank-transfer", "platform-order", "cash", "other", "unknown"] as const) &&
    isOneOf(item.status, ["pending", "received", "refunded", "void"] as const) &&
    typeof item.createdAt === "number" && typeof item.updatedAt === "number";
}

export async function listRevenueOffers(): Promise<RevenueOfferRecord[]> {
  return (await readList(OFFERS_KEY, isOffer)).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function createRevenueOffer(input: {
  name: string;
  description?: string;
  currency?: string;
  price: number;
  deliverables?: string[];
  exclusions?: string[];
  deliveryDays?: number;
  status?: RevenueOfferStatus;
}): Promise<RevenueOfferRecord> {
  const now = Date.now();
  const record: RevenueOfferRecord = {
    id: createId("offer"),
    name: cleanText(input.name, 200) || "Untitled offer",
    description: cleanText(input.description),
    currency: cleanCurrency(input.currency),
    price: cleanMoneyAmount(input.price),
    deliverables: cleanTextList(input.deliverables),
    exclusions: cleanTextList(input.exclusions),
    deliveryDays: cleanPositiveInteger(input.deliveryDays, 7),
    status: isOneOf(input.status, ["draft", "active", "paused", "archived"] as const) ? input.status : "draft",
    createdAt: now,
    updatedAt: now,
  };
  const records = await readList(OFFERS_KEY, isOffer);
  records.push(record);
  await writeList(OFFERS_KEY, records);
  return record;
}

export async function listRevenueOrders(): Promise<RevenueOrderRecord[]> {
  return (await readList(ORDERS_KEY, isOrder)).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function createRevenueOrder(input: {
  leadId?: string | null;
  offerId?: string | null;
  customerLabel: string;
  customerContactNote?: string;
  title: string;
  scope?: string;
  currency?: string;
  amount: number;
  status?: RevenueOrderStatus;
  agreedAt?: number | null;
  dueAt?: number | null;
  note?: string;
}): Promise<RevenueOrderRecord> {
  const now = Date.now();
  const record: RevenueOrderRecord = {
    id: createId("order"),
    leadId: cleanText(input.leadId, 120) || null,
    offerId: cleanText(input.offerId, 120) || null,
    customerLabel: cleanText(input.customerLabel, 200) || "Unspecified customer",
    customerContactNote: cleanText(input.customerContactNote, 1000),
    title: cleanText(input.title, 200) || "Untitled order",
    scope: cleanText(input.scope),
    currency: cleanCurrency(input.currency),
    amount: cleanMoneyAmount(input.amount),
    status: isOneOf(input.status, ["quoted", "awaiting-payment", "paid", "in-delivery", "delivered", "cancelled", "refunded"] as const) ? input.status : "quoted",
    agreedAt: cleanTimestamp(input.agreedAt),
    dueAt: cleanTimestamp(input.dueAt),
    note: cleanText(input.note),
    createdAt: now,
    updatedAt: now,
  };
  const records = await readList(ORDERS_KEY, isOrder);
  records.push(record);
  await writeList(ORDERS_KEY, records);
  return record;
}

export async function updateRevenueOrder(
  id: string,
  updates: Partial<Pick<RevenueOrderRecord, "customerLabel" | "customerContactNote" | "title" | "scope" | "amount" | "status" | "agreedAt" | "dueAt" | "note">>,
): Promise<RevenueOrderRecord | null> {
  const records = await readList(ORDERS_KEY, isOrder);
  const index = records.findIndex((item) => item.id === cleanText(id, 120));
  if (index < 0) return null;
  const current = records[index];
  const next: RevenueOrderRecord = {
    ...current,
    customerLabel: updates.customerLabel === undefined ? current.customerLabel : cleanText(updates.customerLabel, 200),
    customerContactNote: updates.customerContactNote === undefined ? current.customerContactNote : cleanText(updates.customerContactNote, 1000),
    title: updates.title === undefined ? current.title : cleanText(updates.title, 200),
    scope: updates.scope === undefined ? current.scope : cleanText(updates.scope),
    amount: updates.amount === undefined ? current.amount : cleanMoneyAmount(updates.amount),
    status: isOneOf(updates.status, ["quoted", "awaiting-payment", "paid", "in-delivery", "delivered", "cancelled", "refunded"] as const) ? updates.status : current.status,
    agreedAt: updates.agreedAt === undefined ? current.agreedAt : cleanTimestamp(updates.agreedAt),
    dueAt: updates.dueAt === undefined ? current.dueAt : cleanTimestamp(updates.dueAt),
    note: updates.note === undefined ? current.note : cleanText(updates.note),
    updatedAt: Date.now(),
  };
  records[index] = next;
  await writeList(ORDERS_KEY, records);
  return next;
}

export async function listRevenueDeliveries(orderId?: string): Promise<RevenueDeliveryRecord[]> {
  const records = await readList(DELIVERIES_KEY, isDelivery);
  const filtered = orderId ? records.filter((item) => item.orderId === cleanText(orderId, 120)) : records;
  return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function createRevenueDelivery(input: {
  orderId: string;
  title: string;
  description?: string;
  status?: RevenueDeliveryStatus;
  dueAt?: number | null;
}): Promise<RevenueDeliveryRecord> {
  const orderId = cleanText(input.orderId, 120);
  if (!orderId) throw new Error("A valid orderId is required.");
  const orders = await readList(ORDERS_KEY, isOrder);
  if (!orders.some((item) => item.id === orderId)) throw new Error("The referenced order does not exist.");
  const now = Date.now();
  const status = isOneOf(input.status, ["not-started", "in-progress", "delivered", "revision-requested"] as const) ? input.status : "not-started";
  const record: RevenueDeliveryRecord = {
    id: createId("delivery"),
    orderId,
    title: cleanText(input.title, 200) || "Delivery item",
    description: cleanText(input.description),
    status,
    dueAt: cleanTimestamp(input.dueAt),
    deliveredAt: status === "delivered" ? now : null,
    acceptanceNote: "",
    revisionCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  const records = await readList(DELIVERIES_KEY, isDelivery);
  records.push(record);
  await writeList(DELIVERIES_KEY, records);
  return record;
}

export async function updateRevenueDelivery(
  id: string,
  updates: Partial<Pick<RevenueDeliveryRecord, "title" | "description" | "status" | "dueAt" | "acceptanceNote" | "revisionCount">>,
): Promise<RevenueDeliveryRecord | null> {
  const records = await readList(DELIVERIES_KEY, isDelivery);
  const index = records.findIndex((item) => item.id === cleanText(id, 120));
  if (index < 0) return null;
  const current = records[index];
  const status = isOneOf(updates.status, ["not-started", "in-progress", "delivered", "revision-requested"] as const) ? updates.status : current.status;
  const now = Date.now();
  const next: RevenueDeliveryRecord = {
    ...current,
    title: updates.title === undefined ? current.title : cleanText(updates.title, 200),
    description: updates.description === undefined ? current.description : cleanText(updates.description),
    status,
    dueAt: updates.dueAt === undefined ? current.dueAt : cleanTimestamp(updates.dueAt),
    deliveredAt: status === "delivered" ? (current.deliveredAt ?? now) : current.deliveredAt,
    acceptanceNote: updates.acceptanceNote === undefined ? current.acceptanceNote : cleanText(updates.acceptanceNote, 2000),
    revisionCount: updates.revisionCount === undefined ? current.revisionCount : Math.min(1000, Math.max(0, Math.floor(updates.revisionCount))),
    updatedAt: now,
  };
  records[index] = next;
  await writeList(DELIVERIES_KEY, records);
  return next;
}

export async function listRevenuePayments(orderId?: string): Promise<RevenuePaymentRecord[]> {
  const records = await readList(PAYMENTS_KEY, isPayment);
  const filtered = orderId ? records.filter((item) => item.orderId === cleanText(orderId, 120)) : records;
  return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function createRevenuePayment(input: {
  orderId: string;
  currency?: string;
  amount: number;
  method?: RevenuePaymentMethod;
  status?: RevenuePaymentStatus;
  receivedAt?: number | null;
  evidenceNote?: string;
  externalReference?: string;
  note?: string;
}): Promise<RevenuePaymentRecord> {
  const orderId = cleanText(input.orderId, 120);
  if (!orderId) throw new Error("A valid orderId is required.");
  const orders = await readList(ORDERS_KEY, isOrder);
  if (!orders.some((item) => item.id === orderId)) throw new Error("The referenced order does not exist.");
  const status = isOneOf(input.status, ["pending", "received", "refunded", "void"] as const) ? input.status : "pending";
  const receivedAt = cleanTimestamp(input.receivedAt);
  const evidenceNote = cleanText(input.evidenceNote, 2000);
  if (status === "received" && (!receivedAt || !evidenceNote)) {
    throw new Error("A received payment requires a receipt timestamp and a manual evidence note.");
  }
  const now = Date.now();
  const record: RevenuePaymentRecord = {
    id: createId("payment"),
    orderId,
    currency: cleanCurrency(input.currency),
    amount: cleanMoneyAmount(input.amount),
    method: isOneOf(input.method, ["bank-transfer", "platform-order", "cash", "other", "unknown"] as const) ? input.method : "unknown",
    status,
    receivedAt: status === "received" ? receivedAt : null,
    evidenceNote: status === "received" ? evidenceNote : evidenceNote,
    externalReference: cleanText(input.externalReference, 300),
    note: cleanText(input.note),
    createdAt: now,
    updatedAt: now,
  };
  const records = await readList(PAYMENTS_KEY, isPayment);
  records.push(record);
  await writeList(PAYMENTS_KEY, records);
  return record;
}

export async function updateRevenuePayment(
  id: string,
  updates: Partial<Pick<RevenuePaymentRecord, "status" | "receivedAt" | "evidenceNote" | "externalReference" | "note">>,
): Promise<RevenuePaymentRecord | null> {
  const records = await readList(PAYMENTS_KEY, isPayment);
  const index = records.findIndex((item) => item.id === cleanText(id, 120));
  if (index < 0) return null;
  const current = records[index];
  const status = isOneOf(updates.status, ["pending", "received", "refunded", "void"] as const) ? updates.status : current.status;
  const receivedAt = updates.receivedAt === undefined ? current.receivedAt : cleanTimestamp(updates.receivedAt);
  const evidenceNote = updates.evidenceNote === undefined ? current.evidenceNote : cleanText(updates.evidenceNote, 2000);
  if (status === "received" && (!receivedAt || !evidenceNote)) {
    throw new Error("A received payment requires a receipt timestamp and a manual evidence note.");
  }
  const next: RevenuePaymentRecord = {
    ...current,
    status,
    receivedAt: status === "received" ? receivedAt : current.receivedAt,
    evidenceNote,
    externalReference: updates.externalReference === undefined ? current.externalReference : cleanText(updates.externalReference, 300),
    note: updates.note === undefined ? current.note : cleanText(updates.note),
    updatedAt: Date.now(),
  };
  records[index] = next;
  await writeList(PAYMENTS_KEY, records);
  return next;
}

export async function getRevenueLedgerSnapshot(): Promise<{
  offers: RevenueOfferRecord[];
  orders: RevenueOrderRecord[];
  deliveries: RevenueDeliveryRecord[];
  payments: RevenuePaymentRecord[];
  recordedReceivedAmount: number;
  note: string;
}> {
  const [offers, orders, deliveries, payments] = await Promise.all([
    listRevenueOffers(),
    listRevenueOrders(),
    listRevenueDeliveries(),
    listRevenuePayments(),
  ]);
  const recordedReceivedAmount = Math.round(
    payments
      .filter((item) => item.status === "received")
      .reduce((sumCents, item) => sumCents + Math.round(item.amount * 100), 0),
  ) / 100;
  return {
    offers,
    orders,
    deliveries,
    payments,
    recordedReceivedAmount,
    note: "Recorded receipts are manually entered records, not independently verified bank or payment-provider data.",
  };
}
