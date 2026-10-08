"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "aios-founder-access-key";

type ReadinessResult = {
  success?: boolean;
  decision?: string;
  executionReady?: boolean;
  provider?: {
    id?: string | null;
    displayName?: string | null;
    configured?: boolean;
    technicalReady?: boolean;
    commercialReady?: boolean;
    status?: string | null;
    reason?: string;
  };
  commercialAuthorization?: {
    providerId?: string | null;
    status?: string | null;
    decision?: string | null;
    authorized?: boolean;
    gateOpen?: boolean;
    source?: string | null;
    verifiedAt?: string | null;
    verifiedBy?: string | null;
    contractReference?: string | null;
    reason?: string | null;
  };
  preTradeRisk?: {
    decision?: string;
    approved?: boolean;
    estimatedNotional?: number | null;
    blockedReasons?: string[];
    reviewRequired?: boolean;
    policy?: {
      enabled?: boolean;
      allowedMarkets?: string[];
      maxOrderQuantity?: number;
      maxOrderNotional?: number;
      requireLimitPrice?: boolean;
      allowMarketOrders?: boolean;
      reviewRequiredAboveNotional?: number;
      version?: string;
    };
    checks?: {
      orderValid?: boolean;
      marketAllowed?: boolean;
      quantityWithinLimit?: boolean;
      notionalWithinLimit?: boolean;
      limitPriceValid?: boolean;
      reviewRequired?: boolean;
    };
  };
  humanReview?: {
    taskId?: string | null;
    found?: boolean;
    required?: boolean;
    requested?: boolean;
    approved?: boolean;
    decision?: string | null;
    status?: string | null;
    reviewId?: string | null;
    reason?: string | null;
    review?: {
      reviewId?: string;
      taskId?: string;
      symbol?: string;
      market?: string;
      taskTitle?: string;
      decision?: string;
      reviewerNote?: string;
      createdAt?: string;
      updatedAt?: string;
      humanDecisionRequired?: boolean;
      automatedExecutionStarted?: boolean;
      plannerDispatched?: boolean;
      tradingExecuted?: boolean;
    } | null;
  };
  brokerConnection?: {
    success?: boolean;
    broker?: {
      brokerId?: string;
      status?: string;
      decision?: string;
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
    verification?: {
      connectionVerified?: boolean;
      credentialsVerified?: boolean;
      accountVerified?: boolean;
      verificationComplete?: boolean;
    };
    gate?: {
      open?: boolean;
      reason?: string;
    };
  };
  brokerAdapter?: {
    id?: string;
    configured?: boolean;
    ready?: boolean;
    capabilities?: {
      available?: boolean;
      connectionVerified?: boolean;
      credentialsVerified?: boolean;
      accountVerified?: boolean;
      supportsLiveOrders?: boolean;
      supportsPaperOrders?: boolean;
      supportsCancelOrders?: boolean;
      supportsOrderStatus?: boolean;
      executionEnabled?: boolean;
    };
    diagnostic?: {
      status?: string;
      blockedReasons?: string[];
    };
  };
  gates?: {
    providerGate?: boolean;
    technicalProviderGate?: boolean;
    commercialGate?: boolean;
    preTradeRiskGate?: boolean;
    persistentHumanReviewGate?: boolean;
    brokerConnectionVerificationGate?: boolean;
    brokerAdapterGate?: boolean;
    executionGate?: boolean;
  };
  failureCodes?: string[];
  safetyBoundary?: {
    founderOnly?: boolean;
    automaticExecution?: boolean;
    liveOrderPlacement?: boolean;
    tradingExecuted?: boolean;
    liveExecutionEnabled?: boolean;
    callerCanOverride?: boolean;
    callerCanBypass?: boolean;
    preTradeRiskRequired?: boolean;
    persistentHumanReviewRequired?: boolean;
    commercialAuthorizationRequired?: boolean;
    brokerConnectionRequired?: boolean;
    executionAdapterRequired?: boolean;
  };
  nextRequirements?: string[];
  generatedAt?: string;
};

type ReadinessResponse = {
  code?: string;
  stage?: string;
  success?: boolean;
  readiness?: ReadinessResult;
  orderIntent?: {
    symbol?: string;
    market?: string;
    side?: string;
    quantity?: number;
    limitPrice?: number | null;
    reason?: string;
  };
  humanReviewTaskId?: string | null;
  controlDecision?: string;
  executionReady?: boolean;
  gates?: ReadinessResult["gates"];
  failureCodes?: string[];
  safetyBoundary?: ReadinessResult["safetyBoundary"];
  executionPolicy?: {
    readinessOnly?: boolean;
    executionRequested?: boolean;
    automaticExecution?: boolean;
    liveOrderPlacement?: boolean;
    tradingExecuted?: boolean;
    liveExecutionEnabled?: boolean;
  };
  error?: string;
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

async function requestJson(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const key = getAccessKey();

  if (!key) {
    throw new Error(
      "Founder Session not found. Please return to Founder Console and enter the Founder Access Key.",
    );
  }

  return fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

async function evaluateReadiness(
  order: {
    symbol: string;
    market: string;
    side: "buy" | "sell";
    quantity: number;
    limitPrice: number | null;
    reason: string;
  },
  taskId: string,
): Promise<ReadinessResponse> {
  const response = await requestJson(
    "/api/founder/market/execution-readiness",
    {
      method: "POST",
      headers: {
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
    },
  );

  const data =
    (await response.json()) as ReadinessResponse;

  if (response.status === 401) {
    throw new Error(
      "Founder authentication failed.",
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ??
        "Execution readiness evaluation failed.",
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
  warning,
  children,
}: {
  ok: boolean;
  warning?: boolean;
  children: ReactNode;
}) {
  const background = ok
    ? "rgba(74,222,128,0.12)"
    : warning
      ? "rgba(251,191,36,0.12)"
      : "rgba(248,113,113,0.12)";

  const color = ok
    ? "#86efac"
    : warning
      ? "#fcd34d"
      : "#fca5a5";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 11,
        background,
        color,
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
        background:
          "rgba(255,255,255,0.035)",
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

      <strong
        style={{
          fontSize: 14,
          wordBreak: "break-word",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function boolText(
  value?: boolean,
): string {
  return value ? "Yes" : "No";
}

function formatDecision(
  value?: string | null,
): string {
  if (!value) {
    return "Not recorded";
  }

  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase(),
    );
}

function gateState(
  value?: boolean,
): {
  ok: boolean;
  warning: boolean;
} {
  return {
    ok: value === true,
    warning: false,
  };
}

function decisionState(
  decision?: string,
): {
  ok: boolean;
  warning: boolean;
} {
  if (
    decision === "ready" ||
    decision === "approved" ||
    decision === "pass" ||
    decision === "verified"
  ) {
    return {
      ok: true,
      warning: false,
    };
  }

  if (
    decision === "review-required" ||
    decision === "pending"
  ) {
    return {
      ok: false,
      warning: true,
    };
  }

  return {
    ok: false,
    warning: false,
  };
}

export default function ExecutionReadinessPage() {
  const [sessionDetected, setSessionDetected] =
    useState(false);

  const [symbol, setSymbol] =
    useState("NVDA");

  const [market, setMarket] =
    useState("us");

  const [side, setSide] =
    useState<"buy" | "sell">("buy");

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

  const [result, setResult] =
    useState<ReadinessResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [loadedAt, setLoadedAt] =
    useState<string | null>(null);

  const handleEvaluate = useCallback(
    async () => {
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
        Math.floor(parsedQuantity);

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

      if (!symbol.trim()) {
        setError(
          "Symbol is required.",
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
        const data =
          await evaluateReadiness(
            {
              symbol:
                symbol
                  .trim()
                  .toUpperCase(),

              market,

              side,

              quantity:
                normalizedQuantity,

              limitPrice:
                parsedLimitPrice,

              reason:
                reason.trim(),
            },
            taskId.trim(),
          );

        setResult(data);
        setLoadedAt(
          new Date().toISOString(),
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Execution readiness evaluation failed.",
        );
      } finally {
        setLoading(false);
      }
    },
    [
      limitPrice,
      market,
      quantity,
      reason,
      side,
      symbol,
      taskId,
    ],
  );

  useEffect(() => {
    const key =
      getAccessKey();

    setSessionDetected(
      Boolean(key),
    );
  }, []);

  const readiness =
    result?.readiness;

  const decision =
    result?.controlDecision ??
    readiness?.decision ??
    "unknown";

  const executionReady =
    result?.executionReady === true ||
    readiness?.executionReady ===
      true;

  const decisionVisual =
    decisionState(decision);

  const risk =
    readiness?.preTradeRisk;

  const humanReview =
    readiness?.humanReview;

  const brokerConnection =
    readiness?.brokerConnection;

  const brokerAdapter =
    readiness?.brokerAdapter;

  const gates =
    result?.gates ??
    readiness?.gates;

  const safety =
    result?.safetyBoundary ??
    readiness?.safetyBoundary;

  const failureCodes =
    result?.failureCodes ??
    readiness?.failureCodes ??
    [];

  const nextRequirements =
    readiness?.nextRequirements ??
    [];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#09090b",
        color: "#f4f4f5",
        padding:
          "26px 18px 70px",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
        }}
      >
        <header
          style={{
            marginBottom: 24,
          }}
        >
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
              alignItems:
                "flex-start",
              justifyContent:
                "space-between",
              gap: 18,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 30,
                  letterSpacing:
                    "-0.02em",
                }}
              >
                Execution Readiness
              </h1>

              <p
                style={{
                  margin:
                    "8px 0 0",
                  opacity: 0.62,
                  lineHeight: 1.6,
                  fontSize: 13,
                }}
              >
                Provider
                {" -> "}
                Commercial
                {" -> "}
                Risk
                {" -> "}
                Human Review
                {" -> "}
                Broker Verification
                {" -> "}
                Broker Adapter
                {" -> "}
                Final Readiness
              </p>
            </div>

            <Badge
              ok={sessionDetected}
            >
              {sessionDetected
                ? "Founder Session"
                : "Session Required"}
            </Badge>
          </div>
        </header>

        {error ? (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 10,
              background:
                "rgba(248,113,113,0.08)",
              border:
                "1px solid rgba(248,113,113,0.16)",
              color: "#fca5a5",
              fontSize: 12,
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
            title="Readiness Evaluation"
            eyebrow="FOUNDER INPUT"
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <label
                style={{
                  display: "grid",
                  gap: 6,
                  fontSize: 11,
                  opacity: 0.72,
                }}
              >
                Symbol
                <input
                  value={symbol}
                  onChange={(event) =>
                    setSymbol(
                      event.target.value,
                    )
                  }
                  placeholder="NVDA"
                  style={{
                    width: "100%",
                    boxSizing:
                      "border-box",
                    padding:
                      "10px 11px",
                    borderRadius: 9,
                    border:
                      "1px solid rgba(255,255,255,0.1)",
                    background:
                      "rgba(255,255,255,0.04)",
                    color:
                      "#f4f4f5",
                    outline: "none",
                  }}
                />
              </label>

              <label
                style={{
                  display: "grid",
                  gap: 6,
                  fontSize: 11,
                  opacity: 0.72,
                }}
              >
                Market
                <select
                  value={market}
                  onChange={(event) =>
                    setMarket(
                      event.target.value,
                    )
                  }
                  style={{
                    width: "100%",
                    boxSizing:
                      "border-box",
                    padding:
                      "10px 11px",
                    borderRadius: 9,
                    border:
                      "1px solid rgba(255,255,255,0.1)",
                    background:
                      "#111113",
                    color:
                      "#f4f4f5",
                  }}
                >
                  <option value="us">
                    US
                  </option>
                  <option value="hk">
                    HK
                  </option>
                  <option value="cn">
                    CN
                  </option>
                </select>
              </label>

              <label
                style={{
                  display: "grid",
                  gap: 6,
                  fontSize: 11,
                  opacity: 0.72,
                }}
              >
                Side
                <select
                  value={side}
                  onChange={(event) =>
                    setSide(
                      event.target
                        .value as
                        | "buy"
                        | "sell",
                    )
                  }
                  style={{
                    width: "100%",
                    boxSizing:
                      "border-box",
                    padding:
                      "10px 11px",
                    borderRadius: 9,
                    border:
                      "1px solid rgba(255,255,255,0.1)",
                    background:
                      "#111113",
                    color:
                      "#f4f4f5",
                  }}
                >
                  <option value="buy">
                    Buy
                  </option>
                  <option value="sell">
                    Sell
                  </option>
                </select>
              </label>

              <label
                style={{
                  display: "grid",
                  gap: 6,
                  fontSize: 11,
                  opacity: 0.72,
                }}
              >
                Quantity
                <input
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(
                      event.target.value,
                    )
                  }
                  inputMode="numeric"
                  placeholder="1"
                  style={{
                    width: "100%",
                    boxSizing:
                      "border-box",
                    padding:
                      "10px 11px",
                    borderRadius: 9,
                    border:
                      "1px solid rgba(255,255,255,0.1)",
                    background:
                      "rgba(255,255,255,0.04)",
                    color:
                      "#f4f4f5",
                    outline: "none",
                  }}
                />
              </label>

              <label
                style={{
                  display: "grid",
                  gap: 6,
                  fontSize: 11,
                  opacity: 0.72,
                }}
              >
                Limit Price
                <input
                  value={limitPrice}
                  onChange={(event) =>
                    setLimitPrice(
                      event.target.value,
                    )
                  }
                  inputMode="decimal"
                  placeholder="Optional"
                  style={{
                    width: "100%",
                    boxSizing:
                      "border-box",
                    padding:
                      "10px 11px",
                    borderRadius: 9,
                    border:
                      "1px solid rgba(255,255,255,0.1)",
                    background:
                      "rgba(255,255,255,0.04)",
                    color:
                      "#f4f4f5",
                    outline: "none",
                  }}
                />
              </label>

              <label
                style={{
                  display: "grid",
                  gap: 6,
                  fontSize: 11,
                  opacity: 0.72,
                }}
              >
                Human Review Task ID
                <input
                  value={taskId}
                  onChange={(event) =>
                    setTaskId(
                      event.target.value,
                    )
                  }
                  placeholder="Optional persistent task"
                  style={{
                    width: "100%",
                    boxSizing:
                      "border-box",
                    padding:
                      "10px 11px",
                    borderRadius: 9,
                    border:
                      "1px solid rgba(255,255,255,0.1)",
                    background:
                      "rgba(255,255,255,0.04)",
                    color:
                      "#f4f4f5",
                    outline: "none",
                  }}
                />
              </label>
            </div>

            <label
              style={{
                display: "grid",
                gap: 6,
                marginTop: 10,
                fontSize: 11,
                opacity: 0.72,
              }}
            >
              Reason
              <textarea
                value={reason}
                onChange={(event) =>
                  setReason(
                    event.target.value,
                  )
                }
                rows={3}
                style={{
                  width: "100%",
                  boxSizing:
                    "border-box",
                  resize: "vertical",
                  padding:
                    "10px 11px",
                  borderRadius: 9,
                  border:
                    "1px solid rgba(255,255,255,0.1)",
                  background:
                    "rgba(255,255,255,0.04)",
                  color:
                    "#f4f4f5",
                  outline: "none",
                  fontFamily:
                    "inherit",
                }}
              />
            </label>

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
                onClick={() =>
                  void handleEvaluate()
                }
                disabled={
                  loading ||
                  !sessionDetected
                }
                style={{
                  border: "none",
                  borderRadius: 10,
                  padding:
                    "11px 16px",
                  background:
                    loading
                      ? "rgba(255,255,255,0.08)"
                      : "#f4f4f5",
                  color:
                    loading
                      ? "#a1a1aa"
                      : "#09090b",
                  fontWeight: 700,
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
                  fontSize: 11,
                  opacity: 0.5,
                }}
              >
                Server-side readiness evaluation only.
              </span>
            </div>
          </Section>

          {result ? (
            <>
              <Section
                title="Final Readiness"
                eyebrow="SERVER-SIDE DECISION"
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
                      decision,
                    )}
                  />

                  <Metric
                    label="Execution Ready"
                    value={
                      executionReady
                        ? "Yes"
                        : "No"
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
                    label="Result"
                    value={
                      result.success
                        ? "Success"
                        : "Blocked"
                    }
                  />
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    alignItems:
                      "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <Badge
                    ok={
                      decisionVisual.ok
                    }
                    warning={
                      decisionVisual.warning
                    }
                  >
                    {executionReady
                      ? "Execution Readiness Open"
                      : "Execution Readiness Closed"}
                  </Badge>

                  <span
                    style={{
                      fontSize: 12,
                      opacity: 0.62,
                    }}
                  >
                    Final readiness is deliberately
                    independent from research and
                    authorization claims.
                  </span>
                </div>
              </Section>

              <Section
                title="Order Intent"
                eyebrow="EVALUATED REQUEST"
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(6, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="Symbol"
                    value={
                      result.orderIntent
                        ?.symbol ??
                      symbol.toUpperCase()
                    }
                  />

                  <Metric
                    label="Market"
                    value={
                      result.orderIntent
                        ?.market ??
                      market
                    }
                  />

                  <Metric
                    label="Side"
                    value={
                      result.orderIntent
                        ?.side ??
                      side
                    }
                  />

                  <Metric
                    label="Quantity"
                    value={String(
                      result.orderIntent
                        ?.quantity ??
                        quantity,
                    )}
                  />

                  <Metric
                    label="Limit Price"
                    value={
                      result.orderIntent
                        ?.limitPrice ??
                      "Market"
                    }
                  />

                  <Metric
                    label="Task ID"
                    value={
                      result
                        .humanReviewTaskId ??
                      "Not supplied"
                    }
                  />
                </div>

                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 10,
                    background:
                      "rgba(255,255,255,0.035)",
                    fontSize: 12,
                    lineHeight: 1.6,
                    opacity: 0.7,
                  }}
                >
                  {result.orderIntent
                    ?.reason ??
                    reason}
                </div>
              </Section>

              <Section
                title="Provider Gate"
                eyebrow="MARKET DATA"
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(5, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="Provider"
                    value={
                      readiness?.provider
                        ?.id ??
                      "None"
                    }
                  />

                  <Metric
                    label="Configured"
                    value={boolText(
                      readiness
                        ?.provider
                        ?.configured,
                    )}
                  />

                  <Metric
                    label="Technical"
                    value={
                      readiness
                        ?.provider
                        ?.technicalReady
                        ? "Ready"
                        : "Blocked"
                    }
                  />

                  <Metric
                    label="Commercial"
                    value={
                      readiness
                        ?.provider
                        ?.commercialReady
                        ? "Ready"
                        : "Blocked"
                    }
                  />

                  <Metric
                    label="Status"
                    value={
                      readiness
                        ?.provider
                        ?.status ??
                      "Unknown"
                    }
                  />
                </div>
              </Section>

              <Section
                title="Commercial Authorization"
                eyebrow="INDEPENDENT AUTHORIZATION GATE"
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(5, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="Decision"
                    value={formatDecision(
                      readiness
                        ?.commercialAuthorization
                        ?.decision,
                    )}
                  />

                  <Metric
                    label="Authorized"
                    value={boolText(
                      readiness
                        ?.commercialAuthorization
                        ?.authorized,
                    )}
                  />

                  <Metric
                    label="Gate"
                    value={
                      readiness
                        ?.commercialAuthorization
                        ?.gateOpen
                        ? "Open"
                        : "Closed"
                    }
                  />

                  <Metric
                    label="Source"
                    value={
                      readiness
                        ?.commercialAuthorization
                        ?.source ??
                      "Unknown"
                    }
                  />

                  <Metric
                    label="Verified By"
                    value={
                      readiness
                        ?.commercialAuthorization
                        ?.verifiedBy ??
                      "Not recorded"
                    }
                  />
                </div>

                <div
                  style={{
                    marginTop: 12,
                    padding: 11,
                    borderRadius: 9,
                    background:
                      "rgba(251,191,36,0.06)",
                    border:
                      "1px solid rgba(251,191,36,0.12)",
                    color: "#fcd34d",
                    fontSize: 11,
                    lineHeight: 1.6,
                  }}
                >
                  Technical provider access, account entitlement,
                  and realtime verification do not automatically
                  authorize commercial use.
                </div>
              </Section>

              <Section
                title="Pre-Trade Risk"
                eyebrow="RISK CONTROL"
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(5, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="Decision"
                    value={formatDecision(
                      risk?.decision,
                    )}
                  />

                  <Metric
                    label="Approved"
                    value={boolText(
                      risk?.approved,
                    )}
                  />

                  <Metric
                    label="Estimated Notional"
                    value={
                      risk
                        ?.estimatedNotional !=
                      null
                        ? String(
                            risk.estimatedNotional,
                          )
                        : "Not available"
                    }
                  />

                  <Metric
                    label="Review Required"
                    value={boolText(
                      risk?.reviewRequired,
                    )}
                  />

                  <Metric
                    label="Policy"
                    value={
                      risk?.policy
                        ?.version ??
                      "Unknown"
                    }
                  />
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(6, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="Order Valid"
                    value={boolText(
                      risk?.checks
                        ?.orderValid,
                    )}
                  />

                  <Metric
                    label="Market"
                    value={boolText(
                      risk?.checks
                        ?.marketAllowed,
                    )}
                  />

                  <Metric
                    label="Quantity"
                    value={boolText(
                      risk?.checks
                        ?.quantityWithinLimit,
                    )}
                  />

                  <Metric
                    label="Notional"
                    value={boolText(
                      risk?.checks
                        ?.notionalWithinLimit,
                    )}
                  />

                  <Metric
                    label="Limit Price"
                    value={boolText(
                      risk?.checks
                        ?.limitPriceValid,
                    )}
                  />

                  <Metric
                    label="Review"
                    value={boolText(
                      risk?.checks
                        ?.reviewRequired,
                    )}
                  />
                </div>

                {risk?.blockedReasons
                  ?.length ? (
                  <ul
                    style={{
                      margin:
                        "12px 0 0",
                      paddingLeft: 20,
                      fontSize: 12,
                      lineHeight: 1.7,
                      color: "#fca5a5",
                    }}
                  >
                    {risk.blockedReasons.map(
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
                title="Persistent Human Review"
                eyebrow="EXPLICIT HUMAN DECISION"
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(6, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="Task"
                    value={
                      humanReview
                        ?.taskId ??
                      result.humanReviewTaskId ??
                      "Not supplied"
                    }
                  />

                  <Metric
                    label="Found"
                    value={boolText(
                      humanReview?.found,
                    )}
                  />

                  <Metric
                    label="Required"
                    value={boolText(
                      humanReview?.required,
                    )}
                  />

                  <Metric
                    label="Requested"
                    value={boolText(
                      humanReview?.requested,
                    )}
                  />

                  <Metric
                    label="Decision"
                    value={formatDecision(
                      humanReview?.decision,
                    )}
                  />

                  <Metric
                    label="Approved"
                    value={boolText(
                      humanReview?.approved,
                    )}
                  />
                </div>

                {humanReview?.reason ? (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 10,
                      background:
                        "rgba(255,255,255,0.035)",
                      fontSize: 12,
                      lineHeight: 1.6,
                      opacity: 0.7,
                    }}
                  >
                    {humanReview.reason}
                  </div>
                ) : null}

                <div
                  style={{
                    marginTop: 12,
                    padding: 11,
                    borderRadius: 9,
                    background:
                      "rgba(251,191,36,0.06)",
                    border:
                      "1px solid rgba(251,191,36,0.12)",
                    color: "#fcd34d",
                    fontSize: 11,
                    lineHeight: 1.6,
                  }}
                >
                  Only an explicit accepted persistent human review
                  can satisfy this gate. Acknowledgement, silence,
                  deferred, or rejected decisions do not authorize execution.
                </div>
              </Section>

              <Section
                title="Broker Connection Verification"
                eyebrow="BROKER CONTROL"
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(6, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="Broker"
                    value={
                      brokerConnection
                        ?.broker
                        ?.brokerId ??
                      "Not configured"
                    }
                  />

                  <Metric
                    label="Status"
                    value={
                      brokerConnection
                        ?.broker
                        ?.status ??
                      "Unknown"
                    }
                  />

                  <Metric
                    label="Decision"
                    value={formatDecision(
                      brokerConnection
                        ?.broker
                        ?.decision,
                    )}
                  />

                  <Metric
                    label="Connection"
                    value={boolText(
                      brokerConnection
                        ?.broker
                        ?.connectionVerified,
                    )}
                  />

                  <Metric
                    label="Credentials"
                    value={boolText(
                      brokerConnection
                        ?.broker
                        ?.credentialsVerified,
                    )}
                  />

                  <Metric
                    label="Account"
                    value={boolText(
                      brokerConnection
                        ?.broker
                        ?.accountVerified,
                    )}
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
                    label="Verification Complete"
                    value={boolText(
                      brokerConnection
                        ?.verification
                        ?.verificationComplete,
                    )}
                  />

                  <Metric
                    label="Gate"
                    value={
                      brokerConnection
                        ?.gate
                        ?.open
                        ? "Open"
                        : "Closed"
                    }
                  />

                  <Metric
                    label="Execution Enabled"
                    value={boolText(
                      brokerConnection
                        ?.broker
                        ?.executionEnabled,
                    )}
                  />

                  <Metric
                    label="Source"
                    value={
                      brokerConnection
                        ?.broker
                        ?.source ??
                      "Unknown"
                    }
                  />
                </div>

                {brokerConnection
                  ?.broker
                  ?.failureCodes
                  ?.length ? (
                  <ul
                    style={{
                      margin:
                        "12px 0 0",
                      paddingLeft: 20,
                      fontSize: 12,
                      lineHeight: 1.7,
                      color: "#fca5a5",
                    }}
                  >
                    {brokerConnection.broker.failureCodes.map(
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
                title="Broker Execution Adapter"
                eyebrow="EXECUTION ADAPTER"
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(5, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="Adapter"
                    value={
                      brokerAdapter
                        ?.id ??
                      "unconfigured"
                    }
                  />

                  <Metric
                    label="Configured"
                    value={boolText(
                      brokerAdapter
                        ?.configured,
                    )}
                  />

                  <Metric
                    label="Ready"
                    value={boolText(
                      brokerAdapter
                        ?.ready,
                    )}
                  />

                  <Metric
                    label="Available"
                    value={boolText(
                      brokerAdapter
                        ?.capabilities
                        ?.available,
                    )}
                  />

                  <Metric
                    label="Execution"
                    value={boolText(
                      brokerAdapter
                        ?.capabilities
                        ?.executionEnabled,
                    )}
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
                    label="Live Orders"
                    value={boolText(
                      brokerAdapter
                        ?.capabilities
                        ?.supportsLiveOrders,
                    )}
                  />

                  <Metric
                    label="Paper Orders"
                    value={boolText(
                      brokerAdapter
                        ?.capabilities
                        ?.supportsPaperOrders,
                    )}
                  />

                  <Metric
                    label="Cancel Orders"
                    value={boolText(
                      brokerAdapter
                        ?.capabilities
                        ?.supportsCancelOrders,
                    )}
                  />

                  <Metric
                    label="Order Status"
                    value={boolText(
                      brokerAdapter
                        ?.capabilities
                        ?.supportsOrderStatus,
                    )}
                  />
                </div>

                {brokerAdapter
                  ?.diagnostic
                  ?.blockedReasons
                  ?.length ? (
                  <ul
                    style={{
                      margin:
                        "12px 0 0",
                      paddingLeft: 20,
                      fontSize: 12,
                      lineHeight: 1.7,
                      color: "#fca5a5",
                    }}
                  >
                    {brokerAdapter.diagnostic.blockedReasons.map(
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
                title="Execution Gates"
                eyebrow="FINAL CONTROL CHAIN"
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(4, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  {[
                    [
                      "Provider",
                      gates?.providerGate,
                    ],
                    [
                      "Technical Provider",
                      gates?.technicalProviderGate,
                    ],
                    [
                      "Commercial",
                      gates?.commercialGate,
                    ],
                    [
                      "Pre-Trade Risk",
                      gates?.preTradeRiskGate,
                    ],
                    [
                      "Human Review",
                      gates?.persistentHumanReviewGate,
                    ],
                    [
                      "Broker Verification",
                      gates?.brokerConnectionVerificationGate,
                    ],
                    [
                      "Broker Adapter",
                      gates?.brokerAdapterGate,
                    ],
                    [
                      "Execution",
                      gates?.executionGate,
                    ],
                  ].map(
                    ([label, value]) => {
                      const state =
                        gateState(
                          value as
                            | boolean
                            | undefined,
                        );

                      return (
                        <div
                          key={
                            label as string
                          }
                          style={{
                            padding: 12,
                            borderRadius: 10,
                            background:
                              "rgba(255,255,255,0.035)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "space-between",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 12,
                                opacity: 0.7,
                              }}
                            >
                              {label as string}
                            </span>

                            <Badge
                              ok={
                                state.ok
                              }
                              warning={
                                state.warning
                              }
                            >
                              {value
                                ? "Passed"
                                : "Blocked"}
                            </Badge>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </Section>

              {failureCodes.length ? (
                <Section
                  title="Failure Codes"
                  eyebrow="BLOCKING CONDITIONS"
                >
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: 20,
                      fontSize: 12,
                      lineHeight: 1.8,
                      color: "#fca5a5",
                    }}
                  >
                    {failureCodes.map(
                      (item) => (
                        <li key={item}>
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                </Section>
              ) : null}

              {nextRequirements.length ? (
                <Section
                  title="Next Requirements"
                  eyebrow="REMAINING CONTROLS"
                >
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: 20,
                      fontSize: 12,
                      lineHeight: 1.8,
                      opacity: 0.72,
                    }}
                  >
                    {nextRequirements.map(
                      (item) => (
                        <li key={item}>
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                </Section>
              ) : null}

              <Section
                title="Execution Safety Boundary"
                eyebrow="NON-AUTOMATIC EXECUTION"
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
                    value={boolText(
                      safety?.founderOnly,
                    )}
                  />

                  <Metric
                    label="Pre-Trade Risk"
                    value={
                      safety
                        ?.preTradeRiskRequired
                        ? "Required"
                        : "Disabled"
                    }
                  />

                  <Metric
                    label="Human Review"
                    value={
                      safety
                        ?.persistentHumanReviewRequired
                        ? "Required"
                        : "Disabled"
                    }
                  />

                  <Metric
                    label="Commercial Auth"
                    value={
                      safety
                        ?.commercialAuthorizationRequired
                        ? "Required"
                        : "Disabled"
                    }
                  />

                  <Metric
                    label="Broker Connection"
                    value={
                      safety
                        ?.brokerConnectionRequired
                        ? "Required"
                        : "Disabled"
                    }
                  />

                  <Metric
                    label="Execution Adapter"
                    value={
                      safety
                        ?.executionAdapterRequired
                        ? "Required"
                        : "Disabled"
                    }
                  />

                  <Metric
                    label="Automatic Execution"
                    value={
                      safety
                        ?.automaticExecution
                        ? "Enabled"
                        : "Disabled"
                    }
                  />

                  <Metric
                    label="Live Order Placement"
                    value={
                      safety
                        ?.liveOrderPlacement
                        ? "Enabled"
                        : "Disabled"
                    }
                  />

                  <Metric
                    label="Trading Executed"
                    value={
                      safety
                        ?.tradingExecuted
                        ? "Yes"
                        : "No"
                    }
                  />

                  <Metric
                    label="Live Execution"
                    value={
                      safety
                        ?.liveExecutionEnabled
                        ? "Enabled"
                        : "Disabled"
                    }
                  />

                  <Metric
                    label="Caller Override"
                    value={
                      safety
                        ?.callerCanOverride
                        ? "Allowed"
                        : "Blocked"
                    }
                  />

                  <Metric
                    label="Caller Bypass"
                    value={
                      safety
                        ?.callerCanBypass
                        ? "Allowed"
                        : "Blocked"
                    }
                  />
                </div>

                <div
                  style={{
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 10,
                    background:
                      "rgba(251,191,36,0.06)",
                    border:
                      "1px solid rgba(251,191,36,0.12)",
                    color: "#fcd34d",
                    fontSize: 11,
                    lineHeight: 1.65,
                  }}
                >
                  This page evaluates execution readiness only.
                  It does not place orders, connect to a broker,
                  verify credentials on behalf of the caller,
                  bypass risk controls, or enable live execution.
                </div>
              </Section>

              <Section
                title="Runtime Metadata"
                eyebrow="DIAGNOSTIC"
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(3, minmax(0, 1fr))",
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
                    label="Generated At"
                    value={
                      result.generatedAt ??
                      loadedAt ??
                      "Not recorded"
                    }
                  />
                </div>
              </Section>
            </>
          ) : (
            <Section
              title="Execution Readiness"
              eyebrow="WAITING FOR EVALUATION"
            >
              <div
                style={{
                  padding: 20,
                  borderRadius: 12,
                  background:
                    "rgba(255,255,255,0.025)",
                  color: "#a1a1aa",
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                Configure the order intent above and run
                the server-side readiness evaluation.
                No order will be placed.
              </div>
            </Section>
          )}
        </div>
      </div>
    </main>
  );
}
