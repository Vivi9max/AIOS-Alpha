"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type {
  CSSProperties,
} from "react";

import type {
  MarketRegion,
} from "@/lib/runtime/market/market-types";

import type {
  MarketResearchInvalidationLedgerHistoryResult,
} from "@/lib/runtime/market/market-research-invalidation-ledger-history-types";

const FOUNDER_STORAGE_KEY =
  "aios-founder-access-key";

const ENDPOINT =
  "/api/founder/market/research-invalidation-ledger-history";

export default function Page() {
  const [session, setSession] =
    useState(false);

  const [symbol, setSymbol] =
    useState("");

  const [market, setMarket] =
    useState<MarketRegion>("us");

  const [result, setResult] =
    useState<MarketResearchInvalidationLedgerHistoryResult | null>(
      null,
    );

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

    function handleStorage() {
      refreshSession();
    }

    window.addEventListener(
      "storage",
      handleStorage,
    );

    const interval =
      window.setInterval(
        refreshSession,
        1000,
      );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage,
      );

      window.clearInterval(
        interval,
      );
    };
  }, [refreshSession]);

  async function loadHistory() {
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

      const params =
        new URLSearchParams();

      if (
        symbol.trim()
      ) {
        params.set(
          "symbol",
          symbol
            .trim()
            .toUpperCase(),
        );
      }

      params.set(
        "market",
        market,
      );

      params.set(
        "limit",
        "50",
      );

      const response =
        await fetch(
          `${ENDPOINT}?${params.toString()}`,
          {
            method:
              "GET",

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
            "C161.2 history lookup failed.",
        );
      }

      setResult(
        payload as MarketResearchInvalidationLedgerHistoryResult,
      );
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "C161.2 history lookup failed.",
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
            method:
              "GET",

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
            "C161.2 regression failed.",
        );
      }

      setRegression(
        `${payload.code} · ${payload.passed}/${payload.total} checks passed`,
      );
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "C161.2 regression failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  const box: CSSProperties = {
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
  };

  const input: CSSProperties = {
    width:
      "100%",

    boxSizing:
      "border-box",

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

    fontFamily:
      "monospace",

    fontSize:
      12,
  };

  return (
    <main
      style={{
        minHeight:
          "100vh",

        background:
          "#070707",

        color:
          "#eee",

        padding:
          "38px 20px",
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
            color:
              "#777",

            letterSpacing:
              3,

            fontSize:
              12,

            fontWeight:
              700,
          }}
        >
          PRIVATE FOUNDER ACCESS
        </div>

        <h1
          style={{
            fontSize:
              40,

            lineHeight:
              1.05,

            margin:
              "18px 0 8px",

            fontWeight:
              800,
          }}
        >
          AIOS Market Research
          <br />
          Invalidation Ledger History
        </h1>

        <div
          style={{
            color:
              "#777",

            fontSize:
              17,

            fontWeight:
              700,
          }}
        >
          C161.2 · Persistent Ledger Traceability
        </div>

        <section
          style={box}
        >
          <strong>
            Founder Session
          </strong>

          <div
            style={{
              marginTop:
                6,

              color:
                session
                  ? "#86efac"
                  : "#fca5a5",

              fontSize:
                12,
            }}
          >
            {session
              ? "Founder Session detected"
              : "Founder Session not detected"}
          </div>
        </section>

        <section
          style={box}
        >
          <h2
            style={{
              marginTop:
                0,
            }}
          >
            Ledger History
          </h2>

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "1fr 140px",

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
                  event.target.value,
                )
              }
              placeholder="Symbol · blank = all"
              style={
                input
              }
            />

            <select
              value={
                market
              }
              onChange={(
                event,
              ) => {
                const value =
                  event.target.value;

                if (
                  value === "us" ||
                  value === "hk" ||
                  value === "cn"
                ) {
                  setMarket(
                    value,
                  );
                }
              }}
              style={
                input
              }
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

          <button
            type="button"
            disabled={
              !session ||
              loading
            }
            onClick={
              loadHistory
            }
            style={{
              marginTop:
                12,

              padding:
                "10px 15px",

              border:
                "1px solid #444",

              borderRadius:
                9,

              background:
                "#151515",

              color:
                !session ||
                loading
                  ? "#555"
                  : "#eee",

              cursor:
                !session ||
                loading
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {loading
              ? "Loading…"
              : "Load Ledger History"}
          </button>

          {error && (
            <div
              role="alert"
              style={{
                marginTop:
                  10,

                color:
                  "#fca5a5",

                fontSize:
                  12,

                whiteSpace:
                  "pre-wrap",
              }}
            >
              {error}
            </div>
          )}
        </section>

        {result && (
          <section
            style={box}
          >
            <div
              style={{
                color:
                  "#86efac",

                fontSize:
                  12,
              }}
            >
              {result.code}
            </div>

            <div
              style={{
                marginTop:
                  8,

                color:
                  "#999",

                fontSize:
                  12,
              }}
            >
              Records:{" "}
              {result.total}
              {" · "}
              Indexed:{" "}
              {result.index.entryCount}
            </div>

            {result.items.map(
              (item) => (
                <article
                  key={
                    item.ledgerId
                  }
                  style={{
                    marginTop:
                      12,

                    padding:
                      14,

                    border:
                      "1px solid #222",

                    borderRadius:
                      10,
                  }}
                >
                  <strong>
                    {item.symbol}
                    {" · "}
                    {item.market}
                  </strong>

                  <div
                    style={{
                      marginTop:
                        5,

                      color:
                        "#888",

                      fontSize:
                        11,

                      wordBreak:
                        "break-all",
                    }}
                  >
                    {item.ledgerId}
                  </div>

                  <div
                    style={{
                      marginTop:
                        8,

                      fontSize:
                        12,

                      color:
                        "#aaa",
                    }}
                  >
                    Status:{" "}
                    {item.status}
                    {" · "}
                    Conditions:{" "}
                    {
                      item.ledger
                        .invalidationConditions
                        .length
                    }
                  </div>

                  <div
                    style={{
                      marginTop:
                        8,

                      fontSize:
                        11,

                      color:
                        "#777",
                    }}
                  >
                    Created:{" "}
                    {item.createdAt}
                  </div>
                </article>
              ),
            )}

            {result.items.length ===
              0 && (
              <div
                style={{
                  marginTop:
                    15,

                  color:
                    "#777",

                  fontSize:
                    12,
                }}
              >
                No persistent C161.1 Ledger records found.
              </div>
            )}

            <div
              style={{
                marginTop:
                  18,

                padding:
                  12,

                border:
                  "1px solid #333",

                borderRadius:
                  8,

                color:
                  "#999",

                fontSize:
                  11,

                lineHeight:
                  1.7,
              }}
            >
              Human Review Required.
              <br />
              C161.2 only reads and traces existing
              C161.1 records.
              <br />
              Automatic invalidation: false.
              <br />
              Decision recording: false.
              <br />
              Planner dispatch: false.
              <br />
              Live trading: false.
            </div>
          </section>
        )}

        <section
          style={box}
        >
          <strong>
            C161.2 Runtime Regression
          </strong>

          <div
            style={{
              marginTop:
                5,

              color:
                "#666",

              fontSize:
                11,
            }}
          >
            C161.1 Persistent Ledger → History Index → Traceable Readback
          </div>

          <button
            type="button"
            disabled={
              !session ||
              loading
            }
            onClick={
              runRegression
            }
            style={{
              marginTop:
                12,

              padding:
                "10px 14px",

              border:
                "1px solid #333",

              borderRadius:
                9,

              background:
                "transparent",

              color:
                !session ||
                loading
                  ? "#555"
                  : "#ddd",

              cursor:
                !session ||
                loading
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {loading
              ? "Running…"
              : "Run Regression"}
          </button>

          {regression && (
            <div
              style={{
                marginTop:
                  12,

                color:
                  "#86efac",

                fontSize:
                  12,
              }}
            >
              {regression}
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
          C157 Human Decision → C158 Paper Trade Gate → C151 Paper Trading → C159 Performance Review → C160 Research ↔ Outcome Reconciliation → C161.1 Research Invalidation Ledger → C161.2 Persistent Ledger History → C152 Live Trading Boundary.
        </footer>
      </div>
    </main>
  );
}
