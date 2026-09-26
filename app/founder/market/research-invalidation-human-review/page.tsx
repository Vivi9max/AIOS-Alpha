"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type {
  MarketResearchInvalidationHumanReviewDecision,
  MarketResearchInvalidationHumanReviewResult,
} from "@/lib/runtime/market/market-research-invalidation-human-review-types";

const FOUNDER_STORAGE_KEY =
  "aios-founder-access-key";

const ENDPOINT =
  "/api/founder/market/research-invalidation-human-review";

export default function Page() {
  const [session, setSession] =
    useState(false);

  const [ledgerId, setLedgerId] =
    useState("");

  const [decision, setDecision] =
    useState<MarketResearchInvalidationHumanReviewDecision>(
      "request-research-update",
    );

  const [rationale, setRationale] =
    useState("");

  const [result, setResult] =
    useState<MarketResearchInvalidationHumanReviewResult | null>(
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

  async function loadReview() {
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

      if (!ledgerId.trim()) {
        throw new Error(
          "Please enter a C161.1 ledgerId.",
        );
      }

      const response =
        await fetch(
          `${ENDPOINT}?ledgerId=${encodeURIComponent(
            ledgerId.trim(),
          )}`,
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
            "C161.3 review lookup failed.",
        );
      }

      setResult(
        payload as MarketResearchInvalidationHumanReviewResult,
      );
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "C161.3 review lookup failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitDecision() {
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

      if (!ledgerId.trim()) {
        throw new Error(
          "Please enter a C161.1 ledgerId.",
        );
      }

      if (!rationale.trim()) {
        throw new Error(
          "Human rationale is required.",
        );
      }

      const response =
        await fetch(
          ENDPOINT,
          {
            method:
              "POST",

            headers: {
              Accept:
                "application/json",

              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${key}`,
            },

            body:
              JSON.stringify({
                ledgerId:
                  ledgerId.trim(),

                decision,

                rationale:
                  rationale.trim(),
              }),

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
            "C161.3 decision submission failed.",
        );
      }

      setResult(
        payload as MarketResearchInvalidationHumanReviewResult,
      );
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "C161.3 decision submission failed.",
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
            "C161.3 regression failed.",
        );
      }

      setRegression(
        `${payload.code} · ${payload.passed}/${payload.total} checks passed`,
      );
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "C161.3 regression failed.",
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
            "980px",
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
            Human Review Gate
          </h2>

          <p
            style={{
              opacity:
                0.65,
            }}
          >
            C161.3 · Explicit Human Review
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
            C161.1 Ledger
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
            placeholder="C161.1 ledgerId"
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
              loadReview
            }
            disabled={
              loading
            }
            style={{
              padding:
                "10px 16px",
              marginRight:
                "8px",
            }}
          >
            Load Human Review
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
            Explicit Human Decision
          </h3>

          <select
            value={
              decision
            }
            onChange={(event) =>
              setDecision(
                event.target
                  .value as MarketResearchInvalidationHumanReviewDecision,
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
            <option value="accept-current-research">
              Accept Current Research
            </option>

            <option value="invalidate-current-research">
              Invalidate Current Research
            </option>

            <option value="request-research-update">
              Request Research Update
            </option>
          </select>

          <textarea
            value={
              rationale
            }
            onChange={(event) =>
              setRationale(
                event.target.value,
              )
            }
            placeholder="Human rationale — required"
            rows={
              6
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
              submitDecision
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
            Record Human Decision
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
          }}
        >
          <h3>
            C161.3 Runtime Regression
          </h3>

          <p
            style={{
              opacity:
                0.65,
            }}
          >
            C161.2 Persistent Ledger → C161.3 Human Review → C152 Live Trading Boundary
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
              marginTop:
                "20px",
              border:
                "1px solid #27272a",
              borderRadius:
                "12px",
              padding:
                "20px",
            }}
          >
            <h3>
              Review Result
            </h3>

            <pre
              style={{
                whiteSpace:
                  "pre-wrap",
                overflowX:
                  "auto",
                opacity:
                  0.85,
              }}
            >
              {JSON.stringify(
                result,
                null,
                2,
              )}
            </pre>
          </section>
        )}
      </div>
    </main>
  );
}
