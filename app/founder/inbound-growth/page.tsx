"use client";
import {
  useCallback,
  useEffect,
  useState,
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
  tier: "priority" | "nurture" | "low-priority";
  reasons: string[];
  missingInformation: string[];
  recommendedAction: string;
  evidenceBoundary: string;
  timestamp: number;
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
  };
  nextStep?: string;
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
const TIER_LABELS: Record<
  LeadAssessment["tier"],
  string
> = {
  priority: "优先跟进",
  nurture: "补充信息",
  "low-priority": "低优先级",
};
function panelStyle(): React.CSSProperties {
  return {
    border: "1px solid #27272a",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "18px",
    background: "#111114",
  };
}
function fieldStyle(): React.CSSProperties {
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
): React.CSSProperties {
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
function labelStyle(): React.CSSProperties {
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
                  "Content-Type":
                    "application/json",
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
    async () => {
      setError("");
      setNotice("");
      setLoading(true);
      try {
        const payload =
          await requestApi("GET");
        if (!payload.campaign) {
          throw new Error(
            "The API response does not contain a campaign.",
          );
        }
        setCampaign(payload.campaign);
        setNotice(
          "已加载获客工作台草稿。内容仍需人工审核，尚未发布。",
        );
      } catch (value) {
        setError(
          value instanceof Error
            ? value.message
            : "Failed to load inbound campaign.",
        );
      } finally {
        setLoading(false);
      }
    },
    [requestApi],
  );
  useEffect(() => {
    if (session && !campaign) {
      void loadCampaign();
    }
  }, [session, campaign, loadCampaign]);
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
            diagnosticPrice: Number(
              diagnosticPrice,
            ),
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
        "新草稿已生成。请检查服务范围、价格和平台规则后再决定是否发布。",
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
  async function scoreLead() {
    setError("");
    setNotice("");
    setLoading(true);
    setAssessment(null);
    setReplyDraft("");
    try {
      const payload = await requestApi(
        "POST",
        {
          mode: "score-lead",
          lead,
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
      setNotice(
        "线索评分已完成。评分仅用于排序，不代表真实成交概率。",
      );
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Failed to score lead.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function generateReply() {
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const payload = await requestApi(
        "POST",
        {
          mode: "reply-draft",
          lead,
        },
      );
      if (!payload.result?.replyDraft) {
        throw new Error(
          "Reply draft was not returned.",
        );
      }
      setAssessment(
        payload.result.assessment ?? null,
      );
      setReplyDraft(
        payload.result.replyDraft,
      );
      setNotice(
        "回复草稿已生成。请人工核实内容，再通过平台允许的方式回复。",
      );
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Failed to generate reply draft.",
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
        !navigator.clipboard ||
        !navigator.clipboard.writeText
      ) {
        throw new Error(
          "当前浏览器不支持剪贴板操作，请手动选择并复制文本。",
        );
      }
      await navigator.clipboard.writeText(
        value,
      );
      setNotice(`${label}已复制。`);
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Copy failed.",
      );
    }
  }
  const contentAssets =
    campaign?.contentAssets ?? [];
  const sevenDayPlan =
    campaign?.sevenDayPlan ?? [];
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px 16px 56px",
        background: "#09090b",
        color: "#fafafa",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            marginBottom: "26px",
          }}
        >
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
              maxWidth: "720px",
              color: "#a1a1aa",
              lineHeight: 1.7,
              fontSize: "14px",
            }}
          >
            C144.4 · 从内容草稿、需求识别到线索评估与回复准备。
            目标是验证真实客户需求与首笔收入，而不是制造虚假的增长数据。
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
                  color: session
                    ? "#86efac"
                    : "#fca5a5",
                }}
              >
                {session
                  ? "Founder Session detected"
                  : "Founder Session not detected"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void loadCampaign()}
              disabled={!session || loading}
              style={buttonStyle(
                !session || loading,
              )}
            >
              {loading
                ? "处理中..."
                : "刷新工作台"}
            </button>
          </div>
          <p
            style={{
              marginTop: "14px",
              color: "#a1a1aa",
              fontSize: "12px",
              lineHeight: 1.6,
            }}
          >
            本页面需要现有 Founder Session。若无法读取接口，请先确认 Founder Console 已完成授权。
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
          <h2
            style={{
              marginTop: 0,
              fontSize: "19px",
            }}
          >
            01 · 获客方案与内容生成
          </h2>
          <p
            style={{
              color: "#a1a1aa",
              fontSize: "13px",
              lineHeight: 1.6,
            }}
          >
            先以低成本服务验证需求。以下行业和价格只是可调整的测试假设，不代表市场验证结果。
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
              marginTop: "18px",
            }}
          >
            <label>
              <span style={labelStyle()}>
                目标行业
              </span>
              <input
                value={industry}
                onChange={(event) =>
                  setIndustry(event.target.value)
                }
                maxLength={100}
                style={fieldStyle()}
              />
            </label>
            <label>
              <span style={labelStyle()}>
                目标地区
              </span>
              <input
                value={region}
                onChange={(event) =>
                  setRegion(event.target.value)
                }
                maxLength={100}
                style={fieldStyle()}
              />
            </label>
            <label>
              <span style={labelStyle()}>
                服务名称
              </span>
              <input
                value={offerName}
                onChange={(event) =>
                  setOfferName(event.target.value)
                }
                maxLength={100}
                style={fieldStyle()}
              />
            </label>
            <label>
              <span style={labelStyle()}>
                入门版价格（元）
              </span>
              <input
                type="number"
                min="0"
                max="100000"
                value={entryPrice}
                onChange={(event) =>
                  setEntryPrice(event.target.value)
                }
                style={fieldStyle()}
              />
            </label>
            <label>
              <span style={labelStyle()}>
                诊断版价格（元）
              </span>
              <input
                type="number"
                min="0"
                max="100000"
                value={diagnosticPrice}
                onChange={(event) =>
                  setDiagnosticPrice(
                    event.target.value,
                  )
                }
                style={fieldStyle()}
              />
            </label>
          </div>
          <div style={{ marginTop: "18px" }}>
            <div style={labelStyle()}>
              内容渠道
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              {(
                [
                  "xiaohongshu",
                  "xianyu",
                ] as Channel[]
              ).map((channel) => (
                <label
                  key={channel}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    border:
                      "1px solid #3f3f46",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    fontSize: "13px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={channels.includes(
                      channel,
                    )}
                    onChange={() =>
                      toggleChannel(channel)
                    }
                  />
                  {CHANNEL_LABELS[channel]}
                </label>
              ))}
            </div>
          </div>
          <div style={{ marginTop: "18px" }}>
            <button
              type="button"
              onClick={() =>
                void generateCampaign()
              }
              disabled={
                !session ||
                loading ||
                !industry.trim() ||
                !region.trim() ||
                !offerName.trim() ||
                !channels.length ||
                !Number.isFinite(
                  Number(entryPrice),
                ) ||
                !Number.isFinite(
                  Number(diagnosticPrice),
                )
              }
              style={buttonStyle(
                !session ||
                  loading ||
                  !industry.trim() ||
                  !region.trim() ||
                  !offerName.trim() ||
                  !channels.length,
              )}
            >
              生成获客方案与内容草稿
            </button>
          </div>
        </section>
        {campaign && (
          <>
            <section style={panelStyle()}>
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
                  <h2
                    style={{
                      marginTop: 0,
                      fontSize: "19px",
                    }}
                  >
                    02 · 服务 Offer
                  </h2>
                  <div
                    style={{
                      color: "#a1a1aa",
                      fontSize: "12px",
                    }}
                  >
                    {campaign.version} · 草稿 ·
                    更新于{" "}
                    {formatTime(campaign.timestamp)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void copyText(
                      [
                        campaign.offer.name,
                        `入门版：¥${campaign.offer.entryPrice}`,
                        ...campaign.offer
                          .entryDeliverables,
                        "",
                        `诊断版：¥${campaign.offer.diagnosticPrice}`,
                        ...campaign.offer
                          .diagnosticDeliverables,
                        "",
                        "不包含：",
                        ...campaign.offer.exclusions,
                      ].join("\n"),
                      "服务 Offer",
                    )
                  }
                  style={buttonStyle()}
                >
                  复制 Offer
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: "14px",
                  marginTop: "16px",
                }}
              >
                <div
                  style={{
                    border: "1px solid #3f3f46",
                    borderRadius: "10px",
                    padding: "15px",
                  }}
                >
                  <div
                    style={{
                      color: "#a1a1aa",
                      fontSize: "12px",
                    }}
                  >
                    入门版
                  </div>
                  <div
                    style={{
                      fontSize: "27px",
                      fontWeight: 700,
                      margin: "8px 0",
                    }}
                  >
                    ¥{campaign.offer.entryPrice}
                  </div>
                  {campaign.offer.entryDeliverables.map(
                    (item) => (
                      <div
                        key={item}
                        style={{
                          fontSize: "13px",
                          lineHeight: 1.8,
                        }}
                      >
                        - {item}
                      </div>
                    ),
                  )}
                </div>
                <div
                  style={{
                    border: "1px solid #3f3f46",
                    borderRadius: "10px",
                    padding: "15px",
                  }}
                >
                  <div
                    style={{
                      color: "#a1a1aa",
                      fontSize: "12px",
                    }}
                  >
                    诊断版
                  </div>
                  <div
                    style={{
                      fontSize: "27px",
                      fontWeight: 700,
                      margin: "8px 0",
                    }}
                  >
                    ¥{campaign.offer.diagnosticPrice}
                  </div>
                  {campaign.offer.diagnosticDeliverables.map(
                    (item) => (
                      <div
                        key={item}
                        style={{
                          fontSize: "13px",
                          lineHeight: 1.8,
                        }}
                      >
                        - {item}
                      </div>
                    ),
                  )}
                </div>
              </div>
              <h3
                style={{
                  fontSize: "14px",
                  marginTop: "20px",
                }}
              >
                服务边界
              </h3>
              {campaign.offer.exclusions.map(
                (item) => (
                  <div
                    key={item}
                    style={{
                      color: "#d4d4d8",
                      fontSize: "13px",
                      lineHeight: 1.8,
                    }}
                  >
                    - {item}
                  </div>
                ),
              )}
            </section>
            <section style={panelStyle()}>
              <h2
                style={{
                  marginTop: 0,
                  fontSize: "19px",
                }}
              >
                03 · 平台内容草稿
              </h2>
              {contentAssets.length === 0 && (
                <p
                  style={{
                    color: "#a1a1aa",
                    fontSize: "13px",
                  }}
                >
                  当前没有内容资产。请在上方选择至少一个渠道后重新生成。
                </p>
              )}
              {contentAssets.map(
                (asset, index) => {
                  const copyValue = [
                    asset.title,
                    "",
                    asset.body,
                    "",
                    asset.callToAction,
                  ].join("\n");
                  return (
                    <article
                      key={`${asset.channel}-${index}`}
                      style={{
                        border:
                          "1px solid #3f3f46",
                        borderRadius: "10px",
                        padding: "15px",
                        marginTop: "12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          justifyContent:
                            "space-between",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            color: "#a1a1aa",
                            fontSize: "12px",
                          }}
                        >
                          {CHANNEL_LABELS[
                            asset.channel
                          ]}{" "}
                          · {asset.format}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            void copyText(
                              copyValue,
                              asset.title,
                            )
                          }
                          style={buttonStyle()}
                        >
                          复制内容
                        </button>
                      </div>
                      <h3
                        style={{
                          fontSize: "16px",
                          lineHeight: 1.5,
                          margin: "12px 0",
                        }}
                      >
                        {asset.title}
                      </h3>
                      <pre
                        style={{
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                          fontFamily:
                            "Arial, Helvetica, sans-serif",
                          fontSize: "13px",
                          lineHeight: 1.8,
                          color: "#e4e4e7",
                        }}
                      >
                        {asset.body}
                      </pre>
                      <div
                        style={{
                          marginTop: "14px",
                          borderTop:
                            "1px solid #27272a",
                          paddingTop: "12px",
                          fontSize: "13px",
                          lineHeight: 1.7,
                        }}
                      >
                        <strong>
                          建议的行动引导
                        </strong>
                        <p
                          style={{
                            color: "#d4d4d8",
                          }}
                        >
                          {asset.callToAction}
                        </p>
                      </div>
                      <div
                        style={{
                          color: "#a1a1aa",
                          fontSize: "12px",
                          lineHeight: 1.7,
                        }}
                      >
                        {asset.disclosure.map(
                          (item) => (
                            <div key={item}>
                              - {item}
                            </div>
                          ),
                        )}
                      </div>
                    </article>
                  );
                },
              )}
            </section>
            <section style={panelStyle()}>
              <h2
                style={{
                  marginTop: 0,
                  fontSize: "19px",
                }}
              >
                04 · 七天内容执行计划
              </h2>
              <div
                style={{
                  display: "grid",
                  gap: "10px",
                  marginTop: "14px",
                }}
              >
                {sevenDayPlan.map((item) => (
                  <div
                    key={item.day}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "58px minmax(0, 1fr)",
                      gap: "12px",
                      border:
                        "1px solid #3f3f46",
                      borderRadius: "9px",
                      padding: "12px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#a1a1aa",
                      }}
                    >
                      DAY
                      <div
                        style={{
                          fontSize: "22px",
                          fontWeight: 700,
                          color: "#fafafa",
                        }}
                      >
                        {item.day}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#a1a1aa",
                        }}
                      >
                        {CHANNEL_LABELS[
                          item.channel
                        ]}
                      </div>
                      <div
                        style={{
                          margin: "5px 0",
                          fontWeight: 600,
                          fontSize: "14px",
                        }}
                      >
                        {item.topic}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#a1a1aa",
                          lineHeight: 1.6,
                        }}
                      >
                        目标：{item.purpose}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p
                style={{
                  color: "#a1a1aa",
                  fontSize: "12px",
                  lineHeight: 1.7,
                  marginTop: "14px",
                }}
              >
                执行前需人工检查平台规则、内容真实性和服务类目。此计划只是建议，不代表已发布或已有流量。
              </p>
            </section>
            <section style={panelStyle()}>
              <h2
                style={{
                  marginTop: 0,
                  fontSize: "19px",
                }}
              >
                05 · 客户需求采集问题
              </h2>
              {campaign.intakeQuestions.map(
                (question, index) => (
                  <div
                    key={question}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "28px minmax(0, 1fr)",
                      gap: "8px",
                      padding: "9px 0",
                      borderBottom:
                        "1px solid #27272a",
                      fontSize: "13px",
                      lineHeight: 1.7,
                    }}
                  >
                    <span
                      style={{
                        color: "#a1a1aa",
                      }}
                    >
                      {index + 1}.
                    </span>
                    <span>{question}</span>
                  </div>
                ),
              )}
              <button
                type="button"
                onClick={() =>
                  void copyText(
                    campaign.intakeQuestions
                      .map(
                        (question, index) =>
                          `${index + 1}. ${question}`,
                      )
                      .join("\n"),
                    "客户需求采集问题",
                  )
                }
                style={{
                  ...buttonStyle(),
                  marginTop: "14px",
                }}
              >
                复制需求采集问题
              </button>
            </section>
          </>
        )}
        <section style={panelStyle()}>
          <h2
            style={{
              marginTop: 0,
              fontSize: "19px",
            }}
          >
            06 · 线索资格评估
          </h2>
          <p
            style={{
              color: "#a1a1aa",
              fontSize: "13px",
              lineHeight: 1.7,
            }}
          >
            仅输入客户主动提供或你获准处理的信息。评分用于安排跟进优先级，不是客户购买概率预测。
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
              marginTop: "18px",
            }}
          >
            <label>
              <span style={labelStyle()}>
                业务类型
              </span>
              <input
                value={lead.businessType}
                onChange={(event) =>
                  updateLead(
                    "businessType",
                    event.target.value,
                  )
                }
                placeholder="例如：家装、摄影、教育服务"
                style={fieldStyle()}
              />
            </label>
            <label>
              <span style={labelStyle()}>
                线索来源
              </span>
              <select
                value={lead.sourceChannel}
                onChange={(event) =>
                  updateLead(
                    "sourceChannel",
                    event.target.value as Channel,
                  )
                }
                style={fieldStyle()}
              >
                <option value="xiaohongshu">
                  小红书
                </option>
                <option value="xianyu">
                  闲鱼
                </option>
              </select>
            </label>
            <label>
              <span style={labelStyle()}>
                是否正在投放广告
              </span>
              <select
                value={lead.currentAds}
                onChange={(event) =>
                  updateLead(
                    "currentAds",
                    event.target.value as LeadSignal,
                  )
                }
                style={fieldStyle()}
              >
                <option value="unknown">
                  尚不清楚
                </option>
                <option value="yes">
                  是
                </option>
                <option value="no">
                  否
                </option>
              </select>
            </label>
            <label>
              <span style={labelStyle()}>
                是否有近期广告或线索数据
              </span>
              <select
                value={lead.hasAdData}
                onChange={(event) =>
                  updateLead(
                    "hasAdData",
                    event.target.value as LeadSignal,
                  )
                }
                style={fieldStyle()}
              >
                <option value="unknown">
                  尚不清楚
                </option>
                <option value="yes">
                  有
                </option>
                <option value="no">
                  没有
                </option>
              </select>
            </label>
            <label>
              <span style={labelStyle()}>
                联系人决策权限
              </span>
              <select
                value={lead.decisionRole}
                onChange={(event) =>
                  updateLead(
                    "decisionRole",
                    event.target.value as LeadRole,
                  )
                }
                style={fieldStyle()}
              >
                <option value="unknown">
                  尚不清楚
                </option>
                <option value="decision-maker">
                  能决定采购
                </option>
                <option value="influencer">
                  参与建议
                </option>
              </select>
            </label>
            <label>
              <span style={labelStyle()}>
                客户预算范围
              </span>
              <select
                value={lead.budgetRange}
                onChange={(event) =>
                  updateLead(
                    "budgetRange",
                    event.target.value as LeadBudget,
                  )
                }
                style={fieldStyle()}
              >
                <option value="unknown">
                  尚不清楚
                </option>
                <option value="under-500">
                  低于 500 元
                </option>
                <option value="500-2000">
                  500–2000 元
                </option>
                <option value="2000-plus">
                  2000 元以上
                </option>
              </select>
            </label>
            <label>
              <span style={labelStyle()}>
                解决问题的时间要求
              </span>
              <select
                value={lead.urgency}
                onChange={(event) =>
                  updateLead(
                    "urgency",
                    event.target.value as LeadUrgency,
                  )
                }
                style={fieldStyle()}
              >
                <option value="unknown">
                  尚不清楚
                </option>
                <option value="high">
                  尽快解决
                </option>
                <option value="medium">
                  近期考虑
                </option>
                <option value="low">
                  暂不着急
                </option>
              </select>
            </label>
            <label>
              <span style={labelStyle()}>
                客户希望达成的目标
              </span>
              <input
                value={lead.goal}
                onChange={(event) =>
                  updateLead(
                    "goal",
                    event.target.value,
                  )
                }
                placeholder="例如：提高有效咨询占比"
                style={fieldStyle()}
              />
            </label>
            <label
              style={{
                gridColumn: "1 / -1",
              }}
            >
              <span style={labelStyle()}>
                客户明确提出的问题
              </span>
              <textarea
                value={lead.currentProblem}
                onChange={(event) =>
                  updateLead(
                    "currentProblem",
                    event.target.value,
                  )
                }
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
              onClick={() => void scoreLead()}
              disabled={!session || loading}
              style={buttonStyle(
                !session || loading,
              )}
            >
              评估线索
            </button>
            <button
              type="button"
              onClick={() =>
                void generateReply()
              }
              disabled={!session || loading}
              style={{
                ...buttonStyle(
                  !session || loading,
                ),
                background: "#27272a",
                color: "#fafafa",
              }}
            >
              生成客户回复草稿
            </button>
            <button
              type="button"
              onClick={() => {
                setLead(INITIAL_LEAD);
                setAssessment(null);
                setReplyDraft("");
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
                  <div
                    style={{
                      color: "#a1a1aa",
                      fontSize: "12px",
                    }}
                  >
                    线索评估结果
                  </div>
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: 700,
                      marginTop: "6px",
                    }}
                  >
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
                  {TIER_LABELS[
                    assessment.tier
                  ]}
                </div>
              </div>
              <h3
                style={{
                  fontSize: "14px",
                  marginTop: "18px",
                }}
              >
                评分依据
              </h3>
              {assessment.reasons.length ? (
                assessment.reasons.map(
                  (item) => (
                    <div
                      key={item}
                      style={{
                        fontSize: "13px",
                        lineHeight: 1.8,
                      }}
                    >
                      - {item}
                    </div>
                  ),
                )
              ) : (
                <p
                  style={{
                    color: "#a1a1aa",
                    fontSize: "13px",
                  }}
                >
                  暂无足够的正向判断依据。
                </p>
              )}
              <h3
                style={{
                  fontSize: "14px",
                  marginTop: "18px",
                }}
              >
                待补充信息
              </h3>
              {assessment.missingInformation.map(
                (item) => (
                  <div
                    key={item}
                    style={{
                      fontSize: "13px",
                      lineHeight: 1.8,
                    }}
                  >
                    - {item}
                  </div>
                ),
              )}
              <h3
                style={{
                  fontSize: "14px",
                  marginTop: "18px",
                }}
              >
                建议下一步
              </h3>
              <p
                style={{
                  color: "#d4d4d8",
                  fontSize: "13px",
                  lineHeight: 1.8,
                }}
              >
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
                <h3
                  style={{
                    fontSize: "15px",
                    margin: 0,
                  }}
                >
                  客户回复草稿
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    void copyText(
                      replyDraft,
                      "客户回复草稿",
                    )
                  }
                  style={buttonStyle()}
                >
                  复制回复
                </button>
              </div>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  fontFamily:
                    "Arial, Helvetica, sans-serif",
                  fontSize: "13px",
                  lineHeight: 1.8,
                  color: "#e4e4e7",
                  marginBottom: 0,
                }}
              >
                {replyDraft}
              </pre>
              <p
                style={{
                  color: "#a1a1aa",
                  fontSize: "12px",
                  lineHeight: 1.7,
                }}
              >
                此处只生成草稿。发送前请人工检查，不会自动发送消息。
              </p>
            </div>
          )}
        </section>
        <section
          style={{
            ...panelStyle(),
            background: "#0c0c0f",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              fontSize: "16px",
            }}
          >
            运行边界与当前限制
          </h2>
          <div
            style={{
              color: "#a1a1aa",
              fontSize: "13px",
              lineHeight: 1.9,
            }}
          >
            <div>
              - 内容、线索评估与回复草稿均需人工审核。
            </div>
            <div>
              - 当前 API 不执行平台发布、自动私信或收款。
            </div>
            <div>
              - 当前版本未启用线索持久化，刷新页面后本地表单数据不会自动恢复。
            </div>
            <div>
              - 不承诺固定线索数量、成交额或广告回报率。
            </div>
            <div>
              - 不要在表单中输入客户密码、完整支付信息或不必要的个人敏感信息。
            </div>
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
