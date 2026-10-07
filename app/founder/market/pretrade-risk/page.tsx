"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

type DiagnosticCheck = {
  orderValid?: boolean;
  marketAllowed?: boolean;
  quantityWithinLimit?: boolean;
  notionalWithinLimit?: boolean;
  limitPriceValid?: boolean;
  reviewRequired?: boolean;
};

type RiskPolicy = {
  enabled?: boolean;
  allowedMarkets?: string[];
  maxOrderQuantity?: number;
  maxOrderNotional?: number;
  requireLimitPrice?: boolean;
  allowMarketOrders?: boolean;
  reviewRequiredAboveNotional?: number;
  version?: string;
};

type RiskDiagnostic = {
  decision?: string;
  approved?: boolean;
  order?: {
    symbol?: string;
    market?: string;
    side?: string;
    quantity?: number;
    limitPrice?: number | null;
    reason?: string | null;
  } | null;
  estimatedNotional?: number | null;
  blockedReasons?: string[];
  policy?: RiskPolicy;
  checks?: DiagnosticCheck;
  safetyBoundary?: {
    preTradeRiskRequired?: boolean;
    automaticRiskOverrideAllowed?: boolean;
    callerCanBypassLimits?: boolean;
    liveExecutionEnabled?: boolean;
  };
  generatedAt?: string;
};

