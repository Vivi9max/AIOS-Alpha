"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

type RegressionResult = {
  id: string;
  symbol: string;
  market: string;
  success: boolean;
  verified: boolean;
  code: string;
  dataQuality: string;
  price: number | null;
  previousClose: number | null;
  changePercent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  afterHoursPrice: number | null;
  preMarketPrice: number | null;
  pe: number | null;
  pb: number | null;
  eps: number | null;
  revenue: number | null;
  revenueGrowth: number | null;
  fieldQuality: Record<string, string>;
  semantic: {
    regularSessionPrice?: unknown;
    afterHoursPrice?: unknown;
    preMarketPrice?: unknown;
    previousClose?: unknown;
    changePercent?: unknown;
  } | null;
  structuredDataVerified: boolean;
  webEvidence: boolean;
  sourceCount: number;
  independentDomains: number;
  freshness?: {
    freshness?: string;
    ageMinutes?: number | null;
    ageHours?: number | null;
    referenceTime?: string | null;
    reason?: string;
  };
  provider: string;
  error: string | null;
  latencyMs: number;
};

type RegressionResponse = {
  success?: boolean;
  verified?: boolean;
  code?: string;
  stage?: string;
  description?: string;
  total?: number;
  passed?: number;
  failed?: number;
  semanticChecks?: Record<
    string,
    boolean
  >;
  priceIntegrityChecks?: Record<
    string,
    boolean
  >;
  results?: RegressionResult[];
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
  passed: boolean;
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

function Value({
  value,
}: {
  value: unknown;
}) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return <>—</>;
  }

  if (
    typeof value === "number"
  ) {
    return (
      <>
        {Number.isInteger(value)
          ? value
          : value.toFixed(6)}
      </>
    );
  }

  return <>{String(value)}</>;
}

function CheckList({
  title,
  checks,
}: {
  title: string;
  checks?: Record<
    string,
    boolean
  >;
}) {
  if (!checks) {
    return null;
  }

  return (
    <Section title={title}>
      <div
        style={{
          display: "grid",
          gap: 8,
        }}
      >
        {Object.entries(
          checks,
        ).map(
          ([name, passed]) => (
            <div
              key={name}
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: 12,
                padding: 10,
                borderRadius: 9,
                background:
                  "rgba(255,255,255,0.04)",
                fontSize: 13,
              }}
            >
              <span>
                {name}
              </span>

              <Status
                passed={passed}
              />
            </div>
          ),
        )}
      </div>
    </Section>
  );
}

