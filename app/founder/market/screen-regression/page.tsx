"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

type RegressionDecision = {
  symbol: string;
  market: string;
  decision: string;
  evidenceSources: number;
  independentDomains: number;
  dataQuality: string;
};

type RegressionCase = {
  name: string;
  passed: boolean;
  code: string;
  universeSize: number;
  evaluatedCount: number;
  candidateCount: number;
  excludedCount: number;
  insufficientDataCount: number;
  latencyMs: number;
  decisions: RegressionDecision[];
  error?: string;
};

type RegressionResponse = {
  success?: boolean;
  code?: string;
  stage?: string;
  verified?: boolean;
  passed?: number;
  failed?: number;
  total?: number;
  latencyMs?: number;
  results?: RegressionCase[];
  principle?: string;
  disclaimer?: string;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        marginTop: 16,
        padding: 16,
        borderRadius: 14,
        border:
          "1px solid rgba(255,255,255,0.10)",
        background:
          "rgba(255,255,255,0.035)",
      }}
    >
      <h2
        style={{
          margin:
            "0 0 12px",
          fontSize: 16,
        }}
      >
        {title}
      </h2>

      {children}
    </section>
  );
}

function Status({
  passed,
}: {
  passed: boolean;
}) {
  return (
    <strong
      style={{
        color:
          passed
            ? "#86efac"
            : "#fca5a5",
      }}
    >
      {passed
        ? "PASS"
        : "FAIL"}
    </strong>
  );
}

