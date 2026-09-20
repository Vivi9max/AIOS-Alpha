"use client";

import {
  useState,
} from "react";

type Check = {
  name: string;
  passed: boolean;
  detail: string;
};

type Result = {
  name: string;
  passed: boolean;
  code: string;
  decision: string;
  symbol: string;
  market: string;
  evidenceSources: number;
  independentDomains: number;
  identityReason: string;
  checks: Check[];
  latencyMs: number;
};

type RegressionResponse = {
  success: boolean;
  code: string;
  stage: string;
  verified: boolean;
  passed: number;
  failed: number;
  total: number;
  verificationMode: string;
  runtimeMs: number;
  results: Result[];
  principle: string;
  disclaimer: string;
};

export default function MarketIdentityRegressionPage() {
  const [
    running,
    setRunning,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    data,
    setData,
  ] =
    useState<RegressionResponse | null>(
      null,
    );

  async function runRegression() {
    setRunning(true);
    setError(null);

    try {
      const accessKey =
        sessionStorage.getItem(
          "aios-founder-access-key",
        );

      const headers: HeadersInit = {};

      if (accessKey) {
        headers.Authorization =
          `Bearer ${accessKey}`;

        headers[
          "x-aios-founder-key"
        ] = accessKey;
      }

      const response =
        await fetch(
          "/api/founder/market/identity-regression",
          {
            method: "GET",
            headers,
            cache: "no-store",
          },
        );

      const payload =
        (await response.json()) as
          | RegressionResponse
          | {
              error?: string;
              code?: string;
            };

      if (!response.ok) {
        throw new Error(
          "error" in payload
            ? payload.error ??
                payload.code ??
                "Regression request failed."
            : "Regression request failed.",
        );
      }

      setData(
        payload as RegressionResponse,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unknown regression error.",
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: 24,
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 12,
            letterSpacing: 1.2,
            fontWeight: 700,
            opacity: 0.65,
          }}
        >
          PRIVATE FOUNDER ACCESS
        </div>

        <h1
          style={{
            margin:
              "8px 0 4px",
          }}
        >
          Market Identity Regression
        </h1>

        <div
          style={{
            opacity: 0.7,
          }}
        >
          C147.3.3 · Security identity verification · generic evidence rejection · US / HK / A-share
        </div>
      </div>

      <section
        style={{
          padding: 16,
          border:
            "1px solid rgba(127,127,127,.25)",
          borderRadius: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          Founder Session
        </div>

        <div
          style={{
            opacity: 0.7,
          }}
        >
          Current Founder Console session will be reused.
        </div>

        <button
          onClick={runRegression}
          disabled={running}
          style={{
            marginTop: 16,
            padding:
              "11px 16px",
            borderRadius: 9,
            border: "none",
            cursor:
              running
                ? "wait"
                : "pointer",
            fontWeight: 700,
          }}
        >
          {running
            ? "Running..."
            : "▶ Run C147.3.3 Identity Regression"}
        </button>
      </section>

      {error && (
        <section
          style={{
            padding: 16,
            borderRadius: 12,
            marginBottom: 20,
            border:
              "1px solid rgba(200,50,50,.35)",
          }}
        >
          <strong>Error</strong>
          <div
            style={{
              marginTop: 6,
            }}
          >
            {error}
          </div>
        </section>
      )}

      {data && (
        <>
          <section
            style={{
              padding: 16,
              border:
                "1px solid rgba(127,127,127,.25)",
              borderRadius: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
              }}
            >
              {data.code}
            </div>

            <div
              style={{
                marginTop: 8,
              }}
            >
              Passed: {data.passed} · Failed:{" "}
              {data.failed} · Total:{" "}
              {data.total}
            </div>

            <div
              style={{
                marginTop: 6,
                opacity: 0.7,
              }}
            >
              Stage: {data.stage} · Mode:{" "}
              {data.verificationMode} · Runtime:{" "}
              {data.runtimeMs} ms
            </div>
          </section>

          {data.results.map(
            (result, index) => (
              <section
                key={result.name}
                style={{
                  padding: 16,
                  border:
                    "1px solid rgba(127,127,127,.25)",
                  borderRadius: 12,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 16,
                  }}
                >
                  {index + 1}.{" "}
                  {result.name}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 700,
                  }}
                >
                  {result.passed
                    ? "PASS"
                    : "FAIL"}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    opacity: 0.75,
                  }}
                >
                  {result.symbol} ·{" "}
                  {result.market} · Decision:{" "}
                  {result.decision}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    opacity: 0.75,
                  }}
                >
                  Evidence:{" "}
                  {result.evidenceSources}{" "}
                  sources /{" "}
                  {result.independentDomains}{" "}
                  domains ·{" "}
                  {result.latencyMs} ms
                </div>

                <div
                  style={{
                    marginTop: 12,
                    fontSize: 13,
                    opacity: 0.75,
                  }}
                >
                  Identity:
                  {" "}
                  {result.identityReason}
                </div>

                <div
                  style={{
                    marginTop: 14,
                  }}
                >
                  {result.checks.map(
                    (check) => (
                      <div
                        key={
                          check.name
                        }
                        style={{
                          padding:
                            "5px 0",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                          }}
                        >
                          {check.passed
                            ? "✓"
                            : "✕"}{" "}
                          {check.name}
                        </span>

                        <div
                          style={{
                            marginLeft: 20,
                            opacity:
                              0.68,
                            fontSize: 13,
                          }}
                        >
                          {check.detail}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </section>
            ),
          )}

          <section
            style={{
              padding: 16,
              borderRadius: 12,
              opacity: 0.75,
              fontSize: 13,
            }}
          >
            {data.principle}

            <br />
            <br />

            {data.disclaimer}
          </section>
        </>
      )}
    </main>
  );
}
