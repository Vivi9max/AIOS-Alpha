"use client";

import {
  useEffect,
  useState,
} from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

type MarketResult = {
  success?: boolean;
  verified?: boolean;
  code?: string;
  message?: string;
  error?: string;

  instrument?: {
    symbol?: string;
    normalizedSymbol?: string;
    market?: string;
    exchange?: string;
    currency?: string;
  };

  snapshot?: {
    price?: number | null;
    previousClose?: number | null;
    changePercent?: number | null;
    marketCap?: number | null;
    pe?: number | null;
    pb?: number | null;
    eps?: number | null;
    revenue?: number | null;
    revenueGrowth?: number | null;
    dataQuality?: string;
    liveQuoteAvailable?: boolean;
    asOf?: string | null;
    source?: string | null;
  };

  analysis?: {
    industry?: {
      summary?: string;
      evidence?: string[];
    };

    company?: {
      summary?: string;
      strengths?: string[];
      risks?: string[];
    };

    fundamentals?: {
      assessment?: string;
      signals?: string[];
    };

    valuation?: {
      assessment?: string;
      signals?: string[];
    };

    trend?: {
      assessment?: string;
      signals?: string[];
    };

    risk?: {
      level?: string;
      factors?: string[];
    };

    decisionSupport?: {
      currentState?: string;
      supportingFactors?: string[];
      invalidationConditions?: string[];
      watchMetrics?: string[];
      scenarios?: Array<{
        name?: string;
        condition?: string;
        implication?: string;
      }>;
    };
  };

  evidence?: Array<{
    title?: string;
    url?: string;
    hostname?: string;
    snippet?: string;
    confidence?: number;
  }>;

  verification?: {
    verified?: boolean;
    sourceCount?: number;
    independentDomains?: number;
    primarySourceFound?: boolean;
  };

  metadata?: {
    runtime?: string;
    stage?: string;
    analysisMode?: string;
    generatedAt?: string;
    disclaimer?: string;
  };

  latencyMs?: number;
};

function getAccessKey(): string {
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

async function requestMarketAnalysis(
  symbol: string,
  market: string,
  mode: string,
): Promise<MarketResult> {
  const key =
    getAccessKey();

  if (!key) {
    throw new Error(
      "Founder Session not found. Please return to Founder Console and enter the Founder Access Key.",
    );
  }

  const response =
    await fetch(
      "/api/founder/market/analyze",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Authorization:
            `Bearer ${key}`,
        },
        body: JSON.stringify({
          symbol,
          market,
          mode,
        }),
        cache: "no-store",
      },
    );

  const data =
    (await response.json()) as MarketResult;

  if (
    response.status === 401
  ) {
    throw new Error(
      "Founder authentication failed. Please return to Founder Console and re-enter the Founder Access Key.",
    );
  }

  return data;
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
        border:
          "1px solid rgba(255,255,255,0.10)",
        borderRadius: 14,
        padding: 18,
        background:
          "rgba(255,255,255,0.035)",
      }}
    >
      <h2
        style={{
          marginTop: 0,
          marginBottom: 12,
          fontSize: 16,
        }}
      >
        {title}
      </h2>

      {children}
    </section>
  );
}

function List({
  items,
}: {
  items?: string[];
}) {
  if (!items?.length) {
    return (
      <div
        style={{
          opacity: 0.55,
        }}
      >
        No structured signals.
      </div>
    );
  }

  return (
    <ul
      style={{
        margin: 0,
        paddingLeft: 20,
        lineHeight: 1.7,
      }}
    >
      {items.map(
        (item, index) => (
          <li key={`${item}-${index}`}>
            {item}
          </li>
        ),
      )}
    </ul>
  );
}