export default function MarketScreeningRegressionPage() {
  const [
    founderReady,
    setFounderReady,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    response,
    setResponse,
  ] =
    useState<RegressionResponse | null>(
      null,
    );

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    const key =
      window.sessionStorage.getItem(
        STORAGE_KEY,
      );

    setFounderReady(
      Boolean(key),
    );
  }, []);

  async function runRegression() {
    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const key =
        window.sessionStorage.getItem(
          STORAGE_KEY,
        );

      if (!key) {
        throw new Error(
          "Founder Session not found. Open Founder Console first.",
        );
      }

      const result =
        await fetch(
          "/api/founder/market/screen-regression",
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Authorization:
                `Bearer ${key}`,

              "x-aios-founder-key":
                key,
            },
          },
        );

      const data =
        (await result.json()) as RegressionResponse;

      if (
        !result.ok &&
        !data.code
      ) {
        throw new Error(
          `Regression request failed with HTTP ${result.status}.`,
        );
      }

      setResponse(data);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Market screening regression failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight:
          "100vh",

        background:
          "#09090b",

        color:
          "#fff",

        padding:
          "24px 16px 60px",

        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth:
            960,

          margin:
            "0 auto",
        }}
      >
        <div
          style={{
            opacity:
              0.55,

            fontSize:
              12,

            letterSpacing:
              1,
          }}
        >
          PRIVATE FOUNDER ACCESS
        </div>

        <h1
          style={{
            margin:
              "8px 0 4px",

            fontSize:
              28,
          }}
        >
          Market Screening Regression
        </h1>

        <p
          style={{
            marginTop:
              0,

            opacity:
              0.65,

            lineHeight:
              1.6,
          }}
        >
          C147.3.1 · Universe normalization ·
          valuation filters · evidence gates ·
          US / HK / A-share runtime
        </p>

        <Section title="Founder Session">
          <div
            style={{
              lineHeight:
                1.7,
            }}
          >
            Session:{" "}
            <strong
              style={{
                color:
                  founderReady
                    ? "#86efac"
                    : "#fca5a5",
              }}
            >
              {founderReady
                ? "PASS"
                : "NOT DETECTED"}
            </strong>

            <br />

            Authentication:{" "}
            {founderReady
              ? "Current Founder Console session will be reused."
              : "Open Founder Console first."}
          </div>
        </Section>

        <Section title="Regression Cases">
          <div
            style={{
              lineHeight:
                1.8,

              fontSize:
                13,

              opacity:
                0.8,
            }}
          >
            1. Mixed US + HK + A-share universe
            <br />
            2. Duplicate symbol normalization
            <br />
            3. Valuation filter execution
            <br />
            4. Evidence quality gate
            <br />
            5. A-share runtime
          </div>

          <button
            onClick={
              runRegression
            }
            disabled={
              loading ||
              !founderReady
            }
            style={{
              marginTop:
                14,

              width:
                "100%",

              padding:
                "14px 16px",

              borderRadius:
                10,

              border:
                "none",

              background:
                loading ||
                !founderReady
                  ? "#3f3f46"
                  : "#fff",

              color:
                loading ||
                !founderReady
                  ? "#aaa"
                  : "#09090b",

              fontWeight:
                700,

              cursor:
                loading
                  ? "wait"
                  : "pointer",
            }}
          >
            {loading
              ? "Running Regression…"
              : "▶ Run C147.3.1 Regression"}
          </button>
        </Section>

        {error && (
          <Section title="Error">
            <div
              style={{
                color:
                  "#fca5a5",

                lineHeight:
                  1.6,
              }}
            >
              {error}
            </div>
          </Section>
        )}

        {response && (
          <>
            <Section title="Regression Summary">
              <div
                style={{
                  fontSize:
                    20,

                  lineHeight:
                    1.8,
                }}
              >
                <Status
                  passed={
                    response.verified ===
                    true
                  }
                />

                {" · "}

                {response.passed ??
                  0}
                {" / "}
                {response.total ??
                  0}
                {" passed"}
              </div>

              <div
                style={{
                  marginTop:
                    12,

                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",

                  gap:
                    10,
                }}
              >
                <div
                  style={{
                    padding:
                      12,

                    borderRadius:
                      10,

                    background:
                      "rgba(74,222,128,0.08)",
                  }}
                >
                  Passed
                  <br />
                  <strong>
                    {
                      response.passed ??
                      0
                    }
                  </strong>
                </div>

                <div
                  style={{
                    padding:
                      12,

                    borderRadius:
                      10,

                    background:
                      "rgba(248,113,113,0.08)",
                  }}
                >
                  Failed
                  <br />
                  <strong>
                    {
                      response.failed ??
                      0
                    }
                  </strong>
                </div>

                <div
                  style={{
                    padding:
                      12,

                    borderRadius:
                      10,

                    background:
                      "rgba(255,255,255,0.05)",
                  }}
                >
                  Stage
                  <br />
                  <strong>
                    {
                      response.stage ??
                      "unknown"
                    }
                  </strong>
                </div>

                <div
                  style={{
                    padding:
                      12,

                    borderRadius:
                      10,

                    background:
                      "rgba(255,255,255,0.05)",
                  }}
                >
                  Runtime
                  <br />
                  <strong>
                    {
                      response.latencyMs ??
                      0
                    }
                    ms
                  </strong>
                </div>
              </div>

              <pre
                style={{
                  marginTop:
                    14,

                  whiteSpace:
                    "pre-wrap",

                  fontSize:
                    12,

                  lineHeight:
                    1.5,

                  opacity:
                    0.65,
                }}
              >
                {JSON.stringify(
                  {
                    code:
                      response.code,

                    verified:
                      response.verified,

                    principle:
                      response.principle,
                  },
                  null,
                  2,
                )}
              </pre>
            </Section>

            {response.results?.map(
              (
                item,
                index,
              ) => (
                <Section
                  key={`${item.name}-${index}`}
                  title={`${index + 1}. ${item.name}`}
                >
                  <div
                    style={{
                      lineHeight:
                        1.8,

                      fontSize:
                        13,
                    }}
                  >
                    Status:{" "}
                    <Status
                      passed={
                        item.passed
                      }
                    />

                    <br />

                    Code:{" "}
                    {item.code}

                    <br />

                    Universe:{" "}
                    {item.universeSize}

                    {" · "}

                    Evaluated:{" "}
                    {item.evaluatedCount}

                    <br />

                    Candidates:{" "}
                    {item.candidateCount}

                    {" · "}

                    Excluded:{" "}
                    {item.excludedCount}

                    {" · "}

                    Insufficient:{" "}
                    {item.insufficientDataCount}

                    <br />

                    Latency:{" "}
                    {item.latencyMs}
                    ms
                  </div>

                  {item.error && (
                    <div
                      style={{
                        marginTop:
                          12,

                        color:
                          "#fca5a5",
                      }}
                    >
                      {item.error}
                    </div>
                  )}

                  {item.decisions.length >
                    0 && (
                    <div
                      style={{
                        marginTop:
                          14,

                        display:
                          "grid",

                        gap:
                          8,
                      }}
                    >
                      {item.decisions.map(
                        (
                          decision,
                          decisionIndex,
                        ) => (
                          <div
                            key={`${decision.symbol}-${decisionIndex}`}
                            style={{
                              padding:
                                12,

                              borderRadius:
                                10,

                              background:
                                "rgba(255,255,255,0.04)",
                            }}
                          >
                            <strong>
                              {
                                decision.symbol
                              }
                            </strong>
                            {" · "}
                            {
                              decision.market
                            }

                            <br />

                            Decision:{" "}
                            <strong>
                              {
                                decision.decision
                              }
                            </strong>

                            <br />

                            Evidence:{" "}
                            {
                              decision.evidenceSources
                            }
                            {" sources / "}
                            {
                              decision.independentDomains
                            }
                            {" domains"}

                            <br />

                            Data quality:{" "}
                            {
                              decision.dataQuality
                            }
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </Section>
              ),
            )}

            {response.disclaimer && (
              <div
                style={{
                  marginTop:
                    18,

                  fontSize:
                    12,

                  opacity:
                    0.45,

                  lineHeight:
                    1.6,
                }}
              >
                {
                  response.disclaimer
                }
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
