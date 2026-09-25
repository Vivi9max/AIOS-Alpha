"use client";

import {
  useState,
} from "react";

interface Check {
  name: string;

  passed: boolean;

  detail: string;
}

interface RegressionResponse {
  success: boolean;

  verified: boolean;

  code: string;

  stage: string;

  upstream: string;

  mode: string;

  latencyMs: number;

  passed: number;

  failed: number;

  total: number;

  checks: Check[];

  safetyBoundary: {
    founderOnly: boolean;

    simulationRequiredBeforeLive: boolean;

    humanReviewRequired: boolean;

    brokerConnected: boolean;

    tradingExecuted: boolean;

    liveOrderPlaced: boolean;

    plannerDispatched: boolean;

    automaticExecutionAllowed: boolean;
  };

  principle: string;

  nextStage: string;

  generatedAt: string;
}

function Status({
  passed,
}: {
  passed: boolean;
}) {
  return (
    <span
      style={{
        fontWeight:
          700,

        color:
          passed
            ? "#15803d"
            : "#b91c1c",
      }}
    >
      {passed
        ? "PASS"
        : "FAIL"}
    </span>
  );
}

export default function LiveTradingBoundaryRegressionPage() {
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
  ] =
    useState<string | null>(
      null,
    );

  async function runRegression() {
    setLoading(true);

    setError(null);

    try {
      const result =
        await fetch(
          "/api/founder/market/live-trading-boundary-regression",
          {
            method:
              "GET",

            cache:
              "no-store",
          },
        );

      const data =
        (await result.json()) as
          RegressionResponse;

      setResponse(
        data,
      );

      if (
        !result.ok
      ) {
        setError(
          `HTTP ${result.status}`,
        );
      }
    } catch (
      err
    ) {
      setError(
        err instanceof Error
          ? err.message
          : "Regression request failed.",
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  return (
    <main
      style={{
        maxWidth:
          960,

        margin:
          "0 auto",

        padding:
          24,

        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <h1>
        PRIVATE FOUNDER ACCESS
      </h1>

      <h2>
        C152.1.1 Live Trading Boundary Regression
      </h2>

      <p>
        Research → Selection → Valuation →
        Backtest → Paper Trade → Human Review →
        Live Trading Boundary
      </p>

      <section
        style={{
          padding:
            16,

          border:
            "1px solid #d4d4d4",

          borderRadius:
            12,

          marginBottom:
            20,
        }}
      >
        <p>
          <strong>
            Founder Session:
          </strong>{" "}
          PASS
        </p>

        <p>
          <strong>
            Broker:
          </strong>{" "}
          DISCONNECTED
        </p>

        <p>
          <strong>
            Live order:
          </strong>{" "}
          NOT ALLOWED
        </p>

        <p>
          <strong>
            Trading:
          </strong>{" "}
          NOT EXECUTED
        </p>

        <p>
          <strong>
            Planner:
          </strong>{" "}
          NOT DISPATCHED
        </p>

        <p>
          <strong>
            Execution mode:
          </strong>{" "}
          Boundary verification only
        </p>

        <button
          type="button"
          onClick={
            runRegression
          }
          disabled={
            loading
          }
          style={{
            padding:
              "10px 16px",

            borderRadius:
              8,

            border:
              "1px solid #888",

            background:
              "#fff",

            cursor:
              loading
                ? "wait"
                : "pointer",
          }}
        >
          {loading
            ? "Running..."
            : "▶ Run C152.1.1 Live Regression"}
        </button>
      </section>

      {error && (
        <p>
          <strong>
            Error:
          </strong>{" "}
          {error}
        </p>
      )}

      {response && (
        <>
          <section
            style={{
              padding:
                16,

              border:
                "1px solid #d4d4d4",

              borderRadius:
                12,

              marginBottom:
                20,
            }}
          >
            <h3>
              Regression Summary
            </h3>

            <p>
              <Status
                passed={
                  response.verified
                }
              />{" "}
              {response.code}
            </p>

            <p>
              Passed:{" "}
              {response.passed}{" "}
              · Failed:{" "}
              {response.failed}{" "}
              · Total:{" "}
              {response.total}
            </p>

            <p>
              Stage:{" "}
              {response.stage}{" "}
              · Upstream:{" "}
              {response.upstream}
            </p>

            <p>
              Mode:{" "}
              {response.mode}
            </p>

            <p>
              Latency:{" "}
              {response.latencyMs}{" "}
              ms
            </p>
          </section>

          <section
            style={{
              padding:
                16,

              border:
                "1px solid #d4d4d4",

              borderRadius:
                12,

              marginBottom:
                20,
            }}
          >
            <h3>
              Verification Checks
            </h3>

            {response.checks.map(
              (item) => (
                <div
                  key={
                    item.name
                  }
                  style={{
                    padding:
                      "10px 0",

                    borderBottom:
                      "1px solid #eee",
                  }}
                >
                  <div>
                    <Status
                      passed={
                        item.passed
                      }
                    />{" "}
                    <strong>
                      {
                        item.name
                      }
                    </strong>
                  </div>

                  <div
                    style={{
                      marginTop:
                        4,
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

          <section
            style={{
              padding:
                16,

              border:
                "1px solid #d4d4d4",

              borderRadius:
                12,

              marginBottom:
                20,
            }}
          >
            <h3>
              Safety Boundary
            </h3>

            <p>
              Founder Only:{" "}
              {response
                .safetyBoundary
                .founderOnly
                ? "PASS"
                : "FAIL"}
            </p>

            <p>
              Simulation Required Before Live:{" "}
              {response
                .safetyBoundary
                .simulationRequiredBeforeLive
                ? "PASS"
                : "FAIL"}
            </p>

            <p>
              Human Review Required:{" "}
              {response
                .safetyBoundary
                .humanReviewRequired
                ? "PASS"
                : "FAIL"}
            </p>

            <p>
              Broker Connected:{" "}
              {response
                .safetyBoundary
                .brokerConnected
                ? "FAIL"
                : "PASS"}
            </p>

            <p>
              Trading Executed:{" "}
              {response
                .safetyBoundary
                .tradingExecuted
                ? "FAIL"
                : "PASS"}
            </p>

            <p>
              Live Order Placed:{" "}
              {response
                .safetyBoundary
                .liveOrderPlaced
                ? "FAIL"
                : "PASS"}
            </p>

            <p>
              Planner Dispatched:{" "}
              {response
                .safetyBoundary
                .plannerDispatched
                ? "FAIL"
                : "PASS"}
            </p>

            <p>
              Automatic Execution Allowed:{" "}
              {response
                .safetyBoundary
                .automaticExecutionAllowed
                ? "FAIL"
                : "PASS"}
            </p>
          </section>

          <section
            style={{
              padding:
                16,

              border:
                "1px solid #d4d4d4",

              borderRadius:
                12,
            }}
          >
            <h3>
              Principle
            </h3>

            <p>
              {
                response.principle
              }
            </p>

            <p>
              Next Stage:{" "}
              <strong>
                {
                  response.nextStage
                }
              </strong>
            </p>

            <p>
              Generated:{" "}
              {
                response.generatedAt
              }
            </p>
          </section>
        </>
      )}
    </main>
  );
}
