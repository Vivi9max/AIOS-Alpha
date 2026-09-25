"use client";

import {
  useEffect,
  useState,
} from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

interface RegressionCheck {
  name: string;
  passed: boolean;
  detail: string;
}

interface RegressionPosition {
  symbol: string;
  quantity: number;
  averageEntryPrice: number;
  lastPrice: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
}

interface RegressionResponse {
  success: boolean;
  code: string;
  stage: string;
  verified: boolean;
  passed: number;
  failed: number;
  total: number;
  verificationMode: string;
  source: string;
  upstream: string;
  engineCode: string;
  requestedOrders: number;
  filledOrders: number;
  rejectedOrders: number;
  initialCapital: number;
  finalCash: number;
  finalEquity: number;
  remainingPosition:
    | RegressionPosition
    | null;
  totalFees: number;
  totalSlippage: number;
  equityCurvePoints: number;
  checks: RegressionCheck[];
  safetyBoundary: {
    founderAuthRequired: boolean;
    founderOnly: boolean;
    simulationOnly: boolean;
    brokerConnected: boolean;
    tradingExecuted: boolean;
    liveOrderPlaced: boolean;
    plannerDispatched: boolean;
    humanReviewRequiredBeforeLiveTrading: boolean;
  };
  principle: string;
  nextStage: string;
  latencyMs: number;
  generatedAt: string;
  error?: string;
}

function Status({
  passed,
}: {
  passed: boolean;
}) {
  return (
    <strong
      style={{
        color: passed
          ? "#86efac"
          : "#fca5a5",
      }}
    >
      {passed
        ? "PASS"
        : "FAIL"}
    </strong>
  );
}

