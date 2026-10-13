"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

type ProspectQualification =
  | "qualified"
  | "needs-manual-validation";

interface ProspectEvidence {
  url: string;
  hostname: string;
  title: string;
  snippets: string[];
  credibilityTier: string;
  verificationLabel: string;
  verificationScore: number;
}

interface ProspectCandidate {
  id: string;
  rank: number;
  name: string;
  industry:
    | "home-renovation"
    | "old-home-renovation"
    | "whole-house-customization";
  location: string;
  qualification:
    ProspectQualification;
  evidenceScore: number;
  verifiedFacts: string[];
  acquisitionSignals: string[];
  diagnosticHypotheses: string[];
  unknowns: string[];
  evidence: ProspectEvidence[];
  recommendedAction: string;
}

interface C168Response {
  success?: boolean;
  service?: string;
  version?: string;
  code?: string;
  status?: string;

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
    qualifiedCount?: number;
    manualValidationCount?: number;
    conclusion?: string;
    nextStep?: string;
  };

  candidates?: ProspectCandidate[];

  qualifiedCandidates?: ProspectCandidate[];

  manualValidationCandidates?: ProspectCandidate[];

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

  integrity?: {
    fabricatedProspect?: boolean;
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

function industryLabel(
  industry: ProspectCandidate["industry"],
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

function qualificationLabel(
  qualification: ProspectQualification,
): string {
  return qualification ===
    "qualified"
    ? "优先研究"
    : "需要人工核验";
}

function percentage(
  value: number,
): string {
  return `${Math.round(
    value * 100,
  )}%`;
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

  async function runDiscovery() {
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
            `C168 discovery failed (HTTP ${response.status}).`,
        );
      }
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof
          Error
          ? requestError.message
          : "C168 prospect discovery request failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  const candidates =
    useMemo(
      () =>
        result?.candidates ??
        [],
      [
        result?.candidates,
      ],
    );

  const qualified =
    useMemo(
      () =>
        candidates.filter(
          (candidate) =>
            candidate.qualification ===
            "qualified",
        ),
      [candidates],
    );

  return (
    <main
      style={{
        minHeight:
          "100vh",
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
          width:
            "100%",
          maxWidth:
            980,
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
            fontSize:
              13,
            fontWeight:
              800,
            textDecoration:
              "none",
          }}
        >
          {"<- Founder Console"}
        </Link>

        <header
          style={{
            marginTop:
              20,
          }}
        >
          <div
            style={{
              color:
                "#2563eb",
              fontSize:
                12,
              fontWeight:
                950,
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
              fontSize:
                30,
              lineHeight:
                1.15,
            }}
          >
            AIOS 广告获客
          </h1>

          <p
            style={{
              margin:
                "9px 0 0",
              color:
                "#64748b",
              lineHeight:
                1.65,
            }}
          >
            深圳家装 / 旧房局改 /
            全屋定制客户发现与研究优先级
          </p>
        </header>

        <section
          style={{
            marginTop:
              22,
            padding:
              20,
            border:
              "1px solid #dbe3f0",
            borderRadius:
              22,
            background:
              "#ffffff",
          }}
        >
          <div
            style={{
              fontSize:
                18,
              fontWeight:
                950,
            }}
          >
            第一现金流目标
          </div>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap:
                10,
              marginTop:
                16,
            }}
          >
            <Metric
              label="首个 Offer"
              value="¥399"
              detail="48小时广告获客诊断"
            />

            <Metric
              label="升级 Offer"
              value="¥699"
              detail="7天广告获客验证"
            />

            <Metric
              label="目标客户"
              value="1"
              detail="真实付费客户"
            />

            <Metric
              label="当前市场"
              value="深圳"
              detail="先验证，再扩行业"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              void runDiscovery()
            }
            disabled={
              loading
            }
            style={{
              width:
                "100%",
              minHeight:
                54,
              marginTop:
                18,
              border:
                0,
              borderRadius:
                15,
              background:
                loading
                  ? "#94a3b8"
                  : "#0f172a",
              color:
                "#ffffff",
              fontSize:
                16,
              fontWeight:
                950,
              cursor:
                loading
                  ? "wait"
                  : "pointer",
            }}
          >
            {loading
              ? "AIOS 正在搜索并验证深圳候选客户..."
              : "▶ 发现今天最值得研究的客户"}
          </button>

          <p
            style={{
              margin:
                "12px 0 0",
              color:
                "#64748b",
              fontSize:
                12,
              lineHeight:
                1.6,
            }}
          >
            AIOS
            只使用公开证据进行候选客户发现。
            此操作不会联系客户、不会操作广告账户，
            也不会自动记录收入。
          </p>

          {error && (
            <div
              style={{
                marginTop:
                  14,
                padding:
                  14,
                borderRadius:
                  14,
                background:
                  "#fff1f2",
                color:
                  "#be123c",
                fontSize:
                  13,
                lineHeight:
                  1.6,
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
                marginTop:
                  18,
                padding:
                  20,
                border:
                  "1px solid #dbe3f0",
                borderRadius:
                  22,
                background:
                  "#ffffff",
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
                    16,
                  flexWrap:
                    "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize:
                        12,
                      fontWeight:
                        900,
                      color:
                        "#64748b",
                    }}
                  >
                    DISCOVERY STATUS
                  </div>

                  <div
                    style={{
                      marginTop:
                        5,
                      fontSize:
                        22,
                      fontWeight:
                        950,
                    }}
                  >
                    {result.status ??
                      "UNKNOWN"}
                  </div>
                </div>

                <div
                  style={{
                    padding:
                      "7px 11px",
                    borderRadius:
                      999,
                    background:
                      qualified.length >
                      0
                        ? "#dcfce7"
                        : "#fef3c7",
                    color:
                      qualified.length >
                      0
                        ? "#166534"
                        : "#92400e",
                    fontSize:
                      12,
                    fontWeight:
                      900,
                  }}
                >
                  {qualified.length >
                  0
                    ? `${qualified.length} 个优先研究客户`
                    : "需要继续验证"}
                </div>
              </div>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(150px, 1fr))",
                  gap:
                    10,
                  marginTop:
                    18,
                }}
              >
                <Metric
                  label="候选客户"
                  value={String(
                    result
                      .discovery
                      ?.candidateCount ??
                      candidates.length,
                  )}
                  detail="有公开证据"
                />

                <Metric
                  label="优先研究"
                  value={String(
                    result
                      .discovery
                      ?.qualifiedCount ??
                      qualified.length,
                  )}
                  detail="达到当前筛选标准"
                />

                <Metric
                  label="Evidence"
                  value={String(
                    result
                      .discovery
                      ?.sourceCount ??
                      0,
                  )}
                  detail="公开证据"
                />

                <Metric
                  label="独立来源"
                  value={String(
                    result
                      .discovery
                      ?.independentHosts ??
                      0,
                  )}
                  detail="独立 Host"
                />
              </div>

              {result.discovery
                ?.conclusion && (
                <InfoBlock
                  title="AIOS 判断"
                  text={
                    result.discovery
                      .conclusion
                  }
                />
              )}

              {result.nextAction && (
                <InfoBlock
                  title="Founder 下一步"
                  text={
                    result.nextAction
                  }
                />
              )}
            </section>

            {candidates.length >
              0 && (
              <section
                style={{
                  marginTop:
                    18,
                }}
              >
                <div
                  style={{
                    marginBottom:
                      12,
                    fontSize:
                      19,
                    fontWeight:
                      950,
                  }}
                >
                  今天值得研究的客户
                </div>

                <div
                  style={{
                    display:
                      "grid",
                    gap:
                      14,
                  }}
                >
                  {candidates.map(
                    (
                      candidate,
                    ) => (
                      <CandidateCard
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
              </section>
            )}

            {candidates.length ===
              0 && (
              <section
                style={{
                  marginTop:
                    18,
                  padding:
                    20,
                  border:
                    "1px solid #fde68a",
                  borderRadius:
                    22,
                  background:
                    "#fffbeb",
                }}
              >
                <div
                  style={{
                    fontWeight:
                      950,
                    color:
                      "#92400e",
                  }}
                >
                  暂无可信候选客户
                </div>

                <p
                  style={{
                    margin:
                      "8px 0 0",
                    color:
                      "#92400e",
                    fontSize:
                      13,
                    lineHeight:
                      1.6,
                  }}
                >
                  AIOS
                  没有为了填满列表而生成虚假客户。
                  当前应该继续补充公开证据，而不是直接触达。
                </p>
              </section>
            )}

            <section
              style={{
                marginTop:
                  18,
                padding:
                  20,
                border:
                  "1px solid #dbe3f0",
                borderRadius:
                  22,
                background:
                  "#ffffff",
              }}
            >
              <div
                style={{
                  fontWeight:
                    950,
                }}
              >
                商业执行链
              </div>

              <div
                style={{
                  marginTop:
                    12,
                  display:
                    "grid",
                  gap:
                    8,
                }}
              >
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

                <ResultRow
                  label="Runtime"
                  value={
                    result.version ??
                    "C168"
                  }
                />
              </div>
            </section>

            <section
              style={{
                marginTop:
                  18,
                padding:
                  18,
                borderRadius:
                  20,
                background:
                  "#0f172a",
                color:
                  "#ffffff",
              }}
            >
              <div
                style={{
                  fontSize:
                    12,
                  fontWeight:
                    900,
                  color:
                    "#94a3b8",
                  letterSpacing:
                    "0.08em",
                }}
              >
                INTEGRITY BOUNDARY
              </div>

              <p
                style={{
                  margin:
                    "9px 0 0",
                  color:
                    "#cbd5e1",
                  fontSize:
                    13,
                  lineHeight:
                    1.65,
                }}
              >
                候选客户排名只代表研究优先级。
                AIOS
                不会因为发现广告、营销、咨询或预约入口，
                就声称该商家的广告效果差、线索成本高、
                转化率低或 ROI 为负。
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function CandidateCard({
  candidate,
}: {
  candidate: ProspectCandidate;
}) {
  const qualified =
    candidate.qualification ===
    "qualified";

  return (
    <article
      style={{
        padding:
          20,
        border:
          qualified
            ? "1px solid #86efac"
            : "1px solid #dbe3f0",
        borderRadius:
          22,
        background:
          "#ffffff",
      }}
    >
      <div
        style={{
          display:
            "flex",
          alignItems:
            "flex-start",
          justifyContent:
            "space-between",
          gap:
            14,
        }}
      >
        <div
          style={{
            minWidth:
              0,
          }}
        >
          <div
            style={{
              color:
                "#64748b",
              fontSize:
                12,
              fontWeight:
                900,
            }}
          >
            #{candidate.rank} ·{" "}
            {industryLabel(
              candidate.industry,
            )}
          </div>

          <h2
            style={{
              margin:
                "5px 0 0",
              fontSize:
                20,
              lineHeight:
                1.3,
              overflowWrap:
                "anywhere",
            }}
          >
            {candidate.name}
          </h2>

          <div
            style={{
              marginTop:
                5,
              color:
                "#64748b",
              fontSize:
                12,
            }}
          >
            {candidate.location}
          </div>
        </div>

        <div
          style={{
            flex:
              "0 0 auto",
            padding:
              "6px 9px",
            borderRadius:
              999,
            background:
              qualified
                ? "#dcfce7"
                : "#fef3c7",
            color:
              qualified
                ? "#166534"
                : "#92400e",
            fontSize:
              11,
            fontWeight:
              900,
          }}
        >
          {qualificationLabel(
            candidate.qualification,
          )}
        </div>
      </div>

      <div
        style={{
          marginTop:
            14,
          padding:
            13,
          borderRadius:
            14,
          background:
            "#f8fafc",
        }}
      >
        <div
          style={{
            color:
              "#64748b",
            fontSize:
              11,
            fontWeight:
              900,
          }}
        >
          EVIDENCE SCORE
        </div>

        <div
          style={{
            marginTop:
              4,
            fontSize:
              20,
            fontWeight:
              950,
          }}
        >
          {percentage(
            candidate.evidenceScore,
          )}
        </div>
      </div>

      <ListBlock
        title="已验证事实"
        items={
          candidate.verifiedFacts
        }
      />

      <ListBlock
        title="公开获客信号"
        items={
          candidate.acquisitionSignals
        }
      />

      <ListBlock
        title="值得检查的问题"
        items={
          candidate
            .diagnosticHypotheses
        }
      />

      <ListBlock
        title="目前不知道"
        items={
          candidate.unknowns
        }
      />

      {candidate.evidence.length >
        0 && (
        <div
          style={{
            marginTop:
              16,
          }}
        >
          <div
            style={{
              fontSize:
                12,
              fontWeight:
                950,
              color:
                "#475569",
            }}
          >
            EVIDENCE
          </div>

          <div
            style={{
              display:
                "grid",
              gap:
                8,
              marginTop:
                8,
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
                    padding:
                      12,
                    border:
                      "1px solid #e2e8f0",
                    borderRadius:
                      13,
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
                      fontSize:
                        13,
                      fontWeight:
                        900,
                    }}
                  >
                    {evidence.title}
                  </div>

                  <div
                    style={{
                      marginTop:
                        4,
                      color:
                        "#64748b",
                      fontSize:
                        11,
                    }}
                  >
                    {
                      evidence.hostname
                    }
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
        </div>
      )}

      <div
        style={{
          marginTop:
            16,
          padding:
            14,
          borderRadius:
            14,
          background:
            qualified
              ? "#f0fdf4"
              : "#fffbeb",
          color:
            qualified
              ? "#166534"
              : "#92400e",
          fontSize:
            13,
          fontWeight:
            800,
          lineHeight:
            1.6,
        }}
      >
        下一步：
        {" "}
        {
          candidate.recommendedAction
        }
      </div>
    </article>
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
        padding:
          14,
        borderRadius:
          15,
        background:
          "#f8fafc",
      }}
    >
      <div
        style={{
          color:
            "#64748b",
          fontSize:
            11,
          fontWeight:
            900,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop:
            5,
          fontSize:
            20,
          fontWeight:
            950,
          overflowWrap:
            "anywhere",
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop:
            4,
          color:
            "#64748b",
          fontSize:
            11,
        }}
      >
        {detail}
      </div>
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
        marginTop:
          14,
        padding:
          14,
        borderRadius:
          14,
        background:
          "#f8fafc",
      }}
    >
      <div
        style={{
          color:
            "#475569",
          fontSize:
            11,
          fontWeight:
            950,
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop:
            6,
          color:
            "#334155",
          fontSize:
            13,
          lineHeight:
            1.65,
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
        marginTop:
          16,
      }}
    >
      <div
        style={{
          color:
            "#475569",
          fontSize:
            12,
          fontWeight:
            950,
        }}
      >
        {title}
      </div>

      <div
        style={{
          display:
            "grid",
          gap:
            6,
          marginTop:
            8,
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
                borderRadius:
                  11,
                background:
                  "#f8fafc",
                color:
                  "#475569",
                fontSize:
                  12,
                lineHeight:
                  1.55,
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
        display:
          "flex",
        alignItems:
          "center",
        justifyContent:
          "space-between",
        gap:
          14,
        padding:
          "11px 13px",
        borderRadius:
          12,
        background:
          "#f8fafc",
      }}
    >
      <span
        style={{
          color:
            "#64748b",
          fontSize:
            12,
          fontWeight:
            800,
        }}
      >
        {label}
      </span>

      <span
        style={{
          color:
            "#0f172a",
          fontSize:
            12,
          fontWeight:
            900,
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
