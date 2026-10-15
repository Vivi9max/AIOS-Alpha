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
  integrity?: Record<
    string,
    unknown
  >;
}

interface ApiPayload {
  success?: boolean;
  code?: string;
  message?: string;
  error?: string;
  campaign?: Campaign;
  marketIntelligence?: MarketIntelligence;
  marketContextApplied?: boolean;
  contentMode?: ContentMode;
  result?: {
    mode?: string;
    campaign?: Campaign;
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
  persistenceEnabled?: boolean;
  externalSideEffectExecuted?: boolean;
  externalPublishingExecuted?: boolean;
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

const TIER_LABELS: Record<
  LeadTier,
  string
> = {
  priority: "优先跟进",
  nurture: "补充信息",
  "low-priority": "低优先级",
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

function formatTime(
  timestamp: number,
): string {
  if (
    !Number.isFinite(timestamp)
  ) {
    return "N/A";
  }

  return new Date(
    timestamp,
  ).toLocaleString();
}

function normalizeLeadForm(
  lead: LeadForm,
): LeadForm {
  return {
    businessType:
      lead.businessType,
    currentAds:
      lead.currentAds,
    hasAdData:
      lead.hasAdData,
    decisionRole:
      lead.decisionRole,
    budgetRange:
      lead.budgetRange,
    urgency:
      lead.urgency,
    goal:
      lead.goal,
    currentProblem:
      lead.currentProblem,
    sourceChannel:
      lead.sourceChannel,
  };
}

function actionButtonLabel(
  loading: boolean,
): string {
  return loading
    ? "AIOS 正在分析市场..."
    : "运行今日获客决策";
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

  const [marketIntelligence, setMarketIntelligence] =
    useState<MarketIntelligence | null>(
      null,
    );

  const [contentMode, setContentMode] =
    useState<ContentMode>(
      "general-safe-fallback",
    );

  const [marketContextApplied, setMarketContextApplied] =
    useState(false);

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

  const [diagnosticPrice, setDiagnosticPrice] =
    useState("699");

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

  const [editingRecordId, setEditingRecordId] =
    useState("");

  const [editingNote, setEditingNote] =
    useState("");

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
                    body: JSON.stringify(
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

        if (
          !nextCampaign
        ) {
          throw new Error(
            "API response does not contain a campaign.",
          );
        }

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

          if (
            showNotice
          ) {
            setNotice(
              "今日获客决策已加载。内容仍需人工审核和人工发布。",
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

          if (
            showNotice
          ) {
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

    setAssessment(
      null,
    );

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
        "今日获客方案已根据最新市场证据生成。请人工审核后发布。",
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
            .replyDraft ??
            "",
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

      setEditingRecordId(
        "",
      );

      setEditingNote(
        "",
      );

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
          mode:
            "delete-lead",
          id,
        },
      );

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
        setEditingNote(
          "",
        );
      }

      setNotice(
        "线索记录已删除。",
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

  async function copyText(
    value: string,
    label: string,
  ) {
    setError("");
    setNotice("");

    try {
      if (
        !navigator.clipboard
          ?.writeText
      ) {
        throw new Error(
          "当前浏览器不支持剪贴板操作，请手动选择并复制文本。",
        );
      }

      await navigator.clipboard.writeText(
        value,
      );

      setNotice(
        `${label}已复制。`,
      );
    } catch (
      value
    ) {
      setError(
        value instanceof Error
          ? value.message
          : "Copy failed.",
      );
    }
  }

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

  const visibleRecords =
    filterStatus ===
    "all"
      ? records
      : records.filter(
          (record) =>
            record.status ===
            filterStatus,
        );

  const contentAssets =
    campaign?.contentAssets ??
    [];

  const sevenDayPlan =
    campaign?.sevenDayPlan ??
    [];

  const primaryAsset =
    contentAssets[0] ??
    null;

  const xiaohongshuAssets =
    contentAssets.filter(
      (asset) =>
        asset.channel ===
        "xiaohongshu",
    );

  const xianyuAssets =
    contentAssets.filter(
      (asset) =>
        asset.channel ===
        "xianyu",
    );

  const nextAction =
    newLeadCount > 0
      ? {
          title:
            "先处理真实新询盘",
          detail:
            "核实真实需求、决策角色、预算、时间和当前问题，不要把市场候选人当成客户。",
        }
      : followUpCount > 0
        ? {
            title:
              "推进正在跟进的真实线索",
            detail:
              "为每条线索明确下一步动作和时间。",
          }
        : records.length ===
            0
          ? {
              title:
                "今天先获得第一条真实询盘",
              detail:
                "选择一条AIOS生成的内容，人工审核后发布到小红书或闲鱼。",
            }
          : convertedCount >
              0
            ? {
                title:
                  "核对真实成交与回款",
                detail:
                  "成交状态必须有真实订单或收款证据支持。",
              }
            : {
                title:
                  "复盘内容与询盘",
                detail:
                  "检查真实咨询来自哪个主题、渠道和Offer，再决定下一轮内容。",
              };

  const marketModeLabel =
    contentMode ===
    "evidence-driven"
      ? "Evidence-driven"
      : "Safe fallback";

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "12px",
  };

  return (
    <main
      style={{
        minHeight:
          "100vh",
        padding:
          "24px 16px 60px",
        background:
          "#09090b",
        color:
          "#fafafa",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth:
            "1160px",
          margin:
            "0 auto",
        }}
      >
        <header
          style={{
            marginBottom:
              "24px",
          }}
        >
          <div
            style={{
              fontSize:
                "11px",
              letterSpacing:
                "0.16em",
              color:
                "#71717a",
            }}
          >
            PRIVATE FOUNDER WORKSPACE
          </div>

          <h1
            style={{
              fontSize:
                "30px",
              margin:
                "10px 0 8px",
            }}
          >
            AIOS 外部平台获客决策台
          </h1>

          <p
            style={{
              ...mutedStyle(),
              maxWidth:
                "820px",
            }}
          >
            AIOS 不依赖自身市场流量。先从真实市场证据发现值得讨论的获客问题，再生成小红书和闲鱼内容，由 Founder 人工审核和发布；真实询盘回来后，再进入线索判断、Offer、交付和收款记录。
          </p>
        </header>

        {!session && (
          <section
            style={panelStyle()}
          >
            <h2
              style={{
                marginTop:
                  0,
                fontSize:
                  "16px",
              }}
            >
              Founder Session
            </h2>

            <div
              style={
                mutedStyle()
              }
            >
              当前没有检测到 Founder Session。请先进入 Founder Console 完成授权。
            </div>
          </section>
        )}

        {error && (
          <section
            style={{
              ...panelStyle(),
              border:
                "1px solid #7f1d1d",
              background:
                "#1c1010",
            }}
          >
            <strong>
              操作失败
            </strong>

            <div
              style={{
                marginTop:
                  "6px",
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
              border:
                "1px solid #365314",
              background:
                "#101509",
            }}
          >
            <div
              style={{
                color:
                  "#bef264",
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
                "16px",
              flexWrap:
                "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color:
                    "#a1a1aa",
                  fontSize:
                    "12px",
                }}
              >
                C168.6
              </div>

              <h2
                style={{
                  margin:
                    "6px 0",
                  fontSize:
                    "20px",
                }}
              >
                今天应该发布什么？
              </h2>

              <div
                style={
                  mutedStyle()
                }
              >
                不推广 AIOS 品牌。推广的是客户真正关心的问题和解决方案。
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                void generateCampaign()
              }
              disabled={
                loading ||
                !session
              }
              style={buttonStyle(
                loading ||
                  !session,
                true,
              )}
            >
              {actionButtonLabel(
                loading,
              )}
            </button>
          </div>

          <div
            style={{
              ...gridStyle,
              marginTop:
                "18px",
            }}
          >
            <div>
              <label
                style={
                  labelStyle()
                }
              >
                目标市场
              </label>

              <input
                value={
                  region
                }
                onChange={(
                  event,
                ) =>
                  setRegion(
                    event
                      .target
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
                style={
                  labelStyle()
                }
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
                    event
                      .target
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
                style={
                  labelStyle()
                }
              >
                Offer
              </label>

              <input
                value={
                  offerName
                }
                onChange={(
                  event,
                ) =>
                  setOfferName(
                    event
                      .target
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
                style={
                  labelStyle()
                }
              >
                入口价格
              </label>

              <input
                inputMode="numeric"
                value={
                  entryPrice
                }
                onChange={(
                  event,
                ) =>
                  setEntryPrice(
                    event
                      .target
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
                style={
                  labelStyle()
                }
              >
                验证价格
              </label>

              <input
                inputMode="numeric"
                value={
                  diagnosticPrice
                }
                onChange={(
                  event,
                ) =>
                  setDiagnosticPrice(
                    event
                      .target
                      .value,
                  )
                }
                style={
                  fieldStyle()
                }
              />
            </div>
          </div>

          <div
            style={{
              marginTop:
                "16px",
            }}
          >
            <label
              style={
                labelStyle()
              }
            >
              外部平台
            </label>

            <div
              style={{
                display:
                  "flex",
                gap:
                  "8px",
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
                ) => {
                  const selected =
                    channels.includes(
                      channel,
                    );

                  return (
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
                      style={{
                        ...buttonStyle(
                          false,
                          selected,
                        ),
                        background:
                          selected
                            ? "#fafafa"
                            : "#18181b",
                      }}
                    >
                      {
                        CHANNEL_LABELS[
                          channel
                        ]
                      }
                    </button>
                  );
                },
              )}
            </div>
          </div>
        </section>

        <section
          style={panelStyle()}
        >
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(150px, 1fr))",
              gap:
                "10px",
            }}
          >
            <div>
              <div
                style={
                  mutedStyle()
                }
              >
                主路径
              </div>
              <strong>
                小红书 / 闲鱼 Inbound
              </strong>
            </div>

            <div>
              <div
                style={
                  mutedStyle()
                }
              >
                Entry Offer
              </div>
              <strong>
                ¥399
              </strong>
            </div>

            <div>
              <div
                style={
                  mutedStyle()
                }
              >
                Upgrade
              </div>
              <strong>
                ¥699
              </strong>
            </div>

            <div>
              <div
                style={
                  mutedStyle()
                }
              >
                第一目标
              </div>
              <strong>
                1个真实付费客户
              </strong>
            </div>
          </div>
        </section>

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
                今日市场发现
              </h2>

              <div
                style={{
                  ...mutedStyle(),
                  marginTop:
                    "6px",
                }}
              >
                C168 只负责发现和排序市场证据，不把候选企业直接当客户。
              </div>
            </div>

            <span
              style={{
                alignSelf:
                  "flex-start",
                border:
                  "1px solid #3f3f46",
                borderRadius:
                  "999px",
                padding:
                  "5px 9px",
                fontSize:
                  "11px",
                color:
                  contentMode ===
                  "evidence-driven"
                    ? "#bef264"
                    : "#a1a1aa",
              }}
            >
              {marketModeLabel}
            </span>
          </div>

          <div
            style={{
              ...gridStyle,
              marginTop:
                "18px",
            }}
          >
            <div>
              <div
                style={
                  mutedStyle()
                }
              >
                Inbound Opportunity
              </div>
              <strong
                style={{
                  fontSize:
                    "22px",
                }}
              >
                {
                  marketIntelligence
                    ?.inboundOpportunityCount ??
                  0
                }
              </strong>
            </div>

            <div>
              <div
                style={
                  mutedStyle()
                }
              >
                市场 Evidence
              </div>
              <strong
                style={{
                  fontSize:
                    "22px",
                }}
              >
                {
                  marketIntelligence
                    ?.sourceCount ??
                  0
                }
              </strong>
            </div>

            <div>
              <div
                style={
                  mutedStyle()
                }
              >
                独立 Hosts
              </div>
              <strong
                style={{
                  fontSize:
                    "22px",
                }}
              >
                {
                  marketIntelligence
                    ?.independentHosts ??
                  0
                }
              </strong>
            </div>

            <div>
              <div
                style={
                  mutedStyle()
                }
              >
                Selective Outbound
              </div>
              <strong
                style={{
                  fontSize:
                    "22px",
                }}
              >
                {
                  marketIntelligence
                    ?.selectiveOutboundCount ??
                  0
                }
              </strong>
            </div>
          </div>

          {marketIntelligence
            ?.conclusion && (
            <div
              style={{
                marginTop:
                  "18px",
                padding:
                  "14px",
                border:
                  "1px solid #27272a",
                borderRadius:
                  "10px",
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

          {marketIntelligence
            ?.nextStep && (
            <div
              style={{
                marginTop:
                  "10px",
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
                今天最值得发布的内容
              </h2>

              <div
                style={
                  mutedStyle()
                }
              >
                AIOS 生成的是平台原生内容草稿，不是 AIOS 品牌广告。
              </div>
            </div>

            {primaryAsset && (
              <button
                type="button"
                onClick={() =>
                  void copyText(
                    [
                      primaryAsset.title,
                      "",
                      primaryAsset.body,
                      "",
                      primaryAsset.callToAction,
                    ].join(
                      "\n",
                    ),
                    "首条内容",
                  )
                }
                style={buttonStyle(
                  false,
                  true,
                )}
              >
                复制首条内容
              </button>
            )}
          </div>

          {!primaryAsset && (
            <div
              style={{
                marginTop:
                  "18px",
                color:
                  "#a1a1aa",
                fontSize:
                  "13px",
              }}
            >
              尚未生成内容。点击“运行今日获客决策”。
            </div>
          )}

          {primaryAsset && (
            <article
              style={{
                marginTop:
                  "18px",
                padding:
                  "18px",
                border:
                  "1px solid #3f3f46",
                borderRadius:
                  "12px",
                background:
                  "#151518",
              }}
            >
              <div
                style={{
                  color:
                    "#a1a1aa",
                  fontSize:
                    "11px",
                  marginBottom:
                    "8px",
                }}
              >
                {
                  CHANNEL_LABELS[
                    primaryAsset
                      .channel
                  ]
                }{" "}
                ·{" "}
                {
                  primaryAsset.format
                }
              </div>

              <h3
                style={{
                  margin:
                    "0 0 12px",
                  fontSize:
                    "18px",
                }}
              >
                {
                  primaryAsset.title
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
                    1.85,
                }}
              >
                {
                  primaryAsset.body
                }
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
                    "8px",
                  color:
                    "#fafafa",
                  fontSize:
                    "13px",
                  lineHeight:
                    1.7,
                }}
              >
                CTA:{" "}
                {
                  primaryAsset.callToAction
                }
              </div>

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
                  primaryAsset.disclosure.join(
                    " ",
                  )
                }
              </div>
            </article>
          )}
        </section>

        {xiaohongshuAssets.length >
          0 && (
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
              小红书内容池
            </h2>

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(280px, 1fr))",
                gap:
                  "14px",
              }}
            >
              {xiaohongshuAssets.map(
                (
                  asset,
                  index,
                ) => (
                  <article
                    key={`${asset.title}-${index}`}
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
                        fontSize:
                          "11px",
                        color:
                          "#71717a",
                      }}
                    >
                      小红书 ·{" "}
                      {index +
                        1}
                    </div>

                    <h3
                      style={{
                        fontSize:
                          "15px",
                        lineHeight:
                          1.5,
                      }}
                    >
                      {
                        asset.title
                      }
                    </h3>

                    <div
                      style={{
                        color:
                          "#a1a1aa",
                        fontSize:
                          "12px",
                        lineHeight:
                          1.7,
                        whiteSpace:
                          "pre-wrap",
                        maxHeight:
                          "260px",
                        overflow:
                          "auto",
                      }}
                    >
                      {
                        asset.body
                      }
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void copyText(
                          [
                            asset.title,
                            "",
                            asset.body,
                            "",
                            asset.callToAction,
                          ].join(
                            "\n",
                          ),
                          "小红书内容",
                        )
                      }
                      style={{
                        ...buttonStyle(),
                        marginTop:
                          "12px",
                      }}
                    >
                      复制
                    </button>
                  </article>
                ),
              )}
            </div>
          </section>
        )}

        {xianyuAssets.length >
          0 && (
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
              闲鱼服务入口
            </h2>

            {xianyuAssets.map(
              (
                asset,
                index,
              ) => (
                <article
                  key={`${asset.title}-${index}`}
                  style={{
                    border:
                      "1px solid #27272a",
                    borderRadius:
                      "10px",
                    padding:
                      "16px",
                  }}
                >
                  <h3
                    style={{
                      marginTop:
                        0,
                      fontSize:
                        "16px",
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
                      maxHeight:
                        "420px",
                      overflow:
                        "auto",
                    }}
                  >
                    {
                      asset.body
                    }
                  </div>

                  <div
                    style={{
                      marginTop:
                        "12px",
                      color:
                        "#a1a1aa",
                      fontSize:
                        "12px",
                    }}
                  >
                    {
                      asset.callToAction
                    }
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void copyText(
                        [
                          asset.title,
                          "",
                          asset.body,
                          "",
                          asset.callToAction,
                        ].join(
                          "\n",
                        ),
                        "闲鱼服务内容",
                      )
                    }
                    style={{
                      ...buttonStyle(
                        false,
                        true,
                      ),
                      marginTop:
                        "12px",
                    }}
                  >
                    复制闲鱼服务内容
                  </button>
                </article>
              ),
            )}
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
            7天验证计划
          </h2>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(250px, 1fr))",
              gap:
                "10px",
            }}
          >
            {sevenDayPlan.map(
              (item) => (
                <div
                  key={`${item.day}-${item.topic}`}
                  style={{
                    padding:
                      "13px",
                    border:
                      "1px solid #27272a",
                    borderRadius:
                      "9px",
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        "11px",
                      color:
                        "#71717a",
                    }}
                  >
                    Day{" "}
                    {
                      item.day
                    }{" "}
                    ·{" "}
                    {
                      CHANNEL_LABELS[
                        item
                          .channel
                      ]
                    }
                  </div>

                  <div
                    style={{
                      marginTop:
                        "6px",
                      fontSize:
                        "13px",
                      lineHeight:
                        1.6,
                    }}
                  >
                    {
                      item.topic
                    }
                  </div>

                  <div
                    style={{
                      marginTop:
                        "5px",
                      color:
                        "#a1a1aa",
                      fontSize:
                        "11px",
                      lineHeight:
                        1.6,
                    }}
                  >
                    {
                      item.purpose
                    }
                  </div>
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
            下一步
          </h2>

          <div
            style={{
              padding:
                "16px",
              border:
                "1px solid #3f3f46",
              borderRadius:
                "10px",
              background:
                "#151518",
            }}
          >
            <strong>
              {
                nextAction.title
              }
            </strong>

            <div
              style={{
                marginTop:
                  "6px",
                ...mutedStyle(),
              }}
            >
              {
                nextAction.detail
              }
            </div>
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
            真实询盘录入
          </h2>

          <div
            style={{
              ...mutedStyle(),
              marginBottom:
                "16px",
            }}
          >
            这里记录的是客户实际主动产生的询盘，不是 C168 市场候选人。
          </div>

          <div
            style={gridStyle}
          >
            <div>
              <label
                style={
                  labelStyle()
                }
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
                    event
                      .target
                      .value,
                  )
                }
                style={
                  fieldStyle()
                }
                placeholder="例如：深圳旧房局改"
              />
            </div>

            <div>
              <label
                style={
                  labelStyle()
                }
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
                    event
                      .target
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
                style={
                  labelStyle()
                }
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
                    event
                      .target
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
                style={
                  labelStyle()
                }
              >
                是否有近期数据
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
                    event
                      .target
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
                style={
                  labelStyle()
                }
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
                    event
                      .target
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
                style={
                  labelStyle()
                }
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
                    event
                      .target
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
                  ¥500以下
                </option>
                <option value="500-2000">
                  ¥500-¥2000
                </option>
                <option value="2000-plus">
                  ¥2000以上
                </option>
              </select>
            </div>

            <div>
              <label
                style={
                  labelStyle()
                }
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
                    event
                      .target
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
              marginTop:
                "14px",
            }}
          >
            <label
              style={
                labelStyle()
              }
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
                  event
                    .target
                    .value,
                )
              }
              style={{
                ...fieldStyle(),
                minHeight:
                  "90px",
                resize:
                  "vertical",
              }}
              placeholder="客户主动说明希望解决什么问题"
            />
          </div>

          <div
            style={{
              marginTop:
                "14px",
            }}
          >
            <label
              style={
                labelStyle()
              }
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
                  event
                    .target
                    .value,
                )
              }
              style={{
                ...fieldStyle(),
                minHeight:
                  "90px",
                resize:
                  "vertical",
              }}
              placeholder="只记录客户真实说过的问题"
            />
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
              disabled={
                loading ||
                !session
              }
              onClick={() =>
                void runLeadAction(
                  "score-lead",
                )
              }
              style={buttonStyle(
                loading ||
                  !session,
              )}
            >
              评分
            </button>

            <button
              type="button"
              disabled={
                loading ||
                !session
              }
              onClick={() =>
                void runLeadAction(
                  "reply-draft",
                )
              }
              style={buttonStyle(
                loading ||
                  !session,
              )}
            >
              生成回复草稿
            </button>

            <button
              type="button"
              disabled={
                loading ||
                !session
              }
              onClick={() =>
                void saveLead()
              }
              style={buttonStyle(
                loading ||
                  !session,
                true,
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
            <h2
              style={{
                marginTop:
                  0,
                fontSize:
                  "18px",
              }}
            >
              当前询盘判断
            </h2>

            <div
              style={gridStyle}
            >
              <div>
                <div
                  style={
                    mutedStyle()
                  }
                >
                  Priority Score
                </div>

                <strong
                  style={{
                    fontSize:
                      "26px",
                  }}
                >
                  {
                    assessment.score
                  }
                </strong>
              </div>

              <div>
                <div
                  style={
                    mutedStyle()
                  }
                >
                  Tier
                </div>

                <strong>
                  {
                    TIER_LABELS[
                      assessment
                        .tier
                    ]
                  }
                </strong>
              </div>

              <div>
                <div
                  style={
                    mutedStyle()
                  }
                >
                  Missing Information
                </div>

                <strong>
                  {
                    assessment
                      .missingInformation
                      .length
                  }
                </strong>
              </div>
            </div>

            <div
              style={{
                marginTop:
                  "16px",
                color:
                  "#d4d4d8",
                fontSize:
                  "13px",
                lineHeight:
                  1.8,
              }}
            >
              {
                assessment
                  .recommendedAction
              }
            </div>

            {assessment
              .reasons.length >
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
                      "13px",
                  }}
                >
                  判断依据
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
                  {assessment.reasons.map(
                    (
                      reason,
                    ) => (
                      <li
                        key={
                          reason
                        }
                      >
                        {
                          reason
                        }
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}

            {assessment
              .missingInformation
              .length >
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
                      "13px",
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
                assessment
                  .evidenceBoundary
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
                新线索 {newLeadCount} · 跟进中 {followUpCount} · 已成交 {convertedCount} · 已关闭 {closedCount}
              </div>
            </div>

            <button
              type="button"
              disabled={
                loading ||
                !session
              }
              onClick={() =>
                void loadLeads()
              }
              style={buttonStyle(
                loading ||
                  !session,
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
              这不是系统失败。下一步应该是人工审核一条内容并发布，等待真实平台询盘。
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
                        style={{
                          border:
                            "1px solid #3f3f46",
                          borderRadius:
                            "999px",
                          padding:
                            "4px 8px",
                          fontSize:
                            "11px",
                        }}
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
          AIOS Alpha · C168.6 External Platform Inbound Engine · Founder only
        </footer>
      </div>
    </main>
  );
}
