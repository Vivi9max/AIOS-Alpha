"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Dossier = {
  dossierId: string;
  symbol: string;
  market: "us" | "hk" | "cn";
  state:
    | "research-ready"
    | "partial"
    | "blocked"
    | "insufficient";

  change: {
    title: string;
    priority:
      | "critical"
      | "high"
      | "normal"
      | "low";
    materialChange: boolean;
    whatChanged: string[];
    whyItMatters: string[];
  };

  evidence: {
    identityVerified: boolean;
    verified: boolean;
    sourceCount: number;
    independentDomains: number;
    dataQuality: string;
    freshness: string;
    asOf: string | null;
    conflictCount: number;
  };

  industry: {
    summary: string | null;
    passed: boolean;
  };

  company: {
    summary: string | null;
    passed: boolean;
  };

  fundamentals: {
    assessment: string | null;
    passed: boolean;
    revenueGrowth: number | null;
    eps: number | null;
  };

  valuation: {
    assessment: string | null;
    passed: boolean;
    pe: number | null;
    pb: number | null;
    status: string;
    metricQuality: Array<{
      metric: string;
      value: number | null;
      available: boolean;
      quality: string;
    }>;
    methodologyWarnings: string[];
  };

  risk: {
    level: string;
    riskCount: number;
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    insufficientEvidenceCount: number;
    reassessmentRequired: boolean;
    risks: Array<{
      category: string;
      severity: string;
      status: string;
      title: string;
      description: string;
      invalidationCondition: string | null;
    }>;
    decisionInvalidationConditions: string[];
  };

  humanDecisionRequired: true;
};

type Result = {
  code: string;
  snapshot: {
    state: string;
    universeSize: number;
    evaluatedCount: number;
    researchReadyCount: number;
    partialCount: number;
    blockedCount: number;
    insufficientCount: number;
    dossiers: Dossier[];
    latencyMs: number;
  };
};

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

function marketName(
  market: Dossier["market"],
) {
  if (market === "us") {
    return "US";
  }

  if (market === "hk") {
    return "HK";
  }

  return "A-SHARE";
}

function stateLabel(
  state: string,
) {
  return state
    .replace(
      "-",
      " ",
    )
    .toUpperCase();
}

