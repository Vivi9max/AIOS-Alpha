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
  MarketFundamentalDataContractResult,
} from "@/lib/runtime/market/market-fundamental-data-contract-types";

const FOUNDER_STORAGE_KEY =
  "aios-founder-access-key";

const ENDPOINT =
  "/api/founder/market/fundamental-data-contract";

export default function Page() {
  const [session, setSession] =
    useState(false);

  const [symbol, setSymbol] =
    useState("AAPL");

  const [market, setMarket] =
    useState<
      MarketRegion | ""
    >("us");

  const [result, setResult] =
    useState<
      MarketFundamentalDataContractResult | null
    >(null);

  const [regression, setRegression] =
    useState("");

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

  async function loadFundamentals() {
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

      const params =
        new URLSearchParams();

      params.set(
        "symbol",
        symbol.trim(),
      );

      if (market) {
        params.set(
          "market",
          market,
        );
      }

      const response =
        await fetch(
          `${ENDPOINT}?${params.toString()}`,
          {
            headers: {
              Accept:
                "application/json",

              Authorization:
                `Bearer ${key}`,
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
            "C162.1 fundamental contract failed.",
        );
      }

      setResult(
        payload as MarketFundamentalDataContractResult,
      );
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "C162.1 fundamental contract failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function runRegression() {
    setError("");
    setRegression("");
    setLoading(true);

    try {
      const key =
        refreshSession();

      if (!key) {
        throw new Error(
          "Founder Session not detected.",
        );
      }

      const response =
        await fetch(
          `${ENDPOINT}?regression=true`,
          {
            headers: {
              Accept:
                "application/json",

              Authorization:
                `Bearer ${key}`,
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
            "C162.1 regression failed.",
        );
      }

      setRegression(
        `${payload.code} · ${payload.passed}/${payload.total} checks passed`,
      );
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "C162.1 regression failed.",
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
            "1100px",

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
            Fundamental Data Contract
          </h2>

          <p
            style={{
              opacity:
                0.65,
            }}
          >
            C162.1 · Verifiable Fundamental Inputs
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
            Fundamental Data
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
                  .value as
                  | MarketRegion
                  | "",
              )
            }
            style={{
              width:
                "100%",

              padding:
                "12px",

              marginBottom:
                "12px",
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

          <button
            onClick={
              loadFundamentals
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
            Load Fundamental Data
          </button>
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
            C162.1 Runtime Regression
          </h3>

          <p
            style={{
              opacity:
                0.65,
            }}
          >
            C161.4 Human Review → C162.1 Fundamental Data → C149 Valuation
          </p>

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
            }}
          >
            Run Regression
          </button>

          {regression && (
            <p
              style={{
                color:
                  "#86efac",

                marginTop:
                  "16px",
              }}
            >
              {regression}
            </p>
          )}

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
              Fundamental Contract
            </h3>

            <p>
              {result.code}
            </p>

            <p>
              Symbol:{" "}
              {result.contract.symbol}
            </p>

            <p>
              Market:{" "}
              {result.contract.market}
            </p>

            <p>
              Data Quality:{" "}
              {result.contract.dataQuality}
            </p>

            <p>
              Available Metrics:{" "}
              {
                result.contract
                  .availableMetricCount
              }
              {" / "}
              {
                result.contract
                  .metrics.length
              }
            </p>

            <p>
              Verified Metrics:{" "}
              {
                result.contract
                  .verifiedMetricCount
              }
            </p>

            <div
              style={{
                marginTop:
                  "20px",
              }}
            >
              {result.contract.metrics.map(
                (metric) => (
                  <div
                    key={
                      metric.name
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
                      {metric.name}
                    </strong>

                    <div>
                      Value:{" "}
                      {metric.value ??
                        "N/A"}
                    </div>

                    <div>
                      Period:{" "}
                      {metric.period}
                    </div>

                    <div>
                      Quality:{" "}
                      {metric.quality}
                    </div>

                    <div>
                      As Of:{" "}
                      {metric.asOf ??
                        "N/A"}
                    </div>

                    <div>
                      Source:{" "}
                      {metric.source ??
                        "N/A"}
                    </div>
                  </div>
                ),
              )}
            </div>

            <div
              style={{
                marginTop:
                  "20px",

                opacity:
                  0.75,
              }}
            >
              {result.contract.limitations.map(
                (item) => (
                  <div
                    key={
                      item
                    }
                    style={{
                      marginBottom:
                        "6px",
                    }}
                  >
                    • {item}
                  </div>
                ),
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
