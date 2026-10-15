"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

type CommercialAction =
  | "selective-outbound"
  | "inbound-opportunity"
  | "monitor"
  | "reject";

type ProspectIndustry =
  | "home-renovation"
  | "old-home-renovation"
  | "whole-house-customization";

interface ProspectEvidence {
  url: string;
  hostname: string;
  title: string;
  snippets: string[];
  credibilityTier: string;
  verificationLabel: string;
  verificationScore: number;
}

interface CommercialDecision {
  action: CommercialAction;
  actionScore: number;
  evidenceConfidence: number;
  buyingSignalScore: number;
  acquisitionReadinessScore: number;
  reasons: string[];
  founderReviewRequired: boolean;
}

interface ProspectCandidate {
  id: string;
  rank: number;
  name: string;
  industry: ProspectIndustry;
  location: string;
  qualification:
    | "qualified"
    | "needs-manual-validation";
  evidenceScore: number;
  verifiedFacts: string[];
  acquisitionSignals: string[];
  buyingSignals: string[];
  diagnosticHypotheses: string[];
  unknowns: string[];
  evidence: ProspectEvidence[];
  commercialDecision: CommercialDecision;
  recommendedAction: string;
}

interface C168Response {
  success?: boolean;
  service?: string;
  version?: string;
  code?: string;
  status?: string;
  mode?: string;

  commercialLoop?: {
    success?: boolean;
    reused?: boolean;
    objectiveId?: string;
    outcomeId?: string;
    taskId?: string;
    milestoneId?: string | null;
    objectiveTitle?: string;
    nextAction?: string;
  };

  discovery?: {
    success?: boolean;
    status?: string;
    targetMarket?: string;
    geography?: string;
    sourceCount?: number;
    independentHosts?: number;
    candidateCount?: number;
    selectiveOutboundCount?: number;
    inboundOpportunityCount?: number;
    monitorCount?: number;
    rejectedCount?: number;
    qualifiedCount?: number;
    manualValidationCount?: number;
    conclusion?: string;
    nextStep?: string;
  };

  candidates?: ProspectCandidate[];

  selectiveOutboundCandidates?:
    ProspectCandidate[];

  inboundOpportunityCandidates?:
    ProspectCandidate[];

  monitorCandidates?:
    ProspectCandidate[];

  commercialOffer?: {
    primary?: {
      name?: string;
      priceCny?: number;
    };
    upgrade?: {
      name?: string;
      priceCny?: number;
    };
  };

  founderWorkload?: {
    reviewAllCandidates?: boolean;
    reviewSelectiveOutboundOnly?: boolean;
    selectiveOutboundReviewCount?: number;
    inboundOpportunityCount?: number;
    automaticallyMonitoredCount?: number;
    automaticallyRejectedCount?: number;
    objective?: string;
  };

  integrity?: {
    fabricatedProspect?: boolean;
    fabricatedBuyingSignal?: boolean;
    fabricatedAdvertisingPerformance?: boolean;
    fabricatedContact?: boolean;
    contactWasSent?: boolean;
    fabricatedCustomer?: boolean;
    fabricatedPayment?: boolean;
    fabricatedRevenue?: boolean;
    advertisingAccountAccessed?: boolean;
    note?: string;
  };

  nextAction?: string;
  durationMs?: number;
  error?: string;
  timestamp?: number;
}

function percentage(
  value: number | undefined,
): string {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return "-";
  }

  return `${Math.round(
    value * 100,
  )}%`;
}

function industryLabel(
  industry: ProspectIndustry,
): string {
  if (
    industry ===
    "old-home-renovation"
  ) {
    return "旧房翻新 / 局改";
  }

  if (
    industry ===
    "whole-house-customization"
  ) {
    return "全屋定制";
  }

  return "家装 / 装修";
}

