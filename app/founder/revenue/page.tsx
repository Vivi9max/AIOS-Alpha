"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";

const STORAGE_KEY = "aios-founder-access-key";
const ENDPOINT = "/api/founder/revenue";
const C168_HANDOFF_KEY = "aios-c168-revenue-handoff";

type OfferStatus = "draft" | "active" | "paused" | "archived";
type OrderStatus = "quoted" | "awaiting-payment" | "paid" | "in-delivery" | "delivered" | "cancelled" | "refunded";
type DeliveryStatus = "not-started" | "in-progress" | "delivered" | "revision-requested";
type PaymentStatus = "pending" | "received" | "refunded" | "void";
type PaymentMethod = "bank-transfer" | "platform-order" | "cash" | "other" | "unknown";

interface C168RevenueHandoff {
  version: string;
  leadId: string;
  businessType: string;
  sourceChannel: "xiaohongshu" | "xianyu";
  currentProblem: string;
  goal: string;
  note: string;
  handedOffAt: number;
}

interface OfferRecord {
  id: string;
  name: string;
  description: string;
  currency: string;
  price: number;
  deliverables: string[];
  exclusions: string[];
  deliveryDays: number;
  status: OfferStatus;
  createdAt: number;
  updatedAt: number;
}

interface OrderRecord {
  id: string;
  leadId: string | null;
  offerId: string | null;
  customerLabel: string;
  customerContactNote: string;
  title: string;
  scope: string;
  currency: string;
  amount: number;
  status: OrderStatus;
  agreedAt: number | null;
  dueAt: number | null;
  note: string;
  createdAt: number;
  updatedAt: number;
}

interface DeliveryRecord {
  id: string;
  orderId: string;
  title: string;
  description: string;
  status: DeliveryStatus;
  dueAt: number | null;
  deliveredAt: number | null;
  acceptanceNote: string;
  revisionCount: number;
  createdAt: number;
  updatedAt: number;
}

interface PaymentRecord {
  id: string;
  orderId: string;
  currency: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  receivedAt: number | null;
  evidenceNote: string;
  externalReference: string;
  note: string;
  createdAt: number;
  updatedAt: number;
}

interface Snapshot {
  offers: OfferRecord[];
  orders: OrderRecord[];
  deliveries: DeliveryRecord[];
  payments: PaymentRecord[];
  recordedReceivedAmount: number;
  note: string;
}

interface ApiResponse {
  success?: boolean;
  code?: string;
  message?: string;
  result?: Snapshot | { record?: OfferRecord | OrderRecord | DeliveryRecord | PaymentRecord; records?: unknown[] };
}

interface CollectionAction {
  order: OrderRecord;
  receivedCents: number;
  outstandingCents: number;
  action: "优先收款" | "跟进付款" | "确认交付后收款";
  priority: number;
}
interface SettlementClosure {
  order: OrderRecord;
  receivedCents: number;
  orderCents: number;
  excessCents: number;
  pendingCount: number;
}

interface RevenueClosureReadiness {
  order: OrderRecord;
  receivedCents: number;
  outstandingCents: number;
  deliveryCount: number;
  deliveredCount: number;
  action: "优先收款" | "继续交付" | "交付并收款" | "已闭环";
  priority: number;
}

interface RevenueIntegrityException {
  order: OrderRecord;
  kind: "currency-mismatch" | "over-collected" | "settled-with-pending" | "paid-with-balance" | "delivered-without-complete-delivery";
  label: string;
  detail: string;
  target: "delivery" | "payment";
  priority: number;
}

const ORDER_STATUSES: OrderStatus[] = ["quoted", "awaiting-payment", "paid", "in-delivery", "delivered", "cancelled", "refunded"];
const DELIVERY_STATUSES: DeliveryStatus[] = ["not-started", "in-progress", "delivered", "revision-requested"];
const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "received", "refunded", "void"];
const PAYMENT_METHODS: PaymentMethod[] = ["bank-transfer", "platform-order", "cash", "other", "unknown"];
const ORDER_LABELS: Record<OrderStatus, string> = {
  quoted: "已报价",
  "awaiting-payment": "待付款",
  paid: "已收款",
  "in-delivery": "交付中",
  delivered: "已交付",
  cancelled: "已取消",
  refunded: "已退款",
};
const DELIVERY_LABELS: Record<DeliveryStatus, string> = {
  "not-started": "未开始",
  "in-progress": "进行中",
  delivered: "已交付",
  "revision-requested": "待修改",
};
const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  pending: "待确认",
  received: "已记录收款",
  refunded: "已退款",
  void: "已作废",
};
const METHOD_LABELS: Record<PaymentMethod, string> = {
  "bank-transfer": "银行转账",
  "platform-order": "平台订单",
  cash: "现金",
  other: "其他",
  unknown: "未指定",
};
const CHANNEL_LABELS = { xiaohongshu: "小红书", xianyu: "闲鱼" } as const;

function panelStyle(): CSSProperties {
  return { border: "1px solid #27272a", borderRadius: 14, padding: 18, marginBottom: 16, background: "#111114" };
}

function fieldStyle(): CSSProperties {
  return { boxSizing: "border-box", width: "100%", padding: "10px 11px", border: "1px solid #3f3f46", borderRadius: 8, background: "#18181b", color: "#fafafa", fontSize: 14 };
}

function buttonStyle(disabled = false, primary = false): CSSProperties {
  return { border: "1px solid #52525b", borderRadius: 8, padding: "10px 13px", background: disabled ? "#27272a" : primary ? "#f4f4f5" : "#202024", color: disabled ? "#a1a1aa" : primary ? "#09090b" : "#f4f4f5", fontSize: 13, fontWeight: 650, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.65 : 1 };
}

function labelStyle(): CSSProperties {
  return { display: "block", marginBottom: 6, fontSize: 12, color: "#d4d4d8" };
}

