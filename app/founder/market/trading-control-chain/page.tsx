"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "aios-founder-access-key";

type ChainResult = {
  success?: boolean;
  code?: string;
  stage?: string;
  orderIntent?: {
    symbol?: string;
    market?: string;
    side?: string;
    quantity?: number;
    limitPrice?: number | null;
    reason?: string | null;
  } | null;
  controlChain?: Array<{
    stage?: string;
    state?: string;
    description?: string;
  }>;
  provider?: {
    id?: string | null;
    activeProvider?: string | null;
    technicalReady?: boolean;
    realtimeVerified?: boolean;
  };
  commercialAuthorization?: {
    status?: string;
    decision?: string;
    authorized?: boolean;
    gateOpen?: boolean;
    reason?: string;
  };
  brokerAdapter?: {
    id?: string;
    configured?: boolean;
    ready?: boolean;
    diagnostic?: {
      status?: string;
      blockedReasons?: string[];
    };
  };
  controlDecision?: {
    state?: string;
    executionAllowed?: boolean;
    reason?: string;
  };
  gates?: {
    providerTechnicalReady?: boolean;
    providerRealtimeVerified?: boolean;
    commercialGateOpen?: boolean;
    brokerAdapterConfigured?: boolean;
    brokerAdapterReady?: boolean;
    brokerConnectionVerified?: boolean;
    brokerCredentialsVerified?: boolean;
    brokerAccountVerified?: boolean;
    paperTradingVerified?: boolean;
    humanReviewApproved?: boolean;
    liveExecutionEnabled?: boolean;
  };
  execution?: {
    readyForLiveExecution?: boolean;
    executionRequested?: boolean;
    liveOrderPlaced?: boolean;
    tradingExecuted?: boolean;
    brokerOrderId?: string | null;
    plannerDispatched?: boolean;
  };
  nextRequirements?: string[];
  safetyBoundary?: Record<string, boolean | string | null>;
  error?: string;
};

function getAccessKey(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.sessionStorage.getItem(STORAGE_KEY)?.trim() ?? "";
}

async function requestControlChain(
  order: {
    symbol: string;
    market: string;
    side: "buy" | "sell";
    quantity: number;
    limitPrice: number | null;
    reason: string;
  },
): Promise<ChainResult> {
  const key = getAccessKey();

  if (!key) {
    throw new Error(
      "Founder Session not found. Please return to Founder Console and enter the Founder Access Key.",
    );
  }

  const response = await fetch(
    "/api/founder/market/trading-control-chain",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      cache: "no-store",
      body: JSON.stringify({ order }),
    },
  );

  const data = (await response.json()) as ChainResult;

  if (response.status === 401) {
    throw new Error("Founder authentication failed.");
  }

  if (!response.ok) {
    throw new Error(
      data.error ?? "Trading control chain request failed.",
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
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 16,
        padding: 18,
        background: "rgba(255,255,255,0.035)",
      }}
    >
      {eyebrow ? (
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.12em",
            opacity: 0.45,
            marginBottom: 6,
          }}
        >
          {eyebrow}
        </div>
      ) : null}

      <h2
        style={{
          margin: "0 0 14px",
          fontSize: 16,
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
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 11,
        background: ok
          ? "rgba(74,222,128,0.12)"
          : "rgba(248,113,113,0.12)",
        color: ok ? "#86efac" : "#fca5a5",
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
        padding: 12,
        borderRadius: 10,
        background: "rgba(255,255,255,0.035)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          opacity: 0.5,
          marginBottom: 5,
        }}
      >
        {label}
      </div>

      <strong style={{ fontSize: 14 }}>{value}</strong>
    </div>
  );
}

