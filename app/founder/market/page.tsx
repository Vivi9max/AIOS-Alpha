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
    supportsRealtime?: boolean;
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

type ProviderReadinessResult = {
  success?: boolean;
  code?: string;
  stage?: string;

  providerRegistry?: {
    providers?: string[];
    requestedProvider?: string | null;
    activeProvider?: string | null;
    availableProviders?: string[];
  };

  providerStatus?: {
    provider?: string;
    configured?: boolean;
    available?: boolean;
    supportsQuote?: boolean;
    supportsRealtime?: boolean;
    supportsHistorical?: boolean;
    supportsFundamentals?: boolean;
    supportsMarkets?: string[];
    commercialStatus?: string;
    reason?: string;
  };

  commercialAuthorization?: {
    providerId?: string;
    status?: string;
    decision?: string;
    authorized?: boolean;
    gateOpen?: boolean;
    source?: string;
    verifiedAt?: string | null;
    verifiedBy?: string | null;
    contractReference?: string | null;
    reason?: string;
  };

  readiness?: {
    state?: string;
    technicalReady?: boolean;
    commercialReady?: boolean;
    realtimeReady?: boolean;
  };

  runtimeState?: {
    providerConfigured?: boolean;
    technicalCapabilityReady?: boolean;
    commercialGateOpen?: boolean;
  };

  safetyBoundary?: Record<
    string,
    boolean | string
  >;

  error?: string;
};

type TradingBoundaryResult = {
  success?: boolean;
  code?: string;
  stage?: string;
  status?: string;

  readyForLiveExecution?: boolean;

  orderIntent?: {
    symbol?: string;
    market?: string | null;
    side?: string;
    quantity?: number;
    limitPrice?: number | null;
    reason?: string | null;
  } | null;

  gates?: {
    paperTradingVerified?: boolean;
    humanReviewApproved?: boolean;
    brokerConnected?: boolean;
    liveExecutionRequested?: boolean;
    brokerAdapterAvailable?: boolean;
  };

  blockedReasons?: string[];

  execution?: {
    tradingExecuted?: boolean;
    liveOrderPlaced?: boolean;
    brokerOrderId?: string | null;
    plannerDispatched?: boolean;
  };

  safetyBoundary?: Record<
    string,
    boolean | string
  >;

  error?: string;
};

type BrokerBoundaryResult = {
  success?: boolean;
  code?: string;
  stage?: string;
  status?: string;
  readyForBrokerExecution?: boolean;

  broker?: {
    provider?: string;
    connectionStatus?: string;
    connectionVerified?: boolean;
    adapterAvailable?: boolean;
    executionStatus?: string;
  };

  blockedReasons?: string[];

  execution?: {
    tradingExecuted?: boolean;
    liveOrderPlaced?: boolean;
    brokerOrderId?: string | null;
    plannerDispatched?: boolean;
  };

  safetyBoundary?: Record<
    string,
    boolean | string
  >;

  error?: string;
};

function getAccessKey(): string {
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

async function founderFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const key =
    getAccessKey();

  if (!key) {
    throw new Error(
      "Founder Session not found. Please return to Founder Console and enter the Founder Access Key.",
    );
  }

  return fetch(
    path,
    {
      ...init,

      headers: {
        ...(init?.headers ?? {}),

        Authorization:
          `Bearer ${key}`,
      },

      cache:
        "no-store",
    },
  );
}

async function requestMarketAnalysis(
  symbol: string,
  market: string,
): Promise<MarketResult> {
  const response =
    await founderFetch(
      "/api/founder/market/analyze",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            symbol,
            market,
            mode: "full",
          }),
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

  if (
    !response.ok
  ) {
    throw new Error(
      data.error ??
        "Market analysis request failed.",
    );
  }

  return data;
}

async function requestProviderReadiness(): Promise<ProviderReadinessResult> {
  const response =
    await founderFetch(
      "/api/founder/market/provider-readiness",
      {
        method:
          "GET",
      },
    );

  const data =
    (await response.json()) as
      ProviderReadinessResult;

  if (
    response.status ===
    401
  ) {
    throw new Error(
      "Founder authentication failed.",
    );
  }

  if (
    !response.ok
  ) {
    throw new Error(
      data.error ??
        "Provider readiness request failed.",
    );
  }

  return data;
}

