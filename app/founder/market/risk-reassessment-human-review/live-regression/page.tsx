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
  code?: string;
  stage?: string;
  passed?: number;
  failed?: number;
  total?: number;
  taskId?: string;
  review?: {
    reviewId?: string;
    taskId?: string;
    symbol?: string;
    market?: string;
    decision?: string;
    reviewerNote?: string;
    humanDecisionRequired?: boolean;
    automatedExecutionStarted?: boolean;
    plannerDispatched?: boolean;
    tradingExecuted?: boolean;
  } | null;
  checks?: RegressionCheck[];
  safetyBoundary?: {
    humanDecisionRequired: boolean;
    automatedExecutionStarted: boolean;
    plannerDispatched: boolean;
    tradingExecuted: boolean;
  };
  runtime?: {
    name: string;
    version: string;
    upstream: string;
    generatedAt: string;
    latencyMs: number;
  };
  principles?: string[];
  disclaimer?: string;
  error?: string;
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
export default function MarketRiskReassessmentHumanReviewLiveRegressionPage() {
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
  async function runLiveRegression() {
    setRunning(true);
    setResult(null);
    try {
      const response =
        await fetch(
          "/api/founder/market/risk-reassessment-human-review/live-regression",
          {
            method:
              "GET",
            headers:
              getFounderHeaders(),
            cache:
              "no-store",
          },
        );
      const data =
        await response.json();
      if (
        response.status ===
        401
      ) {
        throw new Error(
          "Founder Session expired. Please enter the Founder Console again.",
        );
      }
      if (
        !response.ok
      ) {
        throw new Error(
          data?.error ??
            data?.code ??
            `Regression failed with HTTP ${response.status}.`,
        );
      }
      setResult(
        data as RegressionResult,
      );
    } catch (error) {
      setResult({
        success:
          false,
        code:
          "C147_19_RISK_REASSESSMENT_HUMAN_REVIEW_REGRESSION_PARTIAL",
        stage:
          "C147.19.1",
        passed:
          0,
        failed:
          1,
        total:
          1,
        checks: [
          {
            name:
              "LIVE_REGRESSION_REQUEST",
            passed:
              false,
            detail:
              error instanceof Error
                ? error.message
                : "Live regression request failed.",
          },
        ],
        safetyBoundary: {
          humanDecisionRequired:
            true,
          automatedExecutionStarted:
            false,
          plannerDispatched:
            false,
          tradingExecuted:
            false,
        },
        error:
          error instanceof Error
            ? error.message
            : "Regression request failed.",
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
          C147.19.1 Live Regression
        </h1>
        <div
          style={{
            color:
              "#9da7b8",
            marginBottom:
              24,
          }}
        >
          Market Risk → C147.18 → Reassessment → Persistent Human Review
        </div>
        <section
          style={{
            border:
              "1px solid #283142",
            borderRadius:
              12,
            padding:
              16,
            marginBottom:
              18,
            background:
              "#0b0f16",
            color:
              "#9da7b8",
            fontSize:
              13,
            lineHeight:
              1.65,
          }}
        >
          This is a Founder-only live regression.
          The page automatically reads the current Founder Session
          and sends the required authentication headers.
          The regression creates a temporary review Task,
          verifies that no decision exists before human input,
          records one explicit human decision through C147.15,
          reads the persistent record back,
          verifies duplicate protection,
          and removes the temporary regression Task.
        </section>
        <button
          type="button"
          onClick={
            runLiveRegression
          }
          disabled={
            running
          }
          style={{
            width:
              "100%",
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
              "14px 18px",
            fontSize:
              15,
            fontWeight:
              700,
            cursor:
              running
                ? "wait"
                : "pointer",
          }}
        >
          {running
            ? "Running C147.19.1..."
            : "▶ Run C147.19.1 Live Regression"}
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
                    26,
                  fontWeight:
                    700,
                  margin:
                    "6px 0",
                }}
              >
                {result.success
                  ? "PASS"
                  : "PARTIAL / FAILED"}
              </div>
              <div
                style={{
                  marginTop:
                    8,
                }}
              >
                Code:{" "}
                {result.code ??
                  "—"}
              </div>
              <div>
                Stage:{" "}
                {result.stage ??
                  "C147.19.1"}
              </div>
              <div>
                Passed:{" "}
                {result.passed ??
                  0}
                {" · "}
                Failed:{" "}
                {result.failed ??
                  0}
                {" · "}
                Total:{" "}
                {result.total ??
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
                      check,
                    ) => (
                      <div
                        key={
                          check.name
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
                          {check.passed
                            ? "PASS"
                            : "FAIL"}
                          {" · "}
                          {
                            check.name
                          }
                        </div>
                        <div
                          style={{
                            marginTop:
                              6,
                            color:
                              "#9da7b8",
                            lineHeight:
                              1.55,
                          }}
                        >
                          {
                            check.detail
                          }
                        </div>
                      </div>
                    ),
                  )}
                </section>
              )}
            {result.review && (
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
                  Persistent Human Review
                </h2>
                <div>
                  Review ID:{" "}
                  {
                    result.review
                      .reviewId ??
                    "—"
                  }
                </div>
                <div>
                  Task ID:{" "}
                  {
                    result.review
                      .taskId ??
                    result.taskId ??
                    "—"
                  }
                </div>
                <div>
                  Symbol:{" "}
                  {
                    result.review
                      .symbol ??
                    "—"
                  }
                </div>
                <div>
                  Market:{" "}
                  {
                    result.review
                      .market ??
                    "—"
                  }
                </div>
                <div>
                  Explicit decision:{" "}
                  {
                    result.review
                      .decision ??
                    "—"
                  }
                </div>
                <div>
                  Human decision required:{" "}
                  {result.review
                    .humanDecisionRequired
                    ? "YES"
                    : "NO"}
                </div>
                <div>
                  Automated execution:{" "}
                  {result.review
                    .automatedExecutionStarted
                    ? "YES"
                    : "NO"}
                </div>
                <div>
                  Planner dispatched:{" "}
                  {result.review
                    .plannerDispatched
                    ? "YES"
                    : "NO"}
                </div>
                <div>
                  Trading executed:{" "}
                  {result.review
                    .tradingExecuted
                    ? "YES"
                    : "NO"}
                </div>
              </section>
            )}
            {result.safetyBoundary && (
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
                  Human decision required:{" "}
                  {result.safetyBoundary
                    .humanDecisionRequired
                    ? "YES"
                    : "NO"}
                </div>
                <div>
                  Automated execution started:{" "}
                  {result.safetyBoundary
                    .automatedExecutionStarted
                    ? "YES"
                    : "NO"}
                </div>
                <div>
                  Planner dispatched:{" "}
                  {result.safetyBoundary
                    .plannerDispatched
                    ? "YES"
                    : "NO"}
                </div>
                <div>
                  Trading executed:{" "}
                  {result.safetyBoundary
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
                      .upstream
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
                  <ul
                    style={{
                      lineHeight:
                        1.7,
                    }}
                  >
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
            {result.error && (
              <div
                style={{
                  marginTop:
                    18,
                  border:
                    "1px solid #633",
                  borderRadius:
                    10,
                  padding:
                    14,
                  background:
                    "#160909",
                  color:
                    "#ffb4b4",
                }}
              >
                {result.error}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
