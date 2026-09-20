"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

type ScreeningItem = {
  symbol?: string;
  market?: string;
  decision?: string;

  matchedCriteria?: string[];
  failedCriteria?: string[];
  missingCriteria?: string[];

  reasons?: string[];
  risks?: string[];

  analysis?: {
    snapshot?: {
      price?: number | null;
      pe?: number | null;
      pb?: number | null;
      eps?: number | null;
      revenueGrowth?: number | null;
      dataQuality?: string;
    };

    verification?: {
      sourceCount?: number;
      independentDomains?: number;
      verified?: boolean;
    };

    analysis?: {
      industry?: {
        summary?: string;
      };

      risk?: {
        level?: string;
      };
    };
  } | null;
};

type ScreeningResponse = {
  success?: boolean;

  code?: string;

  market?: string;

  universeSize?: number;

  evaluatedCount?: number;

  candidateCount?: number;

  excludedCount?: number;

  insufficientDataCount?: number;

  criteria?: Record<
    string,
    unknown
  >;

  items?: ScreeningItem[];

  runtime?: {
    name?: string;
    version?: string;
    generatedAt?: string;
    latencyMs?: number;
  };

  disclaimer?: string;

  error?: string;
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
        marginTop:
          16,

        padding:
          16,

        borderRadius:
          14,

        border:
          "1px solid rgba(255,255,255,0.10)",

        background:
          "rgba(255,255,255,0.035)",
      }}
    >
      <h2
        style={{
          margin:
            "0 0 12px",

          fontSize:
            16,
        }}
      >
        {title}
      </h2>

      {children}
    </section>
  );
}

function Status({
  value,
}: {
  value: string;
}) {
  const ok =
    value ===
    "candidate";

  const insufficient =
    value ===
    "insufficient-data";

  return (
    <strong
      style={{
        color:
          ok
            ? "#86efac"
            : insufficient
              ? "#facc15"
              : "#fca5a5",
      }}
    >
      {value}
    </strong>
  );
}

function List({
  items,
}: {
  items?: string[];
}) {
  if (
    !items?.length
  ) {
    return (
      <div
        style={{
          opacity:
            0.5,

          fontSize:
            12,
        }}
      >
        None
      </div>
    );
  }

  return (
    <ul
      style={{
        margin:
          0,

        paddingLeft:
          20,

        lineHeight:
          1.7,

        fontSize:
          13,
      }}
    >
      {items.map(
        (
          item,
          index,
        ) => (
          <li
            key={`${item}-${index}`}
          >
            {item}
          </li>
        ),
      )}
    </ul>
  );
}