async function requestLiveBoundary(
  order: {
    symbol: string;
    market: string;
    side: "buy" | "sell";
    quantity: number;
    limitPrice: number | null;
    reason: string;
  },
): Promise<TradingBoundaryResult> {
  const response =
    await founderFetch(
      "/api/founder/market/live-trading-boundary",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            order,

            paperTradingVerified:
              false,

            humanReviewApproved:
              false,

            brokerConnected:
              false,

            liveExecutionRequested:
              true,
          }),
      },
    );

  const data =
    (await response.json()) as
      TradingBoundaryResult;

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

async function requestBrokerBoundary(
  order: {
    symbol: string;
    market: string;
    side: "buy" | "sell";
    quantity: number;
    limitPrice: number | null;
    reason: string;
  },
): Promise<BrokerBoundaryResult> {
  const response =
    await founderFetch(
      "/api/founder/market/broker-integration-boundary",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            order,

            paperTradingVerified:
              false,

            humanReviewApproved:
              false,

            provider:
              "unconfigured",

            connectionVerified:
              false,

            executionRequested:
              true,
          }),
      },
    );

  const data =
    (await response.json()) as
      BrokerBoundaryResult;

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

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        border:
          "1px solid rgba(255,255,255,0.09)",

        borderRadius:
          16,

        padding:
          18,

        background:
          "rgba(255,255,255,0.035)",
      }}
    >
      {eyebrow && (
        <div
          style={{
            fontSize:
              10,

            letterSpacing:
              "0.12em",

            opacity:
              0.45,

            marginBottom:
              6,
          }}
        >
          {eyebrow}
        </div>
      )}

      <h2
        style={{
          margin:
            "0 0 14px",

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
        display:
          "inline-flex",

        alignItems:
          "center",

        padding:
          "4px 8px",

        borderRadius:
          999,

        fontSize:
          11,

        background:
          ok
            ? "rgba(74,222,128,0.12)"
            : "rgba(248,113,113,0.12)",

        color:
          ok
            ? "#86efac"
            : "#fca5a5",
      }}
    >
      {children}
    </span>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding:
          12,

        borderRadius:
          10,

        background:
          "rgba(255,255,255,0.035)",
      }}
    >
      <div
        style={{
          fontSize:
            11,

          opacity:
            0.5,

          marginBottom:
            5,
        }}
      >
        {label}
      </div>

      <strong
        style={{
          fontSize:
            14,
        }}
      >
        {value}
      </strong>
    </div>
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
          opacity:
            0.5,

          fontSize:
            13,
        }}
      >
        No structured signals.
      </div>
    );
  }

  return (
    <ul
      style={{
        margin:
          0,

        paddingLeft:
          18,

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

export default function FounderMarketPage() {
  const [
    sessionDetected,
    setSessionDetected,
  ] = useState(false);

  const [
    symbol,
    setSymbol,
  ] = useState("NVDA");

  const [
    market,
    setMarket,
  ] = useState("us");

  const [
    side,
    setSide,
  ] = useState<
    "buy" | "sell"
  >("buy");

  const [
    quantity,
    setQuantity,
  ] = useState("1");

  const [
    limitPrice,
    setLimitPrice,
  ] = useState("");

  const [
    orderReason,
    setOrderReason,
  ] = useState(
    "Founder-reviewed market execution intent.",
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    tradingLoading,
    setTradingLoading,
  ] = useState(false);

  const [
    readinessLoading,
    setReadinessLoading,
  ] = useState(false);

  const [
    result,
    setResult,
  ] = useState<MarketResult | null>(
    null,
  );

  const [
    readiness,
    setReadiness,
  ] =
    useState<ProviderReadinessResult | null>(
      null,
    );

  const [
    liveBoundary,
    setLiveBoundary,
  ] =
    useState<TradingBoundaryResult | null>(
      null,
    );

  const [
    brokerBoundary,
    setBrokerBoundary,
  ] =
    useState<BrokerBoundaryResult | null>(
      null,
    );

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    setSessionDetected(
      Boolean(
        getAccessKey(),
      ),
    );
  }, []);

  async function runResearch() {
    setLoading(true);
    setError("");

    try {
      const data =
        await requestMarketAnalysis(
          symbol,
          market,
        );

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Market research failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function runReadiness() {
    setReadinessLoading(
      true,
    );

    setError("");

    try {
      const data =
        await requestProviderReadiness();

      setReadiness(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Provider readiness failed.",
      );
    } finally {
      setReadinessLoading(
        false,
      );
    }
  }

  async function evaluateTradingIntent() {
    const parsedQuantity =
      Number(
        quantity,
      );

    if (
      !Number.isFinite(
        parsedQuantity,
      ) ||
      parsedQuantity <= 0
    ) {
      setError(
        "Quantity must be greater than zero.",
      );

      return;
    }

    const parsedLimitPrice =
      limitPrice.trim()
        ? Number(
            limitPrice,
          )
        : null;

    if (
      parsedLimitPrice !==
        null &&
      (
        !Number.isFinite(
          parsedLimitPrice,
        ) ||
        parsedLimitPrice <=
          0
      )
    ) {
      setError(
        "Limit price must be a positive number.",
      );

      return;
    }

    setTradingLoading(
      true,
    );

    setError("");

    const order = {
      symbol:
        symbol
          .trim()
          .toUpperCase(),

      market,

      side,

      quantity:
        Math.floor(
          parsedQuantity,
        ),

      limitPrice:
        parsedLimitPrice,

      reason:
        orderReason.trim(),
    };

    try {
      const [
        liveResult,
        brokerResult,
      ] =
        await Promise.all([
          requestLiveBoundary(
            order,
          ),

          requestBrokerBoundary(
            order,
          ),
        ]);

      setLiveBoundary(
        liveResult,
      );

      setBrokerBoundary(
        brokerResult,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Trading boundary evaluation failed.",
      );
    } finally {
      setTradingLoading(
        false,
      );
    }
  }

  const snapshot =
    result?.snapshot;

  const analysis =
    result?.analysis;

  return (
    <main
      style={{
        minHeight:
          "100vh",

        background:
          "#09090b",

        color:
          "#f4f4f5",

        padding:
          "26px 18px 70px",

        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth:
            1120,

          margin:
            "0 auto",
        }}
      >
        <header
          style={{
            marginBottom:
              24,
          }}
        >
          <div
            style={{
              fontSize:
                10,

              letterSpacing:
                "0.14em",

              opacity:
                0.45,

              marginBottom:
                8,
            }}
          >
            PRIVATE FOUNDER TERMINAL
          </div>

          <div
            style={{
              display:
                "flex",

              alignItems:
                "flex-start",

              justifyContent:
                "space-between",

              gap:
                18,

              flexWrap:
                "wrap",
            }}
          >
            <div>
              <h1
                style={{
                  margin:
                    0,

                  fontSize:
                    30,

                  letterSpacing:
                    "-0.02em",
                }}
              >
                AIOS Market Terminal
              </h1>

              <p
                style={{
                  margin:
                    "8px 0 0",

                  opacity:
                    0.62,

                  lineHeight:
                    1.6,

                  fontSize:
                    13,
                }}
              >
                Research → Evidence → Verification
                → Decision → Paper Trade → Human Review
                → Live Trading Boundary → Broker Execution
              </p>
            </div>

            <Badge
              ok={
                sessionDetected
              }
            >
              {sessionDetected
                ? "Founder Session"
                : "Session Required"}
            </Badge>
          </div>
        </header>

        <div
          style={{
            display:
              "grid",

            gap:
              16,
          }}
        >
          <Section
            title="Market Research"
            eyebrow="SHARED RESEARCH ENTRY"
          >
            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "minmax(0, 1.5fr) minmax(140px, 0.7fr) auto",

                gap:
                  10,
              }}
            >
              <input
                value={
                  symbol
                }
                onChange={(event) =>
                  setSymbol(
                    event.target.value,
                  )
                }
                placeholder="Symbol"
                style={{
                  minWidth:
                    0,

                  padding:
                    "12px 13px",

                  borderRadius:
                    10,

                  border:
                    "1px solid rgba(255,255,255,0.12)",

                  background:
                    "rgba(255,255,255,0.04)",

                  color:
                    "#fff",

                  outline:
                    "none",
                }}
              />

              <select
                value={
                  market
                }
                onChange={(event) =>
                  setMarket(
                    event.target.value,
                  )
                }
                style={{
                  padding:
                    "12px 13px",

                  borderRadius:
                    10,

                  border:
                    "1px solid rgba(255,255,255,0.12)",

                  background:
                    "#18181b",

                  color:
                    "#fff",
                }}
              >
                <option value="us">
                  US
                </option>

                <option value="hk">
                  HK
                </option>

                <option value="cn">
                  A-share
                </option>
              </select>

              <button
                onClick={
                  runResearch
                }
                disabled={
                  loading ||
                  !sessionDetected
                }
                style={{
                  padding:
                    "12px 18px",

                  borderRadius:
                    10,

                  border:
                    "none",

                  background:
                    loading
                      ? "#3f3f46"
                      : "#fff",

                  color:
                    loading
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
                  ? "Researching..."
                  : "Run Research"}
              </button>
            </div>

            <div
              style={{
                marginTop:
                  12,

                display:
                  "flex",

                gap:
                  8,

                flexWrap:
                  "wrap",
              }}
            >
              <Badge
                ok={
                  Boolean(
                    result?.verification
                      ?.verified,
                  )
                }
              >
                Evidence verification
              </Badge>

              <Badge
                ok={
                  Boolean(
                    snapshot?.liveQuoteAvailable,
                  )
                }
              >
                Live quote
              </Badge>

              <Badge
                ok={
                  Boolean(
                    result?.provider
                      ?.configured,
                  )
                }
              >
                Structured provider
              </Badge>
            </div>
          </Section>

          {error && (
            <div
              style={{
                padding:
                  13,

                borderRadius:
                  10,

                background:
                  "rgba(248,113,113,0.10)",

                border:
                  "1px solid rgba(248,113,113,0.20)",

                color:
                  "#fca5a5",

                fontSize:
                  13,
              }}
            >
              {error}
            </div>
          )}

          {result && (
            <>
              <Section
                title={
                  `${result.instrument?.normalizedSymbol ?? symbol} Market Snapshot`
                }
                eyebrow="RESEARCH SNAPSHOT"
              >
                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "repeat(4, minmax(0, 1fr))",

                    gap:
                      10,
                  }}
                >
                  <Metric
                    label="Price"
                    value={
                      snapshot?.price !=
                      null
                        ? String(
                            snapshot.price,
                          )
                        : "Unavailable"
                    }
                  />

                  <Metric
                    label="Change"
                    value={
                      snapshot?.changePercent !=
                      null
                        ? `${snapshot.changePercent}%`
                        : "Unavailable"
                    }
                  />

                  <Metric
                    label="Data Quality"
                    value={
                      snapshot?.dataQuality ??
                      "Unknown"
                    }
                  />

                  <Metric
                    label="As Of"
                    value={
                      snapshot?.asOf ??
                      "Unknown"
                    }
                  />
                </div>
              </Section>

              <Section
                title="Research Conclusion"
                eyebrow="DECISION SUPPORT"
              >
                <div
                  style={{
                    display:
                      "grid",

                    gap:
                      14,
                  }}
                >
                  <div>
                    <strong>
                      Current State
                    </strong>

                    <p
                      style={{
                        margin:
                          "7px 0 0",

                        lineHeight:
                          1.7,

                        opacity:
                          0.72,

                        fontSize:
                          13,
                      }}
                    >
                      {analysis?.decisionSupport
                        ?.currentState ??
                        "No structured conclusion available."}
                    </p>
                  </div>

                  <div>
                    <strong>
                      Supporting Factors
                    </strong>

                    <List
                      items={
                        analysis
                          ?.decisionSupport
                          ?.supportingFactors
                      }
                    />
                  </div>

                  <div>
                    <strong>
                      Invalidation Conditions
                    </strong>

                    <List
                      items={
                        analysis
                          ?.decisionSupport
                          ?.invalidationConditions
                      }
                    />
                  </div>

                  <div>
                    <strong>
                      Watch Metrics
                    </strong>

                    <List
                      items={
                        analysis
                          ?.decisionSupport
                          ?.watchMetrics
                      }
                    />
                  </div>
                </div>
              </Section>

              <Section
                title="Research Blocks"
                eyebrow="ANALYSIS"
              >
                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",

                    gap:
                      12,
                  }}
                >
                  <div>
                    <strong>
                      Industry
                    </strong>

                    <p
                      style={{
                        lineHeight:
                          1.65,

                        opacity:
                          0.68,

                        fontSize:
                          13,
                      }}
                    >
                      {analysis?.industry
                        ?.summary ??
                        "Unavailable."}
                    </p>
                  </div>

                  <div>
                    <strong>
                      Company
                    </strong>

                    <p
                      style={{
                        lineHeight:
                          1.65,

                        opacity:
                          0.68,

                        fontSize:
                          13,
                      }}
                    >
                      {analysis?.company
                        ?.summary ??
                        "Unavailable."}
                    </p>
                  </div>

                  <div>
                    <strong>
                      Fundamentals
                    </strong>

                    <p
                      style={{
                        lineHeight:
                          1.65,

                        opacity:
                          0.68,

                        fontSize:
                          13,
                      }}
                    >
                      {analysis?.fundamentals
                        ?.assessment ??
                        "Unavailable."}
                    </p>
                  </div>

                  <div>
                    <strong>
                      Valuation
                    </strong>

                    <p
                      style={{
                        lineHeight:
                          1.65,

                        opacity:
                          0.68,

                        fontSize:
                          13,
                      }}
                    >
                      {analysis?.valuation
                        ?.assessment ??
                        "Unavailable."}
                    </p>
                  </div>

                  <div>
                    <strong>
                      Trend
                    </strong>

                    <p
                      style={{
                        lineHeight:
                          1.65,

                        opacity:
                          0.68,

                        fontSize:
                          13,
                      }}
                    >
                      {analysis?.trend
                        ?.assessment ??
                        "Unavailable."}
                    </p>
                  </div>

                  <div>
                    <strong>
                      Risk
                    </strong>

                    <p
                      style={{
                        lineHeight:
                          1.65,

                        opacity:
                          0.68,

                        fontSize:
                          13,
                      }}
                    >
                      {analysis?.risk
                        ?.level ??
                        "Unavailable."}
                    </p>
                  </div>
                </div>
              </Section>
            </>
          )}

          <Section
            title="Provider & Commercial Readiness"
            eyebrow="FOUNDER CONTROL"
          >
            <div
              style={{
                display:
                  "flex",

                justifyContent:
                  "space-between",

                alignItems:
                  "center",

                gap:
                  12,

                flexWrap:
                  "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize:
                      13,

                    opacity:
                      0.68,

                    lineHeight:
                      1.6,
                  }}
                >
                  Technical market-data access,
                  realtime verification and
                  commercial authorization remain
                  separate gates.
                </div>
              </div>

              <button
                onClick={
                  runReadiness
                }
                disabled={
                  readinessLoading
                }
                style={{
                  padding:
                    "10px 14px",

                  borderRadius:
                    10,

                  border:
                    "1px solid rgba(255,255,255,0.12)",

                  background:
                    "rgba(255,255,255,0.06)",

                  color:
                    "#fff",

                  fontWeight:
                    650,
                }}
              >
                {readinessLoading
                  ? "Checking..."
                  : "Run Readiness"}
              </button>
            </div>

            {readiness && (
              <div
                style={{
                  marginTop:
                    16,

                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(4, minmax(0, 1fr))",

                  gap:
                    10,
                }}
              >
                <Metric
                  label="Provider"
                  value={
                    readiness.providerRegistry
                      ?.activeProvider ??
                    "None"
                  }
                />

                <Metric
                  label="Readiness"
                  value={
                    readiness.readiness
                      ?.state ??
                    "unknown"
                  }
                />

                <Metric
                  label="Commercial"
                  value={
                    readiness
                      .commercialAuthorization
                      ?.decision ??
                    "unknown"
                  }
                />

                <Metric
                  label="Realtime"
                  value={
                    readiness.readiness
                      ?.realtimeReady
                      ? "Ready"
                      : "Not verified"
                  }
                />
              </div>
            )}
          </Section>

          <Section
            title="Founder Trading Terminal"
            eyebrow="FOUNDER ONLY · LIVE EXECUTION BOUNDARY"
          >
            <div
              style={{
                padding:
                  13,

                marginBottom:
                  14,

                borderRadius:
                  10,

                background:
                  "rgba(251,191,36,0.08)",

                border:
                  "1px solid rgba(251,191,36,0.18)",

                color:
                  "#fcd34d",

                fontSize:
                  12,

                lineHeight:
                  1.65,
              }}
            >
              Founder can create and evaluate a
              real trading order intent here.
              Actual live execution remains blocked
              until C151 paper verification, explicit
              human approval, a verified broker
              connection and a real execution adapter
              are all available.
            </div>

            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "1.3fr 0.8fr 0.8fr",

                gap:
                  10,
              }}
            >
              <div>
                <label
                  style={{
                    display:
                      "block",

                    fontSize:
                      11,

                    opacity:
                      0.55,

                    marginBottom:
                      6,
                  }}
                >
                  Symbol
                </label>

                <input
                  value={
                    symbol
                  }
                  onChange={(event) =>
                    setSymbol(
                      event.target.value,
                    )
                  }
                  style={{
                    width:
                      "100%",

                    boxSizing:
                      "border-box",

                    padding:
                      "11px 12px",

                    borderRadius:
                      9,

                    border:
                      "1px solid rgba(255,255,255,0.12)",

                    background:
                      "rgba(255,255,255,0.04)",

                    color:
                      "#fff",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display:
                      "block",

                    fontSize:
                      11,

                    opacity:
                      0.55,

                    marginBottom:
                      6,
                  }}
                >
                  Side
                </label>

                <select
                  value={
                    side
                  }
                  onChange={(event) =>
                    setSide(
                      event.target.value as
                        | "buy"
                        | "sell",
                    )
                  }
                  style={{
                    width:
                      "100%",

                    padding:
                      "11px 12px",

                    borderRadius:
                      9,

                    border:
                      "1px solid rgba(255,255,255,0.12)",

                    background:
                      "#18181b",

                    color:
                      "#fff",
                  }}
                >
                  <option value="buy">
                    Buy
                  </option>

                  <option value="sell">
                    Sell
                  </option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display:
                      "block",

                    fontSize:
                      11,

                    opacity:
                      0.55,

                    marginBottom:
                      6,
                  }}
                >
                  Quantity
                </label>

                <input
                  value={
                    quantity
                  }
                  onChange={(event) =>
                    setQuantity(
                      event.target.value,
                    )
                  }
                  inputMode="numeric"
                  style={{
                    width:
                      "100%",

                    boxSizing:
                      "border-box",

                    padding:
                      "11px 12px",

                    borderRadius:
                      9,

                    border:
                      "1px solid rgba(255,255,255,0.12)",

                    background:
                      "rgba(255,255,255,0.04)",

                    color:
                      "#fff",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "0.8fr 1.6fr",

                gap:
                  10,

                marginTop:
                  10,
              }}
            >
              <div>
                <label
                  style={{
                    display:
                      "block",

                    fontSize:
                      11,

                    opacity:
                      0.55,

                    marginBottom:
                      6,
                  }}
                >
                  Limit Price
                </label>

                <input
                  value={
                    limitPrice
                  }
                  onChange={(event) =>
                    setLimitPrice(
                      event.target.value,
                    )
                  }
                  inputMode="decimal"
                  placeholder="Optional"
                  style={{
                    width:
                      "100%",

                    boxSizing:
                      "border-box",

                    padding:
                      "11px 12px",

                    borderRadius:
                      9,

                    border:
                      "1px solid rgba(255,255,255,0.12)",

                    background:
                      "rgba(255,255,255,0.04)",

                    color:
                      "#fff",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display:
                      "block",

                    fontSize:
                      11,

                    opacity:
                      0.55,

                    marginBottom:
                      6,
                  }}
                >
                  Order Reason
                </label>

                <input
                  value={
                    orderReason
                  }
                  onChange={(event) =>
                    setOrderReason(
                      event.target.value,
                    )
                  }
                  style={{
                    width:
                      "100%",

                    boxSizing:
                      "border-box",

                    padding:
                      "11px 12px",

                    borderRadius:
                      9,

                    border:
                      "1px solid rgba(255,255,255,0.12)",

                    background:
                      "rgba(255,255,255,0.04)",

                    color:
                      "#fff",
                  }}
                />
              </div>
            </div>

            <button
              onClick={
                evaluateTradingIntent
              }
              disabled={
                tradingLoading ||
                !sessionDetected
              }
              style={{
                width:
                  "100%",

                marginTop:
                  12,

                padding:
                  "13px 16px",

                borderRadius:
                  10,

                border:
                  "none",

                background:
                  tradingLoading
                    ? "#3f3f46"
                    : "#fff",

                color:
                  tradingLoading
                    ? "#aaa"
                    : "#09090b",

                fontWeight:
                  750,

                cursor:
                  tradingLoading
                    ? "wait"
                    : "pointer",
              }}
            >
              {tradingLoading
                ? "Evaluating Trading Boundary..."
                : "Evaluate Live Trading Intent"}
            </button>

            {(liveBoundary ||
              brokerBoundary) && (
              <div
                style={{
                  marginTop:
                    16,

                  display:
                    "grid",

                  gap:
                    10,
                }}
              >
                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "repeat(4, minmax(0, 1fr))",

                    gap:
                      10,
                  }}
                >
                  <Metric
                    label="Live Boundary"
                    value={
                      liveBoundary
                        ?.status ??
                      "unknown"
                    }
                  />

                  <Metric
                    label="Broker"
                    value={
                      brokerBoundary
                        ?.broker
                        ?.connectionStatus ??
                      "unknown"
                    }
                  />

                  <Metric
                    label="Adapter"
                    value={
                      brokerBoundary
                        ?.broker
                        ?.adapterAvailable
                        ? "Available"
                        : "Not implemented"
                    }
                  />

                  <Metric
                    label="Execution"
                    value={
                      brokerBoundary
                        ?.execution
                        ?.liveOrderPlaced
                        ? "Placed"
                        : "Blocked"
                    }
                  />
                </div>

                {liveBoundary?.blockedReasons
                  ?.length ? (
                  <div
                    style={{
                      padding:
                        12,

                      borderRadius:
                        10,

                      background:
                        "rgba(248,113,113,0.08)",

                      border:
                        "1px solid rgba(248,113,113,0.16)",

                      fontSize:
                        12,

                      lineHeight:
                        1.7,
                    }}
                  >
                    <strong>
                      Live Trading Gates
                    </strong>

                    <ul
                      style={{
                        margin:
                          "7px 0 0",

                        paddingLeft:
                          18,
                      }}
                    >
                      {liveBoundary.blockedReasons.map(
                        (
                          reason,
                        ) => (
                          <li
                            key={
                              reason
                            }
                          >
                            {reason}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                ) : null}

                {brokerBoundary?.blockedReasons
                  ?.length ? (
                  <div
                    style={{
                      padding:
                        12,

                      borderRadius:
                        10,

                      background:
                        "rgba(251,191,36,0.07)",

                      border:
                        "1px solid rgba(251,191,36,0.15)",

                      fontSize:
                        12,

                      lineHeight:
                        1.7,
                    }}
                  >
                    <strong>
                      Broker Integration Gates
                    </strong>

                    <ul
                      style={{
                        margin:
                          "7px 0 0",

                        paddingLeft:
                          18,
                      }}
                    >
                      {brokerBoundary.blockedReasons.map(
                        (
                          reason,
                        ) => (
                          <li
                            key={
                              reason
                            }
                          >
                            {reason}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </Section>

          <Section
            title="Founder Trading Safety Boundary"
            eyebrow="EXECUTION POLICY"
          >
            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",

                gap:
                  10,
              }}
            >
              <Metric
                label="Founder Only"
                value="Yes"
              />

              <Metric
                label="Human Review"
                value="Required"
              />

              <Metric
                label="Paper Trading"
                value="Required"
              />

              <Metric
                label="Broker Connection"
                value="Required"
              />

              <Metric
                label="Execution Adapter"
                value="Required"
              />

              <Metric
                label="Automatic Execution"
                value="Disabled"
              />
            </div>
          </Section>

          <footer
            style={{
              marginTop:
                4,

              padding:
                "8px 2px",

              fontSize:
                11,

              lineHeight:
                1.7,

              opacity:
                0.45,
            }}
          >
            Founder Terminal is the private control
            surface. Ordinary users receive the
            commercial Market Research product only.
            Research evidence is not automatically
            converted into an order. Live execution
            requires an independently verified broker
            adapter and explicit human approval.
          </footer>
        </div>
      </div>
    </main>
  );
}
