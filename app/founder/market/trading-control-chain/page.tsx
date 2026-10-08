"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "aios-founder-access-key";

type ReviewDecision =
  | "acknowledged"
  | "accepted"
  | "rejected"
  | "deferred";

type ReviewRecord = {
  reviewId?: string;
  taskId?: string;
  symbol?: string;
  market?: string;
  taskTitle?: string;
  decision?: ReviewDecision;
  reviewerNote?: string;
  createdAt?: string;
  updatedAt?: string;
  humanDecisionRequired?: boolean;
  automatedExecutionStarted?: boolean;
  plannerDispatched?: boolean;
  tradingExecuted?: boolean;
};

type ReviewResponse = {
  success?: boolean;
  code?: string;
  taskId?: string;
  review?: ReviewRecord | null;
  humanDecisionRequired?: boolean;
  error?: string;
};

type ReviewTask = {
  taskId: string;
  title: string;
  description?: string;
  status?: string;
  createdAt?: number;
  updatedAt?: number;
  symbol: string;
  market: string;
  reviewStatus?: string;
  reviewId?: string | null;
  selectable?: boolean;
};

type ReviewTaskResponse = {
  success?: boolean;
  code?: string;
  tasks?: ReviewTask[];
  selectableTasks?: ReviewTask[];
  taskDiscovery?: {
    source?: string;
    reviewRuntime?: string;
    total?: number;
    selectable?: number;
    maxResults?: number;
  };
  policy?: {
    manualTaskIdStillSupported?: boolean;
    automaticDiscovery?: boolean;
    userScopeIsolation?: boolean;
    completedTasksExcluded?: boolean;
    existingReviewExcluded?: boolean;
    explicitHumanDecisionRequired?: boolean;
    automaticApproval?: boolean;
    tradingExecution?: boolean;
  };
  error?: string;
};

type ChainStage = {
  stage?: string;
  state?: string;
  description?: string;
};

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
  controlChain?: ChainStage[];
  provider?: {
    id?: string | null;
    status?: string | null;
    technicalReady?: boolean;
    commercialReady?: boolean;
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
    source?: string;
    required?: boolean;
    taskId?: string | null;
    found?: boolean;
    requested?: boolean;
    approved?: boolean;
    decision?: string;
    status?: string;
    reviewId?: string | null;
    reason?: string;
    review?: ReviewRecord | null;
  };
  brokerConnectionVerification?: {
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
    safetyBoundary?: {
      founderOnly?: boolean;
      explicitVerificationRequired?: boolean;
      callerCanSelfVerify?: boolean;
      callerCanOverride?: boolean;
      callerCanBypass?: boolean;
      automaticVerification?: boolean;
      liveExecutionEnabled?: boolean;
    };
    generatedAt?: string;
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
    executionReady?: boolean;
    decision?: string;
    blockedReasons?: string[];
    automaticExecution?: boolean;
    orderPlaced?: boolean;
    tradingExecuted?: boolean;
  };
  gates?: {
    researchGate?: boolean;
    technicalProviderGate?: boolean;
    commercialGate?: boolean;
    preTradeRiskGate?: boolean;
    persistentHumanReviewGate?: boolean;
    brokerConnectionVerificationGate?: boolean;
    brokerAdapterGate?: boolean;
    executionGate?: boolean;
  };
  safetyBoundary?: {
    founderOnly?: boolean;
    ordinaryUserTrading?: boolean;
    automaticOrderPlacement?: boolean;
    liveOrderPlacement?: boolean;
    tradingExecuted?: boolean;
    preTradeRiskRequired?: boolean;
    automaticRiskOverrideAllowed?: boolean;
    callerCanBypassRiskLimits?: boolean;
    persistentHumanReviewRequired?: boolean;
    explicitAcceptedDecisionRequired?: boolean;
    brokerConnectionRequired?: boolean;
    paperTradingRequired?: boolean;
    commercialAuthorizationRequired?: boolean;
    executionAdapterRequired?: boolean;
    currentLiveExecutionEnabled?: boolean;
  };
  runtimeState?: {
    providerReady?: boolean;
    technicalProviderReady?: boolean;
    commercialGateOpen?: boolean;
    preTradeRiskPassed?: boolean;
    preTradeRiskReviewRequired?: boolean;
    persistentHumanReviewFound?: boolean;
    persistentHumanReviewApproved?: boolean;
    brokerConnectionVerified?: boolean;
    brokerCredentialsVerified?: boolean;
    brokerAccountVerified?: boolean;
    brokerVerificationComplete?: boolean;
    brokerVerificationPassed?: boolean;
    adapterConfigured?: boolean;
    adapterReady?: boolean;
    executionReady?: boolean;
  };
  nextRequirements?: string[];
  error?: string;
};

