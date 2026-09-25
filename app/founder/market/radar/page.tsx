"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

type Signal = {
  signalId: string;

  symbol: string;

  market: string;

  type: string;

  priority: string;

  title: string;

  description: string;

  materialChange: boolean;

  observationChanged: boolean;

  sourceEventId: string | null;

  sourceVersion: string;

  humanDecisionRequired: boolean;

  detectedAt: string;
};

type RadarResult = {
  success: boolean;

  code: string;

  radar: {
    state: string;

    universeSize: number;

    evaluatedCount: number;

    eventCount: number;

    materialEventCount: number;

    highPriorityCount: number;

    blockedCount: number;

    noChangeCount: number;

    noHistoryCount: number;

    signals: Signal[];

    generatedAt: string;

    latencyMs: number;
  };

  runtime: {
    name: string;

    version: string;

    upstream: string;

    generatedAt: string;

    latencyMs: number;
  };

  disclaimer: string;
};

type RegressionResult = {
  success: boolean;

  verified: boolean;

  code: string;

  stage: string;

  total: number;

  passed: number;

  failed: number;

  checks: Array<{
    name: string;
    passed: boolean;
    detail: string;
  }>;

  runtimeMs: number;
};

const DEFAULT_UNIVERSE = [
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

function getAccessKey() {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  return (
    window.sessionStorage.getItem(
      STORAGE_KEY,
    )?.trim() ?? ""
  );
}

function marketName(
  market: string,
) {
  if (market === "us") {
    return "US";
  }

  if (market === "hk") {
    return "HK";
  }

  if (market === "cn") {
    return "A-SHARE";
  }

  return market.toUpperCase();
}

function stateLabel(
  state: string,
) {
  switch (state) {
    case "attention":
      return "ATTENTION";

    case "active":
      return "ACTIVE";

    case "blocked":
      return "BLOCKED";

    case "stable":
      return "STABLE";

    default:
      return "INSUFFICIENT";
  }
}

function priorityLabel(
  priority: string,
) {
  switch (priority) {
    case "critical":
      return "CRITICAL";

    case "high":
      return "HIGH";

    case "normal":
      return "NORMAL";

    default:
      return priority.toUpperCase();
  }
}

async function requestRadar() {
  const key =
    getAccessKey();

  if (!key) {
    throw new Error(
      "Founder Session not found. Please return to Founder Console.",
    );
  }

  const response =
    await fetch(
      "/api/founder/market/radar",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${key}`,

          Accept:
            "application/json",
        },

        body:
          JSON.stringify({
            universe:
              DEFAULT_UNIVERSE,

            includeNoChange:
              true,

            includeNoHistory:
              true,

            includeBlocked:
              true,
          }),

        cache:
          "no-store",
      },
    );

  const data =
    (await response.json()) as
      Partial<RadarResult> & {
        message?: string;
        error?: string;
      };

  if (
    response.status ===
    401
  ) {
    throw new Error(
      "Founder authentication failed. Return to Founder Console and refresh the Founder Session.",
    );
  }

  if (
    !response.ok
  ) {
    throw new Error(
      data.message ??
        data.error ??
        data.code ??
        "Market Radar failed.",
    );
  }

  return data as RadarResult;
}

async function requestRegression() {
  const key =
    getAccessKey();

  if (!key) {
    throw new Error(
      "Founder Session not found.",
    );
  }

  const response =
    await fetch(
      "/api/founder/market/radar-regression",
      {
        method: "GET",

        headers: {
          Authorization:
            `Bearer ${key}`,

          Accept:
            "application/json",
        },

        cache:
          "no-store",
      },
    );

  const data =
    (await response.json()) as
      RegressionResult & {
        message?: string;
        error?: string;
      };

  if (
    response.status ===
    401
  ) {
    throw new Error(
      "Founder authentication failed.",
    );
  }

  if (
    !response.ok
  ) {
    throw new Error(
      data.message ??
        data.error ??
        data.code ??
        "Regression failed.",
    );
  }

  return data;
}

function Card({
  title,
  value,
  detail,
}: {
  title: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div
      style={{
        border:
          "1px solid #222",

        borderRadius:
          14,

        padding:
          16,

        background:
          "#101010",
      }}
    >
      <div
        style={{
          fontSize:
            11,

          color:
            "#777",

          letterSpacing:
            "0.08em",

          textTransform:
            "uppercase",
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop:
            8,

          fontSize:
            24,

          fontWeight:
            700,
        }}
      >
        {value}
      </div>

      {detail && (
        <div
          style={{
            marginTop:
              6,

            fontSize:
              11,

            color:
              "#666",
          }}
        >
          {detail}
        </div>
      )}
    </div>
  );
}

function SignalCard({
  signal,
}: {
  signal: Signal;
}) {
  return (
    <article
      style={{
        border:
          "1px solid #242424",

        borderRadius:
          14,

        padding:
          17,

        background:
          "#0e0e0e",
      }}
    >
      <div
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          gap:
            12,

          flexWrap:
            "wrap",
        }}
      >
        <div>
          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              gap:
                8,
            }}
          >
            <strong
              style={{
                fontSize:
                  18,
              }}
            >
              {signal.symbol}
            </strong>

            <span
              style={{
                fontSize:
                  10,

                color:
                  "#777",

                border:
                  "1px solid #333",

                borderRadius:
                  999,

                padding:
                  "3px 7px",
              }}
            >
              {marketName(
                signal.market,
              )}
            </span>
          </div>

          <div
            style={{
              marginTop:
                7,

              fontWeight:
                600,
            }}
          >
            {signal.title}
          </div>
        </div>

        <span
          style={{
            height:
              "fit-content",

            fontSize:
              10,

            border:
              "1px solid #333",

            borderRadius:
              999,

            padding:
              "4px 8px",

            color:
              signal.priority ===
              "critical"
                ? "#ff8b8b"
                : signal.priority ===
                    "high"
                  ? "#ffd27a"
                  : "#aaa",
          }}
        >
          {priorityLabel(
            signal.priority,
          )}
        </span>
      </div>

      <p
        style={{
          margin:
            "12px 0",

          color:
            "#aaa",

          lineHeight:
            1.65,

          fontSize:
            13,
        }}
      >
        {signal.description}
      </p>

      <div
        style={{
          display:
            "flex",

          gap:
            10,

          flexWrap:
            "wrap",

          color:
            "#666",

          fontSize:
            10,
        }}
      >
        <span>
          Type:{" "}
          {signal.type}
        </span>

        <span>
          Source:{" "}
          {signal.sourceVersion}
        </span>

        <span>
          Human review required
        </span>
      </div>
    </article>
  );
}

export default function MarketRadarPage() {
  const [
    sessionDetected,
    setSessionDetected,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    regressionLoading,
    setRegressionLoading,
  ] =
    useState(false);

  const [
    result,
    setResult,
  ] =
    useState<RadarResult | null>(
      null,
    );

  const [
    regression,
    setRegression,
  ] =
    useState<RegressionResult | null>(
      null,
    );

  const [
    error,
    setError,
  ] =
    useState("");

  useEffect(() => {
    setSessionDetected(
      Boolean(
        getAccessKey(),
      ),
    );
  }, []);

  async function runRadar() {
    setLoading(true);
    setError("");

    try {
      const data =
        await requestRadar();

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Market Radar failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function runRegression() {
    setRegressionLoading(
      true,
    );

    setError("");

    try {
      const data =
        await requestRegression();

      setRegression(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Regression failed.",
      );
    } finally {
      setRegressionLoading(
        false,
      );
    }
  }

  const signals =
    result?.radar.signals ??
    [];

  const materialSignals =
    useMemo(
      () =>
        signals.filter(
          (signal) =>
            signal.materialChange,
        ),
      [signals],
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

              marginBottom:
                8,
            }}
          >
            PRIVATE FOUNDER ACCESS
          </div>

          <h1
            style={{
              margin:
                0,

              fontSize:
                30,
            }}
          >
            AIOS Market Radar
          </h1>

          <p
            style={{
              marginTop:
                8,

              color:
                "#888",

              lineHeight:
                1.6,
            }}
          >
            C154.1 · Professional Market
            Change Monitoring Foundation
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

            marginBottom:
              16,

            background:
              "#0d0d0d",
          }}
        >
          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "space-between",

              gap:
                16,

              flexWrap:
                "wrap",
            }}
          >
            <div>
              <div
                style={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap:
                    9,
                }}
              >
                <span
                  style={{
                    width:
                      8,

                    height:
                      8,

                    borderRadius:
                      "50%",

                    background:
                      sessionDetected
                        ? "#4ade80"
                        : "#f87171",
                  }}
                />

                <strong>
                  {sessionDetected
                    ? "Founder Session detected"
                    : "Founder Session not detected"}
                </strong>
              </div>

              <div
                style={{
                  marginTop:
                    7,

                  fontSize:
                    12,

                  color:
                    "#777",
                }}
              >
                AIOS Founder Session →
                Authorization Bearer →
                Market Radar
              </div>
            </div>

            <button
              type="button"
              onClick={
                runRadar
              }
              disabled={
                loading ||
                !sessionDetected
              }
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

                cursor:
                  loading
                    ? "wait"
                    : "pointer",
              }}
            >
              {loading
                ? "Scanning..."
                : "Run Market Radar"}
            </button>
          </div>
        </section>

        {error && (
          <section
            style={{
              marginBottom:
                16,

              border:
                "1px solid #522",

              borderRadius:
                12,

              padding:
                14,

              color:
                "#ffaaaa",

              background:
                "#160b0b",

              fontSize:
                13,

              lineHeight:
                1.5,
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

                gap:
                  10,

                marginBottom:
                  18,
              }}
            >
              <Card
                title="Market State"
                value={stateLabel(
                  result.radar.state,
                )}
                detail={`Runtime ${result.runtime.version}`}
              />

              <Card
                title="Universe"
                value={
                  result.radar
                    .universeSize
                }
                detail="US / HK / A-share"
              />

              <Card
                title="Events"
                value={
                  result.radar
                    .eventCount
                }
                detail="Structured events"
              />

              <Card
                title="Material"
                value={
                  result.radar
                    .materialEventCount
                }
                detail="Requires research review"
              />

              <Card
                title="Priority"
                value={
                  result.radar
                    .highPriorityCount
                }
                detail="High / critical"
              />

              <Card
                title="Latency"
                value={`${result.radar.latencyMs}ms`}
                detail="Runtime execution"
              />
            </section>

            <section
              style={{
                marginBottom:
                  18,
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

                  marginBottom:
                    10,
                }}
              >
                <h2
                  style={{
                    margin:
                      0,

                    fontSize:
                      19,
                  }}
                >
                  Market Change Signals
                </h2>

                <span
                  style={{
                    color:
                      "#666",

                    fontSize:
                      11,
                  }}
                >
                  {materialSignals.length}
                  {" "}
                  material
                </span>
              </div>

              <div
                style={{
                  display:
                    "grid",

                  gap:
                    10,
                }}
              >
                {signals.map(
                  (
                    signal,
                  ) => (
                    <SignalCard
                      key={
                        signal.signalId
                      }
                      signal={
                        signal
                      }
                    />
                  ),
                )}

                {signals.length ===
                  0 && (
                  <div
                    style={{
                      border:
                        "1px solid #222",

                      borderRadius:
                        12,

                      padding:
                        20,

                      color:
                        "#777",
                    }}
                  >
                    No market events
                    were emitted by
                    the current
                    upstream runtime.
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

                background:
                  "#0d0d0d",

                marginBottom:
                  18,
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
                Professional Research Pipeline
              </h2>

              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(150px,1fr))",

                  gap:
                    8,

                  marginTop:
                    14,
                }}
              >
                {[
                  "Market",
                  "Change Detection",
                  "Evidence",
                  "Verification",
                  "Industry",
                  "Company",
                  "Valuation",
                  "Risk",
                  "Human Decision",
                ].map(
                  (
                    item,
                    index,
                  ) => (
                    <div
                      key={
                        item
                      }
                      style={{
                        border:
                          "1px solid #222",

                        borderRadius:
                          9,

                        padding:
                          10,

                        fontSize:
                          11,

                        color:
                          "#aaa",
                      }}
                    >
                      <span
                        style={{
                          color:
                            "#555",
                        }}
                      >
                        {String(
                          index +
                            1,
                        ).padStart(
                          2,
                          "0",
                        )}
                      </span>

                      {" "}

                      {item}
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

            marginBottom:
              18,

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

              gap:
                12,

              alignItems:
                "center",

              flexWrap:
                "wrap",
            }}
          >
            <div>
              <strong>
                C154.1.1 Runtime Regression
              </strong>

              <div
                style={{
                  marginTop:
                    5,

                  color:
                    "#777",

                  fontSize:
                    12,
                }}
              >
                Authenticated US / HK /
                A-share Radar boundary
              </div>
            </div>

            <button
              type="button"
              onClick={
                runRegression
              }
              disabled={
                regressionLoading ||
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

                cursor:
                  regressionLoading
                    ? "wait"
                    : "pointer",
              }}
            >
              {regressionLoading
                ? "Running..."
                : "Run Regression"}
            </button>
          </div>

          {regression && (
            <div
              style={{
                marginTop:
                  16,
              }}
            >
              <div
                style={{
                  fontWeight:
                    700,

                  marginBottom:
                    10,

                  color:
                    regression.success
                      ? "#86efac"
                      : "#fca5a5",
                }}
              >
                {regression.code}
              </div>

              <div
                style={{
                  fontSize:
                    12,

                  color:
                    "#777",

                  marginBottom:
                    12,
                }}
              >
                {regression.passed}
                /
                {regression.total}
                {" "}
                checks passed ·{" "}
                {regression.runtimeMs}
                ms
              </div>

              <div
                style={{
                  display:
                    "grid",

                  gap:
                    7,
                }}
              >
                {regression.checks.map(
                  (
                    check,
                  ) => (
                    <div
                      key={
                        check.name
                      }
                      style={{
                        padding:
                          10,

                        borderRadius:
                          8,

                        background:
                          "#111",

                        fontSize:
                          11,
                      }}
                    >
                      <strong
                        style={{
                          color:
                            check.passed
                              ? "#86efac"
                              : "#fca5a5",
                        }}
                      >
                        {check.passed
                          ? "PASS"
                          : "FAIL"}
                      </strong>

                      {" "}

                      {check.name}

                      <div
                        style={{
                          marginTop:
                            4,

                          color:
                            "#666",
                        }}
                      >
                        {
                          check.detail
                        }
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </section>

        <footer
          style={{
            color:
              "#555",

            fontSize:
              11,

            lineHeight:
              1.7,
          }}
        >
          C154 is a professional market
          research monitoring layer. It
          detects and organizes market
          changes for human research.
          It does not autonomously decide
          or execute trades.
        </footer>
      </div>
    </main>
  );
}
