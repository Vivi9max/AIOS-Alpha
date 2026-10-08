"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

const STORAGE_KEY = "aios-founder-access-key";

type Market = "us" | "hk" | "cn";
type Side = "buy" | "sell";

type ExecutionOrder = {
  symbol: string;
  market: Market;
  side: Side;
  quantity: number;
  limitPrice: number | null;
  reason: string;
};

type ReadinessFailureCode =
  | "PROVIDER_NOT_READY"
  | "PROVIDER_COMMERCIAL_GATE_CLOSED"
  | "PRETRADE_RISK_BLOCKED"
  | "PRETRADE_RISK_REVIEW_REQUIRED"
  | "HUMAN_REVIEW_REQUIRED"
  | "HUMAN_REVIEW_NOT_ACCEPTED"
  | "BROKER_CONNECTION_NOT_VERIFIED"
  | "BROKER_CREDENTIALS_NOT_VERIFIED"
  | "BROKER_ACCOUNT_NOT_VERIFIED"
  | "BROKER_VERIFICATION_INCOMPLETE"
  | "BROKER_ADAPTER_NOT_CONFIGURED"
  | "BROKER_ADAPTER_NOT_READY"
  | "EXECUTION_DISABLED"
  | string;

type ReadinessResult = {
  success: boolean;
  decision:
    | "ready"
    | "blocked"
    | "review-required"
    | "not-configured"
    | "unknown"
    | string;
  executionReady: boolean;
  order: ExecutionOrder;

  provider: {
    id: string | null;
    technicalReady: boolean;
    commercialGateOpen: boolean;
    commercialDecision: string;
    commercialReason: string;
  };

  preTradeRisk: {
    decision: string;
    passed: boolean;
    reviewRequired: boolean;
    estimatedNotional: number | null;
    blockedReasons: string[];
  };

  humanReview: {
    taskId: string | null;
    found: boolean;
    required: boolean;
    approved: boolean;
    decision: string;
    status: string;
    reviewId: string | null;
  };

  brokerConnection: {
    brokerId: string;
    status: string;
    decision: string;
    connectionVerified: boolean;
    credentialsVerified: boolean;
    accountVerified: boolean;
    verificationComplete: boolean;
    gateOpen: boolean;
    failureCodes: string[];
    reason: string;
  };

  brokerAdapter: {
    id: string;
    configured: boolean;
    ready: boolean;
    capabilities: {
      available: boolean;
      connectionVerified: boolean;
      credentialsVerified: boolean;
      accountVerified: boolean;
      supportsLiveOrders: boolean;
      supportsPaperOrders: boolean;
      supportsCancelOrders: boolean;
      supportsOrderStatus: boolean;
      supportedMarkets: Market[];
      executionEnabled: boolean;
    };
  };

  gates: {
    provider: boolean;
    commercial: boolean;
    preTradeRisk: boolean;
    humanReview: boolean;
    brokerConnection: boolean;
    brokerAdapter: boolean;
    execution: boolean;
  };

  failureCodes: ReadinessFailureCode[];

  safetyBoundary: {
    founderOnly: true;
    automaticExecution: false;
    liveOrderPlacement: false;
    tradingExecuted: false;
    callerCanOverride: false;
    callerCanBypass: false;
    commercialAuthorizationRequired: true;
    preTradeRiskRequired: true;
    persistentHumanReviewRequired: true;
    brokerConnectionVerificationRequired: true;
    brokerExecutionAdapterRequired: true;
    liveExecutionEnabled: false;
  };

  generatedAt: string;
};

type ReadinessResponse = {
  code?: string;
  stage?: string;
  success?: boolean;
  readiness?: ReadinessResult;
  orderIntent?: ExecutionOrder;
  humanReviewTaskId?: string | null;
  controlDecision?: string;
  executionReady?: boolean;
  gates?: ReadinessResult["gates"];
  failureCodes?: ReadinessFailureCode[];
  safetyBoundary?: ReadinessResult["safetyBoundary"];
  executionPolicy?: {
    readinessOnly?: boolean;
    executionRequested?: boolean;
    automaticExecution?: boolean;
    liveOrderPlacement?: boolean;
    tradingExecuted?: boolean;
    liveExecutionEnabled?: boolean;
  };
  generatedAt?: string;
  error?: string;
  message?: string;
};

function getAccessKey(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    window.sessionStorage
      .getItem(STORAGE_KEY)
      ?.trim() ?? ""
  );
}

