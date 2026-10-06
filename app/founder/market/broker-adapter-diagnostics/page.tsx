"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

type CapabilityState = {
  adapterId?: string;
  available?: boolean;
  connectionVerified?: boolean;
  credentialsVerified?: boolean;
  accountVerified?: boolean;
  supportsLiveOrders?: boolean;
  supportsPaperOrders?: boolean;
  supportsCancelOrders?: boolean;
  supportsOrderStatus?: boolean;
  supportedMarkets?: string[];
  executionEnabled?: boolean;
};

type DiagnosticResult = {
  success?: boolean;
  code?: string;
  stage?: string;

  adapter?: {
    id?: string;
    configured?: boolean;
    readiness?:
      | "not-configured"
      | "diagnostic-only"
      | "blocked"
      | "ready-for-review";
    readyForExecution?: boolean;
  };

  capabilities?: CapabilityState;

  verification?: {
    brokerConnection?:
      | "verified"
      | "not-verified";
    brokerCredentials?:
      | "verified"
      | "not-verified";
    brokerAccount?:
      | "verified"
      | "not-verified";
    executionCapability?:
      | "enabled"
      | "disabled";
  };

  diagnostic?: {
    status?: string;
    blockedReasons?: string[];
    safetyBoundary?: {
      founderOnly?: boolean;
      humanReviewRequired?: boolean;
      paperTradingRequired?: boolean;
      brokerConnectionRequired?: boolean;
      brokerCredentialsRequired?: boolean;
      brokerAccountVerificationRequired?: boolean;
      automaticExecutionAllowed?: boolean;
      liveExecutionEnabled?: boolean;
    };
    generatedAt?: string;
  };

  readiness?: {
    state?: string;
    technicalAdapterAvailable?: boolean;
    connectionVerified?: boolean;
    credentialsVerified?: boolean;
    accountVerified?: boolean;
    executionEnabled?: boolean;
    liveExecutionReady?: boolean;
  };

  nextRequirements?: string[];

  commercialBoundary?: {
    brokerVerificationRequired?: boolean;
    paperTradingRequired?: boolean;
    humanReviewRequired?: boolean;
    executionAdapterRequired?: boolean;
    automaticExecutionAllowed?: boolean;
  };

  safetyBoundary?: {
    founderOnly?: boolean;
    liveOrderPlaced?: boolean;
    tradingExecuted?: boolean;
    brokerOrderId?: string | null;
    plannerDispatched?: boolean;
    automaticExecutionAllowed?: boolean;
    liveExecutionEnabled?: boolean;
  };

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

async function loadDiagnostics(): Promise<DiagnosticResult> {
  const key =
    getAccessKey();

  if (!key) {
    throw new Error(
      "Founder Session not found. Please return to Founder Console and enter the Founder Access Key.",
    );
  }

  const response =
    await fetch(
      "/api/founder/market/broker-adapter-diagnostics",
      {
        method:
          "GET",
        headers: {
          Accept:
            "application/json",
          Authorization:
            "Bearer " +
            key,
        },
        cache:
          "no-store",
      },
    );

  const data =
    (await response.json()) as
      DiagnosticResult;

  if (
    response.status ===
    401
  ) {
    throw new Error(
      "Founder authentication failed. Please return to Founder Console and re-enter the Founder Access Key.",
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ??
        "Broker adapter diagnostics request failed.",
    );
  }

  return data;
}

function toneForState(
  value?: string,
):
  | "success"
  | "warning"
  | "danger"
  | "neutral" {
  if (
    value ===
      "verified" ||
    value ===
      "enabled" ||
    value ===
      "ready-for-review"
  ) {
    return "success";
  }

  if (
    value ===
      "diagnostic-only" ||
    value ===
      "not-verified" ||
    value ===
      "disabled"
  ) {
    return "warning";
  }

  if (
    value ===
      "blocked"
  ) {
    return "danger";
  }

  return "neutral";
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?:
    | "success"
    | "warning"
    | "danger"
    | "neutral";
}) {
  const styles = {
    success: {
      background:
        "#ecfdf5",
      color:
        "#047857",
      border:
        "#a7f3d0",
    },
    warning: {
      background:
        "#fffbeb",
      color:
        "#a16207",
      border:
        "#fde68a",
    },
    danger: {
      background:
        "#fef2f2",
      color:
        "#b91c1c",
      border:
        "#fecaca",
    },
    neutral: {
      background:
        "#f8fafc",
      color:
        "#475569",
      border:
        "#e2e8f0",
    },
  }[tone];

  return (
    <span
      style={{
        display:
          "inline-flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        minHeight:
          26,
        padding:
          "0 10px",
        border:
          "1px solid " +
          styles.border,
        borderRadius:
          999,
        background:
          styles.background,
        color:
          styles.color,
        fontSize:
          11,
        fontWeight:
          900,
        letterSpacing:
          "0.02em",
      }}
    >
      {children}
    </span>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div
      style={{
        padding:
          14,
        border:
          "1px solid #e2e8f0",
        borderRadius:
          14,
        background:
          "#f8fafc",
        minWidth:
          0,
      }}
    >
      <div
        style={{
          fontSize:
            10,
          fontWeight:
            900,
          color:
            "#64748b",
          letterSpacing:
            "0.06em",
          textTransform:
            "uppercase",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop:
            7,
          fontSize:
            19,
          fontWeight:
            950,
          color:
            "#0f172a",
          overflowWrap:
            "anywhere",
        }}
      >
        {value}
      </div>

      {detail && (
        <div
          style={{
            marginTop:
              5,
            fontSize:
              11,
            lineHeight:
              1.5,
            color:
              "#94a3b8",
          }}
        >
          {detail}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        marginTop:
          16,
        padding:
          18,
        border:
          "1px solid #dbe3f0",
        borderRadius:
          18,
        background:
          "#ffffff",
        boxShadow:
          "0 5px 18px rgba(15, 23, 42, 0.035)",
      }}
    >
      <div
        style={{
          marginBottom:
            14,
        }}
      >
        <h2
          style={{
            margin:
              0,
            fontSize:
              16,
            lineHeight:
              1.35,
            fontWeight:
              900,
            color:
              "#0f172a",
          }}
        >
          {title}
        </h2>

        {description && (
          <p
            style={{
              margin:
                "6px 0 0",
              fontSize:
                12,
              lineHeight:
                1.6,
              color:
                "#64748b",
            }}
          >
            {description}
          </p>
        )}
      </div>

      {children}
    </section>
  );
}

