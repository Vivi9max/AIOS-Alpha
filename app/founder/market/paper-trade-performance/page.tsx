"use client";

import {
  useEffect,
  useState,
} from "react";

import type {
  MarketPaperTradePerformanceResult,
} from "@/lib/runtime/market/market-paper-trade-performance-types";

interface RegressionResult {
  success: boolean;
  code: string;
  passed: number;
  total: number;
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
          10,
        padding:
          12,
        background:
          "#101010",
      }}
    >
      <div
        style={{
          color:
            "#666",
          fontSize:
            10,
          marginBottom:
            6,
        }}
      >
        {label}
      </div>

      <strong
        style={{
          fontSize:
            16,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

export default function MarketPaperTradePerformancePage() {
  const [
    sessionDetected,
    setSessionDetected,
  ] = useState(false);

  const [
    symbol,
    setSymbol,
  ] = useState("NVDA");

  const [
    market,
    setMarket,
  ] = useState("us");

  const [
    paperTradingJson,
    setPaperTradingJson,
  ] = useState("");

  const [
    result,
    setResult,
  ] =
    useState<MarketPaperTradePerformanceResult | null>(
      null,
    );

  const [
    regression,
    setRegression,
  ] =
    useState<RegressionResult | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] = useState(false);

  useEffect(() => {
    const hasSession =
      typeof window !==
        "undefined" &&
      Boolean(
        sessionStorage.getItem(
          "aios-founder-session",
        ),
      );

    setSessionDetected(
      hasSession,
    );
  }, []);

  async function review() {
    setLoading(true);

    setResult(null);

    try {
      const paperTrading =
        JSON.parse(
          paperTradingJson,
        );

      const response =
        await fetch(
          "/api/founder/market/paper-trade-performance",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                symbol,
                market,
                paperTrading,
              }),
          },
        );

      const data =
        await response.json();

      setResult(data);
    } catch (error) {
      setResult(
        null,
      );

      console.error(
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  async function runRegression() {
    setRegression(
      null,
    );

    const response =
      await fetch(
        "/api/founder/market/paper-trade-performance?regression=true",
      );

    const data =
      await response.json();

    setRegression(
      data,
    );
  }

  return (
    <main
      style={{
        minHeight:
          "100vh",
        background:
          "#080808",
        color:
          "#eee",
        padding:
          24,
        fontFamily:
          "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth:
            1080,
          margin:
            "0 auto",
        }}
      >
        <div
          style={{
            color:
              "#777",
            fontSize:
              11,
            letterSpacing:
              1.5,
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
          AIOS Market Paper Trading
          Performance Review
        </h1>

        <div
          style={{
            color:
              "#777",
            fontSize:
              12,
          }}
        >
          C159.1 · C151 Paper Trading →
          Objective Performance Review
        </div>

        <div
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
            Founder Session
          </strong>

          <div
            style={{
              marginTop:
                6,
              color:
                sessionDetected
                  ? "#86efac"
                  : "#fca5a5",
              fontSize:
                12,
            }}
          >
            {sessionDetected
              ? "Founder Session detected"
              : "Founder Session not detected"}
          </div>
        </div>

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
          <h2
            style={{
              fontSize:
                16,
              marginTop:
                0,
            }}
          >
            C151 Paper Trading Result
          </h2>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "1fr 120px",
              gap:
                10,
            }}
          >
            <input
              value={
                symbol
              }
              onChange={(
                event,
              ) =>
                setSymbol(
                  event.target
                    .value
                    .toUpperCase(),
                )
              }
              placeholder="Symbol"
              style={{
                border:
                  "1px solid #333",
                borderRadius:
                  8,
                padding:
                  10,
                background:
                  "#111",
                color:
                  "#eee",
              }}
            />

            <select
              value={
                market
              }
              onChange={(
                event,
              ) =>
                setMarket(
                  event.target
                    .value,
                )
              }
              style={{
                border:
                  "1px solid #333",
                borderRadius:
                  8,
                padding:
                  10,
                background:
                  "#111",
                color:
                  "#eee",
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
          </div>

          <textarea
            value={
              paperTradingJson
            }
            onChange={(
              event,
            ) =>
              setPaperTradingJson(
                event.target
                  .value,
              )
            }
            placeholder='Paste the actual C151 "paperTrading" result JSON here.'
            rows={12}
            style={{
              width:
                "100%",
              marginTop:
                10,
              boxSizing:
                "border-box",
              border:
                "1px solid #333",
              borderRadius:
                8,
              padding:
                12,
              background:
                "#111",
              color:
                "#ddd",
              fontFamily:
                "monospace",
              fontSize:
                11,
            }}
          />

          <button
            type="button"
            disabled={
              !sessionDetected ||
              loading ||
              !paperTradingJson
            }
            onClick={
              review
            }
            style={{
              marginTop:
                10,
              border:
                "1px solid #444",
              borderRadius:
                9,
              padding:
                "10px 15px",
              background:
                "#151515",
              color:
                "#eee",
            }}
          >
            {loading
              ? "Reviewing..."
              : "Run Performance Review"}
          </button>
        </section>

        {result && (
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
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                gap:
                  12,
                flexWrap:
                  "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize:
                      22,
                    fontWeight:
                      750,
                  }}
                >
                  {result.symbol}
                </div>

                <div
                  style={{
                    color:
                      "#666",
                    fontSize:
                      11,
                    marginTop:
                      4,
                  }}
                >
                  C159.1 ·{" "}
                  {result.state}
                </div>
              </div>

              <div
                style={{
                  border:
                    "1px solid #333",
                  borderRadius:
                    999,
                  padding:
                    "6px 10px",
                  fontSize:
                    10,
                }}
              >
                HISTORICAL SIMULATION REVIEW
              </div>
            </div>

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(145px,1fr))",
                gap:
                  8,
                marginTop:
                  16,
              }}
            >
              <Metric
                label="INITIAL CAPITAL"
                value={result.metrics.initialCapital.toFixed(2)}
              />

              <Metric
                label="FINAL EQUITY"
                value={result.metrics.finalEquity.toFixed(2)}
              />

              <Metric
                label="NET PROFIT"
                value={result.metrics.netProfit.toFixed(2)}
              />

              <Metric
                label="RETURN"
                value={`${result.metrics.totalReturnPercent.toFixed(2)}%`}
              />

              <Metric
                label="MAX DRAWDOWN"
                value={`${result.metrics.maxDrawdown.toFixed(2)} (${result.metrics.maxDrawdownPercent.toFixed(2)}%)`}
              />

              <Metric
                label="FILLED"
                value={result.metrics.filledOrders}
              />

              <Metric
                label="REJECTED"
                value={result.metrics.rejectedOrders}
              />

              <Metric
                label="FEES"
                value={result.metrics.totalFees.toFixed(2)}
              />

              <Metric
                label="SLIPPAGE"
                value={result.metrics.totalSlippage.toFixed(2)}
              />

              <Metric
                label="OPEN POSITIONS"
                value={result.metrics.openPositions}
              />
            </div>

            <h3
              style={{
                marginTop:
                  22,
                fontSize:
                  14,
              }}
            >
              Data Quality
            </h3>

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
                label="VERIFIED PRICES"
                value={
                  result.dataQuality
                    .verifiedPriceCount
                }
              />

              <Metric
                label="UNVERIFIED PRICES"
                value={
                  result.dataQuality
                    .unverifiedPriceCount
                }
              />

              <Metric
                label="INSUFFICIENT"
                value={
                  result.dataQuality
                    .insufficientPriceCount
                }
              />

              <Metric
                label="WEB EVIDENCE"
                value={
                  result.dataQuality
                    .webEvidencePriceCount
                }
              />
            </div>

            <h3
              style={{
                marginTop:
                  22,
                fontSize:
                  14,
              }}
            >
              Review Items
            </h3>

            <div
              style={{
                display:
                  "grid",
                gap:
                  8,
              }}
            >
              {result.reviewItems.map(
                (
                  item,
                  index,
                ) => (
                  <div
                    key={`${item.category}-${index}`}
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
                    <strong
                      style={{
                        fontSize:
                          12,
                      }}
                    >
                      {item.title}
                    </strong>

                    <div
                      style={{
                        marginTop:
                          5,
                        color:
                          "#888",
                        fontSize:
                          11,
                        lineHeight:
                          1.6,
                      }}
                    >
                      {item.observation}
                    </div>
                  </div>
                ),
              )}
            </div>

            <div
              style={{
                marginTop:
                  18,
                border:
                  "1px solid #333",
                borderRadius:
                  10,
                padding:
                  13,
                color:
                  "#888",
                fontSize:
                  11,
                lineHeight:
                  1.6,
              }}
            >
              C159 only reviews the supplied
              historical paper-trading result.
              It does not predict future performance,
              generate investment recommendations,
              create Planner tasks, connect a broker,
              or execute live trading.
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
          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap:
                12,
              flexWrap:
                "wrap",
            }}
          >
            <div>
              <strong>
                C159.1 Runtime Regression
              </strong>

              <div
                style={{
                  color:
                    "#666",
                  fontSize:
                    11,
                  marginTop:
                    5,
                }}
              >
                C151 Result → Metrics →
                Drawdown → Data Quality →
                Safety Boundary
              </div>
            </div>

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
          </div>

          {regression && (
            <div
              style={{
                marginTop:
                  13,
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
          C159.1 closes the descriptive
          paper-trading review layer:
          C157 Human Decision → C158 Paper
          Trade Gate → C151 Paper Trading →
          C159 Performance Review.
        </footer>
      </div>
    </main>
  );
}
