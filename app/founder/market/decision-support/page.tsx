"use client";

import {
  useState,
} from "react";

type SupportItem = {
  symbol: string;
  market: string;
  state: string;
  currentState: string;
  supportingFactors: string[];
  invalidationConditions: string[];
  watchMetrics: string[];
  scenarios: Array<{
    name: string;
    condition: string;
    implication: string;
  }>;
  industry: string | null;
  company: string | null;
  fundamentals: {
    assessment: string | null;
    revenueGrowth: number | null;
    eps: number | null;
  };
  valuation: {
    assessment: string | null;
    pe: number | null;
    pb: number | null;
  };
  risk: {
    level: string;
    factors: string[];
  };
  evidence: {
    sourceCount: number;
    independentDomains: number;
    verified: boolean;
  };
  freshness: {
    freshness: string;
    asOf: string | null;
  };
  dataQuality: string;
  humanReviewRequired: boolean;
};

type SupportResult = {
  success: boolean;
  code: string;
  universeSize: number;
  evaluatedCount: number;
  researchCandidateCount: number;
  excludedCount: number;
  insufficientDataCount: number;
  items: SupportItem[];
  principles: string[];
  humanDecisionRequired: boolean;
  runtime: {
    latencyMs: number;
  };
};

const DEFAULT_UNIVERSE = [
  {
    symbol: "NVDA",
    market: "us",
  },
  {
    symbol: "AAPL",
    market: "us",
  },
  {
    symbol: "MSFT",
    market: "us",
  },
  {
    symbol: "0700.HK",
    market: "hk",
  },
  {
    symbol: "9988.HK",
    market: "hk",
  },
  {
    symbol: "600519.SH",
    market: "cn",
  },
  {
    symbol: "000858.SZ",
    market: "cn",
  },
];