export default function FounderMarketPage() {
  const [
    sessionDetected,
    setSessionDetected,
  ] = useState(false);

  const [
    symbol,
    setSymbol,
  ] = useState("NVDA");

  const [
    market,
    setMarket,
  ] = useState("us");

  const [
    mode,
    setMode,
  ] = useState("full");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    result,
    setResult,
  ] = useState<MarketResult | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    setSessionDetected(
      Boolean(
        getAccessKey(),
      ),
    );
  }, []);

  async function runAnalysis() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data =
        await requestMarketAnalysis(
          symbol,
          market,
          mode,
        );

      setResult(data);

      if (
        data.code ===
        "FOUNDER_AUTH_REQUIRED"
      ) {
        setError(
          "Founder authentication required.",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Market analysis request failed.",
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
          "#f4f4f5",
        padding:
          "28px 18px 60px",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 920,
          margin:
            "0 auto",
        }}
      >
        <div
          style={{
            marginBottom: 26,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing:
                "0.12em",
              opacity: 0.55,
              marginBottom: 8,
            }}
          >
            PRIVATE FOUNDER ACCESS
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 28,
            }}
          >
            AIOS Market Intelligence
          </h1>

          <p
            style={{
              opacity: 0.68,
              lineHeight: 1.6,
            }}
          >
            C147.1 · US / HK / A-share
            unified market analysis runtime
          </p>
        </div>

        <Section title="Founder Session">
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius:
                  "50%",
                background:
                  sessionDetected
                    ? "#4ade80"
                    : "#f87171",
                display:
                  "inline-block",
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
              opacity: 0.62,
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            当前页面自动读取 Founder Console
            的 sessionStorage，不显示或提交
            Access Key。
          </div>
        </Section>

        <div
          style={{
            height: 16,
          }}
        />

        <Section title="Market Analysis">
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "minmax(0, 1fr) 150px 150px",
              gap: 10,
            }}
          >
            <input
              value={symbol}
              onChange={(event) =>
                setSymbol(
                  event.target.value,
                )
              }
              placeholder="NVDA / 0700.HK / 600519.SH"
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                padding:
                  "12px 13px",
                borderRadius:
                  10,
                border:
                  "1px solid rgba(255,255,255,0.15)",
                background:
                  "rgba(255,255,255,0.06)",
                color:
                  "#fff",
                outline:
                  "none",
              }}
            />

            <select
              value={market}
              onChange={(event) =>
                setMarket(
                  event.target.value,
                )
              }
              style={{
                padding:
                  "12px",
                borderRadius:
                  10,
                border:
                  "1px solid rgba(255,255,255,0.15)",
                background:
                  "#18181b",
                color:
                  "#fff",
              }}
            >
              <option value="us">
                US
              </option>
              <option value="hk">
                HK
              </option>
              <option value="cn">
                A-share
              </option>
            </select>

            <select
              value={mode}
              onChange={(event) =>
                setMode(
                  event.target.value,
                )
              }
              style={{
                padding:
                  "12px",
                borderRadius:
                  10,
                border:
                  "1px solid rgba(255,255,255,0.15)",
                background:
                  "#18181b",
                color:
                  "#fff",
              }}
            >
              <option value="full">
                Full
              </option>
              <option value="research">
                Research
              </option>
              <option value="valuation">
                Valuation
              </option>
              <option value="technical">
                Technical
              </option>
              <option value="screen">
                Screen
              </option>
            </select>
          </div>

          <button
            onClick={runAnalysis}
            disabled={
              loading ||
              !symbol.trim()
            }
            style={{
              marginTop: 14,
              width:
                "100%",
              padding:
                "13px 16px",
              borderRadius:
                10,
              border: "none",
              background:
                loading
                  ? "#3f3f46"
                  : "#fff",
              color:
                loading
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
              ? "Analyzing…"
              : "Run Market Analysis"}
          </button>
        </Section>

        {error && (
          <>
            <div
              style={{
                height: 16,
              }}
            />

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
          </>
        )}

        {result && (
          <>
            <div
              style={{
                height: 16,
              }}
            />

            <Section title="Runtime Result">
              <pre
                style={{
                  overflowX:
                    "auto",
                  whiteSpace:
                    "pre-wrap",
                  wordBreak:
                    "break-word",
                  fontSize: 12,
                  lineHeight:
                    1.5,
                  opacity: 0.85,
                }}
              >
                {JSON.stringify(
                  {
                    success:
                      result.success,
                    verified:
                      result.verified,
                    code:
                      result.code,
                    latencyMs:
                      result.latencyMs,
                  },
                  null,
                  2,
                )}
              </pre>
            </Section>

            {result.instrument && (
              <>
                <div
                  style={{
                    height: 16,
                  }}
                />

                <Section title="Instrument">
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace:
                        "pre-wrap",
                      lineHeight:
                        1.6,
                    }}
                  >
                    {JSON.stringify(
                      result.instrument,
                      null,
                      2,
                    )}
                  </pre>
                </Section>
              </>
            )}

            {result.snapshot && (
              <>
                <div
                  style={{
                    height: 16,
                  }}
                />

                <Section title="Market Snapshot">
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace:
                        "pre-wrap",
                      lineHeight:
                        1.6,
                    }}
                  >
                    {JSON.stringify(
                      result.snapshot,
                      null,
                      2,
                    )}
                  </pre>

                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 10,
                      background:
                        "rgba(255,255,255,0.05)",
                      fontSize: 13,
                      lineHeight: 1.6,
                    }}
                  >
                    Data quality:{" "}
                    <strong>
                      {
                        result
                          .snapshot
                          .dataQuality
                      }
                    </strong>
                    <br />
                    Verified live quote:{" "}
                    <strong>
                      {
                        result
                          .snapshot
                          .liveQuoteAvailable
                          ? "YES"
                          : "NO"
                      }
                    </strong>
                  </div>
                </Section>
              </>
            )}

            {result.analysis && (
              <>
                <div
                  style={{
                    height: 16,
                  }}
                />

                <Section title="Industry">
                  <p>
                    {
                      result
                        .analysis
                        .industry
                        ?.summary
                    }
                  </p>
                  <List
                    items={
                      result
                        .analysis
                        .industry
                        ?.evidence
                    }
                  />
                </Section>

                <div
                  style={{
                    height: 16,
                  }}
                />

                <Section title="Company">
                  <p>
                    {
                      result
                        .analysis
                        .company
                        ?.summary
                    }
                  </p>

                  <h3>
                    Strengths
                  </h3>
                  <List
                    items={
                      result
                        .analysis
                        .company
                        ?.strengths
                    }
                  />

                  <h3>
                    Risks
                  </h3>
                  <List
                    items={
                      result
                        .analysis
                        .company
                        ?.risks
                    }
                  />
                </Section>

                <div
                  style={{
                    height: 16,
                  }}
                />

                <Section title="Fundamentals">
                  <p>
                    {
                      result
                        .analysis
                        .fundamentals
                        ?.assessment
                    }
                  </p>
                  <List
                    items={
                      result
                        .analysis
                        .fundamentals
                        ?.signals
                    }
                  />
                </Section>

                <div
                  style={{
                    height: 16,
                  }}
                />

                <Section title="Valuation">
                  <p>
                    {
                      result
                        .analysis
                        .valuation
                        ?.assessment
                    }
                  </p>
                  <List
                    items={
                      result
                        .analysis
                        .valuation
                        ?.signals
                    }
                  />
                </Section>

                <div
                  style={{
                    height: 16,
                  }}
                />

                <Section title="Trend">
                  <p>
                    {
                      result
                        .analysis
                        .trend
                        ?.assessment
                    }
                  </p>
                  <List
                    items={
                      result
                        .analysis
                        .trend
                        ?.signals
                    }
                  />
                </Section>

                <div
                  style={{
                    height: 16,
                  }}
                />

                <Section title="Risk">
                  <p>
                    Risk level:{" "}
                    <strong>
                      {
                        result
                          .analysis
                          .risk
                          ?.level
                    }
                  </strong>
                  </p>

                  <List
                    items={
                      result
                        .analysis
                        .risk
                        ?.factors
                    }
                  />
                </Section>

                <div
                  style={{
                    height: 16,
                  }}
                />

                <Section title="Decision Support">
                  <p>
                    {
                      result
                        .analysis
                        .decisionSupport
                        ?.currentState
                    }
                  </p>

                  <h3>
                    Supporting Factors
                  </h3>
                  <List
                    items={
                      result
                        .analysis
                        .decisionSupport
                        ?.supportingFactors
                    }
                  />

                  <h3>
                    Watch Metrics
                  </h3>
                  <List
                    items={
                      result
                        .analysis
                        .decisionSupport
                        ?.watchMetrics
                    }
                  />

                  <h3>
                    Invalidation Conditions
                  </h3>
                  <List
                    items={
                      result
                        .analysis
                        .decisionSupport
                        ?.invalidationConditions
                    }
                  />

                  <h3>
                    Scenarios
                  </h3>

                  {result.analysis
                    .decisionSupport
                    ?.scenarios
                    ?.map(
                      (
                        scenario,
                        index,
                      ) => (
                        <div
                          key={
                            `${scenario.name}-${index}`
                          }
                          style={{
                            marginTop:
                              10,
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
                              scenario.name
                            }
                          </strong>

                          <div
                            style={{
                              marginTop:
                                5,
                              opacity:
                                0.75,
                            }}
                          >
                            Condition:{" "}
                            {
                              scenario.condition
                            }
                          </div>

                          <div
                            style={{
                              marginTop:
                                5,
                              opacity:
                                0.75,
                            }}
                          >
                            Implication:{" "}
                            {
                              scenario.implication
                            }
                          </div>
                        </div>
                      ),
                    )}
                </Section>
              </>
            )}

            {result.evidence?.length ? (
              <>
                <div
                  style={{
                    height: 16,
                  }}
                />

                <Section title="Evidence">
                  <div
                    style={{
                      lineHeight:
                        1.6,
                    }}
                  >
                    Sources:{" "}
                    {
                      result
                        .verification
                        ?.sourceCount
                    }
                    <br />
                    Independent domains:{" "}
                    {
                      result
                        .verification
                        ?.independentDomains
                    }
                    <br />
                    Primary source found:{" "}
                    {
                      result
                        .verification
                        ?.primarySourceFound
                        ? "YES"
                        : "NO"
                    }
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                    }}
                  >
                    {result.evidence.map(
                      (
                        item,
                        index,
                      ) => (
                        <div
                          key={
                            `${item.url}-${index}`
                          }
                          style={{
                            padding:
                              "12px 0",
                            borderTop:
                              "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <strong>
                            {
                              item.title
                            }
                          </strong>

                          <div
                            style={{
                              fontSize:
                                12,
                              opacity:
                                0.55,
                              marginTop:
                                4,
                            }}
                          >
                            {
                              item.hostname
                            }
                          </div>

                          <div
                            style={{
                              fontSize:
                                13,
                              opacity:
                                0.72,
                              marginTop:
                                5,
                            }}
                          >
                            {
                              item.snippet
                            }
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </Section>
              </>
            ) : null}

            {result.metadata
              ?.disclaimer && (
              <div
                style={{
                  marginTop: 18,
                  fontSize: 12,
                  opacity: 0.5,
                  lineHeight: 1.6,
                }}
              >
                {
                  result
                    .metadata
                    .disclaimer
                }
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