function getAccessKey(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    window.sessionStorage.getItem(STORAGE_KEY)?.trim() ??
    ""
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

async function discoverTasks(): Promise<ReviewTaskResponse> {
  const response = await requestJson(
    "/api/founder/market/human-review/tasks",
  );

  const data = (await response.json()) as ReviewTaskResponse;

  if (response.status === 401) {
    throw new Error("Founder authentication failed.");
  }

  if (!response.ok) {
    throw new Error(
      data.error ?? "Human review task discovery failed.",
    );
  }

  return data;
}

async function loadReview(
  taskId: string,
): Promise<ReviewResponse> {
  const response = await requestJson(
    `/api/founder/market/human-review?taskId=${encodeURIComponent(
      taskId,
    )}`,
  );

  const data = (await response.json()) as ReviewResponse;

  if (response.status === 401) {
    throw new Error("Founder authentication failed.");
  }

  if (!response.ok) {
    throw new Error(
      data.error ?? "Human review lookup failed.",
    );
  }

  return data;
}

async function submitReview(
  taskId: string,
  decision: ReviewDecision,
  reviewerNote: string,
): Promise<ReviewResponse> {
  const response = await requestJson(
    "/api/founder/market/human-review",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        taskId,
        decision,
        reviewerNote: reviewerNote.trim() || null,
      }),
    },
  );

  const data = (await response.json()) as ReviewResponse;

  if (response.status === 401) {
    throw new Error("Founder authentication failed.");
  }

  if (!response.ok) {
    throw new Error(
      data.error ?? "Human review submission failed.",
    );
  }

  return data;
}

