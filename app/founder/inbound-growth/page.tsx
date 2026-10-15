"use client";
import {
  useCallback,
  useEffect,
  useMemo,
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
type ContentMode =
  | "evidence-driven"
  | "general-safe-fallback";
type OpportunityPriority =
  | "primary"
  | "backup"
  | "defer";
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
  marketContext?: {
    source:
      | "c168-market-intelligence"
      | "founder"
      | "manual"
      | "unknown";
    market?: string;
    geography?: string;
    verifiedProblems?: string[];
    buyingSignals?: string[];
    acquisitionSignals?: string[];
    diagnosticHypotheses?: string[];
    evidenceBoundary?: string;
  };
  contentStrategy?: {
    mode: ContentMode;
    primaryObjective: string;
    learningObjective: string;
    evidenceBoundary: string;
  };
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
interface ApiPayload {
  success?: boolean;
  code?: string;
  message?: string;
  error?: string;
  campaign?: Campaign;
  contentOpportunities?: ContentOpportunity[];
  marketIntelligence?: MarketIntelligence;
  marketContextApplied?: boolean;
  contentMode?: ContentMode;
  persistenceEnabled?: boolean;
  externalSideEffectExecuted?: boolean;
  externalPublishingExecuted?: boolean;
  result?: {
    mode?: string;
    campaign?: Campaign;
    contentOpportunities?: ContentOpportunity[];
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
const CHANNEL_LABELS: Record<
  Channel,
  string
> = {
  xiaohongshu: "小红书",
  xianyu: "闲鱼",
};
const PRIORITY_LABELS: Record<
  OpportunityPriority,
  string
> = {
  primary: "今日主机会",
  backup: "备用机会",
  defer: "后续测试",
};
const STATUS_LABELS: Record<
  LeadStatus,
  string
> = {
  new: "新线索",
  "follow-up": "跟进中",
  converted: "已成交",
  closed: "已关闭",
};
const TIER_LABELS: Record<
  LeadTier,
  string
> = {
  priority: "优先跟进",
  nurture: "补充信息",
  "low-priority": "低优先级",
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
  primary = false,
): CSSProperties {
  return {
    border: "1px solid #52525b",
    borderRadius: "8px",
    padding: "10px 14px",
    background: disabled
      ? "#27272a"
      : primary
        ? "#fafafa"
        : "#18181b",
    color: disabled
      ? "#71717a"
      : primary
        ? "#09090b"
        : "#fafafa",
    fontSize: "13px",
    fontWeight: 600,
    cursor: disabled
      ? "not-allowed"
      : "pointer",
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
function mutedStyle(): CSSProperties {
  return {
    color: "#a1a1aa",
    fontSize: "13px",
    lineHeight: 1.7,
  };
}
function badgeStyle(
  active = false,
): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    border: "1px solid #3f3f46",
    borderRadius: "999px",
    padding: "4px 9px",
    background: active
      ? "#fafafa"
      : "#18181b",
    color: active
      ? "#09090b"
      : "#d4d4d8",
    fontSize: "11px",
    fontWeight: 600,
  };
}
function formatTime(
  timestamp: number,
): string {
  if (!Number.isFinite(timestamp)) {
    return "N/A";
  }
  return new Date(
    timestamp,
  ).toLocaleString();
}
function normalizeLeadForm(
  value: LeadForm,
): LeadForm {
  return {
    businessType:
      value.businessType.trim(),
    currentAds:
      value.currentAds,
    hasAdData:
      value.hasAdData,
    decisionRole:
      value.decisionRole,
    budgetRange:
      value.budgetRange,
    urgency:
      value.urgency,
    goal:
      value.goal.trim(),
    currentProblem:
      value.currentProblem.trim(),
    sourceChannel:
      value.sourceChannel,
  };
}
function safeScore(
  value: number,
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 1) {
    return Math.round(
      value * 100,
    );
  }
  return Math.round(value);
}
function opportunityLabel(
  priority: OpportunityPriority,
): string {
  return (
    PRIORITY_LABELS[priority] ??
    "研究机会"
  );
}
async function copyText(
  value: string,
  label: string,
): Promise<void> {
  if (
    typeof navigator ===
      "undefined" ||
    !navigator.clipboard
  ) {
    return;
  }
  await navigator.clipboard.writeText(
    value,
  );
  void label;
}
export default function Page() {
  const [session, setSession] =
    useState(false);
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");
  const [notice, setNotice] =
    useState("");
  const [campaign, setCampaign] =
    useState<Campaign | null>(null);
  const [
    contentOpportunities,
    setContentOpportunities,
  ] = useState<
    ContentOpportunity[]
  >([]);
  const [
    marketIntelligence,
    setMarketIntelligence,
  ] =
    useState<MarketIntelligence | null>(
      null,
    );
  const [contentMode, setContentMode] =
    useState<ContentMode>(
      "general-safe-fallback",
    );
  const [
    marketContextApplied,
    setMarketContextApplied,
  ] = useState(false);
  const [industry, setIndustry] =
    useState(
      "深圳家装、旧房局改、全屋定制",
    );
  const [region, setRegion] =
    useState("深圳");
  const [offerName, setOfferName] =
    useState(
      "48小时广告获客诊断",
    );
  const [entryPrice, setEntryPrice] =
    useState("399");
  const [
    diagnosticPrice,
    setDiagnosticPrice,
  ] = useState("699");
  const [channels, setChannels] =
    useState<Channel[]>([
      "xiaohongshu",
      "xianyu",
    ]);
  const [lead, setLead] =
    useState<LeadForm>(
      INITIAL_LEAD,
    );
  const [assessment, setAssessment] =
    useState<LeadAssessment | null>(
      null,
    );
  const [replyDraft, setReplyDraft] =
    useState("");
  const [records, setRecords] =
    useState<LeadRecord[]>([]);
  const [filterStatus, setFilterStatus] =
    useState<LeadStatus | "all">(
      "all",
    );
  const [
    editingRecordId,
    setEditingRecordId,
  ] = useState("");
  const [
    editingNote,
    setEditingNote,
  ] = useState("");
  const getFounderKey =
    useCallback(() => {
      if (
        typeof window ===
        "undefined"
      ) {
        return "";
      }
      return (
        window.sessionStorage.getItem(
          FOUNDER_STORAGE_KEY,
        )?.trim() ?? ""
      );
    }, []);
  const refreshSession =
    useCallback(() => {
      const key =
        getFounderKey();
      setSession(
        Boolean(key),
      );
      return key;
    }, [getFounderKey]);
  useEffect(() => {
    refreshSession();
    const interval =
      window.setInterval(
        refreshSession,
        1000,
      );
    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [refreshSession]);
  const requestApi =
    useCallback(
      async (
        method:
          | "GET"
          | "POST",
        body?: Record<
          string,
          unknown
        >,
      ): Promise<ApiPayload> => {
        const key =
          refreshSession();
        if (!key) {
          throw new Error(
            "未检测到 Founder Session。请先进入 Founder Console 完成授权。",
          );
        }
        const response =
          await fetch(
            ENDPOINT,
            {
              method,
              headers: {
                Accept:
                  "application/json",
                Authorization:
                  `Bearer ${key}`,
                ...(method ===
                "POST"
                  ? {
                      "Content-Type":
                        "application/json",
                    }
                  : {}),
              },
              ...(method ===
              "POST"
                ? {
                    body:
                      JSON.stringify(
                        body ?? {},
                      ),
                  }
                : {}),
              cache:
                "no-store",
            },
          );
        const payload =
          (await response.json()) as ApiPayload;
        if (
          !response.ok ||
          !payload.success
        ) {
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
  const applyCampaignPayload =
    useCallback(
      (payload: ApiPayload) => {
        const nextCampaign =
          payload.result
            ?.campaign ??
          payload.campaign;
        if (!nextCampaign) {
          throw new Error(
            "API response does not contain a campaign.",
          );
        }
        const opportunities =
          payload.result
            ?.contentOpportunities ??
          payload.contentOpportunities ??
          [];
        const intelligence =
          payload.result
            ?.marketIntelligence ??
          payload.marketIntelligence ??
          null;
        const applied =
          payload.result
            ?.marketContextApplied ??
          payload.marketContextApplied ??
          Boolean(
            nextCampaign.marketContext,
          );
        const mode =
          payload.result
            ?.contentMode ??
          payload.contentMode ??
          nextCampaign
            .contentStrategy
            ?.mode ??
          "general-safe-fallback";
        setCampaign(
          nextCampaign,
        );
        setContentOpportunities(
          opportunities,
        );
        setMarketIntelligence(
          intelligence,
        );
        setMarketContextApplied(
          applied,
        );
        setContentMode(
          mode,
        );
      },
      [],
    );
  const loadCampaign =
    useCallback(
      async (
        showNotice = true,
      ) => {
        setError("");
        setLoading(true);
        try {
          const payload =
            await requestApi(
              "GET",
            );
          applyCampaignPayload(
            payload,
          );
          if (showNotice) {
            setNotice(
              "今日获客决策已刷新。主机会可进入人工发布流程。",
            );
          }
        } catch (
          value
        ) {
          setError(
            value instanceof Error
              ? value.message
              : "Failed to load campaign.",
          );
        } finally {
          setLoading(false);
        }
      },
      [
        applyCampaignPayload,
        requestApi,
      ],
    );
  const loadLeads =
    useCallback(
      async (
        showNotice = true,
      ) => {
        setError("");
        setLoading(true);
        try {
          const payload =
            await requestApi(
              "POST",
              {
                mode:
                  "list-leads",
                limit: 500,
              },
            );
          setRecords(
            payload.result
              ?.records ?? [],
          );
          if (showNotice) {
            setNotice(
              `真实询盘记录已刷新，共 ${payload.result?.count ?? 0} 条。`,
            );
          }
        } catch (
          value
        ) {
          setError(
            value instanceof Error
              ? value.message
              : "Failed to load leads.",
          );
        } finally {
          setLoading(false);
        }
      },
      [requestApi],
    );
  useEffect(() => {
    if (
      session &&
      !campaign
    ) {
      void loadCampaign(
        false,
      );
    }
  }, [
    session,
    campaign,
    loadCampaign,
  ]);
  useEffect(() => {
    if (session) {
      void loadLeads(
        false,
      );
    }
  }, [
    session,
    loadLeads,
  ]);
  function toggleChannel(
    channel: Channel,
  ) {
    setChannels(
      (current) =>
        current.includes(
          channel,
        )
          ? current.filter(
              (item) =>
                item !== channel,
            )
          : [
              ...current,
              channel,
            ],
    );
  }
  function updateLead<
    K extends keyof LeadForm,
  >(
    key: K,
    value: LeadForm[K],
  ) {
    setLead(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );
    setAssessment(null);
    setReplyDraft("");
  }
  async function generateCampaign() {
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const payload =
        await requestApi(
          "POST",
          {
            mode: "campaign",
            input: {
              industry,
              region,
              offerName,
              entryPrice:
                Number(
                  entryPrice,
                ),
              diagnosticPrice:
                Number(
                  diagnosticPrice,
                ),
              channels,
            },
          },
        );
      applyCampaignPayload(
        payload,
      );
      setNotice(
        "今日获客方案已根据最新 C168 市场证据生成。请人工审核后发布。",
      );
    } catch (
      value
    ) {
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
    mode:
      | "score-lead"
      | "reply-draft",
  ) {
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const payload =
        await requestApi(
          "POST",
          {
            mode,
            lead:
              normalizeLeadForm(
                lead,
              ),
          },
        );
      if (
        !payload.result
          ?.assessment
      ) {
        throw new Error(
          "Lead assessment was not returned.",
        );
      }
      setAssessment(
        payload.result
          .assessment,
      );
      if (
        mode ===
        "reply-draft"
      ) {
        setReplyDraft(
          payload.result
            .replyDraft ?? "",
        );
        setNotice(
          "回复草稿已生成。请人工核实后，通过平台允许的方式回复。",
        );
      } else {
        setNotice(
          "线索评分已完成。评分仅用于安排跟进优先级。",
        );
      }
    } catch (
      value
    ) {
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
      const payload =
        await requestApi(
          "POST",
          {
            mode:
              "save-lead",
            lead:
              normalizeLeadForm(
                lead,
              ),
            note:
              editingNote,
          },
        );
      const record =
        payload.result
          ?.record;
      if (!record) {
        throw new Error(
          "The API did not return the saved record.",
        );
      }
      setRecords(
        (current) => [
          record,
          ...current.filter(
            (item) =>
              item.id !==
              record.id,
          ),
        ],
      );
      setAssessment(
        record.assessment,
      );
      setReplyDraft(
        record.replyDraft,
      );
      setEditingRecordId(
        record.id,
      );
      setEditingNote(
        record.note,
      );
      setNotice(
        "真实询盘已保存。未发生外部联系或自动发布。",
      );
    } catch (
      value
    ) {
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
      const payload =
        await requestApi(
          "POST",
          {
            mode:
              "update-lead",
            id,
            ...updates,
          },
        );
      const updated =
        payload.result
          ?.record;
      if (!updated) {
        throw new Error(
          "The updated record was not returned.",
        );
      }
      setRecords(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              updated.id
                ? updated
                : item,
          ),
      );
      setEditingRecordId("");
      setEditingNote("");
      setNotice(
        "线索跟进记录已更新。",
      );
    } catch (
      value
    ) {
      setError(
        value instanceof Error
          ? value.message
          : "Failed to update lead.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function deleteRecord(
    id: string,
  ) {
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const payload =
        await requestApi(
          "POST",
          {
            mode:
              "delete-lead",
            id,
          },
        );
      if (
        !payload.success
      ) {
        throw new Error(
          "Lead deletion failed.",
        );
      }
      setRecords(
        (current) =>
          current.filter(
            (item) =>
              item.id !== id,
          ),
      );
      if (
        editingRecordId ===
        id
      ) {
        setEditingRecordId(
          "",
        );
        setEditingNote("");
      }
      setNotice(
        "询盘记录已删除。",
      );
    } catch (
      value
    ) {
      setError(
        value instanceof Error
          ? value.message
          : "Failed to delete lead.",
      );
    } finally {
      setLoading(false);
    }
  }
  const visibleRecords =
    useMemo(
      () =>
        filterStatus ===
        "all"
          ? records
          : records.filter(
              (record) =>
                record.status ===
                filterStatus,
            ),
      [
        filterStatus,
        records,
      ],
    );
  const newLeadCount =
    records.filter(
      (record) =>
        record.status ===
        "new",
    ).length;
  const followUpCount =
    records.filter(
      (record) =>
        record.status ===
        "follow-up",
    ).length;
  const convertedCount =
    records.filter(
      (record) =>
        record.status ===
        "converted",
    ).length;
  const closedCount =
    records.filter(
      (record) =>
        record.status ===
        "closed",
    ).length;
  const primaryOpportunity =
    contentOpportunities.find(
      (item) =>
        item.priority ===
        "primary",
    ) ??
    contentOpportunities[0] ??
    null;
  const backupOpportunities =
    contentOpportunities.filter(
      (item) =>
        item.priority !==
        "primary",
    );
  const primaryAsset =
    campaign?.contentAssets?.[0] ??
    null;
  if (!session) {
    return (
      <main
        style={{
          minHeight:
            "100vh",
          background:
            "#09090b",
          color:
            "#fafafa",
          padding:
            "40px 20px",
        }}
      >
        <div
          style={{
            maxWidth:
              "980px",
            margin:
              "0 auto",
          }}
        >
          <section
            style={panelStyle()}
          >
            <div
              style={{
                fontSize:
                  "11px",
                color:
                  "#71717a",
                letterSpacing:
                  "0.08em",
                textTransform:
                  "uppercase",
              }}
            >
              Founder only
            </div>
            <h1
              style={{
                margin:
                  "8px 0",
                fontSize:
                  "28px",
              }}
            >
              AIOS Inbound Growth
            </h1>
            <p
              style={mutedStyle()}
            >
              未检测到 Founder Session。
              请先进入 Founder Console 完成授权。
            </p>
          </section>
        </div>
      </main>
    );
  }
  return (
    <main
      style={{
        minHeight:
          "100vh",
        background:
          "#09090b",
        color:
          "#fafafa",
        padding:
          "28px 16px 60px",
      }}
    >
      <div
        style={{
          maxWidth:
            "1080px",
          margin:
            "0 auto",
        }}
      >
        <header
          style={{
            marginBottom:
              "22px",
          }}
        >
          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "flex-start",
              gap:
                "14px",
              flexWrap:
                "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color:
                    "#71717a",
                  fontSize:
                    "11px",
                  letterSpacing:
                    "0.08em",
                  textTransform:
                    "uppercase",
                }}
              >
                C168.7 · Founder
              </div>
              <h1
                style={{
                  margin:
                    "6px 0",
                  fontSize:
                    "28px",
                  lineHeight:
                    1.2,
                }}
              >
                外部平台获客
              </h1>
              <div
                style={mutedStyle()}
              >
                市场发现 → 内容机会 → 人工发布 → 真实询盘 → 资格判断 → Offer → 交付 → 回款
              </div>
            </div>
            <button
              type="button"
              disabled={
                loading
              }
              onClick={() =>
                void loadCampaign()
              }
              style={buttonStyle(
                loading,
                true,
              )}
            >
              {loading
                ? "分析中..."
                : "刷新今日机会"}
            </button>
          </div>
        </header>
        {error && (
          <section
            style={{
              ...panelStyle(),
              borderColor:
                "#7f1d1d",
            }}
          >
            <strong>
              操作失败
            </strong>
            <div
              style={{
                marginTop:
                  "7px",
                color:
                  "#fca5a5",
                fontSize:
                  "13px",
                lineHeight:
                  1.7,
              }}
            >
              {error}
            </div>
          </section>
        )}
        {notice && (
          <section
            style={{
              ...panelStyle(),
              borderColor:
                "#3f3f46",
            }}
          >
            <div
              style={{
                color:
                  "#d4d4d8",
                fontSize:
                  "13px",
              }}
            >
              {notice}
            </div>
          </section>
        )}
        <section
          style={panelStyle()}
        >
          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              gap:
                "12px",
              flexWrap:
                "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color:
                    "#71717a",
                  fontSize:
                    "11px",
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    "0.08em",
                }}
              >
                Today's Research Queue
              </div>
              <h2
                style={{
                  margin:
                    "6px 0",
                  fontSize:
                    "21px",
                }}
              >
                发现今天最值得研究的客户
              </h2>
              <div
                style={mutedStyle()}
              >
                当前页面优先显示 C168.7 根据公开证据筛选出的市场机会，而不是假设某个具体客户一定会购买。
              </div>
            </div>
            <div
              style={{
                display:
                  "flex",
                gap:
                  "7px",
                flexWrap:
                  "wrap",
                alignItems:
                  "flex-start",
              }}
            >
              <span
                style={badgeStyle(
                  marketContextApplied,
                )}
              >
                {marketContextApplied
                  ? "Market Evidence Applied"
                  : "Safe Fallback"}
              </span>
              <span
                style={badgeStyle()}
              >
                {contentMode ===
                "evidence-driven"
                  ? "Evidence-driven"
                  : "Fallback"}
              </span>
            </div>
          </div>
          {primaryOpportunity ? (
            <article
              style={{
                marginTop:
                  "18px",
                border:
                  "1px solid #52525b",
                borderRadius:
                  "12px",
                padding:
                  "18px",
                background:
                  "#18181b",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  gap:
                    "12px",
                  flexWrap:
                    "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      display:
                        "flex",
                      gap:
                        "7px",
                      flexWrap:
                        "wrap",
                      marginBottom:
                        "9px",
                    }}
                  >
                    <span
                      style={badgeStyle(
                        true,
                      )}
                    >
                      {opportunityLabel(
                        primaryOpportunity.priority,
                      )}
                    </span>
                    <span
                      style={badgeStyle()}
                    >
                      Score{" "}
                      {safeScore(
                        primaryOpportunity.score,
                      )}
                    </span>
                    <span
                      style={badgeStyle()}
                    >
                      {
                        CHANNEL_LABELS[
                          primaryOpportunity
                            .recommendedChannel
                        ]
                      }
                    </span>
                  </div>
                  <h3
                    style={{
                      margin:
                        0,
                      fontSize:
                        "19px",
                      lineHeight:
                        1.45,
                    }}
                  >
                    {
                      primaryOpportunity.topic
                    }
                  </h3>
                </div>
                <div
                  style={{
                    color:
                      "#a1a1aa",
                    fontSize:
                      "12px",
                  }}
                >
                  {primaryOpportunity.publishNow
                    ? "建议现在人工发布"
                    : "暂不发布"}
                </div>
              </div>
              <p
                style={{
                  margin:
                    "14px 0 0",
                  color:
                    "#d4d4d8",
                  fontSize:
                    "13px",
                  lineHeight:
                    1.8,
                }}
              >
                {
                  primaryOpportunity.rationale
                }
              </p>
              <div
                style={{
                  marginTop:
                    "14px",
                  padding:
                    "12px",
                  border:
                    "1px solid #27272a",
                  borderRadius:
                    "9px",
                }}
              >
                <div
                  style={{
                    color:
                      "#71717a",
                    fontSize:
                      "11px",
                    marginBottom:
                      "6px",
                  }}
                >
                  Evidence basis
                </div>
                <div
                  style={{
                    color:
                      "#a1a1aa",
                    fontSize:
                      "12px",
                    lineHeight:
                      1.7,
                  }}
                >
                  {primaryOpportunity.evidenceBasis.join(
                    " · ",
                  )}
                </div>
              </div>
              <div
                style={{
                  display:
                    "flex",
                  gap:
                    "8px",
                  flexWrap:
                    "wrap",
                  marginTop:
                    "14px",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    void copyText(
                      primaryOpportunity.topic,
                      "研究主题",
                    )
                  }
                  style={buttonStyle(
                    false,
                    true,
                  )}
                >
                  复制研究主题
                </button>
                {primaryAsset && (
                  <button
                    type="button"
                    onClick={() =>
                      void copyText(
                        `${primaryAsset.title}\n\n${primaryAsset.body}\n\n${primaryAsset.callToAction}`,
                        "内容草稿",
                      )
                    }
                    style={buttonStyle()}
                  >
                    复制主内容草稿
                  </button>
                )}
              </div>
            </article>
          ) : (
            <div
              style={{
                marginTop:
                  "18px",
                padding:
                  "18px",
                border:
                  "1px dashed #3f3f46",
                borderRadius:
                  "10px",
                color:
                  "#71717a",
                fontSize:
                  "13px",
                lineHeight:
                  1.8,
              }}
            >
              当前没有可靠的 C168 inbound opportunity。
              系统将保持安全 fallback，不会虚构客户需求或购买意图。
            </div>
          )}
          {backupOpportunities.length >
            0 && (
            <div
              style={{
                marginTop:
                  "16px",
                display:
                  "grid",
                gap:
                  "9px",
              }}
            >
              {backupOpportunities.map(
                (
                  opportunity,
                ) => (
                  <article
                    key={
                      opportunity.id
                    }
                    style={{
                      border:
                        "1px solid #27272a",
                      borderRadius:
                        "9px",
                      padding:
                        "13px",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap:
                          "10px",
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <strong
                        style={{
                          fontSize:
                            "13px",
                        }}
                      >
                        {
                          opportunity.topic
                        }
                      </strong>
                      <span
                        style={badgeStyle()}
                      >
                        {opportunityLabel(
                          opportunity.priority,
                        )}{" "}
                        ·{" "}
                        {safeScore(
                          opportunity.score,
                        )}
                      </span>
                    </div>
                    <div
                      style={{
                        marginTop:
                          "6px",
                        color:
                          "#71717a",
                        fontSize:
                          "12px",
                        lineHeight:
                          1.6,
                      }}
                    >
                      {
                        opportunity.rationale
                      }
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
          <div
            style={{
              marginTop:
                "16px",
              padding:
                "12px",
              border:
                "1px solid #27272a",
              borderRadius:
                "9px",
              color:
                "#71717a",
              fontSize:
                "11px",
              lineHeight:
                1.7,
            }}
          >
            重要边界：C168 Evidence Score 是研究优先级，不是客户购买意愿。
            公开证据可以支持市场级内容假设，但不能证明某个具体商家广告效果差、获客成本高、预算充足或准备购买。
          </div>
        </section>
        {marketIntelligence && (
          <section
            style={panelStyle()}
          >
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                gap:
                  "10px",
                flexWrap:
                  "wrap",
              }}
            >
              <div>
                <h2
                  style={{
                    margin:
                      0,
                    fontSize:
                      "18px",
                  }}
                >
                  C168 市场发现
                </h2>
                <div
                  style={{
                    ...mutedStyle(),
                    marginTop:
                      "5px",
                  }}
                >
                  {marketIntelligence.targetMarket ??
                    industry}{" "}
                  ·{" "}
                  {marketIntelligence.geography ??
                    region}
                </div>
              </div>
              <div
                style={{
                  display:
                    "flex",
                  gap:
                    "7px",
                  flexWrap:
                    "wrap",
                }}
              >
                <span
                  style={badgeStyle()}
                >
                  候选{" "}
                  {marketIntelligence.candidateCount ??
                    0}
                </span>
                <span
                  style={badgeStyle()}
                >
                  Inbound{" "}
                  {marketIntelligence.inboundOpportunityCount ??
                    0}
                </span>
                <span
                  style={badgeStyle()}
                >
                  Evidence{" "}
                  {marketIntelligence.sourceCount ??
                    0}
                </span>
                <span
                  style={badgeStyle()}
                >
                  Hosts{" "}
                  {marketIntelligence.independentHosts ??
                    0}
                </span>
              </div>
            </div>
            {marketIntelligence.conclusion && (
              <div
                style={{
                  marginTop:
                    "13px",
                  color:
                    "#d4d4d8",
                  fontSize:
                    "13px",
                  lineHeight:
                    1.8,
                }}
              >
                {
                  marketIntelligence.conclusion
                }
              </div>
            )}
            {marketIntelligence.nextStep && (
              <div
                style={{
                  marginTop:
                    "9px",
                  color:
                    "#a1a1aa",
                  fontSize:
                    "12px",
                  lineHeight:
                    1.7,
                }}
              >
                Next:{" "}
                {
                  marketIntelligence.nextStep
                }
              </div>
            )}
          </section>
        )}
        <section
          style={panelStyle()}
        >
          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              gap:
                "12px",
              flexWrap:
                "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  margin:
                    0,
                  fontSize:
                    "18px",
                }}
              >
                获客方案
              </h2>
              <div
                style={{
                  ...mutedStyle(),
                  marginTop:
                    "5px",
                }}
              >
                只有市场证据可用时才进入 evidence-driven 模式。
              </div>
            </div>
            {campaign && (
              <span
                style={badgeStyle()}
              >
                {campaign.version}
              </span>
            )}
          </div>
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap:
                "12px",
              marginTop:
                "16px",
            }}
          >
            <div>
              <label
                style={labelStyle()}
              >
                行业
              </label>
              <input
                value={
                  industry
                }
                onChange={(
                  event,
                ) =>
                  setIndustry(
                    event.target
                      .value,
                  )
                }
                style={
                  fieldStyle()
                }
              />
            </div>
            <div>
              <label
                style={labelStyle()}
              >
                地区
              </label>
              <input
                value={
                  region
                }
                onChange={(
                  event,
                ) =>
                  setRegion(
                    event.target
                      .value,
                  )
                }
                style={
                  fieldStyle()
                }
              />
            </div>
            <div>
              <label
                style={labelStyle()}
              >
                Entry Offer
              </label>
              <input
                value={
                  offerName
                }
                onChange={(
                  event,
                ) =>
                  setOfferName(
                    event.target
                      .value,
                  )
                }
                style={
                  fieldStyle()
                }
              />
            </div>
            <div>
              <label
                style={labelStyle()}
              >
                Entry Price
              </label>
              <input
                value={
                  entryPrice
                }
                onChange={(
                  event,
                ) =>
                  setEntryPrice(
                    event.target
                      .value,
                  )
                }
                inputMode="numeric"
                style={
                  fieldStyle()
                }
              />
            </div>
            <div>
              <label
                style={labelStyle()}
              >
                Diagnostic Price
              </label>
              <input
                value={
                  diagnosticPrice
                }
                onChange={(
                  event,
                ) =>
                  setDiagnosticPrice(
                    event.target
                      .value,
                  )
                }
                inputMode="numeric"
                style={
                  fieldStyle()
                }
              />
            </div>
          </div>
          <div
            style={{
              marginTop:
                "13px",
            }}
          >
            <label
              style={labelStyle()}
            >
              发布渠道
            </label>
            <div
              style={{
                display:
                  "flex",
                gap:
                  "7px",
                flexWrap:
                  "wrap",
              }}
            >
              {(
                [
                  "xiaohongshu",
                  "xianyu",
                ] as Channel[]
              ).map(
                (
                  channel,
                ) => (
                  <button
                    key={
                      channel
                    }
                    type="button"
                    onClick={() =>
                      toggleChannel(
                        channel,
                      )
                    }
                    style={badgeStyle(
                      channels.includes(
                        channel,
                      ),
                    )}
                  >
                    {
                      CHANNEL_LABELS[
                        channel
                      ]
                    }
                  </button>
                ),
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={
              loading ||
              channels.length ===
                0
            }
            onClick={() =>
              void generateCampaign()
            }
            style={{
              ...buttonStyle(
                loading ||
                  channels.length ===
                    0,
                true,
              ),
              marginTop:
                "16px",
            }}
          >
            {loading
              ? "AIOS 正在分析市场..."
              : "重新生成今日获客方案"}
          </button>
        </section>
        {campaign && (
          <section
            style={panelStyle()}
          >
            <h2
              style={{
                marginTop:
                  0,
                fontSize:
                  "18px",
              }}
            >
              主内容资产
            </h2>
            <div
              style={{
                display:
                  "grid",
                gap:
                  "10px",
              }}
            >
              {campaign.contentAssets.map(
                (
                  asset,
                  index,
                ) => (
                  <article
                    key={`${asset.channel}-${asset.format}-${index}`}
                    style={{
                      border:
                        "1px solid #27272a",
                      borderRadius:
                        "10px",
                      padding:
                        "15px",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap:
                          "10px",
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <div>
                        <span
                          style={badgeStyle()}
                        >
                          {
                            CHANNEL_LABELS[
                              asset.channel
                            ]
                          }
                        </span>
                        <span
                          style={{
                            ...badgeStyle(),
                            marginLeft:
                              "6px",
                          }}
                        >
                          {
                            asset.format
                          }
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void copyText(
                            `${asset.title}\n\n${asset.body}\n\n${asset.callToAction}`,
                            "内容资产",
                          )
                        }
                        style={buttonStyle()}
                      >
                        复制
                      </button>
                    </div>
                    <h3
                      style={{
                        margin:
                          "12px 0 7px",
                        fontSize:
                          "15px",
                      }}
                    >
                      {
                        asset.title
                      }
                    </h3>
                    <div
                      style={{
                        whiteSpace:
                          "pre-wrap",
                        color:
                          "#d4d4d8",
                        fontSize:
                          "13px",
                        lineHeight:
                          1.8,
                      }}
                    >
                      {
                        asset.body
                      }
                    </div>
                    <div
                      style={{
                        marginTop:
                          "10px",
                        color:
                          "#fafafa",
                        fontSize:
                          "13px",
                        fontWeight:
                          600,
                      }}
                    >
                      CTA:{" "}
                      {
                        asset.callToAction
                      }
                    </div>
                    {asset.disclosure.length >
                      0 && (
                      <div
                        style={{
                          marginTop:
                            "10px",
                          color:
                            "#71717a",
                          fontSize:
                            "11px",
                          lineHeight:
                            1.7,
                        }}
                      >
                        {asset.disclosure.join(
                          " · ",
                        )}
                      </div>
                    )}
                  </article>
                ),
              )}
            </div>
          </section>
        )}
        <section
          style={panelStyle()}
        >
          <h2
            style={{
              marginTop:
                0,
              fontSize:
                "18px",
            }}
          >
            真实询盘录入
          </h2>
          <div
            style={mutedStyle()}
          >
            这里只记录真实客户主动提供的信息，不把公开市场候选人自动写入客户数据库。
          </div>
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap:
                "12px",
              marginTop:
                "16px",
            }}
          >
            <div>
              <label
                style={labelStyle()}
              >
                业务类型
              </label>
              <input
                value={
                  lead.businessType
                }
                onChange={(
                  event,
                ) =>
                  updateLead(
                    "businessType",
                    event.target
                      .value,
                  )
                }
                placeholder="例如：深圳旧房局改"
                style={
                  fieldStyle()
                }
              />
            </div>
            <div>
              <label
                style={labelStyle()}
              >
                来源
              </label>
              <select
                value={
                  lead.sourceChannel
                }
                onChange={(
                  event,
                ) =>
                  updateLead(
                    "sourceChannel",
                    event.target
                      .value as Channel,
                  )
                }
                style={
                  fieldStyle()
                }
              >
                <option value="xiaohongshu">
                  小红书
                </option>
                <option value="xianyu">
                  闲鱼
                </option>
              </select>
            </div>
            <div>
              <label
                style={labelStyle()}
              >
                当前是否投广告
              </label>
              <select
                value={
                  lead.currentAds
                }
                onChange={(
                  event,
                ) =>
                  updateLead(
                    "currentAds",
                    event.target
                      .value as LeadSignal,
                  )
                }
                style={
                  fieldStyle()
                }
              >
                <option value="unknown">
                  未知
                </option>
                <option value="yes">
                  是
                </option>
                <option value="no">
                  否
                </option>
              </select>
            </div>
            <div>
              <label
                style={labelStyle()}
              >
                是否有近期广告/线索数据
              </label>
              <select
                value={
                  lead.hasAdData
                }
                onChange={(
                  event,
                ) =>
                  updateLead(
                    "hasAdData",
                    event.target
                      .value as LeadSignal,
                  )
                }
                style={
                  fieldStyle()
                }
              >
                <option value="unknown">
                  未知
                </option>
                <option value="yes">
                  有
                </option>
                <option value="no">
                  没有
                </option>
              </select>
            </div>
            <div>
              <label
                style={labelStyle()}
              >
                决策角色
              </label>
              <select
                value={
                  lead.decisionRole
                }
                onChange={(
                  event,
                ) =>
                  updateLead(
                    "decisionRole",
                    event.target
                      .value as LeadRole,
                  )
                }
                style={
                  fieldStyle()
                }
              >
                <option value="unknown">
                  未知
                </option>
                <option value="decision-maker">
                  决策人
                </option>
                <option value="influencer">
                  影响者
                </option>
              </select>
            </div>
            <div>
              <label
                style={labelStyle()}
              >
                预算范围
              </label>
              <select
                value={
                  lead.budgetRange
                }
                onChange={(
                  event,
                ) =>
                  updateLead(
                    "budgetRange",
                    event.target
                      .value as LeadBudget,
                  )
                }
                style={
                  fieldStyle()
                }
              >
                <option value="unknown">
                  未知
                </option>
                <option value="under-500">
                  ¥500 以下
                </option>
                <option value="500-2000">
                  ¥500 - ¥2,000
                </option>
                <option value="2000-plus">
                  ¥2,000+
                </option>
              </select>
            </div>
            <div>
              <label
                style={labelStyle()}
              >
                紧迫程度
              </label>
              <select
                value={
                  lead.urgency
                }
                onChange={(
                  event,
                ) =>
                  updateLead(
                    "urgency",
                    event.target
                      .value as LeadUrgency,
                  )
                }
                style={
                  fieldStyle()
                }
              >
                <option value="unknown">
                  未知
                </option>
                <option value="high">
                  高
                </option>
                <option value="medium">
                  中
                </option>
                <option value="low">
                  低
                </option>
              </select>
            </div>
          </div>
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap:
                "12px",
              marginTop:
                "12px",
            }}
          >
            <div>
              <label
                style={labelStyle()}
              >
                客户目标
              </label>
              <textarea
                value={
                  lead.goal
                }
                onChange={(
                  event,
                ) =>
                  updateLead(
                    "goal",
                    event.target
                      .value,
                  )
                }
                placeholder="客户自己表达的目标"
                rows={4}
                style={{
                  ...fieldStyle(),
                  resize:
                    "vertical",
                }}
              />
            </div>
            <div>
              <label
                style={labelStyle()}
              >
                客户当前问题
              </label>
              <textarea
                value={
                  lead.currentProblem
                }
                onChange={(
                  event,
                ) =>
                  updateLead(
                    "currentProblem",
                    event.target
                      .value,
                  )
                }
                placeholder="客户自己表达的问题"
                rows={4}
                style={{
                  ...fieldStyle(),
                  resize:
                    "vertical",
                }}
              />
            </div>
          </div>
          <div
            style={{
              display:
                "flex",
              gap:
                "8px",
              flexWrap:
                "wrap",
              marginTop:
                "15px",
            }}
          >
            <button
              type="button"
              disabled={
                loading
              }
              onClick={() =>
                void runLeadAction(
                  "score-lead",
                )
              }
              style={buttonStyle(
                loading,
                true,
              )}
            >
              评分
            </button>
            <button
              type="button"
              disabled={
                loading
              }
              onClick={() =>
                void runLeadAction(
                  "reply-draft",
                )
              }
              style={buttonStyle(
                loading,
              )}
            >
              生成回复草稿
            </button>
            <button
              type="button"
              disabled={
                loading
              }
              onClick={() =>
                void saveLead()
              }
              style={buttonStyle(
                loading,
              )}
            >
              保存真实询盘
            </button>
          </div>
        </section>
        {assessment && (
          <section
            style={panelStyle()}
          >
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                gap:
                  "10px",
                flexWrap:
                  "wrap",
              }}
            >
              <div>
                <h2
                  style={{
                    margin:
                      0,
                    fontSize:
                      "18px",
                  }}
                >
                  线索判断
                </h2>
                <div
                  style={{
                    ...mutedStyle(),
                    marginTop:
                      "5px",
                  }}
                >
                  评分只用于安排跟进优先级。
                </div>
              </div>
              <div
                style={{
                  display:
                    "flex",
                  gap:
                    "7px",
                }}
              >
                <span
                  style={badgeStyle(
                    true,
                  )}
                >
                  Score{" "}
                  {
                    assessment.score
                  }
                </span>
                <span
                  style={badgeStyle()}
                >
                  {
                    TIER_LABELS[
                      assessment
                        .tier
                    ]
                  }
                </span>
              </div>
            </div>
            <div
              style={{
                marginTop:
                  "15px",
                display:
                  "grid",
                gap:
                  "8px",
              }}
            >
              {assessment.reasons.map(
                (
                  reason,
                ) => (
                  <div
                    key={
                      reason
                    }
                    style={{
                      color:
                        "#d4d4d8",
                      fontSize:
                        "13px",
                      lineHeight:
                        1.7,
                    }}
                  >
                    ·{" "}
                    {
                      reason
                    }
                  </div>
                ),
              )}
            </div>
            <div
              style={{
                marginTop:
                  "14px",
                padding:
                  "12px",
                border:
                  "1px solid #27272a",
                borderRadius:
                  "9px",
              }}
            >
              <strong
                style={{
                  fontSize:
                    "12px",
                }}
              >
                建议动作
              </strong>
              <div
                style={{
                  marginTop:
                    "6px",
                  color:
                    "#a1a1aa",
                  fontSize:
                    "12px",
                  lineHeight:
                    1.7,
                }}
              >
                {
                  assessment.recommendedAction
                }
              </div>
            </div>
            {assessment.missingInformation.length >
              0 && (
              <div
                style={{
                  marginTop:
                    "14px",
                }}
              >
                <strong
                  style={{
                    fontSize:
                      "12px",
                  }}
                >
                  还需要确认
                </strong>
                <ul
                  style={{
                    color:
                      "#a1a1aa",
                    fontSize:
                      "12px",
                    lineHeight:
                      1.7,
                  }}
                >
                  {assessment.missingInformation.map(
                    (
                      item,
                    ) => (
                      <li
                        key={
                          item
                        }
                      >
                        {
                          item
                        }
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}
            <div
              style={{
                marginTop:
                  "14px",
                color:
                  "#71717a",
                fontSize:
                  "11px",
                lineHeight:
                  1.7,
              }}
            >
              {
                assessment.evidenceBoundary
              }
            </div>
          </section>
        )}
        {replyDraft && (
          <section
            style={panelStyle()}
          >
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                gap:
                  "10px",
                flexWrap:
                  "wrap",
              }}
            >
              <h2
                style={{
                  marginTop:
                    0,
                  fontSize:
                    "18px",
                }}
              >
                客户回复草稿
              </h2>
              <button
                type="button"
                onClick={() =>
                  void copyText(
                    replyDraft,
                    "回复草稿",
                  )
                }
                style={buttonStyle(
                  false,
                  true,
                )}
              >
                复制回复
              </button>
            </div>
            <div
              style={{
                whiteSpace:
                  "pre-wrap",
                color:
                  "#d4d4d8",
                fontSize:
                  "13px",
                lineHeight:
                  1.8,
              }}
            >
              {
                replyDraft
              }
            </div>
          </section>
        )}
        <section
          style={panelStyle()}
        >
          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              gap:
                "12px",
              flexWrap:
                "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  margin:
                    0,
                  fontSize:
                    "18px",
                }}
              >
                真实询盘
              </h2>
              <div
                style={{
                  ...mutedStyle(),
                  marginTop:
                    "6px",
                }}
              >
                新线索 {newLeadCount} · 跟进中{" "}
                {followUpCount} · 已成交{" "}
                {convertedCount} · 已关闭{" "}
                {closedCount}
              </div>
            </div>
            <button
              type="button"
              disabled={
                loading
              }
              onClick={() =>
                void loadLeads()
              }
              style={buttonStyle(
                loading,
              )}
            >
              刷新
            </button>
          </div>
          <div
            style={{
              display:
                "flex",
              gap:
                "6px",
              flexWrap:
                "wrap",
              margin:
                "16px 0",
            }}
          >
            {(
              [
                "all",
                "new",
                "follow-up",
                "converted",
                "closed",
              ] as const
            ).map(
              (
                status,
              ) => (
                <button
                  key={
                    status
                  }
                  type="button"
                  onClick={() =>
                    setFilterStatus(
                      status,
                    )
                  }
                  style={{
                    ...buttonStyle(),
                    padding:
                      "7px 10px",
                    background:
                      filterStatus ===
                      status
                        ? "#fafafa"
                        : "#18181b",
                    color:
                      filterStatus ===
                      status
                        ? "#09090b"
                        : "#fafafa",
                  }}
                >
                  {status ===
                  "all"
                    ? "全部"
                    : STATUS_LABELS[
                        status
                      ]}
                </button>
              ),
            )}
          </div>
          {visibleRecords.length ===
            0 && (
            <div
              style={{
                padding:
                  "22px",
                border:
                  "1px dashed #3f3f46",
                borderRadius:
                  "10px",
                color:
                  "#71717a",
                fontSize:
                  "13px",
                lineHeight:
                  1.7,
              }}
            >
              当前没有真实询盘记录。
              <br />
              这不是系统失败。下一步应该是人工审核主机会内容并发布，等待真实平台询盘。
            </div>
          )}
          <div
            style={{
              display:
                "grid",
              gap:
                "12px",
            }}
          >
            {visibleRecords.map(
              (
                record,
              ) => (
                <article
                  key={
                    record.id
                  }
                  style={{
                    border:
                      "1px solid #27272a",
                    borderRadius:
                      "10px",
                    padding:
                      "15px",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      gap:
                        "10px",
                      flexWrap:
                        "wrap",
                    }}
                  >
                    <div>
                      <strong>
                        {
                          record
                            .lead
                            .businessType ||
                          "未填写业务类型"
                        }
                      </strong>
                      <div
                        style={{
                          marginTop:
                            "5px",
                          color:
                            "#71717a",
                          fontSize:
                            "11px",
                        }}
                      >
                        {
                          CHANNEL_LABELS[
                            record
                              .lead
                              .sourceChannel
                          ]
                        }{" "}
                        ·{" "}
                        {
                          formatTime(
                            record.createdAt,
                          )
                        }
                      </div>
                    </div>
                    <div
                      style={{
                        display:
                          "flex",
                        gap:
                          "6px",
                        alignItems:
                          "center",
                      }}
                    >
                      <span
                        style={badgeStyle()}
                      >
                        {
                          STATUS_LABELS[
                            record.status
                          ]
                        }
                      </span>
                      <span
                        style={{
                          color:
                            "#a1a1aa",
                          fontSize:
                            "11px",
                        }}
                      >
                        Score{" "}
                        {
                          record
                            .assessment
                            .score
                        }
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop:
                        "12px",
                      color:
                        "#d4d4d8",
                      fontSize:
                        "13px",
                      lineHeight:
                        1.7,
                    }}
                  >
                    {
                      record
                        .lead
                        .currentProblem ||
                      "未填写当前问题"
                    }
                  </div>
                  {record.note && (
                    <div
                      style={{
                        marginTop:
                          "10px",
                        color:
                          "#a1a1aa",
                        fontSize:
                          "12px",
                      }}
                    >
                      Note:{" "}
                      {
                        record.note
                      }
                    </div>
                  )}
                  <div
                    style={{
                      display:
                        "flex",
                      gap:
                        "7px",
                      flexWrap:
                        "wrap",
                      marginTop:
                        "13px",
                    }}
                  >
                    <select
                      value={
                        record.status
                      }
                      onChange={(
                        event,
                      ) =>
                        void updateRecord(
                          record.id,
                          {
                            status:
                              event
                                .target
                                .value as LeadStatus,
                          },
                        )
                      }
                      style={{
                        ...fieldStyle(),
                        width:
                          "auto",
                        minWidth:
                          "120px",
                      }}
                    >
                      <option value="new">
                        新线索
                      </option>
                      <option value="follow-up">
                        跟进中
                      </option>
                      <option value="converted">
                        已成交
                      </option>
                      <option value="closed">
                        已关闭
                      </option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRecordId(
                          record.id,
                        );
                        setEditingNote(
                          record.note,
                        );
                      }}
                      style={buttonStyle()}
                    >
                      编辑备注
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void deleteRecord(
                          record.id,
                        )
                      }
                      style={buttonStyle()}
                    >
                      删除
                    </button>
                  </div>
                  {editingRecordId ===
                    record.id && (
                    <div
                      style={{
                        marginTop:
                          "10px",
                        display:
                          "flex",
                        gap:
                          "8px",
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <input
                        value={
                          editingNote
                        }
                        onChange={(
                          event,
                        ) =>
                          setEditingNote(
                            event
                              .target
                              .value,
                          )
                        }
                        style={{
                          ...fieldStyle(),
                          flex:
                            "1 1 260px",
                        }}
                        placeholder="记录真实跟进结果"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          void updateRecord(
                            record.id,
                            {
                              note:
                                editingNote,
                            },
                          )
                        }
                        style={buttonStyle(
                          false,
                          true,
                        )}
                      >
                        保存备注
                      </button>
                    </div>
                  )}
                </article>
              ),
            )}
          </div>
        </section>
        <section
          style={panelStyle()}
        >
          <h2
            style={{
              marginTop:
                0,
              fontSize:
                "18px",
            }}
          >
            商业闭环
          </h2>
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(150px, 1fr))",
              gap:
                "8px",
              color:
                "#d4d4d8",
              fontSize:
                "12px",
            }}
          >
            {[
              "C168 市场发现",
              "今日主机会",
              "内容假设",
              "小红书 / 闲鱼发布",
              "真实询盘",
              "资格判断",
              "¥399 诊断",
              "¥699 验证",
              "交付",
              "真实回款",
              "结果复盘",
            ].map(
              (step) => (
                <div
                  key={
                    step
                  }
                  style={{
                    padding:
                      "11px",
                    border:
                      "1px solid #27272a",
                    borderRadius:
                      "8px",
                  }}
                >
                  {
                    step
                  }
                </div>
              ),
            )}
          </div>
        </section>
        <section
          style={panelStyle()}
        >
          <h2
            style={{
              marginTop:
                0,
              fontSize:
                "18px",
            }}
          >
            证据与执行边界
          </h2>
          <div
            style={{
              ...mutedStyle(),
              lineHeight:
                1.9,
            }}
          >
            <div>
              - C168 Evidence Score 是研究优先级，不是客户购买意愿。
            </div>
            <div>
              - Buying Signal 是公开市场信号，不等于真实购买意图。
            </div>
            <div>
              - 公开广告、内容或咨询入口不能证明某家公司广告效果不好。
            </div>
            <div>
              - AIOS 不自动发布小红书或闲鱼内容。
            </div>
            <div>
              - AIOS 不自动私信潜在客户。
            </div>
            <div>
              - AIOS 不操作客户广告账户。
            </div>
            <div>
              - AIOS 不虚构客户、付款、成交或收入。
            </div>
            <div>
              - 只有真实客户主动提供的信息才进入真实询盘记录。
            </div>
            <div>
              - Founder 发布前必须人工审核内容和平台规则。
            </div>
            <div>
              - 当前目标不是让市场认识 AIOS，而是借助已有平台流量获得第一批真实客户。
            </div>
          </div>
        </section>
        <footer
          style={{
            color:
              "#52525b",
            fontSize:
              "11px",
            lineHeight:
              1.7,
          }}
        >
          AIOS Alpha · C168.7 External Platform Inbound Engine · Founder only
        </footer>
      </div>
    </main>
  );
}
