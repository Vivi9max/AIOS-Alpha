"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Workspace = {
  decisionId: string;
  symbol: string;
  market: "us" | "hk" | "cn";

  state:
    | "decision-ready"
    | "review-required"
    | "blocked"
    | "insufficient";

  reviewStatus:
    | "pending-human-review"
    | "evidence-gap"
    | "risk-reassessment"
    | "blocked";

  priority:
    | "critical"
    | "high"
    | "normal"
    | "low";

  materialChange: boolean;

  evidence: {
    identityVerified: boolean;
    verified: boolean;
    sourceCount: number;
    independentDomains: number;
    conflictCount: number;
    dataQuality: string;
    freshness: string;
  };

  researchSummary: {
    change: string;
    industry: string | null;
    company: string | null;
    fundamentals: string | null;
    valuation: string | null;
    risk: string | null;
  };

  evidenceGaps: string[];

  decisionQuestions: Array<{
    id: string;
    category: string;
    question: string;
    reason: string;
    requiresEvidence: boolean;
  }>;

  invalidationConditions: string[];

  humanDecisionRequired: true;
  decisionRecorded: false;
  recommendationGenerated: false;
  tradingAllowed: false;
};

type Result = {
  code: string;
  snapshot: {
    state: string;
    universeSize: number;
    evaluatedCount: number;
    decisionReadyCount: number;
    reviewRequiredCount: number;
    blockedCount: number;
    insufficientCount: number;
    workspaces: Workspace[];
    latencyMs: number;
  };
};

const universe = [
  {
    symbol: "NVDA",
    market: "us",
  },
  {
    symbol: "0700.HK",
    market: "hk",
  },
  {
    symbol: "600519.SH",
    market: "cn",
  },
];

function accessKey() {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  return (
    sessionStorage.getItem(
      "aios-founder-access-key",
    ) ?? ""
  );
}

function marketName(
  market: Workspace["market"],
) {
  if (market === "us") {
    return "US";
  }

  if (market === "hk") {
    return "HK";
  }

  return "A-SHARE";
}

function label(
  value: string,
) {
  return value
    .replaceAll(
      "-",
      " ",
    )
    .toUpperCase();
}

async function runWorkspace(): Promise<Result> {
  const response =
    await fetch(
      "/api/founder/market/decision-workspace",
      {
        method: "POST",
        headers: {
          "content-type":
            "application/json",
          Authorization:
            `Bearer ${accessKey()}`,
        },
        body: JSON.stringify({
          universe,
        }),
      },
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error ??
        "Decision Workspace failed.",
    );
  }

  return data;
}

async function runRegression() {
  const response =
    await fetch(
      "/api/founder/market/decision-workspace?regression=true",
      {
        headers: {
          Authorization:
            `Bearer ${accessKey()}`,
        },
      },
    );

  return response.json();
}

function Metric({
  label: metricLabel,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        border:
          "1px solid #222",
        borderRadius: 10,
        padding: 12,
        background:
          "#101010",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "#666",
        }}
      >
        {metricLabel}
      </div>

      <strong
        style={{
          display: "block",
          marginTop: 6,
          fontSize: 16,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        marginTop: 14,
        border:
          "1px solid #222",
        borderRadius: 11,
        padding: 14,
        background:
          "#0d0d0d",
      }}
    >
      <h3
        style={{
          margin:
            "0 0 10px",
          fontSize: 15,
        }}
      >
        {title}
      </h3>

      {children}
    </section>
  );
}

