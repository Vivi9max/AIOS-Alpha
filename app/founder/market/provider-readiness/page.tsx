"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

type ReadinessLevel =
  | "ready"
  | "technical-only"
  | "not-configured"
  | "restricted"
  | "unknown";

type ReadinessDecision = {
  level: ReadinessLevel;
  canUseForResearch: boolean;
  canClaimRealtime: boolean;
  canUseForCommercialProduct: boolean;
  reason: string;
};

type ProviderStatus = {
  configured?: boolean;
  available?: boolean;
  supportsQuote?: boolean;
  supportsRealtime?: boolean;
  supportsHistorical?: boolean;
  supportsFundamentals?: boolean;
  supportsMarkets?: string[];
  entitledMarkets?: string[];
  realtimeVerifiedMarkets?: string[];
  commercialStatus?:
    | "unknown"
    | "not_verified"
    | "eligible"
    | "restricted";
  commercialStatusVerifiedAt?: string | null;
  commercialStatusReason?: string | null;
  reason?: string | null;
};

type ProviderCapabilities = {
  marketCapabilities?: unknown[];
  supportsRealtime?: boolean;
  supportsHistorical?: boolean;
  supportsFundamentals?: boolean;
  supportsQuote?: boolean;
  [key: string]: unknown;
};

type ReadinessResult = {
  success?: boolean;
  code?: string;
  stage?: string;
  requestedProvider?: string | null;

  providerRegistry?: {
    providerIds?: string[];
    count?: number;
  };

  selection?: {
    requestedProvider?: string | null;
    activeProvider?: string | null;
    availableProviders?: string[];
    effectiveProvider?: string | null;
  };

  primaryProvider?: {
    id?: string;
    displayName?: string;
  } | null;

  providerStatus?: ProviderStatus;

  capabilities?: ProviderCapabilities;

  readiness?: ReadinessDecision;

  commercialBoundary?: {
    technicalSupportIsNotCommercialAuthorization?: boolean;
    accountEntitlementIsNotCommercialAuthorization?: boolean;
    realtimeVerificationIsNotCommercialAuthorization?: boolean;
    commercialAuthorizationRequired?: boolean;
    automaticCommercialApproval?: boolean;
    automaticProviderSwitchForCommercialAuthorization?: boolean;
  };

  controlPolicy?: {
    providerSelection?: string;
    founderCanInspect?: boolean;
    founderCanVerify?: boolean;
    founderCanOverrideCommercialAuthorization?: boolean;
    runtimeCanInventCommercialAuthorization?: boolean;
    publicRuntimeCanExposeUnverifiedCommercialClaims?: boolean;
  };

  recommendedAction?: string;

  safety?: {
    tradingExecution?: boolean;
    brokerConnection?: boolean;
    orderPlacement?: boolean;
    plannerDispatch?: boolean;
    automatedCommercialApproval?: boolean;
  };

  generatedAt?: string;

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

async function loadReadiness(): Promise<ReadinessResult> {
  const key =
    getAccessKey();

  if (!key) {
    throw new Error(
      "Founder Session not found. Please return to Founder Console and enter the Founder Access Key.",
    );
  }

  const response =
    await fetch(
      "/api/founder/market/provider-readiness",
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
      ReadinessResult;

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
        "Provider readiness request failed.",
    );
  }

  return data;
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

function readinessTone(
  level?: ReadinessLevel,
) {
  if (
    level ===
    "ready"
  ) {
    return "success" as const;
  }

  if (
    level ===
      "technical-only" ||
    level ===
      "not-configured"
  ) {
    return "warning" as const;
  }

  if (
    level ===
    "restricted"
  ) {
    return "danger" as const;
  }

  return "neutral" as const;
}

function readinessLabel(
  level?: ReadinessLevel,
): string {
  switch (
    level
  ) {
    case "ready":
      return "COMMERCIAL READY";

    case "technical-only":
      return "TECHNICAL ONLY";

    case "not-configured":
      return "NOT CONFIGURED";

    case "restricted":
      return "RESTRICTED";

    default:
      return "UNKNOWN";
  }
}

function BooleanValue({
  value,
}: {
  value?: boolean;
}) {
  return value ===
    true ? (
    <Badge tone="success">
      YES
    </Badge>
  ) : (
    <Badge>
      NO
    </Badge>
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
      }}
    >
      <div
        style={{
          fontSize:
            11,
          fontWeight:
            800,
          color:
            "#64748b",
          textTransform:
            "uppercase",
          letterSpacing:
            "0.05em",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop:
            7,
          fontSize:
            20,
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

function ControlRow({
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
          "13px 0",
        borderBottom:
          "1px solid #eef2f7",
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
              13,
            fontWeight:
              850,
            color:
              "#1e293b",
          }}
        >
          {label}
        </div>

        <div
          style={{
            marginTop:
              3,
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

      <BooleanValue
        value={value}
      />
    </div>
  );
}

export default function MarketProviderReadinessPage() {
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
  ] = useState<ReadinessResult | null>(
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
        await loadReadiness();

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
          : "Provider readiness evaluation failed.",
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  const readiness =
    result?.readiness;

  const provider =
    result?.primaryProvider;

  const status =
    result?.providerStatus;

  const selection =
    result?.selection;

  const boundary =
    result?.commercialBoundary;

  const control =
    result?.controlPolicy;

  const safety =
    result?.safety;

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
              20,
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
              Market Provider Readiness
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
              C167.5.9 · Provider Selection ·
              Technical Capability · Realtime
              Verification · Commercial Readiness
            </p>
          </div>

          <Link
            href="/founder/market/provider-diagnostics"
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
            Provider Diagnostics
          </Link>
        </header>

        <Section
          title="Founder Session"
          description="This control surface is restricted to the Founder Console session."
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap:
                10,
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
        </Section>

        <Section
          title="Provider Readiness"
          description="Commercial readiness is only granted when the provider contract explicitly establishes commercial eligibility."
        >
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "minmax(0, 1.4fr) minmax(220px, 0.6fr)",
              gap:
                16,
            }}
          >
            <div
              style={{
                padding:
                  18,
                borderRadius:
                  16,
                background:
                  "#0f172a",
                color:
                  "#ffffff",
              }}
            >
              <div
                style={{
                  fontSize:
                    11,
                  letterSpacing:
                    "0.08em",
                  color:
                    "#94a3b8",
                  fontWeight:
                    900,
                }}
              >
                ACTIVE PROVIDER
              </div>

              <div
                style={{
                  marginTop:
                    8,
                  fontSize:
                    27,
                  fontWeight:
                    950,
                  overflowWrap:
                    "anywhere",
                }}
              >
                {provider?.displayName ??
                  selection?.effectiveProvider ??
                  "Not loaded"}
              </div>

              <div
                style={{
                  marginTop:
                    5,
                  fontSize:
                    12,
                  color:
                    "#94a3b8",
                }}
              >
                ID:{" "}
                {provider?.id ??
                  "N/A"}
              </div>

              <div
                style={{
                  marginTop:
                    18,
                }}
              >
                <Badge
                  tone={readinessTone(
                    readiness?.level,
                  )}
                >
                  {readinessLabel(
                    readiness?.level,
                  )}
                </Badge>
              </div>
            </div>

            <div
              style={{
                display:
                  "grid",
                gap:
                  10,
              }}
            >
              <Metric
                label="Research"
                value={
                  readiness
                    ?.canUseForResearch
                    ? "ALLOWED"
                    : "BLOCKED"
                }
              />

              <Metric
                label="Realtime Claim"
                value={
                  readiness
                    ?.canClaimRealtime
                    ? "ALLOWED"
                    : "BLOCKED"
                }
              />

              <Metric
                label="Commercial"
                value={
                  readiness
                    ?.canUseForCommercialProduct
                    ? "ALLOWED"
                    : "BLOCKED"
                }
              />
            </div>
          </div>

          {readiness?.reason && (
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
                color:
                  "#475569",
                fontSize:
                  12,
                lineHeight:
                  1.6,
              }}
            >
              <strong>
                Decision:
              </strong>{" "}
              {readiness.reason}
            </div>
          )}
        </Section>

        <Section
          title="Provider Selection"
          description="The runtime provider is controlled by the existing registry and environment selection boundary."
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
              label="Requested"
              value={
                selection
                  ?.requestedProvider ??
                "Automatic"
              }
            />

            <Metric
              label="Active"
              value={
                selection
                  ?.activeProvider ??
                "None"
              }
            />

            <Metric
              label="Effective"
              value={
                selection
                  ?.effectiveProvider ??
                "None"
              }
            />

            <Metric
              label="Available"
              value={
                String(
                  selection
                    ?.availableProviders
                    ?.length ??
                  0,
                )
              }
            />
          </div>

          <div
            style={{
              marginTop:
                12,
              display:
                "flex",
              flexWrap:
                "wrap",
              gap:
                7,
            }}
          >
            {selection?.availableProviders?.map(
              (
                item,
              ) => (
                <Badge
                  key={
                    item
                  }
                  tone="neutral"
                >
                  {item}
                </Badge>
              ),
            )}
          </div>
        </Section>

        <Section
          title="Technical Capability"
          description="Technical access does not automatically authorize commercial use."
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
              label="Configured"
              value={
                status?.configured
                  ? "YES"
                  : "NO"
              }
            />

            <Metric
              label="Available"
              value={
                status?.available
                  ? "YES"
                  : "NO"
              }
            />

            <Metric
              label="Realtime"
              value={
                status?.supportsRealtime
                  ? "SUPPORTED"
                  : "NOT VERIFIED"
              }
            />

            <Metric
              label="Historical"
              value={
                status?.supportsHistorical
                  ? "SUPPORTED"
                  : "NO"
              }
            />

            <Metric
              label="Fundamentals"
              value={
                status?.supportsFundamentals
                  ? "SUPPORTED"
                  : "NO"
              }
            />

            <Metric
              label="Quote"
              value={
                status?.supportsQuote
                  ? "SUPPORTED"
                  : "NO"
              }
            />
          </div>
        </Section>

        <Section
          title="Market Coverage"
          description="Coverage is displayed from the provider contract and runtime capability state."
        >
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(3, minmax(0, 1fr))",
              gap:
                10,
            }}
          >
            <Metric
              label="Supported Markets"
              value={
                status
                  ?.supportsMarkets
                  ?.join(", ") ??
                "None"
              }
            />

            <Metric
              label="Entitled Markets"
              value={
                status
                  ?.entitledMarkets
                  ?.join(", ") ??
                "None"
              }
            />

            <Metric
              label="Realtime Verified"
              value={
                status
                  ?.realtimeVerifiedMarkets
                  ?.join(", ") ??
                "None"
              }
            />
          </div>
        </Section>

        <Section
          title="Commercial Authorization"
          description="AIOS keeps commercial authorization as an explicit boundary. It is never inferred from API availability."
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
              label="Commercial Status"
              value={
                status
                  ?.commercialStatus ??
                "unknown"
              }
            />

            <Metric
              label="Verified At"
              value={
                status
                  ?.commercialStatusVerifiedAt ??
                "Not verified"
              }
            />

            <Metric
              label="Authorization"
              value={
                readiness
                  ?.canUseForCommercialProduct
                  ? "AUTHORIZED"
                  : "NOT AUTHORIZED"
              }
            />
          </div>

          {status?.commercialStatusReason && (
            <div
              style={{
                marginTop:
                  12,
                padding:
                  14,
                borderRadius:
                  13,
                background:
                  "#fffbeb",
                border:
                  "1px solid #fde68a",
                color:
                  "#854d0e",
                fontSize:
                  12,
                lineHeight:
                  1.6,
              }}
            >
              {status.commercialStatusReason}
            </div>
          )}
        </Section>

        <Section
          title="Boundary Controls"
          description="These controls show what the current AIOS runtime is explicitly permitted to infer or expose."
        >
          <ControlRow
            label="Technical Support Is Not Commercial Authorization"
            value={
              boundary
                ?.technicalSupportIsNotCommercialAuthorization
            }
            description="Technical API capability cannot grant commercial rights."
          />

          <ControlRow
            label="Account Entitlement Is Not Commercial Authorization"
            value={
              boundary
                ?.accountEntitlementIsNotCommercialAuthorization
            }
            description="An entitled account still requires commercial-use verification."
          />

          <ControlRow
            label="Realtime Verification Is Not Commercial Authorization"
            value={
              boundary
                ?.realtimeVerificationIsNotCommercialAuthorization
            }
            description="A verified realtime feed does not establish licensing rights."
          />

          <ControlRow
            label="Commercial Authorization Required"
            value={
              boundary
                ?.commercialAuthorizationRequired
            }
            description="Production commercial integration requires explicit authorization."
          />

          <ControlRow
            label="Automatic Commercial Approval"
            value={
              boundary
                ?.automaticCommercialApproval
            }
            description="AIOS cannot automatically approve an unverified provider."
          />

          <ControlRow
            label="Automatic Provider Switch"
            value={
              boundary
                ?.automaticProviderSwitchForCommercialAuthorization
            }
            description="Commercial authorization cannot be created by automatic provider switching."
          />
        </Section>

        <Section
          title="Founder Control Policy"
          description="Founder can inspect and verify provider state, but runtime cannot manufacture commercial authorization."
        >
          <ControlRow
            label="Founder Can Inspect"
            value={
              control
                ?.founderCanInspect
            }
            description="Founder can inspect provider registry and readiness state."
          />

          <ControlRow
            label="Founder Can Verify"
            value={
              control
                ?.founderCanVerify
            }
            description="Founder can perform verification workflows."
          />

          <ControlRow
            label="Founder Can Override Commercial Authorization"
            value={
              control
                ?.founderCanOverrideCommercialAuthorization
            }
            description="Manual UI actions cannot bypass the commercial authorization boundary."
          />

          <ControlRow
            label="Runtime Can Invent Commercial Authorization"
            value={
              control
                ?.runtimeCanInventCommercialAuthorization
            }
            description="Runtime-generated assumptions cannot become licensing facts."
          />

          <ControlRow
            label="Public Runtime Can Expose Unverified Claims"
            value={
              control
                ?.publicRuntimeCanExposeUnverifiedCommercialClaims
            }
            description="Unverified commercial claims remain blocked from public runtime."
          />
        </Section>

        <Section
          title="Safety Boundary"
          description="Provider readiness does not create trading execution capability."
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
              label="Trading Execution"
              value={
                safety
                  ?.tradingExecution
                  ? "ENABLED"
                  : "DISABLED"
              }
            />

            <Metric
              label="Broker Connection"
              value={
                safety
                  ?.brokerConnection
                  ? "ENABLED"
                  : "DISABLED"
              }
            />

            <Metric
              label="Order Placement"
              value={
                safety
                  ?.orderPlacement
                  ? "ENABLED"
                  : "DISABLED"
              }
            />

            <Metric
              label="Planner Dispatch"
              value={
                safety
                  ?.plannerDispatch
                  ? "ENABLED"
                  : "DISABLED"
              }
            />

            <Metric
              label="Automated Commercial Approval"
              value={
                safety
                  ?.automatedCommercialApproval
                  ? "ENABLED"
                  : "DISABLED"
              }
            />
          </div>
        </Section>

        {result?.recommendedAction && (
          <Section
            title="Recommended Action"
          >
            <div
              style={{
                padding:
                  15,
                borderRadius:
                  14,
                background:
                  readiness?.level ===
                  "ready"
                    ? "#ecfdf5"
                    : "#fffbeb",
                border:
                  readiness?.level ===
                  "ready"
                    ? "1px solid #a7f3d0"
                    : "1px solid #fde68a",
                color:
                  readiness?.level ===
                  "ready"
                    ? "#065f46"
                    : "#854d0e",
                fontSize:
                  13,
                lineHeight:
                  1.65,
                fontWeight:
                  700,
              }}
            >
              {
                result.recommendedAction
              }
            </div>
          </Section>
        )}

        {error && (
          <Section title="Error">
            <div
              style={{
                padding:
                  14,
                borderRadius:
                  13,
                background:
                  "#fef2f2",
                border:
                  "1px solid #fecaca",
                color:
                  "#b91c1c",
                fontSize:
                  13,
                lineHeight:
                  1.6,
              }}
            >
              {error}
            </div>
          </Section>
        )}

        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            gap:
              12,
            marginTop:
              18,
            flexWrap:
              "wrap",
          }}
        >
          <div
            style={{
              fontSize:
                11,
              color:
                "#94a3b8",
            }}
          >
            {result?.generatedAt
              ? "Last evaluated: " +
                result.generatedAt
              : "Provider readiness not evaluated yet."}
          </div>

          <button
            type="button"
            onClick={() =>
              void refresh()
            }
            disabled={
              loading
            }
            style={{
              minHeight:
                44,
              padding:
                "0 18px",
              border:
                "none",
              borderRadius:
                13,
              background:
                loading
                  ? "#94a3b8"
                  : "#0f172a",
              color:
                "#ffffff",
              fontSize:
                13,
              fontWeight:
                900,
              cursor:
                loading
                  ? "wait"
                  : "pointer",
            }}
          >
            {loading
              ? "Evaluating..."
              : "Run Provider Readiness"}
          </button>
        </div>
      </div>
    </main>
  );
}