function BooleanBadge({
  value,
}: {
  value?: boolean;
}) {
  return value ===
    true ? (
    <Badge tone="success">
      VERIFIED
    </Badge>
  ) : (
    <Badge tone="warning">
      NOT VERIFIED
    </Badge>
  );
}

export default function BrokerAdapterDiagnosticsPage() {
  const [
    sessionDetected,
    setSessionDetected,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    result,
    setResult,
  ] = useState<DiagnosticResult | null>(
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

  async function refresh() {
    setLoading(
      true,
    );

    setError("");

    try {
      const data =
        await loadDiagnostics();

      setResult(
        data,
      );

      setSessionDetected(
        true,
      );
    } catch (
      requestError
    ) {
      setResult(
        null,
      );

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Broker adapter diagnostics failed.",
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  const adapter =
    result?.adapter;

  const capabilities =
    result?.capabilities;

  const verification =
    result?.verification;

  const readiness =
    result?.readiness;

  const diagnostic =
    result?.diagnostic;

  const boundary =
    result?.commercialBoundary;

  const safety =
    result?.safetyBoundary;

  return (
    <main
      style={{
        minHeight:
          "100vh",
        padding:
          "28px 18px 60px",
        boxSizing:
          "border-box",
        background:
          "#f4f6fb",
        color:
          "#0f172a",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          width:
            "100%",
          maxWidth:
            1040,
          margin:
            "0 auto",
        }}
      >
        <header
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
            <div
              style={{
                fontSize:
                  11,
                fontWeight:
                  900,
                letterSpacing:
                  "0.12em",
                color:
                  "#64748b",
              }}
            >
              PRIVATE FOUNDER ACCESS
            </div>

            <h1
              style={{
                margin:
                  "8px 0 0",
                fontSize:
                  30,
                lineHeight:
                  1.15,
                fontWeight:
                  950,
              }}
            >
              Broker Adapter Diagnostics
            </h1>

            <p
              style={{
                maxWidth:
                  720,
                margin:
                  "10px 0 0",
                color:
                  "#64748b",
                fontSize:
                  13,
                lineHeight:
                  1.65,
              }}
            >
              C167.5.16 · Broker Adapter ·
              Connection · Credentials · Account ·
              Execution Capability
            </p>
          </div>

          <div
            style={{
              display:
                "flex",
              gap:
                8,
              flexWrap:
                "wrap",
            }}
          >
            <Link
              href="/founder/market"
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                minHeight:
                  42,
                padding:
                  "0 14px",
                border:
                  "1px solid #cbd5e1",
                borderRadius:
                  12,
                background:
                  "#ffffff",
                color:
                  "#334155",
                textDecoration:
                  "none",
                fontSize:
                  12,
                fontWeight:
                  900,
              }}
            >
              Market Terminal
            </Link>

            <Link
              href="/founder/market/provider-readiness"
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                minHeight:
                  42,
                padding:
                  "0 14px",
                border:
                  "1px solid #cbd5e1",
                borderRadius:
                  12,
                background:
                  "#ffffff",
                color:
                  "#334155",
                textDecoration:
                  "none",
                fontSize:
                  12,
                fontWeight:
                  900,
              }}
            >
              Provider Readiness
            </Link>
          </div>
        </header>

        <Section
          title="Founder Session"
          description="Broker diagnostics are restricted to the private Founder control surface."
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              gap:
                14,
              flexWrap:
                "wrap",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap:
                  9,
              }}
            >
              <span
                style={{
                  width:
                    9,
                  height:
                    9,
                  borderRadius:
                    "50%",
                  background:
                    sessionDetected
                      ? "#22c55e"
                      : "#ef4444",
                }}
              />

              <strong
                style={{
                  fontSize:
                    13,
                }}
              >
                {sessionDetected
                  ? "Founder Session detected"
                  : "Founder Session not detected"}
              </strong>
            </div>

            <button
              onClick={
                refresh
              }
              disabled={
                loading ||
                !sessionDetected
              }
              style={{
                minHeight:
                  40,
                padding:
                  "0 15px",
                border:
                  "1px solid #cbd5e1",
                borderRadius:
                  11,
                background:
                  loading
                    ? "#f1f5f9"
                    : "#0f172a",
                color:
                  loading
                    ? "#94a3b8"
                    : "#ffffff",
                fontWeight:
                  900,
                fontSize:
                  12,
                cursor:
                  loading
                    ? "wait"
                    : "pointer",
              }}
            >
              {loading
                ? "Running Diagnostics..."
                : "Run Diagnostics"}
            </button>
          </div>

          {error && (
            <div
              style={{
                marginTop:
                  14,
                padding:
                  13,
                borderRadius:
                  12,
                background:
                  "#fef2f2",
                border:
                  "1px solid #fecaca",
                color:
                  "#b91c1c",
                fontSize:
                  12,
                lineHeight:
                  1.6,
              }}
            >
              {error}
            </div>
          )}
        </Section>

        {result && (
          <>
            <Section
              title="Adapter Status"
              description="Configuration is not equivalent to broker connectivity or live execution authorization."
            >
              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",
                  gap:
                    10,
                }}
              >
                <Metric
                  label="Adapter"
                  value={
                    adapter?.id ??
                    "unconfigured"
                  }
                />

                <Metric
                  label="Configured"
                  value={
                    adapter?.configured
                      ? "YES"
                      : "NO"
                  }
                />

                <Metric
                  label="Readiness"
                  value={
                    adapter?.readiness ??
                    "unknown"
                  }
                />

                <Metric
                  label="Execution Ready"
                  value={
                    adapter
                      ?.readyForExecution
                      ? "YES"
                      : "NO"
                  }
                />
              </div>

              <div
                style={{
                  marginTop:
                    14,
                }}
              >
                <Badge
                  tone={toneForState(
                    adapter?.readiness,
                  )}
                >
                  {adapter?.readiness ??
                    "UNKNOWN"}
                </Badge>
              </div>
            </Section>

            <Section
              title="Server-side Verification"
              description="Each verification gate is independent. No caller-supplied boolean is treated as proof."
            >
              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(210px, 1fr))",
                  gap:
                    10,
                }}
              >
                <div
                  style={{
                    padding:
                      15,
                    border:
                      "1px solid #e2e8f0",
                    borderRadius:
                      14,
                    background:
                      "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        11,
                      fontWeight:
                        850,
                      color:
                        "#64748b",
                    }}
                  >
                    BROKER CONNECTION
                  </div>

                  <div
                    style={{
                      marginTop:
                        9,
                    }}
                  >
                    <Badge
                      tone={toneForState(
                        verification
                          ?.brokerConnection,
                      )}
                    >
                      {verification
                        ?.brokerConnection ??
                        "not-verified"}
                    </Badge>
                  </div>
                </div>

                <div
                  style={{
                    padding:
                      15,
                    border:
                      "1px solid #e2e8f0",
                    borderRadius:
                      14,
                    background:
                      "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        11,
                      fontWeight:
                        850,
                      color:
                        "#64748b",
                    }}
                  >
                    CREDENTIALS
                  </div>

                  <div
                    style={{
                      marginTop:
                        9,
                    }}
                  >
                    <Badge
                      tone={toneForState(
                        verification
                          ?.brokerCredentials,
                      )}
                    >
                      {verification
                        ?.brokerCredentials ??
                        "not-verified"}
                    </Badge>
                  </div>
                </div>

                <div
                  style={{
                    padding:
                      15,
                    border:
                      "1px solid #e2e8f0",
                    borderRadius:
                      14,
                    background:
                      "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        11,
                      fontWeight:
                        850,
                      color:
                        "#64748b",
                    }}
                  >
                    ACCOUNT
                  </div>

                  <div
                    style={{
                      marginTop:
                        9,
                    }}
                  >
                    <Badge
                      tone={toneForState(
                        verification
                          ?.brokerAccount,
                      )}
                    >
                      {verification
                        ?.brokerAccount ??
                        "not-verified"}
                    </Badge>
                  </div>
                </div>

                <div
                  style={{
                    padding:
                      15,
                    border:
                      "1px solid #e2e8f0",
                    borderRadius:
                      14,
                    background:
                      "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        11,
                      fontWeight:
                        850,
                      color:
                        "#64748b",
                    }}
                  >
                    EXECUTION CAPABILITY
                  </div>

                  <div
                    style={{
                      marginTop:
                        9,
                    }}
                  >
                    <Badge
                      tone={toneForState(
                        verification
                          ?.executionCapability,
                      )}
                    >
                      {verification
                        ?.executionCapability ??
                        "disabled"}
                    </Badge>
                  </div>
                </div>
              </div>
            </Section>

            <Section
              title="Execution Capabilities"
              description="Capabilities describe what the adapter can technically support; they do not authorize an order."
            >
              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(190px, 1fr))",
                  gap:
                    10,
                }}
              >
                <Metric
                  label="Live Orders"
                  value={
                    capabilities
                      ?.supportsLiveOrders
                      ? "SUPPORTED"
                      : "NOT SUPPORTED"
                  }
                />

                <Metric
                  label="Paper Orders"
                  value={
                    capabilities
                      ?.supportsPaperOrders
                      ? "SUPPORTED"
                      : "NOT SUPPORTED"
                  }
                />

                <Metric
                  label="Cancel Orders"
                  value={
                    capabilities
                      ?.supportsCancelOrders
                      ? "SUPPORTED"
                      : "NOT SUPPORTED"
                  }
                />

                <Metric
                  label="Order Status"
                  value={
                    capabilities
                      ?.supportsOrderStatus
                      ? "SUPPORTED"
                      : "NOT SUPPORTED"
                  }
                />

                <Metric
                  label="Execution"
                  value={
                    capabilities
                      ?.executionEnabled
                      ? "ENABLED"
                      : "DISABLED"
                  }
                />

                <Metric
                  label="Markets"
                  value={
                    capabilities
                      ?.supportedMarkets
                      ?.length
                      ? capabilities.supportedMarkets.join(
                          ", ",
                        )
                      : "None"
                  }
                />
              </div>
            </Section>

            <Section
              title="Readiness State"
              description="Live execution readiness remains a separate final state and is not inferred from adapter configuration."
            >
              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(190px, 1fr))",
                  gap:
                    10,
                }}
              >
                <Metric
                  label="Runtime State"
                  value={
                    readiness?.state ??
                    "unknown"
                  }
                />

                <Metric
                  label="Technical Adapter"
                  value={
                    readiness
                      ?.technicalAdapterAvailable
                      ? "AVAILABLE"
                      : "UNAVAILABLE"
                  }
                />

                <Metric
                  label="Connection"
                  value={
                    readiness
                      ?.connectionVerified
                      ? "VERIFIED"
                      : "NOT VERIFIED"
                  }
                />

                <Metric
                  label="Credentials"
                  value={
                    readiness
                      ?.credentialsVerified
                      ? "VERIFIED"
                      : "NOT VERIFIED"
                  }
                />

                <Metric
                  label="Account"
                  value={
                    readiness
                      ?.accountVerified
                      ? "VERIFIED"
                      : "NOT VERIFIED"
                  }
                />

                <Metric
                  label="Live Execution"
                  value={
                    readiness
                      ?.liveExecutionReady
                      ? "READY"
                      : "BLOCKED"
                  }
                />
              </div>
            </Section>

            <Section
              title="Next Requirements"
              description="The runtime reports the remaining prerequisites without automatically approving any of them."
            >
              {result.nextRequirements
                ?.length ? (
                <ol
                  style={{
                    margin:
                      0,
                    paddingLeft:
                      22,
                    color:
                      "#334155",
                    fontSize:
                      13,
                    lineHeight:
                      1.8,
                  }}
                >
                  {result.nextRequirements.map(
                    (
                      requirement,
                      index,
                    ) => (
                      <li
                        key={
                          requirement +
                          "-" +
                          index
                        }
                      >
                        {requirement}
                      </li>
                    ),
                  )}
                </ol>
              ) : (
                <div
                  style={{
                    color:
                      "#64748b",
                    fontSize:
                      13,
                  }}
                >
                  No additional requirements
                  returned.
                </div>
              )}
            </Section>

            <Section
              title="Execution Safety Boundary"
              description="This page is diagnostic only. It cannot place, cancel, or dispatch a real order."
            >
              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(200px, 1fr))",
                  gap:
                    10,
                }}
              >
                <Metric
                  label="Founder Only"
                  value={
                    safety?.founderOnly
                      ? "YES"
                      : "NO"
                  }
                />

                <Metric
                  label="Trading Executed"
                  value={
                    safety?.tradingExecuted
                      ? "YES"
                      : "NO"
                  }
                />

                <Metric
                  label="Live Order"
                  value={
                    safety?.liveOrderPlaced
                      ? "PLACED"
                      : "NONE"
                  }
                />

                <Metric
                  label="Planner Dispatch"
                  value={
                    safety?.plannerDispatched
                      ? "YES"
                      : "NO"
                  }
                />

                <Metric
                  label="Automatic Execution"
                  value={
                    safety
                      ?.automaticExecutionAllowed
                      ? "ALLOWED"
                      : "DISABLED"
                  }
                />

                <Metric
                  label="Live Execution"
                  value={
                    safety
                      ?.liveExecutionEnabled
                      ? "ENABLED"
                      : "DISABLED"
                  }
                />
              </div>

              <div
                style={{
                  marginTop:
                    14,
                  padding:
                    14,
                  borderRadius:
                    13,
                  background:
                    "#fffbeb",
                  border:
                    "1px solid #fde68a",
                  color:
                    "#92400e",
                  fontSize:
                    12,
                  lineHeight:
                    1.65,
                }}
              >
                Broker adapter diagnostics establish
                infrastructure readiness only. They do
                not authorize trading, do not create
                broker orders, and do not convert
                research conclusions into automatic
                execution.
              </div>
            </Section>

            <Section
              title="Commercial and Human Gates"
              description="Execution remains behind independent broker, paper-trading and human-review controls."
            >
              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(190px, 1fr))",
                  gap:
                    10,
                }}
              >
                <Metric
                  label="Broker Verification"
                  value={
                    boundary
                      ?.brokerVerificationRequired
                      ? "REQUIRED"
                      : "NOT REQUIRED"
                  }
                />

                <Metric
                  label="Paper Trading"
                  value={
                    boundary
                      ?.paperTradingRequired
                      ? "REQUIRED"
                      : "NOT REQUIRED"
                  }
                />

                <Metric
                  label="Human Review"
                  value={
                    boundary
                      ?.humanReviewRequired
                      ? "REQUIRED"
                      : "NOT REQUIRED"
                  }
                />

                <Metric
                  label="Execution Adapter"
                  value={
                    boundary
                      ?.executionAdapterRequired
                      ? "REQUIRED"
                      : "NOT REQUIRED"
                  }
                />

                <Metric
                  label="Automatic Execution"
                  value={
                    boundary
                      ?.automaticExecutionAllowed
                      ? "ALLOWED"
                      : "DISABLED"
                  }
                />
              </div>
            </Section>

            <Section
              title="Diagnostic Result"
              description="Raw runtime state identifiers are exposed for Founder verification and future adapter implementation."
            >
              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(190px, 1fr))",
                  gap:
                    10,
                }}
              >
                <Metric
                  label="Code"
                  value={
                    result.code ??
                    "UNKNOWN"
                  }
                />

                <Metric
                  label="Stage"
                  value={
                    result.stage ??
                    "UNKNOWN"
                  }
                />

                <Metric
                  label="Diagnostic Status"
                  value={
                    diagnostic
                      ?.status ??
                    "UNKNOWN"
                  }
                />

                <Metric
                  label="Generated"
                  value={
                    diagnostic
                      ?.generatedAt ??
                    "N/A"
                  }
                />
              </div>

              {diagnostic
                ?.blockedReasons
                ?.length ? (
                <div
                  style={{
                    marginTop:
                      14,
                    padding:
                      14,
                    borderRadius:
                      13,
                    background:
                      "#f8fafc",
                    border:
                      "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        11,
                      fontWeight:
                        900,
                      color:
                        "#64748b",
                      letterSpacing:
                        "0.05em",
                    }}
                  >
                    BLOCKED REASONS
                  </div>

                  <ul
                    style={{
                      margin:
                        "8px 0 0",
                      paddingLeft:
                        19,
                      fontSize:
                        12,
                      lineHeight:
                        1.75,
                      color:
                        "#475569",
                    }}
                  >
                    {diagnostic.blockedReasons.map(
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
            </Section>
          </>
        )}

        <footer
          style={{
            marginTop:
              18,
            padding:
              "8px 2px",
            fontSize:
              11,
            lineHeight:
              1.7,
            color:
              "#94a3b8",
          }}
        >
          AIOS Founder Broker Adapter Diagnostics.
          This control surface does not place orders
          or enable automatic execution. Ordinary users
          remain on the research-only Market product.
        </footer>
      </div>
    </main>
  );
}
