"use client";

import {
  useEffect,
  useState,
} from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

interface ReportResponse {
  success: boolean;

  code?: string;

  error?: string;

  report?: {
    title: string;

    generatedAt: string;

    market:
      | string
      | "mixed";

    universeSize: number;

    evaluatedCount: number;

    candidateCount: number;

    excludedCount: number;

    insufficientDataCount: number;

    candidates: ResearchItem[];

    excluded: ResearchItem[];

    insufficientData: ResearchItem[];

    evidenceSummary: {
      totalSources: number;
      averageSources: number;
      totalIndependentDomains: number;
      averageIndependentDomains: number;
      verifiedCount: number;
      unverifiedCount: number;
    };

    freshnessSummary: {
      knownAsOfCount: number;
      unknownAsOfCount: number;
      oldestAsOf: string | null;
      newestAsOf: string | null;
      dataQuality: string[];
    };

    humanDecisionRequired: boolean;

    humanDecisionNote: string;
  };

  criteria?: unknown;

  runtime?: {
    name: string;
    version: string;
    generatedAt: string;
    latencyMs: number;
  };

  disclaimer?: string;
}

interface ResearchItem {
  symbol: string;

  market: string;

  decision:
    | "candidate"
    | "excluded"
    | "insufficient-data";

  matchedCriteria: string[];

  failedCriteria: string[];

  missingCriteria: string[];

  reasons: string[];

  risks: string[];

  price: number | null;

  pe: number | null;

  pb: number | null;

  eps: number | null;

  revenueGrowth: number | null;

  dataQuality: string;

  asOf: string | null;

  sourceCount: number;

  independentDomains: number;

  verified: boolean;
}

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
        marginTop: 18,
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
          margin:
            "0 0 12px",
          fontSize: 17,
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
  const color =
    value === "candidate"
      ? "#86efac"
      : value === "excluded"
        ? "#fca5a5"
        : "#facc15";

  return (
    <strong
      style={{
        color,
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
    !items ||
    items.length === 0
  ) {
    return (
      <div
        style={{
          opacity: 0.45,
          fontSize: 12,
        }}
      >
        None
      </div>
    );
  }

  return (
    <ul
      style={{
        margin: 0,
        paddingLeft: 20,
        lineHeight: 1.7,
        fontSize: 13,
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

function ResearchCard({
  item,
}: {
  item: ResearchItem;
}) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: 15,
        borderRadius: 12,
        border:
          "1px solid rgba(255,255,255,0.09)",
        background:
          "rgba(0,0,0,0.16)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: 12,
          alignItems:
            "center",
        }}
      >
        <strong>
          {item.symbol}
          {" · "}
          {item.market}
        </strong>

        <Status
          value={
            item.decision
          }
        />
      </div>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
          gap: 8,
          fontSize: 12,
        }}
      >
        <div>
          Price
          <br />
          <strong>
            {item.price ??
              "—"}
          </strong>
        </div>

        <div>
          P/E
          <br />
          <strong>
            {item.pe ??
              "—"}
          </strong>
        </div>

        <div>
          P/B
          <br />
          <strong>
            {item.pb ??
              "—"}
          </strong>
        </div>

        <div>
          EPS
          <br />
          <strong>
            {item.eps ??
              "—"}
          </strong>
        </div>

        <div>
          Revenue Growth
          <br />
          <strong>
            {item.revenueGrowth !==
            null
              ? `${item.revenueGrowth}%`
              : "—"}
          </strong>
        </div>

        <div>
          Data Quality
          <br />
          <strong>
            {item.dataQuality}
          </strong>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          fontSize: 12,
          lineHeight: 1.7,
          opacity: 0.75,
        }}
      >
        Evidence:
        {" "}
        {item.sourceCount}
        {" sources / "}
        {item.independentDomains}
        {" domains"}

        <br />

        Verified:
        {" "}
        {item.verified
          ? "YES"
          : "NO"}

        <br />

        As of:
        {" "}
        {item.asOf ??
          "Unknown"}
      </div>

      <h3
        style={{
          fontSize: 13,
          margin:
            "16px 0 7px",
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
          fontSize: 13,
          margin:
            "16px 0 7px",
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
          fontSize: 13,
          margin:
            "16px 0 7px",
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
          fontSize: 13,
          margin:
            "16px 0 7px",
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
          fontSize: 13,
          margin:
            "16px 0 7px",
        }}
      >
        Risks
      </h3>

      <List
        items={
          item.risks
        }
      />
    </div>
  );
}

