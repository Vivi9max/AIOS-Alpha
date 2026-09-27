"use client";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import type {
  MarketRegion,
} from "@/lib/runtime/market/market-types";
import type {
  MarketHistoricalValuationAdapterRegressionResult,
} from "@/lib/runtime/market/market-historical-valuation-adapter-regression";
const FOUNDER_STORAGE_KEY =
  "aios-founder-access-key";
const ENDPOINT =
  "/api/founder/market/historical-valuation-adapter";
function statusText(
  value: boolean,
) {
  return value
    ? "PASS"
    : "NO";
}
function formatGrowth(
  value: number | null,
) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "N/A";
  }
  return (
    (value * 100).toFixed(2) +
    "%"
  );
}
function statusColor(
  value: boolean,
) {
  return value
    ? "#86efac"
    : "#fca5a5";
}
export default function Page() {
  const [session, setSession] =
    useState(false);
  const [symbol, setSymbol] =
    useState("AAPL");
  const [market, setMarket] =
    useState<MarketRegion>("us");
  const [periods, setPeriods] =
    useState("5");
  const [industry, setIndustry] =
    useState("Regression Validation");
  const [
    result,
    setResult,
  ] =
    useState<
      MarketHistoricalValuationAdapterRegressionResult | null
    >(null);
  const [error, setError] =
    useState("");
  const [loading, setLoading] =
    useState(false);
  const getFounderKey =
    useCallback(() => {
      if (
        typeof window ===
        "undefined"
      ) {
        return "";
      }
      return (
        window.sessionStorage.getItem(
          FOUNDER_STORAGE_KEY,
        )?.trim() ??
        ""
      );
    }, []);
  const refreshSession =
    useCallback(() => {
      const key =
        getFounderKey();
      setSession(
        Boolean(key),
      );
      return key;
    }, [
      getFounderKey,
    ]);
  useEffect(() => {
    refreshSession();
    const interval =
      window.setInterval(
        refreshSession,
        1000,
      );
    return () =>
      window.clearInterval(
        interval,
      );
  }, [
    refreshSession,
  ]);
  async function runRegression() {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const key =
        refreshSession();
      if (!key) {
        throw new Error(
          "Founder Session not detected.",
        );
      }
      if (
        !symbol.trim()
      ) {
        throw new Error(
          "Symbol is required.",
        );
      }
      const parsedPeriods =
        Number(periods);
      const safePeriods =
        Number.isFinite(
          parsedPeriods,
        )
          ? Math.max(
              2,
              Math.min(
                Math.floor(
                  parsedPeriods,
                ),
                12,
              ),
            )
          : 5;
      const params =
        new URLSearchParams();
      params.set(
        "symbol",
        symbol.trim(),
      );
      params.set(
        "market",
        market,
      );
      params.set(
        "periods",
        String(
          safePeriods,
        ),
      );
      params.set(
        "industry",
        industry.trim() ||
          "Regression Validation",
      );
      const response =
        await fetch(
          ENDPOINT +
            "?" +
            params.toString(),
          {
            method: "GET",
            headers: {
              Accept:
                "application/json",
              Authorization:
                "Bearer " +
                key,
            },
            cache:
              "no-store",
          },
        );
      const payload =
        await response.json();
      if (
        !response.ok
      ) {
        throw new Error(
          payload.error ||
            payload.code ||
            "C163.4 adapter regression failed.",
        );
      }
      setResult(
        payload as MarketHistoricalValuationAdapterRegressionResult,
      );
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "C163.4 adapter regression failed.",
      );
    } finally {
      setLoading(false);
    }
  }
  const checks =
    result?.checks ??
    null;
  return (
    <main
      style={{
        minHeight:
          "100vh",
        padding:
          "32px",
        background:
          "#09090b",
        color:
          "#fafafa",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth:
            "1200px",
          margin:
            "0 auto",
        }}
      >
        <header
          style={{
            marginBottom:
              "24px",
          }}
        >
          <div
            style={{
              fontSize:
                "12px",
              letterSpacing:
                "0.14em",
              opacity:
                0.55,
            }}
          >
            PRIVATE FOUNDER ACCESS
          </div>
          <h1>
            AIOS Market Research
          </h1>
          <h2
            style={{
              fontWeight:
                500,
            }}
          >
            Historical Valuation Adapter
          </h2>
          <p
            style={{
              opacity:
                0.65,
            }}
          >
            C163.4 · C162.2 Historical Fundamentals
            {" → "}
            C149 Valuation Request
          </p>
        </header>
        <section
          style={{
            border:
              "1px solid #27272a",
            borderRadius:
              "12px",
            padding:
              "20px",
            marginBottom:
              "20px",
          }}
        >
          <strong>
            Founder Session
          </strong>
          <div
            style={{
              marginTop:
                "8px",
              color:
                session
                  ? "#86efac"
                  : "#fca5a5",
            }}
          >
            {session
              ? "Founder Session detected"
              : "Founder Session not detected"}
          </div>
        </section>
        <section
          style={{
            border:
              "1px solid #27272a",
            borderRadius:
              "12px",
            padding:
              "20px",
            marginBottom:
              "20px",
          }}
        >
          <h3>
            Adapter Regression Input
          </h3>
          <input
            value={
              symbol
            }
            onChange={(event) =>
              setSymbol(
                event.target.value,
              )
            }
            placeholder="Symbol"
            style={{
              width:
                "100%",
              padding:
                "12px",
              marginBottom:
                "10px",
              background:
                "#18181b",
              color:
                "#fafafa",
              border:
                "1px solid #3f3f46",
              borderRadius:
                "8px",
              boxSizing:
                "border-box",
            }}
          />
          <select
            value={
              market
            }
            onChange={(event) =>
              setMarket(
                event.target
                  .value as MarketRegion,
              )
            }
            style={{
              width:
                "100%",
              padding:
                "12px",
              marginBottom:
                "10px",
              background:
                "#18181b",
              color:
                "#fafafa",
              border:
                "1px solid #3f3f46",
              borderRadius:
                "8px",
            }}
          >
            <option value="us">
              US
            </option>
            <option value="hk">
              HK
            </option>
            <option value="cn">
              CN
            </option>
          </select>
          <input
            type="number"
            min="2"
            max="12"
            value={
              periods
            }
            onChange={(event) =>
              setPeriods(
                event.target.value,
              )
            }
            style={{
              width:
                "100%",
              padding:
                "12px",
              marginBottom:
                "10px",
              background:
                "#18181b",
              color:
                "#fafafa",
              border:
                "1px solid #3f3f46",
              borderRadius:
                "8px",
              boxSizing:
                "border-box",
            }}
          />
          <input
            value={
              industry
            }
            onChange={(event) =>
              setIndustry(
                event.target.value,
              )
            }
            placeholder="Industry"
            style={{
              width:
                "100%",
              padding:
                "12px",
              marginBottom:
                "12px",
              background:
                "#18181b",
              color:
                "#fafafa",
              border:
                "1px solid #3f3f46",
              borderRadius:
                "8px",
              boxSizing:
                "border-box",
            }}
          />
          <button
            onClick={
              runRegression
            }
            disabled={
              loading ||
              !session
            }
            style={{
              padding:
                "10px 16px",
              borderRadius:
                "8px",
              border:
                "1px solid #3f3f46",
              background:
                "#18181b",
              color:
                "#fafafa",
              cursor:
                loading ||
                !session
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {loading
              ? "Running..."
              : "Run C163.4 Adapter Regression"}
          </button>
          {error && (
            <p
              style={{
                color:
                  "#fca5a5",
                marginTop:
                  "16px",
              }}
            >
              {error}
            </p>
          )}
        </section>
        {result && (
          <>
            <section
              style={{
                border:
                  "1px solid #27272a",
                borderRadius:
                  "12px",
                padding:
                  "20px",
                marginBottom:
                  "20px",
              }}
            >
              <h3>
                Regression Summary
              </h3>
              <p
                style={{
                  fontSize:
                    "22px",
                  fontWeight:
                    700,
                  color:
                    result.success
                      ? "#86efac"
                      : "#fca5a5",
                }}
              >
                {result.code}
              </p>
              <p>
                Source Contract:{" "}
                {result.contract.source}
              </p>
              <p>
                Target Contract:{" "}
                {result.contract.target}
              </p>
              <p>
                Historical Series:{" "}
                {result.contract.historicalSeries}
              </p>
              <p>
                Symbol:{" "}
                {result.input.symbol}
              </p>
              <p>
                Market:{" "}
                {result.input.market}
              </p>
              <p>
                Periods:{" "}
                {result.input.periods}
              </p>
              <p>
                Latency:{" "}
                {result.latencyMs} ms
              </p>
            </section>
            <section
              style={{
                border:
                  "1px solid #27272a",
                borderRadius:
                  "12px",
                padding:
                  "20px",
                marginBottom:
                  "20px",
              }}
            >
              <h3>
                Boundary Checks
              </h3>
              {Object.entries(
                checks ?? {},
              ).map(
                ([
                  key,
                  value,
                ]) => (
                  <div
                    key={
                      key
                    }
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      gap:
                        "16px",
                      padding:
                        "10px 0",
                      borderBottom:
                        "1px solid #27272a",
                    }}
                  >
                    <span>
                      {key}
                    </span>
                    <strong
                      style={{
                        color:
                          statusColor(
                            Boolean(
                              value,
                            ),
                          ),
                      }}
                    >
                      {statusText(
                        Boolean(
                          value,
                        ),
                      )}
                    </strong>
                  </div>
                ),
              )}
            </section>
            <section
              style={{
                border:
                  "1px solid #27272a",
                borderRadius:
                  "12px",
                padding:
                  "20px",
                marginBottom:
                  "20px",
              }}
            >
              <h3>
                Adapted C149 Request
              </h3>
              <p>
                Industry:{" "}
                {
                  result
                    .adaptedRequest
                    .industry
                }
              </p>
              <p>
                Symbol:{" "}
                {
                  result
                    .adaptedRequest
                    .symbol
                }
              </p>
              <p>
                Market:{" "}
                {
                  result
                    .adaptedRequest
                    .market ??
                    "N/A"
                }
              </p>
              <div
                style={{
                  marginTop:
                    "16px",
                }}
              >
                <strong>
                  Revenue Growth Scenario Context
                </strong>
                <p>
                  Low:{" "}
                  {formatGrowth(
                    result
                      .adaptedRequest
                      .assumptions
                      .revenueGrowthLow,
                  )}
                </p>
                <p>
                  Base:{" "}
                  {formatGrowth(
                    result
                      .adaptedRequest
                      .assumptions
                      .revenueGrowthBase,
                  )}
                </p>
                <p>
                  High:{" "}
                  {formatGrowth(
                    result
                      .adaptedRequest
                      .assumptions
                      .revenueGrowthHigh,
                  )}
                </p>
              </div>
            </section>
            <section
              style={{
                border:
                  "1px solid #27272a",
                borderRadius:
                  "12px",
                padding:
                  "20px",
                marginBottom:
                  "20px",
              }}
            >
              <h3>
                Historical Inputs
              </h3>
              <p>
                Revenue Growth:{" "}
                {formatGrowth(
                  result
                    .historicalInputs
                    .revenueGrowth,
                )}
              </p>
              <p>
                Net Income Growth:{" "}
                {formatGrowth(
                  result
                    .historicalInputs
                    .netIncomeGrowth,
                )}
              </p>
              <p>
                Operating Cash Flow Growth:{" "}
                {formatGrowth(
                  result
                    .historicalInputs
                    .operatingCashFlowGrowth,
                )}
              </p>
              <p>
                Free Cash Flow Growth:{" "}
                {formatGrowth(
                  result
                    .historicalInputs
                    .freeCashFlowGrowth,
                )}
              </p>
              <p>
                Source Quality:{" "}
                {
                  result
                    .historicalInputs
                    .sourceQuality
                }
              </p>
            </section>
            <section
              style={{
                border:
                  "1px solid #27272a",
                borderRadius:
                  "12px",
                padding:
                  "20px",
                marginBottom:
                  "20px",
              }}
            >
              <h3>
                Safety Boundary
              </h3>
              <p
                style={{
                  color:
                    "#86efac",
                }}
              >
                Forecast Generated: NO
              </p>
              <p
                style={{
                  color:
                    "#86efac",
                }}
              >
                Target Price Generated: NO
              </p>
              <p
                style={{
                  color:
                    "#86efac",
                }}
              >
                Recommendation Generated: NO
              </p>
              <p
                style={{
                  color:
                    "#86efac",
                }}
              >
                Planner Dispatched: NO
              </p>
              <p
                style={{
                  color:
                    "#86efac",
                }}
              >
                Trading Executed: NO
              </p>
              <p>
                Human Verification Required:{" "}
                <strong>
                  YES
                </strong>
              </p>
            </section>
            <section
              style={{
                border:
                  "1px solid #27272a",
                borderRadius:
                  "12px",
                padding:
                  "20px",
              }}
            >
              <h3>
                Limitations
              </h3>
              {result.limitations.map(
                (
                  item,
                ) => (
                  <div
                    key={
                      item
                    }
                    style={{
                      marginBottom:
                        "8px",
                      opacity:
                        0.75,
                    }}
                  >
                    • {item}
                  </div>
                ),
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
