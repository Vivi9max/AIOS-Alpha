"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";

const STORAGE_KEY = "aios-founder-access-key";
const ENDPOINT = "/api/founder/revenue";

type OfferStatus = "draft" | "active" | "paused" | "archived";
type OrderStatus = "quoted" | "awaiting-payment" | "paid" | "in-delivery" | "delivered" | "cancelled" | "refunded";
type DeliveryStatus = "not-started" | "in-progress" | "delivered" | "revision-requested";
type PaymentStatus = "pending" | "received" | "refunded" | "void";
type PaymentMethod = "bank-transfer" | "platform-order" | "cash" | "other" | "unknown";

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

export default function FounderRevenuePage() {
  const [accessKey, setAccessKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [offerName, setOfferName] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const [offerPrice, setOfferPrice] = useState("99.00");
  const [offerDays, setOfferDays] = useState("7");
  const [offerCurrency, setOfferCurrency] = useState("CNY");
  const [customerLabel, setCustomerLabel] = useState("");
  const [orderTitle, setOrderTitle] = useState("");
  const [orderAmount, setOrderAmount] = useState("99.00");
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
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${key}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
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
    if (stored) {
      setAccessKey(stored);
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
  const activeOrderId = useMemo(() => {
    if (selectedOrderId && orders.some((order) => order.id === selectedOrderId)) return selectedOrderId;
    return orders[0]?.id ?? "";
  }, [orders, selectedOrderId]);
  const receivedPayments = snapshot?.payments.filter((payment) => payment.status === "received") ?? [];
  const currencyTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const payment of receivedPayments) {
      const cents = Math.round(payment.amount * 100);
      totals.set(payment.currency, (totals.get(payment.currency) ?? 0) + cents);
    }
    return Array.from(totals.entries()).map(([currency, cents]) => ({ currency, amount: cents / 100 }));
  }, [receivedPayments]);

  if (!authenticated) {
    return (
      <main style={{ minHeight: "100vh", boxSizing: "border-box", padding: "28px 16px", background: "#09090b", color: "#fafafa" }}>
        <div style={{ maxWidth: 480, margin: "8vh auto 0", ...panelStyle() }}>
          <div style={{ color: "#a1a1aa", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em" }}>PRIVATE FOUNDER ACCESS</div>
          <h1 style={{ margin: "10px 0 8px", fontSize: 27 }}>收入与订单账本</h1>
          <p style={{ color: "#a1a1aa", fontSize: 13, lineHeight: 1.7 }}>记录报价、订单、交付和实际收款。金额统一使用标准货币单位，例如 CNY 99.00 = ¥99.00。</p>
          <form onSubmit={(event) => void submitLogin(event)}>
            <label style={{ display: "block", margin: "18px 0 12px" }}>
              <span style={labelStyle()}>Founder Access Key</span>
              <input value={accessKey} onChange={(event) => setAccessKey(event.target.value)} type="password" autoComplete="current-password" style={fieldStyle()} placeholder="输入 Founder Access Key" />
            </label>
            <button type="submit" disabled={loading} style={buttonStyle(loading, true)}>{loading ? "验证中..." : "进入收入账本"}</button>
          </form>
          {error && <p role="alert" style={{ color: "#fca5a5", fontSize: 13 }}>{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", boxSizing: "border-box", padding: "22px 14px 52px", background: "#09090b", color: "#fafafa" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <div style={{ color: "#a1a1aa", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em" }}>C144 · FOUNDER ONLY</div>
            <h1 style={{ margin: "8px 0 6px", fontSize: 29, lineHeight: 1.15 }}>收入与订单账本</h1>
            <p style={{ margin: 0, color: "#a1a1aa", fontSize: 13, lineHeight: 1.7 }}>报价 → 订单 → 交付 → 收款记录。只有有证据的实际收款才计入已记录收入。</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => void refresh(true)} disabled={loading} style={buttonStyle(loading)}>{loading ? "处理中..." : "刷新账本"}</button>
            <button type="button" onClick={() => { window.sessionStorage.removeItem(STORAGE_KEY); setAuthenticated(false); setSnapshot(null); setAccessKey(""); setError(""); }} style={buttonStyle()}>退出</button>
          </div>
        </header>

        {error && <div role="alert" style={{ ...panelStyle(), borderColor: "#7f1d1d", color: "#fecaca" }}>{error}</div>}
        {notice && <div role="status" style={{ ...panelStyle(), borderColor: "#365314", color: "#d9f99d" }}>{notice}</div>}

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 16 }}>
          <div style={panelStyle()}><div style={{ color: "#a1a1aa", fontSize: 12 }}>报价方案</div><div style={{ fontSize: 27, fontWeight: 750, marginTop: 8 }}>{snapshot?.offers.length ?? 0}</div></div>
          <div style={panelStyle()}><div style={{ color: "#a1a1aa", fontSize: 12 }}>订单总数</div><div style={{ fontSize: 27, fontWeight: 750, marginTop: 8 }}>{orders.length}</div></div>
          <div style={panelStyle()}><div style={{ color: "#a1a1aa", fontSize: 12 }}>交付事项</div><div style={{ fontSize: 27, fontWeight: 750, marginTop: 8 }}>{snapshot?.deliveries.length ?? 0}</div></div>
          <div style={panelStyle()}><div style={{ color: "#a1a1aa", fontSize: 12 }}>已记录收款（按币种）</div><div style={{ marginTop: 8, display: "grid", gap: 4 }}>{currencyTotals.length ? currencyTotals.map((item) => <strong key={item.currency} style={{ fontSize: 20 }}>{money(item.amount, item.currency)}</strong>) : <strong style={{ fontSize: 22 }}>-</strong>}</div></div>
        </section>

        <section style={panelStyle()}>
          <h2 style={{ margin: "0 0 6px", fontSize: 18 }}>01 · 创建报价方案</h2>
          <p style={{ margin: "0 0 16px", color: "#a1a1aa", fontSize: 12, lineHeight: 1.7 }}>报价金额直接使用标准货币单位，不输入分。例如输入 99.00 即为 ¥99.00。</p>
          <form onSubmit={(event) => { event.preventDefault(); const price = currencyInput(offerPrice); if (!offerName.trim() || price === null) { setError("请填写报价名称和有效金额（最多两位小数）。"); return; } void runAction({ mode: "create-offer", name: offerName.trim(), description: offerDescription, currency: offerCurrency, price, deliveryDays: Number(offerDays) || 7, status: "draft" }, "报价方案已保存。").then(() => { setOfferName(""); setOfferDescription(""); }); }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <label><span style={labelStyle()}>方案名称 *</span><input value={offerName} onChange={(event) => setOfferName(event.target.value)} style={fieldStyle()} required maxLength={200} /></label>
            <label><span style={labelStyle()}>金额 *</span><input value={offerPrice} onChange={(event) => setOfferPrice(event.target.value)} style={fieldStyle()} inputMode="decimal" required /></label>
            <label><span style={labelStyle()}>币种</span><select value={offerCurrency} onChange={(event) => setOfferCurrency(event.target.value)} style={fieldStyle()}><option value="CNY">CNY - 人民币</option><option value="JPY">JPY - 日元</option><option value="USD">USD - 美元</option><option value="HKD">HKD - 港币</option></select></label>
            <label><span style={labelStyle()}>交付周期（天）</span><input value={offerDays} onChange={(event) => setOfferDays(event.target.value)} style={fieldStyle()} type="number" min="1" max="3650" /></label>
            <label style={{ gridColumn: "1 / -1" }}><span style={labelStyle()}>说明</span><textarea value={offerDescription} onChange={(event) => setOfferDescription(event.target.value)} style={{ ...fieldStyle(), minHeight: 76, resize: "vertical" }} maxLength={4000} /></label>
            <div><button type="submit" disabled={loading} style={buttonStyle(loading, true)}>保存报价方案</button></div>
          </form>
          <div style={{ marginTop: 14, display: "grid", gap: 8 }}>{(snapshot?.offers ?? []).map((offer) => <article key={offer.id} style={{ border: "1px solid #3f3f46", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}><div><strong>{offer.name}</strong><div style={{ color: "#a1a1aa", fontSize: 12, marginTop: 5 }}>{offer.description || "无补充说明"} · {offer.deliveryDays} 天 · {offer.status}</div></div><strong>{money(offer.price, offer.currency)}</strong></article>)}</div>
        </section>

        <section style={panelStyle()}>
          <h2 style={{ margin: "0 0 14px", fontSize: 18 }}>02 · 记录订单</h2>
          <form onSubmit={(event) => { event.preventDefault(); const amount = currencyInput(orderAmount); if (!customerLabel.trim() || !orderTitle.trim() || amount === null) { setError("请填写客户、订单名称和有效金额。"); return; } void runAction({ mode: "create-order", customerLabel: customerLabel.trim(), title: orderTitle.trim(), amount, currency: orderCurrency, scope: orderScope, status: "quoted" }, "订单已创建。").then(() => { setCustomerLabel(""); setOrderTitle(""); setOrderScope(""); }); }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <label><span style={labelStyle()}>客户名称或代号 *</span><input value={customerLabel} onChange={(event) => setCustomerLabel(event.target.value)} style={fieldStyle()} required maxLength={200} /></label>
            <label><span style={labelStyle()}>订单名称 *</span><input value={orderTitle} onChange={(event) => setOrderTitle(event.target.value)} style={fieldStyle()} required maxLength={200} /></label>
            <label><span style={labelStyle()}>订单金额 *</span><input value={orderAmount} onChange={(event) => setOrderAmount(event.target.value)} style={fieldStyle()} inputMode="decimal" required /></label>
            <label><span style={labelStyle()}>币种</span><select value={orderCurrency} onChange={(event) => setOrderCurrency(event.target.value)} style={fieldStyle()}><option value="CNY">CNY - 人民币</option><option value="JPY">JPY - 日元</option><option value="USD">USD - 美元</option><option value="HKD">HKD - 港币</option></select></label>
            <label style={{ gridColumn: "1 / -1" }}><span style={labelStyle()}>订单范围 / 约定</span><textarea value={orderScope} onChange={(event) => setOrderScope(event.target.value)} style={{ ...fieldStyle(), minHeight: 66, resize: "vertical" }} maxLength={4000} /></label>
            <div><button type="submit" disabled={loading} style={buttonStyle(loading, true)}>创建订单</button></div>
          </form>
          <div style={{ display: "grid", gap: 9, marginTop: 16 }}>{orders.length ? orders.map((order) => <article key={order.id} style={{ border: "1px solid #3f3f46", borderRadius: 10, padding: 13 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}><div><strong>{order.title}</strong><div style={{ color: "#a1a1aa", fontSize: 12, marginTop: 5 }}>{order.customerLabel} · {ORDER_LABELS[order.status]}</div><div style={{ color: "#71717a", fontSize: 10, marginTop: 5 }}>ID: {order.id}</div></div><strong>{money(order.amount, order.currency)}</strong></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}><select aria-label="订单状态" value={order.status} disabled={loading} onChange={(event) => void runAction({ mode: "update-order", id: order.id, status: event.target.value }, "订单状态已更新。")} style={{ ...fieldStyle(), width: "auto", minWidth: 150 }}>{ORDER_STATUSES.map((status) => <option key={status} value={status}>{ORDER_LABELS[status]}</option>)}</select><button type="button" disabled={loading} onClick={() => setSelectedOrderId(order.id)} style={buttonStyle(false, activeOrderId === order.id)}>{activeOrderId === order.id ? "当前选中" : "用于交付/收款"}</button></div></article>) : <p style={{ color: "#a1a1aa", fontSize: 13 }}>尚无订单。先创建一笔报价或订单。</p>}</div>
        </section>

        <section style={panelStyle()}>
          <h2 style={{ margin: "0 0 6px", fontSize: 18 }}>03 · 交付记录</h2>
          <p style={{ color: "#a1a1aa", fontSize: 12, lineHeight: 1.7, margin: "0 0 14px" }}>创建交付事项前，请在订单列表中选择对应订单。</p>
          <form onSubmit={(event) => { event.preventDefault(); if (!activeOrderId || !deliveryTitle.trim()) { setError("请先选择订单并填写交付事项名称。"); return; } void runAction({ mode: "create-delivery", orderId: activeOrderId, title: deliveryTitle.trim(), description: deliveryDescription, status: "not-started" }, "交付事项已创建。").then(() => { setDeliveryTitle(""); setDeliveryDescription(""); }); }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <label><span style={labelStyle()}>关联订单</span><select value={activeOrderId} onChange={(event) => setSelectedOrderId(event.target.value)} style={fieldStyle()} disabled={!orders.length}><option value="">请选择订单</option>{orders.map((order) => <option key={order.id} value={order.id}>{order.customerLabel} - {order.title}</option>)}</select></label>
            <label><span style={labelStyle()}>交付事项名称 *</span><input value={deliveryTitle} onChange={(event) => setDeliveryTitle(event.target.value)} style={fieldStyle()} required maxLength={200} /></label>
            <label style={{ gridColumn: "1 / -1" }}><span style={labelStyle()}>交付说明</span><textarea value={deliveryDescription} onChange={(event) => setDeliveryDescription(event.target.value)} style={{ ...fieldStyle(), minHeight: 66, resize: "vertical" }} /></label>
            <div><button type="submit" disabled={loading || !orders.length} style={buttonStyle(loading || !orders.length, true)}>创建交付事项</button></div>
          </form>
          <div style={{ display: "grid", gap: 8, marginTop: 14 }}>{(snapshot?.deliveries ?? []).map((item) => { const order = orders.find((candidate) => candidate.id === item.orderId); return <article key={item.id} style={{ border: "1px solid #3f3f46", borderRadius: 10, padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><strong>{item.title}</strong><div style={{ color: "#a1a1aa", fontSize: 12, marginTop: 5 }}>{order ? `${order.customerLabel} · ${order.title}` : item.orderId}</div></div><select aria-label="交付状态" value={item.status} disabled={loading} onChange={(event) => void runAction({ mode: "update-delivery", id: item.id, status: event.target.value }, "交付状态已更新。")} style={{ ...fieldStyle(), width: "auto", minWidth: 140 }}>{DELIVERY_STATUSES.map((status) => <option key={status} value={status}>{DELIVERY_LABELS[status]}</option>)}</select></div>{item.description && <p style={{ color: "#a1a1aa", fontSize: 12, lineHeight: 1.7 }}>{item.description}</p>}</article>; })}</div>
        </section>

        <section style={panelStyle()}>
          <h2 style={{ margin: "0 0 6px", fontSize: 18 }}>04 · 收款记录</h2>
          <p style={{ margin: "0 0 14px", color: "#a1a1aa", fontSize: 12, lineHeight: 1.7 }}>只有确实收到款项后，才选择“已记录收款”，并填写收款时间与人工核验备注。系统不会连接银行或支付平台验证交易。</p>
          <form onSubmit={(event) => { event.preventDefault(); const amount = currencyInput(paymentAmount); if (!activeOrderId || amount === null) { setError("请先选择订单，并填写有效收款金额。"); return; } if (paymentStatus === "received" && !paymentEvidence.trim()) { setError("记录实际收款必须填写人工收款证据备注。"); return; } void runAction({ mode: "create-payment", orderId: activeOrderId, currency: paymentCurrency, amount, method: paymentMethod, status: paymentStatus, ...(paymentStatus === "received" ? { receivedAt: Date.now(), evidenceNote: paymentEvidence.trim() } : { evidenceNote: paymentEvidence.trim() }), externalReference: paymentReference.trim() }, "收款记录已保存。").then(() => { setPaymentEvidence(""); setPaymentReference(""); }); }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <label><span style={labelStyle()}>关联订单</span><select value={activeOrderId} onChange={(event) => setSelectedOrderId(event.target.value)} style={fieldStyle()} disabled={!orders.length}><option value="">请选择订单</option>{orders.map((order) => <option key={order.id} value={order.id}>{order.customerLabel} - {order.title}</option>)}</select></label>
            <label><span style={labelStyle()}>收款金额 *</span><input value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} style={fieldStyle()} inputMode="decimal" required /></label>
            <label><span style={labelStyle()}>币种</span><select value={paymentCurrency} onChange={(event) => setPaymentCurrency(event.target.value)} style={fieldStyle()}><option value="CNY">CNY - 人民币</option><option value="JPY">JPY - 日元</option><option value="USD">USD - 美元</option><option value="HKD">HKD - 港币</option></select></label>
            <label><span style={labelStyle()}>收款方式</span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} style={fieldStyle()}>{PAYMENT_METHODS.map((method) => <option key={method} value={method}>{METHOD_LABELS[method]}</option>)}</select></label>
            <label><span style={labelStyle()}>收款状态</span><select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus)} style={fieldStyle()}>{PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{PAYMENT_LABELS[status]}</option>)}</select></label>
            <label><span style={labelStyle()}>外部订单号 / 参考号</span><input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} style={fieldStyle()} maxLength={300} /></label>
            <label style={{ gridColumn: "1 / -1" }}><span style={labelStyle()}>人工收款证据备注{paymentStatus === "received" ? " *" : ""}</span><textarea value={paymentEvidence} onChange={(event) => setPaymentEvidence(event.target.value)} style={{ ...fieldStyle(), minHeight: 66, resize: "vertical" }} maxLength={2000} placeholder="例如：已核对平台订单状态和到账记录。不要填写密码或完整支付凭证。" /></label>
            <div><button type="submit" disabled={loading || !orders.length} style={buttonStyle(loading || !orders.length, true)}>保存收款记录</button></div>
          </form>
          <div style={{ display: "grid", gap: 8, marginTop: 14 }}>{(snapshot?.payments ?? []).map((payment) => { const order = orders.find((candidate) => candidate.id === payment.orderId); return <article key={payment.id} style={{ border: "1px solid #3f3f46", borderRadius: 10, padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}><div><strong>{money(payment.amount, payment.currency)}</strong><div style={{ color: "#a1a1aa", fontSize: 12, marginTop: 5 }}>{order ? `${order.customerLabel} · ${order.title}` : payment.orderId}</div><div style={{ color: "#71717a", fontSize: 11, marginTop: 4 }}>{METHOD_LABELS[payment.method]} · {timeLabel(payment.receivedAt)}</div></div><select aria-label="收款状态" value={payment.status} disabled={loading} onChange={(event) => { const status = event.target.value as PaymentStatus; if (status === "received" && (!payment.receivedAt || !payment.evidenceNote.trim())) { setError("该笔记录缺少收款时间或人工证据备注，不能直接改为已收款。请新建完整收款记录。"); return; } void runAction({ mode: "update-payment", id: payment.id, status }, "收款状态已更新。"); }} style={{ ...fieldStyle(), width: "auto", minWidth: 140 }}>{PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{PAYMENT_LABELS[status]}</option>)}</select></div>{payment.evidenceNote && <p style={{ color: "#a1a1aa", fontSize: 12, lineHeight: 1.7, marginBottom: 0 }}>备注：{payment.evidenceNote}</p>}</article>; })}</div>
        </section>

        <section style={{ ...panelStyle(), background: "#0c0c0f" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 15 }}>记录边界</h2>
          <p style={{ margin: 0, color: "#a1a1aa", fontSize: 12, lineHeight: 1.9 }}>{snapshot?.note || "收入数据仅表示手动登记记录。"}</p>
          <p style={{ margin: "8px 0 0", color: "#71717a", fontSize: 11, lineHeight: 1.8 }}>所有金额字段使用标准货币单位，最多两位小数。多币种收入分别显示，不直接相加为单一总额。此页面不自动联系客户、不发起付款、不执行外部平台操作。</p>
        </section>
      </div>
    </main>
  );
}