function actionLabel(
  action: CommercialAction,
): string {
  if (
    action ===
    "selective-outbound"
  ) {
    return "建议审核触达";
  }

  if (
    action ===
    "inbound-opportunity"
  ) {
    return "Inbound 机会";
  }

  if (
    action ===
    "monitor"
  ) {
    return "自动观察";
  }

  return "自动淘汰";
}

function actionDescription(
  action: CommercialAction,
): string {
  if (
    action ===
    "selective-outbound"
  ) {
    return "AIOS认为该对象值得进入Founder最终审核。只有Founder批准后才可真实联系。";
  }

  if (
    action ===
    "inbound-opportunity"
  ) {
    return "不建议逐家主动联系。AIOS应把这里出现的真实市场问题转化为内容、诊断入口或Offer，让潜在客户主动进入。";
  }

  if (
    action ===
    "monitor"
  ) {
    return "当前没有必要占用Founder时间。等待新的业务、营销、招聘或获客信号后重新评分。";
  }

  return "当前商业价值或证据不足，不进入Founder工作流。";
}

function actionStyle(
  action: CommercialAction,
) {
  if (
    action ===
    "selective-outbound"
  ) {
    return {
      background: "#dcfce7",
      color: "#166534",
      border: "#86efac",
    };
  }

  if (
    action ===
    "inbound-opportunity"
  ) {
    return {
      background: "#eff6ff",
      color: "#1d4ed8",
      border: "#bfdbfe",
    };
  }

  if (
    action ===
    "monitor"
  ) {
    return {
      background: "#f8fafc",
      color: "#475569",
      border: "#cbd5e1",
    };
  }

  return {
    background: "#fff1f2",
    color: "#be123c",
    border: "#fecdd3",
  };
}