export default function TradingControlChainPage() {
  const [sessionDetected, setSessionDetected] = useState(false);
  const [symbol, setSymbol] = useState("NVDA");
  const [market, setMarket] = useState("us");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("1");
  const [limitPrice, setLimitPrice] = useState("");
  const [reason, setReason] = useState(
    "Founder-reviewed market execution intent.",
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChainResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setSessionDetected(Boolean(getAccessKey()));
  }, []);

  async function evaluateChain() {
    const parsedQuantity = Number(quantity);

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }

    const parsedLimitPrice = limitPrice.trim()
      ? Number(limitPrice)
      : null;

    if (
      parsedLimitPrice !== null &&
      (!Number.isFinite(parsedLimitPrice) || parsedLimitPrice <= 0)
    ) {
      setError("Limit price must be a positive number.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await requestControlChain({
        symbol: symbol.trim().toUpperCase(),
        market,
        side,
        quantity: Math.floor(parsedQuantity),
        limitPrice: parsedLimitPrice,
        reason: reason.trim(),
      });

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Trading control chain evaluation failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  const gates = result?.gates;
  const execution = result?.execution;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#09090b",
        color: "#f4f4f5",
        padding: "26px 18px 70px",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <header style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.14em",
              opacity: 0.45,
              marginBottom: 8,
            }}
          >
            PRIVATE FOUNDER CONTROL
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 18,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 30,
                  letterSpacing: "-0.02em",
                }}
              >
                Trading Control Chain
              </h1>

              <p
                style={{
                  margin: "8px 0 0",
                  opacity: 0.62,
                  lineHeight: 1.6,
                  fontSize: 13,
                }}
              >
                Research → Provider → Commercial → Broker Adapter → Human Review → Execution
              </p>
            </div>

            <Badge ok={sessionDetected}>
              {sessionDetected ? "Founder Session" : "Session Required"}
            </Badge>
          </div>
        </header>

        {error ? (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 10,
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.16)",
              color: "#fca5a5",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 16 }}>
          <Section title="Order Intent" eyebrow="FOUNDER REVIEW INPUT">
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(0, 1.4fr) minmax(110px, 0.6fr) minmax(110px, 0.6fr)",
                gap: 10,
              }}
            >
              <input
                value={symbol}
                onChange={(event) => setSymbol(event.target.value)}
                placeholder="Symbol"
                style={{
                  minWidth: 0,
                  padding: "12px 13px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#fff",
                }}
              />

              <select
                value={market}
                onChange={(event) => setMarket(event.target.value)}
                style={{
                  padding: "12px 13px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "#18181b",
                  color: "#fff",
                }}
              >
                <option value="us">US</option>
                <option value="hk">HK</option>
                <option value="cn">CN</option>
              </select>

              <select
                value={side}
                onChange={(event) =>
                  setSide(event.target.value as "buy" | "sell")
                }
                style={{
                  padding: "12px 13px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "#18181b",
                  color: "#fff",
                }}
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "0.6fr 0.7fr 1.7fr",
                gap: 10,
                marginTop: 10,
              }}
            >
              <input
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                inputMode="numeric"
                placeholder="Quantity"
                style={{
                  padding: "11px 12px",
                  borderRadius: 9,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#fff",
                }}
              />

              <input
                value={limitPrice}
                onChange={(event) => setLimitPrice(event.target.value)}
                inputMode="decimal"
                placeholder="Limit price"
                style={{
                  padding: "11px 12px",
                  borderRadius: 9,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#fff",
                }}
              />

              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Order reason"
                style={{
                  padding: "11px 12px",
                  borderRadius: 9,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#fff",
                }}
              />
            </div>

            <button
              onClick={evaluateChain}
              disabled={loading || !sessionDetected}
              style={{
                width: "100%",
                marginTop: 12,
                padding: "13px 16px",
                borderRadius: 10,
                border: "none",
                background: loading ? "#3f3f46" : "#fff",
                color: loading ? "#aaa" : "#09090b",
                fontWeight: 750,
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading
                ? "Evaluating Control Chain..."
                : "Evaluate Trading Control Chain"}
            </button>
          </Section>

          {result ? (
            <>
              <Section title="Control Decision" eyebrow="SERVER-SIDE DECISION">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="State"
                    value={result.controlDecision?.state ?? "unknown"}
                  />

                  <Metric
                    label="Execution"
                    value={
                      result.controlDecision?.executionAllowed
                        ? "Allowed"
                        : "Blocked"
                    }
                  />

                  <Metric
                    label="Live Execution"
                    value={
                      execution?.readyForLiveExecution
                        ? "Ready"
                        : "Disabled"
                    }
                  />
                </div>

                <p
                  style={{
                    margin: "14px 0 0",
                    fontSize: 13,
                    lineHeight: 1.7,
                    opacity: 0.7,
                  }}
                >
                  {result.controlDecision?.reason ??
                    "No control decision returned."}
                </p>
              </Section>

              <Section title="Control Chain" eyebrow="GATE-BY-GATE STATUS">
                <div style={{ display: "grid", gap: 9 }}>
                  {result.controlChain?.map((item) => {
                    const blocked =
                      item.state === "blocked" ||
                      item.state === "not-authorized" ||
                      item.state === "disabled" ||
                      item.state === "diagnostic-only" ||
                      item.state === "not-configured";

                    return (
                      <div
                        key={item.stage}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "140px 170px 1fr",
                          gap: 12,
                          alignItems: "center",
                          padding: 12,
                          borderRadius: 10,
                          background: "rgba(255,255,255,0.035)",
                        }}
                      >
                        <strong style={{ fontSize: 13 }}>
                          {item.stage ?? "unknown"}
                        </strong>

                        <Badge ok={!blocked}>
                          {item.state ?? "unknown"}
                        </Badge>

                        <span
                          style={{
                            fontSize: 12,
                            lineHeight: 1.55,
                            opacity: 0.62,
                          }}
                        >
                          {item.description ?? ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Section>

              <Section
                title="Provider & Commercial Gate"
                eyebrow="MARKET DATA BOUNDARY"
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="Provider"
                    value={result.provider?.id ?? "None"}
                  />

                  <Metric
                    label="Technical"
                    value={
                      result.provider?.technicalReady ? "Ready" : "Blocked"
                    }
                  />

                  <Metric
                    label="Realtime"
                    value={
                      result.provider?.realtimeVerified
                        ? "Verified"
                        : "Not verified"
                    }
                  />

                  <Metric
                    label="Commercial"
                    value={
                      result.commercialAuthorization?.decision ?? "unknown"
                    }
                  />
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="Commercial Gate"
                    value={
                      result.commercialAuthorization?.gateOpen
                        ? "Open"
                        : "Closed"
                    }
                  />

                  <Metric
                    label="Authorized"
                    value={
                      result.commercialAuthorization?.authorized
                        ? "Yes"
                        : "No"
                    }
                  />

                  <Metric
                    label="Reason"
                    value={
                      result.commercialAuthorization?.reason ?? "Not verified"
                    }
                  />
                </div>
              </Section>

              <Section
                title="Broker Adapter"
                eyebrow="EXECUTION ADAPTER BOUNDARY"
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="Adapter"
                    value={result.brokerAdapter?.id ?? "unconfigured"}
                  />

                  <Metric
                    label="Configured"
                    value={
                      result.brokerAdapter?.configured ? "Yes" : "No"
                    }
                  />

                  <Metric
                    label="Ready"
                    value={result.brokerAdapter?.ready ? "Yes" : "No"}
                  />

                  <Metric
                    label="Diagnostic"
                    value={
                      result.brokerAdapter?.diagnostic?.status ?? "unknown"
                    }
                  />
                </div>

                {result.brokerAdapter?.diagnostic?.blockedReasons?.length ? (
                  <ul
                    style={{
                      margin: "14px 0 0",
                      paddingLeft: 18,
                      fontSize: 12,
                      lineHeight: 1.7,
                      opacity: 0.72,
                    }}
                  >
                    {result.brokerAdapter.diagnostic.blockedReasons.map(
                      (item) => (
                        <li key={item}>{item}</li>
                      ),
                    )}
                  </ul>
                ) : null}
              </Section>

              <Section title="All Gates" eyebrow="SERVER-VERIFIED STATE">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  {[
                    ["Provider Technical", gates?.providerTechnicalReady],
                    ["Provider Realtime", gates?.providerRealtimeVerified],
                    ["Commercial", gates?.commercialGateOpen],
                    ["Broker Configured", gates?.brokerAdapterConfigured],
                    ["Broker Ready", gates?.brokerAdapterReady],
                    ["Broker Connection", gates?.brokerConnectionVerified],
                    ["Broker Credentials", gates?.brokerCredentialsVerified],
                    ["Broker Account", gates?.brokerAccountVerified],
                    ["Paper Trading", gates?.paperTradingVerified],
                    ["Human Review", gates?.humanReviewApproved],
                    ["Live Execution", gates?.liveExecutionEnabled],
                  ].map(([label, value]) => (
                    <Metric
                      key={String(label)}
                      label={String(label)}
                      value={value ? "PASS" : "BLOCKED"}
                    />
                  ))}
                </div>
              </Section>

              <Section title="Next Requirements" eyebrow="REMAINING CLOSURE">
                {result.nextRequirements?.length ? (
                  <ol
                    style={{
                      margin: 0,
                      paddingLeft: 20,
                      fontSize: 13,
                      lineHeight: 1.8,
                      opacity: 0.75,
                    }}
                  >
                    {result.nextRequirements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                ) : (
                  <div style={{ opacity: 0.55, fontSize: 13 }}>
                    No additional requirements returned.
                  </div>
                )}
              </Section>

              <Section
                title="Execution Safety Boundary"
                eyebrow="NON-BYPASSABLE"
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="Automatic Execution"
                    value={
                      result.safetyBoundary?.automaticExecutionAllowed
                        ? "Enabled"
                        : "Disabled"
                    }
                  />

                  <Metric
                    label="Live Execution"
                    value={
                      result.safetyBoundary?.liveExecutionEnabled
                        ? "Enabled"
                        : "Disabled"
                    }
                  />

                  <Metric
                    label="Live Order"
                    value={
                      execution?.liveOrderPlaced ? "Placed" : "Not placed"
                    }
                  />

                  <Metric
                    label="Trading"
                    value={
                      execution?.tradingExecuted ? "Executed" : "Not executed"
                    }
                  />

                  <Metric
                    label="Planner Dispatch"
                    value={
                      execution?.plannerDispatched
                        ? "Dispatched"
                        : "Disabled"
                    }
                  />

                  <Metric
                    label="Human Review"
                    value={
                      gates?.humanReviewApproved ? "Approved" : "Required"
                    }
                  />
                </div>
              </Section>
            </>
          ) : null}

          <footer
            style={{
              padding: "8px 2px",
              fontSize: 11,
              lineHeight: 1.7,
              opacity: 0.45,
            }}
          >
            Founder-only control surface. This page evaluates the server-side
            trading control chain and never places a live order. Ordinary users
            remain research-only.
          </footer>
        </div>
      </div>
    </main>
  );
}