export default function MarketResearchReportPage() {
  const [
    founderReady,
    setFounderReady,
  ] = useState(false);

  const [
    market,
    setMarket,
  ] = useState("all");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    response,
    setResponse,
  ] =
    useState<ReportResponse | null>(
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

  async function runReport() {
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
        market === "all"
          ? "/api/founder/market/report"
          : `/api/founder/market/report?market=${encodeURIComponent(
              market,
            )}`;

      const result =
        await fetch(
          endpoint,
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
        (await result.json()) as ReportResponse;

      if (
        !result.ok &&
        !data.code
      ) {
        throw new Error(
          `Report request failed with HTTP ${result.status}.`,
        );
      }

      setResponse(
        data,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Market research report failed.",
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
          Explainable Market Research Report
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
          C147.3.2 · Screening → Evidence →
          Fundamentals → Valuation → Risk →
          Human Review
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

        <Section title="Research Universe">
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
              runReport
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
              ? "Generating Research Report…"
              : "▶ Generate C147.3.2 Report"}
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

        {response?.report && (
          <>
            <Section title="Report Summary">
              <div
                style={{
                  fontSize:
                    18,

                  lineHeight:
                    1.8,
                }}
              >
                {response.code}
              </div>

              <div
                style={{
                  marginTop:
                    12,

                  opacity:
                    0.75,

                  lineHeight:
                    1.7,

                  fontSize:
                    13,
                }}
              >
                Market:
                {" "}
                {response.report.market}

                <br />

                Universe:
                {" "}
                {response.report.universeSize}

                {" · Evaluated: "}
                {
                  response.report
                    .evaluatedCount
                }

                <br />

                Candidates:
                {" "}
                {
                  response.report
                    .candidateCount
                }

                {" · Excluded: "}
                {
                  response.report
                    .excludedCount
                }

                {" · Insufficient: "}
                {
                  response.report
                    .insufficientDataCount
                }
              </div>
            </Section>

            <Section title="Evidence Quality">
              <div
                style={{
                  lineHeight:
                    1.8,

                  fontSize:
                    13,
                }}
              >
                Total Sources:
                {" "}
                {
                  response.report
                    .evidenceSummary
                    .totalSources
                }

                <br />

                Average Sources:
                {" "}
                {
                  response.report
                    .evidenceSummary
                    .averageSources
                }

                <br />

                Total Independent Domains:
                {" "}
                {
                  response.report
                    .evidenceSummary
                    .totalIndependentDomains
                }

                <br />

                Average Independent Domains:
                {" "}
                {
                  response.report
                    .evidenceSummary
                    .averageIndependentDomains
                }

                <br />

                Verified:
                {" "}
                {
                  response.report
                    .evidenceSummary
                    .verifiedCount
                }

                {" · Unverified: "}
                {
                  response.report
                    .evidenceSummary
                    .unverifiedCount
                }
              </div>
            </Section>

            <Section title="Freshness">
              <div
                style={{
                  lineHeight:
                    1.8,

                  fontSize:
                    13,
                }}
              >
                Known timestamps:
                {" "}
                {
                  response.report
                    .freshnessSummary
                    .knownAsOfCount
                }

                <br />

                Unknown timestamps:
                {" "}
                {
                  response.report
                    .freshnessSummary
                    .unknownAsOfCount
                }

                <br />

                Oldest:
                {" "}
                {
                  response.report
                    .freshnessSummary
                    .oldestAsOf ??
                  "Unknown"
                }

                <br />

                Newest:
                {" "}
                {
                  response.report
                    .freshnessSummary
                    .newestAsOf ??
                  "Unknown"
                }

                <br />

                Data Quality:
                {" "}
                {
                  response.report
                    .freshnessSummary
                    .dataQuality
                    .join(
                      ", ",
                    )
                }
              </div>
            </Section>

            <Section title="Candidates">
              {response.report
                .candidates.length ===
              0 ? (
                <div
                  style={{
                    opacity:
                      0.5,

                    fontSize:
                      13,
                  }}
                >
                  No candidate records passed
                  the configured screening rules.
                </div>
              ) : (
                response.report
                  .candidates
                  .map(
                    (item) => (
                      <ResearchCard
                        key={`${item.market}-${item.symbol}`}
                        item={
                          item
                        }
                      />
                    ),
                  )
              )}
            </Section>

            <Section title="Excluded">
              {response.report
                .excluded.length ===
              0 ? (
                <div
                  style={{
                    opacity:
                      0.5,

                    fontSize:
                      13,
                  }}
                >
                  No excluded records.
                </div>
              ) : (
                response.report
                  .excluded
                  .map(
                    (item) => (
                      <ResearchCard
                        key={`${item.market}-${item.symbol}`}
                        item={
                          item
                        }
                      />
                    ),
                  )
              )}
            </Section>

            <Section title="Insufficient Data">
              {response.report
                .insufficientData.length ===
              0 ? (
                <div
                  style={{
                    opacity:
                      0.5,

                    fontSize:
                      13,
                  }}
                >
                  No insufficient-data records.
                </div>
              ) : (
                response.report
                  .insufficientData
                  .map(
                    (item) => (
                      <ResearchCard
                        key={`${item.market}-${item.symbol}`}
                        item={
                          item
                        }
                      />
                    ),
                  )
              )}
            </Section>

            <Section title="Human Decision Gate">
              <div
                style={{
                  lineHeight:
                    1.8,

                  fontSize:
                    13,
                }}
              >
                <strong>
                  Human decision required:
                </strong>
                {" "}
                {response.report
                  .humanDecisionRequired
                  ? "YES"
                  : "NO"}

                <br />

                {
                  response.report
                    .humanDecisionNote
                }
              </div>
            </Section>

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
          </>
        )}
      </div>
    </main>
  );
}