export default function FounderAdAcquisitionPage() {
  const [
    accessKey,
    setAccessKey,
  ] = useState("");

  const [
    result,
    setResult,
  ] =
    useState<C168Response | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    const storedKey =
      window.sessionStorage.getItem(
        STORAGE_KEY,
      ) ?? "";

    setAccessKey(
      storedKey,
    );
  }, []);

  async function runDecisionEngine() {
    const key =
      accessKey.trim();

    if (!key) {
      setError(
        "未检测到 Founder Console 会话。请先返回 /founder 完成 Founder 登录。",
      );

      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response =
        await fetch(
          "/api/founder/c168-prospects",
          {
            method: "POST",
            cache: "no-store",
            headers: {
              Accept:
                "application/json",
              Authorization:
                `Bearer ${key}`,
            },
          },
        );

      const data =
        (await response.json()) as C168Response;

      setResult(data);

      if (
        !response.ok &&
        response.status !== 422
      ) {
        setError(
          data.error ||
            `C168 decision engine failed (HTTP ${response.status}).`,
        );
      }
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof
          Error
          ? requestError.message
          : "C168 decision engine request failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  const selectiveOutbound =
    useMemo(
      () =>
        result
          ?.selectiveOutboundCandidates ??
        [],
      [
        result
          ?.selectiveOutboundCandidates,
      ],
    );

  const inboundOpportunities =
    useMemo(
      () =>
        result
          ?.inboundOpportunityCandidates ??
        [],
      [
        result
          ?.inboundOpportunityCandidates,
      ],
    );

  const monitors =
    useMemo(
      () =>
        result
          ?.monitorCandidates ??
        [],
      [
        result?.monitorCandidates,
      ],
    );

  const founderActionCount =
    selectiveOutbound.length;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding:
          "24px 16px 70px",
        boxSizing:
          "border-box",
        background:
          "#f4f6fb",
        color:
          "#0f172a",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 980,
          margin:
            "0 auto",
        }}
      >
        <Link
          href="/founder"
          style={{
            display:
              "inline-block",
            color:
              "#475569",
            fontSize: 13,
            fontWeight: 800,
            textDecoration:
              "none",
          }}
        >
          {"<- Founder Console"}
        </Link>

        <header
          style={{
            marginTop: 20,
          }}
        >
          <div
            style={{
              color:
                "#2563eb",
              fontSize: 12,
              fontWeight: 950,
              letterSpacing:
                "0.14em",
            }}
          >
            PRIVATE FOUNDER ACCESS
          </div>

          <h1
            style={{
              margin:
                "8px 0 0",
              fontSize: 30,
              lineHeight: 1.15,
            }}
          >
            AIOS 广告获客决策台
          </h1>

          <p
            style={{
              margin:
                "9px 0 0",
              color:
                "#64748b",
              lineHeight: 1.65,
            }}
          >
            AIOS
            自动发现、验证、评分和分流市场机会。
            Founder
            不再逐家审核候选客户，只处理真正需要人工决策的商业行动。
          </p>
        </header>

        <section
          style={{
            marginTop: 22,
            padding: 20,
            border:
              "1px solid #dbe3f0",
            borderRadius: 22,
            background:
              "#ffffff",
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 950,
            }}
          >
            第一现金流目标
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 10,
              marginTop: 16,
            }}
          >
            <Metric
              label="主要路径"
              value="Inbound"
              detail="让真实需求主动进入"
            />

            <Metric
              label="辅助路径"
              value="Selective"
              detail="只触达高价值机会"
            />

            <Metric
              label="首个 Offer"
              value="¥399"
              detail="48小时广告获客诊断"
            />

            <Metric
              label="现金流目标"
              value="1"
              detail="真实付费客户"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              void runDecisionEngine()
            }
            disabled={
              loading
            }
            style={{
              width: "100%",
              minHeight: 54,
              marginTop: 18,
              border: 0,
              borderRadius: 15,
              background:
                loading
                  ? "#94a3b8"
                  : "#0f172a",
              color:
                "#ffffff",
              fontSize: 16,
              fontWeight: 950,
              cursor:
                loading
                  ? "wait"
                  : "pointer",
            }}
          >
            {loading
              ? "AIOS 正在分析市场并形成商业决策..."
              : "运行今日获客决策"}
          </button>

          <p
            style={{
              margin:
                "12px 0 0",
              color:
                "#64748b",
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            AIOS
            会自动过滤低价值候选、识别
            Buying Signal
            并判断更适合
            Inbound、Selective Outbound
            还是继续观察。系统不会自动联系客户。
          </p>

          {error && (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 14,
                background:
                  "#fff1f2",
                color:
                  "#be123c",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {error}
            </div>
          )}
        </section>

        {result && (
          <>
            <section
              style={{
                marginTop: 18,
                padding: 20,
                border:
                  "1px solid #dbe3f0",
                borderRadius: 22,
                background:
                  "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "flex-start",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      color:
                        "#64748b",
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing:
                        "0.08em",
                    }}
                  >
                    TODAY
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 24,
                      fontWeight: 950,
                    }}
                  >
                    {result.status ??
                      "UNKNOWN"}
                  </div>
                </div>

                <div
                  style={{
                    padding:
                      "8px 12px",
                    borderRadius: 999,
                    background:
                      founderActionCount >
                      0
                        ? "#dcfce7"
                        : "#eff6ff",
                    color:
                      founderActionCount >
                      0
                        ? "#166534"
                        : "#1d4ed8",
                    fontSize: 12,
                    fontWeight: 950,
                  }}
                >
                  {founderActionCount >
                  0
                    ? `Founder 只需处理 ${founderActionCount} 个行动`
                    : "当前无需人工逐家审核"}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(145px, 1fr))",
                  gap: 10,
                  marginTop: 18,
                }}
              >
                <Metric
                  label="需 Founder 决策"
                  value={String(
                    result
                      .discovery
                      ?.selectiveOutboundCount ??
                      founderActionCount,
                  )}
                  detail="Selective Outbound"
                />

                <Metric
                  label="Inbound 机会"
                  value={String(
                    result
                      .discovery
                      ?.inboundOpportunityCount ??
                      inboundOpportunities.length,
                  )}
                  detail="转化为获客资产"
                />

                <Metric
                  label="自动观察"
                  value={String(
                    result
                      .discovery
                      ?.monitorCount ??
                      monitors.length,
                  )}
                  detail="无需 Founder 介入"
                />

                <Metric
                  label="自动淘汰"
                  value={String(
                    result
                      .discovery
                      ?.rejectedCount ??
                      0,
                  )}
                  detail="不进入人工流程"
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(145px, 1fr))",
                  gap: 10,
                  marginTop: 10,
                }}
              >
                <Metric
                  label="市场对象"
                  value={String(
                    result
                      .discovery
                      ?.candidateCount ??
                      0,
                  )}
                  detail="AIOS 保留"
                />

                <Metric
                  label="公开证据"
                  value={String(
                    result
                      .discovery
                      ?.sourceCount ??
                      0,
                  )}
                  detail="Evidence"
                />

                <Metric
                  label="独立来源"
                  value={String(
                    result
                      .discovery
                      ?.independentHosts ??
                      0,
                  )}
                  detail="Independent hosts"
                />

                <Metric
                  label="Runtime"
                  value={
                    result.version ??
                    "C168"
                  }
                  detail="Decision Engine"
                />
              </div>

              {result.discovery
                ?.conclusion && (
                <InfoBlock
                  title="AIOS 市场判断"
                  text={
                    result.discovery
                      .conclusion
                  }
                />
              )}

              {result.nextAction && (
                <InfoBlock
                  title="你现在真正需要做什么"
                  text={
                    result.nextAction
                  }
                />
              )}
            </section>

            {selectiveOutbound.length >
              0 && (
              <section
                style={{
                  marginTop: 18,
                }}
              >
                <SectionHeading
                  eyebrow="FOUNDER ACTION"
                  title="需要你决定的机会"
                  description="这里只出现达到 Selective Outbound 阈值的对象。AIOS 已完成前置筛选，但不会替你真实发送消息。"
                />

                <div
                  style={{
                    display: "grid",
                    gap: 14,
                    marginTop: 12,
                  }}
                >
                  {selectiveOutbound.map(
                    (
                      candidate,
                    ) => (
                      <DecisionCard
                        key={
                          candidate.id
                        }
                        candidate={
                          candidate
                        }
                        showEvidence
                      />
                    ),
                  )}
                </div>
              </section>
            )}

            {selectiveOutbound.length ===
              0 && (
              <section
                style={{
                  marginTop: 18,
                  padding: 20,
                  border:
                    "1px solid #bfdbfe",
                  borderRadius: 22,
                  background:
                    "#eff6ff",
                }}
              >
                <div
                  style={{
                    color:
                      "#1d4ed8",
                    fontSize: 12,
                    fontWeight: 950,
                    letterSpacing:
                      "0.08em",
                  }}
                >
                  FOUNDER WORKLOAD
                </div>

                <div
                  style={{
                    marginTop: 6,
                    color:
                      "#1e3a8a",
                    fontSize: 19,
                    fontWeight: 950,
                  }}
                >
                  当前没有必须人工审核的客户
                </div>

                <p
                  style={{
                    margin:
                      "8px 0 0",
                    color:
                      "#1e40af",
                    fontSize: 13,
                    lineHeight: 1.65,
                  }}
                >
                  这是有效决策，不是系统失败。
                  AIOS
                  不会为了让列表看起来有内容而强迫你联系低价值候选。
                </p>
              </section>
            )}

            {inboundOpportunities.length >
              0 && (
              <section
                style={{
                  marginTop: 18,
                }}
              >
                <SectionHeading
                  eyebrow="INBOUND"
                  title="值得转化成获客资产的市场机会"
                  description="这些对象不是要求你逐家联系，而是用于理解真实市场正在表达什么需求，并形成内容、诊断入口和 Offer。"
                />

                <div
                  style={{
                    display: "grid",
                    gap: 12,
                    marginTop: 12,
                  }}
                >
                  {inboundOpportunities.map(
                    (
                      candidate,
                    ) => (
                      <DecisionCard
                        key={
                          candidate.id
                        }
                        candidate={
                          candidate
                        }
                        showEvidence={
                          false
                        }
                      />
                    ),
                  )}
                </div>
              </section>
            )}

            {monitors.length >
              0 && (
              <details
                style={{
                  marginTop: 18,
                  padding: 18,
                  border:
                    "1px solid #dbe3f0",
                  borderRadius: 20,
                  background:
                    "#ffffff",
                }}
              >
                <summary
                  style={{
                    cursor:
                      "pointer",
                    fontWeight: 950,
                  }}
                >
                  自动观察池 ·{" "}
                  {monitors.length}
                </summary>

                <p
                  style={{
                    margin:
                      "8px 0 0",
                    color:
                      "#64748b",
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  这些对象暂时不需要
                  Founder
                  操作。只有出现新的
                  Buying Signal
                  并重新达到商业行动阈值后，才应该进入你的工作区。
                </p>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    marginTop: 12,
                  }}
                >
                  {monitors.map(
                    (
                      candidate,
                    ) => (
                      <CompactCandidate
                        key={
                          candidate.id
                        }
                        candidate={
                          candidate
                        }
                      />
                    ),
                  )}
                </div>
              </details>
            )}

            <section
              style={{
                marginTop: 18,
                padding: 20,
                border:
                  "1px solid #dbe3f0",
                borderRadius: 22,
                background:
                  "#ffffff",
              }}
            >
              <div
                style={{
                  fontWeight: 950,
                }}
              >
                商业执行链
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <ResultRow
                  label="Primary Channel"
                  value="Inbound"
                />

                <ResultRow
                  label="Secondary Channel"
                  value="Selective Outbound"
                />

                <ResultRow
                  label="Commercial Objective"
                  value={
                    result
                      .commercialLoop
                      ?.objectiveTitle ??
                    "Not initialized"
                  }
                />

                <ResultRow
                  label="Outcome"
                  value={
                    result
                      .commercialLoop
                      ?.outcomeId ??
                    "-"
                  }
                />

                <ResultRow
                  label="Task"
                  value={
                    result
                      .commercialLoop
                      ?.taskId ??
                    "-"
                  }
                />
              </div>
            </section>

            <section
              style={{
                marginTop: 18,
                padding: 18,
                borderRadius: 20,
                background:
                  "#0f172a",
                color:
                  "#ffffff",
              }}
            >
              <div
                style={{
                  color:
                    "#94a3b8",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing:
                    "0.08em",
                }}
              >
                DECISION BOUNDARY
              </div>

              <p
                style={{
                  margin:
                    "9px 0 0",
                  color:
                    "#cbd5e1",
                  fontSize: 13,
                  lineHeight: 1.65,
                }}
              >
                Commercial Action Score
                只代表 AIOS
                的行动优先级。
                Buying Signal
                不是购买意愿证明，公开获客入口也不能证明广告效果差、
                线索成本高、转化率低或 ROI
                为负。
              </p>

              <p
                style={{
                  margin:
                    "9px 0 0",
                  color:
                    "#94a3b8",
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                AIOS
                可以自动发现、验证、评分、诊断和推荐行动，
                但当前不会自动联系客户、操作广告账户或记录不存在的收入。
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function DecisionCard({
  candidate,
  showEvidence,
}: {
  candidate: ProspectCandidate;
  showEvidence: boolean;
}) {
  const decision =
    candidate.commercialDecision;

  const style =
    actionStyle(
      decision.action,
    );

  return (
    <article
      style={{
        padding: 20,
        border:
          `1px solid ${style.border}`,
        borderRadius: 22,
        background:
          "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems:
            "flex-start",
          justifyContent:
            "space-between",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            minWidth: 0,
          }}
        >
          <div
            style={{
              color:
                "#64748b",
              fontSize: 11,
              fontWeight: 900,
            }}
          >
            #{candidate.rank}
            {" · "}
            {industryLabel(
              candidate.industry,
            )}
          </div>

          <h2
            style={{
              margin:
                "5px 0 0",
              fontSize: 20,
              lineHeight: 1.3,
              overflowWrap:
                "anywhere",
            }}
          >
            {candidate.name}
          </h2>

          <div
            style={{
              marginTop: 5,
              color:
                "#64748b",
              fontSize: 12,
            }}
          >
            {candidate.location}
          </div>
        </div>

        <div
          style={{
            padding:
              "7px 10px",
            borderRadius: 999,
            background:
              style.background,
            color:
              style.color,
            fontSize: 11,
            fontWeight: 950,
          }}
        >
          {actionLabel(
            decision.action,
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(125px, 1fr))",
          gap: 8,
          marginTop: 15,
        }}
      >
        <Score
          label="Action"
          value={percentage(
            decision.actionScore,
          )}
        />

        <Score
          label="Evidence"
          value={percentage(
            decision.evidenceConfidence,
          )}
        />

        <Score
          label="Buying Signal"
          value={percentage(
            decision.buyingSignalScore,
          )}
        />

        <Score
          label="Acquisition"
          value={percentage(
            decision.acquisitionReadinessScore,
          )}
        />
      </div>

      <div
        style={{
          marginTop: 14,
          padding: 14,
          borderRadius: 14,
          background:
            style.background,
          color:
            style.color,
          fontSize: 13,
          lineHeight: 1.65,
          fontWeight: 800,
        }}
      >
        {actionDescription(
          decision.action,
        )}
      </div>

      <ListBlock
        title="为什么 AIOS 这样判断"
        items={
          decision.reasons
        }
      />

      <ListBlock
        title="Buying Signals"
        items={
          candidate.buyingSignals
        }
      />

      <ListBlock
        title="已验证事实"
        items={
          candidate.verifiedFacts
        }
      />

      <ListBlock
        title="可验证商业假设"
        items={
          candidate
            .diagnosticHypotheses
        }
      />

      <div
        style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 14,
          background:
            "#f8fafc",
          color:
            "#334155",
          fontSize: 13,
          fontWeight: 800,
          lineHeight: 1.65,
        }}
      >
        <div
          style={{
            color:
              "#64748b",
            fontSize: 11,
            fontWeight: 950,
          }}
        >
          RECOMMENDED ACTION
        </div>

        <div
          style={{
            marginTop: 5,
          }}
        >
          {candidate.recommendedAction}
        </div>
      </div>

      {showEvidence &&
        candidate.evidence.length >
          0 && (
          <details
            style={{
              marginTop: 14,
            }}
          >
            <summary
              style={{
                cursor:
                  "pointer",
                color:
                  "#475569",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              查看原始证据 ·{" "}
              {candidate.evidence.length}
            </summary>

            <div
              style={{
                display: "grid",
                gap: 8,
                marginTop: 10,
              }}
            >
              {candidate.evidence.map(
                (
                  evidence,
                  index,
                ) => (
                  <a
                    key={`${evidence.url}-${index}`}
                    href={
                      evidence.url
                    }
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display:
                        "block",
                      padding: 12,
                      border:
                        "1px solid #e2e8f0",
                      borderRadius: 13,
                      color:
                        "#0f172a",
                      textDecoration:
                        "none",
                      overflowWrap:
                        "anywhere",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 900,
                      }}
                    >
                      {evidence.title}
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        color:
                          "#64748b",
                        fontSize: 11,
                      }}
                    >
                      {evidence.hostname}
                      {" · "}
                      {
                        evidence.verificationLabel
                      }
                      {" · "}
                      {percentage(
                        evidence.verificationScore,
                      )}
                    </div>
                  </a>
                ),
              )}
            </div>
          </details>
        )}

      {decision.founderReviewRequired && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            border:
              "1px solid #86efac",
            borderRadius: 14,
            background:
              "#f0fdf4",
            color:
              "#166534",
            fontSize: 13,
            lineHeight: 1.65,
            fontWeight: 850,
          }}
        >
          Founder
          决策点：确认真实联系渠道、检查微型预诊断，
          再决定是否批准一次一对一触达。
          当前页面不会自动发送任何消息。
        </div>
      )}
    </article>
  );
}