export default function MarketScreeningPage() {
  const [
    founderReady,
    setFounderReady,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    market,
    setMarket,
  ] = useState("all");

  const [
    response,
    setResponse,
  ] =
    useState<ScreeningResponse | null>(
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

  async function runScreening() {
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
          "Founder Session not found. Open the Founder Console first.",
        );
      }

      const endpoint =
        market ===
          "all"
          ? "/api/founder/market/screen"
          : `/api/founder/market/screen?market=${encodeURIComponent(market)}`;

      const result =
        await fetch(
          endpoint,
          {
            method:
              "GET",

            cache:
              "no-store",

            headers: {
              Authorization:
                `Bearer ${key}`,

              "x-aios-founder-key":
                key,
            },
          },
        );

      const data =
        (await result.json()) as ScreeningResponse;

      if (
        !result.ok &&
        !data.code
      ) {
        throw new Error(
          `Screening request failed with HTTP ${result.status}.`,
        );
      }

      setResponse(
        data,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Market screening failed.",
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
          Market Screening Framework
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
          C147.3 · Industry → Company →
          Fundamentals → Valuation → Risk
        </p>

        <Section title="Founder Session">
          <div
            style={{
              lineHeight:
                1.7,
            }}
          >
            Session:
            {" "}
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

            Authentication:
            {" "}
            {founderReady
              ? "Current Founder Console session will be reused."
              : "Open Founder Console first."}
          </div>
        </Section>

        <Section title="Screening Method">
          <div
            style={{
              lineHeight:
                1.8,

              fontSize:
                13,

              opacity:
                0.8,
            }}
          >
            Industry filter
            {" → "}
            Company evidence
            {" → "}
            Fundamental conditions
            {" → "}
            Valuation conditions
            {" → "}
            Evidence quality
            {" → "}
            Risk conditions
            {" → "}
            Explainable candidate pool
          </div>
        </Section>

        <Section title="Market Universe">
          <select
            value={
              market
            }
            onChange={(
              event,
            ) =>
              setMarket(
                event.target.value,
              )
            }
            style={{
              width:
                "100%",

              boxSizing:
                "border-box",

              padding:
                "12px 13px",

              borderRadius:
                10,

              border:
                "1px solid rgba(255,255,255,0.15)",

              background:
                "#18181b",

              color:
                "#fff",
            }}
          >
            <option value="all">
              US + HK + A-share
            </option>

            <option value="us">
              US
            </option>

            <option value="hk">
              Hong Kong
            </option>

            <option value="cn">
              A-share
            </option>
          </select>

          <button
            onClick={
              runScreening
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
              ? "Running Screening…"
              : "▶ Run C147.3 Screening"}
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
            <Section title="Screening Summary">
              <div
                style={{
                  fontSize:
                    18,

                  lineHeight:
                    1.8,
                }}
              >
                <Status
                  value={
                    response.success
                      ? "candidate"
                      : "insufficient-data"
                  }
                />

                {" · "}

                {response.evaluatedCount ??
                  0}
                {" / "}
                {response.universeSize ??
                  0}
                {" evaluated"}
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
                  Candidates
                  <br />
                  <strong>
                    {
                      response.candidateCount ??
                      0
                    }
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
                  Excluded
                  <br />
                  <strong>
                    {
                      response.excludedCount ??
                      0
                    }
                  </strong>
                </div>

                <div
                  style={{
                    padding:
                      12,

                    borderRadius:
                      10,

                    background:
                      "rgba(250,204,21,0.08)",
                  }}
                >
                  Insufficient Data
                  <br />
                  <strong>
                    {
                      response.insufficientDataCount ??
                      0
                    }
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
                    {
                      response.runtime
                        ?.latencyMs ??
                      0
                    }
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

                    market:
                      response.market,

                    runtime:
                      response.runtime,
                  },
                  null,
                  2,
                )}
              </pre>
            </Section>

            <Section title="Screening Criteria">
              <pre
                style={{
                  margin:
                    0,

                  whiteSpace:
                    "pre-wrap",

                  fontSize:
                    12,

                  lineHeight:
                    1.6,

                  opacity:
                    0.7,
                }}
              >
                {JSON.stringify(
                  response.criteria,
                  null,
                  2,
                )}
              </pre>
            </Section>

            {response.items?.map(
              (
                item,
                index,
              ) => {
                const snapshot =
                  item.analysis
                    ?.snapshot;

                const verification =
                  item.analysis
                    ?.verification;

                const industry =
                  item.analysis
                    ?.analysis
                    ?.industry;

                const risk =
                  item.analysis
                    ?.analysis
                    ?.risk;

                return (
                  <Section
                    key={`${item.market}-${item.symbol}-${index}`}
                    title={`${item.symbol ?? "UNKNOWN"} · ${item.market ?? "unknown"}`}
                  >
                    <div
                      style={{
                        lineHeight:
                          1.8,

                        fontSize:
                          13,
                      }}
                    >
                      Decision:
                      {" "}
                      <Status
                        value={
                          item.decision ??
                          "insufficient-data"
                        }
                      />

                      <br />

                      Industry:
                      {" "}
                      {
                        industry
                          ?.summary ??
                        "Unknown"
                      }

                      <br />

                      Risk:
                      {" "}
                      {
                        risk
                          ?.level ??
                        "unknown"
                      }

                      <br />

                      Data quality:
                      {" "}
                      {
                        snapshot
                          ?.dataQuality ??
                        "unknown"
                      }

                      <br />

                      Evidence:
                      {" "}
                      {
                        verification
                          ?.sourceCount ??
                        0
                      }
                      {" sources / "}
                      {
                        verification
                          ?.independentDomains ??
                        0
                      }
                      {" domains"}
                    </div>

                    {snapshot && (
                      <pre
                        style={{
                          marginTop:
                            12,

                          whiteSpace:
                            "pre-wrap",

                          fontSize:
                            12,

                          lineHeight:
                            1.5,

                          opacity:
                            0.72,
                        }}
                      >
                        {JSON.stringify(
                          {
                            price:
                              snapshot.price,

                            pe:
                              snapshot.pe,

                            pb:
                              snapshot.pb,

                            eps:
                              snapshot.eps,

                            revenueGrowth:
                              snapshot.revenueGrowth,
                          },
                          null,
                          2,
                        )}
                      </pre>
                    )}

                    <h3
                      style={{
                        fontSize:
                          14,

                        marginTop:
                          16,
                      }}
                    >
                      Matched Criteria
                    </h3>

                    <List
                      items={
                        item.matchedCriteria
                      }
                    />

                    <h3
                      style={{
                        fontSize:
                          14,

                        marginTop:
                          16,
                      }}
                    >
                      Failed Criteria
                    </h3>

                    <List
                      items={
                        item.failedCriteria
                      }
                    />

                    <h3
                      style={{
                        fontSize:
                          14,

                        marginTop:
                          16,
                      }}
                    >
                      Missing Data
                    </h3>

                    <List
                      items={
                        item.missingCriteria
                      }
                    />

                    <h3
                      style={{
                        fontSize:
                          14,

                        marginTop:
                          16,
                      }}
                    >
                      Why
                    </h3>

                    <List
                      items={
                        item.reasons
                      }
                    />

                    <h3
                      style={{
                        fontSize:
                          14,

                        marginTop:
                          16,
                      }}
                    >
                      Risks
                    </h3>

                    <List
                      items={
                        item.risks
                      }
                    />
                  </Section>
                );
              },
            )}

            {response.disclaimer && (
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
                  response.disclaimer
                }
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
