import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { isFounderConfigured, isFounderRequest } from "@/lib/founder/auth";
import {
  createRevenueDelivery,
  createRevenueOffer,
  createRevenueOrder,
  createRevenuePayment,
  getRevenueLedgerSnapshot,
  listRevenueDeliveries,
  listRevenueOffers,
  listRevenueOrders,
  listRevenuePayments,
  updateRevenueDelivery,
  updateRevenueOrder,
  updateRevenuePayment,
} from "@/lib/commercial/c144-revenue-ledger-store";
import type {
  RevenueDeliveryStatus,
  RevenueOfferStatus,
  RevenueOrderStatus,
  RevenuePaymentMethod,
  RevenuePaymentStatus,
} from "@/lib/commercial/c144-revenue-ledger-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonResponse(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function jsonError(code: string, message: string, status: number): NextResponse {
  return jsonResponse({ success: false, code, message, externalSideEffectExecuted: false }, status);
}

function authorize(request: NextRequest): NextResponse | null {
  if (!isFounderConfigured()) {
    return jsonError("FOUNDER_ACCESS_NOT_CONFIGURED", "Founder access is not configured.", 503);
  }
  if (!isFounderRequest(request)) {
    return jsonError("FOUNDER_AUTH_REQUIRED", "Founder authentication required.", 401);
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, maxLength = 4000): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function optionalText(value: unknown, maxLength = 4000): string | undefined {
  return typeof value === "string" ? cleanText(value, maxLength) : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isMoneyAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) &&
    value >= 0 && value <= 1000000000 &&
    Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;
}

function optionalTimestamp(value: unknown): number | null | undefined {
  if (value === null) return null;
  return optionalNumber(value);
}

function isOfferStatus(value: unknown): value is RevenueOfferStatus {
  return value === "draft" || value === "active" || value === "paused" || value === "archived";
}
function isOrderStatus(value: unknown): value is RevenueOrderStatus {
  return value === "quoted" || value === "awaiting-payment" || value === "paid" || value === "in-delivery" || value === "delivered" || value === "cancelled" || value === "refunded";
}
function isDeliveryStatus(value: unknown): value is RevenueDeliveryStatus {
  return value === "not-started" || value === "in-progress" || value === "delivered" || value === "revision-requested";
}
function isPaymentStatus(value: unknown): value is RevenuePaymentStatus {
  return value === "pending" || value === "received" || value === "refunded" || value === "void";
}
function isPaymentMethod(value: unknown): value is RevenuePaymentMethod {
  return value === "bank-transfer" || value === "platform-order" || value === "cash" || value === "other" || value === "unknown";
}
function textList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 50);
}

export async function GET(request: NextRequest) {
  const authError = authorize(request);
  if (authError) return authError;

  try {
    const snapshot = await getRevenueLedgerSnapshot();
    return jsonResponse({
      success: true,
      code: "C144_REVENUE_LEDGER_READY",
      result: snapshot,
      persistenceEnabled: true,
      externalSideEffectExecuted: false,
    });
  } catch (error) {
    return jsonError("C144_REVENUE_LEDGER_READ_FAILED", error instanceof Error ? error.message : "Unable to read revenue ledger.", 500);
  }
}