export default function MarketNormalizationRegressionPage() {
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
          "/api/founder/market/normalization-regression",
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
          : "Market normalization regression failed.",
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

        background:
          "#09090b",

        color:
          "#fff",

        padding:
          "24px 16px 60px",

        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth:
            960,

          margin:
            "0 auto",
        }}
      >
        <div
          style={{
            opacity:
              0.55,

            fontSize:
              12,

            letterSpacing:
              1,
          }}
        >
          PRIVATE FOUNDER ACCESS
        </div>

        <h1
          style={{
            margin:
              "8px 0 4px",

            fontSize:
              28,
          }}
        >
          Market Normalization Regression
        </h1>

        <p
          style={{
            marginTop:
              0,

            opacity:
              0.65,

            lineHeight:
              1.6,
          }}
        >
          C147.2.7.1 · Semantic normalization ·
          price integrity · ticker leakage guard ·
          US / HK / A-share verification
        </p>

        <Section title="Founder Session">
          <div
            style={{
              lineHeight:
                1.7,
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
        </Section>

        <Section title="Integrity Regression">
          <div
            style={{
              fontSize:
                13,

              lineHeight:
                1.8,

              opacity:
                0.78,
            }}
          >
            1. Regular / after-hours price separation
            <br />
            2. Annual change is not treated as daily change
            <br />
            3. P/E substring protection
            <br />
            4. Field confidence metadata
            <br />
            5. HK ticker → price leakage protection
            <br />
            6. CN ticker → price leakage protection
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
              marginTop:
                14,

              width:
                "100%",

              padding:
                "14px 16px",

              borderRadius:
                10,

              border:
                "none",

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

              fontWeight:
                700,

              cursor:
                loading
                  ? "wait"
                  : "pointer",
            }}
          >
            {loading
              ? "Running Regression…"
              : "▶ Run C147.2.7.1 Regression"}
          </button>
        </Section>

        {error && (
          <Section title="Error">
            <div
              style={{
                color:
                  "#fca5a5",

                lineHeight:
                  1.6,
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
                  fontSize:
                    21,

                  lineHeight:
                    1.8,
                }}
              >
                <Status
                  passed={
                    response.verified ===
                    true
                  }
                />

                {" · "}

                {response.passed ??
                  0}

                {" / "}

                {response.total ??
                  0}

                {" passed"}
              </div>

              <div
                style={{
                  marginTop:
                    12,

                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",

                  gap:
                    10,
                }}
              >
                <div
                  style={{
                    padding:
                      12,

                    borderRadius:
                      10,

                    background:
                      "rgba(74,222,128,0.08)",
                  }}
                >
                  Passed
                  <br />
                  <strong>
                    {response.passed ??
                      0}
                  </strong>
                </div>

                <div
                  style={{
                    padding:
                      12,

                    borderRadius:
                      10,

                    background:
                      "rgba(248,113,113,0.08)",
                  }}
                >
                  Failed
                  <br />
                  <strong>
                    {response.failed ??
                      0}
                  </strong>
                </div>

                <div
                  style={{
                    padding:
                      12,

                    borderRadius:
                      10,

                    background:
                      "rgba(255,255,255,0.05)",
                  }}
                >
                  Stage
                  <br />
                  <strong>
                    {response.stage ??
                      "unknown"}
                  </strong>
                </div>

                <div
                  style={{
                    padding:
                      12,

                    borderRadius:
                      10,

                    background:
                      "rgba(255,255,255,0.05)",
                  }}
                >
                  Runtime
                  <br />
                  <strong>
                    {response.metadata
                      ?.latencyMs ??
                      0}
                    ms
                  </strong>
                </div>
              </div>

              <pre
                style={{
                  marginTop:
                    14,

                  whiteSpace:
                    "pre-wrap",

                  fontSize:
                    12,

                  lineHeight:
                    1.5,

                  opacity:
                    0.65,
                }}
              >
                {JSON.stringify(
                  {
                    code:
                      response.code,

                    verified:
                      response.verified,

                    stage:
                      response.stage,
                  },
                  null,
                  2,
                )}
              </pre>
            </Section>

            <CheckList
              title="Semantic Checks"
              checks={
                response.semanticChecks
              }
            />

            <CheckList
              title="Price Integrity Checks"
              checks={
                response.priceIntegrityChecks
              }
            />

            {response.results?.map(
              (
                item,
                index,
              ) => (
                <Section
                  key={item.id}
                  title={`${index + 1}. ${item.symbol} · ${item.market}`}
                >
                  <div
                    style={{
                      lineHeight:
                        1.8,

                      fontSize:
                        13,
                    }}
                  >
                    Status:{" "}
                    <Status
                      passed={
                        item.success &&
                        item.verified
                      }
                    />

                    <br />

                    Code:{" "}
                    {item.code}

                    <br />

                    Provider:{" "}
                    {item.provider}

                    <br />

                    Data Quality:{" "}
                    {item.dataQuality}

                    <br />

                    Evidence:{" "}
                    {item.sourceCount}
                    {" sources / "}
                    {item.independentDomains}
                    {" domains"}

                    <br />

                    Verified:{" "}
                    {item.verified
                      ? "YES"
                      : "NO"}

                    <br />

                    Latency:{" "}
                    {item.latencyMs}
                    ms
                  </div>

                  <div
                    style={{
                      marginTop:
                        14,

                      display:
                        "grid",

                      gridTemplateColumns:
                        "repeat(2, minmax(0, 1fr))",

                      gap:
                        8,
                    }}
                  >
                    <div
                      style={{
                        padding:
                          12,

                        borderRadius:
                          10,

                        background:
                          "rgba(255,255,255,0.04)",
                      }}
                    >
                      Price
                      <br />
                      <strong>
                        <Value
                          value={
                            item.price
                          }
                        />
                      </strong>
                    </div>

                    <div
                      style={{
                        padding:
                          12,

                        borderRadius:
                          10,

                        background:
                          "rgba(255,255,255,0.04)",
                      }}
                    >
                      P/E
                      <br />
                      <strong>
                        <Value
                          value={
                            item.pe
                          }
                        />
                      </strong>
                    </div>

                    <div
                      style={{
                        padding:
                          12,

                        borderRadius:
                          10,

                        background:
                          "rgba(255,255,255,0.04)",
                      }}
                    >
                      P/B
                      <br />
                      <strong>
                        <Value
                          value={
                            item.pb
                          }
                        />
                      </strong>
                    </div>

                    <div
                      style={{
                        padding:
                          12,

                        borderRadius:
                          10,

                        background:
                          "rgba(255,255,255,0.04)",
                      }}
                    >
                      EPS
                      <br />
                      <strong>
                        <Value
                          value={
                            item.eps
                          }
                        />
                      </strong>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop:
                        14,
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          12,

                        opacity:
                          0.55,

                        marginBottom:
                          8,
                      }}
                    >
                      Field Quality
                    </div>

                    <pre
                      style={{
                        margin:
                          0,

                        padding:
                          12,

                        borderRadius:
                          10,

                        background:
                          "rgba(0,0,0,0.25)",

                        whiteSpace:
                          "pre-wrap",

                        overflowX:
                          "auto",

                        fontSize:
                          11,

                        lineHeight:
                          1.5,
                      }}
                    >
                      {JSON.stringify(
                        item.fieldQuality,
                        null,
                        2,
                      )}
                    </pre>
                  </div>

                  {item.error && (
                    <div
                      style={{
                        marginTop:
                          12,

                        padding:
                          12,

                        borderRadius:
                          10,

                        color:
                          "#fca5a5",

                        background:
                          "rgba(248,113,113,0.08)",

                        fontSize:
                          12,

                        lineHeight:
                          1.5,
                      }}
                    >
                      {item.error}
                    </div>
                  )}

                  <details
                    style={{
                      marginTop:
                        12,

                      fontSize:
                        12,

                      opacity:
                        0.65,
                    }}
                  >
                    <summary>
                      Semantic / Freshness Details
                    </summary>

                    <pre
                      style={{
                        marginTop:
                          10,

                        whiteSpace:
                          "pre-wrap",

                        overflowX:
                          "auto",

                        lineHeight:
                          1.5,
                      }}
                    >
                      {JSON.stringify(
                        {
                          semantic:
                            item.semantic,

                          freshness:
                            item.freshness,

                          previousClose:
                            item.previousClose,

                          changePercent:
                            item.changePercent,

                          open:
                            item.open,

                          high:
                            item.high,

                          low:
                            item.low,

                          volume:
                            item.volume,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                </Section>
              ),
            )}

            {response.metadata
              ?.disclaimer && (
              <div
                style={{
                  marginTop:
                    18,

                  fontSize:
                    12,

                  opacity:
                    0.45,

                  lineHeight:
                    1.6,
                }}
              >
                {
                  response.metadata
                    .disclaimer
                }
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