async function evaluateChain(
  order: {
    symbol: string;
    market: string;
    side: "buy" | "sell";
    quantity: number;
    limitPrice: number | null;
    reason: string;
  },
  taskId: string,
): Promise<ChainResult> {
  const response = await requestJson(
    "/api/founder/market/trading-control-chain",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order,
        ...(taskId ? { taskId } : {}),
      }),
    },
  );

  const data = (await response.json()) as ChainResult;

  if (response.status === 401) {
    throw new Error("Founder authentication failed.");
  }

  if (!response.ok) {
    throw new Error(
      data.error ??
        "Trading control chain request failed.",
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

function formatDecision(value?: string): string {
  if (!value) {
    return "Not recorded";
  }

  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function gateState(
  state?: string,
): {
  ok: boolean;
  warning: boolean;
} {
  if (
    state === "passed" ||
    state === "approved" ||
    state === "ready"
  ) {
    return {
      ok: true,
      warning: false,
    };
  }

  if (state === "review-required") {
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

function boolText(value?: boolean): string {
  return value ? "Yes" : "No";
}

export default function TradingControlChainPage() {
  const [sessionDetected, setSessionDetected] =
    useState(false);

  const [symbol, setSymbol] = useState("NVDA");
  const [market, setMarket] = useState("us");
  const [side, setSide] =
    useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("1");
  const [limitPrice, setLimitPrice] = useState("");
  const [reason, setReason] = useState(
    "Founder-reviewed market execution intent.",
  );
  const [taskId, setTaskId] = useState("");
  const [reviewerNote, setReviewerNote] =
    useState("");

  const [reviewTasks, setReviewTasks] =
    useState<ReviewTask[]>([]);
  const [result, setResult] =
    useState<ChainResult | null>(null);
  const [reviewResult, setReviewResult] =
    useState<ReviewResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [taskLoading, setTaskLoading] =
    useState(false);
  const [reviewLoading, setReviewLoading] =
    useState(false);
  const [reviewSubmitting, setReviewSubmitting] =
    useState(false);
  const [error, setError] = useState("");

  const discoverReviewTasks = useCallback(
    async () => {
      setTaskLoading(true);
      setError("");

      try {
        const data = await discoverTasks();

        const selectable =
          data.selectableTasks ??
          (data.tasks ?? []).filter(
            (item) => item.selectable,
          );

        setReviewTasks(selectable);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Human review task discovery failed.",
        );
      } finally {
        setTaskLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const key = getAccessKey();

    setSessionDetected(Boolean(key));

    if (key) {
      void discoverReviewTasks();
    }
  }, [discoverReviewTasks]);

  function applyTask(task: ReviewTask) {
    setTaskId(task.taskId);

    if (task.symbol) {
      setSymbol(task.symbol);
    }

    if (task.market) {
      setMarket(task.market);
    }

    setResult(null);
    setReviewResult(null);
    setError("");
  }

  async function handleLoadReview() {
    if (!taskId.trim()) {
      setError("Task ID is required.");
      return;
    }

    setReviewLoading(true);
    setError("");

    try {
      const data = await loadReview(taskId.trim());

      setReviewResult(data);

      if (data.review?.symbol) {
        setSymbol(data.review.symbol);
      }

      if (data.review?.market) {
        setMarket(data.review.market);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Human review lookup failed.",
      );
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleSubmitReview(
    decision: ReviewDecision,
  ) {
    if (!taskId.trim()) {
      setError(
        "Task ID is required before recording a human decision.",
      );
      return;
    }

    setReviewSubmitting(true);
    setError("");

    try {
      const data = await submitReview(
        taskId.trim(),
        decision,
        reviewerNote,
      );

      setReviewResult(data);
      await discoverReviewTasks();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Human review submission failed.",
      );
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function handleEvaluate() {
    const parsedQuantity = Number(quantity);

    if (
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      setError(
        "Quantity must be greater than zero.",
      );
      return;
    }

    const parsedLimitPrice = limitPrice.trim()
      ? Number(limitPrice)
      : null;

    if (
      parsedLimitPrice !== null &&
      (!Number.isFinite(parsedLimitPrice) ||
        parsedLimitPrice <= 0)
    ) {
      setError(
        "Limit price must be a positive number.",
      );
      return;
    }

    if (!reason.trim()) {
      setError("Reason is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await evaluateChain(
        {
          symbol: symbol.trim().toUpperCase(),
          market,
          side,
          quantity: Math.floor(parsedQuantity),
          limitPrice: parsedLimitPrice,
          reason: reason.trim(),
        },
        taskId.trim(),
      );

      setResult(data);

      if (data.humanReview?.review) {
        setReviewResult({
          success: true,
          code: "C147_15_HUMAN_REVIEW_FOUND",
          taskId:
            data.humanReview.taskId ??
            taskId,
          review: data.humanReview.review,
          humanDecisionRequired: true,
        });
      }
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

  const review =
    reviewResult?.review ??
    result?.humanReview?.review ??
    null;

  const reviewDecision =
    review?.decision ??
    result?.humanReview?.decision;

  const risk = result?.preTradeRisk;
  const runtime = result?.runtimeState;
  const brokerVerification =
    result?.brokerConnectionVerification;

  const brokerVerificationData =
    brokerVerification?.broker;

  const verificationData =
    brokerVerification?.verification;

  const verificationGate =
    brokerVerification?.gate;

  const executionReady =
    result?.controlDecision?.executionReady ===
    true;

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
                Research
                {" -> "}
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
                Broker
                {" -> "}
                Execution Review
              </p>
            </div>

            <Badge ok={sessionDetected}>
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
            title="Pending Review Tasks"
            eyebrow="C167.5.25 / C167.5.26"
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              <button
                onClick={() =>
                  void discoverReviewTasks()
                }
                disabled={
                  taskLoading ||
                  !sessionDetected
                }
                style={{
                  padding: "9px 13px",
                  borderRadius: 9,
                  border:
                    "1px solid rgba(255,255,255,0.12)",
                  background:
                    "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                {taskLoading
                  ? "Discovering..."
                  : "Refresh Tasks"}
              </button>

              <span
                style={{
                  fontSize: 11,
                  opacity: 0.55,
                }}
              >
                {reviewTasks.length} selectable task
                {reviewTasks.length === 1
                  ? ""
                  : "s"}
              </span>
            </div>

            {reviewTasks.length ? (
              <div
                style={{
                  display: "grid",
                  gap: 8,
                }}
              >
                {reviewTasks.map((task) => (
                  <button
                    key={task.taskId}
                    onClick={() =>
                      applyTask(task)
                    }
                    style={{
                      textAlign: "left",
                      padding: 12,
                      borderRadius: 10,
                      border:
                        task.taskId ===
                        taskId
                          ? "1px solid rgba(255,255,255,0.28)"
                          : "1px solid rgba(255,255,255,0.08)",
                      background:
                        task.taskId ===
                        taskId
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(255,255,255,0.035)",
                      color: "#fff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: 10,
                      }}
                    >
                      <strong>
                        {task.title}
                      </strong>

                      <Badge
                        ok={false}
                        warning
                      >
                        Pending
                      </Badge>
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        opacity: 0.55,
                      }}
                    >
                      {task.symbol} /{" "}
                      {task.market} /{" "}
                      {task.taskId}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background:
                    "rgba(255,255,255,0.035)",
                  fontSize: 12,
                  opacity: 0.58,
                }}
              >
                No selectable pending market review task was discovered.
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 12,
                flexWrap: "wrap",
              }}
            >
              <input
                value={taskId}
                onChange={(event) =>
                  setTaskId(
                    event.target.value,
                  )
                }
                placeholder="Manual Task ID"
                style={{
                  flex: 1,
                  minWidth: 220,
                  padding: "10px 12px",
                  borderRadius: 9,
                  border:
                    "1px solid rgba(255,255,255,0.12)",
                  background:
                    "rgba(255,255,255,0.04)",
                  color: "#fff",
                }}
              />

              <button
                onClick={() =>
                  void handleLoadReview()
                }
                disabled={
                  reviewLoading ||
                  !sessionDetected ||
                  !taskId.trim()
                }
                style={{
                  padding: "10px 14px",
                  borderRadius: 9,
                  border:
                    "1px solid rgba(255,255,255,0.12)",
                  background:
                    "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                {reviewLoading
                  ? "Loading..."
                  : "Load Review"}
              </button>
            </div>
          </Section>

          <Section
            title="Order Intent"
            eyebrow="FOUNDER CONTROL INPUT"
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <label>
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.5,
                    marginBottom: 5,
                  }}
                >
                  Symbol
                </div>
                <input
                  value={symbol}
                  onChange={(event) =>
                    setSymbol(
                      event.target.value,
                    )
                  }
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding:
                      "10px 11px",
                    borderRadius: 9,
                    border:
                      "1px solid rgba(255,255,255,0.12)",
                    background:
                      "rgba(255,255,255,0.04)",
                    color: "#fff",
                  }}
                />
              </label>

              <label>
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.5,
                    marginBottom: 5,
                  }}
                >
                  Market
                </div>
                <select
                  value={market}
                  onChange={(event) =>
                    setMarket(
                      event.target.value,
                    )
                  }
                  style={{
                    width: "100%",
                    padding:
                      "10px 11px",
                    borderRadius: 9,
                    border:
                      "1px solid rgba(255,255,255,0.12)",
                    background:
                      "#18181b",
                    color: "#fff",
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

              <label>
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.5,
                    marginBottom: 5,
                  }}
                >
                  Side
                </div>
                <select
                  value={side}
                  onChange={(event) =>
                    setSide(
                      event.target.value as
                        | "buy"
                        | "sell",
                    )
                  }
                  style={{
                    width: "100%",
                    padding:
                      "10px 11px",
                    borderRadius: 9,
                    border:
                      "1px solid rgba(255,255,255,0.12)",
                    background:
                      "#18181b",
                    color: "#fff",
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

              <label>
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.5,
                    marginBottom: 5,
                  }}
                >
                  Quantity
                </div>
                <input
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(
                      event.target.value,
                    )
                  }
                  inputMode="numeric"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding:
                      "10px 11px",
                    borderRadius: 9,
                    border:
                      "1px solid rgba(255,255,255,0.12)",
                    background:
                      "rgba(255,255,255,0.04)",
                    color: "#fff",
                  }}
                />
              </label>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 2fr",
                gap: 10,
                marginTop: 10,
              }}
            >
              <label>
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.5,
                    marginBottom: 5,
                  }}
                >
                  Limit Price
                </div>
                <input
                  value={limitPrice}
                  onChange={(event) =>
                    setLimitPrice(
                      event.target.value,
                    )
                  }
                  placeholder="Optional"
                  inputMode="decimal"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding:
                      "10px 11px",
                    borderRadius: 9,
                    border:
                      "1px solid rgba(255,255,255,0.12)",
                    background:
                      "rgba(255,255,255,0.04)",
                    color: "#fff",
                  }}
                />
              </label>

              <label>
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.5,
                    marginBottom: 5,
                  }}
                >
                  Reason
                </div>
                <input
                  value={reason}
                  onChange={(event) =>
                    setReason(
                      event.target.value,
                    )
                  }
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding:
                      "10px 11px",
                    borderRadius: 9,
                    border:
                      "1px solid rgba(255,255,255,0.12)",
                    background:
                      "rgba(255,255,255,0.04)",
                    color: "#fff",
                  }}
                />
              </label>
            </div>

            <button
              onClick={() =>
                void handleEvaluate()
              }
              disabled={
                loading ||
                !sessionDetected
              }
              style={{
                marginTop: 12,
                padding:
                  "11px 16px",
                borderRadius: 9,
                border: "none",
                background: "#fff",
                color: "#09090b",
                fontWeight: 800,
              }}
            >
              {loading
                ? "Evaluating..."
                : "Evaluate Control Chain"}
            </button>
          </Section>

          <Section
            title="Pre-Trade Risk Gate"
            eyebrow="C167.5.27 / C167.5.28"
          >
            {risk ? (
              <>
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
                      risk.decision,
                    )}
                  />

                  <Metric
                    label="Approved"
                    value={boolText(
                      risk.approved,
                    )}
                  />

                  <Metric
                    label="Estimated Notional"
                    value={
                      risk.estimatedNotional !=
                      null
                        ? String(
                            risk.estimatedNotional,
                          )
                        : "Not calculated"
                    }
                  />

                  <Metric
                    label="Review Required"
                    value={boolText(
                      risk.reviewRequired,
                    )}
                  />
                </div>

                {risk.blockedReasons?.length ? (
                  <ul
                    style={{
                      margin:
                        "12px 0 0",
                      paddingLeft: 18,
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
              </>
            ) : (
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.55,
                }}
              >
                Evaluate the order to load the server-side pre-trade risk result.
              </div>
            )}

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
              Pre-trade risk is an independent server-side gate. It cannot be bypassed by the Founder UI or request parameters.
            </div>
          </Section>

          <Section
            title="Persistent Human Review"
            eyebrow="C147.15"
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
                label="Task"
                value={
                  taskId ||
                  "Not supplied"
                }
              />

              <Metric
                label="Decision"
                value={formatDecision(
                  reviewDecision,
                )}
              />

              <Metric
                label="Approval"
                value={
                  reviewDecision ===
                  "accepted"
                    ? "Approved"
                    : "Blocked"
                }
              />

              <Metric
                label="Review ID"
                value={
                  review?.reviewId ??
                  "None"
                }
              />
            </div>

            <textarea
              value={reviewerNote}
              onChange={(event) =>
                setReviewerNote(
                  event.target.value,
                )
              }
              placeholder="Reviewer note"
              rows={3}
              style={{
                width: "100%",
                boxSizing: "border-box",
                resize: "vertical",
                marginTop: 12,
                padding:
                  "11px 12px",
                borderRadius: 9,
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(255,255,255,0.04)",
                color: "#fff",
                fontFamily: "inherit",
              }}
            />

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 10,
              }}
            >
              {(
                [
                  "accepted",
                  "acknowledged",
                  "deferred",
                  "rejected",
                ] as ReviewDecision[]
              ).map((decision) => (
                <button
                  key={decision}
                  onClick={() =>
                    void handleSubmitReview(
                      decision,
                    )
                  }
                  disabled={
                    reviewSubmitting ||
                    !sessionDetected ||
                    !taskId.trim() ||
                    Boolean(review)
                  }
                  style={{
                    padding:
                      "10px 14px",
                    borderRadius: 9,
                    border:
                      decision ===
                      "rejected"
                        ? "1px solid rgba(248,113,113,0.2)"
                        : decision ===
                            "accepted"
                          ? "none"
                          : "1px solid rgba(255,255,255,0.12)",
                    background:
                      decision ===
                      "accepted"
                        ? "#fff"
                        : decision ===
                            "rejected"
                          ? "rgba(248,113,113,0.08)"
                          : "rgba(255,255,255,0.06)",
                    color:
                      decision ===
                      "accepted"
                        ? "#09090b"
                        : decision ===
                            "rejected"
                          ? "#fca5a5"
                          : "#fff",
                    fontWeight: 700,
                  }}
                >
                  {formatDecision(
                    decision,
                  )}
                </button>
              ))}
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 11,
                lineHeight: 1.6,
                opacity: 0.58,
              }}
            >
              Only accepted is approval. Acknowledged, deferred, rejected, missing, or silent review never becomes approval.
            </div>
          </Section>

          {result ? (
            <>
              <Section
                title="Broker Connection Verification"
                eyebrow="C167.5.31 / C167.5.32 / C167.5.34"
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
                      brokerVerificationData
                        ?.brokerId ??
                      "Not configured"
                    }
                  />

                  <Metric
                    label="Status"
                    value={formatDecision(
                      brokerVerificationData
                        ?.status,
                    )}
                  />

                  <Metric
                    label="Decision"
                    value={formatDecision(
                      brokerVerificationData
                        ?.decision,
                    )}
                  />

                  <Metric
                    label="Verification Gate"
                    value={
                      verificationGate?.open
                        ? "Open"
                        : "Closed"
                    }
                  />

                  <Metric
                    label="Connection"
                    value={boolText(
                      verificationData
                        ?.connectionVerified,
                    )}
                  />

                  <Metric
                    label="Credentials"
                    value={boolText(
                      verificationData
                        ?.credentialsVerified,
                    )}
                  />

                  <Metric
                    label="Account"
                    value={boolText(
                      verificationData
                        ?.accountVerified,
                    )}
                  />

                  <Metric
                    label="Verification Complete"
                    value={boolText(
                      verificationData
                        ?.verificationComplete,
                    )}
                  />
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(3, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="Source"
                    value={
                      brokerVerificationData
                        ?.source ??
                      "Unknown"
                    }
                  />

                  <Metric
                    label="Verified By"
                    value={
                      brokerVerificationData
                        ?.verifiedBy ??
                      "Not recorded"
                    }
                  />

                  <Metric
                    label="Contract"
                    value={
                      brokerVerificationData
                        ?.contractReference ??
                      "Not recorded"
                    }
                  />
                </div>

                {brokerVerificationData
                  ?.reason ? (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 10,
                      background:
                        "rgba(255,255,255,0.035)",
                      fontSize: 12,
                      lineHeight: 1.6,
                      opacity: 0.72,
                    }}
                  >
                    {brokerVerificationData.reason}
                  </div>
                ) : null}

                {brokerVerificationData
                  ?.failureCodes?.length ? (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 10,
                      background:
                        "rgba(248,113,113,0.06)",
                      border:
                        "1px solid rgba(248,113,113,0.12)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        opacity: 0.55,
                        marginBottom: 6,
                      }}
                    >
                      Failure Codes
                    </div>

                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: 18,
                        fontSize: 12,
                        lineHeight: 1.7,
                        color: "#fca5a5",
                      }}
                    >
                      {brokerVerificationData.failureCodes.map(
                        (item) => (
                          <li key={item}>
                            {item}
                          </li>
                        ),
                      )}
                    </ul>
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
                  Broker Connection Verification is an independent control boundary. UI state cannot self-verify credentials, account ownership, broker connectivity, or execution authorization.
                </div>
              </Section>

              <Section
                title="Control Decision"
                eyebrow="SERVER-SIDE RESULT"
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
                    value={
                      result.controlDecision
                        ?.decision ??
                      "blocked"
                    }
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
                    label="Automatic Execution"
                    value="Disabled"
                  />

                  <Metric
                    label="Live Order"
                    value="Disabled"
                  />
                </div>
              </Section>

              <Section
                title="Control Chain"
                eyebrow="GATE-BY-GATE"
              >
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                  }}
                >
                  {(result.controlChain ?? []).map(
                    (item, index) => {
                      const state =
                        gateState(
                          item.state,
                        );

                      return (
                        <div
                          key={`${item.stage}-${index}`}
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "210px 160px 1fr",
                            gap: 12,
                            alignItems:
                              "center",
                            padding: 12,
                            borderRadius: 10,
                            background:
                              "rgba(255,255,255,0.035)",
                          }}
                        >
                          <strong
                            style={{
                              fontSize: 13,
                            }}
                          >
                            {item.stage ??
                              "Unknown"}
                          </strong>

                          <Badge
                            ok={
                              state.ok
                            }
                            warning={
                              state.warning
                            }
                          >
                            {formatDecision(
                              item.state,
                            )}
                          </Badge>

                          <span
                            style={{
                              fontSize: 12,
                              lineHeight: 1.55,
                              opacity: 0.62,
                            }}
                          >
                            {item.description ??
                              ""}
                          </span>
                        </div>
                      );
                    },
                  )}
                </div>
              </Section>

              <Section
                title="Provider & Commercial"
                eyebrow="MARKET DATA BOUNDARY"
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
                    label="Provider"
                    value={
                      result.provider?.id ??
                      "None"
                    }
                  />

                  <Metric
                    label="Technical"
                    value={
                      result.provider
                        ?.technicalReady
                        ? "Ready"
                        : "Blocked"
                    }
                  />

                  <Metric
                    label="Commercial"
                    value={
                      result
                        .commercialAuthorization
                        ?.decision ??
                      "Unknown"
                    }
                  />

                  <Metric
                    label="Commercial Gate"
                    value={
                      result
                        .commercialAuthorization
                        ?.gateOpen
                        ? "Open"
                        : "Closed"
                    }
                  />
                </div>
              </Section>

              <Section
                title="Broker Adapter"
                eyebrow="EXECUTION ADAPTER"
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
                    label="Adapter"
                    value={
                      result.brokerAdapter
                        ?.id ??
                      "unconfigured"
                    }
                  />

                  <Metric
                    label="Configured"
                    value={
                      result.brokerAdapter
                        ?.configured
                        ? "Yes"
                        : "No"
                    }
                  />

                  <Metric
                    label="Ready"
                    value={
                      result.brokerAdapter
                        ?.ready
                        ? "Yes"
                        : "No"
                    }
                  />

                  <Metric
                    label="Diagnostic"
                    value={
                      result.brokerAdapter
                        ?.diagnostic
                        ?.status ??
                      "Unknown"
                    }
                  />
                </div>

                {result.brokerAdapter
                  ?.diagnostic
                  ?.blockedReasons?.length ? (
                  <ul
                    style={{
                      margin:
                        "12px 0 0",
                      paddingLeft: 18,
                      fontSize: 12,
                      lineHeight: 1.7,
                      opacity: 0.68,
                    }}
                  >
                    {result.brokerAdapter.diagnostic.blockedReasons.map(
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
                title="Runtime State"
                eyebrow="SERVER-SIDE CONTROL STATE"
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
                    label="Provider"
                    value={
                      runtime
                        ?.providerReady
                        ? "Ready"
                        : "Blocked"
                    }
                  />

                  <Metric
                    label="Risk"
                    value={
                      runtime
                        ?.preTradeRiskPassed
                        ? "Passed"
                        : runtime
                            ?.preTradeRiskReviewRequired
                          ? "Review Required"
                          : "Blocked"
                    }
                  />

                  <Metric
                    label="Human Review"
                    value={
                      runtime
                        ?.persistentHumanReviewApproved
                        ? "Approved"
                        : "Blocked"
                    }
                  />

                  <Metric
                    label="Broker Verification"
                    value={
                      runtime
                        ?.brokerVerificationPassed
                        ? "Passed"
                        : "Blocked"
                    }
                  />

                  <Metric
                    label="Connection"
                    value={
                      runtime
                        ?.brokerConnectionVerified
                        ? "Verified"
                        : "Blocked"
                    }
                  />

                  <Metric
                    label="Credentials"
                    value={
                      runtime
                        ?.brokerCredentialsVerified
                        ? "Verified"
                        : "Blocked"
                    }
                  />

                  <Metric
                    label="Account"
                    value={
                      runtime
                        ?.brokerAccountVerified
                        ? "Verified"
                        : "Blocked"
                    }
                  />

                  <Metric
                    label="Execution"
                    value={
                      runtime
                        ?.executionReady
                        ? "Ready"
                        : "Blocked"
                    }
                  />
                </div>
              </Section>

              {result.nextRequirements?.length ? (
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
                    {result.nextRequirements.map(
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
                    label="Pre-Trade Risk"
                    value={
                      result
                        .safetyBoundary
                        ?.preTradeRiskRequired
                        ? "Required"
                        : "Disabled"
                    }
                  />

                  <Metric
                    label="Broker Verification"
                    value={
                      result
                        .safetyBoundary
                        ?.brokerConnectionRequired
                        ? "Required"
                        : "Disabled"
                    }
                  />

                  <Metric
                    label="Risk Override"
                    value={
                      result
                        .safetyBoundary
                        ?.automaticRiskOverrideAllowed
                        ? "Allowed"
                        : "Blocked"
                    }
                  />

                  <Metric
                    label="Live Execution"
                    value={
                      result
                        .safetyBoundary
                        ?.currentLiveExecutionEnabled
                        ? "Enabled"
                        : "Disabled"
                    }
                  />

                  <Metric
                    label="Trading Executed"
                    value={
                      result
                        .safetyBoundary
                        ?.tradingExecuted
                        ? "Yes"
                        : "No"
                    }
                  />

                  <Metric
                    label="Automatic Order"
                    value={
                      result
                        .safetyBoundary
                        ?.automaticOrderPlacement
                        ? "Enabled"
                        : "Disabled"
                    }
                  />

                  <Metric
                    label="Paper Trading"
                    value={
                      result
                        .safetyBoundary
                        ?.paperTradingRequired
                        ? "Required"
                        : "Not Required"
                    }
                  />

                  <Metric
                    label="Execution Adapter"
                    value={
                      result
                        .safetyBoundary
                        ?.executionAdapterRequired
                        ? "Required"
                        : "Disabled"
                    }
                  />
                </div>

                <div
                  style={{
                    marginTop: 12,
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
                  This Founder control surface evaluates readiness only. It does not place live orders. Pre-trade risk, commercial authorization, persistent human review, broker connection verification, broker adapter readiness, paper verification, and final execution controls remain independent gates.
                </div>
              </Section>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