async function runDossier(): Promise<Result> {
  const key =
    accessKey();

  const response =
    await fetch(
      "/api/founder/market/research-dossier",
      {
        method: "POST",
        headers: {
          "content-type":
            "application/json",
          Authorization:
            `Bearer ${key}`,
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
        "Research Dossier failed.",
    );
  }

  return data;
}

async function runRegression() {
  const key =
    accessKey();

  const response =
    await fetch(
      "/api/founder/market/research-dossier?regression=true",
      {
        headers: {
          Authorization:
            `Bearer ${key}`,
        },
      },
    );

  return response.json();
}

function Metric({
  label,
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
        borderRadius:
          10,
        padding:
          12,
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
        {label}
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
        borderRadius:
          11,
        padding:
          14,
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

export default function MarketResearchDossierPage() {
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
        await runDossier();

      setResult(next);

      if (
        next.snapshot.dossiers
          .length > 0
      ) {
        setSelected(
          next.snapshot
            .dossiers[0]
            .dossierId,
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Research Dossier failed.",
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

  const dossiers =
    result?.snapshot.dossiers ??
    [];

  const active =
    useMemo(
      () =>
        dossiers.find(
          (item) =>
            item.dossierId ===
            selected,
        ) ??
        dossiers[0] ??
        null,
      [dossiers, selected],
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
            AIOS Research Dossier
          </h1>

          <p
            style={{
              color: "#888",
              lineHeight: 1.6,
              marginBottom: 0,
            }}
          >
            C156.1 · Market Change →
            Evidence → Industry →
            Company → Fundamentals →
            Valuation → Risk →
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
                C155.1 → C147.6 →
                C147.4 → C149 →
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
                ? "Building Dossiers..."
                : "Run Research Dossier"}
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
                value={stateLabel(
                  result.snapshot.state,
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
                label="DOSSIERS"
                value={
                  result.snapshot
                    .evaluatedCount
                }
              />

              <Metric
                label="READY"
                value={
                  result.snapshot
                    .researchReadyCount
                }
              />

              <Metric
                label="PARTIAL"
                value={
                  result.snapshot
                    .partialCount
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
                  RESEARCH DOSSIERS
                </div>

                <div
                  style={{
                    display:
                      "grid",
                    gap: 8,
                  }}
                >
                  {dossiers.map(
                    (item) => (
                      <button
                        key={
                          item.dossierId
                        }
                        type="button"
                        onClick={() =>
                          setSelected(
                            item.dossierId,
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
                            active?.dossierId ===
                            item.dossierId
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
                          {stateLabel(
                            item.state,
                          )}
                          {" · "}
                          {item.change.priority.toUpperCase()}
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
                          {stateLabel(
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

                    <Section title="01 · Market Change">
                      <strong>
                        {active.change.title}
                      </strong>

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
                        {active.change.whatChanged.join(
                          " · ",
                        )}
                      </p>

                      <div
                        style={{
                          color:
                            "#777",
                          fontSize:
                            11,
                        }}
                      >
                        {active.change.whyItMatters.join(
                          " · ",
                        )}
                      </div>
                    </Section>

                    <Section title="02 · Evidence & Verification">
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
                          label="EVIDENCE"
                          value={
                            active.evidence
                              .verified
                              ? "VERIFIED"
                              : "PARTIAL"
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
                          label="FRESHNESS"
                          value={
                            active.evidence
                              .freshness
                          }
                        />

                        <Metric
                          label="CONFLICTS"
                          value={
                            active.evidence
                              .conflictCount
                          }
                        />
                      </div>
                    </Section>

                    <Section title="03 · Industry">
                      <p
                        style={{
                          color:
                            "#aaa",
                          lineHeight:
                            1.6,
                          fontSize:
                            12,
                        }}
                      >
                        {active.industry.summary ??
                          "Industry analysis unavailable."}
                      </p>
                    </Section>

                    <Section title="04 · Company">
                      <p
                        style={{
                          color:
                            "#aaa",
                          lineHeight:
                            1.6,
                          fontSize:
                            12,
                        }}
                      >
                        {active.company.summary ??
                          "Company analysis unavailable."}
                      </p>
                    </Section>

                    <Section title="05 · Fundamentals">
                      <p
                        style={{
                          color:
                            "#aaa",
                          lineHeight:
                            1.6,
                          fontSize:
                            12,
                        }}
                      >
                        {active.fundamentals.assessment ??
                          "Fundamental assessment unavailable."}
                      </p>

                      <div
                        style={{
                          display:
                            "flex",
                          gap: 8,
                          flexWrap:
                            "wrap",
                        }}
                      >
                        <Metric
                          label="REVENUE GROWTH"
                          value={
                            active.fundamentals
                              .revenueGrowth ??
                            "N/A"
                          }
                        />

                        <Metric
                          label="EPS"
                          value={
                            active.fundamentals
                              .eps ??
                            "N/A"
                          }
                        />
                      </div>
                    </Section>

                    <Section title="06 · Valuation">
                      <p
                        style={{
                          color:
                            "#aaa",
                          lineHeight:
                            1.6,
                          fontSize:
                            12,
                        }}
                      >
                        {active.valuation.assessment ??
                          "Valuation assessment unavailable."}
                      </p>

                      <div
                        style={{
                          display:
                            "flex",
                          gap: 8,
                          flexWrap:
                            "wrap",
                        }}
                      >
                        <Metric
                          label="P/E"
                          value={
                            active.valuation
                              .pe ??
                            "N/A"
                          }
                        />

                        <Metric
                          label="P/B"
                          value={
                            active.valuation
                              .pb ??
                            "N/A"
                          }
                        />

                        <Metric
                          label="STATUS"
                          value={
                            active.valuation
                              .status
                          }
                        />
                      </div>

                      {active.valuation
                        .methodologyWarnings
                        .length > 0 && (
                        <p
                          style={{
                            color:
                              "#777",
                            fontSize:
                              11,
                            lineHeight:
                              1.6,
                          }}
                        >
                          {active.valuation
                            .methodologyWarnings
                            .join(
                              " · ",
                            )}
                        </p>
                      )}
                    </Section>

                    <Section title="07 · Risk Control">
                      <div
                        style={{
                          display:
                            "flex",
                          gap: 8,
                          flexWrap:
                            "wrap",
                          marginBottom:
                            10,
                        }}
                      >
                        <Metric
                          label="OVERALL RISK"
                          value={
                            active.risk
                              .level
                          }
                        />

                        <Metric
                          label="TOTAL RISKS"
                          value={
                            active.risk
                              .riskCount
                          }
                        />

                        <Metric
                          label="HIGH"
                          value={
                            active.risk
                              .highRiskCount
                          }
                        />

                        <Metric
                          label="REASSESSMENT"
                          value={
                            active.risk
                              .reassessmentRequired
                              ? "REQUIRED"
                              : "NO"
                          }
                        />
                      </div>

                      <div
                        style={{
                          display:
                            "grid",
                          gap: 8,
                        }}
                      >
                        {active.risk.risks.map(
                          (
                            risk,
                            index,
                          ) => (
                            <div
                              key={`${risk.category}-${index}`}
                              style={{
                                border:
                                  "1px solid #222",
                                borderRadius:
                                  9,
                                padding:
                                  10,
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
                                {risk.title}
                              </strong>

                              <p
                                style={{
                                  color:
                                    "#999",
                                  fontSize:
                                    11,
                                  lineHeight:
                                    1.6,
                                  margin:
                                    "6px 0",
                                }}
                              >
                                {risk.description}
                              </p>

                              {risk.invalidationCondition && (
                                <div
                                  style={{
                                    color:
                                      "#666",
                                    fontSize:
                                      10,
                                  }}
                                >
                                  Invalidation:
                                  {" "}
                                  {risk.invalidationCondition}
                                </div>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    </Section>

                    <Section title="08 · Human Decision Gate">
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
                          Human decision required
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
                          This dossier organizes
                          evidence, research,
                          valuation context and
                          risk. It does not
                          generate a buy, sell,
                          hold or target-price
                          instruction and does not
                          execute trading.
                        </p>
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
            marginTop: 18,
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
                C156.1 Runtime Regression
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
                C155 → Evidence →
                Industry → Company →
                Valuation → Risk
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
          C156.1 converts market changes
          into structured research dossiers.
          It connects evidence, industry,
          company, fundamentals, valuation
          and risk while preserving human
          decision authority.
        </footer>
      </div>
    </main>
  );
}
