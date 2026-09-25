"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type ResearchItem = {
  researchId: string;
  symbol: string;
  market: "us" | "hk" | "cn";
  priority: "critical" | "high" | "normal";
  state:
    | "material-change"
    | "evidence-required"
    | "blocked"
    | "monitoring";
  title: string;
  whatChanged: string[];
  whyItMatters: string[];
  evidenceStatus:
    | "verified"
    | "partial"
    | "insufficient"
    | "blocked";
  evidenceSourceCount: number;
  independentDomains: number;
  identityVerified: boolean;
  humanDecisionRequired: true;
};

type Result = {
  code: string;
  snapshot: {
    state: string;
    universeSize: number;
    monitoredCount: number;
    materialChangeCount: number;
    evidenceRequiredCount: number;
    blockedCount: number;
    verifiedEvidenceCount: number;
    researchItems: ResearchItem[];
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

async function runOperatingSystem(): Promise<Result> {
  const key =
    accessKey();

  const response =
    await fetch(
      "/api/founder/market/operating-system",
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
          includeMonitoring: true,
          includeBlocked: true,
        }),
      },
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error ??
        data?.message ??
        "Market Operating System failed.",
    );
  }

  return data;
}

async function runRegression() {
  const key =
    accessKey();

  const response =
    await fetch(
      "/api/founder/market/operating-system-regression",
      {
        headers: {
          Authorization:
            `Bearer ${key}`,
        },
      },
    );

  return response.json();
}

function marketName(
  market: ResearchItem["market"],
) {
  if (market === "us")
    return "US";

  if (market === "hk")
    return "HK";

  return "A-SHARE";
}

function stateLabel(
  value: string,
) {
  switch (value) {
    case "research-required":
      return "RESEARCH REQUIRED";

    case "evidence-required":
      return "EVIDENCE REQUIRED";

    case "blocked":
      return "BLOCKED";

    case "monitoring":
      return "MONITORING";

    default:
      return value
        .toUpperCase();
  }
}

function evidenceLabel(
  value: ResearchItem["evidenceStatus"],
) {
  return value
    .replace(
      "-",
      " ",
    )
    .toUpperCase();
}

