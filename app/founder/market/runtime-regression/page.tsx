"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

type RegressionCase = {
  id?: string;
  prompt?: string;
  success?: boolean;
  passed?: boolean;
  code?: string;
  symbol?: string;
  market?: string;
  mode?: string;
  resultAvailable?: boolean;
  provider?: string | null;
  providerAvailable?: boolean;
  structuredDataVerified?: boolean;
  webEvidenceAvailable?: boolean;
  dataQuality?: string | null;
  freshness?: {
    freshness?: string;
    ageMinutes?: number | null;
    ageHours?: number | null;
    referenceTime?: string | null;
  } | null;
  sourceCount?: number;
  independentDomains?: number;
  traceStages?: Array<{
    stage?: string;
    status?: string;
  }>;
  latencyMs?: number;
  error?: string | null;
};

type RegressionResponse = {
  success?: boolean;
  verified?: boolean;
  code?: string;
  stage?: string;
  total?: number;
  passed?: number;
  failed?: number;
  results?: RegressionCase[];
  metadata?: {
    generatedAt?: string;
    latencyMs?: number;
    disclaimer?: string;
  };
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
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

function Status({
  passed,
}: {
  passed?: boolean;
}) {
  return (
    <strong
      style={{
        color:
          passed
            ? "#86efac"
            : "#fca5a5",
      }}
    >
      {passed
        ? "PASS"
        : "FAIL"}
    </strong>
  );
}

export default function MarketRuntimeRegressionPage() {
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
  ] = useState<string | null>(
    null,
  );

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
    setError(null);
    setResponse(null);

    try {
      const key =
        window.sessionStorage.getItem(
          STORAGE_KEY,
        );

      if (!key) {
        throw new Error(
          "Founder Session not found. Open the Founder Console first.",
        );
      }

      const result =
        await fetch(
          "/api/founder/market/runtime-regression",
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

      const json =
        (await result.json()) as RegressionResponse;

      if (
        !result.ok &&
        !json.code
      ) {
        throw new Error(
          `Regression request failed with HTTP ${result.status}.`,
        );
      }

      setResponse(
        json,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unknown regression error.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px 16px 60px",
        background: "#09090b",
        color: "#fff",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 900,
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
          Market Runtime Regression
        </h1>

        <p
          style={{
            marginTop: 0,
            opacity: 0.65,
            lineHeight: 1.6,
          }}
        >
          C147.2.8.1 · Runtime symbol
          resolution · provider routing ·
          evidence · execution gate
        </p>

        <Section title="Founder Session">
          <div
            style={{
              lineHeight: 1.7,
            }}
          >
            Session:
            {" "}
            <Status
              passed={
                founderReady
              }
            />
            <br />
            Authentication:
            {" "}
            {founderReady
              ? "Current Founder Console session will be reused."
              : "Founder session not detected."}
          </div>
        </Section>

        <Section title="Regression Cases">
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.7,
              opacity: 0.72,
            }}
          >
            1. Explicit NVDA symbol
            <br />
            2. Natural-language NVDA
            <br />
            3. Hong Kong 0700.HK
            <br />
            4. A-share 600519.SH
            <br />
            5. Missing symbol protection
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
              marginTop: 16,
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
              : "▶ Run C147.2.8.1 Regression"}
          </button>
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
                  fontSize: 18,
                  lineHeight: 1.8,
                }}
              >
                <Status
                  passed={
                    response.success
                  }
                />
                {"  "}
                {response.passed ?? 0}
                {" / "}
                {response.total ?? 0}
                {" passed"}
              </div>

              <pre
                style={{
                  marginTop: 12,
                  whiteSpace: "pre-wrap",
                  fontSize: 12,
                  lineHeight: 1.5,
                  opacity: 0.72,
                }}
              >
                {JSON.stringify(
                  {
                    code:
                      response.code,
                    stage:
                      response.stage,
                    verified:
                      response.verified,
                    passed:
                      response.passed,
                    failed:
                      response.failed,
                    latencyMs:
                      response.metadata
                        ?.latencyMs,
                  },
                  null,
                  2,
                )}
              </pre>
            </Section>

            {response.results?.map(
              (
                item,
              ) => (
                <Section
                  key={
                    item.id
                  }
                  title={
                    item.id ??
                    "Regression Case"
                  }
                >
                  <div
                    style={{
                      lineHeight: 1.8,
                      fontSize: 13,
                    }}
                  >
                    <Status
                      passed={
                        item.passed
                      }
                    />
                    {"  "}
                    {item.prompt}
                    <br />

                    Code:
                    {" "}
                    <strong>
                      {item.code}
                    </strong>
                    <br />

                    Symbol:
                    {" "}
                    {item.symbol ||
                      "NONE"}
                    <br />

                    Market:
                    {" "}
                    {item.market}
                    <br />

                    Mode:
                    {" "}
                    {item.mode}
                    <br />

                    Result:
                    {" "}
                    {item.resultAvailable
                      ? "AVAILABLE"
                      : "NULL"}

                    {item.provider && (
                      <>
                        <br />
                        Provider:
                        {" "}
                        {item.provider}
                      </>
                    )}

                    {item.dataQuality && (
                      <>
                        <br />
                        Data quality:
                        {" "}
                        {item.dataQuality}
                      </>
                    )}

                    <br />

                    Web evidence:
                    {" "}
                    {item.webEvidenceAvailable
                      ? "YES"
                      : "NO"}

                    <br />

                    Structured data:
                    {" "}
                    {item.structuredDataVerified
                      ? "YES"
                      : "NO"}

                    <br />

                    Sources:
                    {" "}
                    {item.sourceCount ??
                      0}

                    <br />

                    Independent domains:
                    {" "}
                    {item.independentDomains ??
                      0}

                    <br />

                    Latency:
                    {" "}
                    {item.latencyMs ??
                      0}
                    ms
                  </div>

                  {item.freshness && (
                    <pre
                      style={{
                        marginTop: 12,
                        whiteSpace: "pre-wrap",
                        fontSize: 12,
                        opacity: 0.7,
                      }}
                    >
                      {JSON.stringify(
                        {
                          freshness:
                            item
                              .freshness
                              .freshness,
                          ageMinutes:
                            item
                              .freshness
                              .ageMinutes,
                          ageHours:
                            item
                              .freshness
                              .ageHours,
                          asOf:
                            item
                              .freshness
                              .referenceTime,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  )}

                  {item.traceStages && (
                    <div
                      style={{
                        marginTop: 12,
                      }}
                    >
                      <strong>
                        Runtime Trace
                      </strong>

                      {item.traceStages.map(
                        (
                          trace,
                          index,
                        ) => (
                          <div
                            key={`${trace.stage}-${index}`}
                            style={{
                              marginTop: 5,
                              padding:
                                "7px 9px",
                              borderRadius: 7,
                              background:
                                "rgba(255,255,255,0.04)",
                              fontSize: 12,
                            }}
                          >
                            {trace.stage ||
                              "unknown-stage"}
                            {" · "}
                            {trace.status ||
                              "unknown-status"}
                          </div>
                        ),
                      )}
                    </div>
                  )}

                  {item.error && (
                    <div
                      style={{
                        marginTop: 12,
                        color: "#fca5a5",
                        fontSize: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      {item.error}
                    </div>
                  )}
                </Section>
              ),
            )}

            <div
              style={{
                marginTop: 18,
                fontSize: 12,
                opacity: 0.45,
                lineHeight: 1.6,
              }}
            >
              {response.metadata
                ?.disclaimer}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