async function requestReadiness(
  order: ExecutionOrder,
  taskId: string,
): Promise<ReadinessResponse> {
  const accessKey = getAccessKey();

  if (!accessKey) {
    throw new Error(
      "Founder Session not found. Please return to Founder Console and enter the Founder Access Key.",
    );
  }

  const response = await fetch(
    "/api/founder/market/execution-readiness",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order,
        ...(taskId
          ? {
              taskId,
            }
          : {}),
      }),
      cache: "no-store",
    },
  );

  const payload =
    (await response.json()) as ReadinessResponse;

  if (response.status === 401) {
    throw new Error(
      payload.error ??
        payload.message ??
        "Founder authentication failed.",
    );
  }

  if (!response.ok) {
    throw new Error(
      payload.error ??
        payload.message ??
        "Execution readiness evaluation failed.",
    );
  }

  return payload;
}

function formatDecision(
  value?: string | null,
): string {
  if (!value) {
    return "Not recorded";
  }

  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function formatBoolean(
  value?: boolean,
): string {
  return value ? "Yes" : "No";
}

function formatNumber(
  value?: number | null,
): string {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "Not available";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function decisionTone(
  decision?: string,
): "success" | "warning" | "danger" | "neutral" {
  switch (decision) {
    case "ready":
    case "approved":
    case "accepted":
    case "pass":
    case "verified":
      return "success";

    case "review-required":
    case "pending":
    case "deferred":
      return "warning";

    case "blocked":
    case "rejected":
    case "not-configured":
      return "danger";

    default:
      return "neutral";
  }
}

function ToneBadge({
  tone,
  children,
}: {
  tone: "success" | "warning" | "danger" | "neutral";
  children: ReactNode;
}) {
  const styles: Record<
    typeof tone,
    CSSProperties
  > = {
    success: {
      background:
        "rgba(74,222,128,0.12)",
      border:
        "1px solid rgba(74,222,128,0.2)",
      color: "#86efac",
    },
    warning: {
      background:
        "rgba(251,191,36,0.12)",
      border:
        "1px solid rgba(251,191,36,0.2)",
      color: "#fcd34d",
    },
    danger: {
      background:
        "rgba(248,113,113,0.12)",
      border:
        "1px solid rgba(248,113,113,0.2)",
      color: "#fca5a5",
    },
    neutral: {
      background:
        "rgba(255,255,255,0.06)",
      border:
        "1px solid rgba(255,255,255,0.1)",
      color: "#d4d4d8",
    },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 26,
        padding: "4px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 650,
        whiteSpace: "nowrap",
        ...styles[tone],
      }}
    >
      {children}
    </span>
  );
}

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        border:
          "1px solid rgba(255,255,255,0.09)",
        borderRadius: 16,
        padding: 18,
        background:
          "rgba(255,255,255,0.035)",
      }}
    >
      {eyebrow ? (
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.13em",
            color: "#71717a",
            marginBottom: 6,
          }}
        >
          {eyebrow}
        </div>
      ) : null}

      <h2
        style={{
          margin: 0,
          fontSize: 16,
          lineHeight: 1.35,
        }}
      >
        {title}
      </h2>

      {description ? (
        <p
          style={{
            margin:
              "7px 0 16px",
            color: "#71717a",
            fontSize: 12,
            lineHeight: 1.65,
          }}
        >
          {description}
        </p>
      ) : null}

      {children}
    </section>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "danger" | "neutral";
}) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: 12,
        borderRadius: 11,
        background:
          "rgba(255,255,255,0.035)",
        border:
          "1px solid rgba(255,255,255,0.055)",
      }}
    >
      <div
        style={{
          marginBottom: 6,
          color: "#71717a",
          fontSize: 10,
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>

      {tone ? (
        <ToneBadge tone={tone}>
          {value}
        </ToneBadge>
      ) : (
        <div
          style={{
            color: "#e4e4e7",
            fontSize: 13,
            fontWeight: 600,
            overflowWrap: "anywhere",
          }}
        >
          {value}
        </div>
      )}
    </div>
  );
}

function GateCard({
  label,
  value,
}: {
  label: string;
  value?: boolean;
}) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 11,
        background:
          "rgba(255,255,255,0.035)",
        border:
          "1px solid rgba(255,255,255,0.055)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            color: "#a1a1aa",
            fontSize: 11,
          }}
        >
          {label}
        </span>

        <ToneBadge
          tone={
            value
              ? "success"
              : "danger"
          }
        >
          {value
            ? "Passed"
            : "Blocked"}
        </ToneBadge>
      </div>
    </div>
  );
}