export default function MarketDecisionSupportPage() {
  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    result,
    setResult,
  ] = useState<SupportResult | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState("");

  async function run() {
    setLoading(true);
    setError("");

    try {
      const key =
        sessionStorage.getItem(
          "aios-founder-access-key",
        );

      const response =
        await fetch(
          "/api/founder/market/decision-support",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              ...(key
                ? {
                    Authorization:
                      `Bearer ${key}`,

                    "x-aios-founder-key":
                      key,
                  }
                : {}),
            },

            body:
              JSON.stringify({
                universe:
                  DEFAULT_UNIVERSE,

                includeExcluded:
                  true,

                includeInsufficientData:
                  true,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ??
            "Decision support request failed.",
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Request failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "#050505",
        color: "#f5f5f5",
        padding:
          "24px 16px 64px",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            fontSize: 12,
            letterSpacing:
              "0.14em",
            opacity: 0.65,
            marginBottom: 8,
          }}
        >
          PRIVATE FOUNDER ACCESS
        </div>

        <h1
          style={{
            margin:
              "0 0 8px",
            fontSize:
              "clamp(24px, 5vw, 36px)",
          }}
        >
          Market Decision Support
        </h1>

        <p
          style={{
            margin:
              "0 0 20px",
            opacity: 0.72,
            lineHeight: 1.6,
          }}
        >
          C147.5 · Current State → Supporting
          Factors → Invalidation → Watch Metrics
          → Scenarios → Human Review
        </p>

        <div
          style={{
            padding: 16,
            border:
              "1px solid #262626",
            borderRadius: 14,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            Founder Session
          </div>

          <div
            style={{
              opacity: 0.7,
              fontSize: 14,
            }}
          >
            Session: PASS
          </div>

          <div
            style={{
              opacity: 0.55,
              fontSize: 13,
              marginTop: 4,
            }}
          >
            Current Founder Console session
            will be reused.
          </div>

          <button
            onClick={run}
            disabled={loading}
            style={{
              marginTop: 16,
              padding:
                "11px 16px",
              borderRadius: 10,
              border:
                "1px solid #444",
              background:
                loading
                  ? "#161616"
                  : "#f5f5f5",
              color:
                loading
                  ? "#777"
                  : "#050505",
              cursor:
                loading
                  ? "wait"
                  : "pointer",
              fontWeight: 700,
            }}
          >
            {loading
              ? "Running..."
              : "▶ Run C147.5 Decision Support"}
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              border:
                "1px solid #5b2525",
              background:
                "#180909",
              color:
                "#ffb4b4",
              marginBottom: 20,
            }}
          >
            {error}
          </div>
        )}

        {result && (
          <>
            <section
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(130px,1fr))",
                gap: 10,
                marginBottom: 20,
              }}
            >
              {[
                [
                  "Status",
                  result.code,
                ],
                [
                  "Universe",
                  result.universeSize,
                ],
                [
                  "Evaluated",
                  result.evaluatedCount,
                ],
                [
                  "Research",
                  result.researchCandidateCount,
                ],
                [
                  "Excluded",
                  result.excludedCount,
                ],
                [
                  "Insufficient",
                  result.insufficientDataCount,
                ],
                [
                  "Runtime",
                  `${result.runtime.latencyMs} ms`,
                ],
              ].map(
                ([label, value]) => (
                  <div
                    key={String(label)}
                    style={{
                      padding: 14,
                      border:
                        "1px solid #262626",
                      borderRadius: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        opacity: 0.55,
                        marginBottom: 5,
                      }}
                    >
                      {label}
                    </div>

                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        wordBreak:
                          "break-word",
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ),
              )}
            </section>

            <div
              style={{
                display:
                  "grid",
                gap: 16,
              }}
            >
              {result.items.map(
                (item) => (
                  <article
                    key={`${item.market}:${item.symbol}`}
                    style={{
                      border:
                        "1px solid #292929",
                      borderRadius: 14,
                      padding: 18,
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
                        <h2
                          style={{
                            margin:
                              "0 0 5px",
                            fontSize: 20,
                          }}
                        >
                          {item.symbol}
                          {" · "}
                          {item.market}
                        </h2>

                        <div
                          style={{
                            fontSize: 13,
                            opacity: 0.65,
                          }}
                        >
                          State:{" "}
                          {item.state}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          padding:
                            "6px 9px",
                          border:
                            "1px solid #383838",
                          borderRadius: 8,
                        }}
                      >
                        Human Review: YES
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 18,
                      }}
                    >
                      <strong>
                        Current State
                      </strong>

                      <p
                        style={{
                          lineHeight: 1.65,
                          opacity: 0.82,
                        }}
                      >
                        {item.currentState}
                      </p>
                    </div>

                    <div
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit,minmax(240px,1fr))",
                        gap: 14,
                      }}
                    >
                      <InfoBlock
                        title="Supporting Factors"
                        items={
                          item.supportingFactors
                        }
                      />

                      <InfoBlock
                        title="Invalidation Conditions"
                        items={
                          item.invalidationConditions
                        }
                      />

                      <InfoBlock
                        title="Watch Metrics"
                        items={
                          item.watchMetrics
                        }
                      />
                    </div>

                    <div
                      style={{
                        marginTop: 18,
                      }}
                    >
                      <strong>
                        Scenarios
                      </strong>

                      <div
                        style={{
                          display:
                            "grid",
                          gap: 10,
                          marginTop: 10,
                        }}
                      >
                        {item.scenarios.map(
                          (
                            scenario,
                          ) => (
                            <div
                              key={
                                scenario.name
                              }
                              style={{
                                padding: 12,
                                border:
                                  "1px solid #242424",
                                borderRadius: 10,
                              }}
                            >
                              <strong>
                                {
                                  scenario.name
                                }
                              </strong>

                              <div
                                style={{
                                  marginTop: 5,
                                  fontSize: 13,
                                  opacity: 0.7,
                                }}
                              >
                                Condition:{" "}
                                {
                                  scenario.condition
                                }
                              </div>

                              <div
                                style={{
                                  marginTop: 5,
                                  fontSize: 13,
                                  opacity: 0.85,
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
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 18,
                        display:
                          "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit,minmax(160px,1fr))",
                        gap: 10,
                      }}
                    >
                      <Metric
                        label="P/E"
                        value={
                          item.valuation.pe
                        }
                      />

                      <Metric
                        label="P/B"
                        value={
                          item.valuation.pb
                        }
                      />

                      <Metric
                        label="EPS"
                        value={
                          item.fundamentals.eps
                        }
                      />

                      <Metric
                        label="Revenue Growth"
                        value={
                          item.fundamentals
                            .revenueGrowth
                        }
                      />

                      <Metric
                        label="Risk"
                        value={
                          item.risk.level
                        }
                      />

                      <Metric
                        label="Data Quality"
                        value={
                          item.dataQuality
                        }
                      />

                      <Metric
                        label="Evidence"
                        value={`${item.evidence.sourceCount} / ${item.evidence.independentDomains}`}
                      />

                      <Metric
                        label="Freshness"
                        value={
                          item.freshness
                            .freshness
                        }
                      />
                    </div>
                  </article>
                ),
              )}
            </div>

            <section
              style={{
                marginTop: 20,
                padding: 16,
                border:
                  "1px solid #262626",
                borderRadius: 12,
              }}
            >
              <strong>
                Decision Support Principle
              </strong>

              <ul
                style={{
                  lineHeight: 1.7,
                  opacity: 0.78,
                }}
              >
                {result.principles.map(
                  (principle) => (
                    <li
                      key={
                        principle
                      }
                    >
                      {principle}
                    </li>
                  ),
                )}
              </ul>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function InfoBlock({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div>
      <strong>
        {title}
      </strong>

      {items.length === 0 ? (
        <div
          style={{
            marginTop: 8,
            opacity: 0.45,
            fontSize: 13,
          }}
        >
          No explicit items returned.
        </div>
      ) : (
        <ul
          style={{
            paddingLeft: 18,
            lineHeight: 1.6,
            opacity: 0.78,
            fontSize: 13,
          }}
        >
          {items.map(
            (item) => (
              <li key={item}>
                {item}
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number
    | null;
}) {
  return (
    <div
      style={{
        padding: 10,
        border:
          "1px solid #242424",
        borderRadius: 9,
      }}
    >
      <div
        style={{
          fontSize: 10,
          opacity: 0.5,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 4,
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {value === null ||
        value === undefined
          ? "—"
          : String(value)}
      </div>
    </div>
  );
}