export default function MarketDecisionWorkspacePage() {
  const [
    sessionDetected,
    setSessionDetected,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    result,
    setResult,
  ] = useState<Result | null>(
    null,
  );

  const [
    selected,
    setSelected,
  ] = useState<string | null>(
    null,
  );

  const [
    regression,
    setRegression,
  ] = useState<any>(null);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    setSessionDetected(
      Boolean(
        accessKey(),
      ),
    );
  }, []);

  async function run() {
    setLoading(true);
    setError("");

    try {
      const next =
        await runWorkspace();

      setResult(next);

      if (
        next.snapshot
          .workspaces
          .length > 0
      ) {
        setSelected(
          next.snapshot
            .workspaces[0]
            .decisionId,
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Decision Workspace failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function regressionRun() {
    setError("");

    try {
      setRegression(
        await runRegression(),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Regression failed.",
      );
    }
  }

  const workspaces =
    result?.snapshot
      .workspaces ?? [];

  const active =
    useMemo(
      () =>
        workspaces.find(
          (item) =>
            item.decisionId ===
            selected,
        ) ??
        workspaces[0] ??
        null,
      [
        workspaces,
        selected,
      ],
    );

  return (
    <main
      style={{
        minHeight:
          "100vh",
        background:
          "#070707",
        color:
          "#f5f5f5",
        padding:
          "28px 18px 60px",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth:
            1180,
          margin:
            "0 auto",
        }}
      >
        <header
          style={{
            marginBottom:
              22,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing:
                "0.14em",
              color: "#666",
            }}
          >
            PRIVATE FOUNDER ACCESS
          </div>

          <h1
            style={{
              margin:
                "9px 0 0",
              fontSize: 29,
            }}
          >
            AIOS Market Decision Workspace
          </h1>

          <p
            style={{
              color: "#888",
              lineHeight: 1.6,
              marginBottom: 0,
            }}
          >
            C157.1 · Research Dossier →
            Decision Questions →
            Evidence Gaps →
            Risk Invalidation →
            Human Decision
          </p>
        </header>

        <section
          style={{
            border:
              "1px solid #222",
            borderRadius:
              14,
            padding:
              16,
            background:
              "#0d0d0d",
            marginBottom:
              16,
          }}
        >
          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap: 14,
              flexWrap:
                "wrap",
            }}
          >
            <div>
              <strong>
                {sessionDetected
                  ? "Founder Session detected"
                  : "Founder Session not detected"}
              </strong>

              <div
                style={{
                  color: "#666",
                  fontSize: 11,
                  marginTop: 6,
                }}
              >
                C156.1 → C155.1 →
                C147.6 → C149 →
                C147.17
              </div>
            </div>

            <button
              type="button"
              disabled={
                loading ||
                !sessionDetected
              }
              onClick={run}
              style={{
                border: "none",
                borderRadius: 10,
                padding:
                  "12px 18px",
                background:
                  loading ||
                  !sessionDetected
                    ? "#333"
                    : "#fff",
                color:
                  loading ||
                  !sessionDetected
                    ? "#777"
                    : "#000",
                fontWeight: 700,
              }}
            >
              {loading
                ? "Building Workspace..."
                : "Run Decision Workspace"}
            </button>
          </div>
        </section>

        {error && (
          <section
            style={{
              padding: 14,
              marginBottom: 16,
              border:
                "1px solid #522",
              borderRadius: 10,
              color:
                "#ffaaaa",
            }}
          >
            {error}
          </section>
        )}

        {result && (
          <>
            <section
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(145px,1fr))",
                gap: 9,
                marginBottom: 18,
              }}
            >
              <Metric
                label="STATE"
                value={label(
                  result.snapshot
                    .state,
                )}
              />

              <Metric
                label="UNIVERSE"
                value={
                  result.snapshot
                    .universeSize
                }
              />

              <Metric
                label="WORKSPACES"
                value={
                  result.snapshot
                    .evaluatedCount
                }
              />

              <Metric
                label="DECISION READY"
                value={
                  result.snapshot
                    .decisionReadyCount
                }
              />

              <Metric
                label="REVIEW REQUIRED"
                value={
                  result.snapshot
                    .reviewRequiredCount
                }
              />

              <Metric
                label="BLOCKED"
                value={
                  result.snapshot
                    .blockedCount
                }
              />

              <Metric
                label="INSUFFICIENT"
                value={
                  result.snapshot
                    .insufficientCount
                }
              />

              <Metric
                label="LATENCY"
                value={`${result.snapshot.latencyMs}ms`}
              />
            </section>

            <section
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "minmax(240px,0.7fr) minmax(0,1.6fr)",
                gap: 12,
              }}
            >
              <div
                style={{
                  border:
                    "1px solid #222",
                  borderRadius:
                    14,
                  padding:
                    12,
                  background:
                    "#0d0d0d",
                }}
              >
                <div
                  style={{
                    color: "#666",
                    fontSize: 11,
                    marginBottom:
                      10,
                  }}
                >
                  DECISION WORKSPACES
                </div>

                <div
                  style={{
                    display:
                      "grid",
                    gap: 8,
                  }}
                >
                  {workspaces.map(
                    (item) => (
                      <button
                        key={
                          item.decisionId
                        }
                        type="button"
                        onClick={() =>
                          setSelected(
                            item.decisionId,
                          )
                        }
                        style={{
                          textAlign:
                            "left",
                          border:
                            "1px solid #222",
                          borderRadius:
                            10,
                          padding:
                            12,
                          background:
                            active?.decisionId ===
                            item.decisionId
                              ? "#181818"
                              : "#101010",
                          color:
                            "#eee",
                        }}
                      >
                        <strong>
                          {item.symbol}
                        </strong>

                        <span
                          style={{
                            marginLeft:
                              7,
                            color:
                              "#666",
                            fontSize:
                              10,
                          }}
                        >
                          {marketName(
                            item.market,
                          )}
                        </span>

                        <div
                          style={{
                            marginTop:
                              7,
                            fontSize:
                              10,
                            color:
                              "#999",
                          }}
                        >
                          {label(
                            item.state,
                          )}
                          {" · "}
                          {item.priority.toUpperCase()}
                        </div>
                      </button>
                    ),
                  )}
                </div>
              </div>

              {active && (
                <div>
                  <section
                    style={{
                      border:
                        "1px solid #222",
                      borderRadius:
                        14,
                      padding:
                        17,
                      background:
                        "#0d0d0d",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap: 12,
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize:
                              24,
                            fontWeight:
                              750,
                          }}
                        >
                          {active.symbol}
                        </div>

                        <div
                          style={{
                            color:
                              "#666",
                            fontSize:
                              11,
                          }}
                        >
                          {marketName(
                            active.market,
                          )}
                          {" · "}
                          {label(
                            active.state,
                          )}
                        </div>
                      </div>

                      <div
                        style={{
                          border:
                            "1px solid #333",
                          borderRadius:
                            999,
                          padding:
                            "5px 9px",
                          fontSize:
                            10,
                        }}
                      >
                        HUMAN DECISION REQUIRED
                      </div>
                    </div>

                    <Section title="01 · Research State">
                      <div
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit,minmax(130px,1fr))",
                          gap: 8,
                        }}
                      >
                        <Metric
                          label="REVIEW"
                          value={label(
                            active.reviewStatus,
                          )}
                        />

                        <Metric
                          label="PRIORITY"
                          value={
                            active.priority.toUpperCase()
                          }
                        />

                        <Metric
                          label="MATERIAL CHANGE"
                          value={
                            active.materialChange
                              ? "YES"
                              : "NO"
                          }
                        />
                      </div>

                      <p
                        style={{
                          color:
                            "#999",
                          fontSize:
                            12,
                          lineHeight:
                            1.6,
                        }}
                      >
                        {
                          active.researchSummary
                            .change
                        }
                      </p>
                    </Section>

                    <Section title="02 · Evidence Status">
                      <div
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit,minmax(120px,1fr))",
                          gap: 8,
                        }}
                      >
                        <Metric
                          label="IDENTITY"
                          value={
                            active.evidence
                              .identityVerified
                              ? "VERIFIED"
                              : "NOT VERIFIED"
                          }
                        />

                        <Metric
                          label="VERIFIED"
                          value={
                            active.evidence
                              .verified
                              ? "YES"
                              : "NO"
                          }
                        />

                        <Metric
                          label="SOURCES"
                          value={
                            active.evidence
                              .sourceCount
                          }
                        />

                        <Metric
                          label="DOMAINS"
                          value={
                            active.evidence
                              .independentDomains
                          }
                        />

                        <Metric
                          label="CONFLICTS"
                          value={
                            active.evidence
                              .conflictCount
                          }
                        />

                        <Metric
                          label="FRESHNESS"
                          value={
                            active.evidence
                              .freshness
                          }
                        />
                      </div>
                    </Section>

                    <Section title="03 · Evidence Gaps">
                      {active.evidenceGaps
                        .length === 0 ? (
                        <div
                          style={{
                            color:
                              "#999",
                            fontSize:
                              12,
                          }}
                        >
                          No explicit evidence gap detected by the runtime.
                          Human verification is still required.
                        </div>
                      ) : (
                        <div
                          style={{
                            display:
                              "grid",
                            gap: 8,
                          }}
                        >
                          {active.evidenceGaps.map(
                            (
                              gap,
                              index,
                            ) => (
                              <div
                                key={
                                  `${gap}-${index}`
                                }
                                style={{
                                  border:
                                    "1px solid #222",
                                  borderRadius:
                                    9,
                                  padding:
                                    10,
                                  color:
                                    "#aaa",
                                  fontSize:
                                    11,
                                  lineHeight:
                                    1.6,
                                }}
                              >
                                {gap}
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </Section>

                    <Section title="04 · Research Context">
                      {Object.entries(
                        active.researchSummary,
                      ).map(
                        ([
                          key,
                          value,
                        ]) => (
                          <div
                            key={
                              key
                            }
                            style={{
                              marginBottom:
                                10,
                            }}
                          >
                            <div
                              style={{
                                color:
                                  "#666",
                                fontSize:
                                  10,
                              }}
                            >
                              {key.toUpperCase()}
                            </div>

                            <div
                              style={{
                                color:
                                  "#aaa",
                                fontSize:
                                  12,
                                lineHeight:
                                  1.6,
                                marginTop:
                                  4,
                              }}
                            >
                              {value ??
                                "Not available."}
                            </div>
                          </div>
                        ),
                      )}
                    </Section>

                    <Section title="05 · Human Decision Questions">
                      <div
                        style={{
                          display:
                            "grid",
                          gap: 9,
                        }}
                      >
                        {active.decisionQuestions.map(
                          (
                            question,
                          ) => (
                            <div
                              key={
                                question.id
                              }
                              style={{
                                border:
                                  "1px solid #222",
                                borderRadius:
                                  9,
                                padding:
                                  11,
                                background:
                                  "#101010",
                              }}
                            >
                              <strong
                                style={{
                                  fontSize:
                                    12,
                                }}
                              >
                                {
                                  question.question
                                }
                              </strong>

                              <div
                                style={{
                                  color:
                                    "#777",
                                  fontSize:
                                    10,
                                  marginTop:
                                    6,
                                }}
                              >
                                {question.category.toUpperCase()}
                                {" · "}
                                {
                                  question.reason
                                }
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </Section>

                    <Section title="06 · Risk Invalidation Conditions">
                      {active.invalidationConditions
                        .length === 0 ? (
                        <div
                          style={{
                            color:
                              "#777",
                            fontSize:
                              11,
                          }}
                        >
                          No explicit invalidation condition was produced.
                          This does not mean risk is absent.
                        </div>
                      ) : (
                        <div
                          style={{
                            display:
                              "grid",
                            gap: 8,
                          }}
                        >
                          {active.invalidationConditions.map(
                            (
                              condition,
                              index,
                            ) => (
                              <div
                                key={
                                  `${condition}-${index}`
                                }
                                style={{
                                  border:
                                    "1px solid #333",
                                  borderRadius:
                                    9,
                                  padding:
                                    10,
                                  color:
                                    "#aaa",
                                  fontSize:
                                    11,
                                  lineHeight:
                                    1.6,
                                }}
                              >
                                {condition}
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </Section>

                    <Section title="07 · Decision Boundary">
                      <div
                        style={{
                          border:
                            "1px solid #333",
                          borderRadius:
                            10,
                          padding:
                            13,
                          background:
                            "#111",
                        }}
                      >
                        <strong>
                          No decision has been recorded.
                        </strong>

                        <p
                          style={{
                            color:
                              "#888",
                            fontSize:
                              11,
                            lineHeight:
                              1.6,
                            marginBottom:
                              0,
                          }}
                        >
                          AIOS has organized the available research,
                          evidence gaps and invalidation conditions.
                          The human remains responsible for deciding
                          whether and how to act.
                        </p>

                        <div
                          style={{
                            marginTop:
                              10,
                            display:
                              "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit,minmax(130px,1fr))",
                            gap: 8,
                          }}
                        >
                          <Metric
                            label="DECISION RECORDED"
                            value="NO"
                          />

                          <Metric
                            label="RECOMMENDATION"
                            value="NONE"
                          />

                          <Metric
                            label="TRADING"
                            value="NOT ALLOWED"
                          />
                        </div>
                      </div>
                    </Section>
                  </section>
                </div>
              )}
            </section>
          </>
        )}

        <section
          style={{
            marginTop:
              18,
            border:
              "1px solid #222",
            borderRadius:
              14,
            padding:
              16,
            background:
              "#0d0d0d",
          }}
        >
          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap: 12,
              flexWrap:
                "wrap",
            }}
          >
            <div>
              <strong>
                C157.1 Runtime Regression
              </strong>

              <div
                style={{
                  color:
                    "#666",
                  fontSize:
                    11,
                  marginTop:
                    5,
                }}
              >
                C156.1 → Decision Questions →
                Evidence Gaps → Risk Invalidation
              </div>
            </div>

            <button
              type="button"
              disabled={
                !sessionDetected
              }
              onClick={
                regressionRun
              }
              style={{
                border:
                  "1px solid #333",
                borderRadius:
                  9,
                padding:
                  "10px 14px",
                background:
                  "transparent",
                color:
                  "#ddd",
              }}
            >
              Run Regression
            </button>
          </div>

          {regression && (
            <div
              style={{
                marginTop:
                  13,
                color:
                  regression.success
                    ? "#86efac"
                    : "#fca5a5",
                fontSize:
                  12,
              }}
            >
              {regression.code}
              {" · "}
              {regression.passed}/
              {regression.total}
              {" checks passed"}
            </div>
          )}
        </section>

        <footer
          style={{
            marginTop:
              18,
            color:
              "#555",
            fontSize:
              11,
            lineHeight:
              1.7,
          }}
        >
          C157.1 transforms the C156 research dossier
          into a structured human decision workspace.
          AIOS exposes evidence gaps, research questions
          and invalidation conditions without making the
          investment decision or executing trades.
        </footer>
      </div>
    </main>
  );
}