function BooleanRow({
  label,
  value,
}: {
  label: string;
  value?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding:
          "9px 0",
        borderBottom:
          "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <span
        style={{
          color: "#a1a1aa",
          fontSize: 12,
        }}
      >
        {label}
      </span>

      <ToneBadge
        tone={
          value
            ? "success"
            : "neutral"
        }
      >
        {formatBoolean(value)}
      </ToneBadge>
    </div>
  );
}

function InputLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label
      style={{
        display: "grid",
        gap: 6,
        minWidth: 0,
      }}
    >
      <span
        style={{
          color: "#a1a1aa",
          fontSize: 11,
        }}
      >
        {label}
      </span>

      {children}
    </label>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 42,
  boxSizing: "border-box",
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  padding:
    "9px 11px",
  background:
    "rgba(255,255,255,0.045)",
  color: "#f4f4f5",
  outline: "none",
  fontSize: 13,
};

export default function ExecutionReadinessPage() {
  const [
    sessionDetected,
    setSessionDetected,
  ] = useState(false);

  const [symbol, setSymbol] =
    useState("NVDA");

  const [market, setMarket] =
    useState<Market>("us");

  const [side, setSide] =
    useState<Side>("buy");

  const [quantity, setQuantity] =
    useState("1");

  const [limitPrice, setLimitPrice] =
    useState("");

  const [reason, setReason] =
    useState(
      "Founder-reviewed market execution intent.",
    );

  const [taskId, setTaskId] =
    useState("");

  const [
    result,
    setResult,
  ] =
    useState<ReadinessResponse | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [loadedAt, setLoadedAt] =
    useState<string | null>(null);

  useEffect(() => {
    setSessionDetected(
      Boolean(
        getAccessKey(),
      ),
    );
  }, []);

  const handleEvaluate =
    useCallback(async () => {
      const normalizedSymbol =
        symbol
          .trim()
          .toUpperCase();

      if (!normalizedSymbol) {
        setError(
          "Symbol is required.",
        );
        return;
      }

      const parsedQuantity =
        Number(quantity);

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

      const normalizedQuantity =
        Math.floor(
          parsedQuantity,
        );

      if (
        normalizedQuantity <= 0
      ) {
        setError(
          "Quantity must be a positive integer.",
        );
        return;
      }

      const parsedLimitPrice =
        limitPrice.trim()
          ? Number(limitPrice)
          : null;

      if (
        parsedLimitPrice !== null &&
        (!Number.isFinite(
          parsedLimitPrice,
        ) ||
          parsedLimitPrice <= 0)
      ) {
        setError(
          "Limit price must be a positive number.",
        );
        return;
      }

      if (!reason.trim()) {
        setError(
          "Reason is required.",
        );
        return;
      }

      setLoading(true);
      setError("");

      try {
        const order: ExecutionOrder =
          {
            symbol:
              normalizedSymbol,
            market,
            side,
            quantity:
              normalizedQuantity,
            limitPrice:
              parsedLimitPrice,
            reason:
              reason.trim(),
          };

        const payload =
          await requestReadiness(
            order,
            taskId.trim(),
          );

        setResult(payload);
        setLoadedAt(
          new Date().toISOString(),
        );
      } catch (value) {
        setError(
          value instanceof Error
            ? value.message
            : "Execution readiness evaluation failed.",
        );
      } finally {
        setLoading(false);
      }
    }, [
      limitPrice,
      market,
      quantity,
      reason,
      side,
      symbol,
      taskId,
    ]);

  const readiness =
    result?.readiness ?? null;

  const decision =
    result?.controlDecision ??
    readiness?.decision ??
    "unknown";

  const executionReady =
    result?.executionReady === true ||
    readiness?.executionReady === true;

  const gates =
    result?.gates ??
    readiness?.gates;

  const failures =
    result?.failureCodes ??
    readiness?.failureCodes ??
    [];

  const safety =
    result?.safetyBoundary ??
    readiness?.safetyBoundary;

  const risk =
    readiness?.preTradeRisk;

  const humanReview =
    readiness?.humanReview;

  const brokerConnection =
    readiness?.brokerConnection;

  const brokerAdapter =
    readiness?.brokerAdapter;

  const generatedAt =
    result?.generatedAt ??
    readiness?.generatedAt ??
    loadedAt;

  const decisionToneValue =
    decisionTone(decision);

  const orderSummary =
    useMemo(() => {
      if (!readiness?.order) {
        return null;
      }

      return readiness.order;
    }, [readiness]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "#09090b",
        color: "#f4f4f5",
        padding:
          "28px 18px 70px",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1120,
          margin: "0 auto",
        }}
      >
        <header
          style={{
            marginBottom: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems:
                "flex-start",
              justifyContent:
                "space-between",
              gap: 18,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color: "#71717a",
                  fontSize: 10,
                  letterSpacing:
                    "0.15em",
                  marginBottom: 8,
                }}
              >
                PRIVATE FOUNDER CONTROL
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize:
                    "clamp(26px, 4vw, 34px)",
                  lineHeight: 1.1,
                  letterSpacing:
                    "-0.025em",
                }}
              >
                Execution Readiness
              </h1>

              <p
                style={{
                  maxWidth: 820,
                  margin:
                    "9px 0 0",
                  color: "#71717a",
                  fontSize: 12,
                  lineHeight: 1.7,
                }}
              >
                Provider {" -> "}
                Commercial Authorization {" -> "}
                Pre-Trade Risk {" -> "}
                Human Review {" -> "}
                Broker Verification {" -> "}
                Broker Adapter {" -> "}
                Final Readiness
              </p>
            </div>

            <ToneBadge
              tone={
                sessionDetected
                  ? "success"
                  : "warning"
              }
            >
              {sessionDetected
                ? "Founder Session"
                : "Session Required"}
            </ToneBadge>
          </div>
        </header>

        {error ? (
          <div
            style={{
              marginBottom: 14,
              padding: 13,
              borderRadius: 11,
              border:
                "1px solid rgba(248,113,113,0.18)",
              background:
                "rgba(248,113,113,0.08)",
              color: "#fca5a5",
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gap: 14,
          }}
        >
          <Section
            eyebrow="FOUNDER INPUT"
            title="Readiness Evaluation"
            description="Submit an execution intent for server-side readiness evaluation. This page never places an order."
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <InputLabel label="Symbol">
                <input
                  value={symbol}
                  onChange={(event) =>
                    setSymbol(
                      event.target.value,
                    )
                  }
                  placeholder="NVDA"
                  style={
                    inputStyle
                  }
                />
              </InputLabel>

              <InputLabel label="Market">
                <select
                  value={market}
                  onChange={(event) =>
                    setMarket(
                      event.target
                        .value as Market,
                    )
                  }
                  style={
                    inputStyle
                  }
                >
                  <option value="us">
                    US
                  </option>
                  <option value="hk">
                    HK
                  </option>
                  <option value="cn">
                    A-SHARE
                  </option>
                </select>
              </InputLabel>

              <InputLabel label="Side">
                <select
                  value={side}
                  onChange={(event) =>
                    setSide(
                      event.target
                        .value as Side,
                    )
                  }
                  style={
                    inputStyle
                  }
                >
                  <option value="buy">
                    Buy
                  </option>
                  <option value="sell">
                    Sell
                  </option>
                </select>
              </InputLabel>

              <InputLabel label="Quantity">
                <input
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(
                      event.target.value,
                    )
                  }
                  inputMode="numeric"
                  style={
                    inputStyle
                  }
                />
              </InputLabel>

              <InputLabel label="Limit Price">
                <input
                  value={limitPrice}
                  onChange={(event) =>
                    setLimitPrice(
                      event.target.value,
                    )
                  }
                  inputMode="decimal"
                  placeholder="Optional"
                  style={
                    inputStyle
                  }
                />
              </InputLabel>

              <InputLabel label="Human Review Task ID">
                <input
                  value={taskId}
                  onChange={(event) =>
                    setTaskId(
                      event.target.value,
                    )
                  }
                  placeholder="Optional persistent review ID"
                  style={
                    inputStyle
                  }
                />
              </InputLabel>

              <div
                style={{
                  gridColumn:
                    "1 / -1",
                }}
              >
                <InputLabel label="Reason">
                  <textarea
                    value={reason}
                    onChange={(event) =>
                      setReason(
                        event.target.value,
                      )
                    }
                    rows={3}
                    style={{
                      ...inputStyle,
                      resize:
                        "vertical",
                      minHeight: 78,
                      lineHeight: 1.55,
                    }}
                  />
                </InputLabel>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                gap: 10,
                marginTop: 14,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                disabled={
                  loading ||
                  !sessionDetected
                }
                onClick={
                  handleEvaluate
                }
                style={{
                  minHeight: 42,
                  padding:
                    "0 16px",
                  borderRadius: 10,
                  border:
                    "1px solid rgba(255,255,255,0.14)",
                  background:
                    loading ||
                    !sessionDetected
                      ? "rgba(255,255,255,0.05)"
                      : "#f4f4f5",
                  color:
                    loading ||
                    !sessionDetected
                      ? "#71717a"
                      : "#09090b",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor:
                    loading ||
                    !sessionDetected
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {loading
                  ? "Evaluating..."
                  : "Evaluate Readiness"}
              </button>

              <span
                style={{
                  color: "#52525b",
                  fontSize: 11,
                }}
              >
                Readiness only. No order execution.
              </span>
            </div>
          </Section>

          {result ? (
            <>
              <Section
                eyebrow="FINAL DECISION"
                title="Readiness Status"
              >
                <div
                  style={{
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "space-between",
                    gap: 16,
                    flexWrap:
                      "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "#71717a",
                        fontSize: 11,
                        marginBottom: 6,
                      }}
                    >
                      Control Decision
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems:
                          "center",
                        gap: 10,
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <ToneBadge
                        tone={
                          decisionToneValue
                        }
                      >
                        {formatDecision(
                          decision,
                        )}
                      </ToneBadge>

                      <span
                        style={{
                          color:
                            executionReady
                              ? "#86efac"
                              : "#a1a1aa",
                          fontSize: 13,
                          fontWeight: 650,
                        }}
                      >
                        {executionReady
                          ? "Execution Ready"
                          : "Execution Not Ready"}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      textAlign:
                        "right",
                    }}
                  >
                    <div
                      style={{
                        color: "#71717a",
                        fontSize: 10,
                      }}
                    >
                      Runtime Stage
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 13,
                        fontWeight: 650,
                      }}
                    >
                      {result.stage ??
                        "C167.5.37"}
                    </div>
                  </div>
                </div>

                {orderSummary ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(5, minmax(0, 1fr))",
                      gap: 10,
                      marginTop: 16,
                    }}
                  >
                    <Metric
                      label="Symbol"
                      value={
                        orderSummary.symbol
                      }
                    />
                    <Metric
                      label="Market"
                      value={
                        orderSummary.market.toUpperCase()
                      }
                    />
                    <Metric
                      label="Side"
                      value={
                        orderSummary.side.toUpperCase()
                      }
                    />
                    <Metric
                      label="Quantity"
                      value={String(
                        orderSummary.quantity,
                      )}
                    />
                    <Metric
                      label="Limit Price"
                      value={
                        orderSummary.limitPrice ===
                        null
                          ? "Not set"
                          : formatNumber(
                              orderSummary.limitPrice,
                            )
                      }
                    />
                  </div>
                ) : null}
              </Section>

              <Section
                eyebrow="CONTROL CHAIN"
                title="Execution Gates"
                description="Every gate is evaluated independently by the runtime. A readiness result does not enable live execution."
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(4, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <GateCard
                    label="Provider"
                    value={
                      gates?.provider
                    }
                  />
                  <GateCard
                    label="Commercial"
                    value={
                      gates?.commercial
                    }
                  />
                  <GateCard
                    label="Pre-Trade Risk"
                    value={
                      gates?.preTradeRisk
                    }
                  />
                  <GateCard
                    label="Human Review"
                    value={
                      gates?.humanReview
                    }
                  />
                  <GateCard
                    label="Broker Connection"
                    value={
                      gates?.brokerConnection
                    }
                  />
                  <GateCard
                    label="Broker Adapter"
                    value={
                      gates?.brokerAdapter
                    }
                  />
                  <GateCard
                    label="Execution"
                    value={
                      gates?.execution
                    }
                  />
                </div>
              </Section>

              <Section
                eyebrow="MARKET DATA"
                title="Provider"
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(4, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="Provider ID"
                    value={
                      readiness
                        ?.provider.id ??
                      "Not configured"
                    }
                  />

                  <Metric
                    label="Technical Ready"
                    value={
                      formatBoolean(
                        readiness
                          ?.provider
                          .technicalReady,
                      )
                    }
                    tone={
                      readiness
                        ?.provider
                        .technicalReady
                        ? "success"
                        : "danger"
                    }
                  />

                  <Metric
                    label="Commercial Gate"
                    value={
                      formatBoolean(
                        readiness
                          ?.provider
                          .commercialGateOpen,
                      )
                    }
                    tone={
                      readiness
                        ?.provider
                        .commercialGateOpen
                        ? "success"
                        : "danger"
                    }
                  />

                  <Metric
                    label="Commercial Decision"
                    value={formatDecision(
                      readiness
                        ?.provider
                        .commercialDecision,
                    )}
                  />
                </div>

                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 10,
                    background:
                      "rgba(255,255,255,0.025)",
                    color: "#a1a1aa",
                    fontSize: 12,
                    lineHeight: 1.65,
                  }}
                >
                  {readiness
                    ?.provider
                    .commercialReason ??
                    "Commercial authorization information is not available."}
                </div>
              </Section>

              <Section
                eyebrow="RISK CONTROL"
                title="Pre-Trade Risk"
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(4, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="Decision"
                    value={formatDecision(
                      risk?.decision,
                    )}
                    tone={decisionTone(
                      risk?.decision,
                    )}
                  />

                  <Metric
                    label="Passed"
                    value={formatBoolean(
                      risk?.passed,
                    )}
                    tone={
                      risk?.passed
                        ? "success"
                        : "danger"
                    }
                  />

                  <Metric
                    label="Review Required"
                    value={formatBoolean(
                      risk?.reviewRequired,
                    )}
                    tone={
                      risk?.reviewRequired
                        ? "warning"
                        : "neutral"
                    }
                  />

                  <Metric
                    label="Estimated Notional"
                    value={formatNumber(
                      risk?.estimatedNotional,
                    )}
                  />
                </div>

                {risk?.blockedReasons
                  ?.length ? (
                  <div
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gap: 7,
                    }}
                  >
                    {risk.blockedReasons.map(
                      (item) => (
                        <div
                          key={item}
                          style={{
                            padding: 10,
                            borderRadius: 9,
                            background:
                              "rgba(248,113,113,0.06)",
                            border:
                              "1px solid rgba(248,113,113,0.12)",
                            color:
                              "#fca5a5",
                            fontSize: 11,
                          }}
                        >
                          {item}
                        </div>
                      ),
                    )}
                  </div>
                ) : null}
              </Section>

              <Section
                eyebrow="HUMAN CONTROL"
                title="Persistent Human Review"
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(4, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="Task ID"
                    value={
                      humanReview
                        ?.taskId ??
                      "Not provided"
                    }
                  />

                  <Metric
                    label="Review Found"
                    value={formatBoolean(
                      humanReview
                        ?.found,
                    )}
                    tone={
                      humanReview?.found
                        ? "success"
                        : "warning"
                    }
                  />

                  <Metric
                    label="Required"
                    value={formatBoolean(
                      humanReview
                        ?.required,
                    )}
                    tone="neutral"
                  />

                  <Metric
                    label="Approved"
                    value={formatBoolean(
                      humanReview
                        ?.approved,
                    )}
                    tone={
                      humanReview?.approved
                        ? "success"
                        : "danger"
                    }
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(3, minmax(0, 1fr))",
                    gap: 10,
                    marginTop: 10,
                  }}
                >
                  <Metric
                    label="Decision"
                    value={formatDecision(
                      humanReview
                        ?.decision,
                    )}
                  />

                  <Metric
                    label="Status"
                    value={formatDecision(
                      humanReview
                        ?.status,
                    )}
                  />

                  <Metric
                    label="Review ID"
                    value={
                      humanReview
                        ?.reviewId ??
                      "Not recorded"
                    }
                  />
                </div>
              </Section>

              <Section
                eyebrow="BROKER CONTROL"
                title="Broker Connection Verification"
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(4, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="Broker"
                    value={
                      brokerConnection
                        ?.brokerId ??
                      "unconfigured"
                    }
                  />

                  <Metric
                    label="Status"
                    value={
                      brokerConnection
                        ?.status ??
                      "unknown"
                    }
                  />

                  <Metric
                    label="Decision"
                    value={formatDecision(
                      brokerConnection
                        ?.decision,
                    )}
                  />

                  <Metric
                    label="Gate"
                    value={formatBoolean(
                      brokerConnection
                        ?.gateOpen,
                    )}
                    tone={
                      brokerConnection
                        ?.gateOpen
                        ? "success"
                        : "danger"
                    }
                  />
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(4, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="Connection"
                    value={formatBoolean(
                      brokerConnection
                        ?.connectionVerified,
                    )}
                    tone={
                      brokerConnection
                        ?.connectionVerified
                        ? "success"
                        : "danger"
                    }
                  />

                  <Metric
                    label="Credentials"
                    value={formatBoolean(
                      brokerConnection
                        ?.credentialsVerified,
                    )}
                    tone={
                      brokerConnection
                        ?.credentialsVerified
                        ? "success"
                        : "danger"
                    }
                  />

                  <Metric
                    label="Account"
                    value={formatBoolean(
                      brokerConnection
                        ?.accountVerified,
                    )}
                    tone={
                      brokerConnection
                        ?.accountVerified
                        ? "success"
                        : "danger"
                    }
                  />

                  <Metric
                    label="Verification Complete"
                    value={formatBoolean(
                      brokerConnection
                        ?.verificationComplete,
                    )}
                    tone={
                      brokerConnection
                        ?.verificationComplete
                        ? "success"
                        : "danger"
                    }
                  />
                </div>

                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 10,
                    background:
                      "rgba(255,255,255,0.025)",
                    color: "#a1a1aa",
                    fontSize: 12,
                    lineHeight: 1.65,
                  }}
                >
                  {brokerConnection
                    ?.reason ??
                    "Broker connection verification is not complete."}
                </div>

                {brokerConnection
                  ?.failureCodes
                  ?.length ? (
                  <ul
                    style={{
                      margin:
                        "12px 0 0",
                      paddingLeft: 20,
                      color:
                        "#fca5a5",
                      fontSize: 11,
                      lineHeight: 1.75,
                    }}
                  >
                    {brokerConnection.failureCodes.map(
                      (item) => (
                        <li key={item}>
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                ) : null}
              </Section>

              <Section
                eyebrow="EXECUTION ADAPTER"
                title="Broker Adapter"
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(4, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="Adapter ID"
                    value={
                      brokerAdapter
                        ?.id ??
                      "unconfigured"
                    }
                  />

                  <Metric
                    label="Configured"
                    value={formatBoolean(
                      brokerAdapter
                        ?.configured,
                    )}
                    tone={
                      brokerAdapter
                        ?.configured
                        ? "success"
                        : "danger"
                    }
                  />

                  <Metric
                    label="Ready"
                    value={formatBoolean(
                      brokerAdapter
                        ?.ready,
                    )}
                    tone={
                      brokerAdapter
                        ?.ready
                        ? "success"
                        : "danger"
                    }
                  />

                  <Metric
                    label="Execution Enabled"
                    value={formatBoolean(
                      brokerAdapter
                        ?.capabilities
                        .executionEnabled,
                    )}
                    tone={
                      brokerAdapter
                        ?.capabilities
                        .executionEnabled
                        ? "success"
                        : "neutral"
                    }
                  />
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(4, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="Available"
                    value={formatBoolean(
                      brokerAdapter
                        ?.capabilities
                        .available,
                    )}
                  />

                  <Metric
                    label="Connection Verified"
                    value={formatBoolean(
                      brokerAdapter
                        ?.capabilities
                        .connectionVerified,
                    )}
                  />

                  <Metric
                    label="Credentials Verified"
                    value={formatBoolean(
                      brokerAdapter
                        ?.capabilities
                        .credentialsVerified,
                    )}
                  />

                  <Metric
                    label="Account Verified"
                    value={formatBoolean(
                      brokerAdapter
                        ?.capabilities
                        .accountVerified,
                    )}
                  />

                  <Metric
                    label="Live Orders"
                    value={formatBoolean(
                      brokerAdapter
                        ?.capabilities
                        .supportsLiveOrders,
                    )}
                  />

                  <Metric
                    label="Paper Orders"
                    value={formatBoolean(
                      brokerAdapter
                        ?.capabilities
                        .supportsPaperOrders,
                    )}
                  />

                  <Metric
                    label="Cancel Orders"
                    value={formatBoolean(
                      brokerAdapter
                        ?.capabilities
                        .supportsCancelOrders,
                    )}
                  />

                  <Metric
                    label="Order Status"
                    value={formatBoolean(
                      brokerAdapter
                        ?.capabilities
                        .supportsOrderStatus,
                    )}
                  />
                </div>

                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 10,
                    background:
                      "rgba(255,255,255,0.025)",
                    color: "#a1a1aa",
                    fontSize: 11,
                    lineHeight: 1.65,
                  }}
                >
                  Supported markets:{" "}
                  {brokerAdapter
                    ?.capabilities
                    .supportedMarkets
                    ?.map(
                      (item) =>
                        item.toUpperCase(),
                    )
                    .join(", ") ??
                    "Not reported"}
                </div>
              </Section>

              {failures.length ? (
                <Section
                  eyebrow="BLOCKING CONDITIONS"
                  title="Failure Codes"
                  description="These are the runtime conditions preventing a fully executable state."
                >
                  <div
                    style={{
                      display: "grid",
                      gap: 7,
                    }}
                  >
                    {failures.map(
                      (item) => (
                        <div
                          key={item}
                          style={{
                            display: "flex",
                            alignItems:
                              "center",
                            gap: 9,
                            padding:
                              "10px 11px",
                            borderRadius: 9,
                            background:
                              "rgba(248,113,113,0.055)",
                            border:
                              "1px solid rgba(248,113,113,0.11)",
                          }}
                        >
                          <ToneBadge tone="danger">
                            Blocked
                          </ToneBadge>

                          <code
                            style={{
                              color:
                                "#fca5a5",
                              fontSize: 11,
                              overflowWrap:
                                "anywhere",
                            }}
                          >
                            {item}
                          </code>
                        </div>
                      ),
                    )}
                  </div>
                </Section>
              ) : null}

              <Section
                eyebrow="SAFETY BOUNDARY"
                title="Execution Safety Boundary"
                description="This runtime intentionally stops before actual trading execution."
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(4, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="Founder Only"
                    value={formatBoolean(
                      safety?.founderOnly,
                    )}
                    tone="success"
                  />

                  <Metric
                    label="Automatic Execution"
                    value={formatBoolean(
                      safety?.automaticExecution,
                    )}
                  />

                  <Metric
                    label="Live Order Placement"
                    value={formatBoolean(
                      safety?.liveOrderPlacement,
                    )}
                  />

                  <Metric
                    label="Trading Executed"
                    value={formatBoolean(
                      safety?.tradingExecuted,
                    )}
                  />

                  <Metric
                    label="Caller Override"
                    value={formatBoolean(
                      safety?.callerCanOverride,
                    )}
                  />

                  <Metric
                    label="Caller Bypass"
                    value={formatBoolean(
                      safety?.callerCanBypass,
                    )}
                  />

                  <Metric
                    label="Commercial Auth"
                    value={
                      safety
                        ?.commercialAuthorizationRequired
                        ? "Required"
                        : "Not required"
                    }
                  />

                  <Metric
                    label="Pre-Trade Risk"
                    value={
                      safety
                        ?.preTradeRiskRequired
                        ? "Required"
                        : "Not required"
                    }
                  />

                  <Metric
                    label="Human Review"
                    value={
                      safety
                        ?.persistentHumanReviewRequired
                        ? "Required"
                        : "Not required"
                    }
                  />

                  <Metric
                    label="Broker Verification"
                    value={
                      safety
                        ?.brokerConnectionVerificationRequired
                        ? "Required"
                        : "Not required"
                    }
                  />

                  <Metric
                    label="Broker Adapter"
                    value={
                      safety
                        ?.brokerExecutionAdapterRequired
                        ? "Required"
                        : "Not required"
                    }
                  />

                  <Metric
                    label="Live Execution"
                    value={formatBoolean(
                      safety?.liveExecutionEnabled,
                    )}
                  />
                </div>

                <div
                  style={{
                    marginTop: 14,
                    padding: 13,
                    borderRadius: 10,
                    border:
                      "1px solid rgba(251,191,36,0.13)",
                    background:
                      "rgba(251,191,36,0.055)",
                    color: "#fcd34d",
                    fontSize: 11,
                    lineHeight: 1.7,
                  }}
                >
                  Readiness evaluation only. This page does not
                  place orders, does not enable live execution,
                  does not bypass risk controls, and does not
                  allow the caller to override the execution boundary.
                </div>
              </Section>

              <Section
                eyebrow="RUNTIME DIAGNOSTIC"
                title="Runtime Metadata"
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(4, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="API Code"
                    value={
                      result.code ??
                      "Unknown"
                    }
                  />

                  <Metric
                    label="Stage"
                    value={
                      result.stage ??
                      "C167.5.37"
                    }
                  />

                  <Metric
                    label="Success"
                    value={formatBoolean(
                      result.success,
                    )}
                    tone={
                      result.success
                        ? "success"
                        : "danger"
                    }
                  />

                  <Metric
                    label="Generated At"
                    value={
                      generatedAt ??
                      "Not recorded"
                    }
                  />
                </div>
              </Section>
            </>
          ) : (
            <Section
              eyebrow="WAITING FOR EVALUATION"
              title="Execution Readiness"
            >
              <div
                style={{
                  padding: 20,
                  borderRadius: 12,
                  background:
                    "rgba(255,255,255,0.025)",
                  color: "#71717a",
                  fontSize: 12,
                  lineHeight: 1.7,
                }}
              >
                Configure the execution intent above and run
                the server-side readiness evaluation. No order
                will be placed.
              </div>
            </Section>
          )}
        </div>
      </div>
    </main>
  );
}
