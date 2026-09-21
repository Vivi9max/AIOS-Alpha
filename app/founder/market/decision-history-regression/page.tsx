"use client";

import {
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

type RegressionResult = {
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

function getFounderKey(): string {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  return (
    window.sessionStorage.getItem(
      "aios-founder-access-key",
    ) ?? ""
  );
}

export default function MarketDecisionHistoryRegressionPage() {
  const [
    running,
    setRunning,
  ] = useState(false);

  const [
    result,
    setResult,
  ] =
    useState<
      RegressionResult | null
    >(null);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  async function runRegression() {
    setRunning(true);

    setResult(null);

    setError(null);

    try {
      const key =
        getFounderKey();

      const response =
        await fetch(
          "/api/founder/market/decision-history-regression",
          {
            method:
              "GET",

            headers:
              key
                ? {
                    Authorization:
                      `Bearer ${key}`,
                  }
                : {},
          },
        );

      const payload =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          payload?.error ??
            `Regression request failed with HTTP ${response.status}.`,
        );
      }

      setResult(
        payload,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Regression failed.",
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <main
      style={{
        minHeight:
          "100vh",

        background:
          "#050505",

        color:
          "#f5f5f5",

        padding:
          "32px 20px",

        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth:
            900,

          margin:
            "0 auto",
        }}
      >
        <div
          style={{
            fontSize:
              12,

            letterSpacing:
              1.5,

            opacity:
              0.6,
          }}
        >
          PRIVATE FOUNDER ACCESS
        </div>

        <h1
          style={{
            margin:
              "10px 0 6px",

            fontSize:
              28,
          }}
        >
          Market Decision History Regression
        </h1>

        <div
          style={{
            opacity:
              0.65,

            marginBottom:
              24,
          }}
        >
          C147.9 · Decision Record →
          Persistent History →
          Continuity → Reassessment
        </div>

        <section
          style={{
            border:
              "1px solid #252525",

            borderRadius:
              12,

            padding:
              18,

            marginBottom:
              20,
          }}
        >
          <div
            style={{
              fontWeight:
                700,

              marginBottom:
                6,
            }}
          >
            Founder Session
          </div>

          <div
            style={{
              fontSize:
                14,

              opacity:
                0.7,
            }}
          >
            Session:{" "}
            {getFounderKey()
              ? "READY"
              : "MISSING"}
          </div>

          <div
            style={{
              fontSize:
                13,

              opacity:
                0.55,

              marginTop:
                6,
            }}
          >
            Uses the existing Founder
            Console session key.
          </div>
        </section>

        <button
          onClick={
            runRegression
          }
          disabled={
            running
          }
          style={{
            width:
              "100%",

            padding:
              "14px 18px",

            borderRadius:
              10,

            border:
              "1px solid #444",

            background:
              running
                ? "#222"
                : "#f5f5f5",

            color:
              running
                ? "#aaa"
                : "#000",

            cursor:
              running
                ? "wait"
                : "pointer",

            fontWeight:
              700,
          }}
        >
          {running
            ? "Running C147.9 Regression..."
            : "▶ Run C147.9 Regression"}
        </button>

        {error && (
          <section
            style={{
              marginTop:
                20,

              border:
                "1px solid #633",

              borderRadius:
                12,

              padding:
                18,

              background:
                "#160909",
            }}
          >
            <strong>
              Regression Error
            </strong>

            <div
              style={{
                marginTop:
                  8,
              }}
            >
              {error}
            </div>
          </section>
        )}

        {result && (
          <section
            style={{
              marginTop:
                24,
            }}
          >
            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(4, minmax(0, 1fr))",

                gap:
                  10,

                marginBottom:
                  20,
              }}
            >
              {[
                [
                  "Status",
                  result.success
                    ? "PASS"
                    : "PARTIAL",
                ],

                [
                  "Code",
                  result.code,
                ],

                [
                  "Passed",
                  result.passed,
                ],

                [
                  "Failed",
                  result.failed,
                ],
              ].map(
                ([
                  label,
                  value,
                ]) => (
                  <div
                    key={
                      label
                    }
                    style={{
                      border:
                        "1px solid #252525",

                      borderRadius:
                        10,

                      padding:
                        14,
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          11,

                        opacity:
                          0.5,
                      }}
                    >
                      {label}
                    </div>

                    <div
                      style={{
                        marginTop:
                          6,

                        fontWeight:
                          700,

                        wordBreak:
                          "break-word",
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ),
              )}
            </div>

            <div
              style={{
                opacity:
                  0.6,

                fontSize:
                  13,

                marginBottom:
                  18,
              }}
            >
              Stage:{" "}
              {result.stage}
              {" · "}
              Mode:{" "}
              {result.mode}
              {" · "}
              Runtime:{" "}
              {result.runtimeMs}
              ms
            </div>

            {result.cases.map(
              (
                testCase,
                index,
              ) => (
                <article
                  key={
                    testCase.name
                  }
                  style={{
                    border:
                      "1px solid #252525",

                    borderRadius:
                      12,

                    padding:
                      18,

                    marginBottom:
                      14,
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
                    }}
                  >
                    <strong>
                      {index +
                        1}
                      .{" "}
                      {
                        testCase.name
                      }
                    </strong>

                    <span
                      style={{
                        fontWeight:
                          700,
                      }}
                    >
                      {testCase.passed
                        ? "PASS"
                        : "FAIL"}
                    </span>
                  </div>

                  <div
                    style={{
                      opacity:
                        0.55,

                      fontSize:
                        12,

                      margin:
                        "6px 0 14px",
                    }}
                  >
                    {
                      testCase.latencyMs
                    }{" "}
                    ms
                  </div>

                  {testCase.checks.map(
                    (
                      check,
                    ) => (
                      <div
                        key={
                          check.name
                        }
                        style={{
                          borderTop:
                            "1px solid #181818",

                          padding:
                            "9px 0",
                        }}
                      >
                        <div
                          style={{
                            fontSize:
                              13,

                            fontWeight:
                              700,
                          }}
                        >
                          {check.passed
                            ? "✓"
                            : "✗"}{" "}
                          {
                            check.name
                          }
                        </div>

                        <div
                          style={{
                            fontSize:
                              13,

                            opacity:
                              0.65,

                            marginTop:
                              3,
                          }}
                        >
                          {
                            check.detail
                          }
                        </div>
                      </div>
                    ),
                  )}
                </article>
              ),
            )}
          </section>
        )}
      </div>
    </main>
  );
}
