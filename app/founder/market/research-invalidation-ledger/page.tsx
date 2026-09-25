"use client";

import {
  useEffect,
  useState,
} from "react";

import type { CSSProperties } from "react";

import type {
  MarketResearchInvalidationLedgerResult,
} from "@/lib/runtime/market/market-research-invalidation-ledger-types";

export default function Page() {
  const [session, setSession] =
    useState(false);

  const [symbol, setSymbol] =
    useState("NVDA");

  const [market, setMarket] =
    useState("us");

  const [reconciliation, setReconciliation] =
    useState("");

  const [result, setResult] =
    useState<MarketResearchInvalidationLedgerResult | null>(
      null,
    );

  const [regression, setRegression] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    setSession(
      Boolean(
        sessionStorage.getItem(
          "aios-founder-session",
        ),
      ),
    );
  }, []);

  async function buildLedger() {
    setError("");
    setResult(null);

    try {
      const parsed =
        JSON.parse(
          reconciliation,
        );

      const response =
        await fetch(
          "/api/founder/market/research-invalidation-ledger",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              reconciliation:
                parsed,
            }),
          },
        );

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload.error ||
            payload.code ||
            "C161.1 failed.",
        );
      }

      setResult(payload);
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Invalid C160 JSON.",
      );
    }
  }

  async function runRegression() {
    setError("");
    setRegression("");

    try {
      const response =
        await fetch(
          "/api/founder/market/research-invalidation-ledger?regression=true",
          {
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
            "C161.1 regression failed.",
        );
      }

      setRegression(
        `${payload.code} · ${payload.passed}/${payload.total} checks passed`,
      );
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "C161.1 regression failed.",
      );
    }
  }

  const box: CSSProperties = {
    marginTop: 18,
    border:
      "1px solid #222",
    borderRadius: 14,
    padding: 16,
    background: "#0d0d0d",
  };

  const input: CSSProperties = {
    width: "100%",
    boxSizing:
      "border-box",
    border:
      "1px solid #333",
    borderRadius: 8,
    padding: 10,
    background: "#111",
    color: "#eee",
    fontFamily:
      "monospace",
    fontSize: 11,
  };

  return (
    <main
      style={{
        minHeight:
          "100vh",
        background:
          "#070707",
        color: "#eee",
        padding:
          "38px 20px",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin:
            "0 auto",
        }}
      >
        <div
          style={{
            color: "#777",
            letterSpacing: 3,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          PRIVATE FOUNDER ACCESS
        </div>

        <h1
          style={{
            fontSize: 40,
            lineHeight: 1.05,
            margin:
              "18px 0 8px",
            fontWeight: 800,
          }}
        >
          AIOS Market Research
          <br />
          Invalidation Ledger
        </h1>

        <div
          style={{
            color: "#777",
            fontSize: 17,
            fontWeight: 700,
          }}
        >
          C161.1 · C160 Reconciliation → Human Review Ledger
        </div>

        <section style={box}>
          <strong>
            Founder Session
          </strong>

          <div
            style={{
              marginTop: 6,
              color: session
                ? "#86efac"
                : "#fca5a5",
              fontSize: 12,
            }}
          >
            {session
              ? "Founder Session detected"
              : "Founder Session not detected"}
          </div>
        </section>

        <section style={box}>
          <h2
            style={{
              marginTop: 0,
            }}
          >
            C160 Reconciliation Input
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 120px",
              gap: 10,
            }}
          >
            <input
              value={symbol}
              onChange={(event) =>
                setSymbol(
                  event.target.value.toUpperCase(),
                )
              }
              style={input}
            />

            <select
              value={market}
              onChange={(event) =>
                setMarket(
                  event.target.value,
                )
              }
              style={input}
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
            value={reconciliation}
            onChange={(event) =>
              setReconciliation(
                event.target.value,
              )
            }
            placeholder="Paste actual C160 reconciliation JSON here."
            rows={18}
            style={{
              ...input,
              marginTop: 10,
            }}
          />

          <button
            disabled={
              !session ||
              !reconciliation
            }
            onClick={
              buildLedger
            }
            style={{
              marginTop: 10,
              padding:
                "10px 15px",
              border:
                "1px solid #444",
              borderRadius: 9,
              background:
                "#151515",
              color: "#eee",
              cursor:
                !session ||
                !reconciliation
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            Build Review Ledger
          </button>

          {error && (
            <div
              style={{
                marginTop: 10,
                color:
                  "#fca5a5",
                fontSize: 12,
                whiteSpace:
                  "pre-wrap",
              }}
            >
              {error}
            </div>
          )}
        </section>

        {result?.ledger && (
          <section style={box}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
              }}
            >
              {result.ledger.symbol}
            </div>

            <div
              style={{
                color: "#777",
                marginTop: 4,
              }}
            >
              C161.1 ·{" "}
              {result.ledger.status}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(160px,1fr))",
                gap: 8,
                marginTop: 15,
              }}
            >
              <div
                style={{
                  border:
                    "1px solid #222",
                  padding: 10,
                }}
              >
                Conditions:{" "}
                {
                  result.ledger
                    .invalidationConditions
                    .length
                }
              </div>

              <div
                style={{
                  border:
                    "1px solid #222",
                  padding: 10,
                }}
              >
                Findings:{" "}
                {
                  result.ledger
                    .findings.length
                }
              </div>

              <div
                style={{
                  border:
                    "1px solid #222",
                  padding: 10,
                }}
              >
                Evidence:{" "}
                {result.ledger
                  .reconciliation
                  .evidenceVerified
                  ? "verified"
                  : "not verified"}
              </div>

              <div
                style={{
                  border:
                    "1px solid #222",
                  padding: 10,
                }}
              >
                Return:{" "}
                {result.ledger
                  .reconciliation
                  .totalReturnPercent
                  .toFixed(2)}
                %
              </div>

              <div
                style={{
                  border:
                    "1px solid #222",
                  padding: 10,
                }}
              >
                Net:{" "}
                {result.ledger
                  .reconciliation
                  .netProfit
                  .toFixed(2)}
              </div>

              <div
                style={{
                  border:
                    "1px solid #222",
                  padding: 10,
                }}
              >
                Review: pending
              </div>
            </div>

            <h3
              style={{
                marginTop: 22,
              }}
            >
              Invalidation Conditions
            </h3>

            {result.ledger
              .invalidationConditions
              .map(
                (
                  condition,
                  index,
                ) => (
                  <div
                    key={index}
                    style={{
                      border:
                        "1px solid #222",
                      borderRadius: 8,
                      padding: 10,
                      marginTop: 8,
                      color:
                        "#aaa",
                      fontSize: 12,
                      lineHeight: 1.6,
                    }}
                  >
                    {condition}
                  </div>
                ),
              )}

            <div
              style={{
                marginTop: 18,
                padding: 12,
                border:
                  "1px solid #333",
                borderRadius: 8,
                color: "#999",
                fontSize: 11,
                lineHeight: 1.7,
              }}
            >
              Human Review Required.
              <br />
              C161.1 preserves the
              invalidation conditions.
              It does not determine
              whether any condition has
              been triggered.
            </div>
          </section>
        )}

        <section style={box}>
          <strong>
            C161.1 Runtime Regression
          </strong>

          <div
            style={{
              color: "#666",
              fontSize: 11,
              marginTop: 5,
            }}
          >
            C160 → Invalidation Ledger → Human Review Boundary
          </div>

          <button
            disabled={!session}
            onClick={
              runRegression
            }
            style={{
              marginTop: 12,
              padding:
                "10px 14px",
              border:
                "1px solid #333",
              borderRadius: 9,
              background:
                "transparent",
              color: "#ddd",
            }}
          >
            Run Regression
          </button>

          {regression && (
            <div
              style={{
                marginTop: 12,
                color:
                  "#86efac",
                fontSize: 12,
              }}
            >
              {regression}
            </div>
          )}
        </section>

        <footer
          style={{
            marginTop: 18,
            color: "#555",
            fontSize: 11,
            lineHeight: 1.7,
          }}
        >
          C157 Human Decision → C158 Paper Trade Gate → C151 Paper Trading → C159 Performance Review → C160 Research ↔ Outcome Reconciliation → C161.1 Research Invalidation Ledger → C152 Live Trading Boundary.
        </footer>
      </div>
    </main>
  );
}
