"use client";

import {
  useEffect,
  useState,
} from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

type ProviderCapability = {
  market?: string;
  technicalSupport?: boolean;
  accountEntitled?:
    | "verified"
    | "denied"
    | "unknown";
  realtimeVerified?: boolean;
  commercialStatus?:
    | "unknown"
    | "not_verified"
    | "eligible"
    | "restricted";
  probeSymbol?: string;
  failureCode?: string | null;
  reason?: string | null;
};

type DiagnosticsResult = {
  success?: boolean;
  code?: string;
  stage?: string;
  timestamp?: string;
  latencyMs?: number;

  providerRegistry?: {
    providerIds?: string[];
    requestedProvider?: string | null;
    activeProvider?: string | null;
    configuredProvider?: string | null;
    configured?: boolean;
  };

  provider?: {
    id?: string;
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
  } | null;

  capabilities?: ProviderCapability[];

  summary?: {
    total?: number;
    technicallySupported?: number;
    entitled?: number;
    realtimeVerified?: number;
    commerciallyEligible?: number;
    commerciallyRestricted?: number;
    commercialNotVerified?: number;
    unknown?: number;
  };

  commercialBoundary?: {
    technicalSupport?: boolean;
    accountEntitlement?: boolean;
    realtimeVerification?: boolean;
    commercialAuthorization?: boolean;
    commercialAuthorizationVerified?: boolean;
    rule?: string;
  };

  safety?: {
    realtimeDataRequiresVerification?: boolean;
    webEvidenceIsNotRealtime?: boolean;
    commercialAuthorizationRequiresExplicitVerification?: boolean;
    tradingExecution?: boolean;
    automatedExecution?: boolean;
    plannerDispatch?: boolean;
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

async function requestDiagnostics(): Promise<DiagnosticsResult> {
  const key =
    getAccessKey();

  if (!key) {
    throw new Error(
      "Founder Session not found. Please return to Founder Console and enter the Founder Access Key.",
    );
  }

  const response =
    await fetch(
      "/api/founder/market/provider-diagnostics",
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${key}`,
        },
        cache: "no-store",
      },
    );

  const data =
    (await response.json()) as
      DiagnosticsResult;

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
        "Provider diagnostics request failed.",
    );
  }

  return data;
}

function StatusBadge({
  ok,
  warning,
  children,
}: {
  ok?: boolean;
  warning?: boolean;
  children: React.ReactNode;
}) {
  const background =
    ok
      ? "rgba(74,222,128,0.12)"
      : warning
        ? "rgba(250,204,21,0.12)"
        : "rgba(248,113,113,0.12)";

  const color =
    ok
      ? "#86efac"
      : warning
        ? "#fde047"
        : "#fca5a5";

  return (
    <span
      style={{
        display:
          "inline-flex",
        alignItems:
          "center",
        padding:
          "4px 9px",
        borderRadius:
          999,
        background,
        color,
        fontSize:
          11,
        fontWeight:
          700,
        letterSpacing:
          "0.02em",
      }}
    >
      {children}
    </span>
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
        border:
          "1px solid rgba(255,255,255,0.10)",
        borderRadius:
          16,
        padding:
          18,
        background:
          "rgba(255,255,255,0.035)",
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
              1.4,
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
              opacity:
                0.58,
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

function BooleanStatus({
  value,
  trueLabel = "YES",
  falseLabel = "NO",
}: {
  value?: boolean;
  trueLabel?: string;
  falseLabel?: string;
}) {
  if (value === true) {
    return (
      <StatusBadge ok>
        {trueLabel}
      </StatusBadge>
    );
  }

  return (
    <StatusBadge>
      {falseLabel}
    </StatusBadge>
  );
}

function MarketCapabilityCard({
  capability,
}: {
  capability: ProviderCapability;
}) {
  const technical =
    capability.technicalSupport ===
    true;

  const entitled =
    capability.accountEntitled ===
    "verified";

  const realtime =
    capability.realtimeVerified ===
    true;

  const commercial =
    capability.commercialStatus ===
    "eligible";

  const commercialWarning =
    capability.commercialStatus ===
      "not_verified" ||
    capability.commercialStatus ===
      "unknown";

  return (
    <div
      style={{
        padding:
          14,
        borderRadius:
          12,
        border:
          "1px solid rgba(255,255,255,0.08)",
        background:
          "rgba(255,255,255,0.025)",
      }}
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
            10,
          flexWrap:
            "wrap",
          marginBottom:
            12,
        }}
      >
        <strong
          style={{
            fontSize:
              15,
          }}
        >
          {capability.market ??
            "Unknown"}
        </strong>

        <StatusBadge
          ok={commercial}
          warning={
            commercialWarning
          }
        >
          {capability.commercialStatus ??
            "unknown"}
        </StatusBadge>
      </div>

      <div
        style={{
          display:
            "grid",
          gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
          gap:
            8,
        }}
      >
        <div>
          <div
            style={{
              fontSize:
                11,
              opacity:
                0.48,
              marginBottom:
                4,
            }}
          >
            Technical Support
          </div>

          <BooleanStatus
            value={
              technical
            }
          />
        </div>

        <div>
          <div
            style={{
              fontSize:
                11,
              opacity:
                0.48,
              marginBottom:
                4,
            }}
          >
            Account Entitlement
          </div>

          <StatusBadge
            ok={entitled}
            warning={
              capability.accountEntitled ===
              "unknown"
            }
          >
            {capability.accountEntitled ??
              "unknown"}
          </StatusBadge>
        </div>

        <div>
          <div
            style={{
              fontSize:
                11,
              opacity:
                0.48,
              marginBottom:
                4,
            }}
          >
            Realtime Verification
          </div>

          <BooleanStatus
            value={
              realtime
            }
          />
        </div>

        <div>
          <div
            style={{
              fontSize:
                11,
              opacity:
                0.48,
              marginBottom:
                4,
            }}
          >
            Commercial Authorization
          </div>

          <BooleanStatus
            value={
              commercial
            }
          />
        </div>
      </div>

      {(capability.probeSymbol ||
        capability.failureCode ||
        capability.reason) && (
        <div
          style={{
            marginTop:
              12,
            paddingTop:
              10,
            borderTop:
              "1px solid rgba(255,255,255,0.07)",
            fontSize:
              12,
            lineHeight:
              1.6,
            opacity:
              0.62,
          }}
        >
          {capability.probeSymbol && (
            <div>
              Probe symbol:{" "}
              <strong>
                {
                  capability.probeSymbol
                }
              </strong>
            </div>
          )}

          {capability.failureCode && (
            <div>
              Failure code:{" "}
              <strong>
                {
                  capability.failureCode
                }
              </strong>
            </div>
          )}

          {capability.reason && (
            <div>
              Reason:{" "}
              {
                capability.reason
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MarketProviderDiagnosticsPage() {
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
  ] = useState<DiagnosticsResult | null>(
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

  async function runDiagnostics() {
    setLoading(true);
    setError("");

    try {
      const data =
        await requestDiagnostics();

      setResult(data);
    } catch (err) {
      setResult(null);

      setError(
        err instanceof Error
          ? err.message
          : "Provider diagnostics failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  const summary =
    result?.summary;

  const boundary =
    result?.commercialBoundary;

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
          "28px 18px 60px",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth:
            980,
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
                11,
              letterSpacing:
                "0.12em",
              opacity:
                0.5,
              marginBottom:
                8,
            }}
          >
            PRIVATE FOUNDER ACCESS
          </div>

          <h1
            style={{
              margin:
                0,
              fontSize:
                28,
              lineHeight:
                1.2,
            }}
          >
            Market Provider Diagnostics
          </h1>

          <p
            style={{
              margin:
                "10px 0 0",
              opacity:
                0.62,
              lineHeight:
                1.6,
              fontSize:
                13,
            }}
          >
            C167.5.7 · Provider Registry ·
            Entitlement · Realtime Verification ·
            Commercial Boundary
          </p>
        </header>

        <Section
          title="Founder Session"
          description="This page is private and uses the existing Founder Console session."
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
                    ? "#4ade80"
                    : "#f87171",
                display:
                  "inline-block",
              }}
            />

            <strong>
              {sessionDetected
                ? "Founder Session detected"
                : "Founder Session not detected"}
            </strong>
          </div>
        </Section>

        <div
          style={{
            height:
              16,
          }}
        />

        <Section
          title="Provider Registry"
          description="The active provider is selected through the Market Data Provider Registry."
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
            <div
              style={{
                padding:
                  13,
                borderRadius:
                  11,
                background:
                  "rgba(255,255,255,0.04)",
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
                Active Provider
              </div>

              <strong>
                {result?.providerRegistry
                  ?.activeProvider ??
                  "Not loaded"}
              </strong>
            </div>

            <div
              style={{
                padding:
                  13,
                borderRadius:
                  11,
                background:
                  "rgba(255,255,255,0.04)",
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
                Requested Provider
              </div>

              <strong>
                {result?.providerRegistry
                  ?.requestedProvider ??
                  "Automatic"}
              </strong>
            </div>

            <div
              style={{
                padding:
                  13,
                borderRadius:
                  11,
                background:
                  "rgba(255,255,255,0.04)",
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
                Configured
              </div>

              <BooleanStatus
                value={
                  result?.providerRegistry
                    ?.configured
                }
              />
            </div>

            <div
              style={{
                padding:
                  13,
                borderRadius:
                  11,
                background:
                  "rgba(255,255,255,0.04)",
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
                Registry Providers
              </div>

              <strong>
                {result?.providerRegistry
                  ?.providerIds
                  ?.join(", ") ??
                  "Not loaded"}
              </strong>
            </div>
          </div>
        </Section>

        <div
          style={{
            height:
              16,
          }}
        />

        <Section
          title="Commercial Boundary"
          description="AIOS deliberately separates technical capability, account entitlement, realtime verification, and commercial authorization."
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
            <div
              style={{
                padding:
                  14,
                borderRadius:
                  11,
                background:
                  "rgba(255,255,255,0.04)",
              }}
            >
              <div
                style={{
                  fontSize:
                    11,
                  opacity:
                    0.5,
                  marginBottom:
                    6,
                }}
              >
                Technical Support
              </div>

              <BooleanStatus
                value={
                  boundary
                    ?.technicalSupport
                }
              />
            </div>

            <div
              style={{
                padding:
                  14,
                borderRadius:
                  11,
                background:
                  "rgba(255,255,255,0.04)",
              }}
            >
              <div
                style={{
                  fontSize:
                    11,
                  opacity:
                    0.5,
                  marginBottom:
                    6,
                }}
              >
                Account Entitlement
              </div>

              <BooleanStatus
                value={
                  boundary
                    ?.accountEntitlement
                }
              />
            </div>

            <div
              style={{
                padding:
                  14,
                borderRadius:
                  11,
                background:
                  "rgba(255,255,255,0.04)",
              }}
            >
              <div
                style={{
                  fontSize:
                    11,
                  opacity:
                    0.5,
                  marginBottom:
                    6,
                }}
              >
                Realtime Verification
              </div>

              <BooleanStatus
                value={
                  boundary
                    ?.realtimeVerification
                }
              />
            </div>

            <div
              style={{
                padding:
                  14,
                borderRadius:
                  11,
                background:
                  "rgba(255,255,255,0.04)",
              }}
            >
              <div
                style={{
                  fontSize:
                    11,
                  opacity:
                    0.5,
                  marginBottom:
                    6,
                }}
              >
                Commercial Authorization
              </div>

              <BooleanStatus
                value={
                  boundary
                    ?.commercialAuthorization
                }
              />
            </div>
          </div>

          {boundary?.rule && (
            <div
              style={{
                marginTop:
                  14,
                padding:
                  12,
                borderRadius:
                  10,
                background:
                  "rgba(250,204,21,0.07)",
                border:
                  "1px solid rgba(250,204,21,0.12)",
                fontSize:
                  12,
                lineHeight:
                  1.6,
                color:
                  "#fde68a",
              }}
            >
              {boundary.rule}
            </div>
          )}
        </Section>

        <div
          style={{
            height:
              16,
          }}
        />

        <Section
          title="Provider Status"
          description="Current provider status returned by the Market Runtime."
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
            <div
              style={{
                padding:
                  13,
                borderRadius:
                  11,
                background:
                  "rgba(255,255,255,0.04)",
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
                Provider
              </div>

              <strong>
                {result?.provider
                  ?.id ??
                  "Not loaded"}
              </strong>
            </div>

            <div
              style={{
                padding:
                  13,
                borderRadius:
                  11,
                background:
                  "rgba(255,255,255,0.04)",
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
                Commercial Status
              </div>

              <StatusBadge
                ok={
                  result?.provider
                    ?.commercialStatus ===
                  "eligible"
                }
                warning={
                  result?.provider
                    ?.commercialStatus ===
                    "unknown" ||
                  result?.provider
                    ?.commercialStatus ===
                    "not_verified"
                }
              >
                {result?.provider
                  ?.commercialStatus ??
                  "unknown"}
              </StatusBadge>
            </div>

            <div
              style={{
                padding:
                  13,
                borderRadius:
                  11,
                background:
                  "rgba(255,255,255,0.04)",
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
                Realtime Markets
              </div>

              <strong>
                {result?.provider
                  ?.realtimeVerifiedMarkets
                  ?.join(", ") ??
                  "None"}
              </strong>
            </div>

            <div
              style={{
                padding:
                  13,
                borderRadius:
                  11,
                background:
                  "rgba(255,255,255,0.04)",
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
                Entitled Markets
              </div>

              <strong>
                {result?.provider
                  ?.entitledMarkets
                  ?.join(", ") ??
                  "None"}
              </strong>
            </div>
          </div>

          {result?.provider
            ?.commercialStatusReason && (
            <div
              style={{
                marginTop:
                  14,
                fontSize:
                  12,
                lineHeight:
                  1.6,
                opacity:
                  0.6,
              }}
            >
              {
                result.provider
                  .commercialStatusReason
              }
            </div>
          )}
        </Section>

        <div
          style={{
            height:
              16,
          }}
        />

        <Section
          title="Market Capabilities"
          description="US / HK / CN capabilities are displayed independently. Technical access is not treated as commercial authorization."
        >
          {result?.capabilities
            ?.length ? (
            <div
              style={{
                display:
                  "grid",
                gap:
                  10,
              }}
            >
              {result.capabilities.map(
                (
                  capability,
                  index,
                ) => (
                  <MarketCapabilityCard
                    key={`${capability.market}-${index}`}
                    capability={
                      capability
                    }
                  />
                ),
              )}
            </div>
          ) : (
            <div
              style={{
                opacity:
                  0.55,
                fontSize:
                  13,
              }}
            >
              Run diagnostics to load
              provider capabilities.
            </div>
          )}
        </Section>

        <div
          style={{
            height:
              16,
          }}
        />

        <Section
          title="Capability Summary"
          description="Aggregated provider capability state."
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
            {[
              [
                "Technical",
                summary
                  ?.technicallySupported ??
                  0,
              ],
              [
                "Entitled",
                summary
                  ?.entitled ??
                  0,
              ],
              [
                "Realtime",
                summary
                  ?.realtimeVerified ??
                  0,
              ],
              [
                "Commercial",
                summary
                  ?.commerciallyEligible ??
                  0,
              ],
            ].map(
              ([label, value]) => (
                <div
                  key={
                    label
                  }
                  style={{
                    padding:
                      13,
                    borderRadius:
                      11,
                    background:
                      "rgba(255,255,255,0.04)",
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
                        20,
                    }}
                  >
                    {value}
                  </strong>
                </div>
              ),
            )}
          </div>
        </Section>

        <div
          style={{
            height:
              16,
          }}
        />

        <Section
          title="Safety Boundary"
          description="Provider diagnostics never initiate trading or Planner execution."
        >
          <div
            style={{
              display:
                "grid",
              gap:
                9,
            }}
          >
            <div>
              Realtime data requires explicit
              verification:{" "}
              <BooleanStatus
                value={
                  result?.safety
                    ?.realtimeDataRequiresVerification
                }
              />
            </div>

            <div>
              Web Evidence is not realtime:{" "}
              <BooleanStatus
                value={
                  result?.safety
                    ?.webEvidenceIsNotRealtime
                }
              />
            </div>

            <div>
              Commercial authorization requires
              explicit verification:{" "}
              <BooleanStatus
                value={
                  result?.safety
                    ?.commercialAuthorizationRequiresExplicitVerification
                }
              />
            </div>

            <div>
              Trading execution:{" "}
              <BooleanStatus
                value={
                  result?.safety
                    ?.tradingExecution
                }
                trueLabel="ENABLED"
                falseLabel="DISABLED"
              />
            </div>

            <div>
              Automated execution:{" "}
              <BooleanStatus
                value={
                  result?.safety
                    ?.automatedExecution
                }
                trueLabel="ENABLED"
                falseLabel="DISABLED"
              />
            </div>

            <div>
              Planner dispatch:{" "}
              <BooleanStatus
                value={
                  result?.safety
                    ?.plannerDispatch
                }
                trueLabel="ENABLED"
                falseLabel="DISABLED"
              />
            </div>
          </div>
        </Section>

        {error && (
          <>
            <div
              style={{
                height:
                  16,
              }}
            />

            <Section title="Diagnostics Error">
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
          </>
        )}

        <div
          style={{
            marginTop:
              18,
            display:
              "flex",
            gap:
              10,
            flexWrap:
              "wrap",
          }}
        >
          <button
            type="button"
            onClick={
              runDiagnostics
            }
            disabled={
              loading
            }
            style={{
              flex:
                "1 1 260px",
              minHeight:
                46,
              borderRadius:
                11,
              border:
                "none",
              background:
                loading
                  ? "#3f3f46"
                  : "#fff",
              color:
                loading
                  ? "#a1a1aa"
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
              ? "Running Provider Diagnostics..."
              : "Run Provider Diagnostics"}
          </button>
        </div>

        {result && (
          <div
            style={{
              marginTop:
                14,
              fontSize:
                11,
              opacity:
                0.42,
              textAlign:
                "center",
            }}
          >
            {result.code ??
              "C167_5_6_MARKET_PROVIDER_DIAGNOSTICS"}
            {" · "}
            {result.timestamp ??
              "unknown"}
            {" · "}
            {result.latencyMs ??
              0}
            ms
          </div>
        )}
      </div>
    </main>
  );
}
