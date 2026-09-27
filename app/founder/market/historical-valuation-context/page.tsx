"use client";
import { useCallback, useEffect, useState } from "react";
import type {
  MarketRegion,
} from "@/lib/runtime/market/market-types";
import type {
  MarketHistoricalValuationContextResult,
} from "@/lib/runtime/market/market-historical-valuation-context-types";
const FOUNDER_STORAGE_KEY =
  "aios-founder-access-key";
const ENDPOINT =
  "/api/founder/market/historical-valuation-context";
function formatNumber(
  value: number | null,
) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "N/A";
  }
  return value.toLocaleString(
    undefined,
    {
      maximumFractionDigits: 4,
    },
  );
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
function statusText(
  value: boolean,
) {
  return value ? "YES" : "NO";
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
  const [result, setResult] =
    useState<
      MarketHistoricalValuationContextResult | null
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
        )?.trim() ?? ""
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
    }, [getFounderKey]);
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
  }, [refreshSession]);
  async function loadContext() {
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
      if (!symbol.trim()) {
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
        String(safePeriods),
      );
      const response =
        await fetch(
          ENDPOINT +
            "?" +
            params.toString(),
          {
            headers: {
              Accept:
                "application/json",
              Authorization:
                "Bearer " + key,
            },
            cache:
              "no-store",
          },
        );
      const payload =
        await response.json();
      if (!response.ok) {
        throw new Error(
          payload.error ||
            payload.code ||
            "C163.4 historical valuation context failed.",
        );
      }
      setResult(
        payload as MarketHistoricalValuationContextResult,
      );
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "C163.4 historical valuation context failed.",
      );
    } finally {
      setLoading(false);
    }
  }
  const context =
    result?.context ?? null;
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
        <div
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
            Historical Valuation Context
          </h2>
          <p
            style={{
              opacity:
                0.65,
            }}
          >
            C163.4 · Historical Fundamentals → Valuation Context
          </p>
        </div>
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
            Historical Valuation Context
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
                "12px",
              background:
                "#18181b",
              color:
                "#fafafa",
              border:
                "1px solid #3f3f46",
              borderRadius:
                "8px",
            }}
          />
          <button
            onClick={
              loadContext
            }
            disabled={
              loading ||
              !session
            }
            style={{
              padding:
                "10px 16px",
            }}
          >
            {loading
              ? "Loading..."
              : "Load Historical Valuation Context"}
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
        {result &&
          context && (
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
                  Runtime Status
                </h3>
                <p>
                  Code:{" "}
                  {result.code}
                </p>
                <p>
                  Contract:{" "}
                  {context.contractVersion}
                </p>
                <p>
                  Historical Series Contract:{" "}
                  {context.historicalSeriesContract}
                </p>
                <p>
                  Symbol:{" "}
                  {context.symbol}
                </p>
                <p>
                  Market:{" "}
                  {context.market}
                </p>
                <p>
                  Provider:{" "}
                  {context.provider}
                </p>
                <p>
                  Historical Data Quality:{" "}
                  {context.historicalDataQuality}
                </p>
                <p>
                  Usable For Valuation:{" "}
                  {statusText(
                    context.historicalDataUsableForValuation,
                  )}
                </p>
                <p>
                  Observations:{" "}
                  {context.observationCount}
                </p>
                <p>
                  Annual:{" "}
                  {context.annualObservationCount}
                </p>
                <p>
                  Quarterly:{" "}
                  {context.quarterlyObservationCount}
                </p>
                <p>
                  Earliest Period:{" "}
                  {context.earliestPeriodEnd ??
                    "N/A"}
                </p>
                <p>
                  Latest Period:{" "}
                  {context.latestPeriodEnd ??
                    "N/A"}
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
                  Historical Growth Signals
                </h3>
                {context.growthSignals.map(
                  (
                    signal,
                  ) => (
                    <div
                      key={
                        signal.metric
                      }
                      style={{
                        border:
                          "1px solid #27272a",
                        borderRadius:
                          "8px",
                        padding:
                          "12px",
                        marginBottom:
                          "8px",
                      }}
                    >
                      <strong>
                        {signal.metric}
                      </strong>
                      <div>
                        Growth:{" "}
                        {formatGrowth(
                          signal.growthRate,
                        )}
                      </div>
                      <div>
                        Current:{" "}
                        {formatNumber(
                          signal.currentValue,
                        )}
                      </div>
                      <div>
                        Previous:{" "}
                        {formatNumber(
                          signal.previousValue,
                        )}
                      </div>
                      <div>
                        Period:{" "}
                        {signal.period ??
                          "N/A"}
                      </div>
                      <div>
                        Current Period End:{" "}
                        {signal.currentPeriodEnd ??
                          "N/A"}
                      </div>
                      <div>
                        Previous Period End:{" "}
                        {signal.previousPeriodEnd ??
                          "N/A"}
                      </div>
                      <div>
                        Status:{" "}
                        {signal.status}
                      </div>
                      <div
                        style={{
                          opacity:
                            0.7,
                          marginTop:
                            "6px",
                        }}
                      >
                        {
                          signal.interpretation
                        }
                      </div>
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
                  Latest Observations
                </h3>
                {context.latestObservations.map(
                  (
                    observation,
                    index,
                  ) => (
                    <div
                      key={
                        observation.metric +
                        "-" +
                        observation.period +
                        "-" +
                        observation.periodEnd +
                        "-" +
                        index
                      }
                      style={{
                        border:
                          "1px solid #27272a",
                        borderRadius:
                          "8px",
                        padding:
                          "12px",
                        marginBottom:
                          "8px",
                      }}
                    >
                      <strong>
                        {
                          observation.metric
                        }
                      </strong>
                      <div>
                        Value:{" "}
                        {formatNumber(
                          observation.value,
                        )}
                      </div>
                      <div>
                        Period:{" "}
                        {
                          observation.period
                        }
                      </div>
                      <div>
                        Period End:{" "}
                        {
                          observation.periodEnd
                        }
                      </div>
                      <div>
                        Currency:{" "}
                        {observation.currency ??
                          "N/A"}
                      </div>
                      <div>
                        Quality:{" "}
                        {
                          observation.quality
                        }
                      </div>
                      <div>
                        Source:{" "}
                        {
                          observation.source
                        }
                      </div>
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
                  Safety Boundary
                </h3>
                <p>
                  Valuation Generated:{" "}
                  {statusText(
                    result.boundary
                      .valuationGenerated,
                  )}
                </p>
                <p>
                  Forecast Generated:{" "}
                  {statusText(
                    result.boundary
                      .forecastGenerated,
                  )}
                </p>
                <p>
                  Recommendation Generated:{" "}
                  {statusText(
                    result.boundary
                      .recommendationGenerated,
                  )}
                </p>
                <p>
                  Planner Dispatched:{" "}
                  {statusText(
                    result.boundary
                      .plannerDispatched,
                  )}
                </p>
                <p>
                  Trading Executed:{" "}
                  {statusText(
                    result.boundary
                      .tradingExecuted,
                  )}
                </p>
                <p>
                  Human Verification Required:{" "}
                  {statusText(
                    context
                      .humanVerificationRequired,
                  )}
                </p>
                <p
                  style={{
                    opacity:
                      0.7,
                    marginTop:
                      "12px",
                  }}
                >
                  {
                    result.disclaimer
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
                }}
              >
                <h3>
                  Limitations
                </h3>
                {context.limitations.map(
                  (
                    item,
                  ) => (
                    <div
                      key={
                        item
                      }
                      style={{
                        marginBottom:
                          "6px",
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
