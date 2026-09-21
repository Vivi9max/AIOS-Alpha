"use client";

import {
  useEffect,
  useState,
} from "react";

type Check = {
  name: string;
  passed: boolean;
  detail: string;
};

type RegressionCase = {
  name: string;
  passed: boolean;
  checks: Check[];
  latencyMs: number;
};

type RegressionResponse = {
  success: boolean;
  code: string;
  passed: number;
  failed: number;
  total: number;
  stage: string;
  mode: string;
  runtimeMs: number;
  cases: RegressionCase[];
};

const STORAGE_KEY =
  "aios-founder-access-key";

export default function MarketEvidenceMatrixRegressionPage() {
  const [
    founderReady,
    setFounderReady,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    result,
    setResult,
  ] = useState<RegressionResponse | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    try {
      const key =
        window.sessionStorage.getItem(
          STORAGE_KEY,
        );

      setFounderReady(
        Boolean(key),
      );
    } catch {
      setFounderReady(false);
    }
  }, []);

  async function runRegression() {
    setLoading(true);
    setError("");
    setResult(null);

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

      const response =
        await fetch(
          "/api/founder/market/evidence-matrix-regression",
          {
            method: "POST",
            cache: "no-store",
            headers: {
              Authorization:
                `Bearer ${key}`,

              "x-aios-founder-key":
                key,

              "Content-Type":
                "application/json",
            },
          },
        );

      const data =
        (await response.json()) as
          | RegressionResponse
          | {
              error?: string;
              code?: string;
            };

      if (!response.ok) {
        throw new Error(
          "error" in data
            ? data.error ??
                data.code ??
                `Regression request failed with HTTP ${response.status}.`
            : `Regression request failed with HTTP ${response.status}.`,
        );
      }

      setResult(
        data as RegressionResponse,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Evidence matrix regression failed.",
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
        padding:
          "24px 16px 60px",
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
            margin:
              "8px 0 6px",
            fontSize: 28,
          }}
        >
          Market Evidence Matrix Regression
        </h1>

        <p
          style={{
            marginTop: 0,
            opacity: 0.65,
            lineHeight: 1.6,
          }}
        >
          C147.6.1 · Normalized Market Data →
          Evidence Provenance → Identity Guard →
          Conflict Visibility → Human Review
        </p>

        <section
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 14,
            border:
              "1px solid rgba(255,255,255,0.10)",
            background:
              "rgba(255,255,255,0.035)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            <strong>
              Founder Session
            </strong>

            <br />

            Session:{" "}
            <span
              style={{
                color:
                  founderReady
                    ? "#86efac"
                    : "#fca5a5",
                fontWeight: 700,
              }}
            >
              {founderReady
                ? "READY"
                : "NOT DETECTED"}
            </span>

            <br />

            Authentication uses the existing
            Founder Console session key.
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
              marginTop: 16,
              width: "100%",
              padding:
                "14px 16px",
              borderRadius: 10,
              border: "none",
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
              fontWeight: 700,
              cursor:
                loading
                  ? "wait"
                  : "pointer",
            }}
          >
            {loading
              ? "Running Regression…"
              : "▶ Run C147.6.1 Regression"}
          </button>
        </section>

        {error && (
          <section
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 12,
              border:
                "1px solid #5b2525",
              background:
                "#180909",
              color:
                "#ffb4b4",
              lineHeight: 1.6,
            }}
          >
            <strong>
              Regression Error
            </strong>

            <div
              style={{
                marginTop: 6,
              }}
            >
              {error}
            </div>
          </section>
        )}

        {result && (
          <>
            <section
              style={{
                marginTop: 16,
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(130px,1fr))",
                gap: 10,
              }}
            >
              <Metric
                label="Status"
                value={
                  result.success
                    ? "PASS"
                    : "FAIL"
                }
              />

              <Metric
                label="Code"
                value={
                  result.code
                }
              />

              <Metric
                label="Passed"
                value={
                  result.passed
                }
              />

              <Metric
                label="Failed"
                value={
                  result.failed
                }
              />

              <Metric
                label="Total"
                value={
                  result.total
                }
              />

              <Metric
                label="Runtime"
                value={`${result.runtimeMs} ms`}
              />
            </section>

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
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.55,
                }}
              >
                Verification
              </div>

              <div
                style={{
                  marginTop: 8,
                  lineHeight: 1.8,
                  fontSize: 13,
                }}
              >
                Stage:{" "}
                <strong>
                  {result.stage}
                </strong>

                <br />

                Mode:{" "}
                <strong>
                  {result.mode}
                </strong>

                <br />

                Principle: metric values remain
                sourced from the existing normalized
                market snapshot. Evidence observations
                provide provenance only.
              </div>
            </section>

            <div
              style={{
                display:
                  "grid",
                gap: 14,
                marginTop: 16,
              }}
            >
              {result.cases.map(
                (testCase, index) => (
                  <section
                    key={
                      testCase.name
                    }
                    style={{
                      padding: 16,
                      borderRadius: 14,
                      border:
                        "1px solid rgba(255,255,255,0.10)",
                      background:
                        "rgba(255,255,255,0.035)",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap: 10,
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <strong>
                        {index + 1}.{" "}
                        {
                          testCase.name
                        }
                      </strong>

                      <strong
                        style={{
                          color:
                            testCase.passed
                              ? "#86efac"
                              : "#fca5a5",
                        }}
                      >
                        {testCase.passed
                          ? "PASS"
                          : "FAIL"}
                      </strong>
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        opacity: 0.5,
                      }}
                    >
                      {testCase.latencyMs} ms
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        display:
                          "grid",
                        gap: 8,
                      }}
                    >
                      {testCase.checks.map(
                        (check) => (
                          <div
                            key={
                              check.name
                            }
                            style={{
                              padding:
                                "10px 12px",
                              borderRadius: 9,
                              background:
                                "rgba(255,255,255,0.035)",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              <span
                                style={{
                                  color:
                                    check.passed
                                      ? "#86efac"
                                      : "#fca5a5",
                                }}
                              >
                                {check.passed
                                  ? "✓"
                                  : "✕"}
                              </span>

                              {" "}

                              {
                                check.name
                              }
                            </div>

                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 12,
                                lineHeight: 1.5,
                                opacity: 0.65,
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
                  </section>
                ),
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number;
}) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 10,
        border:
          "1px solid rgba(255,255,255,0.08)",
        background:
          "rgba(255,255,255,0.035)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          opacity: 0.5,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 5,
          fontSize: 13,
          fontWeight: 700,
          wordBreak:
            "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}
