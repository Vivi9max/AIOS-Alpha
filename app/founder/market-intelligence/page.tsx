"use client";
import {
  useEffect,
  useState,
} from "react";
const STORAGE_KEY =
  "aios-founder-access-key";
type MarketResult = {
  success?: boolean;
  verified?: boolean;
  code?: string;
  message?: string;
  error?: string;
  instrument?: {
    symbol?: string;
    normalizedSymbol?: string;
    market?: string;
    exchange?: string;
    currency?: string;
  };
  snapshot?: {
    price?: number | null;
    previousClose?: number | null;
    changePercent?: number | null;
    marketCap?: number | null;
    pe?: number | null;
    pb?: number | null;
    eps?: number | null;
    revenue?: number | null;
    revenueGrowth?: number | null;
    dataQuality?: string;
    liveQuoteAvailable?: boolean;
    asOf?: string | null;
    source?: string | null;
    dataset?: string | null;
  };
  analysis?: {
    industry?: {
      summary?: string;
      evidence?: string[];
    };
    company?: {
      summary?: string;
      strengths?: string[];
      risks?: string[];
    };
    fundamentals?: {
      assessment?: string;
      signals?: string[];
    };
    valuation?: {
      assessment?: string;
      signals?: string[];
    };
    trend?: {
      assessment?: string;
      signals?: string[];
    };
    risk?: {
      level?: string;
      factors?: string[];
    };
    decisionSupport?: {
      currentState?: string;
      supportingFactors?: string[];
      invalidationConditions?: string[];
      watchMetrics?: string[];
      scenarios?: Array<{
        name?: string;
        condition?: string;
        implication?: string;
      }>;
    };
  };
  evidence?: Array<{
    title?: string;
    url?: string;
    hostname?: string;
    snippet?: string;
    confidence?: number;
  }>;
  verification?: {
    verified?: boolean;
    sourceCount?: number;
    independentDomains?: number;
    primarySourceFound?: boolean;
    structuredDataAvailable?: boolean;
    structuredDataVerified?: boolean;
  };
  provider?: {
    provider?: string;
    configured?: boolean;
    available?: boolean;
    supportsQuote?: boolean;
    supportsHistorical?: boolean;
    supportsFundamentals?: boolean;
    supportsMarkets?: string[];
    reason?: string;
  };
  metadata?: {
    runtime?: string;
    stage?: string;
    analysisMode?: string;
    generatedAt?: string;
    disclaimer?: string;
  };
  latencyMs?: number;
};
function getFounderKey(): string {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }
  return (
    window.sessionStorage.getItem(
      STORAGE_KEY,
    )?.trim() ?? ""
  );
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
        marginTop: 14,
        padding: 16,
        border:
          "1px solid rgba(255,255,255,0.09)",
        borderRadius: 14,
        background:
          "rgba(255,255,255,0.035)",
      }}
    >
      <h2
        style={{
          margin: "0 0 12px",
          fontSize: 15,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
function List({
  items,
}: {
  items?: string[];
}) {
  if (!items?.length) {
    return (
      <div
        style={{
          opacity: 0.5,
          fontSize: 13,
        }}
      >
        No structured information.
      </div>
    );
  }
  return (
    <ul
      style={{
        margin: 0,
        paddingLeft: 19,
        lineHeight: 1.65,
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
function Badge({
  ok,
  children,
}: {
  ok: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding:
          "4px 8px",
        borderRadius: 999,
        fontSize: 11,
        background: ok
          ? "rgba(74,222,128,0.12)"
          : "rgba(251,191,36,0.12)",
        color: ok
          ? "#86efac"
          : "#fcd34d",
      }}
    >
      {children}
    </span>
  );
}
async function analyze(
  symbol: string,
  market: string,
): Promise<MarketResult> {
  const key =
    getFounderKey();
  if (!key) {
    throw new Error(
      "Founder Session not found. Please return to Founder Console.",
    );
  }
  const response =
    await fetch(
      "/api/founder/market/analyze",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Authorization:
            `Bearer ${key}`,
          "x-aios-founder-key":
            key,
        },
        body: JSON.stringify({
          symbol,
          market,
          mode: "full",
        }),
        cache: "no-store",
      },
    );
  const data =
    (await response.json()) as
      MarketResult;
  if (
    response.status ===
    401
  ) {
    throw new Error(
      "Founder authentication failed.",
    );
  }
  return data;
}
export default function MarketIntelligencePage() {
  const [
    sessionDetected,
    setSessionDetected,
  ] = useState(false);
  const [
    symbol,
    setSymbol,
  ] = useState("AAPL");
  const [
    market,
    setMarket,
  ] = useState("us");
  const [
    loading,
    setLoading,
  ] = useState(false);
  const [
    result,
    setResult,
  ] = useState<
    MarketResult | null
  >(null);
  const [
    error,
    setError,
  ] = useState("");
  useEffect(() => {
    setSessionDetected(
      Boolean(
        getFounderKey(),
      ),
    );
  }, []);
  async function runAnalysis() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data =
        await analyze(
          symbol.trim(),
          market,
        );
      setResult(data);
      if (
        data.code ===
        "FOUNDER_AUTH_REQUIRED"
      ) {
        setError(
          "Founder authentication required.",
        );
      }
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof
          Error
          ? requestError.message
          : "Market Intelligence request failed.",
      );
    } finally {
      setLoading(false);
    }
  }
  const snapshot =
    result?.snapshot;
  const analysis =
    result?.analysis;
  const verification =
    result?.verification;
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#09090b",
        color: "#f4f4f5",
        padding:
          "28px 16px 60px",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing:
                "0.12em",
              opacity: 0.5,
              marginBottom: 7,
            }}
          >
            PRIVATE FOUNDER ACCESS
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 27,
            }}
          >
            Market Intelligence
          </h1>
          <p
            style={{
              margin:
                "8px 0 0",
              opacity: 0.62,
              lineHeight: 1.55,
              fontSize: 14,
            }}
          >
            Research · Evidence · Risk
          </p>
        </div>
        <Section title="Founder Session">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius:
                  "50%",
                background:
                  sessionDetected
                    ? "#4ade80"
                    : "#f87171",
              }}
            />
            <strong
              style={{
                fontSize: 13,
              }}
            >
              {sessionDetected
                ? "Founder Session detected"
                : "Founder Session not detected"}
            </strong>
          </div>
        </Section>
        <Section title="Research">
          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            <input
              value={symbol}
              onChange={(
                event,
              ) =>
                setSymbol(
                  event.target.value.toUpperCase(),
                )
              }
              placeholder="Symbol · AAPL / 0700.HK / 600519.SH"
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                padding:
                  "12px 13px",
                borderRadius: 10,
                border:
                  "1px solid rgba(255,255,255,0.14)",
                background:
                  "#18181b",
                color: "#fff",
                outline: "none",
              }}
            />
            <select
              value={market}
              onChange={(
                event,
              ) =>
                setMarket(
                  event.target.value,
                )
              }
              style={{
                width: "100%",
                padding:
                  "12px 13px",
                borderRadius: 10,
                border:
                  "1px solid rgba(255,255,255,0.14)",
                background:
                  "#18181b",
                color: "#fff",
              }}
            >
              <option value="us">
                US Market
              </option>
              <option value="hk">
                Hong Kong Market
              </option>
              <option value="cn">
                China A-share
              </option>
            </select>
            <button
              type="button"
              onClick={
                runAnalysis
              }
              disabled={
                loading ||
                !symbol.trim()
              }
              style={{
                padding:
                  "13px 16px",
                border: "none",
                borderRadius: 10,
                background:
                  loading
                    ? "#3f3f46"
                    : "#fff",
                color:
                  loading
                    ? "#aaa"
                    : "#09090b",
                fontWeight: 800,
                cursor:
                  loading
                    ? "wait"
                    : "pointer",
              }}
            >
              {loading
                ? "Researching…"
                : "Analyze Market Intelligence"}
            </button>
          </div>
        </Section>
        {error && (
          <Section title="Request Error">
            <div
              style={{
                color: "#fca5a5",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {error}
            </div>
          </Section>
        )}
        {result && (
          <>
            <Section title="Research Status">
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <Badge
                  ok={Boolean(
                    result.success,
                  )}
                >
                  {result.success
                    ? "Runtime PASS"
                    : "Runtime FAILED"}
                </Badge>
                <Badge
                  ok={Boolean(
                    result.verified,
                  )}
                >
                  {result.verified
                    ? "Verified"
                    : "Not verified"}
                </Badge>
                <Badge
                  ok={Boolean(
                    verification?.structuredDataVerified,
                  )}
                >
                  {verification?.structuredDataVerified
                    ? "Structured data verified"
                    : "Web evidence / non-structured"}
                </Badge>
              </div>
              <div
                style={{
                  marginTop: 12,
                  fontSize: 13,
                  lineHeight: 1.7,
                  opacity: 0.72,
                }}
              >
                Sources:{" "}
                {verification?.sourceCount ??
                  0}
                <br />
                Independent domains:{" "}
                {verification?.independentDomains ??
                  0}
                <br />
                Primary source:{" "}
                {verification?.primarySourceFound
                  ? "YES"
                  : "NO"}
              </div>
            </Section>
            {snapshot && (
              <Section title="Market Snapshot">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <div>
                    <div
                      style={{
                        opacity: 0.5,
                        fontSize: 11,
                      }}
                    >
                      Symbol
                    </div>
                    <strong>
                      {result.instrument
                        ?.normalizedSymbol ??
                        result.instrument
                          ?.symbol ??
                        symbol}
                    </strong>
                  </div>
                  <div>
                    <div
                      style={{
                        opacity: 0.5,
                        fontSize: 11,
                      }}
                    >
                      Market
                    </div>
                    <strong>
                      {result.instrument
                        ?.market ??
                        market}
                    </strong>
                  </div>
                  <div>
                    <div
                      style={{
                        opacity: 0.5,
                        fontSize: 11,
                      }}
                    >
                      Price
                    </div>
                    <strong>
                      {snapshot.price ??
                        "N/A"}
                    </strong>
                  </div>
                  <div>
                    <div
                      style={{
                        opacity: 0.5,
                        fontSize: 11,
                      }}
                    >
                      P/E
                    </div>
                    <strong>
                      {snapshot.pe ??
                        "N/A"}
                    </strong>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 14,
                    fontSize: 12,
                    opacity: 0.58,
                    lineHeight: 1.6,
                  }}
                >
                  Data quality:{" "}
                  {snapshot.dataQuality ??
                    "N/A"}
                  <br />
                  Live quote:{" "}
                  {snapshot.liveQuoteAvailable
                    ? "YES"
                    : "NO"}
                  <br />
                  Source:{" "}
                  {snapshot.source ??
                    "N/A"}
                  <br />
                  As of:{" "}
                  {snapshot.asOf ??
                    "N/A"}
                </div>
              </Section>
            )}
            {analysis?.industry && (
              <Section title="Industry">
                <p
                  style={{
                    lineHeight: 1.6,
                    fontSize: 13,
                  }}
                >
                  {
                    analysis.industry
                      .summary
                  }
                </p>
                <List
                  items={
                    analysis.industry
                      .evidence
                  }
                />
              </Section>
            )}
            {analysis?.company && (
              <Section title="Company">
                <p
                  style={{
                    lineHeight: 1.6,
                    fontSize: 13,
                  }}
                >
                  {
                    analysis.company
                      .summary
                  }
                </p>
                <h3
                  style={{
                    fontSize: 13,
                  }}
                >
                  Strengths
                </h3>
                <List
                  items={
                    analysis.company
                      .strengths
                  }
                />
                <h3
                  style={{
                    fontSize: 13,
                  }}
                >
                  Risks
                </h3>
                <List
                  items={
                    analysis.company
                      .risks
                  }
                />
              </Section>
            )}
            {analysis?.fundamentals && (
              <Section title="Fundamentals">
                <p
                  style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  {
                    analysis.fundamentals
                      .assessment
                  }
                </p>
                <List
                  items={
                    analysis.fundamentals
                      .signals
                  }
                />
              </Section>
            )}
            {analysis?.valuation && (
              <Section title="Valuation">
                <p
                  style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  {
                    analysis.valuation
                      .assessment
                  }
                </p>
                <List
                  items={
                    analysis.valuation
                      .signals
                  }
                />
              </Section>
            )}
            {analysis?.risk && (
              <Section title="Risk">
                <p
                  style={{
                    fontSize: 13,
                  }}
                >
                  Risk level:{" "}
                  <strong>
                    {
                      analysis.risk
                        .level ??
                        "N/A"
                    }
                  </strong>
                </p>
                <List
                  items={
                    analysis.risk
                      .factors
                  }
                />
              </Section>
            )}
            {analysis?.decisionSupport && (
              <Section title="Decision Support">
                <p
                  style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  {
                    analysis
                      .decisionSupport
                      .currentState
                  }
                </p>
                <h3
                  style={{
                    fontSize: 13,
                  }}
                >
                  What supports the current assessment
                </h3>
                <List
                  items={
                    analysis
                      .decisionSupport
                      .supportingFactors
                  }
                />
                <h3
                  style={{
                    fontSize: 13,
                  }}
                >
                  What could invalidate it
                </h3>
                <List
                  items={
                    analysis
                      .decisionSupport
                      .invalidationConditions
                  }
                />
                <h3
                  style={{
                    fontSize: 13,
                  }}
                >
                  Watch metrics
                </h3>
                <List
                  items={
                    analysis
                      .decisionSupport
                      .watchMetrics
                  }
                />
              </Section>
            )}
            {result.evidence?.length ? (
              <Section title="Evidence">
                {result.evidence.map(
                  (
                    item,
                    index,
                  ) => (
                    <div
                      key={`${item.url}-${index}`}
                      style={{
                        padding:
                          "11px 0",
                        borderTop:
                          "1px solid rgba(255,255,255,0.07)",
                        fontSize: 12,
                        lineHeight: 1.55,
                      }}
                    >
                      <strong>
                        {item.title ??
                          "Source"}
                      </strong>
                      <div
                        style={{
                          opacity: 0.48,
                          marginTop: 3,
                        }}
                      >
                        {item.hostname ??
                          ""}
                      </div>
                      <div
                        style={{
                          opacity: 0.68,
                          marginTop: 4,
                        }}
                      >
                        {item.snippet ??
                          ""}
                      </div>
                    </div>
                  ),
                )}
              </Section>
            ) : null}
            <div
              style={{
                marginTop: 16,
                padding: 14,
                fontSize: 11,
                lineHeight: 1.6,
                opacity: 0.48,
              }}
            >
              {result.metadata
                ?.disclaimer ??
                "AIOS provides research, evidence and risk-review support. It does not provide personalized investment advice, rank securities, or execute trades automatically."}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
