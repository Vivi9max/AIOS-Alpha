
"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type {
  CSSProperties,
} from "react";

const FOUNDER_STORAGE_KEY =
  "aios-founder-access-key";

const ENDPOINT =
  "/api/founder/inbound-growth";

type Channel =
  | "xiaohongshu"
  | "xianyu";

type LeadSignal =
  | "yes"
  | "no"
  | "unknown";

type LeadBudget =
  | "under-500"
  | "500-2000"
  | "2000-plus"
  | "unknown";

type LeadUrgency =
  | "high"
  | "medium"
  | "low"
  | "unknown";

type LeadRole =
  | "decision-maker"
  | "influencer"
  | "unknown";

type LeadTier =
  | "priority"
  | "nurture"
  | "low-priority";

type LeadStatus =
  | "new"
  | "follow-up"
  | "converted"
  | "closed";

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
  sevenDayPlan: Array<{
    day: number;
    channel: Channel;
    topic: string;
    purpose: string;
  }>;
  intakeQuestions: string[];
  operatingRules: string[];
  externalPublishing: {
    executed: false;
    requiresManualAction: true;
  };
  timestamp: number;
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

interface ApiPayload {
  success?: boolean;
  code?: string;
  message?: string;
  error?: string;
  campaign?: Campaign;
  result?: {
    mode?: string;
    campaign?: Campaign;
    assessment?: LeadAssessment;
    replyDraft?: string;
    record?: LeadRecord;
    records?: LeadRecord[];
    count?: number;
    id?: string;
  };
  persistenceEnabled?: boolean;
  externalSideEffectExecuted?: boolean;
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

const CHANNEL_LABELS: Record<Channel, string> = {
  xiaohongshu: "小红书",
  xianyu: "闲鱼",
};

const TIER_LABELS: Record<LeadTier, string> = {
  priority: "优先跟进",
  nurture: "补充信息",
  "low-priority": "低优先级",
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "新线索",
  "follow-up": "跟进中",
  converted: "已成交",
  closed: "已关闭",
};

function panelStyle(): CSSProperties {
  return {
    border: "1px solid #27272a",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "18px",
    background: "#111114",
  };
}

function fieldStyle(): CSSProperties {
  return {
    boxSizing: "border-box",
    width: "100%",
    padding: "11px 12px",
    border: "1px solid #3f3f46",
    borderRadius: "8px",
    background: "#18181b",
    color: "#fafafa",
    fontSize: "14px",
  };
}

function buttonStyle(
  disabled = false,
): CSSProperties {
  return {
    border: "1px solid #52525b",
    borderRadius: "8px",
    padding: "10px 14px",
    background: disabled ? "#27272a" : "#fafafa",
    color: disabled ? "#a1a1aa" : "#09090b",
    fontSize: "13px",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.65 : 1,
  };
}

function labelStyle(): CSSProperties {
  return {
    display: "block",
    marginBottom: "7px",
    fontSize: "13px",
    color: "#d4d4d8",
  };
}

function formatTime(timestamp: number): string {
  if (!Number.isFinite(timestamp)) {
    return "N/A";
  }

  return new Date(timestamp).toLocaleString();
}

function normalizeLeadForm(
  lead: LeadForm,
): LeadForm {
  return {
    businessType: lead.businessType,
    currentAds: lead.currentAds,
    hasAdData: lead.hasAdData,
    decisionRole: lead.decisionRole,
    budgetRange: lead.budgetRange,
    urgency: lead.urgency,
    goal: lead.goal,
    currentProblem: lead.currentProblem,
    sourceChannel: lead.sourceChannel,
  };
}

export default function Page() {
  const [session, setSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [campaign, setCampaign] =
    useState<Campaign | null>(null);

  const [industry, setIndustry] =
    useState("本地生活服务商家");

  const [region, setRegion] =
    useState("深圳");

  const [offerName, setOfferName] =
    useState("广告获客漏斗诊断");

  const [entryPrice, setEntryPrice] =
    useState("99");

  const [diagnosticPrice, setDiagnosticPrice] =
    useState("399");

  const [channels, setChannels] =
    useState<Channel[]>([
      "xiaohongshu",
      "xianyu",
    ]);

  const [lead, setLead] =
    useState<LeadForm>(INITIAL_LEAD);

  const [assessment, setAssessment] =
    useState<LeadAssessment | null>(null);

  const [replyDraft, setReplyDraft] =
    useState("");

  const [records, setRecords] =
    useState<LeadRecord[]>([]);

  const [filterStatus, setFilterStatus] =
    useState<LeadStatus | "all">("all");

  const [editingRecordId, setEditingRecordId] =
    useState("");

  const [editingNote, setEditingNote] =
    useState("");

  const getFounderKey = useCallback(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return (
      window.sessionStorage.getItem(
        FOUNDER_STORAGE_KEY,
      )?.trim() ?? ""
    );
  }, []);

  const refreshSession = useCallback(() => {
    const key = getFounderKey();
    setSession(Boolean(key));
    return key;
  }, [getFounderKey]);

  useEffect(() => {
    refreshSession();

    const interval = window.setInterval(
      refreshSession,
      1000,
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [refreshSession]);

  const requestApi = useCallback(
    async (
      method: "GET" | "POST",
      body?: Record<string, unknown>,
    ): Promise<ApiPayload> => {
      const key = refreshSession();

      if (!key) {
        throw new Error(
          "未检测到 Founder Session。请先进入 Founder Console 完成授权。",
        );
      }

      const response = await fetch(
        ENDPOINT,
        {
          method,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${key}`,
            ...(method === "POST"
              ? {
                  "Content-Type": "application/json",
                }
              : {}),
          },
          ...(method === "POST"
            ? {
                body: JSON.stringify(body ?? {}),
              }
            : {}),
          cache: "no-store",
        },
      );

      const payload =
        (await response.json()) as ApiPayload;

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.message ||
            payload.error ||
            payload.code ||
            "Inbound demand request failed.",
        );
      }

      return payload;
    },
    [refreshSession],
  );

  const loadCampaign = useCallback(
    async (showNotice = true) => {
      setError("");
      setLoading(true);

      try {
        const payload =
          await requestApi("GET");

        if (!payload.campaign) {
          throw new Error(
            "API response does not contain a campaign.",
          );
        }

        setCampaign(payload.campaign);

        if (showNotice) {
          setNotice(
            "获客方案已加载。草稿仍需人工审核，尚未发布。",
          );
        }
      } catch (value) {
        setError(
          value instanceof Error
            ? value.message
            : "Failed to load campaign.",
        );
      } finally {
        setLoading(false);
      }
    },
    [requestApi],
  );

  const loadLeads = useCallback(
    async (showNotice = true) => {
      setError("");
      setLoading(true);

      try {
        const payload = await requestApi(
          "POST",
          {
            mode: "list-leads",
            status:
              filterStatus === "all"
                ? undefined
                : filterStatus,
            limit: 500,
          },
        );

        setRecords(
          payload.result?.records ?? [],
        );

        if (showNotice) {
          setNotice(
            `线索列表已刷新，共 ${payload.result?.count ?? 0} 条记录。`,
          );
        }
      } catch (value) {
        setError(
          value instanceof Error
            ? value.message
            : "Failed to load saved leads.",
        );
      } finally {
        setLoading(false);
      }
    },
    [filterStatus, requestApi],
  );

  useEffect(() => {
    if (session && !campaign) {
      void loadCampaign(false);
    }
  }, [session, campaign, loadCampaign]);

  useEffect(() => {
    if (session) {
      void loadLeads(false);
    }
  }, [session, filterStatus, loadLeads]);

  function toggleChannel(channel: Channel) {
    setChannels((current) =>
      current.includes(channel)
        ? current.filter(
            (item) => item !== channel,
          )
        : [...current, channel],
    );
  }

  function updateLead<K extends keyof LeadForm>(
    key: K,
    value: LeadForm[K],
  ) {
    setLead((current) => ({
      ...current,
      [key]: value,
    }));

    setAssessment(null);
    setReplyDraft("");
  }

  async function generateCampaign() {
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const payload = await requestApi(
        "POST",
        {
          mode: "campaign",
          input: {
            industry,
            region,
            offerName,
            entryPrice: Number(entryPrice),
            diagnosticPrice: Number(diagnosticPrice),
            channels,
          },
        },
      );

      const nextCampaign =
        payload.result?.campaign;

      if (!nextCampaign) {
        throw new Error(
          "Campaign generation returned no campaign.",
        );
      }

      setCampaign(nextCampaign);
      setNotice(
        "方案已生成。请核对服务范围、价格与平台规则后再发布。",
      );
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Failed to generate campaign.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function runLeadAction(
    mode: "score-lead" | "reply-draft",
  ) {
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const payload = await requestApi(
        "POST",
        {
          mode,
          lead: normalizeLeadForm(lead),
        },
      );

      if (!payload.result?.assessment) {
        throw new Error(
          "Lead assessment was not returned.",
        );
      }

      setAssessment(
        payload.result.assessment,
      );

      if (mode === "reply-draft") {
        setReplyDraft(
          payload.result.replyDraft ?? "",
        );

        setNotice(
          "回复草稿已生成。请人工核实后，通过平台允许的方式回复。",
        );
      } else {
        setNotice(
          "线索评分已完成。评分仅用于安排跟进优先级。",
        );
      }
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Lead operation failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveLead() {
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const payload = await requestApi(
        "POST",
        {
          mode: "save-lead",
          lead: normalizeLeadForm(lead),
          note: editingNote,
        },
      );

      if (!payload.result?.record) {
        throw new Error(
          "The API did not return the saved record.",
        );
      }

      setRecords((current) => [
        payload.result!.record!,
        ...current.filter(
          (item) =>
            item.id !== payload.result!.record!.id,
        ),
      ]);

      setAssessment(
        payload.result.record.assessment,
      );

      setReplyDraft(
        payload.result.record.replyDraft,
      );

      setEditingRecordId(
        payload.result.record.id,
      );

      setEditingNote(
        payload.result.record.note,
      );

      setNotice(
        "线索已保存到服务端。请留意存储后端的持久性配置。",
      );
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Failed to save lead.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function updateRecord(
    id: string,
    updates: {
      status?: LeadStatus;
      note?: string;
    },
  ) {
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const payload = await requestApi(
        "POST",
        {
          mode: "update-lead",
          id,
          ...updates,
        },
      );

      const updated = payload.result?.record;

      if (!updated) {
        throw new Error(
          "The updated record was not returned.",
        );
      }

      setRecords((current) =>
        current.map((item) =>
          item.id === updated.id
            ? updated
            : item,
        ),
      );

      setEditingRecordId("");
      setEditingNote("");

      setNotice("线索跟进记录已更新。");
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Failed to update lead.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteRecord(id: string) {
    if (
      !window.confirm(
        "确定删除这条线索记录吗？此操作无法撤销。",
      )
    ) {
      return;
    }

    setError("");
    setNotice("");
    setLoading(true);

    try {
      await requestApi(
        "POST",
        {
          mode: "delete-lead",
          id,
        },
      );

      setRecords((current) =>
        current.filter(
          (item) => item.id !== id,
        ),
      );

      if (editingRecordId === id) {
        setEditingRecordId("");
        setEditingNote("");
      }

      setNotice("线索记录已删除。");
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Failed to delete lead.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyText(
    value: string,
    label: string,
  ) {
    setError("");
    setNotice("");

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error(
          "当前浏览器不支持剪贴板操作，请手动选择并复制文本。",
        );
      }

      await navigator.clipboard.writeText(value);
      setNotice(`${label}已复制。`);
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Copy failed.",
      );
    }
  }

  const visibleRecords = records;

  const contentAssets =
    campaign?.contentAssets ?? [];

  const sevenDayPlan =
    campaign?.sevenDayPlan ?? [];

  const inputGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
    marginTop: "18px",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px 16px 56px",
        background: "#09090b",
        color: "#fafafa",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
        }}
      >
        <header style={{ marginBottom: "26px" }}>
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "0.16em",
              color: "#a1a1aa",
            }}
          >
            PRIVATE FOUNDER WORKSPACE
          </div>

          <h1
            style={{
              fontSize: "30px",
              margin: "10px 0",
            }}
          >
            AIOS Inbound Demand Engine
          </h1>

          <p
            style={{
              maxWidth: "760px",
              color: "#a1a1aa",
              lineHeight: 1.7,
              fontSize: "14px",
            }}
          >
            C144.4 · 内容准备、需求识别、线索评分、客户回复与跟进记录。
            目标是验证真实客户需求和首笔收入，不制造虚假增长数据。
          </p>
        </header>

        <section style={panelStyle()}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div>
              <strong>Founder Session</strong>
              <div
                style={{
                  marginTop: "7px",
                  fontSize: "13px",
                  color: session ? "#86efac" : "#fca5a5",
                }}
              >
                {session
                  ? "Founder Session detected"
                  : "Founder Session not detected"}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <button
                type="button"
                onClick={() => void loadCampaign()}
                disabled={!session || loading}
                style={buttonStyle(!session || loading)}
              >
                刷新方案
              </button>

              <button
                type="button"
                onClick={() => void loadLeads()}
                disabled={!session || loading}
                style={buttonStyle(!session || loading)}
              >
                刷新线索
              </button>
            </div>
          </div>

          <p
            style={{
              marginTop: "14px",
              color: "#a1a1aa",
              fontSize: "12px",
              lineHeight: 1.6,
            }}
          >
            本页面使用现有 Founder Session。未授权请求不会读取或修改线索。
          </p>
        </section>

        {error && (
          <section
            role="alert"
            style={{
              ...panelStyle(),
              borderColor: "#7f1d1d",
              color: "#fca5a5",
              whiteSpace: "pre-wrap",
            }}
          >
            {error}
          </section>
        )}

        {notice && (
          <section
            role="status"
            style={{
              ...panelStyle(),
              borderColor: "#365314",
              color: "#bef264",
            }}
          >
            {notice}
          </section>
        )}

        <section style={panelStyle()}>
          <h2 style={{ marginTop: 0, fontSize: "19px" }}>
            01 · 获客方案与内容生成
          </h2>

          <p
            style={{
              color: "#a1a1aa",
              fontSize: "13px",
              lineHeight: 1.7,
            }}
          >
            行业和价格均为可调整的测试假设，不代表市场已经验证。
          </p>

          <div style={inputGridStyle}>
            <label>
              <span style={labelStyle()}>目标行业</span>
              <input
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
                maxLength={100}
                style={fieldStyle()}
              />
            </label>

            <label>
              <span style={labelStyle()}>目标地区</span>
              <input
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                maxLength={100}
                style={fieldStyle()}
              />
            </label>

            <label>
              <span style={labelStyle()}>服务名称</span>
              <input
                value={offerName}
                onChange={(event) => setOfferName(event.target.value)}
                maxLength={100}
                style={fieldStyle()}
              />
            </label>

            <label>
              <span style={labelStyle()}>入门版价格（元）</span>
              <input
                type="number"
                min="0"
                max="100000"
                value={entryPrice}
                onChange={(event) => setEntryPrice(event.target.value)}
                style={fieldStyle()}
              />
            </label>

            <label>
              <span style={labelStyle()}>诊断版价格（元）</span>
              <input
                type="number"
                min="0"
                max="100000"
                value={diagnosticPrice}
                onChange={(event) => setDiagnosticPrice(event.target.value)}
                style={fieldStyle()}
              />
            </label>
          </div>

          <div style={{ marginTop: "18px" }}>
            <div style={labelStyle()}>内容渠道</div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              {(["xiaohongshu", "xianyu"] as Channel[]).map(
                (channel) => (
                  <label
                    key={channel}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      fontSize: "13px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={channels.includes(channel)}
                      onChange={() => toggleChannel(channel)}
                    />
                    {CHANNEL_LABELS[channel]}
                  </label>
                ),
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void generateCampaign()}
            disabled={
              !session ||
              loading ||
              !industry.trim() ||
              !region.trim() ||
              !offerName.trim() ||
              channels.length === 0 ||
              !Number.isFinite(Number(entryPrice)) ||
              !Number.isFinite(Number(diagnosticPrice)) ||
              Number(entryPrice) < 0 ||
              Number(diagnosticPrice) < 0
            }
            style={{
              ...buttonStyle(
                !session ||
                  loading ||
                  !industry.trim() ||
                  !region.trim() ||
                  !offerName.trim() ||
                  channels.length === 0,
              ),
              marginTop: "18px",
            }}
          >
            生成获客方案与内容草稿
          </button>
        </section>

        {campaign && (
          <>
            <section style={panelStyle()}>
              <h2 style={{ marginTop: 0, fontSize: "19px" }}>
                02 · 服务 Offer
              </h2>

              <h3>{campaign.offer.name}</h3>

              <div style={inputGridStyle}>
                <div>
                  <div style={labelStyle()}>入门版</div>
                  <strong style={{ fontSize: "24px" }}>
                    ¥{campaign.offer.entryPrice}
                  </strong>
                  <ul>
                    {campaign.offer.entryDeliverables.map((item) => (
                      <li key={item} style={{ marginBottom: "8px" }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div style={labelStyle()}>诊断版</div>
                  <strong style={{ fontSize: "24px" }}>
                    ¥{campaign.offer.diagnosticPrice}
                  </strong>
                  <ul>
                    {campaign.offer.diagnosticDeliverables.map((item) => (
                      <li key={item} style={{ marginBottom: "8px" }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <h3>服务边界</h3>
              <ul>
                {campaign.offer.exclusions.map((item) => (
                  <li key={item} style={{ marginBottom: "7px" }}>
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section style={panelStyle()}>
              <h2 style={{ marginTop: 0, fontSize: "19px" }}>
                03 · 内容草稿
              </h2>

              {contentAssets.length === 0 && (
                <p style={{ color: "#a1a1aa" }}>
                  当前渠道组合没有生成内容，请调整渠道后重试。
                </p>
              )}

              {contentAssets.map((asset, index) => {
                const text = [
                  asset.title,
                  "",
                  asset.body,
                  "",
                  asset.callToAction,
                  "",
                  ...asset.disclosure,
                ].join("\n");

                return (
                  <article
                    key={`${asset.channel}-${index}`}
                    style={{
                      border: "1px solid #3f3f46",
                      borderRadius: "10px",
                      padding: "16px",
                      marginTop: "12px",
                    }}
                  >
                    <div style={labelStyle()}>
                      {CHANNEL_LABELS[asset.channel]} · {asset.format}
                    </div>

                    <h3 style={{ marginTop: 0 }}>
                      {asset.title}
                    </h3>

                    <pre
                      style={{
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                        fontFamily: "Arial, Helvetica, sans-serif",
                        fontSize: "13px",
                        lineHeight: 1.8,
                        color: "#d4d4d8",
                      }}
                    >
                      {asset.body}
                    </pre>

                    <p style={{ lineHeight: 1.7 }}>
                      {asset.callToAction}
                    </p>

                    <ul style={{ color: "#a1a1aa", fontSize: "12px" }}>
                      {asset.disclosure.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => void copyText(text, "内容草稿")}
                      style={buttonStyle()}
                    >
                      复制内容草稿
                    </button>
                  </article>
                );
              })}

              <p
                style={{
                  color: "#a1a1aa",
                  fontSize: "12px",
                  lineHeight: 1.7,
                }}
              >
                发布前核对平台规则、服务类目和内容真实性。系统不会自动发布或私信。
              </p>
            </section>

            <section style={panelStyle()}>
              <h2 style={{ marginTop: 0, fontSize: "19px" }}>
                04 · 七日内容计划
              </h2>

              {sevenDayPlan.map((item) => (
                <div
                  key={item.day}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "58px minmax(0, 1fr)",
                    gap: "12px",
                    border: "1px solid #3f3f46",
                    borderRadius: "9px",
                    padding: "12px",
                    marginBottom: "10px",
                  }}
                >
                  <div style={{ color: "#a1a1aa", fontSize: "12px" }}>
                    DAY
                    <div style={{ fontSize: "22px", color: "#fafafa" }}>
                      {item.day}
                    </div>
                  </div>

                  <div>
                    <div style={labelStyle()}>
                      {CHANNEL_LABELS[item.channel]}
                    </div>
                    <strong>{item.topic}</strong>
                    <p
                      style={{
                        color: "#a1a1aa",
                        fontSize: "12px",
                        lineHeight: 1.6,
                      }}
                    >
                      目标：{item.purpose}
                    </p>
                  </div>
                </div>
              ))}
            </section>

            <section style={panelStyle()}>
              <h2 style={{ marginTop: 0, fontSize: "19px" }}>
                05 · 客户需求采集问题
              </h2>

              {campaign.intakeQuestions.map((question, index) => (
                <div
                  key={question}
                  style={{
                    padding: "9px 0",
                    borderBottom: "1px solid #27272a",
                    fontSize: "13px",
                    lineHeight: 1.7,
                  }}
                >
                  {index + 1}. {question}
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  void copyText(
                    campaign.intakeQuestions
                      .map((question, index) => `${index + 1}. ${question}`)
                      .join("\n"),
                    "需求采集问题",
                  )
                }
                style={{ ...buttonStyle(), marginTop: "14px" }}
              >
                复制需求采集问题
              </button>
            </section>
          </>
        )}

        <section style={panelStyle()}>
          <h2 style={{ marginTop: 0, fontSize: "19px" }}>
            06 · 线索资格评估
          </h2>

          <p
            style={{
              color: "#a1a1aa",
              fontSize: "13px",
              lineHeight: 1.7,
            }}
          >
            只输入客户主动提供或你获准处理的信息。不要录入不必要的个人敏感信息。
          </p>

          <div style={inputGridStyle}>
            <label>
              <span style={labelStyle()}>业务类型</span>
              <input
                value={lead.businessType}
                onChange={(event) => updateLead("businessType", event.target.value)}
                placeholder="例如：家装、摄影、教育服务"
                style={fieldStyle()}
              />
            </label>

            <label>
              <span style={labelStyle()}>线索来源</span>
              <select
                value={lead.sourceChannel}
                onChange={(event) => updateLead("sourceChannel", event.target.value as Channel)}
                style={fieldStyle()}
              >
                <option value="xiaohongshu">小红书</option>
                <option value="xianyu">闲鱼</option>
              </select>
            </label>

            <label>
              <span style={labelStyle()}>是否正在投放广告</span>
              <select
                value={lead.currentAds}
                onChange={(event) => updateLead("currentAds", event.target.value as LeadSignal)}
                style={fieldStyle()}
              >
                <option value="unknown">尚不清楚</option>
                <option value="yes">是</option>
                <option value="no">否</option>
              </select>
            </label>

            <label>
              <span style={labelStyle()}>是否有近期广告或线索数据</span>
              <select
                value={lead.hasAdData}
                onChange={(event) => updateLead("hasAdData", event.target.value as LeadSignal)}
                style={fieldStyle()}
              >
                <option value="unknown">尚不清楚</option>
                <option value="yes">有</option>
                <option value="no">没有</option>
              </select>
            </label>

            <label>
              <span style={labelStyle()}>联系人决策权限</span>
              <select
                value={lead.decisionRole}
                onChange={(event) => updateLead("decisionRole", event.target.value as LeadRole)}
                style={fieldStyle()}
              >
                <option value="unknown">尚不清楚</option>
                <option value="decision-maker">能决定采购</option>
                <option value="influencer">参与建议</option>
              </select>
            </label>

            <label>
              <span style={labelStyle()}>客户预算范围</span>
              <select
                value={lead.budgetRange}
                onChange={(event) => updateLead("budgetRange", event.target.value as LeadBudget)}
                style={fieldStyle()}
              >
                <option value="unknown">尚不清楚</option>
                <option value="under-500">低于 500 元</option>
                <option value="500-2000">500–2000 元</option>
                <option value="2000-plus">2000 元以上</option>
              </select>
            </label>

            <label>
              <span style={labelStyle()}>解决问题的时间要求</span>
              <select
                value={lead.urgency}
                onChange={(event) => updateLead("urgency", event.target.value as LeadUrgency)}
                style={fieldStyle()}
              >
                <option value="unknown">尚不清楚</option>
                <option value="high">尽快解决</option>
                <option value="medium">近期考虑</option>
                <option value="low">暂不着急</option>
              </select>
            </label>

            <label>
              <span style={labelStyle()}>客户希望达成的目标</span>
              <input
                value={lead.goal}
                onChange={(event) => updateLead("goal", event.target.value)}
                placeholder="例如：提高有效咨询占比"
                style={fieldStyle()}
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              <span style={labelStyle()}>客户明确提出的问题</span>
              <textarea
                value={lead.currentProblem}
                onChange={(event) => updateLead("currentProblem", event.target.value)}
                rows={3}
                placeholder="记录客户实际描述的问题，不要把猜测当成事实。"
                style={{
                  ...fieldStyle(),
                  resize: "vertical",
                  lineHeight: 1.6,
                }}
              />
            </label>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginTop: "18px",
            }}
          >
            <button
              type="button"
              onClick={() => void runLeadAction("score-lead")}
              disabled={!session || loading}
              style={buttonStyle(!session || loading)}
            >
              评估线索
            </button>

            <button
              type="button"
              onClick={() => void runLeadAction("reply-draft")}
              disabled={!session || loading}
              style={{
                ...buttonStyle(!session || loading),
                background: "#27272a",
                color: "#fafafa",
              }}
            >
              生成客户回复草稿
            </button>

            <button
              type="button"
              onClick={() => void saveLead()}
              disabled={!session || loading || !lead.businessType.trim()}
              style={buttonStyle(!session || loading || !lead.businessType.trim())}
            >
              保存线索与评分
            </button>

            <button
              type="button"
              onClick={() => {
                setLead(INITIAL_LEAD);
                setAssessment(null);
                setReplyDraft("");
                setEditingRecordId("");
                setEditingNote("");
                setError("");
                setNotice("");
              }}
              disabled={loading}
              style={{
                ...buttonStyle(loading),
                background: "transparent",
                color: "#d4d4d8",
              }}
            >
              清空表单
            </button>
          </div>

          {assessment && (
            <div
              style={{
                border: "1px solid #3f3f46",
                borderRadius: "10px",
                padding: "16px",
                marginTop: "18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={labelStyle()}>线索评估结果</div>
                  <div style={{ fontSize: "22px", fontWeight: 700 }}>
                    {assessment.score}/100
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid #52525b",
                    borderRadius: "999px",
                    padding: "7px 12px",
                    fontSize: "12px",
                  }}
                >
                  {TIER_LABELS[assessment.tier]}
                </div>
              </div>

              <h3>评分依据</h3>
              {assessment.reasons.length > 0 ? (
                assessment.reasons.map((item) => (
                  <p key={item} style={{ fontSize: "13px", lineHeight: 1.7 }}>
                    - {item}
                  </p>
                ))
              ) : (
                <p style={{ color: "#a1a1aa", fontSize: "13px" }}>
                  暂无足够的正向判断依据。
                </p>
              )}

              <h3>待补充信息</h3>
              {assessment.missingInformation.map((item) => (
                <p key={item} style={{ fontSize: "13px", lineHeight: 1.7 }}>
                  - {item}
                </p>
              ))}

              <h3>建议下一步</h3>
              <p style={{ fontSize: "13px", lineHeight: 1.8 }}>
                {assessment.recommendedAction}
              </p>

              <p
                style={{
                  color: "#a1a1aa",
                  fontSize: "12px",
                  lineHeight: 1.7,
                }}
              >
                边界说明：{assessment.evidenceBoundary}
              </p>
            </div>
          )}

          {replyDraft && (
            <div
              style={{
                border: "1px solid #3f3f46",
                borderRadius: "10px",
                padding: "16px",
                marginTop: "18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <h3 style={{ fontSize: "15px", margin: 0 }}>
                  客户回复草稿
                </h3>

                <button
                  type="button"
                  onClick={() => void copyText(replyDraft, "客户回复草稿")}
                  style={buttonStyle()}
                >
                  复制回复
                </button>
              </div>

              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  fontFamily: "Arial, Helvetica, sans-serif",
                  fontSize: "13px",
                  lineHeight: 1.8,
                  color: "#e4e4e7",
                }}
              >
                {replyDraft}
              </pre>

              <p style={{ color: "#a1a1aa", fontSize: "12px", lineHeight: 1.7 }}>
                此处只生成草稿。发送前请人工检查，不会自动发送消息。
              </p>
            </div>
          )}
        </section>

        <section style={panelStyle()}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div>
              <h2 style={{ marginTop: 0, fontSize: "19px" }}>
                07 · 已保存线索
              </h2>
              <p style={{ color: "#a1a1aa", fontSize: "13px" }}>
                共显示 {visibleRecords.length} 条记录。跟进状态和内部备注可以在这里更新。
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadLeads()}
              disabled={!session || loading}
              style={buttonStyle(!session || loading)}
            >
              刷新列表
            </button>
          </div>

          <label style={{ display: "block", maxWidth: "300px" }}>
            <span style={labelStyle()}>按状态筛选</span>
            <select
              value={filterStatus}
              onChange={(event) =>
                setFilterStatus(event.target.value as LeadStatus | "all")
              }
              style={fieldStyle()}
            >
              <option value="all">全部状态</option>
              <option value="new">新线索</option>
              <option value="follow-up">跟进中</option>
              <option value="converted">已成交</option>
              <option value="closed">已关闭</option>
            </select>
          </label>

          {visibleRecords.length === 0 && (
            <div
              style={{
                border: "1px dashed #3f3f46",
                borderRadius: "10px",
                padding: "22px",
                marginTop: "16px",
                color: "#a1a1aa",
                fontSize: "13px",
                lineHeight: 1.7,
              }}
            >
              当前筛选下没有线索记录。先在上方填写线索，点击“保存线索与评分”。
            </div>
          )}

          {visibleRecords.map((record) => (
            <article
              key={record.id}
              style={{
                border: "1px solid #3f3f46",
                borderRadius: "10px",
                padding: "16px",
                marginTop: "14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <div>
                  <strong>
                    {record.lead.businessType || "未填写业务类型"}
                  </strong>

                  <div
                    style={{
                      marginTop: "6px",
                      color: "#a1a1aa",
                      fontSize: "12px",
                    }}
                  >
                    {CHANNEL_LABELS[record.lead.sourceChannel]} ·
                    创建于 {formatTime(record.createdAt)}
                  </div>
                </div>

                <div>
                  <strong>{record.assessment.score}/100</strong>
                  <div style={{ color: "#a1a1aa", fontSize: "12px" }}>
                    {TIER_LABELS[record.assessment.tier]}
                  </div>
                </div>
              </div>

              {record.lead.currentProblem && (
                <p style={{ fontSize: "13px", lineHeight: 1.7 }}>
                  问题：{record.lead.currentProblem}
                </p>
              )}

              {record.lead.goal && (
                <p style={{ fontSize: "13px", lineHeight: 1.7 }}>
                  目标：{record.lead.goal}
                </p>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr)",
                  gap: "12px",
                  marginTop: "14px",
                }}
              >
                <label>
                  <span style={labelStyle()}>跟进状态</span>
                  <select
                    value={record.status}
                    disabled={loading}
                    onChange={(event) =>
                      void updateRecord(record.id, {
                        status: event.target.value as LeadStatus,
                      })
                    }
                    style={fieldStyle()}
                  >
                    {(
                      [
                        "new",
                        "follow-up",
                        "converted",
                        "closed",
                      ] as LeadStatus[]
                    ).map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span style={labelStyle()}>内部备注</span>
                  <textarea
                    rows={2}
                    value={
                      editingRecordId === record.id
                        ? editingNote
                        : record.note
                    }
                    onFocus={() => {
                      setEditingRecordId(record.id);
                      setEditingNote(record.note);
                    }}
                    onChange={(event) => {
                      setEditingRecordId(record.id);
                      setEditingNote(event.target.value);
                    }}
                    maxLength={2000}
                    style={{
                      ...fieldStyle(),
                      resize: "vertical",
                    }}
                  />
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginTop: "12px",
                }}
              >
                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    void updateRecord(record.id, {
                      note:
                        editingRecordId === record.id
                          ? editingNote
                          : record.note,
                    })
                  }
                  style={buttonStyle(loading)}
                >
                  保存备注
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setLead(record.lead);
                    setAssessment(record.assessment);
                    setReplyDraft(record.replyDraft);
                    setEditingRecordId(record.id);
                    setEditingNote(record.note);
                    setNotice("已载入线索。修改后如需保存为新记录，请使用上方保存按钮。");
                  }}
                  style={{
                    ...buttonStyle(loading),
                    background: "#27272a",
                    color: "#fafafa",
                  }}
                >
                  查看并载入
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void copyText(record.replyDraft, "客户回复草稿")}
                  style={{
                    ...buttonStyle(loading),
                    background: "transparent",
                    color: "#d4d4d8",
                  }}
                >
                  复制回复草稿
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void deleteRecord(record.id)}
                  style={{
                    ...buttonStyle(loading),
                    background: "#451a1a",
                    borderColor: "#7f1d1d",
                    color: "#fecaca",
                  }}
                >
                  删除记录
                </button>
              </div>

              <div
                style={{
                  marginTop: "10px",
                  color: "#71717a",
                  fontSize: "11px",
                }}
              >
                最后更新：{formatTime(record.updatedAt)} · ID: {record.id}
              </div>
            </article>
          ))}
        </section>

        <section
          style={{
            ...panelStyle(),
            background: "#0c0c0f",
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: "16px" }}>
            运行边界与当前限制
          </h2>

          <div
            style={{
              color: "#a1a1aa",
              fontSize: "13px",
              lineHeight: 1.9,
            }}
          >
            <div>- 内容、评分与回复草稿均需人工审核。</div>
            <div>- API 不执行平台发布、自动私信或收款。</div>
            <div>- 线索存储依赖当前 AIOS storage 后端配置；请勿把内存存储当作可靠的长期数据库。</div>
            <div>- 只有实际收到款项后，才能将订单标记为成交并记录真实收入。</div>
            <div>- 不承诺固定线索数量、成交额或广告回报率。</div>
            <div>- 不要保存客户密码、支付凭证或不必要的个人敏感信息。</div>
          </div>
        </section>

        <footer
          style={{
            color: "#71717a",
            fontSize: "11px",
            lineHeight: 1.7,
          }}
        >
          AIOS Alpha · C144.4 Inbound Demand Engine · Founder only
        </footer>
      </div>
    </main>
  );
}
