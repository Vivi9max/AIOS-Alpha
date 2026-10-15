"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

const FOUNDER_STORAGE_KEY = "aios-founder-access-key";
const ENDPOINT = "/api/founder/inbound-growth";

type Channel = "xiaohongshu" | "xianyu";
type LeadSignal = "yes" | "no" | "unknown";
type LeadBudget = "under-500" | "500-2000" | "2000-plus" | "unknown";
type LeadUrgency = "high" | "medium" | "low" | "unknown";
type LeadRole = "decision-maker" | "influencer" | "unknown";
type LeadTier = "priority" | "nurture" | "low-priority";
type LeadStatus = "new" | "follow-up" | "converted" | "closed";
type ContentMode = "evidence-driven" | "general-safe-fallback";
type OpportunityPriority = "primary" | "backup" | "defer";
type ExecutionStatus = "ready-for-founder-review" | "insufficient-opportunity" | "insufficient-content";

interface LeadForm {
  businessType: string;
  currentAds: LeadSignal;
  hasAdData: LeadSignal;
  decisionRole: LeadRole;
  budgetRange: LeadBudget;
  urgency: LeadUrgency;
  goal: string;
  currentProblem: string;
  sourceChannel: Channel;
}
interface LeadAssessment {
  score: number;
  tier: LeadTier;
  reasons: string[];
  missingInformation: string[];
  recommendedAction: string;
  evidenceBoundary: string;
  timestamp: number;
}
interface ContentAsset {
  channel: Channel;
  format: string;
  title: string;
  body: string;
  callToAction: string;
  disclosure: string[];
}
interface ContentOpportunity {
  id: string;
  priority: OpportunityPriority;
  score: number;
  topic: string;
  rationale: string;
  evidenceBasis: string[];
  recommendedChannel: Channel;
  publishNow: boolean;
}
interface Campaign {
  id: string;
  version: string;
  status: "draft";
  targetMarket: string;
  industry: string;
  offer: {
    name: string;
    entryPrice: number;
    diagnosticPrice: number;
    entryDeliverables: string[];
    diagnosticDeliverables: string[];
    exclusions: string[];
  };
  contentAssets: ContentAsset[];
  sevenDayPlan: Array<{ day: number; channel: Channel; topic: string; purpose: string }>;
  intakeQuestions: string[];
  operatingRules: string[];
  externalPublishing: { executed: false; requiresManualAction: true };
  timestamp: number;
  marketContext?: {
    source: "c168-market-intelligence" | "founder" | "manual" | "unknown";
    market?: string;
    geography?: string;
    verifiedProblems?: string[];
    buyingSignals?: string[];
    acquisitionSignals?: string[];
    diagnosticHypotheses?: string[];
    evidenceBoundary?: string;
  };
  contentStrategy?: { mode: ContentMode; primaryObjective: string; learningObjective: string; evidenceBoundary: string };
}
interface LeadRecord {
  id: string;
  lead: LeadForm;
  assessment: LeadAssessment;
  replyDraft: string;
  status: LeadStatus;
  note: string;
  createdAt: number;
  updatedAt: number;
}
interface MarketIntelligence {
  success?: boolean;
  status?: string;
  targetMarket?: string;
  geography?: string;
  sourceCount?: number;
  independentHosts?: number;
  candidateCount?: number;
  inboundOpportunityCount?: number;
  selectiveOutboundCount?: number;
  monitorCount?: number;
  rejectedCount?: number;
  conclusion?: string;
  nextStep?: string;
  integrity?: Record<string, unknown>;
}
interface ExecutionPacket {
  id: string;
  version: string;
  status: ExecutionStatus;
  opportunity: {
    id: string;
    topic: string;
    score: number;
    channel: Channel;
    rationale: string;
    evidenceBasis: string[];
  } | null;
  asset: {
    channel: Channel;
    format: string;
    title: string;
    body: string;
    callToAction: string;
    disclosure: string[];
  } | null;
  validation: {
    primaryGoal: string;
    validInquiryDefinition: string[];
    recordAfterPublishing: string[];
    successSignal: string;
    insufficientSignal: string;
  };
  founderChecklist: string[];
  executionBoundary: {
    automaticPublishing: false;
    automaticMessaging: false;
    automaticAdOperation: false;
    requiresFounderReview: true;
    requiresManualPublishing: true;
  };
  nextAction: string;
}
interface ApiPayload {
  success?: boolean;
  code?: string;
  message?: string;
  error?: string;
  campaign?: Campaign;
  contentOpportunities?: ContentOpportunity[];
  executionPacket?: ExecutionPacket;
  marketIntelligence?: MarketIntelligence;
  marketContextApplied?: boolean;
  contentMode?: ContentMode;
  result?: {
    mode?: string;
    campaign?: Campaign;
    contentOpportunities?: ContentOpportunity[];
    executionPacket?: ExecutionPacket;
    assessment?: LeadAssessment;
    replyDraft?: string;
    record?: LeadRecord;
    records?: LeadRecord[];
    count?: number;
    id?: string;
    marketIntelligence?: MarketIntelligence;
    marketContextApplied?: boolean;
    contentMode?: ContentMode;
  };
}

