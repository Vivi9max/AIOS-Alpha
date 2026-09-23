"use client";

import {
  useState,
} from "react";

type RegressionCheck = {
  name: string;
  passed: boolean;
  detail: string;
};

type RegressionResult = {
  success?: boolean;
  verified?: boolean;
  code?: string;
  stage?: string;
  passed?: number;
  failed?: number;
  checks?: RegressionCheck[];
  liveBridge?: {
    symbol?: string;
    market?: string;
    action?: string;
    reassessmentRequired?: boolean;
    reassessment?: {
      changeType?: string;
      severity?: string;
      previousRecordId?: string;
      currentRecordId?: string;
      triggeredInvalidationConditions?: string[];
      humanDecisionRequired?: boolean;
    } | null;
    decisionInvalidationConditions?: string[];
    reviewChecklist?: string[];
  };
  safety?: {
    humanReviewRequired: boolean;
    mutationPerformed: boolean;
    plannerDispatched: boolean;
    tradingExecuted: boolean;
  };
  runtime?: {
    name: string;
    version: string;
    upstream?: string;
    generatedAt: string;
    latencyMs: number;
  };
  principles?: string[];
  disclaimer?: string;
};

function getFounderHeaders(): HeadersInit {
  const key =
    window.sessionStorage.getItem(
      "aios-founder-access-key",
    );

  if (!key) {
    return {};
  }

  return {
    Authorization:
      `Bearer ${key}`,
    "x-aios-founder-key":
      key,
  };
}

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
    setResult(null);

    try {
      const response =
        await fetch(
          "/api/founder/market/risk-reassessment/live-regression",
          {
            method: "GET",
            headers:
              getFounderHeaders(),
            cache:
              "no-store",
          },
        );

      const data =
        await response.json();

      setResult(
        data,
      );
    } catch (error) {
      setResult({
        success:
          false,
        verified:
          false,
        code:
          "C147_18_1_RISK_REASSESSMENT_BRIDGE_REGRESSION_PARTIAL",
        stage:
          "C147.18.1",
        passed:
          0,
        failed:
          1,
        checks: [
          {
            name:
              "REGRESSION_REQUEST",
            passed:
              false,
            detail:
              error instanceof Error
                ? error.message
                : "Live regression request failed.",
          },
        ],
        safety: {
          humanReviewRequired:
            true,
          mutationPerformed:
            false,
          plannerDispatched:
            false,
          tradingExecuted:
            false,
        },
      });
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
          Market Risk → Decision Reassessment Bridge
        </h1>

        <div
          style={{
            color:
              "#9da7b8",
            marginBottom:
              24,
          }}
        >
          C147.18.1 · Risk Control · Real C147.8 Reassessment · Human Review
        </div>

        <div
          style={{
            border:
              "1px solid #283142",
            borderRadius:
              12,
            padding:
              14,
            marginBottom:
              18,
            background:
              "#0b0f16",
            color:
              "#9da7b8",
            fontSize:
              13,
            lineHeight:
              1.6,
          }}
        >
          Founder Session 会自动提供认证信息。
          本回归直接调用 C147.18.1 Live Regression API，
          并使用真实 C147.8 previous/current decision record
          reassessment path。
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
              running
                ? "#0b0f16"
                : "#111722",
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
            ? "Running C147.18.1 Live Regression..."
            : "▶ Run C147.18.1 Live Regression"}
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
                  "C147.18.1"}
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

            {result.checks &&
              result.checks.length >
                0 && (
                <section
                  style={{
                    marginTop:
                      18,
                  }}
                >
                  <h2>
                    Checks
                  </h2>

                  {result.checks.map(
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
              )}

            {result.liveBridge && (
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
                  Live Bridge
                </h2>

                <div>
                  Symbol:{" "}
                  {
                    result.liveBridge
                      .symbol ??
                    "—"
                  }
                </div>

                <div>
                  Market:{" "}
                  {
                    result.liveBridge
                      .market ??
                    "—"
                  }
                </div>

                <div>
                  Action:{" "}
                  {
                    result.liveBridge
                      .action ??
                    "—"
                  }
                </div>

                <div>
                  Reassessment required:{" "}
                  {result.liveBridge
                    .reassessmentRequired
                    ? "YES"
                    : "NO"}
                </div>

                {result.liveBridge
                  .reassessment && (
                  <>
                    <div
                      style={{
                        marginTop:
                          10,
                      }}
                    >
                      Change type:{" "}
                      {
                        result.liveBridge
                          .reassessment
                          .changeType ??
                        "—"
                      }
                    </div>

                    <div>
                      Severity:{" "}
                      {
                        result.liveBridge
                          .reassessment
                          .severity ??
                        "—"
                      }
                    </div>

                    <div>
                      Previous record:{" "}
                      {
                        result.liveBridge
                          .reassessment
                          .previousRecordId ??
                        "—"
                      }
                    </div>

                    <div>
                      Current record:{" "}
                      {
                        result.liveBridge
                          .reassessment
                          .currentRecordId ??
                        "—"
                      }
                    </div>
                  </>
                )}
              </section>
            )}

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
                  Upstream:{" "}
                  {
                    result.runtime
                      .upstream ??
                    "—"
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

            {result.liveBridge?.reassessment
              ?.triggeredInvalidationConditions &&
              result.liveBridge
                .reassessment
                .triggeredInvalidationConditions
                .length >
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
                    Triggered Invalidation Conditions
                  </h2>

                  <ul>
                    {result.liveBridge
                      .reassessment
                      .triggeredInvalidationConditions
                      .map(
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
