"use client";

import Link from "next/link";

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

const STORAGE_KEY =
  "aios-founder-access-key";

function getFounderKey(): string {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  return (
    window.sessionStorage.getItem(
      STORAGE_KEY,
    ) ?? ""
  );
}

export default function MarketDecisionObservationRegressionPage() {
  const [
    sessionReady,
    setSessionReady,
  ] = useState(false);

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

  useEffect(() => {
    setSessionReady(
      Boolean(
        getFounderKey(),
      ),
    );
  }, []);

  async function runRegression() {
    const key =
      getFounderKey();

    if (!key) {
      setSessionReady(false);
      setError(
        "Founder Session is required. Enter the Founder Console first.",
      );
      return;
    }

    setRunning(true);

    setResult(null);

    setError(null);

    try {
      const response =
        await fetch(
          "/api/founder/market/decision-observation-regression",
          {
            method:
              "GET",

            cache:
              "no-store",

            headers: {
              Accept:
                "application/json",

              Authorization:
                `Bearer ${key}`,
            },
          },
        );

      const payload =
        await response.json();

      if (
        response.status ===
          401 ||
        payload?.code ===
          "FOUNDER_AUTH_REQUIRED"
      ) {
        window.sessionStorage.removeItem(
          STORAGE_KEY,
        );

        setSessionReady(false);

        throw new Error(
          "Founder Session expired. Please enter the Founder Console again.",
        );
      }

      if (
        !response.ok
      ) {
        throw new Error(
          payload?.error ??
            payload?.code ??
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
          Market Decision Observation / Mutation
        </h1>

        <div
          style={{
            opacity:
              0.65,

            marginBottom:
              24,
          }}
        >
          C147.11 · Observe → Fingerprint →
          Compare → Explicit Mutation
        </div>

        {!sessionReady && (
          <section
            style={{
              border:
                "1px solid #4a3d20",

              borderRadius:
                12,

              padding:
                20,

              marginBottom:
                20,

              background:
                "#151108",
            }}
          >
            <div
              style={{
                fontWeight:
                  700,

                fontSize:
                  17,

                marginBottom:
                  8,
              }}
            >
              Founder Session Required
            </div>

            <div
              style={{
                fontSize:
                  14,

                opacity:
                  0.7,

                lineHeight:
                  1.6,

                marginBottom:
                  16,
              }}
            >
              C147.11 Regression is protected
              by the existing Founder authentication
              boundary. No Access Key is requested
              or displayed on this page.
            </div>

            <Link
              href="/founder"
              style={{
                display:
                  "block",

                textAlign:
                  "center",

                padding:
                  "13px 16px",

                borderRadius:
                  9,

                background:
                  "#f5f5f5",

                color:
                  "#000",

                textDecoration:
                  "none",

                fontWeight:
                  700,
              }}
            >
              Enter Founder Console
            </Link>
          </section>
        )}

        {sessionReady && (
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
              Status: READY
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
              Existing Founder Console session
              will be used automatically.
            </div>
          </section>
        )}

        <button
          onClick={
            runRegression
          }
          disabled={
            running ||
            !sessionReady
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
              running ||
              !sessionReady
                ? "#222"
                : "#f5f5f5",

            color:
              running ||
              !sessionReady
                ? "#777"
                : "#000",

            cursor:
              running ||
              !sessionReady
                ? "not-allowed"
                : "pointer",

            fontWeight:
              700,
          }}
        >
          {running
            ? "Running C147.11 Regression..."
            : "▶ Run C147.11 Regression"}
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

                lineHeight:
                  1.6,
              }}
            >
              {error}
            </div>

            {!sessionReady && (
              <Link
                href="/founder"
                style={{
                  display:
                    "inline-block",

                  marginTop:
                    14,

                  color:
                    "#fff",

                  textDecoration:
                    "underline",
                }}
              >
                Return to Founder Console
              </Link>
            )}
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
                  "Passed",
                  result.passed,
                ],

                [
                  "Failed",
                  result.failed,
                ],

                [
                  "Runtime",
                  `${result.runtimeMs}ms`,
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
              {result.code}
              {" · "}
              Stage:
              {" "}
              {result.stage}
              {" · "}
              Mode:
              {" "}
              {result.mode}
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
                      {index + 1}.
                      {" "}
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

                            lineHeight:
                              1.5,
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