function money(value: number, currency = "CNY"): string {
  const amount = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat("zh-CN", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function timeLabel(value: number | null): string {
  return value && Number.isFinite(value) ? new Date(value).toLocaleString() : "-";
}

function currencyInput(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || Math.abs(parsed * 100 - Math.round(parsed * 100)) > 0.000001) return null;
  return Math.round((parsed + Number.EPSILON) * 100) / 100;
}

function readC168Handoff(): C168RevenueHandoff | null {
  try {
    const raw = window.sessionStorage.getItem(C168_HANDOFF_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<C168RevenueHandoff>;
    if (!value.leadId || typeof value.leadId !== "string") return null;
    if (value.sourceChannel !== "xiaohongshu" && value.sourceChannel !== "xianyu") return null;
    return {
      version: typeof value.version === "string" ? value.version : "C168.10",
      leadId: value.leadId,
      businessType: typeof value.businessType === "string" ? value.businessType : "",
      sourceChannel: value.sourceChannel,
      currentProblem: typeof value.currentProblem === "string" ? value.currentProblem : "",
      goal: typeof value.goal === "string" ? value.goal : "",
      note: typeof value.note === "string" ? value.note : "",
      handedOffAt: typeof value.handedOffAt === "number" ? value.handedOffAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export default function FounderRevenuePage() {
  const [accessKey, setAccessKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [handoff, setHandoff] = useState<C168RevenueHandoff | null>(null);

  const [offerName, setOfferName] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const [offerPrice, setOfferPrice] = useState("99.00");
  const [offerDays, setOfferDays] = useState("7");
  const [offerCurrency, setOfferCurrency] = useState("CNY");

  const [customerLabel, setCustomerLabel] = useState("");
  const [orderTitle, setOrderTitle] = useState("");
  const [orderAmount, setOrderAmount] = useState("");
  const [orderCurrency, setOrderCurrency] = useState("CNY");
  const [orderScope, setOrderScope] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");

  const [deliveryTitle, setDeliveryTitle] = useState("");
  const [deliveryDescription, setDeliveryDescription] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("99.00");
  const [paymentCurrency, setPaymentCurrency] = useState("CNY");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank-transfer");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [paymentEvidence, setPaymentEvidence] = useState("");
  const [paymentReference, setPaymentReference] = useState("");

  const request = useCallback(async (body?: Record<string, unknown>) => {
    const key = accessKey.trim() || (typeof window !== "undefined" ? window.sessionStorage.getItem(STORAGE_KEY) || "" : "");
    const response = await fetch(ENDPOINT, {
      method: body ? "POST" : "GET",
      cache: "no-store",
      headers: { Accept: "application/json", Authorization: `Bearer ${key}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = (await response.json()) as ApiResponse;
    if (!response.ok || !data.success) throw new Error(data.message || data.code || "收入账本请求失败。");
    return data;
  }, [accessKey]);

  const refresh = useCallback(async (showNotice = false) => {
    setLoading(true);
    setError("");
    try {
      const data = await request();
      if (!data.result || !("offers" in data.result)) throw new Error("收入账本返回数据格式不正确。");
      setSnapshot(data.result as Snapshot);
      setAuthenticated(true);
      if (showNotice) setNotice("收入账本已刷新。");
    } catch (e) {
      setAuthenticated(false);
      setSnapshot(null);
      setError(e instanceof Error ? e.message : "无法读取收入账本。");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored) setAccessKey(stored);
    const inboundHandoff = readC168Handoff();
    if (inboundHandoff) {
      setHandoff(inboundHandoff);
      setCustomerLabel(inboundHandoff.businessType);
      setOrderTitle(inboundHandoff.goal || "Inbound 成交订单");
      setOrderScope(inboundHandoff.currentProblem);
      setOrderAmount("");
      setNotice("已接收 C168.10 成交询盘。请人工确认客户、订单名称和真实成交金额后再创建订单。");
    }
  }, []);

  useEffect(() => {
    if (accessKey.trim()) void refresh();
  }, [accessKey, refresh]);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessKey.trim()) {
      setError("请输入 Founder Access Key。");
      return;
    }
    window.sessionStorage.setItem(STORAGE_KEY, accessKey.trim());
    await refresh();
  }

  async function runAction(body: Record<string, unknown>, successMessage: string) {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      await request(body);
      const data = await request();
      if (!data.result || !("offers" in data.result)) throw new Error("收入账本刷新失败。");
      setSnapshot(data.result as Snapshot);
      setAuthenticated(true);
      setNotice(successMessage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败。");
    } finally {
      setLoading(false);
    }
  }

  const orders = snapshot?.orders ?? [];
  const activeOrderId = useMemo(() => selectedOrderId && orders.some((order) => order.id === selectedOrderId) ? selectedOrderId : orders[0]?.id ?? "", [orders, selectedOrderId]);
  const receivedPayments = snapshot?.payments.filter((payment) => payment.status === "received") ?? [];

  const currencyTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const payment of receivedPayments) {
      const cents = Math.round(payment.amount * 100);
      totals.set(payment.currency, (totals.get(payment.currency) ?? 0) + cents);
    }
    return Array.from(totals.entries()).map(([currency, cents]) => ({ currency, amount: cents / 100 }));
  }, [receivedPayments]);

  const collectionSummary = useMemo(() => {
    const orderById = new Map(orders.map((order) => [order.id, order]));
    const orderByCurrency = new Map<string, number>();
    const receivedByCurrency = new Map<string, number>();
    const receivedByOrder = new Map<string, number>();
    let pendingPayments = 0;

    for (const order of orders) {
      const cents = Math.round(order.amount * 100);
      orderByCurrency.set(order.currency, (orderByCurrency.get(order.currency) ?? 0) + cents);
    }
    for (const payment of snapshot?.payments ?? []) {
      if (payment.status === "pending") pendingPayments += 1;
      if (payment.status !== "received") continue;
      const cents = Math.round(payment.amount * 100);
      receivedByCurrency.set(payment.currency, (receivedByCurrency.get(payment.currency) ?? 0) + cents);
      const order = orderById.get(payment.orderId);
      if (order && order.currency === payment.currency) receivedByOrder.set(payment.orderId, (receivedByOrder.get(payment.orderId) ?? 0) + cents);
    }

    const outstandingByCurrency = new Map<string, number>();
    for (const order of orders) {
      const orderCents = Math.round(order.amount * 100);
      const receivedCents = receivedByOrder.get(order.id) ?? 0;
      outstandingByCurrency.set(order.currency, (outstandingByCurrency.get(order.currency) ?? 0) + Math.max(0, orderCents - receivedCents));
    }

    const currencies = Array.from(new Set([...orderByCurrency.keys(), ...receivedByCurrency.keys(), ...outstandingByCurrency.keys()])).sort();
    return { orderByCurrency, receivedByCurrency, outstandingByCurrency, pendingPayments, currencies };
  }, [orders, snapshot?.payments]);

  const collectionActions = useMemo<CollectionAction[]>(() => {
    const receivedByOrder = new Map<string, number>();
    const orderById = new Map(orders.map((order) => [order.id, order]));
    for (const payment of snapshot?.payments ?? []) {
      if (payment.status !== "received") continue;
      const order = orderById.get(payment.orderId);
      if (!order || order.currency !== payment.currency) continue;
      const cents = Math.round(payment.amount * 100);
      receivedByOrder.set(payment.orderId, (receivedByOrder.get(payment.orderId) ?? 0) + cents);
    }

    return orders
      .map((order) => {
        const orderCents = Math.round(order.amount * 100);
        const receivedCents = receivedByOrder.get(order.id) ?? 0;
        const outstandingCents = Math.max(0, orderCents - receivedCents);
        if (outstandingCents <= 0 || order.status === "cancelled" || order.status === "refunded") return null;

        if (order.status === "delivered") return { order, receivedCents, outstandingCents, action: "优先收款" as const, priority: 0 };
        if (order.status === "awaiting-payment" || order.status === "quoted") return { order, receivedCents, outstandingCents, action: "跟进付款" as const, priority: 1 };
        return { order, receivedCents, outstandingCents, action: "确认交付后收款" as const, priority: 2 };
      })
      .filter((item): item is CollectionAction => item !== null)
      .sort((a, b) => a.priority - b.priority || b.outstandingCents - a.outstandingCents || b.order.updatedAt - a.order.updatedAt);
  }, [orders, snapshot?.payments]);

  const settlementClosures = useMemo<SettlementClosure[]>(() => {
    const orderById = new Map(orders.map((order) => [order.id, order]));
    const receivedByOrder = new Map<string, number>();
    const pendingByOrder = new Map<string, number>();

    for (const payment of snapshot?.payments ?? []) {
      const order = orderById.get(payment.orderId);
      if (!order || order.currency !== payment.currency) continue;
      const cents = Math.round(payment.amount * 100);
      if (payment.status === "received") {
        receivedByOrder.set(payment.orderId, (receivedByOrder.get(payment.orderId) ?? 0) + cents);
      } else if (payment.status === "pending") {
        pendingByOrder.set(payment.orderId, (pendingByOrder.get(payment.orderId) ?? 0) + 1);
      }
    }

    return orders
      .map((order) => {
        if (order.status === "cancelled" || order.status === "refunded") return null;
        const orderCents = Math.round(order.amount * 100);
        const receivedCents = receivedByOrder.get(order.id) ?? 0;
        if (receivedCents < orderCents) return null;
        return {
          order,
          receivedCents,
          orderCents,
          excessCents: Math.max(0, receivedCents - orderCents),
          pendingCount: pendingByOrder.get(order.id) ?? 0,
        };
      })
      .filter((item): item is SettlementClosure => item !== null)
      .sort((a, b) => b.excessCents - a.excessCents || b.order.updatedAt - a.order.updatedAt);
  }, [orders, snapshot?.payments]);

  const revenueClosureReadiness = useMemo<RevenueClosureReadiness[]>(() => {
    const receivedByOrder = new Map<string, number>();
    const orderById = new Map(orders.map((order) => [order.id, order]));
    const deliveryStats = new Map<string, { total: number; delivered: number }>();

    for (const payment of snapshot?.payments ?? []) {
      if (payment.status !== "received") continue;
      const order = orderById.get(payment.orderId);
      if (!order || order.currency !== payment.currency) continue;
      const cents = Math.round(payment.amount * 100);
      receivedByOrder.set(payment.orderId, (receivedByOrder.get(payment.orderId) ?? 0) + cents);
    }

    for (const delivery of snapshot?.deliveries ?? []) {
      const current = deliveryStats.get(delivery.orderId) ?? { total: 0, delivered: 0 };
      current.total += 1;
      if (delivery.status === "delivered") current.delivered += 1;
      deliveryStats.set(delivery.orderId, current);
    }

    return orders
      .map((order) => {
        if (order.status === "cancelled" || order.status === "refunded") return null;
        const orderCents = Math.round(order.amount * 100);
        const receivedCents = receivedByOrder.get(order.id) ?? 0;
        const outstandingCents = Math.max(0, orderCents - receivedCents);
        const stats = deliveryStats.get(order.id) ?? { total: 0, delivered: 0 };
        const deliveryComplete = stats.total > 0 && stats.delivered === stats.total;
        const settlementComplete = outstandingCents === 0;

        if (deliveryComplete && settlementComplete) return { order, receivedCents, outstandingCents, deliveryCount: stats.total, deliveredCount: stats.delivered, action: "已闭环" as const, priority: 3 };
        if (deliveryComplete) return { order, receivedCents, outstandingCents, deliveryCount: stats.total, deliveredCount: stats.delivered, action: "优先收款" as const, priority: 0 };
        if (settlementComplete) return { order, receivedCents, outstandingCents, deliveryCount: stats.total, deliveredCount: stats.delivered, action: "继续交付" as const, priority: 1 };
        return { order, receivedCents, outstandingCents, deliveryCount: stats.total, deliveredCount: stats.delivered, action: "交付并收款" as const, priority: 2 };
      })
      .filter((item): item is RevenueClosureReadiness => item !== null)
      .sort((a, b) => a.priority - b.priority || b.outstandingCents - a.outstandingCents || b.order.updatedAt - a.order.updatedAt);
  }, [orders, snapshot?.deliveries, snapshot?.payments]);

  const revenueIntegrityExceptions = useMemo<RevenueIntegrityException[]>(() => {
    const result: RevenueIntegrityException[] = [];
    const deliveriesByOrder = new Map<string, DeliveryRecord[]>();
    const paymentsByOrder = new Map<string, PaymentRecord[]>();

    for (const delivery of snapshot?.deliveries ?? []) {
      const current = deliveriesByOrder.get(delivery.orderId) ?? [];
      current.push(delivery);
      deliveriesByOrder.set(delivery.orderId, current);
    }
    for (const payment of snapshot?.payments ?? []) {
      const current = paymentsByOrder.get(payment.orderId) ?? [];
      current.push(payment);
      paymentsByOrder.set(payment.orderId, current);
    }

    for (const order of orders) {
      if (order.status === "cancelled" || order.status === "refunded") continue;
      const payments = paymentsByOrder.get(order.id) ?? [];
      const deliveries = deliveriesByOrder.get(order.id) ?? [];
      const receivedCents = payments
        .filter((payment) => payment.status === "received" && payment.currency === order.currency)
        .reduce((sum, payment) => sum + Math.round(payment.amount * 100), 0);
      const orderCents = Math.round(order.amount * 100);
      const mismatched = payments.filter((payment) => payment.currency !== order.currency && payment.status !== "void");
      const pendingCount = payments.filter((payment) => payment.status === "pending" && payment.currency === order.currency).length;
      const deliveryComplete = deliveries.length > 0 && deliveries.every((delivery) => delivery.status === "delivered");

      if (mismatched.length > 0) result.push({ order, kind: "currency-mismatch", label: "收款币种不一致", detail: `${mismatched.length} 笔有效收款记录与订单币种 ${order.currency} 不一致`, target: "payment", priority: 0 });
      if (receivedCents > orderCents) result.push({ order, kind: "over-collected", label: "存在超收", detail: `超收 ${money((receivedCents - orderCents) / 100, order.currency)}，需要人工核对`, target: "payment", priority: 1 });
      if (receivedCents >= orderCents && pendingCount > 0) result.push({ order, kind: "settled-with-pending", label: "收清后仍有待确认", detail: `已收清但仍有 ${pendingCount} 笔同币种待确认收款`, target: "payment", priority: 2 });
      if (order.status === "paid" && receivedCents < orderCents) result.push({ order, kind: "paid-with-balance", label: "订单状态与收款记录不一致", detail: `订单标记已收款，但仍差 ${money((orderCents - receivedCents) / 100, order.currency)}`, target: "payment", priority: 0 });
      if (order.status === "delivered" && !deliveryComplete) result.push({ order, kind: "delivered-without-complete-delivery", label: "订单状态与交付记录不一致", detail: deliveries.length === 0 ? "订单标记已交付，但没有交付记录" : "订单标记已交付，但仍有未完成交付事项", target: "delivery", priority: 1 });
    }

    return result.sort((a, b) => a.priority - b.priority || b.order.updatedAt - a.order.updatedAt);
  }, [orders, snapshot?.deliveries, snapshot?.payments]);

  const revenueControlCenter = useMemo(() => {
    const closedOrders = revenueClosureReadiness.filter((item) => item.action === "已闭环").length;
    const activeOrders = revenueClosureReadiness.length - closedOrders;
    const exceptionOrders = new Set(revenueIntegrityExceptions.map((item) => item.order.id)).size;
    const outstandingByCurrency = new Map<string, number>();

    for (const item of collectionActions) {
      outstandingByCurrency.set(item.order.currency, (outstandingByCurrency.get(item.order.currency) ?? 0) + item.outstandingCents);
    }

    return {
      activeOrders,
      closedOrders,
      exceptionOrders,
      collectionActions: collectionActions.length,
      outstanding: Array.from(outstandingByCurrency.entries()).sort(([a], [b]) => a.localeCompare(b)),
    };
  }, [collectionActions, revenueClosureReadiness, revenueIntegrityExceptions]);

  function focusRevenueControl(target: "collection" | "integrity" | "delivery" | "payment") {
    const targetId = target === "collection"
      ? "revenue-collection-actions"
      : target === "integrity"
        ? "revenue-integrity-review"
        : target === "delivery"
          ? "revenue-delivery-section"
          : "revenue-payment-section";
    setError("");
    setNotice("C168.17: Revenue Control Center navigation only. Founder manual confirmation remains required.");
    window.setTimeout(() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function focusRevenueIntegrityException(item: RevenueIntegrityException) {
    setSelectedOrderId(item.order.id);
    setPaymentCurrency(item.order.currency);
    setError("");
    setNotice(`C168.17 integrity review: ${item.label}. Founder manual review remains required.`);
    const targetId = item.target === "delivery" ? "revenue-delivery-section" : "revenue-payment-section";
    window.setTimeout(() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function focusRevenueClosure(item: RevenueClosureReadiness) {
    setSelectedOrderId(item.order.id);
    setPaymentCurrency(item.order.currency);
    setPaymentAmount((item.outstandingCents / 100).toFixed(2));
    setPaymentStatus("pending");
    setError("");
    setNotice(`C168.15: ${item.order.title} - ${item.action}. Founder manual confirmation remains required.`);
    const targetId = item.action === "继续交付" ? "revenue-delivery-section" : "revenue-payment-section";
    window.setTimeout(() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function focusSettlementClosure(item: SettlementClosure) {
    setSelectedOrderId(item.order.id);
    setPaymentCurrency(item.order.currency);
    setPaymentAmount("0.00");
    setPaymentStatus("pending");
    setNotice(item.excessCents > 0
      ? `C168.14: Found over-collected amount for ${item.order.title}. Please manually review the payment records.`
      : `C168.14: ${item.order.title} is fully recorded in the original currency. Please manually review the order and payment records.`);
    window.requestAnimationFrame(() => document.getElementById("revenue-payment-section")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function focusCollectionAction(item: CollectionAction) {
    setSelectedOrderId(item.order.id);
    setPaymentCurrency(item.order.currency);
    setPaymentAmount((item.outstandingCents / 100).toFixed(2));
    setPaymentStatus("pending");
    setNotice(`C168.13：已定位“${item.action}”订单。请人工确认真实收款后再保存记录。`);
    window.requestAnimationFrame(() => document.getElementById("revenue-payment-section")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  if (!authenticated) {
    return <main style={{ minHeight: "100vh", boxSizing: "border-box", padding: "28px 16px", background: "#09090b", color: "#fafafa" }}>
      <div style={{ maxWidth: 480, margin: "8vh auto 0", ...panelStyle() }}>
        <div style={{ color: "#a1a1aa", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em" }}>PRIVATE FOUNDER ACCESS</div>
        <h1 style={{ margin: "10px 0 8px", fontSize: 27 }}>收入与订单账本</h1>
        <p style={{ color: "#a1a1aa", fontSize: 13, lineHeight: 1.7 }}>记录报价、订单、交付和实际收款。金额统一使用标准货币单位，例如 CNY 99.00 = ¥99.00。</p>
        <form onSubmit={(event) => void submitLogin(event)}>
          <label style={{ display: "block", margin: "18px 0 12px" }}><span style={labelStyle()}>Founder Access Key</span><input value={accessKey} onChange={(event) => setAccessKey(event.target.value)} type="password" autoComplete="current-password" style={fieldStyle()} placeholder="输入 Founder Access Key" /></label>
          <button type="submit" disabled={loading} style={buttonStyle(loading, true)}>{loading ? "验证中..." : "进入收入账本"}</button>
        </form>
        {error && <p role="alert" style={{ color: "#fca5a5", fontSize: 13 }}>{error}</p>}
      </div>
    </main>;
  }

  return <main style={{ minHeight: "100vh", boxSizing: "border-box", padding: "22px 14px 52px", background: "#09090b", color: "#fafafa" }}>
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <div><div style={{ color: "#a1a1aa", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em" }}>C168.17 · FOUNDER ONLY</div><h1 style={{ margin: "8px 0 6px", fontSize: 29, lineHeight: 1.15 }}>收入与订单账本</h1><p style={{ margin: 0, color: "#a1a1aa", fontSize: 13, lineHeight: 1.7 }}>报价 → 订单 → 交付 → 收款记录 → 收款闭环 → 收款行动 → Follow-up Closure → Revenue Closure → Integrity Review → Control Center。只有有证据的实际收款才计入已记录收入。</p></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" onClick={() => void refresh(true)} disabled={loading} style={buttonStyle(loading)}>{loading ? "处理中..." : "刷新账本"}</button><button type="button" onClick={() => { window.sessionStorage.removeItem(STORAGE_KEY); setAuthenticated(false); setSnapshot(null); setAccessKey(""); setError(""); }} style={buttonStyle()}>退出</button></div>
      </header>

      {error && <div role="alert" style={{ ...panelStyle(), borderColor: "#7f1d1d", color: "#fecaca" }}>{error}</div>}
      {notice && <div role="status" style={{ ...panelStyle(), borderColor: "#365314", color: "#d9f99d" }}>{notice}</div>}

      {handoff && <section style={{ ...panelStyle(), borderColor: "#52525b" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><div style={{ color: "#a1a1aa", fontSize: 11 }}>C168.10 INBOUND → REVENUE</div><h2 style={{ margin: "6px 0", fontSize: 18 }}>已载入成交询盘上下文</h2></div><button type="button" onClick={() => { window.sessionStorage.removeItem(C168_HANDOFF_KEY); setHandoff(null); setCustomerLabel(""); setOrderTitle(""); setOrderScope(""); setOrderAmount(""); setNotice("C168.10 交接上下文已清除，未创建任何订单。"); }} style={buttonStyle()}>清除交接</button></div>
        <div style={{ color: "#a1a1aa", fontSize: 12, lineHeight: 1.8 }}>Lead ID: {handoff.leadId}<br />来源：{CHANNEL_LABELS[handoff.sourceChannel]}<br />业务：{handoff.businessType || "未填写"}<br />目标：{handoff.goal || "未填写"}<br />问题：{handoff.currentProblem || "未填写"}</div>
        <p style={{ margin: "10px 0 0", color: "#d4d4d8", fontSize: 12, lineHeight: 1.8 }}>这里只预填真实询盘上下文。成交金额保持空白，必须由 Founder 根据真实约定人工填写。只有点击“创建订单”后才写入 Revenue Ledger。</p>
      </section>}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 16 }}>
        <div style={panelStyle()}><div style={{ color: "#a1a1aa", fontSize: 12 }}>报价方案</div><div style={{ fontSize: 27, fontWeight: 750, marginTop: 8 }}>{snapshot?.offers.length ?? 0}</div></div>
        <div style={panelStyle()}><div style={{ color: "#a1a1aa", fontSize: 12 }}>订单总数</div><div style={{ fontSize: 27, fontWeight: 750, marginTop: 8 }}>{orders.length}</div></div>
        <div style={panelStyle()}><div style={{ color: "#a1a1aa", fontSize: 12 }}>交付事项</div><div style={{ fontSize: 27, fontWeight: 750, marginTop: 8 }}>{snapshot?.deliveries.length ?? 0}</div></div>
        <div style={panelStyle()}><div style={{ color: "#a1a1aa", fontSize: 12 }}>已记录收款（按币种）</div><div style={{ marginTop: 8, display: "grid", gap: 4 }}>{currencyTotals.length ? currencyTotals.map((item) => <strong key={item.currency} style={{ fontSize: 20 }}>{money(item.amount, item.currency)}</strong>) : <strong style={{ fontSize: 22 }}>-</strong>}</div></div>
      </section>

      <section style={panelStyle()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}><div><h2 style={{ margin: "0 0 6px", fontSize: 18 }}>00 · C168.11 收款闭环</h2><p style={{ margin: 0, color: "#a1a1aa", fontSize: 12, lineHeight: 1.7 }}>订单金额、已记录收款和待收金额仅按同一订单、同一币种计算，不进行跨币种换算。待确认收款不会计入已记录收入。</p></div><div style={{ minWidth: 150, border: "1px solid #3f3f46", borderRadius: 10, padding: 12 }}><div style={{ color: "#a1a1aa", fontSize: 11 }}>待确认收款记录</div><strong style={{ display: "block", marginTop: 5, fontSize: 22 }}>{collectionSummary.pendingPayments}</strong></div></div>
        <div style={{ display: "grid", gap: 8, marginTop: 14 }}>{collectionSummary.currencies.length ? collectionSummary.currencies.map((currency) => { const orderCents = collectionSummary.orderByCurrency.get(currency) ?? 0; const receivedCents = collectionSummary.receivedByCurrency.get(currency) ?? 0; const outstandingCents = collectionSummary.outstandingByCurrency.get(currency) ?? 0; return <div key={currency} style={{ border: "1px solid #3f3f46", borderRadius: 10, padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}><div><div style={{ color: "#a1a1aa", fontSize: 11 }}>币种</div><strong>{currency}</strong></div><div><div style={{ color: "#a1a1aa", fontSize: 11 }}>订单金额</div><strong>{money(orderCents / 100, currency)}</strong></div><div><div style={{ color: "#a1a1aa", fontSize: 11 }}>已记录收入</div><strong>{money(receivedCents / 100, currency)}</strong></div><div><div style={{ color: "#a1a1aa", fontSize: 11 }}>待收金额</div><strong>{money(outstandingCents / 100, currency)}</strong></div></div>; }) : <div style={{ border: "1px dashed #3f3f46", borderRadius: 10, padding: 14, color: "#71717a", fontSize: 12 }}>尚无订单或收款数据。</div>}</div>
        {collectionSummary.pendingPayments > 0 && <p style={{ margin: "12px 0 0", color: "#fbbf24", fontSize: 12, lineHeight: 1.7 }}>当前存在待确认收款记录。它们不会计入已记录收入，需 Founder 根据真实到账情况人工确认。</p>}
      </section>

      <section style={panelStyle()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}><div><h2 style={{ margin: "0 0 6px", fontSize: 18 }}>00.1 · C168.12 收款行动队列</h2><p style={{ margin: 0, color: "#a1a1aa", fontSize: 12, lineHeight: 1.7 }}>只显示仍存在待收金额的有效订单。这里的行动提示不会自动发送消息、创建付款或修改订单状态。</p></div><div style={{ minWidth: 150, border: "1px solid #3f3f46", borderRadius: 10, padding: 12 }}><div style={{ color: "#a1a1aa", fontSize: 11 }}>需要人工跟进</div><strong style={{ display: "block", marginTop: 5, fontSize: 22 }}>{collectionActions.length}</strong></div></div>
        <div style={{ display: "grid", gap: 8, marginTop: 14 }}>{collectionActions.length ? collectionActions.map((item) => <article key={item.order.id} style={{ border: "1px solid #3f3f46", borderRadius: 10, padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}><div><strong>{item.order.title}</strong><div style={{ color: "#a1a1aa", fontSize: 12, marginTop: 5 }}>{item.order.customerLabel} · {item.action}</div><div style={{ color: "#71717a", fontSize: 10, marginTop: 5 }}>订单状态：{ORDER_LABELS[item.order.status]}</div></div><strong>{money(item.outstandingCents / 100, item.order.currency)}</strong></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}><span style={{ color: "#a1a1aa", fontSize: 11 }}>订单 {money(item.order.amount, item.order.currency)} · 已收 {money(item.receivedCents / 100, item.order.currency)}</span><button type="button" disabled={loading} onClick={() => focusCollectionAction(item)} style={buttonStyle(loading, true)}>用于收款记录</button></div></article>) : <div style={{ border: "1px dashed #3f3f46", borderRadius: 10, padding: 14, color: "#71717a", fontSize: 12 }}>当前没有需要人工跟进的待收订单。</div>}</div>
      </section>

      <section style={panelStyle()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}><div><h2 style={{ margin: "0 0 6px", fontSize: 18 }}>00.2 · C168.13 Revenue Follow-up Closure</h2><p style={{ margin: 0, color: "#a1a1aa", fontSize: 12, lineHeight: 1.7 }}>把“待收金额”直接转成 Founder 的下一步行动。系统只做排序、定位和表单预填，不自动联系客户、不自动发送消息、不自动确认收款。</p></div><div style={{ minWidth: 150, border: "1px solid #3f3f46", borderRadius: 10, padding: 12 }}><div style={{ color: "#a1a1aa", fontSize: 11 }}>待执行行动</div><strong style={{ display: "block", marginTop: 5, fontSize: 22 }}>{collectionActions.length}</strong></div></div>
        <div style={{ display: "grid", gap: 8, marginTop: 14 }}>{collectionActions.length ? collectionActions.map((item) => <article key={item.order.id} style={{ border: "1px solid #3f3f46", borderRadius: 10, padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}><div><strong>{item.order.title}</strong><div style={{ color: "#a1a1aa", fontSize: 12, marginTop: 5 }}>{item.order.customerLabel} · {ORDER_LABELS[item.order.status]}</div><div style={{ color: "#71717a", fontSize: 11, marginTop: 5 }}>建议动作：{item.action}</div></div><strong>{money(item.outstandingCents / 100, item.order.currency)}</strong></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}><span style={{ color: "#a1a1aa", fontSize: 11 }}>订单 {money(item.order.amount, item.order.currency)} · 已收 {money(item.receivedCents / 100, item.order.currency)} · 待收 {money(item.outstandingCents / 100, item.order.currency)}</span><button type="button" disabled={loading} onClick={() => focusCollectionAction(item)} style={buttonStyle(loading, true)}>{item.action}</button></div></article>) : <div style={{ border: "1px dashed #3f3f46", borderRadius: 10, padding: 14, color: "#71717a", fontSize: 12 }}>当前没有待收订单。已收清订单不会进入行动队列。</div>}</div>
        <p style={{ margin: "12px 0 0", color: "#71717a", fontSize: 11, lineHeight: 1.8 }}>行动优先级：已交付未收款 → 优先收款；已报价/待付款 → 跟进付款；交付中 → 确认交付后收款。已收清、已取消、已退款订单不进入队列。多币种仍按订单原币种独立计算。</p>
      </section>

      <section style={panelStyle()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}><div><h2 style={{ margin: "0 0 6px", fontSize: 18 }}>00.3 · C168.14 Settlement Closure</h2><p style={{ margin: 0, color: "#a1a1aa", fontSize: 12, lineHeight: 1.7 }}>识别已经按原币种收清的订单，并把超收或仍有待确认记录的异常显式交给 Founder 复核。系统不会自动改订单状态，也不会自动退款或冲销。</p></div><div style={{ minWidth: 150, border: "1px solid #3f3f46", borderRadius: 10, padding: 12 }}><div style={{ color: "#a1a1aa", fontSize: 11 }}>已收清订单</div><strong style={{ display: "block", marginTop: 5, fontSize: 22 }}>{settlementClosures.length}</strong></div></div>
        <div style={{ display: "grid", gap: 8, marginTop: 14 }}>{settlementClosures.length ? settlementClosures.map((item) => <article key={item.order.id} style={{ border: "1px solid #3f3f46", borderRadius: 10, padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}><div><strong>{item.order.title}</strong><div style={{ color: "#a1a1aa", fontSize: 12, marginTop: 5 }}>{item.order.customerLabel} · {ORDER_LABELS[item.order.status]}</div><div style={{ color: item.excessCents > 0 ? "#fca5a5" : "#a1a1aa", fontSize: 11, marginTop: 5 }}>{item.excessCents > 0 ? `超收 ${money(item.excessCents / 100, item.order.currency)}，需要人工核对` : "已按订单金额收清"}{item.pendingCount > 0 ? ` · ${item.pendingCount} 笔待确认收款` : ""}</div></div><strong>{money(item.receivedCents / 100, item.order.currency)}</strong></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}><span style={{ color: "#a1a1aa", fontSize: 11 }}>订单 {money(item.orderCents / 100, item.order.currency)} · 已收 {money(item.receivedCents / 100, item.order.currency)}</span><button type="button" disabled={loading} onClick={() => focusSettlementClosure(item)} style={buttonStyle(loading, item.excessCents > 0)}>人工复核收款</button></div></article>) : <div style={{ border: "1px dashed #3f3f46", borderRadius: 10, padding: 14, color: "#71717a", fontSize: 12 }}>当前没有已收清订单。</div>}</div>
        <p style={{ margin: "12px 0 0", color: "#71717a", fontSize: 11, lineHeight: 1.8 }}>收清判断只比较同一订单、同一币种的“已记录收款”与订单金额。超收不会被隐藏；待确认收款不会计入收清金额。订单状态保持人工控制，避免把“已交付”和“已收款”两个业务事实互相覆盖。</p>
      </section>

      <section style={panelStyle()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}><div><h2 style={{ margin: "0 0 6px", fontSize: 18 }}>00.4 · C168.15 Revenue Closure Readiness</h2><p style={{ margin: 0, color: "#a1a1aa", fontSize: 12, lineHeight: 1.7 }}>把订单的交付完成度与同币种已记录收款放在同一视图中，明确下一步是继续交付、优先收款，还是已经完成业务闭环。不会自动改变订单、交付或收款状态。</p></div><div style={{ minWidth: 150, border: "1px solid #3f3f46", borderRadius: 10, padding: 12 }}><div style={{ color: "#a1a1aa", fontSize: 11 }}>已闭环订单</div><strong style={{ display: "block", marginTop: 5, fontSize: 22 }}>{revenueClosureReadiness.filter((item) => item.action === "已闭环").length}</strong></div></div>
        <div style={{ display: "grid", gap: 8, marginTop: 14 }}>{revenueClosureReadiness.length ? revenueClosureReadiness.map((item) => <article key={item.order.id} style={{ border: "1px solid #3f3f46", borderRadius: 10, padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}><div><strong>{item.order.title}</strong><div style={{ color: "#a1a1aa", fontSize: 12, marginTop: 5 }}>{item.order.customerLabel} · {ORDER_LABELS[item.order.status]}</div><div style={{ color: "#71717a", fontSize: 11, marginTop: 5 }}>交付 {item.deliveredCount}/{item.deliveryCount} · 已收 {money(item.receivedCents / 100, item.order.currency)} · 待收 {money(item.outstandingCents / 100, item.order.currency)}</div></div><strong>{item.action}</strong></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}><span style={{ color: "#a1a1aa", fontSize: 11 }}>{item.action === "已闭环" ? "交付与收款均已按现有记录完成" : `下一步：${item.action}`}</span>{item.action !== "已闭环" && <button type="button" disabled={loading} onClick={() => focusRevenueClosure(item)} style={buttonStyle(loading, item.action === "优先收款")}>定位下一步</button>}</div></article>) : <div style={{ border: "1px dashed #3f3f46", borderRadius: 10, padding: 14, color: "#71717a", fontSize: 12 }}>当前没有可评估的有效订单。</div>}</div>
        <p style={{ margin: "12px 0 0", color: "#71717a", fontSize: 11, lineHeight: 1.8 }}>闭环判断只使用现有账本事实：至少存在一项交付且全部为 delivered，同时同一订单、同一币种的已记录收款达到订单金额。没有交付记录不会被误判为交付完成；取消和退款订单不进入闭环队列。</p>
      </section>

      <section id="revenue-integrity-review" style={panelStyle()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}><div><h2 style={{ margin: "0 0 6px", fontSize: 18 }}>00.5 · C168.16 Revenue Integrity Review</h2><p style={{ margin: 0, color: "#a1a1aa", fontSize: 12, lineHeight: 1.7 }}>把收入闭环中的数据冲突集中成 Founder 人工复核队列：币种不一致、超收、收清后仍有待确认、订单已收款但账本仍有余额，以及订单已交付但交付记录未完成。</p></div><div style={{ minWidth: 150, border: "1px solid #3f3f46", borderRadius: 10, padding: 12 }}><div style={{ color: "#a1a1aa", fontSize: 11 }}>待复核异常</div><strong style={{ display: "block", marginTop: 5, fontSize: 22 }}>{revenueIntegrityExceptions.length}</strong></div></div>
        <div style={{ display: "grid", gap: 8, marginTop: 14 }}>{revenueIntegrityExceptions.length ? revenueIntegrityExceptions.map((item, index) => <article key={`${item.order.id}-${item.kind}-${index}`} style={{ border: "1px solid #3f3f46", borderRadius: 10, padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}><div><strong>{item.label}</strong><div style={{ color: "#a1a1aa", fontSize: 12, marginTop: 5 }}>{item.order.customerLabel} · {item.order.title}</div><div style={{ color: "#71717a", fontSize: 11, marginTop: 5 }}>{item.detail}</div></div><span style={{ color: "#fca5a5", fontSize: 12 }}>需要人工复核</span></div><div style={{ marginTop: 10 }}><button type="button" disabled={loading} onClick={() => focusRevenueIntegrityException(item)} style={buttonStyle(loading, item.priority === 0)}>定位复核</button></div></article>) : <div style={{ border: "1px dashed #3f3f46", borderRadius: 10, padding: 14, color: "#71717a", fontSize: 12 }}>当前未发现 C168.16 定义的数据一致性异常。</div>}</div>
        <p style={{ margin: "12px 0 0", color: "#71717a", fontSize: 11, lineHeight: 1.8 }}>这里只做现有记录之间的一致性检查，不代表银行、支付平台或客户侧事实验证。系统不会自动改币种、订单状态、交付状态、收款状态，也不会自动退款或冲销。</p>
      </section>

      <section style={panelStyle()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}><div><h2 style={{ margin: "0 0 6px", fontSize: 18 }}>00.6 · C168.17 Revenue Control Center</h2><p style={{ margin: 0, color: "#a1a1aa", fontSize: 12, lineHeight: 1.7 }}>把待收款、数据异常、进行中订单与已闭环订单压缩到一个 Founder 操作入口。这里只做导航与现有事实汇总，不自动执行任何业务动作。</p></div><div style={{ minWidth: 150, border: "1px solid #3f3f46", borderRadius: 10, padding: 12 }}><div style={{ color: "#a1a1aa", fontSize: 11 }}>当前进行中</div><strong style={{ display: "block", marginTop: 5, fontSize: 22 }}>{revenueControlCenter.activeOrders}</strong></div></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 14 }}>
          <div style={{ border: "1px solid #3f3f46", borderRadius: 10, padding: 12 }}><div style={{ color: "#a1a1aa", fontSize: 11 }}>待收款行动</div><strong style={{ display: "block", marginTop: 5, fontSize: 20 }}>{revenueControlCenter.collectionActions}</strong></div>
          <div style={{ border: "1px solid #3f3f46", borderRadius: 10, padding: 12 }}><div style={{ color: "#a1a1aa", fontSize: 11 }}>异常订单</div><strong style={{ display: "block", marginTop: 5, fontSize: 20 }}>{revenueControlCenter.exceptionOrders}</strong></div>
          <div style={{ border: "1px solid #3f3f46", borderRadius: 10, padding: 12 }}><div style={{ color: "#a1a1aa", fontSize: 11 }}>已闭环订单</div><strong style={{ display: "block", marginTop: 5, fontSize: 20 }}>{revenueControlCenter.closedOrders}</strong></div>
        </div>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>{revenueControlCenter.outstanding.length ? revenueControlCenter.outstanding.map(([currency, cents]) => <div key={currency} style={{ display: "flex", justifyContent: "space-between", gap: 12, border: "1px solid #27272a", borderRadius: 9, padding: 10 }}><span style={{ color: "#a1a1aa", fontSize: 12 }}>{currency} 待收</span><strong>{money(cents / 100, currency)}</strong></div>) : <div style={{ color: "#71717a", fontSize: 12 }}>当前没有待收余额。</div>}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}><button type="button" disabled={loading} onClick={() => focusRevenueControl("collection")} style={buttonStyle(loading, revenueControlCenter.collectionActions > 0)}>处理待收款</button><button type="button" disabled={loading} onClick={() => focusRevenueControl("integrity")} style={buttonStyle(loading, revenueControlCenter.exceptionOrders > 0)}>复核异常</button><button type="button" disabled={loading} onClick={() => focusRevenueControl("delivery")} style={buttonStyle(loading)}>查看交付</button><button type="button" disabled={loading} onClick={() => focusRevenueControl("payment")} style={buttonStyle(loading)}>查看收款</button></div>
        <p style={{ margin: "12px 0 0", color: "#71717a", fontSize: 11, lineHeight: 1.8 }}>待收余额继续按订单原币种分别汇总，不进行跨币种换算。异常订单按订单去重计数；所有修正、状态变更和实际收款仍由 Founder 人工确认。</p>
      </section>

      <section style={panelStyle()}><h2 style={{ margin: "0 0 6px", fontSize: 18 }}>01 · 创建报价方案</h2><p style={{ margin: "0 0 16px", color: "#a1a1aa", fontSize: 12, lineHeight: 1.7 }}>报价金额直接使用标准货币单位，不输入分。例如输入 99.00 即为 ¥99.00。</p><form onSubmit={(event) => { event.preventDefault(); const price = currencyInput(offerPrice); if (!offerName.trim() || price === null) { setError("请填写报价名称和有效金额（最多两位小数）。"); return; } void runAction({ mode: "create-offer", name: offerName.trim(), description: offerDescription, currency: offerCurrency, price, deliveryDays: Number(offerDays) || 7, status: "draft" }, "报价方案已保存。").then(() => { setOfferName(""); setOfferDescription(""); }); }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}><label><span style={labelStyle()}>方案名称 *</span><input value={offerName} onChange={(event) => setOfferName(event.target.value)} style={fieldStyle()} required maxLength={200} /></label><label><span style={labelStyle()}>金额 *</span><input value={offerPrice} onChange={(event) => setOfferPrice(event.target.value)} style={fieldStyle()} inputMode="decimal" required /></label><label><span style={labelStyle()}>币种</span><select value={offerCurrency} onChange={(event) => setOfferCurrency(event.target.value)} style={fieldStyle()}><option value="CNY">CNY - 人民币</option><option value="JPY">JPY - 日元</option><option value="USD">USD - 美元</option><option value="HKD">HKD - 港币</option></select></label><label><span style={labelStyle()}>交付周期（天）</span><input value={offerDays} onChange={(event) => setOfferDays(event.target.value)} style={fieldStyle()} type="number" min="1" max="3650" /></label><label style={{ gridColumn: "1 / -1" }}><span style={labelStyle()}>说明</span><textarea value={offerDescription} onChange={(event) => setOfferDescription(event.target.value)} style={{ ...fieldStyle(), minHeight: 76, resize: "vertical" }} maxLength={4000} /></label><div><button type="submit" disabled={loading} style={buttonStyle(loading, true)}>保存报价方案</button></div></form><div style={{ marginTop: 14, display: "grid", gap: 8 }}>{(snapshot?.offers ?? []).map((offer) => <article key={offer.id} style={{ border: "1px solid #3f3f46", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}><div><strong>{offer.name}</strong><div style={{ color: "#a1a1aa", fontSize: 12, marginTop: 5 }}>{offer.description || "无补充说明"} · {offer.deliveryDays} 天 · {offer.status}</div></div><strong>{money(offer.price, offer.currency)}</strong></article>)}</div></section>

      <section style={panelStyle()}><h2 style={{ margin: "0 0 14px", fontSize: 18 }}>02 · 记录订单</h2><form onSubmit={(event) => { event.preventDefault(); const amount = currencyInput(orderAmount); if (!customerLabel.trim() || !orderTitle.trim() || amount === null) { setError("请填写客户、订单名称和真实有效金额。"); return; } const leadId = handoff?.leadId ?? null; void runAction({ mode: "create-order", leadId, customerLabel: customerLabel.trim(), title: orderTitle.trim(), amount, currency: orderCurrency, scope: orderScope, status: "quoted", note: handoff ? `C168.10 inbound handoff · ${CHANNEL_LABELS[handoff.sourceChannel]}${handoff.note ? ` · ${handoff.note}` : ""}` : "" }, "订单已创建。").then(() => { if (handoff) window.sessionStorage.removeItem(C168_HANDOFF_KEY); setHandoff(null); setCustomerLabel(""); setOrderTitle(""); setOrderAmount(""); setOrderScope(""); }); }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}><label><span style={labelStyle()}>客户名称或代号 *</span><input value={customerLabel} onChange={(event) => setCustomerLabel(event.target.value)} style={fieldStyle()} required maxLength={200} /></label><label><span style={labelStyle()}>订单名称 *</span><input value={orderTitle} onChange={(event) => setOrderTitle(event.target.value)} style={fieldStyle()} required maxLength={200} /></label><label><span style={labelStyle()}>订单金额 *</span><input value={orderAmount} onChange={(event) => setOrderAmount(event.target.value)} style={fieldStyle()} inputMode="decimal" required placeholder={handoff ? "请填写真实成交金额" : "例如 99.00"} /></label><label><span style={labelStyle()}>币种</span><select value={orderCurrency} onChange={(event) => setOrderCurrency(event.target.value)} style={fieldStyle()}><option value="CNY">CNY - 人民币</option><option value="JPY">JPY - 日元</option><option value="USD">USD - 美元</option><option value="HKD">HKD - 港币</option></select></label><label style={{ gridColumn: "1 / -1" }}><span style={labelStyle()}>订单范围 / 约定</span><textarea value={orderScope} onChange={(event) => setOrderScope(event.target.value)} style={{ ...fieldStyle(), minHeight: 66, resize: "vertical" }} maxLength={4000} /></label><div><button type="submit" disabled={loading} style={buttonStyle(loading, true)}>创建订单</button></div></form><div style={{ display: "grid", gap: 9, marginTop: 16 }}>{orders.length ? orders.map((order) => <article key={order.id} style={{ border: "1px solid #3f3f46", borderRadius: 10, padding: 13 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}><div><strong>{order.title}</strong><div style={{ color: "#a1a1aa", fontSize: 12, marginTop: 5 }}>{order.customerLabel} · {ORDER_LABELS[order.status]}</div><div style={{ color: "#71717a", fontSize: 10, marginTop: 5 }}>ID: {order.id}{order.leadId ? ` · Lead: ${order.leadId}` : ""}</div></div><strong>{money(order.amount, order.currency)}</strong></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}><select aria-label="订单状态" value={order.status} disabled={loading} onChange={(event) => void runAction({ mode: "update-order", id: order.id, status: event.target.value }, "订单状态已更新。")} style={{ ...fieldStyle(), width: "auto", minWidth: 150 }}>{ORDER_STATUSES.map((status) => <option key={status} value={status}>{ORDER_LABELS[status]}</option>)}</select><button type="button" disabled={loading} onClick={() => setSelectedOrderId(order.id)} style={buttonStyle(false, activeOrderId === order.id)}>{activeOrderId === order.id ? "当前选中" : "用于交付/收款"}</button></div></article>) : <p style={{ color: "#a1a1aa", fontSize: 13 }}>尚无订单。先创建一笔报价或订单。</p>}</div></section>

      <section id="revenue-delivery-section" style={panelStyle()}><h2 style={{ margin: "0 0 6px", fontSize: 18 }}>03 · 交付记录</h2><p style={{ color: "#a1a1aa", fontSize: 12, lineHeight: 1.7, margin: "0 0 14px" }}>创建交付事项前，请在订单列表中选择对应订单。</p><form onSubmit={(event) => { event.preventDefault(); if (!activeOrderId || !deliveryTitle.trim()) { setError("请先选择订单并填写交付事项名称。"); return; } void runAction({ mode: "create-delivery", orderId: activeOrderId, title: deliveryTitle.trim(), description: deliveryDescription, status: "not-started" }, "交付事项已创建。").then(() => { setDeliveryTitle(""); setDeliveryDescription(""); }); }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}><label><span style={labelStyle()}>关联订单</span><select value={activeOrderId} onChange={(event) => setSelectedOrderId(event.target.value)} style={fieldStyle()} disabled={!orders.length}><option value="">请选择订单</option>{orders.map((order) => <option key={order.id} value={order.id}>{order.customerLabel} - {order.title}</option>)}</select></label><label><span style={labelStyle()}>交付事项名称 *</span><input value={deliveryTitle} onChange={(event) => setDeliveryTitle(event.target.value)} style={fieldStyle()} required maxLength={200} /></label><label style={{ gridColumn: "1 / -1" }}><span style={labelStyle()}>交付说明</span><textarea value={deliveryDescription} onChange={(event) => setDeliveryDescription(event.target.value)} style={{ ...fieldStyle(), minHeight: 66, resize: "vertical" }} /></label><div><button type="submit" disabled={loading || !orders.length} style={buttonStyle(loading || !orders.length, true)}>创建交付事项</button></div></form><div style={{ display: "grid", gap: 8, marginTop: 14 }}>{(snapshot?.deliveries ?? []).map((item) => { const order = orders.find((candidate) => candidate.id === item.orderId); return <article key={item.id} style={{ border: "1px solid #3f3f46", borderRadius: 10, padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><strong>{item.title}</strong><div style={{ color: "#a1a1aa", fontSize: 12, marginTop: 5 }}>{order ? `${order.customerLabel} · ${order.title}` : item.orderId}</div></div><select aria-label="交付状态" value={item.status} disabled={loading} onChange={(event) => void runAction({ mode: "update-delivery", id: item.id, status: event.target.value }, "交付状态已更新。")} style={{ ...fieldStyle(), width: "auto", minWidth: 140 }}>{DELIVERY_STATUSES.map((status) => <option key={status} value={status}>{DELIVERY_LABELS[status]}</option>)}</select></div>{item.description && <p style={{ color: "#a1a1aa", fontSize: 12, lineHeight: 1.7 }}>{item.description}</p>}</article>; })}</div></section>

      <section id="revenue-payment-section" style={panelStyle()}><h2 style={{ margin: "0 0 6px", fontSize: 18 }}>04 · 收款记录</h2><p style={{ margin: "0 0 14px", color: "#a1a1aa", fontSize: 12, lineHeight: 1.7 }}>只有确实收到款项后，才选择“已记录收款”，并填写收款时间与人工核验备注。系统不会连接银行或支付平台验证交易。</p><form onSubmit={(event) => { event.preventDefault(); const amount = currencyInput(paymentAmount); if (!activeOrderId || amount === null) { setError("请先选择订单，并填写有效收款金额。"); return; } if (paymentStatus === "received" && !paymentEvidence.trim()) { setError("记录实际收款必须填写人工收款证据备注。"); return; } void runAction({ mode: "create-payment", orderId: activeOrderId, currency: paymentCurrency, amount, method: paymentMethod, status: paymentStatus, ...(paymentStatus === "received" ? { receivedAt: Date.now(), evidenceNote: paymentEvidence.trim() } : { evidenceNote: paymentEvidence.trim() }), externalReference: paymentReference.trim() }, "收款记录已保存。").then(() => { setPaymentEvidence(""); setPaymentReference(""); }); }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}><label><span style={labelStyle()}>关联订单</span><select value={activeOrderId} onChange={(event) => setSelectedOrderId(event.target.value)} style={fieldStyle()} disabled={!orders.length}><option value="">请选择订单</option>{orders.map((order) => <option key={order.id} value={order.id}>{order.customerLabel} - {order.title}</option>)}</select></label><label><span style={labelStyle()}>收款金额 *</span><input value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} style={fieldStyle()} inputMode="decimal" required /></label><label><span style={labelStyle()}>币种</span><select value={paymentCurrency} onChange={(event) => setPaymentCurrency(event.target.value)} style={fieldStyle()}><option value="CNY">CNY - 人民币</option><option value="JPY">JPY - 日元</option><option value="USD">USD - 美元</option><option value="HKD">HKD - 港币</option></select></label><label><span style={labelStyle()}>收款方式</span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} style={fieldStyle()}>{PAYMENT_METHODS.map((method) => <option key={method} value={method}>{METHOD_LABELS[method]}</option>)}</select></label><label><span style={labelStyle()}>收款状态</span><select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus)} style={fieldStyle()}>{PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{PAYMENT_LABELS[status]}</option>)}</select></label><label><span style={labelStyle()}>外部订单号 / 参考号</span><input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} style={fieldStyle()} maxLength={300} /></label><label style={{ gridColumn: "1 / -1" }}><span style={labelStyle()}>人工收款证据备注{paymentStatus === "received" ? " *" : ""}</span><textarea value={paymentEvidence} onChange={(event) => setPaymentEvidence(event.target.value)} style={{ ...fieldStyle(), minHeight: 66, resize: "vertical" }} maxLength={2000} placeholder="例如：已核对平台订单状态和到账记录。不要填写密码或完整支付凭证。" /></label><div><button type="submit" disabled={loading || !orders.length} style={buttonStyle(loading || !orders.length, true)}>保存收款记录</button></div></form><div style={{ display: "grid", gap: 8, marginTop: 14 }}>{(snapshot?.payments ?? []).map((payment) => { const order = orders.find((candidate) => candidate.id === payment.orderId); return <article key={payment.id} style={{ border: "1px solid #3f3f46", borderRadius: 10, padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}><div><strong>{money(payment.amount, payment.currency)}</strong><div style={{ color: "#a1a1aa", fontSize: 12, marginTop: 5 }}>{order ? `${order.customerLabel} · ${order.title}` : payment.orderId}</div><div style={{ color: "#71717a", fontSize: 11, marginTop: 4 }}>{METHOD_LABELS[payment.method]} · {timeLabel(payment.receivedAt)}</div></div><select aria-label="收款状态" value={payment.status} disabled={loading} onChange={(event) => { const status = event.target.value as PaymentStatus; if (status === "received" && (!payment.receivedAt || !payment.evidenceNote.trim())) { setError("该笔记录缺少收款时间或人工证据备注，不能直接改为已收款。请新建完整收款记录。"); return; } void runAction({ mode: "update-payment", id: payment.id, status }, "收款状态已更新。"); }} style={{ ...fieldStyle(), width: "auto", minWidth: 140 }}>{PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{PAYMENT_LABELS[status]}</option>)}</select></div>{payment.evidenceNote && <p style={{ color: "#a1a1aa", fontSize: 12, lineHeight: 1.7, marginBottom: 0 }}>备注：{payment.evidenceNote}</p>}</article>; })}</div></section>

      <section style={{ ...panelStyle(), background: "#0c0c0f" }}><h2 style={{ margin: "0 0 8px", fontSize: 15 }}>记录边界</h2><p style={{ margin: 0, color: "#a1a1aa", fontSize: 12, lineHeight: 1.9 }}>{snapshot?.note || "收入数据仅表示手动登记记录。"}</p><p style={{ margin: "8px 0 0", color: "#71717a", fontSize: 11, lineHeight: 1.8 }}>C168.17 在 C168.16 基础上增加 Revenue Control Center：把待收款行动、异常订单、进行中订单、已闭环订单和分币种待收余额汇总为 Founder 操作入口；不改变收入账本数据结构，不自动执行任何业务动作。所有金额最多两位小数，多币种分别显示，不直接相加为单一总额。C168.10 交接只携带真实询盘上下文和 leadId，不自动创建订单、不自动确认金额、不自动生成付款。此页面不自动联系客户、不发起付款、不执行外部平台操作。</p></section>
    </div>
  </main>;
}
