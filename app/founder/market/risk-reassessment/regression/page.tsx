"use client";

import {
  useState,
} from "react";

type RegressionResult = {
  success?: boolean;
  verified?: boolean;
  code?: string;
  stage?: string;
  passed?: number;
  failed?: number;
  checks?: Array<{
    name: string;
    passed: boolean;
    detail: string;
  }>;
  safety?: {
    humanReviewRequired: boolean;
    mutationPerformed: boolean;
    plannerDispatched: boolean;
    tradingExecuted: boolean;
  };
  runtime?: {
    name: string;
    version: string;
    generatedAt: string;
    latencyMs: number;
  };
  principles?: string[];
  disclaimer?: string;
};

export default function MarketRiskReassessmentRegressionPage() {
  const [
    running,
    setRunning,
  ] = useState(false);

  const [
    result,
    setResult,
  ] = useState<RegressionResult | null>(
    null,
  );

  async function runRegression() {
    setRunning(true);

    try {
      const key =
        window.sessionStorage.getItem(
          "aios-founder-access-key",
        );

      const response =
        await fetch(
          "/api/founder/market/risk-reassessment/regression",
          {
            method: "GET",
            headers: {
              ...(key
                ? {
                    Authorization:
                      `Bearer ${key}`,
                    "x-aios-founder-key":
                      key,
                  }
                : {}),
            },
            cache: "no-store",
          },
        );

      const data =
        await response.json();

      setResult(
        data,
      );
    } catch (error) {
      setResult({
        success: false,
        verified: false,
        code:
          "C147_18_RISK_REASSESSMENT_BRIDGE_REGRESSION_PARTIAL",
        stage:
          "C147.18",
        passed: 0,
        failed: 1,
        checks: [
          {
            name:
              "REGRESSION_REQUEST",
            passed: false,
            detail:
              error instanceof Error
                ? error.message
                : "Regression request failed.",
          },
        ],
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "#05070b",
        color:
          "#f5f7fa",
        padding:
          "32px 18px 60px",
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
              1.4,
            color:
              "#8b95a7",
            marginBottom:
              8,
          }}
        >
          PRIVATE FOUNDER ACCESS
        </div>

        <h1
          style={{
            fontSize:
              30,
            lineHeight:
              1.15,
            margin:
              "0 0 10px",
          }}
        >
          Market Risk → Decision
          Reassessment Bridge
        </h1>

        <div
          style={{
            color:
              "#9da7b8",
            marginBottom:
              24,
          }}
        >
          C147.18 · Risk Control ·
          Reassessment · Human Review
        </div>

        <button
          onClick={
            runRegression
          }
          disabled={
            running
          }
          style={{
            border:
              "1px solid #394355",
            borderRadius:
              10,
            background:
              "#111722",
            color:
              "#ffffff",
            padding:
              "12px 18px",
            fontSize:
              15,
            cursor:
              running
                ? "wait"
                : "pointer",
          }}
        >
          {running
            ? "Running C147.18 Regression..."
            : "▶ Run C147.18 Regression"}
        </button>

        {result && (
          <div
            style={{
              marginTop:
                28,
            }}
          >
            <section
              style={{
                border:
                  "1px solid #283142",
                borderRadius:
                  14,
                padding:
                  18,
                background:
                  "#0b0f16",
              }}
            >
              <div
                style={{
                  fontSize:
                    13,
                  color:
                    "#8b95a7",
                }}
              >
                Regression Summary
              </div>

              <div
                style={{
                  fontSize:
                    24,
                  fontWeight:
                    700,
                  margin:
                    "6px 0",
                }}
              >
                {result.verified
                  ? "PASS"
                  : "PARTIAL / FAILED"}
              </div>

              <div>
                Code:{" "}
                {result.code ??
                  "—"}
              </div>

              <div>
                Stage:{" "}
                {result.stage ??
                  "C147.18"}
              </div>

              <div>
                Passed:{" "}
                {result.passed ??
                  0}{" "}
                · Failed:{" "}
                {result.failed ??
                  0}
              </div>
            </section>

            <section
              style={{
                marginTop:
                  18,
              }}
            >
              <h2>
                Checks
              </h2>

              {result.checks?.map(
                (
                  item,
                ) => (
                  <div
                    key={
                      item.name
                    }
                    style={{
                      border:
                        "1px solid #283142",
                      borderRadius:
                        10,
                      padding:
                        14,
                      marginBottom:
                        10,
                      background:
                        "#0b0f16",
                    }}
                  >
                    <div
                      style={{
                        fontWeight:
                          700,
                      }}
                    >
                      {item.passed
                        ? "PASS"
                        : "FAIL"}{" "}
                      ·{" "}
                      {item.name}
                    </div>

                    <div
                      style={{
                        marginTop:
                          5,
                        color:
                          "#9da7b8",
                      }}
                    >
                      {
                        item.detail
                      }
                    </div>
                  </div>
                ),
              )}
            </section>

            {result.safety && (
              <section
                style={{
                  marginTop:
                    18,
                  border:
                    "1px solid #283142",
                  borderRadius:
                    14,
                  padding:
                    18,
                  background:
                    "#0b0f16",
                }}
              >
                <h2>
                  Safety Boundary
                </h2>

                <div>
                  Human review required:{" "}
                  {result.safety
                    .humanReviewRequired
                    ? "YES"
                    : "NO"}
                </div>

                <div>
                  Mutation performed:{" "}
                  {result.safety
                    .mutationPerformed
                    ? "YES"
                    : "NO"}
                </div>

                <div>
                  Planner dispatched:{" "}
                  {result.safety
                    .plannerDispatched
                    ? "YES"
                    : "NO"}
                </div>

                <div>
                  Trading executed:{" "}
                  {result.safety
                    .tradingExecuted
                    ? "YES"
                    : "NO"}
                </div>
              </section>
            )}

            {result.runtime && (
              <section
                style={{
                  marginTop:
                    18,
                  border:
                    "1px solid #283142",
                  borderRadius:
                    14,
                  padding:
                    18,
                  background:
                    "#0b0f16",
                }}
              >
                <h2>
                  Runtime
                </h2>

                <div>
                  Name:{" "}
                  {
                    result.runtime
                      .name
                  }
                </div>

                <div>
                  Version:{" "}
                  {
                    result.runtime
                      .version
                  }
                </div>

                <div>
                  Generated:{" "}
                  {
                    result.runtime
                      .generatedAt
                  }
                </div>

                <div>
                  Latency:{" "}
                  {
                    result.runtime
                      .latencyMs
                  }{" "}
                  ms
                </div>
              </section>
            )}

            {result.principles &&
              result.principles.length >
                0 && (
                <section
                  style={{
                    marginTop:
                      18,
                    border:
                      "1px solid #283142",
                    borderRadius:
                      14,
                    padding:
                      18,
                    background:
                      "#0b0f16",
                  }}
                >
                  <h2>
                    Principles
                  </h2>

                  <ul>
                    {result.principles.map(
                      (
                        item,
                        index,
                      ) => (
                        <li
                          key={
                            index
                          }
                          style={{
                            marginBottom:
                              8,
                          }}
                        >
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                </section>
              )}

            {result.disclaimer && (
              <div
                style={{
                  marginTop:
                    18,
                  color:
                    "#8b95a7",
                  fontSize:
                    13,
                  lineHeight:
                    1.6,
                }}
              >
                {
                  result.disclaimer
                }
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
