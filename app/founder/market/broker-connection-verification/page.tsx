"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

type VerificationStatus =
  | "not-configured"
  | "pending"
  | "verified"
  | "failed"
  | "restricted";

type VerificationDecision =
  | "not-ready"
  | "review-required"
  | "verified"
  | "blocked";

type AdapterStatus =
  | "unconfigured"
  | "unavailable"
  | "diagnostic-only"
  | "execution-disabled";

type VerificationResult = {
  success?: boolean;
  code?: string;
  stage?: string;
  generatedAt?: string;

  adapter?: {
    id?: string;
    configured?: boolean;
    available?: boolean;
    status?: AdapterStatus;
  };

  capabilities?: {
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

  verification?: {
    success?: boolean;

    broker?: {
      brokerId?: string;
      status?: VerificationStatus;
      decision?: VerificationDecision;
      source?: string;
      connectionVerified?: boolean;
      credentialsVerified?: boolean;
      accountVerified?: boolean;
      executionEnabled?: boolean;
      verifiedAt?: string | null;
      verifiedBy?: string | null;
      contractReference?: string | null;
      reason?: string;
      failureCodes?: string[];
    };

    readiness?: {
      adapterConfigured?: boolean;
      adapterAvailable?: boolean;
      connectionVerified?: boolean;
      credentialsVerified?: boolean;
      accountVerified?: boolean;
      executionEnabled?: boolean;
      verificationComplete?: boolean;
    };

    gate?: {
      open?: boolean;
      decision?: VerificationDecision;
      executionEligible?: boolean;
    };
  };

  policy?: {
    stage?: string;
    verificationRequired?: boolean;
    connectionVerificationRequired?: boolean;
    credentialsVerificationRequired?: boolean;
    accountVerificationRequired?: boolean;
    executionAuthorization?: boolean;
    callerCanSelfVerify?: boolean;
    callerCanOverride?: boolean;
    callerCanBypass?: boolean;
    automaticVerification?: boolean;
    automaticExecution?: boolean;
    liveExecutionEnabled?: boolean;
  };

  diagnostics?: {
    adapterConfigured?: boolean;
    adapterAvailable?: boolean;
    connectionVerified?: boolean;
    credentialsVerified?: boolean;
    accountVerified?: boolean;
    executionEnabled?: boolean;
    verificationComplete?: boolean;
    decision?: VerificationDecision;
    status?: VerificationStatus;
    failureCodes?: string[];
    reason?: string;
  };

  controlChain?: {
    position?: string;
    brokerConnectionVerificationRequired?: boolean;
    brokerConnectionVerificationIndependent?: boolean;
    brokerAdapterExecutionStillRequired?: boolean;
    humanApprovalStillRequired?: boolean;
    preTradeRiskStillRequired?: boolean;
  };

  safetyBoundary?: {
    founderOnly?: boolean;
    diagnosticOnly?: boolean;
    brokerApiCalled?: boolean;
    credentialsSubmitted?: boolean;
    accountAccessed?: boolean;
    orderPlaced?: boolean;
    orderCancelled?: boolean;
    executionRequested?: boolean;
    automaticVerification?: boolean;
    automaticExecution?: boolean;
    callerCanSelfVerify?: boolean;
    callerCanOverride?: boolean;
    callerCanBypass?: boolean;
    liveExecutionEnabled?: boolean;
  };

  nextRequirements?: string[];

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

async function loadVerification(): Promise<VerificationResult> {
  const key =
    getAccessKey();

  if (!key) {
    throw new Error(
      "Founder Session not found. Please return to Founder Console and enter the Founder Access Key.",
    );
  }

  const response =
    await fetch(
      "/api/founder/market/broker-connection-verification",
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
      VerificationResult;

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
        "Broker connection verification failed.",
    );
  }

  return data;
}

function toneForStatus(
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
      "execution-disabled"
  ) {
    return "success";
  }

  if (
    value ===
      "pending" ||
    value ===
      "review-required" ||
    value ===
      "diagnostic-only" ||
    value ===
      "not-configured" ||
    value ===
      "unconfigured" ||
    value ===
      "unavailable"
  ) {
    return "warning";
  }

  if (
    value ===
      "failed" ||
    value ===
      "restricted" ||
    value ===
      "blocked"
  ) {
    return "danger";
  }

  return "neutral";
}