const INITIAL_LEAD: LeadForm = {
  businessType: "",
  currentAds: "unknown",
  hasAdData: "unknown",
  decisionRole: "unknown",
  budgetRange: "unknown",
  urgency: "unknown",
  goal: "",
  currentProblem: "",
  sourceChannel: "xiaohongshu",
};
const CHANNEL_LABELS: Record<Channel, string> = { xiaohongshu: "小红书", xianyu: "闲鱼" };
const STATUS_LABELS: Record<LeadStatus, string> = { new: "新线索", "follow-up": "跟进中", converted: "已成交", closed: "已关闭" };
const TIER_LABELS: Record<LeadTier, string> = { priority: "优先跟进", nurture: "补充信息", "low-priority": "低优先级" };
const panelStyle = (): CSSProperties => ({ border: "1px solid #27272a", borderRadius: "14px", padding: "20px", marginBottom: "18px", background: "#111114" });
const fieldStyle = (): CSSProperties => ({ boxSizing: "border-box", width: "100%", padding: "10px 12px", border: "1px solid #3f3f46", borderRadius: "8px", background: "#18181b", color: "#fafafa", fontSize: "14px" });
const buttonStyle = (disabled = false, primary = false): CSSProperties => ({ border: "1px solid #52525b", borderRadius: "8px", padding: "9px 13px", background: disabled ? "#27272a" : primary ? "#fafafa" : "#18181b", color: disabled ? "#71717a" : primary ? "#09090b" : "#fafafa", fontSize: "13px", fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.65 : 1 });
const mutedStyle = (): CSSProperties => ({ color: "#a1a1aa", fontSize: "13px", lineHeight: 1.7 });
const badgeStyle = (active = false): CSSProperties => ({ display: "inline-flex", alignItems: "center", border: "1px solid #3f3f46", borderRadius: "999px", padding: "4px 9px", background: active ? "#fafafa" : "#18181b", color: active ? "#09090b" : "#d4d4d8", fontSize: "11px", fontWeight: 600 });
const labelStyle = (): CSSProperties => ({ display: "block", marginBottom: "7px", fontSize: "13px", color: "#d4d4d8" });

function normalizeLead(value: LeadForm): LeadForm {
  return { ...value, businessType: value.businessType.trim(), goal: value.goal.trim(), currentProblem: value.currentProblem.trim() };
}
function formatTime(timestamp: number): string {
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : "N/A";
}
function score(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value <= 1 ? value * 100 : value);
}
async function copyText(value: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard) await navigator.clipboard.writeText(value);
}