export default function MarketOperatingSystemPage() {
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
      setResult(
        await runOperatingSystem(),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Market Operating System failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function regressionRun() {
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

  const items =
    result?.snapshot
      .researchItems ??
    [];

  const material =
    useMemo(
      () =>
        items.filter(
          (item) =>
            item.state ===
            "material-change",
        ),
      [items],
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
            1120,

          margin:
            "0 auto",
        }}
      >
        <header
          style={{
            marginBottom:
              24,
          }}
        >
          <div
            style={{
              fontSize:
                11,

              letterSpacing:
                "0.14em",

              color:
                "#666",
            }}
          >
            PRIVATE FOUNDER ACCESS
          </div>

          <h1
            style={{
              margin:
                "9px 0 0",

              fontSize:
                30,
            }}
          >
            AIOS Market Operating System
          </h1>

          <p
            style={{
              color:
                "#888",

              lineHeight:
                1.6,
            }}
          >
            C155.1 · Continuous Market
            Sensing → Evidence →
            Research → Human Decision
          </p>
        </header>

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

              gap:
                14,

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
                  color:
                    "#666",

                  fontSize:
                    11,

                  marginTop:
                    6,
                }}
              >
                C154 Radar →
                C147.6 Evidence →
                C155 Research Organization
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
                border:
                  "none",

                borderRadius:
                  10,

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

                fontWeight:
                  700,
              }}
            >
              {loading
                ? "Scanning..."
                : "Run Market OS"}
            </button>
          </div>
        </section>

        {error && (
          <section
            style={{
              padding:
                14,

              marginBottom:
                16,

              border:
                "1px solid #522",

              borderRadius:
                10,

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
                  "repeat(auto-fit,minmax(150px,1fr))",

                gap:
                  10,

                marginBottom:
                  18,
              }}
            >
              {[
                [
                  "State",
                  stateLabel(
                    result.snapshot.state,
                  ),
                ],
                [
                  "Universe",
                  result.snapshot
                    .universeSize,
                ],
                [
                  "Research",
                  result.snapshot
                    .monitoredCount,
                ],
                [
                  "Material",
                  result.snapshot
                    .materialChangeCount,
                ],
                [
                  "Evidence",
                  result.snapshot
                    .evidenceRequiredCount,
                ],
                [
                  "Verified",
                  result.snapshot
                    .verifiedEvidenceCount,
                ],
                [
                  "Blocked",
                  result.snapshot
                    .blockedCount,
                ],
                [
                  "Latency",
                  `${result.snapshot.latencyMs}ms`,
                ],
              ].map(
                ([title, value]) => (
                  <div
                    key={
                      String(title)
                    }
                    style={{
                      border:
                        "1px solid #222",

                      borderRadius:
                        11,

                      padding:
                        13,

                      background:
                        "#0d0d0d",
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          10,

                        color:
                          "#666",
                      }}
                    >
                      {title}
                    </div>

                    <strong
                      style={{
                        display:
                          "block",

                        marginTop:
                          7,

                        fontSize:
                          17,
                      }}
                    >
                      {value}
                    </strong>
                  </div>
                ),
              )}
            </section>

            <section
              style={{
                border:
                  "1px solid #222",

                borderRadius:
                  14,

                padding:
                  17,

                marginBottom:
                  18,

                background:
                  "#0d0d0d",
              }}
            >
              <h2
                style={{
                  marginTop:
                    0,

                  fontSize:
                    19,
                }}
              >
                Research Queue
              </h2>

              <p
                style={{
                  color:
                    "#777",

                  fontSize:
                    12,

                  lineHeight:
                    1.6,
                }}
              >
                Market changes are converted
                into research objects. They
                are not converted into trading
                instructions.
              </p>

              <div
                style={{
                  display:
                    "grid",

                  gap:
                    10,
                }}
              >
                {items.map(
                  (item) => (
                    <article
                      key={
                        item.researchId
                      }
                      style={{
                        border:
                          "1px solid #222",

                        borderRadius:
                          11,

                        padding:
                          14,

                        background:
                          "#101010",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",

                          justifyContent:
                            "space-between",

                          gap:
                            10,

                          flexWrap:
                            "wrap",
                        }}
                      >
                        <div>
                          <strong>
                            {item.symbol}
                          </strong>

                          <span
                            style={{
                              marginLeft:
                                8,

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
                        </div>

                        <span
                          style={{
                            fontSize:
                              10,

                            border:
                              "1px solid #333",

                            borderRadius:
                              999,

                            padding:
                              "4px 8px",
                          }}
                        >
                          {item.priority.toUpperCase()}
                        </span>
                      </div>

                      <div
                        style={{
                          marginTop:
                            9,

                          fontWeight:
                            600,
                        }}
                      >
                        {item.title}
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
                        {item.whatChanged.join(
                          " · ",
                        )}
                      </p>

                      <div
                        style={{
                          display:
                            "flex",

                          gap:
                            8,

                          flexWrap:
                            "wrap",

                          fontSize:
                            10,

                          color:
                            "#777",
                        }}
                      >
                        <span>
                          State:{" "}
                          {item.state}
                        </span>

                        <span>
                          Evidence:{" "}
                          {evidenceLabel(
                            item.evidenceStatus,
                          )}
                        </span>

                        <span>
                          Sources:{" "}
                          {
                            item.evidenceSourceCount
                          }
                        </span>

                        <span>
                          Domains:{" "}
                          {
                            item.independentDomains
                          }
                        </span>

                        <span>
                          Identity:{" "}
                          {item.identityVerified
                            ? "VERIFIED"
                            : "NOT VERIFIED"}
                        </span>
                      </div>
                    </article>
                  ),
                )}

                {items.length ===
                  0 && (
                  <div
                    style={{
                      color:
                        "#666",

                      padding:
                        20,
                    }}
                  >
                    No research items emitted.
                  </div>
                )}
              </div>
            </section>

            <section
              style={{
                border:
                  "1px solid #222",

                borderRadius:
                  14,

                padding:
                  17,

                marginBottom:
                  18,

                background:
                  "#0d0d0d",
              }}
            >
              <h2
                style={{
                  marginTop:
                    0,

                  fontSize:
                    17,
                }}
              >
                Operating Pipeline
              </h2>

              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(145px,1fr))",

                  gap:
                    8,
                }}
              >
                {[
                  "01 Market",
                  "02 Change Detection",
                  "03 Radar",
                  "04 Evidence",
                  "05 Verification",
                  "06 Industry",
                  "07 Company",
                  "08 Valuation",
                  "09 Risk",
                  "10 Human Decision",
                ].map(
                  (step) => (
                    <div
                      key={
                        step
                      }
                      style={{
                        border:
                          "1px solid #222",

                        borderRadius:
                          9,

                        padding:
                          11,

                        fontSize:
                          11,

                        color:
                          "#aaa",
                      }}
                    >
                      {step}
                    </div>
                  ),
                )}
              </div>
            </section>
          </>
        )}

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

              alignItems:
                "center",

              gap:
                12,

              flexWrap:
                "wrap",
            }}
          >
            <div>
              <strong>
                C155.1.1 Runtime Regression
              </strong>

              <div
                style={{
                  marginTop:
                    5,

                  color:
                    "#666",

                  fontSize:
                    11,
                }}
              >
                Radar → Evidence →
                Research Boundary
              </div>
            </div>

            <button
              type="button"
              onClick={
                regressionRun
              }
              disabled={
                !sessionDetected
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
                  14,

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
          C155 is a continuous market
          research organization layer.
          It detects change, connects
          evidence, organizes research,
          and preserves human decision
          authority. It does not execute
          trades.
        </footer>
      </div>
    </main>
  );
}