function BooleanBadge({
  value,
  positiveLabel = "YES",
  negativeLabel = "NO",
}: {
  value?: boolean;
  positiveLabel?: string;
  negativeLabel?: string;
}) {
  return (
    <Badge
      tone={
        value ===
        true
          ? "success"
          : "warning"
      }
    >
      {value ===
      true
        ? positiveLabel
        : negativeLabel}
    </Badge>
  );
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
            18,
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

function GateRow({
  label,
  value,
  description,
}: {
  label: string;
  value?: boolean;
  description: string;
}) {
  return (
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
        padding:
          14,
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
          minWidth:
            0,
        }}
      >
        <div
          style={{
            fontSize:
              12,
            fontWeight:
              900,
            color:
              "#0f172a",
          }}
        >
          {label}
        </div>

        <div
          style={{
            marginTop:
              4,
            fontSize:
              11,
            lineHeight:
              1.5,
            color:
              "#64748b",
          }}
        >
          {description}
        </div>
      </div>

      <BooleanBadge
        value={
          value
        }
      />
    </div>
  );
}

export default function BrokerConnectionVerificationPage() {
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
  ] = useState<VerificationResult | null>(
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
        await loadVerification();

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
          : "Broker connection verification failed.",
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

  const broker =
    result?.verification
      ?.broker;

  const readiness =
    result?.verification
      ?.readiness;

  const gate =
    result?.verification
      ?.gate;

  const policy =
    result?.policy;

  const diagnostics =
    result?.diagnostics;

  const controlChain =
    result?.controlChain;

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
            1080,
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
              Broker Connection Verification
            </h1>

            <p
              style={{
                maxWidth:
                  760,
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
              C167.5.33 · Connection ·
              Credentials · Account ·
              Verification Gate
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
              href="/founder/market/trading-control-chain"
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
              Trading Control Chain
            </Link>
          </div>
        </header>

        <Section
          title="Founder Session"
          description="Broker connection verification is restricted to the private Founder control surface."
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
                ? "Running Verification..."
                : "Run Verification"}
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
              title="Verification Decision"
              description="The server evaluates broker verification independently. Technical capability does not equal execution authorization."
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
                  label="Broker"
                  value={
                    broker?.brokerId ??
                    adapter?.id ??
                    "unconfigured"
                  }
                />

                <Metric
                  label="Status"
                  value={
                    broker?.status ??
                    "unknown"
                  }
                />

                <Metric
                  label="Decision"
                  value={
                    broker?.decision ??
                    "not-ready"
                  }
                />

                <Metric
                  label="Verification Gate"
                  value={
                    gate?.open
                      ? "OPEN"
                      : "CLOSED"
                  }
                />

                <Metric
                  label="Execution Eligible"
                  value={
                    gate?.executionEligible
                      ? "YES"
                      : "NO"
                  }
                />
              </div>

              <div
                style={{
                  display:
                    "flex",
                  gap:
                    8,
                  flexWrap:
                    "wrap",
                  marginTop:
                    14,
                }}
              >
                <Badge
                  tone={toneForStatus(
                    broker?.status,
                  )}
                >
                  {broker?.status ??
                    "UNKNOWN"}
                </Badge>

                <Badge
                  tone={toneForStatus(
                    broker?.decision,
                  )}
                >
                  {broker?.decision ??
                    "NOT READY"}
                </Badge>

                <Badge
                  tone={
                    gate?.open
                      ? "success"
                      : "warning"
                  }
                >
                  {gate?.open
                    ? "GATE OPEN"
                    : "GATE CLOSED"}
                </Badge>
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
                    "#f8fafc",
                  border:
                    "1px solid #e2e8f0",
                  color:
                    "#475569",
                  fontSize:
                    12,
                  lineHeight:
                    1.7,
                }}
              >
                {broker?.reason ??
                  "No broker verification reason returned."}
              </div>
            </Section>

            <Section
              title="Broker Verification Gates"
              description="All verification dimensions remain independent and server-controlled."
            >
              <div
                style={{
                  display:
                    "grid",
                  gap:
                    10,
                }}
              >
                <GateRow
                  label="Connection Verification"
                  value={
                    broker
                      ?.connectionVerified
                  }
                  description="The broker connection itself must be independently verified."
                />

                <GateRow
                  label="Credentials Verification"
                  value={
                    broker
                      ?.credentialsVerified
                  }
                  description="Broker credentials require independent verification before execution review."
                />

                <GateRow
                  label="Account Verification"
                  value={
                    broker
                      ?.accountVerified
                  }
                  description="The target broker account must be independently verified."
                />

                <GateRow
                  label="Execution Authorization"
                  value={
                    broker
                      ?.executionEnabled
                  }
                  description="Execution authorization remains disabled in this stage."
                />
              </div>
            </Section>

            <Section
              title="Verification Evidence"
              description="Only explicit runtime evidence is surfaced. The UI does not infer verification from configuration."
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
                  label="Source"
                  value={
                    broker?.source ??
                    "unknown"
                  }
                />

                <Metric
                  label="Verified By"
                  value={
                    broker?.verifiedBy ??
                    "Not supplied"
                  }
                />

                <Metric
                  label="Verified At"
                  value={
                    broker?.verifiedAt ??
                    "Not supplied"
                  }
                />

                <Metric
                  label="Contract"
                  value={
                    broker?.contractReference ??
                    "Not supplied"
                  }
                />

                <Metric
                  label="Adapter Configured"
                  value={
                    adapter?.configured
                      ? "YES"
                      : "NO"
                  }
                />

                <Metric
                  label="Adapter Available"
                  value={
                    adapter?.available
                      ? "YES"
                      : "NO"
                  }
                />
              </div>
            </Section>

            <Section
              title="Runtime Readiness"
              description="Verification completeness is separate from final execution readiness."
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
                  label="Adapter Configured"
                  value={
                    readiness
                      ?.adapterConfigured
                      ? "YES"
                      : "NO"
                  }
                />

                <Metric
                  label="Adapter Available"
                  value={
                    readiness
                      ?.adapterAvailable
                      ? "YES"
                      : "NO"
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
                  label="Verification Complete"
                  value={
                    readiness
                      ?.verificationComplete
                      ? "YES"
                      : "NO"
                  }
                />

                <Metric
                  label="Execution Enabled"
                  value={
                    readiness
                      ?.executionEnabled
                      ? "YES"
                      : "NO"
                  }
                />

                <Metric
                  label="Adapter Status"
                  value={
                    adapter?.status ??
                    "unknown"
                  }
                />
              </div>
            </Section>

            <Section
              title="Adapter Capabilities"
              description="Technical capabilities are informational and never constitute permission to execute."
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
              title="Policy Boundary"
              description="C167.5.31 verification policy remains explicit and non-overridable."
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
                <Metric
                  label="Verification Required"
                  value={
                    policy
                      ?.verificationRequired
                      ? "REQUIRED"
                      : "NO"
                  }
                />

                <Metric
                  label="Connection"
                  value={
                    policy
                      ?.connectionVerificationRequired
                      ? "REQUIRED"
                      : "NO"
                  }
                />

                <Metric
                  label="Credentials"
                  value={
                    policy
                      ?.credentialsVerificationRequired
                      ? "REQUIRED"
                      : "NO"
                  }
                />

                <Metric
                  label="Account"
                  value={
                    policy
                      ?.accountVerificationRequired
                      ? "REQUIRED"
                      : "NO"
                  }
                />

                <Metric
                  label="Caller Self Verify"
                  value={
                    policy
                      ?.callerCanSelfVerify
                      ? "ALLOWED"
                      : "DISABLED"
                  }
                />

                <Metric
                  label="Caller Override"
                  value={
                    policy
                      ?.callerCanOverride
                      ? "ALLOWED"
                      : "DISABLED"
                  }
                />

                <Metric
                  label="Caller Bypass"
                  value={
                    policy
                      ?.callerCanBypass
                      ? "ALLOWED"
                      : "DISABLED"
                  }
                />

                <Metric
                  label="Automatic Verification"
                  value={
                    policy
                      ?.automaticVerification
                      ? "ALLOWED"
                      : "DISABLED"
                  }
                />
              </div>
            </Section>

            <Section
              title="Control Chain Position"
              description="Broker verification is now a distinct control boundary before broker adapter execution review."
            >
              <div
                style={{
                  padding:
                    15,
                  borderRadius:
                    14,
                  background:
                    "#f8fafc",
                  border:
                    "1px solid #e2e8f0",
                  fontSize:
                    12,
                  lineHeight:
                    1.8,
                  color:
                    "#334155",
                  overflowWrap:
                    "anywhere",
                }}
              >
                {controlChain?.position ??
                  "Research -> Technical Provider -> Commercial Authorization -> Pre-Trade Risk -> Persistent Human Review -> Broker Connection Verification -> Broker Adapter -> Execution Review"}
              </div>

              <div
                style={{
                  display:
                    "grid",
                  gap:
                    10,
                  marginTop:
                    12,
                }}
              >
                <GateRow
                  label="Broker Connection Verification Required"
                  value={
                    controlChain
                      ?.brokerConnectionVerificationRequired
                  }
                  description="The connection verification boundary cannot be skipped."
                />

                <GateRow
                  label="Independent Verification"
                  value={
                    controlChain
                      ?.brokerConnectionVerificationIndependent
                  }
                  description="Verification remains separate from adapter execution capability."
                />

                <GateRow
                  label="Pre-Trade Risk Still Required"
                  value={
                    controlChain
                      ?.preTradeRiskStillRequired
                  }
                  description="Broker verification does not bypass pre-trade risk controls."
                />

                <GateRow
                  label="Human Approval Still Required"
                  value={
                    controlChain
                      ?.humanApprovalStillRequired
                  }
                  description="Broker verification does not replace persistent human review."
                />

                <GateRow
                  label="Broker Adapter Still Required"
                  value={
                    controlChain
                      ?.brokerAdapterExecutionStillRequired
                  }
                  description="Connection verification alone cannot execute an order."
                />
              </div>
            </Section>

            <Section
              title="Failure Codes"
              description="Server-generated verification failures are exposed without allowing client-side overrides."
            >
              {diagnostics
                ?.failureCodes
                ?.length ? (
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
                  {diagnostics.failureCodes.map(
                    (
                      code,
                    ) => (
                      <Badge
                        key={
                          code
                        }
                        tone="warning"
                      >
                        {code}
                      </Badge>
                    ),
                  )}
                </div>
              ) : (
                <Badge tone="success">
                  NO FAILURE CODES
                </Badge>
              )}

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
                  fontSize:
                    12,
                  lineHeight:
                    1.65,
                  color:
                    "#475569",
                }}
              >
                {diagnostics?.reason ??
                  "No additional diagnostic reason returned."}
              </div>
            </Section>

            <Section
              title="Safety Boundary"
              description="This stage performs diagnostics only. No broker API, account access, credential submission, or order execution occurs."
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
                  label="Founder Only"
                  value={
                    safety?.founderOnly
                      ? "YES"
                      : "NO"
                  }
                />

                <Metric
                  label="Diagnostic Only"
                  value={
                    safety?.diagnosticOnly
                      ? "YES"
                      : "NO"
                  }
                />

                <Metric
                  label="Broker API Called"
                  value={
                    safety?.brokerApiCalled
                      ? "YES"
                      : "NO"
                  }
                />

                <Metric
                  label="Credentials Submitted"
                  value={
                    safety?.credentialsSubmitted
                      ? "YES"
                      : "NO"
                  }
                />

                <Metric
                  label="Account Accessed"
                  value={
                    safety?.accountAccessed
                      ? "YES"
                      : "NO"
                  }
                />

                <Metric
                  label="Order Placed"
                  value={
                    safety?.orderPlaced
                      ? "YES"
                      : "NO"
                  }
                />

                <Metric
                  label="Automatic Execution"
                  value={
                    safety?.automaticExecution
                      ? "ALLOWED"
                      : "DISABLED"
                  }
                />

                <Metric
                  label="Live Execution"
                  value={
                    safety?.liveExecutionEnabled
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
                    1.7,
                }}
              >
                Verification evidence does not authorize
                trading. The runtime still requires
                pre-trade risk, persistent human approval,
                broker adapter readiness and a separately
                authorized execution boundary.
              </div>
            </Section>

            <Section
              title="Next Requirements"
              description="Remaining requirements are reported by the server and are not automatically satisfied."
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
                    fontSize:
                      13,
                    color:
                      "#64748b",
                  }}
                >
                  No additional requirements returned.
                </div>
              )}
            </Section>

            <Section
              title="Runtime Diagnostics"
              description="Raw stage identifiers are exposed for Founder verification and future adapter implementation."
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
                    diagnostics?.status ??
                    "UNKNOWN"
                  }
                />

                <Metric
                  label="Decision"
                  value={
                    diagnostics?.decision ??
                    "NOT READY"
                  }
                />

                <Metric
                  label="Verification Complete"
                  value={
                    diagnostics
                      ?.verificationComplete
                      ? "YES"
                      : "NO"
                  }
                />

                <Metric
                  label="Generated"
                  value={
                    result.generatedAt ??
                    "N/A"
                  }
                />
              </div>
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
          AIOS Founder Broker Connection Verification.
          This control surface is diagnostic only.
          Ordinary users remain on the research-only
          Market product.
        </footer>
      </div>
    </main>
  );
}