type DiagnosticsResponse = {
  success?: boolean;
  code?: string;
  stage?: string;
  policy?: RiskPolicy;
  policyBoundary?: {
    serverSide?: boolean;
    requiredBeforeBrokerEvaluation?: boolean;
    callerCanOverride?: boolean;
    callerCanBypass?: boolean;
    automaticRiskApproval?: boolean;
    automaticRiskOverride?: boolean;
    liveExecutionEnabled?: boolean;
  };
  diagnosticOrder?: RiskDiagnostic["order"];
  diagnostic?: RiskDiagnostic | null;
  readiness?: {
    policyConfigured?: boolean;
    policyVersion?: string;
    riskGateAvailable?: boolean;
    independentGate?: boolean;
    reviewThresholdConfigured?: boolean;
    quantityLimitConfigured?: boolean;
    notionalLimitConfigured?: boolean;
  };
  decisionPolicy?: {
    pass?: string;
    reviewRequired?: string;
    blocked?: string;
    humanReviewStillRequired?: boolean;
    brokerAdapterStillRequired?: boolean;
    liveExecutionStillDisabled?: boolean;
  };
  controlChainPosition?: {
    previous?: string[];
    current?: string;
    next?: string[];
  };
  safetyBoundary?: {
    founderOnly?: boolean;
    ordinaryUserTrading?: boolean;
    automaticOrderPlacement?: boolean;
    liveOrderPlacement?: boolean;
    tradingExecuted?: boolean;
    riskPolicyCanBeBypassed?: boolean;
    riskPolicyCanBeOverriddenByRequest?: boolean;
    riskDecisionIsExecutionAuthorization?: boolean;
    humanApprovalStillRequired?: boolean;
    brokerVerificationStillRequired?: boolean;
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

async function requestDiagnostics(
  params: URLSearchParams,
): Promise<DiagnosticsResponse> {
  const key =
    getAccessKey();

  if (!key) {
    throw new Error(
      "Founder Session not found. Please return to Founder Console and enter the Founder Access Key.",
    );
  }

  const response =
    await fetch(
      `/api/founder/market/pretrade-risk?${params.toString()}`,
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
    (await response.json()) as DiagnosticsResponse;

  if (
    response.status ===
    401
  ) {
    throw new Error(
      "Founder authentication failed.",
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ??
        "Pre-trade risk diagnostics failed.",
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
            letterSpacing:
              "0.12em",
            opacity: 0.45,
            marginBottom: 6,
          }}
        >
          {eyebrow}
        </div>
      ) : null}

      <h2
        style={{
          margin:
            "0 0 14px",
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
  children: React.ReactNode;
}) {
  const background =
    ok
      ? "rgba(74,222,128,0.12)"
      : warning
        ? "rgba(251,191,36,0.12)"
        : "rgba(248,113,113,0.12)";

  const color =
    ok
      ? "#86efac"
      : warning
        ? "#fcd34d"
        : "#fca5a5";

  return (
    <span
      style={{
        display:
          "inline-flex",
        alignItems:
          "center",
        padding:
          "4px 8px",
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
          wordBreak:
            "break-word",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function formatValue(
  value?: string,
): string {
  if (!value) {
    return "Not recorded";
  }

  return value
    .replace(
      /-/g,
      " ",
    )
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase(),
    );
}

function formatNumber(
  value?: number | null,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "Not available";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits: 4,
    },
  ).format(value);
}

function checkState(
  value?: boolean,
): {
  ok: boolean;
  warning: boolean;
  label: string;
} {
  if (value === true) {
    return {
      ok: true,
      warning: false,
      label: "Pass",
    };
  }

  return {
    ok: false,
    warning: false,
    label: "Blocked",
  };
}

export default function PreTradeRiskPage() {
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
  ] = useState<
    "us" | "hk" | "cn"
  >("us");

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
    reason,
    setReason,
  ] = useState(
    "Founder pre-trade risk diagnostic.",
  );

  const [
    result,
    setResult,
  ] =
    useState<DiagnosticsResponse | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const runDiagnostics =
    useCallback(
      async () => {
        const trimmedSymbol =
          symbol
            .trim()
            .toUpperCase();

        if (!trimmedSymbol) {
          setError(
            "Symbol is required.",
          );
          return;
        }

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

        const trimmedLimitPrice =
          limitPrice.trim();

        const parsedLimitPrice =
          trimmedLimitPrice
            ? Number(
                trimmedLimitPrice,
              )
            : null;

        if (
          parsedLimitPrice !==
            null &&
          (
            !Number.isFinite(
              parsedLimitPrice,
            ) ||
            parsedLimitPrice <= 0
          )
        ) {
          setError(
            "Limit price must be greater than zero when supplied.",
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
          const params =
            new URLSearchParams();

          params.set(
            "symbol",
            trimmedSymbol,
          );

          params.set(
            "market",
            market,
          );

          params.set(
            "side",
            side,
          );

          params.set(
            "quantity",
            String(
              Math.floor(
                parsedQuantity,
              ),
            ),
          );

          if (
            parsedLimitPrice !==
            null
          ) {
            params.set(
              "limitPrice",
              String(
                parsedLimitPrice,
              ),
            );
          }

          params.set(
            "reason",
            reason.trim(),
          );

          const data =
            await requestDiagnostics(
              params,
            );

          setResult(
            data,
          );
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Pre-trade risk diagnostics failed.",
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
      ],
    );

  useEffect(() => {
    const key =
      getAccessKey();

    setSessionDetected(
      Boolean(key),
    );
  }, []);

  const diagnostic =
    result?.diagnostic ??
    null;

  const policy =
    result?.policy ??
    diagnostic?.policy ??
    null;

  const checks =
    diagnostic?.checks;

  const decision =
    diagnostic?.decision ??
    "not-evaluated";

  const decisionWarning =
    decision ===
    "review-required";

  const decisionPassed =
    decision ===
    "pass";

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
              fontSize: 10,
              letterSpacing:
                "0.14em",
              opacity:
                0.45,
              marginBottom:
                8,
            }}
          >
            PRIVATE FOUNDER CONTROL
          </div>

          <div
            style={{
              display:
                "flex",
              alignItems:
                "flex-start",
              justifyContent:
                "space-between",
              gap: 18,
              flexWrap:
                "wrap",
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize:
                    30,
                  letterSpacing:
                    "-0.02em",
                }}
              >
                Pre-Trade Risk
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
                  maxWidth:
                    760,
                }}
              >
                Independent server-side risk
                diagnostics before persistent human
                review and broker evaluation.
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

        {error ? (
          <div
            style={{
              marginBottom:
                16,
              padding:
                12,
              borderRadius:
                10,
              background:
                "rgba(248,113,113,0.08)",
              border:
                "1px solid rgba(248,113,113,0.16)",
              color:
                "#fca5a5",
              fontSize:
                12,
              lineHeight:
                1.6,
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            display:
              "grid",
            gap:
              14,
          }}
        >
          <Section
            title="Risk Diagnostic Request"
            eyebrow="C167.5.30"
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
              <label
                style={{
                  display:
                    "grid",
                  gap:
                    6,
                  fontSize:
                    11,
                  opacity:
                    0.72,
                }}
              >
                Symbol
                <input
                  value={
                    symbol
                  }
                  onChange={(
                    event,
                  ) =>
                    setSymbol(
                      event.target
                        .value,
                    )
                  }
                  style={{
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
                    fontFamily:
                      "inherit",
                  }}
                />
              </label>

              <label
                style={{
                  display:
                    "grid",
                  gap:
                    6,
                  fontSize:
                    11,
                  opacity:
                    0.72,
                }}
              >
                Market
                <select
                  value={
                    market
                  }
                  onChange={(
                    event,
                  ) =>
                    setMarket(
                      event.target
                        .value as
                        | "us"
                        | "hk"
                        | "cn",
                    )
                  }
                  style={{
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
                    fontFamily:
                      "inherit",
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
                  display:
                    "grid",
                  gap:
                    6,
                  fontSize:
                    11,
                  opacity:
                    0.72,
                }}
              >
                Side
                <select
                  value={
                    side
                  }
                  onChange={(
                    event,
                  ) =>
                    setSide(
                      event.target
                        .value as
                        | "buy"
                        | "sell",
                    )
                  }
                  style={{
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
                    fontFamily:
                      "inherit",
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
                  display:
                    "grid",
                  gap:
                    6,
                  fontSize:
                    11,
                  opacity:
                    0.72,
                }}
              >
                Quantity
                <input
                  inputMode="numeric"
                  value={
                    quantity
                  }
                  onChange={(
                    event,
                  ) =>
                    setQuantity(
                      event.target
                        .value,
                    )
                  }
                  style={{
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
                    fontFamily:
                      "inherit",
                  }}
                />
              </label>

              <label
                style={{
                  display:
                    "grid",
                  gap:
                    6,
                  fontSize:
                    11,
                  opacity:
                    0.72,
                }}
              >
                Limit Price
                <input
                  inputMode="decimal"
                  value={
                    limitPrice
                  }
                  onChange={(
                    event,
                  ) =>
                    setLimitPrice(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Optional"
                  style={{
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
                    fontFamily:
                      "inherit",
                  }}
                />
              </label>

              <label
                style={{
                  display:
                    "grid",
                  gap:
                    6,
                  fontSize:
                    11,
                  opacity:
                    0.72,
                }}
              >
                Reason
                <input
                  value={
                    reason
                  }
                  onChange={(
                    event,
                  ) =>
                    setReason(
                      event.target
                        .value,
                    )
                  }
                  style={{
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
                    fontFamily:
                      "inherit",
                  }}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() =>
                void runDiagnostics()
              }
              disabled={
                loading ||
                !sessionDetected
              }
              style={{
                marginTop:
                  14,
                padding:
                  "11px 16px",
                borderRadius:
                  9,
                border:
                  "none",
                background:
                  "#fff",
                color:
                  "#09090b",
                fontWeight:
                  700,
                cursor:
                  loading ||
                  !sessionDetected
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  loading ||
                  !sessionDetected
                    ? 0.55
                    : 1,
              }}
            >
              {loading
                ? "Running Diagnostics..."
                : "Run Risk Diagnostics"}
            </button>
          </Section>

          {result ? (
            <>
              <Section
                title="Risk Decision"
                eyebrow="SERVER-SIDE RESULT"
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
                    label="Decision"
                    value={formatValue(
                      decision,
                    )}
                  />

                  <Metric
                    label="Approved"
                    value={
                      diagnostic?.approved
                        ? "Yes"
                        : "No"
                    }
                  />

                  <Metric
                    label="Estimated Notional"
                    value={`$${formatNumber(
                      diagnostic?.estimatedNotional,
                    )}`}
                  />

                  <Metric
                    label="Generated"
                    value={
                      diagnostic?.generatedAt ??
                      result.generatedAt ??
                      "Not recorded"
                    }
                  />
                </div>

                <div
                  style={{
                    marginTop:
                      12,
                  }}
                >
                  <Badge
                    ok={
                      decisionPassed
                    }
                    warning={
                      decisionWarning
                    }
                  >
                    {decisionPassed
                      ? "Risk Passed"
                      : decisionWarning
                        ? "Human Review Threshold"
                        : "Risk Blocked"}
                  </Badge>
                </div>
              </Section>

              <Section
                title="Policy"
                eyebrow="ACTIVE SERVER-SIDE RISK POLICY"
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
                    label="Policy"
                    value={
                      policy?.enabled
                        ? "Enabled"
                        : "Disabled"
                    }
                  />

                  <Metric
                    label="Version"
                    value={
                      policy?.version ??
                      "Unknown"
                    }
                  />

                  <Metric
                    label="Max Quantity"
                    value={formatNumber(
                      policy?.maxOrderQuantity,
                    )}
                  />

                  <Metric
                    label="Max Notional"
                    value={`$${formatNumber(
                      policy?.maxOrderNotional,
                    )}`}
                  />

                  <Metric
                    label="Review Threshold"
                    value={`$${formatNumber(
                      policy?.reviewRequiredAboveNotional,
                    )}`}
                  />

                  <Metric
                    label="Limit Price"
                    value={
                      policy?.requireLimitPrice
                        ? "Required"
                        : "Optional"
                    }
                  />

                  <Metric
                    label="Market Orders"
                    value={
                      policy?.allowMarketOrders
                        ? "Allowed by Risk Policy"
                        : "Blocked by Risk Policy"
                    }
                  />

                  <Metric
                    label="Allowed Markets"
                    value={
                      policy?.allowedMarkets?.join(
                        ", ",
                      ) ??
                      "None"
                    }
                  />
                </div>
              </Section>

              <Section
                title="Risk Checks"
                eyebrow="INDEPENDENT GATE"
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
                  {[
                    [
                      "Order Valid",
                      checks?.orderValid,
                    ],
                    [
                      "Market Allowed",
                      checks?.marketAllowed,
                    ],
                    [
                      "Quantity Limit",
                      checks?.quantityWithinLimit,
                    ],
                    [
                      "Notional Limit",
                      checks?.notionalWithinLimit,
                    ],
                    [
                      "Limit Price",
                      checks?.limitPriceValid,
                    ],
                    [
                      "Review Threshold",
                      checks?.reviewRequired
                        ? false
                        : true,
                    ],
                  ].map(
                    (item) => {
                      const state =
                        checkState(
                          item[1],
                        );

                      return (
                        <div
                          key={
                            item[0]
                          }
                          style={{
                            padding:
                              12,
                            borderRadius:
                              10,
                            background:
                              "rgba(255,255,255,0.035)",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "space-between",
                            gap:
                              10,
                          }}
                        >
                          <span
                            style={{
                              fontSize:
                                12,
                            }}
                          >
                            {item[0]}
                          </span>

                          <Badge
                            ok={
                              state.ok
                            }
                            warning={
                              state.warning
                            }
                          >
                            {checks?.reviewRequired &&
                            item[0] ===
                              "Review Threshold"
                              ? "Review Required"
                              : state.label}
                          </Badge>
                        </div>
                      );
                    },
                  )}
                </div>

                {diagnostic
                  ?.blockedReasons
                  ?.length ? (
                  <div
                    style={{
                      marginTop:
                        12,
                      padding:
                        12,
                      borderRadius:
                        10,
                      background:
                        "rgba(248,113,113,0.06)",
                      border:
                        "1px solid rgba(248,113,113,0.12)",
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          11,
                        opacity:
                          0.55,
                        marginBottom:
                          6,
                      }}
                    >
                      BLOCKED REASONS
                    </div>

                    <ul
                      style={{
                        margin:
                          0,
                        paddingLeft:
                          18,
                        fontSize:
                          12,
                        lineHeight:
                          1.7,
                        color:
                          "#fca5a5",
                      }}
                    >
                      {diagnostic.blockedReasons.map(
                        (item) => (
                          <li
                            key={
                              item
                            }
                          >
                            {item}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                ) : null}
              </Section>

              <Section
                title="Policy Readiness"
                eyebrow="SERVER VERIFICATION"
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
                    label="Policy Configured"
                    value={
                      result.readiness
                        ?.policyConfigured
                        ? "Yes"
                        : "No"
                    }
                  />

                  <Metric
                    label="Risk Gate"
                    value={
                      result.readiness
                        ?.riskGateAvailable
                        ? "Available"
                        : "Unavailable"
                    }
                  />

                  <Metric
                    label="Independent Gate"
                    value={
                      result.readiness
                        ?.independentGate
                        ? "Yes"
                        : "No"
                    }
                  />

                  <Metric
                    label="Policy Version"
                    value={
                      result.readiness
                        ?.policyVersion ??
                      "Unknown"
                    }
                  />
                </div>
              </Section>

              <Section
                title="Control Chain Position"
                eyebrow="C167.5.30"
              >
                <div
                  style={{
                    display:
                      "grid",
                    gap:
                      8,
                  }}
                >
                  {(
                    result
                      .controlChainPosition
                      ?.previous ??
                    []
                  ).map(
                    (
                      item,
                      index,
                    ) => (
                      <div
                        key={`${item}-${index}`}
                        style={{
                          padding:
                            10,
                          borderRadius:
                            9,
                          background:
                            "rgba(255,255,255,0.035)",
                          fontSize:
                            12,
                          opacity:
                            0.62,
                        }}
                      >
                        {item}
                      </div>
                    ),
                  )}

                  <div
                    style={{
                      padding:
                        12,
                      borderRadius:
                        10,
                      border:
                        "1px solid rgba(255,255,255,0.14)",
                      background:
                        "rgba(255,255,255,0.07)",
                      fontWeight:
                        700,
                    }}
                  >
                    {result
                      .controlChainPosition
                      ?.current ??
                      "Pre-Trade Risk"}
                  </div>

                  {(
                    result
                      .controlChainPosition
                      ?.next ??
                    []
                  ).map(
                    (
                      item,
                      index,
                    ) => (
                      <div
                        key={`${item}-${index}`}
                        style={{
                          padding:
                            10,
                          borderRadius:
                            9,
                          background:
                            "rgba(255,255,255,0.035)",
                          fontSize:
                            12,
                          opacity:
                            0.62,
                        }}
                      >
                        {item}
                      </div>
                    ),
                  )}
                </div>
              </Section>

              <Section
                title="Decision Policy"
                eyebrow="NO AUTOMATIC AUTHORIZATION"
              >
                <div
                  style={{
                    display:
                      "grid",
                    gap:
                      10,
                  }}
                >
                  <Metric
                    label="Pass"
                    value={
                      result
                        .decisionPolicy
                        ?.pass ??
                      "Not supplied"
                    }
                  />

                  <Metric
                    label="Review Required"
                    value={
                      result
                        .decisionPolicy
                        ?.reviewRequired ??
                      "Not supplied"
                    }
                  />

                  <Metric
                    label="Blocked"
                    value={
                      result
                        .decisionPolicy
                        ?.blocked ??
                      "Not supplied"
                    }
                  />
                </div>

                <div
                  style={{
                    marginTop:
                      12,
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(3, minmax(0, 1fr))",
                    gap:
                      10,
                  }}
                >
                  <Metric
                    label="Human Review"
                    value={
                      result
                        .decisionPolicy
                        ?.humanReviewStillRequired
                        ? "Required"
                        : "Not required"
                    }
                  />

                  <Metric
                    label="Broker Adapter"
                    value={
                      result
                        .decisionPolicy
                        ?.brokerAdapterStillRequired
                        ? "Required"
                        : "Not required"
                    }
                  />

                  <Metric
                    label="Live Execution"
                    value={
                      result
                        .decisionPolicy
                        ?.liveExecutionStillDisabled
                        ? "Disabled"
                        : "Enabled"
                    }
                  />
                </div>
              </Section>

              <Section
                title="Execution Safety Boundary"
                eyebrow="HARD SAFETY CONTRACT"
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
                    label="Risk Bypass"
                    value={
                      result
                        .safetyBoundary
                        ?.riskPolicyCanBeBypassed
                        ? "Allowed"
                        : "Blocked"
                    }
                  />

                  <Metric
                    label="Request Override"
                    value={
                      result
                        .safetyBoundary
                        ?.riskPolicyCanBeOverriddenByRequest
                        ? "Allowed"
                        : "Blocked"
                    }
                  />

                  <Metric
                    label="Risk = Execution"
                    value={
                      result
                        .safetyBoundary
                        ?.riskDecisionIsExecutionAuthorization
                        ? "Yes"
                        : "No"
                    }
                  />

                  <Metric
                    label="Live Order"
                    value={
                      result
                        .safetyBoundary
                        ?.liveOrderPlacement
                        ? "Enabled"
                        : "Disabled"
                    }
                  />
                </div>

                <div
                  style={{
                    marginTop:
                      12,
                    padding:
                      12,
                    borderRadius:
                      10,
                    background:
                      "rgba(251,191,36,0.06)",
                    border:
                      "1px solid rgba(251,191,36,0.12)",
                    color:
                      "#fcd34d",
                    fontSize:
                      11,
                    lineHeight:
                      1.65,
                  }}
                >
                  Pre-trade risk is an independent server-side control. Passing the risk policy does not approve a trade, does not connect a broker, and does not place an order. Persistent human approval and broker-side verification remain mandatory.
                </div>
              </Section>
            </>
          ) : (
            <Section
              title="Diagnostics Not Run"
              eyebrow="READY"
            >
              <div
                style={{
                  opacity:
                    0.58,
                  fontSize:
                    13,
                  lineHeight:
                    1.7,
                }}
              >
                Submit an order intent above to evaluate
                the current server-side pre-trade risk
                policy. No order will be created.
              </div>
            </Section>
          )}
        </div>
      </div>
    </main>
  );
}
