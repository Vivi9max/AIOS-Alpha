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
  MarketResearchInvalidationHumanReviewHistoryResult,
} from "@/lib/runtime/market/market-research-invalidation-human-review-history-types";

const FOUNDER_STORAGE_KEY =
  "aios-founder-access-key";

const ENDPOINT =
  "/api/founder/market/research-invalidation-human-review-history";

export default function Page() {
  const [session, setSession] =
    useState(false);

  const [ledgerId, setLedgerId] =
    useState("");

  const [symbol, setSymbol] =
    useState("");

  const [market, setMarket] =
    useState<MarketRegion | "">(
      "",
    );

  const [status, setStatus] =
    useState<
      "" |
      "pending" |
      "decided"
    >("");

  const [result, setResult] =
    useState<MarketResearchInvalidationHumanReviewHistoryResult | null>(
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
        ledgerId.trim()
      ) {
        params.set(
          "ledgerId",
          ledgerId.trim(),
        );
      }

      if (
        symbol.trim()
      ) {
        params.set(
          "symbol",
          symbol.trim(),
        );
      }

      if (
        market
      ) {
        params.set(
          "market",
          market,
        );
      }

      if (
        status
      ) {
        params.set(
          "status",
          status,
        );
      }

      params.set(
        "limit",
        "50",
      );

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
            "C161.4 history lookup failed.",
        );
      }

      setResult(
        payload as MarketResearchInvalidationHumanReviewHistoryResult,
      );
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "C161.4 history lookup failed.",
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
            "C161.4 regression failed.",
        );
      }

      setRegression(
        `${payload.code} · ${payload.passed}/${payload.total} checks passed`,
      );
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "C161.4 regression failed.",
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
            Human Review History
          </h2>

          <p
            style={{
              opacity:
                0.65,
            }}
          >
            C161.4 · Persistent Human Review Traceability
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
            Human Review History
          </h3>

          <input
            value={
              ledgerId
            }
            onChange={(event) =>
              setLedgerId(
                event.target.value,
              )
            }
            placeholder="C161.1 ledgerId (optional)"
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

          <input
            value={
              symbol
            }
            onChange={(event) =>
              setSymbol(
                event.target.value,
              )
            }
            placeholder="Symbol (optional)"
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
                  .value as MarketRegion | "",
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
            <option value="">
              All Markets
            </option>

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

          <select
            value={
              status
            }
            onChange={(event) =>
              setStatus(
                event.target
                  .value as
                  | ""
                  | "pending"
                  | "decided",
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
            <option value="">
              All Review Status
            </option>

            <option value="pending">
              Pending
            </option>

            <option value="decided">
              Decided
            </option>
          </select>

          <button
            onClick={
              loadHistory
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
            Load Review History
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
            C161.4 Runtime Regression
          </h3>

          <p
            style={{
              opacity:
                0.65,
            }}
          >
            C161.1 Ledger → C161.2 History → C161.3 Human Review → C161.4 Review History → C152 Boundary
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
              Traceable Review Records
            </h3>

            <div
              style={{
                marginBottom:
                  "16px",

                opacity:
                  0.7,
              }}
            >
              {result.total} review record(s)
            </div>

            {result.items.map(
              (item) => (
                <article
                  key={
                    item.reviewId
                  }
                  style={{
                    border:
                      "1px solid #3f3f46",

                    borderRadius:
                      "10px",

                    padding:
                      "16px",

                    marginBottom:
                      "12px",
                  }}
                >
                  <div>
                    <strong>
                      {item.symbol}
                    </strong>

                    {" · "}

                    {item.market}

                    {" · "}

                    {item.status}
                  </div>

                  <div
                    style={{
                      marginTop:
                        "8px",

                      opacity:
                        0.75,
                    }}
                  >
                    Ledger:{" "}
                    {item.ledgerId}
                  </div>

                  <div
                    style={{
                      marginTop:
                        "8px",
                    }}
                  >
                    Human Decision:{" "}
                    {item.decision ??
                      "PENDING"}
                  </div>

                  <div
                    style={{
                      marginTop:
                        "8px",

                      opacity:
                        0.75,
                    }}
                  >
                    Rationale:{" "}
                    {item.rationale ??
                      "—"}
                  </div>

                  <div
                    style={{
                      marginTop:
                        "8px",

                      opacity:
                        0.55,

                      fontSize:
                        "12px",
                    }}
                  >
                    Review ID:{" "}
                    {item.reviewId}
                  </div>
                </article>
              ),
            )}
          </section>
        )}
      </div>
    </main>
  );
}