function CompactCandidate({
  candidate,
}: {
  candidate: ProspectCandidate;
}) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 13,
        background:
          "#f8fafc",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 900,
          }}
        >
          {candidate.name}
        </div>

        <div
          style={{
            color:
              "#64748b",
            fontSize: 12,
            fontWeight: 900,
          }}
        >
          {percentage(
            candidate
              .commercialDecision
              .actionScore,
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 4,
          color:
            "#64748b",
          fontSize: 11,
        }}
      >
        {industryLabel(
          candidate.industry,
        )}
        {" · "}
        自动观察
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 15,
        background:
          "#f8fafc",
      }}
    >
      <div
        style={{
          color:
            "#64748b",
          fontSize: 11,
          fontWeight: 900,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 5,
          fontSize: 20,
          fontWeight: 950,
          overflowWrap:
            "anywhere",
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 4,
          color:
            "#64748b",
          fontSize: 11,
        }}
      >
        {detail}
      </div>
    </div>
  );
}

function Score({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: 11,
        borderRadius: 12,
        background:
          "#f8fafc",
      }}
    >
      <div
        style={{
          color:
            "#64748b",
          fontSize: 10,
          fontWeight: 900,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 4,
          fontSize: 17,
          fontWeight: 950,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div
        style={{
          color:
            "#2563eb",
          fontSize: 11,
          fontWeight: 950,
          letterSpacing:
            "0.08em",
        }}
      >
        {eyebrow}
      </div>

      <div
        style={{
          marginTop: 4,
          fontSize: 19,
          fontWeight: 950,
        }}
      >
        {title}
      </div>

      <p
        style={{
          margin:
            "6px 0 0",
          color:
            "#64748b",
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        {description}
      </p>
    </div>
  );
}

function InfoBlock({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: 14,
        borderRadius: 14,
        background:
          "#f8fafc",
      }}
    >
      <div
        style={{
          color:
            "#475569",
          fontSize: 11,
          fontWeight: 950,
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 6,
          color:
            "#334155",
          fontSize: 13,
          lineHeight: 1.65,
        }}
      >
        {text}
      </div>
    </div>
  );
}

function ListBlock({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (
    items.length === 0
  ) {
    return null;
  }

  return (
    <div
      style={{
        marginTop: 16,
      }}
    >
      <div
        style={{
          color:
            "#475569",
          fontSize: 12,
          fontWeight: 950,
        }}
      >
        {title}
      </div>

      <div
        style={{
          display: "grid",
          gap: 6,
          marginTop: 8,
        }}
      >
        {items.map(
          (
            item,
            index,
          ) => (
            <div
              key={`${title}-${index}`}
              style={{
                padding:
                  "9px 11px",
                borderRadius: 11,
                background:
                  "#f8fafc",
                color:
                  "#475569",
                fontSize: 12,
                lineHeight: 1.55,
              }}
            >
              {item}
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function ResultRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems:
          "center",
        justifyContent:
          "space-between",
        gap: 14,
        padding:
          "11px 13px",
        borderRadius: 12,
        background:
          "#f8fafc",
      }}
    >
      <span
        style={{
          color:
            "#64748b",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {label}
      </span>

      <span
        style={{
          color:
            "#0f172a",
          fontSize: 12,
          fontWeight: 900,
          textAlign:
            "right",
          overflowWrap:
            "anywhere",
        }}
      >
        {value}
      </span>
    </div>
  );
}