export async function POST(request: NextRequest) {
  const authError = authorize(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("C144_REVENUE_INVALID_JSON", "Request body must be valid JSON.", 400);
  }
  if (!isRecord(body)) return jsonError("C144_REVENUE_INVALID_BODY", "Request body must be a JSON object.", 400);

  const mode = typeof body.mode === "string" ? body.mode : "snapshot";
  try {
    if (mode === "snapshot") {
      return jsonResponse({ success: true, code: "C144_REVENUE_LEDGER_READY", result: await getRevenueLedgerSnapshot(), persistenceEnabled: true, externalSideEffectExecuted: false });
    }

    if (mode === "list-offers") {
      const records = await listRevenueOffers();
      return jsonResponse({ success: true, code: "C144_REVENUE_OFFERS_LISTED", result: { records, count: records.length }, persistenceEnabled: true, externalSideEffectExecuted: false });
    }
    if (mode === "create-offer") {
      const name = cleanText(body.name, 200);
      if (!name) return jsonError("C144_REVENUE_OFFER_NAME_REQUIRED", "Offer name is required.", 400);
      const price = optionalNumber(body.price);
      if (!isMoneyAmount(price)) return jsonError("C144_REVENUE_OFFER_PRICE_INVALID", "price must be a non-negative amount in major currency units, with up to two decimal places.", 400);
      const record = await createRevenueOffer({
        name,
        description: cleanText(body.description),
        currency: cleanText(body.currency, 3) || "CNY",
        price: Math.round((price + Number.EPSILON) * 100) / 100,
        deliverables: textList(body.deliverables),
        exclusions: textList(body.exclusions),
        deliveryDays: optionalNumber(body.deliveryDays),
        status: isOfferStatus(body.status) ? body.status : "draft",
      });
      return jsonResponse({ success: true, code: "C144_REVENUE_OFFER_CREATED", result: { record }, persistenceEnabled: true, externalSideEffectExecuted: false }, 201);
    }

    if (mode === "list-orders") {
      const records = await listRevenueOrders();
      return jsonResponse({ success: true, code: "C144_REVENUE_ORDERS_LISTED", result: { records, count: records.length }, persistenceEnabled: true, externalSideEffectExecuted: false });
    }
    if (mode === "create-order") {
      const customerLabel = cleanText(body.customerLabel, 200);
      const title = cleanText(body.title, 200);
      const amount = optionalNumber(body.amount);
      if (!customerLabel || !title) return jsonError("C144_REVENUE_ORDER_FIELDS_REQUIRED", "customerLabel and title are required.", 400);
      if (!isMoneyAmount(amount)) return jsonError("C144_REVENUE_ORDER_AMOUNT_INVALID", "amount must be a non-negative amount in major currency units, with up to two decimal places.", 400);
      const record = await createRevenueOrder({
        leadId: optionalText(body.leadId, 120) || null,
        offerId: optionalText(body.offerId, 120) || null,
        customerLabel,
        customerContactNote: cleanText(body.customerContactNote, 1000),
        title,
        scope: cleanText(body.scope),
        currency: cleanText(body.currency, 3) || "CNY",
        amount: Math.round((amount + Number.EPSILON) * 100) / 100,
        status: isOrderStatus(body.status) ? body.status : "quoted",
        agreedAt: optionalTimestamp(body.agreedAt),
        dueAt: optionalTimestamp(body.dueAt),
        note: cleanText(body.note),
      });
      return jsonResponse({ success: true, code: "C144_REVENUE_ORDER_CREATED", result: { record }, persistenceEnabled: true, externalSideEffectExecuted: false }, 201);
    }
    if (mode === "update-order") {
      const id = cleanText(body.id, 120);
      if (!id) return jsonError("C144_REVENUE_ORDER_ID_REQUIRED", "Order ID is required.", 400);
      const updates: Parameters<typeof updateRevenueOrder>[1] = {};
      if (typeof body.customerLabel === "string") updates.customerLabel = cleanText(body.customerLabel, 200);
      if (typeof body.customerContactNote === "string") updates.customerContactNote = cleanText(body.customerContactNote, 1000);
      if (typeof body.title === "string") updates.title = cleanText(body.title, 200);
      if (typeof body.scope === "string") updates.scope = cleanText(body.scope);
      if (typeof body.note === "string") updates.note = cleanText(body.note);
      if (body.amount !== undefined) {
        if (!isMoneyAmount(body.amount)) return jsonError("C144_REVENUE_ORDER_AMOUNT_INVALID", "amount must be a non-negative amount in major currency units, with up to two decimal places.", 400);
        updates.amount = Math.round((body.amount + Number.EPSILON) * 100) / 100;
      }
      if (isOrderStatus(body.status)) updates.status = body.status;
      if (body.agreedAt === null || optionalNumber(body.agreedAt) !== undefined) {
        const agreedAt = optionalTimestamp(body.agreedAt);
        if (agreedAt !== undefined) updates.agreedAt = agreedAt;
      }
      if (body.dueAt === null || optionalNumber(body.dueAt) !== undefined) {
        const dueAt = optionalTimestamp(body.dueAt);
        if (dueAt !== undefined) updates.dueAt = dueAt;
      }
      if (!Object.keys(updates).length) return jsonError("C144_REVENUE_NO_UPDATES", "Provide at least one valid order field to update.", 400);
      const record = await updateRevenueOrder(id, updates);
      if (!record) return jsonError("C144_REVENUE_ORDER_NOT_FOUND", "Order was not found.", 404);
      return jsonResponse({ success: true, code: "C144_REVENUE_ORDER_UPDATED", result: { record }, persistenceEnabled: true, externalSideEffectExecuted: false });
    }

    if (mode === "list-deliveries") {
      const orderId = cleanText(body.orderId, 120) || undefined;
      const records = await listRevenueDeliveries(orderId);
      return jsonResponse({ success: true, code: "C144_REVENUE_DELIVERIES_LISTED", result: { records, count: records.length }, persistenceEnabled: true, externalSideEffectExecuted: false });
    }
    if (mode === "create-delivery") {
      const orderId = cleanText(body.orderId, 120);
      const title = cleanText(body.title, 200);
      if (!orderId || !title) return jsonError("C144_REVENUE_DELIVERY_FIELDS_REQUIRED", "orderId and title are required.", 400);
      const record = await createRevenueDelivery({ orderId, title, description: cleanText(body.description), status: isDeliveryStatus(body.status) ? body.status : "not-started", dueAt: optionalTimestamp(body.dueAt) });
      return jsonResponse({ success: true, code: "C144_REVENUE_DELIVERY_CREATED", result: { record }, persistenceEnabled: true, externalSideEffectExecuted: false }, 201);
    }
    if (mode === "update-delivery") {
      const id = cleanText(body.id, 120);
      if (!id) return jsonError("C144_REVENUE_DELIVERY_ID_REQUIRED", "Delivery ID is required.", 400);
      const updates: Parameters<typeof updateRevenueDelivery>[1] = {};
      if (typeof body.title === "string") updates.title = cleanText(body.title, 200);
      if (typeof body.description === "string") updates.description = cleanText(body.description);
      if (typeof body.acceptanceNote === "string") updates.acceptanceNote = cleanText(body.acceptanceNote, 2000);
      if (isDeliveryStatus(body.status)) updates.status = body.status;
      if (body.dueAt === null || optionalNumber(body.dueAt) !== undefined) {
        const dueAt = optionalTimestamp(body.dueAt);
        if (dueAt !== undefined) updates.dueAt = dueAt;
      }
      if (optionalNumber(body.revisionCount) !== undefined) updates.revisionCount = Math.max(0, Math.floor(optionalNumber(body.revisionCount)!));
      if (!Object.keys(updates).length) return jsonError("C144_REVENUE_NO_UPDATES", "Provide at least one valid delivery field to update.", 400);
      const record = await updateRevenueDelivery(id, updates);
      if (!record) return jsonError("C144_REVENUE_DELIVERY_NOT_FOUND", "Delivery record was not found.", 404);
      return jsonResponse({ success: true, code: "C144_REVENUE_DELIVERY_UPDATED", result: { record }, persistenceEnabled: true, externalSideEffectExecuted: false });
    }

    if (mode === "list-payments") {
      const orderId = cleanText(body.orderId, 120) || undefined;
      const records = await listRevenuePayments(orderId);
      return jsonResponse({ success: true, code: "C144_REVENUE_PAYMENTS_LISTED", result: { records, count: records.length }, persistenceEnabled: true, externalSideEffectExecuted: false });
    }
    if (mode === "create-payment") {
      const orderId = cleanText(body.orderId, 120);
      const amount = optionalNumber(body.amount);
      if (!orderId) return jsonError("C144_REVENUE_PAYMENT_ORDER_REQUIRED", "orderId is required.", 400);
      if (!isMoneyAmount(amount)) return jsonError("C144_REVENUE_PAYMENT_AMOUNT_INVALID", "amount must be a non-negative amount in major currency units, with up to two decimal places.", 400);
      const status = isPaymentStatus(body.status) ? body.status : "pending";
      if (status === "received" && (optionalTimestamp(body.receivedAt) == null || !cleanText(body.evidenceNote, 2000))) return jsonError("C144_REVENUE_PAYMENT_EVIDENCE_REQUIRED", "A received payment requires receivedAt and a manual evidenceNote.", 400);
      const record = await createRevenuePayment({
        orderId,
        currency: cleanText(body.currency, 3) || "CNY",
        amount: Math.round((amount + Number.EPSILON) * 100) / 100,
        method: isPaymentMethod(body.method) ? body.method : "unknown",
        status,
        receivedAt: optionalTimestamp(body.receivedAt),
        evidenceNote: cleanText(body.evidenceNote, 2000),
        externalReference: cleanText(body.externalReference, 300),
        note: cleanText(body.note),
      });
      return jsonResponse({ success: true, code: "C144_REVENUE_PAYMENT_CREATED", result: { record }, persistenceEnabled: true, externalSideEffectExecuted: false }, 201);
    }
    if (mode === "update-payment") {
      const id = cleanText(body.id, 120);
      if (!id) return jsonError("C144_REVENUE_PAYMENT_ID_REQUIRED", "Payment ID is required.", 400);
      const updates: Parameters<typeof updateRevenuePayment>[1] = {};
      if (isPaymentStatus(body.status)) updates.status = body.status;
      if (body.receivedAt === null || optionalNumber(body.receivedAt) !== undefined) {
        const receivedAt = optionalTimestamp(body.receivedAt);
        if (receivedAt !== undefined) updates.receivedAt = receivedAt;
      }
      if (typeof body.evidenceNote === "string") updates.evidenceNote = cleanText(body.evidenceNote, 2000);
      if (typeof body.externalReference === "string") updates.externalReference = cleanText(body.externalReference, 300);
      if (typeof body.note === "string") updates.note = cleanText(body.note);
      if (!Object.keys(updates).length) return jsonError("C144_REVENUE_NO_UPDATES", "Provide at least one valid payment field to update.", 400);
      const record = await updateRevenuePayment(id, updates);
      if (!record) return jsonError("C144_REVENUE_PAYMENT_NOT_FOUND", "Payment record was not found.", 404);
      return jsonResponse({ success: true, code: "C144_REVENUE_PAYMENT_UPDATED", result: { record }, persistenceEnabled: true, externalSideEffectExecuted: false });
    }

    return jsonError("C144_REVENUE_UNSUPPORTED_MODE", "Unsupported mode. Use snapshot, list-offers, create-offer, list-orders, create-order, update-order, list-deliveries, create-delivery, update-delivery, list-payments, create-payment, or update-payment.", 400);
  } catch (error) {
    return jsonError("C144_REVENUE_OPERATION_FAILED", error instanceof Error ? error.message : "Revenue ledger operation failed.", 500);
  }
}