export default function Page() {
  const [session, setSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [opportunities, setOpportunities] = useState<ContentOpportunity[]>([]);
  const [executionPacket, setExecutionPacket] = useState<ExecutionPacket | null>(null);
  const [marketIntelligence, setMarketIntelligence] = useState<MarketIntelligence | null>(null);
  const [marketContextApplied, setMarketContextApplied] = useState(false);
  const [contentMode, setContentMode] = useState<ContentMode>("general-safe-fallback");
  const [industry, setIndustry] = useState("深圳家装、旧房局改、全屋定制");
  const [region, setRegion] = useState("深圳");
  const [offerName, setOfferName] = useState("48小时广告获客诊断");
  const [entryPrice, setEntryPrice] = useState("399");
  const [diagnosticPrice, setDiagnosticPrice] = useState("699");
  const [channels, setChannels] = useState<Channel[]>(["xiaohongshu", "xianyu"]);
  const [lead, setLead] = useState<LeadForm>(INITIAL_LEAD);
  const [assessment, setAssessment] = useState<LeadAssessment | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [records, setRecords] = useState<LeadRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "all">("all");
  const [editingId, setEditingId] = useState("");
  const [editingNote, setEditingNote] = useState("");

  const founderKey = useCallback(() => typeof window === "undefined" ? "" : window.sessionStorage.getItem(FOUNDER_STORAGE_KEY)?.trim() ?? "", []);
  const refreshSession = useCallback(() => { const key = founderKey(); setSession(Boolean(key)); return key; }, [founderKey]);

  useEffect(() => {
    refreshSession();
    const timer = window.setInterval(refreshSession, 1000);
    return () => window.clearInterval(timer);
  }, [refreshSession]);

  const requestApi = useCallback(async (method: "GET" | "POST", body?: Record<string, unknown>): Promise<ApiPayload> => {
    const key = refreshSession();
    if (!key) throw new Error("未检测到 Founder Session。请先进入 Founder Console 完成授权。");
    const response = await fetch(ENDPOINT, {
      method,
      headers: { Accept: "application/json", Authorization: `Bearer ${key}`, ...(method === "POST" ? { "Content-Type": "application/json" } : {}) },
      ...(method === "POST" ? { body: JSON.stringify(body ?? {}) } : {}),
      cache: "no-store",
    });
    const payload = (await response.json()) as ApiPayload;
    if (!response.ok || !payload.success) throw new Error(payload.message || payload.error || payload.code || "Inbound demand request failed.");
    return payload;
  }, [refreshSession]);

  const applyPayload = useCallback((payload: ApiPayload) => {
    const source = payload.result;
    const nextCampaign = source?.campaign ?? payload.campaign;
    if (nextCampaign) setCampaign(nextCampaign);
    setOpportunities(source?.contentOpportunities ?? payload.contentOpportunities ?? []);
    setExecutionPacket(source?.executionPacket ?? payload.executionPacket ?? null);
    setMarketIntelligence(source?.marketIntelligence ?? payload.marketIntelligence ?? null);
    setMarketContextApplied(source?.marketContextApplied ?? payload.marketContextApplied ?? Boolean(nextCampaign?.marketContext));
    setContentMode(source?.contentMode ?? payload.contentMode ?? nextCampaign?.contentStrategy?.mode ?? "general-safe-fallback");
  }, []);

  const loadCampaign = useCallback(async (showNotice = true) => {
    setLoading(true); setError("");
    try { applyPayload(await requestApi("GET")); if (showNotice) setNotice("今日获客决策已刷新。主机会可进入人工发布流程。"); }
    catch (value) { setError(value instanceof Error ? value.message : "Failed to load campaign."); }
    finally { setLoading(false); }
  }, [applyPayload, requestApi]);

  const loadLeads = useCallback(async (showNotice = false) => {
    try { const payload = await requestApi("POST", { mode: "list-leads", limit: 500 }); setRecords(payload.result?.records ?? []); if (showNotice) setNotice(`真实询盘记录已刷新，共 ${payload.result?.count ?? 0} 条。`); }
    catch (value) { setError(value instanceof Error ? value.message : "Failed to load leads."); }
  }, [requestApi]);

  useEffect(() => { if (session && !campaign) void loadCampaign(false); }, [session, campaign, loadCampaign]);
  useEffect(() => { if (session) void loadLeads(false); }, [session, loadLeads]);

  async function generateCampaign() {
    setLoading(true); setError(""); setNotice("");
    try {
      const payload = await requestApi("POST", { mode: "campaign", input: { industry, region, offerName, entryPrice: Number(entryPrice), diagnosticPrice: Number(diagnosticPrice), channels } });
      applyPayload(payload);
      setNotice("今日获客方案已根据最新 C168 市场证据生成。请人工审核后发布。");
    } catch (value) { setError(value instanceof Error ? value.message : "Failed to generate campaign."); }
    finally { setLoading(false); }
  }

  async function leadAction(mode: "score-lead" | "reply-draft") {
    setLoading(true); setError(""); setNotice("");
    try {
      const payload = await requestApi("POST", { mode, lead: normalizeLead(lead) });
      setAssessment(payload.result?.assessment ?? null);
      setReplyDraft(payload.result?.replyDraft ?? "");
      setNotice(mode === "reply-draft" ? "回复草稿已生成。请人工核实后，通过平台允许的方式回复。" : "线索评分已完成。评分仅用于安排跟进优先级。");
    } catch (value) { setError(value instanceof Error ? value.message : "Lead operation failed."); }
    finally { setLoading(false); }
  }

  async function saveLead() {
    setLoading(true); setError(""); setNotice("");
    try {
      const payload = await requestApi("POST", { mode: "save-lead", lead: normalizeLead(lead), note: editingNote });
      const record = payload.result?.record;
      if (!record) throw new Error("The API did not return the saved record.");
      setRecords(current => [record, ...current.filter(item => item.id !== record.id)]);
      setAssessment(record.assessment); setReplyDraft(record.replyDraft); setEditingId(record.id); setEditingNote(record.note);
      setNotice("真实询盘已保存。未发生外部联系或自动发布。");
    } catch (value) { setError(value instanceof Error ? value.message : "Failed to save lead."); }
    finally { setLoading(false); }
  }

  async function updateRecord(id: string, updates: { status?: LeadStatus; note?: string }) {
    setLoading(true); setError("");
    try {
      const payload = await requestApi("POST", { mode: "update-lead", id, ...updates });
      const record = payload.result?.record;
      if (!record) throw new Error("The updated record was not returned.");
      setRecords(current => current.map(item => item.id === id ? record : item));
      setEditingId(""); setNotice("真实询盘记录已更新。");
    } catch (value) { setError(value instanceof Error ? value.message : "Failed to update lead."); }
    finally { setLoading(false); }
  }

  async function deleteRecord(id: string) {
    if (!window.confirm("确认删除这条真实询盘记录？")) return;
    setLoading(true); setError("");
    try { await requestApi("POST", { mode: "delete-lead", id }); setRecords(current => current.filter(item => item.id !== id)); setNotice("真实询盘记录已删除。"); }
    catch (value) { setError(value instanceof Error ? value.message : "Failed to delete lead."); }
    finally { setLoading(false); }
  }

  const visibleRecords = useMemo(() => filterStatus === "all" ? records : records.filter(item => item.status === filterStatus), [filterStatus, records]);
  const counts = useMemo(() => ({ new: records.filter(item => item.status === "new").length, followUp: records.filter(item => item.status === "follow-up").length, converted: records.filter(item => item.status === "converted").length, closed: records.filter(item => item.status === "closed").length }), [records]);
  const primaryOpportunity = executionPacket?.opportunity ?? opportunities.find(item => item.priority === "primary") ?? opportunities[0] ?? null;
  const primaryAsset = executionPacket?.asset ?? (primaryOpportunity ? campaign?.contentAssets.find(item => item.channel === primaryOpportunity?.channel || item.channel === primaryOpportunity?.recommendedChannel) ?? null : null);

  if (!session) {
    return <main style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa", padding: "32px" }}><div style={{ maxWidth: 960, margin: "0 auto" }}><section style={panelStyle()}><h1 style={{ marginTop: 0 }}>Founder Inbound Growth</h1><p style={mutedStyle()}>需要 Founder Session。请先进入 Founder Console 完成授权。</p></section></div></main>;
  }

  return (
    <main style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa", padding: "28px 18px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <header style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div><div style={{ ...mutedStyle(), fontSize: 11 }}>C168.8 · Founder</div><h1 style={{ margin: "5px 0 7px", fontSize: 28 }}>Inbound Growth</h1><p style={{ ...mutedStyle(), margin: 0 }}>客户发现 → 客户筛选 → Offer → 联系 → 订单 → 交付 → 收款记录</p></div>
            <button type="button" disabled={loading} onClick={() => void loadCampaign()} style={buttonStyle(loading, true)}>刷新今日决策</button>
          </div>
          {error && <div style={{ ...panelStyle(), marginTop: 16, borderColor: "#7f1d1d", color: "#fecaca" }}>{error}</div>}
          {notice && <div style={{ ...panelStyle(), marginTop: 16, color: "#d4d4d8" }}>{notice}</div>}
        </header>

        <section style={panelStyle()}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><h2 style={{ margin: 0, fontSize: 18 }}>今日执行</h2><p style={{ ...mutedStyle(), margin: "6px 0 0" }}>C168.8 executionPacket：只给 Founder 可执行的下一步，不自动发布、不自动私信。</p></div><span style={badgeStyle(executionPacket?.status === "ready-for-founder-review")}>{executionPacket?.status ?? "未加载"}</span></div>
          {executionPacket?.opportunity ? <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <div style={{ padding: 14, border: "1px solid #27272a", borderRadius: 10 }}><div style={{ ...mutedStyle(), fontSize: 11 }}>今日主机会</div><h3 style={{ margin: "6px 0" }}>{executionPacket.opportunity.topic}</h3><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><span style={badgeStyle(true)}>Score {score(executionPacket.opportunity.score)}</span><span style={badgeStyle()}>{CHANNEL_LABELS[executionPacket.opportunity.channel]}</span></div><p style={{ ...mutedStyle(), marginBottom: 0 }}>{executionPacket.opportunity.rationale}</p></div>
            {executionPacket.asset && <div style={{ padding: 14, border: "1px solid #27272a", borderRadius: 10 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><strong>只需要发布 1 条</strong><span style={badgeStyle()}>{executionPacket.asset.format}</span></div><h3 style={{ margin: "10px 0 7px" }}>{executionPacket.asset.title}</h3><div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, fontSize: 13 }}>{executionPacket.asset.body}</div><p style={{ color: "#d4d4d8", fontSize: 13, lineHeight: 1.7 }}><strong>CTA：</strong>{executionPacket.asset.callToAction}</p><button type="button" onClick={() => void copyText(`${executionPacket.asset?.title}\n\n${executionPacket.asset?.body}\n\nCTA：${executionPacket.asset?.callToAction}`)} style={buttonStyle(false, true)}>复制发布内容</button></div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 10 }}><div style={{ padding: 13, border: "1px solid #27272a", borderRadius: 9 }}><strong style={{ fontSize: 12 }}>为什么选它</strong>{executionPacket.opportunity.evidenceBasis.map(item => <div key={item} style={{ ...mutedStyle(), marginTop: 6 }}>· {item}</div>)}</div><div style={{ padding: 13, border: "1px solid #27272a", borderRadius: 9 }}><strong style={{ fontSize: 12 }}>下一步</strong><div style={{ ...mutedStyle(), marginTop: 6 }}>{executionPacket.nextAction}</div></div></div>
            <div><strong style={{ fontSize: 12 }}>Founder 检查</strong><ul style={{ ...mutedStyle(), marginTop: 8 }}>{executionPacket.founderChecklist.map(item => <li key={item}>{item}</li>)}</ul></div>
          </div> : <div style={{ ...mutedStyle(), marginTop: 14 }}>当前没有足够的可执行机会。保持安全 fallback，不为了完成发布任务而虚构市场问题。</div>}
        </section>

        <section style={panelStyle()}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>今日主机会 / 备选机会</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10 }}>{opportunities.map(item => <article key={item.id} style={{ padding: 14, border: "1px solid #27272a", borderRadius: 10 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={badgeStyle(item.priority === "primary")}>{item.priority === "primary" ? "今日主机会" : item.priority === "backup" ? "备选机会" : "后续测试"}</span><span style={mutedStyle()}>Score {score(item.score)}</span></div><h3 style={{ margin: "10px 0 6px", fontSize: 15 }}>{item.topic}</h3><p style={mutedStyle()}>{item.rationale}</p><div style={{ ...mutedStyle(), fontSize: 12 }}>渠道：{CHANNEL_LABELS[item.recommendedChannel]}</div><div style={{ ...mutedStyle(), fontSize: 12, marginTop: 5 }}>发布：{item.publishNow ? "可进入人工审核" : "暂不发布"}</div></article>)}</div>
          {opportunities.length === 0 && <p style={mutedStyle()}>暂无内容机会。刷新 C168 市场证据。</p>}
        </section>

        <section style={panelStyle()}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>获客方案</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            <label style={labelStyle()}>行业<input value={industry} onChange={e => setIndustry(e.target.value)} style={fieldStyle()} /></label>
            <label style={labelStyle()}>地区<input value={region} onChange={e => setRegion(e.target.value)} style={fieldStyle()} /></label>
            <label style={labelStyle()}>Offer<input value={offerName} onChange={e => setOfferName(e.target.value)} style={fieldStyle()} /></label>
            <label style={labelStyle()}>入口价格<input inputMode="decimal" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} style={fieldStyle()} /></label>
            <label style={labelStyle()}>诊断价格<input inputMode="decimal" value={diagnosticPrice} onChange={e => setDiagnosticPrice(e.target.value)} style={fieldStyle()} /></label>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 7, flexWrap: "wrap" }}>{(["xiaohongshu", "xianyu"] as Channel[]).map(channel => <button key={channel} type="button" onClick={() => setChannels(current => current.includes(channel) ? current.filter(item => item !== channel) : [...current, channel])} style={buttonStyle(false, channels.includes(channel))}>{CHANNEL_LABELS[channel]}</button>)}</div>
          <button type="button" disabled={loading || channels.length === 0} onClick={() => void generateCampaign()} style={{ ...buttonStyle(loading || channels.length === 0, true), marginTop: 14 }}>生成今日方案</button>
          {campaign && <div style={{ marginTop: 15, ...mutedStyle() }}>市场上下文：{marketContextApplied ? "已应用 C168 市场证据" : "安全 fallback"} · 内容模式：{contentMode} · Campaign {campaign.version}</div>}
        </section>

        {campaign && <section style={panelStyle()}><h2 style={{ marginTop: 0, fontSize: 18 }}>内容资产</h2><div style={{ display: "grid", gap: 10 }}>{campaign.contentAssets.map((asset, index) => <article key={`${asset.channel}-${index}`} style={{ border: "1px solid #27272a", borderRadius: 10, padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong>{asset.title}</strong><span style={badgeStyle()}>{CHANNEL_LABELS[asset.channel]}</span></div><div style={{ ...mutedStyle(), marginTop: 8, whiteSpace: "pre-wrap" }}>{asset.body}</div><div style={{ color: "#d4d4d8", fontSize: 13, marginTop: 8 }}>CTA：{asset.callToAction}</div></article>)}</div></section>}

        <section style={panelStyle()}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>真实询盘资格判断</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            <label style={labelStyle()}>业务类型<input value={lead.businessType} onChange={e => { setLead({ ...lead, businessType: e.target.value }); setAssessment(null); }} style={fieldStyle()} /></label>
            <label style={labelStyle()}>当前是否投广告<select value={lead.currentAds} onChange={e => setLead({ ...lead, currentAds: e.target.value as LeadSignal })} style={fieldStyle()}><option value="unknown">未知</option><option value="yes">是</option><option value="no">否</option></select></label>
            <label style={labelStyle()}>是否有广告数据<select value={lead.hasAdData} onChange={e => setLead({ ...lead, hasAdData: e.target.value as LeadSignal })} style={fieldStyle()}><option value="unknown">未知</option><option value="yes">有</option><option value="no">无</option></select></label>
            <label style={labelStyle()}>决策角色<select value={lead.decisionRole} onChange={e => setLead({ ...lead, decisionRole: e.target.value as LeadRole })} style={fieldStyle()}><option value="unknown">未知</option><option value="decision-maker">决策者</option><option value="influencer">影响者</option></select></label>
            <label style={labelStyle()}>预算<select value={lead.budgetRange} onChange={e => setLead({ ...lead, budgetRange: e.target.value as LeadBudget })} style={fieldStyle()}><option value="unknown">未知</option><option value="under-500">500 以下</option><option value="500-2000">500-2000</option><option value="2000-plus">2000+</option></select></label>
            <label style={labelStyle()}>紧迫度<select value={lead.urgency} onChange={e => setLead({ ...lead, urgency: e.target.value as LeadUrgency })} style={fieldStyle()}><option value="unknown">未知</option><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>
            <label style={labelStyle()}>目标<input value={lead.goal} onChange={e => setLead({ ...lead, goal: e.target.value })} style={fieldStyle()} /></label>
            <label style={labelStyle()}>当前问题<input value={lead.currentProblem} onChange={e => setLead({ ...lead, currentProblem: e.target.value })} style={fieldStyle()} /></label>
            <label style={labelStyle()}>来源<select value={lead.sourceChannel} onChange={e => setLead({ ...lead, sourceChannel: e.target.value as Channel })} style={fieldStyle()}><option value="xiaohongshu">小红书</option><option value="xianyu">闲鱼</option></select></label>
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 14 }}><button type="button" disabled={loading} onClick={() => void leadAction("score-lead")} style={buttonStyle(loading)}>评分</button><button type="button" disabled={loading} onClick={() => void leadAction("reply-draft")} style={buttonStyle(loading)}>生成回复</button><button type="button" disabled={loading} onClick={() => void saveLead()} style={buttonStyle(loading, true)}>保存真实询盘</button></div>
          {assessment && <div style={{ marginTop: 14, padding: 14, border: "1px solid #27272a", borderRadius: 10 }}><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><span style={badgeStyle(true)}>Score {score(assessment.score)}</span><span style={badgeStyle()}>{TIER_LABELS[assessment.tier]}</span></div><div style={{ marginTop: 10 }}>{assessment.reasons.map(reason => <div key={reason} style={{ ...mutedStyle(), marginTop: 4 }}>· {reason}</div>)}</div><div style={{ ...mutedStyle(), marginTop: 10 }}><strong>建议动作：</strong>{assessment.recommendedAction}</div><div style={{ ...mutedStyle(), marginTop: 8 }}>{assessment.evidenceBoundary}</div></div>}
          {replyDraft && <div style={{ marginTop: 14, padding: 14, border: "1px solid #27272a", borderRadius: 10 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong>客户回复草稿</strong><button type="button" onClick={() => void copyText(replyDraft)} style={buttonStyle(false, true)}>复制</button></div><div style={{ whiteSpace: "pre-wrap", marginTop: 10, lineHeight: 1.8, fontSize: 13 }}>{replyDraft}</div></div>}
        </section>

        <section style={panelStyle()}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><h2 style={{ margin: 0, fontSize: 18 }}>真实询盘</h2><div style={{ ...mutedStyle(), marginTop: 5 }}>新线索 {counts.new} · 跟进中 {counts.followUp} · 已成交 {counts.converted} · 已关闭 {counts.closed}</div></div><button type="button" disabled={loading} onClick={() => void loadLeads(true)} style={buttonStyle(loading)}>刷新</button></div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "14px 0" }}>{(["all", "new", "follow-up", "converted", "closed"] as const).map(status => <button key={status} type="button" onClick={() => setFilterStatus(status)} style={buttonStyle(false, filterStatus === status)}>{status === "all" ? "全部" : STATUS_LABELS[status]}</button>)}</div>
          <div style={{ display: "grid", gap: 10 }}>{visibleRecords.map(record => <article key={record.id} style={{ border: "1px solid #27272a", borderRadius: 10, padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><div><strong>{record.lead.businessType || "未填写业务类型"}</strong><div style={{ ...mutedStyle(), fontSize: 11 }}>{CHANNEL_LABELS[record.lead.sourceChannel]} · {formatTime(record.createdAt)}</div></div><span style={badgeStyle()}>{STATUS_LABELS[record.status]} · Score {score(record.assessment.score)}</span></div><div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.7 }}>{record.lead.currentProblem || "未填写当前问题"}</div>{record.note && <div style={{ ...mutedStyle(), marginTop: 8 }}>Note: {record.note}</div>}<div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 11 }}><select value={record.status} onChange={e => void updateRecord(record.id, { status: e.target.value as LeadStatus })} style={{ ...fieldStyle(), width: "auto", minWidth: 120 }}><option value="new">新线索</option><option value="follow-up">跟进中</option><option value="converted">已成交</option><option value="closed">已关闭</option></select><button type="button" onClick={() => { setEditingId(record.id); setEditingNote(record.note); }} style={buttonStyle()}>编辑备注</button><button type="button" onClick={() => void deleteRecord(record.id)} style={buttonStyle()}>删除</button></div>{editingId === record.id && <div style={{ display: "flex", gap: 7, marginTop: 9 }}><input value={editingNote} onChange={e => setEditingNote(e.target.value)} style={{ ...fieldStyle(), flex: 1 }} placeholder="记录真实跟进结果" /><button type="button" onClick={() => void updateRecord(record.id, { note: editingNote })} style={buttonStyle(false, true)}>保存</button></div>}</article>)}</div>
          {visibleRecords.length === 0 && <div style={{ padding: 20, border: "1px dashed #3f3f46", borderRadius: 10, ...mutedStyle() }}>当前没有真实询盘记录。下一步是人工审核主机会内容并发布，等待真实平台询盘。</div>}
        </section>

        <section style={panelStyle()}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>验证与执行边界</h2>
          {executionPacket && <div style={{ display: "grid", gap: 10 }}><div><strong style={{ fontSize: 12 }}>有效询盘定义</strong><ul style={mutedStyle()}>{executionPacket.validation.validInquiryDefinition.map(item => <li key={item}>{item}</li>)}</ul></div><div><strong style={{ fontSize: 12 }}>发布后记录</strong><ul style={mutedStyle()}>{executionPacket.validation.recordAfterPublishing.map(item => <li key={item}>{item}</li>)}</ul></div><div style={{ ...mutedStyle(), padding: 12, border: "1px solid #27272a", borderRadius: 9 }}><strong>成功信号：</strong>{executionPacket.validation.successSignal}<br /><strong>不足信号：</strong>{executionPacket.validation.insufficientSignal}</div></div>}
          <div style={{ ...mutedStyle(), marginTop: 14, lineHeight: 1.9 }}><div>- C168 Evidence Score 是研究优先级，不是客户购买意愿。</div><div>- Buying Signal 是公开市场信号，不等于真实购买意图。</div><div>- AIOS 不自动发布小红书或闲鱼内容。</div><div>- AIOS 不自动私信潜在客户。</div><div>- AIOS 不操作客户广告账户。</div><div>- AIOS 不虚构客户、付款、成交或收入。</div><div>- 只有真实客户主动提供的信息才进入真实询盘记录。</div><div>- Founder 发布前必须人工审核内容和平台规则。</div></div>
        </section>

        <section style={panelStyle()}><h2 style={{ marginTop: 0, fontSize: 18 }}>商业闭环</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 8 }}>{["C168 市场发现", "今日主机会", "内容假设", "小红书 / 闲鱼发布", "真实询盘", "资格判断", "¥399 诊断", "¥699 验证", "交付", "真实回款", "结果复盘"].map(step => <div key={step} style={{ padding: 10, border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }}>{step}</div>)}</div></section>
        <footer style={{ color: "#52525b", fontSize: 11, lineHeight: 1.7 }}>AIOS Alpha · C168.8 External Platform Inbound Execution · Founder only</footer>
      </div>
    </main>
  );
}
