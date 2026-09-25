"use client";

import {
  useEffect,
  useState,
} from "react";

type GateResult = {
  success: boolean;
  code: string;
  state: string;
  symbol: string;
  market: string;
  humanDecisionConfirmed: boolean;

  decisionWorkspace: {
    decisionId: string | null;
    state: string | null;
    reviewStatus: string | null;
    materialChange: boolean;
    evidenceVerified: boolean;
    sourceCount: number;
    independentDomains: number;
    evidenceGaps: string[];
    invalidationConditions: string[];
  };

  paperTrading: {
    executed: boolean;
    result: {
      code: string;
      filledOrders: number;
      rejectedOrders: number;
      account: {
        initialCapital: number;
        cash: number;
        equity: number;
      };
      metrics: {
        netProfit: number;
        totalReturnPercent: number;
        totalFees: number;
        totalSlippage: number;
      };
    } | null;
  };

  boundary: {
    recommendationGenerated: boolean;
    decisionAutomaticallyGenerated: boolean;
    taskCreated: boolean;
    plannerDispatched: boolean;
    brokerConnected: boolean;
    liveOrderPlaced: boolean;
    tradingExecuted: boolean;
  };
};

function accessKey() {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  return (
    sessionStorage.getItem(
      "aios-founder-access-key",
    ) ?? ""
  );
}

