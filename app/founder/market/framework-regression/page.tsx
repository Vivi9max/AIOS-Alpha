"use client";

import {
  useEffect,
  useState,
} from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

type Check = {
  name: string;
  passed: boolean;
  detail: string;
};

type RegressionResult = {
  name: string;
  passed: boolean;
  checks: Check[];
  decision: string;
  stages: string[];
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
  results: RegressionResult[];
  principle: string;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        marginTop: 16,
        padding: 16,
        borderRadius: 14,
        border:
          "1px solid rgba(255,255,255,0.10)",
        background:
          "rgba(255,255,255,0.035)",
      }}
    >
      <h2
        style={{
          margin: "0 0 12px",
          fontSize: 16,
        }}
      >
        {title}
      </h2>

      {children}
    </section>
  );
}

export default function MarketFrameworkRegressionPage() {
  const [
    founderReady,
    setFounderReady,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    response,
    setResponse,
  ] =
    useState<RegressionResponse | null>(
      null,
    );

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    const key =
      window.sessionStorage.getItem(
        STORAGE_KEY,
      );

    setFounderReady(
      Boolean(key),
    );
  }, []);

  async function runRegression() {
    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const key =
        window.sessionStorage.getItem(
          STORAGE_KEY,
        );

      if (!key) {
        throw new Error(
          "Founder Session not found. Open Founder Console first.",
        );
      }

      const result =
        await fetch(
          "/api/founder/market/framework-regression",
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Authorization:
                `Bearer ${key}`,

              "x-aios-founder-key":
                key,
            },
          },
        );

      const data =
        (await result.json()) as RegressionResponse;

      if (
        !result.ok &&
        !data.code
      ) {
        throw new Error(
          `Regression request failed with HTTP ${result.status}.`,
        );
      }

      setResponse(data);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "C147.4 regression failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#09090b",
        color: "#fff",
        padding: "24px 16px 60px",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            opacity: 0.55,
            fontSize: 12,
            letterSpacing: 1,
          }}
        >
          PRIVATE FOUNDER ACCESS
        </div>

        <h1
          style={{
            margin: "8px 0 4px",
            fontSize: 28,
          }}
        >
          Market Framework Regression
        </h1>

        <p
          style={{
            marginTop: 0,
            opacity: 0.65,
            lineHeight: 1.6,
          }}
        >
          C147.4 · Industry · Company ·
          Fundamentals · Valuation · Risk ·
          Evidence · Identity Guard
        </p>

        <Section title="Founder Session">
          <div
            style={{
              lineHeight: 1.8,
              fontSize: 13,
            }}
          >
            Session:{" "}
            <strong
              style={{
                color:
                  founderReady
                    ? "#86efac"
                    : "#fca5a5",
              }}
            >
              {founderReady
                ? "PASS"
                : "NOT DETECTED"}
            </strong>

            <br />

            Authentication:{" "}
            {founderReady
              ? "Current Founder Console session will be reused."
              : "Open Founder Console first."}
          </div>

          <button
            onClick={
              runRegression
            }
            disabled={
              loading ||
              !founderReady
            }
            style={{
              marginTop: 14,
              width: "100%",
              padding: "14px 16px",
              borderRadius: 10,
              border: "none",
              background:
                loading ||
                !founderReady
                  ? "#3f3f46"
                  : "#fff",
              color:
                loading ||
                !founderReady
                  ? "#aaa"
                  : "#09090b",
              fontWeight: 700,
              cursor:
                loading
                  ? "wait"
                  : "pointer",
            }}
          >
            {loading
              ? "Running Regression…"
              : "▶ Run C147.4 Regression"}
          </button>
        </Section>

        <Section title="Behavioral Test Cases">
          <div
            style={{
              lineHeight: 1.8,
              fontSize: 13,
              opacity: 0.75,
            }}
          >
            1. Full Industry → Company →
            Fundamentals → Valuation → Risk →
            Evidence pipeline
            <br />
            2. Restrictive valuation gate
            <br />
            3. Invalid security identity rejection
            <br />
            4. US / HK / A-share multi-market
            pipeline
          </div>
        </Section>

        {error && (
          <Section title="Error">
            <div
              style={{
                color: "#fca5a5",
                lineHeight: 1.6,
              }}
            >
              {error}
            </div>
          </Section>
        )}

        {response && (
          <>
            <Section title="Regression Summary">
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color:
                    response.verified
                      ? "#86efac"
                      : "#fca5a5",
                }}
              >
                {response.code}
              </div>

              <div
                style={{
                  marginTop: 10,
                  lineHeight: 1.8,
                  fontSize: 13,
                  opacity: 0.75,
                }}
              >
                Passed:
                {" "}
                {response.passed}

                {" · Failed: "}
                {response.failed}

                {" · Total: "}
                {response.total}

                <br />

                Stage:
                {" "}
                {response.stage}

                <br />

                Mode:
                {" "}
                {response.verificationMode}

                <br />

                Runtime:
                {" "}
                {response.runtimeMs}
                {" ms"}
              </div>
            </Section>

            {response.results.map(
              (result, index) => (
                <Section
                  key={result.name}
                  title={`${index + 1}. ${result.name}`}
                >
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color:
                        result.passed
                          ? "#86efac"
                          : "#fca5a5",
                    }}
                  >
                    {result.passed
                      ? "PASS"
                      : "FAIL"}

                    {" · "}

                    {result.decision}
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      opacity: 0.65,
                    }}
                  >
                    Latency:
                    {" "}
                    {result.latencyMs}
                    {" ms"}
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                    }}
                  >
                    {result.checks.map(
                      (
                        item,
                        checkIndex,
                      ) => (
                        <div
                          key={`${item.name}-${checkIndex}`}
                          style={{
                            padding:
                              "8px 0",
                            borderTop:
                              "1px solid rgba(255,255,255,0.06)",
                            fontSize: 12,
                            lineHeight: 1.5,
                          }}
                        >
                          <strong
                            style={{
                              color:
                                item.passed
                                  ? "#86efac"
                                  : "#fca5a5",
                            }}
                          >
                            {item.passed
                              ? "✓"
                              : "✕"}{" "}
                            {
                              item.name
                            }
                          </strong>

                          <div
                            style={{
                              marginTop:
                                2,
                              opacity:
                                0.65,
                            }}
                          >
                            {
                              item.detail
                            }
                          </div>
                        </div>
                      ),
                    )}
                  </div>

                  {result.stages
                    .length >
                    0 && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 10,
                        borderRadius: 9,
                        background:
                          "rgba(255,255,255,0.04)",
                        fontSize: 11,
                        lineHeight: 1.6,
                        opacity: 0.7,
                      }}
                    >
                      Stages:
                      <br />
                      {result.stages.join(
                        " → ",
                      )}
                    </div>
                  )}
                </Section>
              ),
            )}

            <Section title="Principle">
              <div
                style={{
                  opacity: 0.65,
                  fontSize: 12,
                  lineHeight: 1.7,
                }}
              >
                {response.principle}
              </div>
            </Section>
          </>
        )}
      </div>
    </main>
  );
}