function CheckCard({
  item,
}: {
  item: RegressionCheck;
}) {
  return (
    <div
      style={{
        padding:
          "9px 0",
        borderTop:
          "1px solid rgba(255,255,255,0.06)",
        fontSize:
          12,
        lineHeight:
          1.6,
      }}
    >
      <div>
        <Status
          passed={
            item.passed
          }
        />{" "}
        {item.name}
      </div>

      <div
        style={{
          marginTop:
            3,
          opacity:
            0.65,
        }}
      >
        {item.detail}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding:
          12,
        borderRadius:
          10,
        border:
          "1px solid rgba(255,255,255,0.08)",
        background:
          "rgba(255,255,255,0.025)",
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
            5,
          fontSize:
            16,
          fontWeight:
            700,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function PaperTradingRegressionPage() {
  const [
    founderReady,
    setFounderReady,
  ] = useState(false);

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
  ] = useState("");

  useEffect(() => {
    const key =
      window.sessionStorage.getItem(
        STORAGE_KEY,
      );

    setFounderReady(
      Boolean(key),
    );
  }, []);

  async function runRegression() {
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

      const result =
        await fetch(
          "/api/founder/market/paper-trading-regression",
          {
            method:
              "GET",

            cache:
              "no-store",

            headers: {
              Authorization:
                `Bearer ${key}`,

              "x-aios-founder-key":
                key,
            },
          },
        );

      const data =
        (await result.json()) as RegressionResponse;

      setResponse(
        data,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "C151.1.1 regression request failed.",
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
          "#fff",

        padding:
          "24px 16px 60px",

        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth:
            960,

          margin:
            "0 auto",
        }}
      >
        <div
          style={{
            fontSize:
              12,

            letterSpacing:
              1,

            opacity:
              0.55,
          }}
        >
          PRIVATE FOUNDER ACCESS
        </div>

        <h1
          style={{
            margin:
              "8px 0 4px",

            fontSize:
              28,
          }}
        >
          C151.1.1 Paper Trading Regression
        </h1>

        <p
          style={{
            marginTop:
              0,

            opacity:
              0.65,

            lineHeight:
              1.6,
          }}
        >
          Deterministic virtual execution →
          position accounting →
          fees/slippage →
          rejection boundary →
          live-trading safety boundary
        </p>

        <section
          style={{
            marginTop:
              18,

            padding:
              16,

            borderRadius:
              14,

            border:
              "1px solid rgba(255,255,255,0.10)",

            background:
              "rgba(255,255,255,0.035)",
          }}
        >
          <div
            style={{
              fontSize:
                13,

              lineHeight:
                1.8,
            }}
          >
            Founder Session:
            {" "}
            <Status
              passed={
                founderReady
              }
            />

            <br />

            Execution mode:
            {" "}
            <strong>
              Deterministic Paper Trading
            </strong>

            <br />

            Price source:
            {" "}
            <strong>
              Explicit simulation prices
            </strong>

            <br />

            Broker:
            {" "}
            <strong>
              DISCONNECTED
            </strong>

            <br />

            Live order:
            {" "}
            <strong>
              NOT ALLOWED
            </strong>
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
              marginTop:
                14,

              width:
                "100%",

              padding:
                "14px 16px",

              borderRadius:
                10,

              border:
                "none",

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

              fontWeight:
                700,

              cursor:
                loading
                  ? "wait"
                  : "pointer",
            }}
          >
            {loading
              ? "Running C151.1.1…"
              : "▶ Run C151.1.1 Live Regression"}
          </button>
        </section>

        {error && (
          <section
            style={{
              marginTop:
                18,

              padding:
                16,

              borderRadius:
                14,

              border:
                "1px solid rgba(255,255,255,0.10)",

              background:
                "rgba(255,255,255,0.035)",

              color:
                "#fca5a5",

              lineHeight:
                1.6,
            }}
          >
            {error}
          </section>
        )}

        {response && (
          <>
            <section
              style={{
                marginTop:
                  18,

                padding:
                  16,

                borderRadius:
                  14,

                border:
                  "1px solid rgba(255,255,255,0.10)",

                background:
                  "rgba(255,255,255,0.035)",
              }}
            >
              <h2
                style={{
                  margin:
                    "0 0 10px",

                  fontSize:
                    18,
                }}
              >
                Regression Summary
              </h2>

              <div
                style={{
                  fontSize:
                    18,

                  fontWeight:
                    700,
                }}
              >
                <Status
                  passed={
                    response.verified
                  } />

                {" "}

                {response.code}
              </div>

              <div
                style={{
                  marginTop:
                    10,

                  lineHeight:
                    1.8,

                  fontSize:
                    13,

                  opacity:
                    0.75,
                }}
              >
                Passed:
                {" "}
                {response.passed}

                {" · Failed: "}
                {response.failed}

                {" · Total: "}
                {response.total}

                <br />

                Stage:
                {" "}
                {response.stage}

                {" · Upstream: "}
                {response.upstream}

                <br />

                Mode:
                {" "}
                {response.verificationMode}

                <br />

                Engine:
                {" "}
                {response.engineCode}

                <br />

                Latency:
                {" "}
                {response.latencyMs}
                {" ms"}
              </div>
            </section>

            <section
              style={{
                marginTop:
                  18,

                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(auto-fit, minmax(140px, 1fr))",

                gap:
                  10,
              }}
            >
              <Metric
                label="Orders"
                value={`${response.requestedOrders}`}
              />

              <Metric
                label="Filled"
                value={`${response.filledOrders}`}
              />

              <Metric
                label="Rejected"
                value={`${response.rejectedOrders}`}
              />

              <Metric
                label="Initial Capital"
                value={`${response.initialCapital}`}
              />

              <Metric
                label="Final Cash"
                value={`${response.finalCash}`}
              />

              <Metric
                label="Final Equity"
                value={`${response.finalEquity}`}
              />

              <Metric
                label="Fees"
                value={`${response.totalFees}`}
              />

              <Metric
                label="Slippage"
                value={`${response.totalSlippage}`}
              />
            </section>

            {response.remainingPosition && (
              <section
                style={{
                  marginTop:
                    18,

                  padding:
                    16,

                  borderRadius:
                    14,

                  border:
                    "1px solid rgba(255,255,255,0.10)",

                  background:
                    "rgba(255,255,255,0.035)",
                }}
              >
                <h2
                  style={{
                    margin:
                      "0 0 12px",

                    fontSize:
                      18,
                  }}
                >
                  Virtual Position
                </h2>

                <div
                  style={{
                    fontSize:
                      13,

                    lineHeight:
                      1.8,

                    opacity:
                      0.8,
                  }}
                >
                  Symbol:
                  {" "}
                  {
                    response
                      .remainingPosition
                      .symbol
                  }

                  <br />

                  Quantity:
                  {" "}
                  {
                    response
                      .remainingPosition
                      .quantity
                  }

                  <br />

                  Average Entry:
                  {" "}
                  {
                    response
                      .remainingPosition
                      .averageEntryPrice
                  }

                  <br />

                  Last Price:
                  {" "}
                  {
                    response
                      .remainingPosition
                      .lastPrice
                  }

                  <br />

                  Realized P&L:
                  {" "}
                  {
                    response
                      .remainingPosition
                      .realizedPnl
                  }

                  <br />

                  Unrealized P&L:
                  {" "}
                  {
                    response
                      .remainingPosition
                      .unrealizedPnl
                  }

                  <br />

                  Total P&L:
                  {" "}
                  {
                    response
                      .remainingPosition
                      .totalPnl
                  }
                </div>
              </section>
            )}

            <section
              style={{
                marginTop:
                  18,

                padding:
                  16,

                borderRadius:
                  14,

                border:
                  "1px solid rgba(255,255,255,0.10)",

                background:
                  "rgba(255,255,255,0.035)",
              }}
            >
              <h2
                style={{
                  margin:
                    "0 0 10px",

                  fontSize:
                    18,
                }}
              >
                Verification Checks
              </h2>

              {response.checks.map(
                (
                  item,
                  index,
                ) => (
                  <CheckCard
                    key={`${item.name}-${index}`}
                    item={
                      item
                    }
                  />
                ),
              )}
            </section>

            <section
              style={{
                marginTop:
                  18,

                padding:
                  16,

                borderRadius:
                  14,

                border:
                  "1px solid rgba(255,255,255,0.10)",

                background:
                  "rgba(255,255,255,0.035)",
              }}
            >
              <h2
                style={{
                  margin:
                    "0 0 12px",

                  fontSize:
                    18,
                }}
              >
                Safety Boundary
              </h2>

              <div
                style={{
                  fontSize:
                    13,

                  lineHeight:
                    1.9,
                }}
              >
                Founder Only:
                {" "}
                <Status
                  passed={
                    response
                      .safetyBoundary
                      .founderOnly
                  }
                />

                <br />

                Simulation Only:
                {" "}
                <Status
                  passed={
                    response
                      .safetyBoundary
                      .simulationOnly
                  }
                />

                <br />

                Broker Connected:
                {" "}
                <Status
                  passed={
                    response
                      .safetyBoundary
                      .brokerConnected ===
                    false
                  }
                />

                <br />

                Trading Executed:
                {" "}
                <Status
                  passed={
                    response
                      .safetyBoundary
                      .tradingExecuted ===
                    false
                  }
                />

                <br />

                Live Order Placed:
                {" "}
                <Status
                  passed={
                    response
                      .safetyBoundary
                      .liveOrderPlaced ===
                    false
                  }
                />

                <br />

                Planner Dispatched:
                {" "}
                <Status
                  passed={
                    response
                      .safetyBoundary
                      .plannerDispatched ===
                    false
                  }
                />

                <br />

                Human Review Before Live:
                {" "}
                <Status
                  passed={
                    response
                      .safetyBoundary
                      .humanReviewRequiredBeforeLiveTrading
                  }
                />
              </div>
            </section>

            <section
              style={{
                marginTop:
                  18,

                padding:
                  16,

                borderRadius:
                  14,

                border:
                  "1px solid rgba(255,255,255,0.10)",

                background:
                  "rgba(255,255,255,0.035)",

                fontSize:
                  12,

                lineHeight:
                  1.7,

                opacity:
                  0.65,
              }}
            >
              {response.principle}

              <br />
              <br />

              Next Stage:
              {" "}
              {response.nextStage}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