export default function MarketPaperTradeGatePage() {
  const [
    sessionDetected,
    setSessionDetected,
  ] = useState(false);

  const [
    confirmed,
    setConfirmed,
  ] = useState(false);

  const [
    symbol,
    setSymbol,
  ] = useState("NVDA");

  const [
    market,
    setMarket,
  ] = useState<
    "us" | "hk" | "cn"
  >("us");

  const [
    side,
    setSide,
  ] = useState<
    "buy" | "sell"
  >("buy");

  const [
    quantity,
    setQuantity,
  ] = useState("1");

  const [
    price,
    setPrice,
  ] = useState("");

  const [
    result,
    setResult,
  ] = useState<GateResult | null>(
    null,
  );

  const [
    regression,
    setRegression,
  ] = useState<any>(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    setSessionDetected(
      Boolean(
        accessKey(),
      ),
    );
  }, []);

  async function runGate() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response =
        await fetch(
          "/api/founder/market/paper-trade-gate",
          {
            method: "POST",

            headers: {
              "content-type":
                "application/json",

              Authorization:
                `Bearer ${accessKey()}`,
            },

            body:
              JSON.stringify({
                symbol,
                market,

                humanDecisionConfirmed:
                  confirmed,

                order: {
                  symbol,
                  market,
                  side,

                  quantity:
                    Number(
                      quantity,
                    ),

                  price:
                    price.trim()
                      ? Number(
                          price,
                        )
                      : null,

                  reason:
                    "Founder-confirmed C158 paper simulation",
                },
              }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          data?.error ??
            data?.disclaimer ??
            "C158 Paper Trade Gate failed.",
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "C158 failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function runRegression() {
    setRegression(null);
    setError("");

    try {
      const response =
        await fetch(
          "/api/founder/market/paper-trade-gate?regression=true",
          {
            headers: {
              Authorization:
                `Bearer ${accessKey()}`,
            },
          },
        );

      const data =
        await response.json();

      setRegression(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Regression failed.",
      );
    }
  }

  return (
    <main
      style={{
        minHeight:
          "100vh",

        background:
          "#070707",

        color:
          "#f5f5f5",

        padding:
          "28px 18px 60px",

        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
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
        <header
          style={{
            marginBottom:
              22,
          }}
        >
          <div
            style={{
              fontSize:
                11,

              letterSpacing:
                "0.14em",

              color:
                "#666",
            }}
          >
            PRIVATE FOUNDER ACCESS
          </div>

          <h1
            style={{
              margin:
                "9px 0 0",

              fontSize:
                29,
            }}
          >
            AIOS Paper Trade Gate
          </h1>

          <p
            style={{
              color:
                "#888",

              lineHeight:
                1.6,
            }}
          >
            C158.1 · Human Decision →
            Paper Trade Gate →
            C151 Paper Trading →
            C152 Live Boundary
          </p>
        </header>

        <section
          style={{
            border:
              "1px solid #222",

            borderRadius:
              14,

            padding:
              16,

            background:
              "#0d0d0d",

            marginBottom:
              16,
          }}
        >
          <strong>
            {sessionDetected
              ? "Founder Session detected"
              : "Founder Session not detected"}
          </strong>

          <div
            style={{
              color:
                "#666",

              fontSize:
                11,

              marginTop:
                6,
            }}
          >
            C157 Decision Workspace is mandatory
            upstream context. C158 never creates
            the human decision automatically.
          </div>
        </section>

        <section
          style={{
            border:
              "1px solid #222",

            borderRadius:
              14,

            padding:
              17,

            background:
              "#0d0d0d",
          }}
        >
          <h2
            style={{
              fontSize:
                17,

              marginTop:
                0,
            }}
          >
            Explicit Human Paper Simulation
          </h2>

          <p
            style={{
              color:
                "#777",

              fontSize:
                11,

              lineHeight:
                1.6,
            }}
          >
            The order below is supplied explicitly by
            the founder. AIOS does not infer it from
            research and does not recommend it.
          </p>

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit,minmax(150px,1fr))",

              gap:
                10,
            }}
          >
            <label>
              <div
                style={{
                  fontSize:
                    10,

                  color:
                    "#666",

                  marginBottom:
                    5,
                }}
              >
                SYMBOL
              </div>

              <input
                value={
                  symbol
                }
                onChange={(event) =>
                  setSymbol(
                    event.target.value.toUpperCase(),
                  )
                }
                style={{
                  width:
                    "100%",

                  boxSizing:
                    "border-box",

                  background:
                    "#111",

                  color:
                    "#eee",

                  border:
                    "1px solid #333",

                  borderRadius:
                    8,

                  padding:
                    10,
                }}
              />
            </label>

            <label>
              <div
                style={{
                  fontSize:
                    10,

                  color:
                    "#666",

                  marginBottom:
                    5,
                }}
              >
                MARKET
              </div>

              <select
                value={
                  market
                }
                onChange={(event) =>
                  setMarket(
                    event.target.value as
                      | "us"
                      | "hk"
                      | "cn",
                  )
                }
                style={{
                  width:
                    "100%",

                  background:
                    "#111",

                  color:
                    "#eee",

                  border:
                    "1px solid #333",

                  borderRadius:
                    8,

                  padding:
                    10,
                }}
              >
                <option value="us">
                  US
                </option>

                <option value="hk">
                  HK
                </option>

                <option value="cn">
                  A-SHARE
                </option>
              </select>
            </label>

            <label>
              <div
                style={{
                  fontSize:
                    10,

                  color:
                    "#666",

                  marginBottom:
                    5,
                }}
              >
                SIDE
              </div>

              <select
                value={
                  side
                }
                onChange={(event) =>
                  setSide(
                    event.target.value as
                      | "buy"
                      | "sell",
                  )
                }
                style={{
                  width:
                    "100%",

                  background:
                    "#111",

                  color:
                    "#eee",

                  border:
                    "1px solid #333",

                  borderRadius:
                    8,

                  padding:
                    10,
                }}
              >
                <option value="buy">
                  BUY — simulation only
                </option>

                <option value="sell">
                  SELL — simulation only
                </option>
              </select>
            </label>

            <label>
              <div
                style={{
                  fontSize:
                    10,

                  color:
                    "#666",

                  marginBottom:
                    5,
                }}
              >
                QUANTITY
              </div>

              <input
                type="number"
                min="1"
                value={
                  quantity
                }
                onChange={(event) =>
                  setQuantity(
                    event.target.value,
                  )
                }
                style={{
                  width:
                    "100%",

                  boxSizing:
                    "border-box",

                  background:
                    "#111",

                  color:
                    "#eee",

                  border:
                    "1px solid #333",

                  borderRadius:
                    8,

                  padding:
                    10,
                }}
              />
            </label>

            <label>
              <div
                style={{
                  fontSize:
                    10,

                  color:
                    "#666",

                  marginBottom:
                    5,
                }}
              >
                OPTIONAL PRICE
              </div>

              <input
                type="number"
                min="0"
                value={
                  price
                }
                onChange={(event) =>
                  setPrice(
                    event.target.value,
                  )
                }
                placeholder="Runtime price"
                style={{
                  width:
                    "100%",

                  boxSizing:
                    "border-box",

                  background:
                    "#111",

                  color:
                    "#eee",

                  border:
                    "1px solid #333",

                  borderRadius:
                    8,

                  padding:
                    10,
                }}
              />
            </label>
          </div>

          <label
            style={{
              display:
                "flex",

              gap:
                10,

              alignItems:
                "flex-start",

              marginTop:
                18,

              padding:
                12,

              border:
                "1px solid #333",

              borderRadius:
                10,

              background:
                "#111",
            }}
          >
            <input
              type="checkbox"
              checked={
                confirmed
              }
              onChange={(event) =>
                setConfirmed(
                  event.target.checked,
                )
              }
              style={{
                marginTop:
                  3,
              }}
            />

            <span
              style={{
                fontSize:
                  11,

                color:
                  "#aaa",

                lineHeight:
                  1.6,
              }}
            >
              I explicitly confirm that this order
              is my human decision for a virtual
              paper-trading simulation. I understand
              that C158 will not place a live order.
            </span>
          </label>

          <button
            type="button"
            disabled={
              loading ||
              !sessionDetected ||
              !confirmed
            }
            onClick={
              runGate
            }
            style={{
              marginTop:
                15,

              width:
                "100%",

              border:
                "none",

              borderRadius:
                10,

              padding:
                13,

              background:
                loading ||
                !sessionDetected ||
                !confirmed
                  ? "#333"
                  : "#fff",

              color:
                loading ||
                !sessionDetected ||
                !confirmed
                  ? "#777"
                  : "#000",

              fontWeight:
                700,
            }}
          >
            {loading
              ? "Running C158..."
              : "Confirm Human Decision → Paper Trade"}
          </button>
        </section>

        {error && (
          <section
            style={{
              marginTop:
                14,

              padding:
                13,

              border:
                "1px solid #522",

              borderRadius:
                10,

              color:
                "#ffaaaa",

              fontSize:
                12,
            }}
          >
            {error}
          </section>
        )}

        {result && (
          <section
            style={{
              marginTop:
                16,

              border:
                "1px solid #222",

              borderRadius:
                14,

              padding:
                17,

              background:
                "#0d0d0d",
            }}
          >
            <h2
              style={{
                marginTop:
                  0,

                fontSize:
                  18,
              }}
            >
              {result.code}
            </h2>

            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(auto-fit,minmax(140px,1fr))",

                gap:
                  8,
              }}
            >
              <Metric
                label="STATE"
                value={
                  result.state
                }
              />

              <Metric
                label="SYMBOL"
                value={
                  result.symbol
                }
              />

              <Metric
                label="C157 STATE"
                value={
                  result.decisionWorkspace
                    .state ??
                  "N/A"
                }
              />

              <Metric
                label="EVIDENCE"
                value={
                  result.decisionWorkspace
                    .evidenceVerified
                    ? "VERIFIED"
                    : "NOT VERIFIED"
                }
              />

              <Metric
                label="PAPER EXECUTED"
                value={
                  result.paperTrading
                    .executed
                    ? "YES"
                    : "NO"
                }
              />

              <Metric
                label="LIVE ORDER"
                value={
                  result.boundary
                    .liveOrderPlaced
                    ? "YES"
                    : "NO"
                }
              />
            </div>

            {result.paperTrading
              .result && (
              <div
                style={{
                  marginTop:
                    14,
                }}
              >
                <h3
                  style={{
                    fontSize:
                      14,
                  }}
                >
                  C151 Paper Result
                </h3>

                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(130px,1fr))",

                    gap:
                      8,
                  }}
                >
                  <Metric
                    label="FILLED"
                    value={
                      result
                        .paperTrading
                        .result
                        .filledOrders
                    }
                  />

                  <Metric
                    label="REJECTED"
                    value={
                      result
                        .paperTrading
                        .result
                        .rejectedOrders
                    }
                  />

                  <Metric
                    label="EQUITY"
                    value={
                      result
                        .paperTrading
                        .result
                        .account
                        .equity
                    }
                  />

                  <Metric
                    label="NET PROFIT"
                    value={
                      result
                        .paperTrading
                        .result
                        .metrics
                        .netProfit
                    }
                  />

                  <Metric
                    label="RETURN"
                    value={`${result.paperTrading.result.metrics.totalReturnPercent}%`}
                  />
                </div>
              </div>
            )}

            <div
              style={{
                marginTop:
                  15,

                border:
                  "1px solid #333",

                borderRadius:
                  10,

                padding:
                  13,

                background:
                  "#111",

                fontSize:
                  11,

                lineHeight:
                  1.7,

                color:
                  "#999",
              }}
            >
              Human decision confirmed:{" "}
              {String(
                result.humanDecisionConfirmed,
              )}
              <br />
              Recommendation generated:{" "}
              {String(
                result.boundary
                  .recommendationGenerated,
              )}
              <br />
              Planner dispatched:{" "}
              {String(
                result.boundary
                  .plannerDispatched,
              )}
              <br />
              Broker connected:{" "}
              {String(
                result.boundary
                  .brokerConnected,
              )}
              <br />
              Live order placed:{" "}
              {String(
                result.boundary
                  .liveOrderPlaced,
              )}
              <br />
              Trading executed:{" "}
              {String(
                result.boundary
                  .tradingExecuted,
              )}
            </div>
          </section>
        )}

        <section
          style={{
            marginTop:
              18,

            border:
              "1px solid #222",

            borderRadius:
              14,

            padding:
              16,

            background:
              "#0d0d0d",
          }}
        >
          <strong>
            C158.1 Runtime Regression
          </strong>

          <p
            style={{
              color:
                "#666",

              fontSize:
                11,
            }}
          >
            Verifies explicit human confirmation,
            C157 upstream, C151 paper execution and
            C152 live-trading isolation.
          </p>

          <button
            type="button"
            disabled={
              !sessionDetected
            }
            onClick={
              runRegression
            }
            style={{
              border:
                "1px solid #333",

              borderRadius:
                9,

              padding:
                "10px 14px",

              background:
                "transparent",

              color:
                "#ddd",
            }}
          >
            Run Regression
          </button>

          {regression && (
            <div
              style={{
                marginTop:
                  12,

                color:
                  regression.success
                    ? "#86efac"
                    : "#fca5a5",

                fontSize:
                  12,
              }}
            >
              {regression.code}
              {" · "}
              {regression.passed}/
              {regression.total}
              {" checks passed"}
            </div>
          )}
        </section>

        <footer
          style={{
            marginTop:
              18,

            color:
              "#555",

            fontSize:
              11,

            lineHeight:
              1.7,
          }}
        >
          C158 is a human-confirmed simulation
          boundary. It routes an explicitly supplied
          virtual order into C151 only. It does not
          generate investment recommendations and
          never places live broker orders.
        </footer>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        border:
          "1px solid #222",

        borderRadius:
          9,

        padding:
          11,

        background:
          "#101010",
      }}
    >
      <div
        style={{
          color:
            "#666",

          fontSize:
            9,
        }}
      >
        {label}
      </div>

      <strong
        style={{
          display:
            "block",

          marginTop:
            5,

          fontSize:
            14,
        }}
      >
        {value}
      </strong>
    </div>
  );
}
