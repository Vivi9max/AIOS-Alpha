"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "aios-founder-access-key";

type Stage = {
  stage: string;
  passed: boolean;
  status: string;
  reasons: string[];
  missing: string[];
};

type FrameworkItem = {
  symbol: string;
  market: string;
  decision: string;

  stages: Stage[];

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
  };

  risk: {
    level: string;
    passed: boolean;
    factors: string[];
  };

  evidence: {
    sourceCount: number;
    independentDomains: number;
    verified: boolean;
    passed: boolean;
  };

  freshness: {
    freshness: string;
    ageMinutes: number | null;
    asOf: string | null;
  };

  /*
   * C147.4.1.1
   * Keep the UI contract aligned with
   * MarketSelectionFrameworkItem.
   */
  analysis: {
    snapshot?: {
      dataQuality?: string | null;
    } | null;
  } | null;

  humanReviewRequired: boolean;
};

type FrameworkResponse = {
  success: boolean;
  code: string;
  universeSize: number;
  evaluatedCount: number;
  researchCandidateCount: number;
  excludedCount: number;
  insufficientDataCount: number;
  items: FrameworkItem[];
  principle: string;
  humanDecisionRequired: boolean;
  runtime: {
    version: string;
    latencyMs: number;
  };
  disclaimer: string;
  error?: string;
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
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.035)",
      }}
    >
      <h2
        style={{
          margin: "0 0 12px",
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
        color: passed ? "#86efac" : "#fca5a5",
      }}
    >
      {passed ? "PASS" : "FAIL"}
    </strong>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 10,
        background: "rgba(255,255,255,0.045)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          opacity: 0.55,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 4,
          fontWeight: 700,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function MarketFrameworkPage() {
  const [founderReady, setFounderReady] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [response, setResponse] =
    useState<FrameworkResponse | null>(null);

  const [error, setError] = useState("");

  useEffect(() => {
    const key =
      window.sessionStorage.getItem(
        STORAGE_KEY,
      );

    setFounderReady(Boolean(key));
  }, []);

  async function runFramework() {
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

      const result = await fetch(
        "/api/founder/market/framework",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${key}`,
            "x-aios-founder-key": key,
          },
        },
      );

      const data =
        (await result.json()) as FrameworkResponse;

      if (!result.ok && !data.code) {
        throw new Error(
          `Framework request failed with HTTP ${result.status}.`,
        );
      }

      setResponse(data);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Market selection framework failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#09090b",
        color: "#fff",
        padding: "24px 16px 60px",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            opacity: 0.55,
            fontSize: 12,
            letterSpacing: 1,
          }}
        >
          PRIVATE FOUNDER ACCESS
        </div>

        <h1
          style={{
            margin: "8px 0 4px",
            fontSize: 28,
          }}
        >
          Market Selection Framework
        </h1>

        <p
          style={{
            marginTop: 0,
            opacity: 0.65,
            lineHeight: 1.6,
          }}
        >
          C147.4 · Industry → Company →
          Fundamentals → Valuation → Risk →
          Evidence → Human Review
        </p>

        <Section title="Founder Session">
          <div
            style={{
              lineHeight: 1.8,
            }}
          >
            Session:{" "}
            <strong
              style={{
                color: founderReady
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

          <button
            onClick={runFramework}
            disabled={
              loading || !founderReady
            }
            style={{
              marginTop: 14,
              width: "100%",
              padding: "14px 16px",
              borderRadius: 10,
              border: "none",
              background:
                loading || !founderReady
                  ? "#3f3f46"
                  : "#fff",
              color:
                loading || !founderReady
                  ? "#aaa"
                  : "#09090b",
              fontWeight: 700,
              cursor: loading
                ? "wait"
                : "pointer",
            }}
          >
            {loading
              ? "Running Framework…"
              : "▶ Run C147.4 Framework"}
          </button>
        </Section>

        <Section title="Research Pipeline">
          <div
            style={{
              display: "grid",
              gap: 8,
            }}
          >
            {[
              "1. Industry",
              "2. Company",
              "3. Fundamentals",
              "4. Valuation",
              "5. Risk",
              "6. Evidence",
              "7. Human Review",
            ].map((item) => (
              <div
                key={item}
                style={{
                  padding: 11,
                  borderRadius: 9,
                  background:
                    "rgba(255,255,255,0.04)",
                  fontSize: 13,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </Section>

        {error && (
          <Section title="Error">
            <div
              style={{
                color: "#fca5a5",
                lineHeight: 1.6,
              }}
            >
              {error}
            </div>
          </Section>
        )}

        {response && (
          <>
            <Section title="Framework Summary">
              <div
                style={{
                  fontSize: 20,
                  lineHeight: 1.8,
                }}
              >
                <Status
                  passed={response.success}
                />

                {" · "}

                {response.code}
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                <Metric
                  label="Universe"
                  value={
                    response.universeSize
                  }
                />

                <Metric
                  label="Evaluated"
                  value={
                    response.evaluatedCount
                  }
                />

                <Metric
                  label="Research Candidates"
                  value={
                    response.researchCandidateCount
                  }
                />

                <Metric
                  label="Excluded"
                  value={
                    response.excludedCount
                  }
                />

                <Metric
                  label="Insufficient Data"
                  value={
                    response.insufficientDataCount
                  }
                />

                <Metric
                  label="Runtime"
                  value={`${response.runtime.latencyMs} ms`}
                />
              </div>
            </Section>

            {response.items.map(
              (item) => (
                <Section
                  key={`${item.market}:${item.symbol}`}
                  title={`${item.symbol} · ${item.market}`}
                >
                  <div
                    style={{
                      fontSize: 18,
                      marginBottom: 14,
                    }}
                  >
                    Decision:{" "}
                    <strong
                      style={{
                        color:
                          item.decision ===
                          "research-candidate"
                            ? "#86efac"
                            : item.decision ===
                                "excluded"
                              ? "#fca5a5"
                              : "#facc15",
                      }}
                    >
                      {item.decision}
                    </strong>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(2, minmax(0, 1fr))",
                      gap: 10,
                    }}
                  >
                    <Metric
                      label="P/E"
                      value={
                        item.valuation.pe ??
                        "—"
                      }
                    />

                    <Metric
                      label="P/B"
                      value={
                        item.valuation.pb ??
                        "—"
                      }
                    />

                    <Metric
                      label="EPS"
                      value={
                        item.fundamentals.eps ??
                        "—"
                      }
                    />

                    <Metric
                      label="Revenue Growth"
                      value={
                        item.fundamentals
                          .revenueGrowth !==
                        null
                          ? `${item.fundamentals.revenueGrowth}%`
                          : "—"
                      }
                    />

                    <Metric
                      label="Risk"
                      value={
                        item.risk.level
                      }
                    />

                    <Metric
                      label="Evidence"
                      value={`${item.evidence.sourceCount} / ${item.evidence.independentDomains}`}
                    />

                    <Metric
                      label="Data Quality"
                      value={
                        item.analysis?.snapshot
                          ?.dataQuality ??
                        "insufficient"
                      }
                    />

                    <Metric
                      label="Freshness"
                      value={
                        item.freshness
                          .freshness
                      }
                    />
                  </div>

                  <div
                    style={{
                      marginTop: 16,
                    }}
                  >
                    {item.stages.map(
                      (stage) => (
                        <div
                          key={stage.stage}
                          style={{
                            padding:
                              "9px 0",
                            borderTop:
                              "1px solid rgba(255,255,255,0.06)",
                            fontSize: 13,
                          }}
                        >
                          <Status
                            passed={
                              stage.passed
                            }
                          />

                          {"  "}

                          <strong>
                            {stage.stage}
                          </strong>

                          {" · "}

                          {stage.status}

                          {stage.reasons
                            .length > 0 && (
                            <div
                              style={{
                                marginTop: 3,
                                opacity: 0.65,
                                lineHeight: 1.5,
                              }}
                            >
                              {stage.reasons.join(
                                " ",
                              )}
                            </div>
                          )}

                          {stage.missing
                            .length > 0 && (
                            <div
                              style={{
                                marginTop: 3,
                                color:
                                  "#facc15",
                              }}
                            >
                              Missing:{" "}
                              {stage.missing.join(
                                ", ",
                              )}
                            </div>
                          )}
                        </div>
                      ),
                    )}
                  </div>

                  {item.risk.factors
                    .length > 0 && (
                    <div
                      style={{
                        marginTop: 14,
                        opacity: 0.7,
                        fontSize: 12,
                        lineHeight: 1.6,
                      }}
                    >
                      Risk factors:
                      <br />
                      {item.risk.factors.join(
                        " · ",
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 14,
                      padding: 12,
                      borderRadius: 10,
                      background:
                        "rgba(250,204,21,0.06)",
                      fontSize: 12,
                      lineHeight: 1.6,
                    }}
                  >
                    Human Review Required:{" "}
                    <strong>
                      {item.humanReviewRequired
                        ? "YES"
                        : "NO"}
                    </strong>
                  </div>
                </Section>
              ),
            )}

            <Section title="Framework Principle">
              <div
                style={{
                  opacity: 0.7,
                  lineHeight: 1.7,
                  fontSize: 12,
                }}
              >
                {response.principle}

                <br />
                <br />

                {response.disclaimer}
              </div>
            </Section>
          </>
        )}
      </div>
    </main>
  );
}
