"use client";

import { useEffect, useState } from "react";

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
  controlDecision?: {
    state?: string;
    executionAllowed?: boolean;
    reason?: string;
  };
  gates?: {
    researchGate?: boolean;
    providerTechnicalReady?: boolean;
    providerRealtimeVerified?: boolean;
    commercialGateOpen?: boolean;
    brokerAdapterConfigured?: boolean;
    brokerAdapterReady?: boolean;
    brokerConnectionVerified?: boolean;
    brokerCredentialsVerified?: boolean;
    brokerAccountVerified?: boolean;
    paperTradingVerified?: boolean;
    persistentHumanReviewGate?: boolean;
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

async function requestControlChain(
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
        ...(taskId.trim()
          ? {
              taskId: taskId.trim(),
            }
          : {}),
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

async function requestHumanReview(
  taskId: string,
): Promise<ReviewResponse> {
  const response = await requestJson(
    `/api/founder/market/human-review?taskId=${encodeURIComponent(
      taskId.trim(),
    )}`,
  );

  const data =
    (await response.json()) as ReviewResponse;

  if (response.status === 401) {
    throw new Error("Founder authentication failed.");
  }

  if (!response.ok) {
    throw new Error(
      data.error ??
        "Human review lookup failed.",
    );
  }

  return data;
}

async function submitHumanReview(
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
        taskId: taskId.trim(),
        decision,
        reviewerNote:
          reviewerNote.trim() || null,
      }),
    },
  );

  const data =
    (await response.json()) as ReviewResponse;

  if (response.status === 401) {
    throw new Error("Founder authentication failed.");
  }

  if (!response.ok) {
    throw new Error(
      data.error ??
        "Human review submission failed.",
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
        color: ok
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

function decisionLabel(
  decision?: string,
): string {
  switch (decision) {
    case "accepted":
      return "Accepted";
    case "acknowledged":
      return "Acknowledged";
    case "rejected":
      return "Rejected";
    case "deferred":
      return "Deferred";
    default:
      return "Not Recorded";
  }
}

function decisionIsApproval(
  decision?: string,
): boolean {
  return decision === "accepted";
}

export default function TradingControlChainPage() {
  const [
    sessionDetected,
    setSessionDetected,
  ] = useState(false);

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

  const [
    reviewerNote,
    setReviewerNote,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    reviewLoading,
    setReviewLoading,
  ] = useState(false);

  const [
    reviewSubmitting,
    setReviewSubmitting,
  ] = useState(false);

  const [result, setResult] =
    useState<ChainResult | null>(null);

  const [
    reviewResult,
    setReviewResult,
  ] =
    useState<ReviewResponse | null>(null);

  const [error, setError] =
    useState("");

  useEffect(() => {
    setSessionDetected(
      Boolean(getAccessKey()),
    );
  }, []);

  async function loadHumanReview() {
    if (!taskId.trim()) {
      setError(
        "Task ID is required to load persistent human review.",
      );
      return;
    }

    setReviewLoading(true);
    setError("");

    try {
      const data =
        await requestHumanReview(
          taskId,
        );

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

  async function submitReview(
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
      const data =
        await submitHumanReview(
          taskId,
          decision,
          reviewerNote,
        );

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
          : "Human review submission failed.",
      );
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function evaluateChain() {
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

    setLoading(true);
    setError("");

    try {
      const data =
        await requestControlChain(
          {
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
              reason.trim(),
          },
          taskId,
        );

      setResult(data);

      if (
        data.humanReview?.review
      ) {
        setReviewResult({
          success: true,
          code:
            "C147_15_HUMAN_REVIEW_FOUND",
          taskId:
            data.humanReview.taskId ??
            taskId,
          review:
            data.humanReview.review,
          humanDecisionRequired:
            true,
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

  const gates = result?.gates;
  const execution = result?.execution;
  const persistentReview =
    reviewResult?.review ??
    result?.humanReview?.review ??
    null;

  const reviewDecision =
    persistentReview?.decision ??
    result?.humanReview?.decision;

  const reviewApproved =
    decisionIsApproval(
      reviewDecision,
    );

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
              letterSpacing:
                "0.14em",
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
                Trading Control Chain
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
                Research → Provider → Commercial → Broker Adapter → Human Review → Execution
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
            gap: 16,
          }}
        >
          <Section
            title="Order Intent"
            eyebrow="FOUNDER REVIEW INPUT"
          >
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
                onChange={(event) =>
                  setSymbol(
                    event.target.value,
                  )
                }
                placeholder="Symbol"
                style={{
                  minWidth: 0,
                  padding:
                    "12px 13px",
                  borderRadius: 10,
                  border:
                    "1px solid rgba(255,255,255,0.12)",
                  background:
                    "rgba(255,255,255,0.04)",
                  color: "#fff",
                }}
              />

              <select
                value={market}
                onChange={(event) =>
                  setMarket(
                    event.target.value,
                  )
                }
                style={{
                  padding:
                    "12px 13px",
                  borderRadius: 10,
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
                  padding:
                    "12px 13px",
                  borderRadius: 10,
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
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "0.6fr 0.7fr 1.7fr",
                gap: 10,
                marginTop: 10,
              }}
            >
              <input
                value={quantity}
                onChange={(event) =>
                  setQuantity(
                    event.target.value,
                  )
                }
                inputMode="numeric"
                placeholder="Quantity"
                style={{
                  padding:
                    "11px 12px",
                  borderRadius: 9,
                  border:
                    "1px solid rgba(255,255,255,0.12)",
                  background:
                    "rgba(255,255,255,0.04)",
                  color: "#fff",
                }}
              />

              <input
                value={limitPrice}
                onChange={(event) =>
                  setLimitPrice(
                    event.target.value,
                  )
                }
                inputMode="decimal"
                placeholder="Limit price"
                style={{
                  padding:
                    "11px 12px",
                  borderRadius: 9,
                  border:
                    "1px solid rgba(255,255,255,0.12)",
                  background:
                    "rgba(255,255,255,0.04)",
                  color: "#fff",
                }}
              />

              <input
                value={reason}
                onChange={(event) =>
                  setReason(
                    event.target.value,
                  )
                }
                placeholder="Order reason"
                style={{
                  padding:
                    "11px 12px",
                  borderRadius: 9,
                  border:
                    "1px solid rgba(255,255,255,0.12)",
                  background:
                    "rgba(255,255,255,0.04)",
                  color: "#fff",
                }}
              />
            </div>

            <button
              onClick={
                evaluateChain
              }
              disabled={
                loading ||
                !sessionDetected
              }
              style={{
                width: "100%",
                marginTop: 12,
                padding:
                  "13px 16px",
                borderRadius: 10,
                border: "none",
                background:
                  loading
                    ? "#3f3f46"
                    : "#fff",
                color:
                  loading
                    ? "#aaa"
                    : "#09090b",
                fontWeight: 750,
                cursor:
                  loading
                    ? "wait"
                    : "pointer",
              }}
            >
              {loading
                ? "Evaluating Control Chain..."
                : "Evaluate Trading Control Chain"}
            </button>
          </Section>

          <Section
            title="Persistent Human Review"
            eyebrow="C147.15 REVIEW RECORD"
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(0, 1fr) auto",
                gap: 10,
              }}
            >
              <input
                value={taskId}
                onChange={(event) =>
                  setTaskId(
                    event.target.value,
                  )
                }
                placeholder="Persistent Task ID"
                style={{
                  minWidth: 0,
                  padding:
                    "12px 13px",
                  borderRadius: 10,
                  border:
                    "1px solid rgba(255,255,255,0.12)",
                  background:
                    "rgba(255,255,255,0.04)",
                  color: "#fff",
                }}
              />

              <button
                onClick={
                  loadHumanReview
                }
                disabled={
                  reviewLoading ||
                  !sessionDetected ||
                  !taskId.trim()
                }
                style={{
                  padding:
                    "12px 16px",
                  borderRadius: 10,
                  border:
                    "1px solid rgba(255,255,255,0.12)",
                  background:
                    reviewLoading
                      ? "#27272a"
                      : "rgba(255,255,255,0.08)",
                  color: "#fff",
                  fontWeight: 650,
                  cursor:
                    reviewLoading
                      ? "wait"
                      : "pointer",
                }}
              >
                {reviewLoading
                  ? "Loading..."
                  : "Load Review"}
              </button>
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
                label="Task"
                value={
                  taskId.trim()
                    ? taskId.trim()
                    : "Not supplied"
                }
              />

              <Metric
                label="Decision"
                value={decisionLabel(
                  reviewDecision,
                )}
              />

              <Metric
                label="Approval"
                value={
                  reviewApproved
                    ? "Accepted"
                    : "Not approved"
                }
              />

              <Metric
                label="Source"
                value="C147.15"
              />
            </div>

            {persistentReview ? (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 10,
                  background:
                    "rgba(255,255,255,0.035)",
                  border:
                    "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    gap: 12,
                    flexWrap:
                      "wrap",
                  }}
                >
                  <div>
                    <strong
                      style={{
                        fontSize: 13,
                      }}
                    >
                      {persistentReview.taskTitle ??
                        "Persistent Human Review"}
                    </strong>

                    <div
                      style={{
                        marginTop: 5,
                        fontSize: 11,
                        opacity: 0.55,
                      }}
                    >
                      {persistentReview.reviewId ??
                        "Review record not available"}
                    </div>
                  </div>

                  <Badge
                    ok={
                      reviewApproved
                    }
                  >
                    {decisionLabel(
                      reviewDecision,
                    )}
                  </Badge>
                </div>

                <p
                  style={{
                    margin:
                      "12px 0 0",
                    fontSize: 12,
                    lineHeight: 1.6,
                    opacity: 0.65,
                  }}
                >
                  {persistentReview.reviewerNote ||
                    "No reviewer note recorded."}
                </p>
              </div>
            ) : null}

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() =>
                  submitReview(
                    "accepted",
                  )
                }
                disabled={
                  reviewSubmitting ||
                  !sessionDetected ||
                  !taskId.trim() ||
                  Boolean(
                    persistentReview,
                  )
                }
                style={{
                  padding:
                    "10px 14px",
                  borderRadius: 9,
                  border: "none",
                  background:
                    "#fff",
                  color: "#09090b",
                  fontWeight: 700,
                  cursor:
                    reviewSubmitting
                      ? "wait"
                      : "pointer",
                }}
              >
                Accept
              </button>

              <button
                onClick={() =>
                  submitReview(
                    "acknowledged",
                  )
                }
                disabled={
                  reviewSubmitting ||
                  !sessionDetected ||
                  !taskId.trim() ||
                  Boolean(
                    persistentReview,
                  )
                }
                style={{
                  padding:
                    "10px 14px",
                  borderRadius: 9,
                  border:
                    "1px solid rgba(255,255,255,0.12)",
                  background:
                    "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontWeight: 650,
                  cursor:
                    reviewSubmitting
                      ? "wait"
                      : "pointer",
                }}
              >
                Acknowledge
              </button>

              <button
                onClick={() =>
                  submitReview(
                    "deferred",
                  )
                }
                disabled={
                  reviewSubmitting ||
                  !sessionDetected ||
                  !taskId.trim() ||
                  Boolean(
                    persistentReview,
                  )
                }
                style={{
                  padding:
                    "10px 14px",
                  borderRadius: 9,
                  border:
                    "1px solid rgba(255,255,255,0.12)",
                  background:
                    "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontWeight: 650,
                  cursor:
                    reviewSubmitting
                      ? "wait"
                      : "pointer",
                }}
              >
                Defer
              </button>

              <button
                onClick={() =>
                  submitReview(
                    "rejected",
                  )
                }
                disabled={
                  reviewSubmitting ||
                  !sessionDetected ||
                  !taskId.trim() ||
                  Boolean(
                    persistentReview,
                  )
                }
                style={{
                  padding:
                    "10px 14px",
                  borderRadius: 9,
                  border:
                    "1px solid rgba(248,113,113,0.2)",
                  background:
                    "rgba(248,113,113,0.08)",
                  color: "#fca5a5",
                  fontWeight: 650,
                  cursor:
                    reviewSubmitting
                      ? "wait"
                      : "pointer",
                }}
              >
                Reject
              </button>
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
                marginTop: 10,
                boxSizing: "border-box",
                resize: "vertical",
                padding:
                  "11px 12px",
                borderRadius: 9,
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(255,255,255,0.04)",
                color: "#fff",
                fontFamily:
                  "inherit",
              }}
            />

            <div
              style={{
                marginTop: 10,
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
              Accepted is the only decision treated as human approval by the trading control chain. Acknowledged, deferred, rejected, missing, or silent review never becomes approval.
            </div>
          </Section>

          {result ? (
            <>
              <Section
                title="Control Decision"
                eyebrow="SERVER-SIDE DECISION"
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
                    label="State"
                    value={
                      result
                        .controlDecision
                        ?.state ??
                      "unknown"
                    }
                  />

                  <Metric
                    label="Execution"
                    value={
                      result
                        .controlDecision
                        ?.executionAllowed
                        ? "Allowed"
                        : "Blocked"
                    }
                  />

                  <Metric
                    label="Live Execution"
                    value={
                      execution
                        ?.readyForLiveExecution
                        ? "Ready"
                        : "Disabled"
                    }
                  />
                </div>

                <p
                  style={{
                    margin:
                      "14px 0 0",
                    fontSize: 13,
                    lineHeight: 1.7,
                    opacity: 0.7,
                  }}
                >
                  {result
                    .controlDecision
                    ?.reason ??
                    "No control decision returned."}
                </p>
              </Section>

              <Section
                title="Control Chain"
                eyebrow="GATE-BY-GATE STATUS"
              >
                <div
                  style={{
                    display: "grid",
                    gap: 9,
                  }}
                >
                  {result.controlChain?.map(
                    (item) => {
                      const blocked =
                        item.state ===
                          "blocked" ||
                        item.state ===
                          "not-authorized" ||
                        item.state ===
                          "disabled" ||
                        item.state ===
                          "diagnostic-only" ||
                        item.state ===
                          "not-configured";

                      return (
                        <div
                          key={
                            item.stage
                          }
                          style={{
                            display:
                              "grid",
                            gridTemplateColumns:
                              "160px 170px 1fr",
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
                              "unknown"}
                          </strong>

                          <Badge
                            ok={!blocked}
                          >
                            {item.state ??
                              "unknown"}
                          </Badge>

                          <span
                            style={{
                              fontSize: 12,
                              lineHeight: 1.55,
                              opacity:
                                0.62,
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
                title="Provider & Commercial Gate"
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
                      result.provider
                        ?.id ??
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
                    label="Realtime"
                    value={
                      result.provider
                        ?.realtimeVerified
                        ? "Verified"
                        : "Not verified"
                    }
                  />

                  <Metric
                    label="Commercial"
                    value={
                      result
                        .commercialAuthorization
                        ?.decision ??
                      "unknown"
                    }
                  />
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(3, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
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

                  <Metric
                    label="Authorized"
                    value={
                      result
                        .commercialAuthorization
                        ?.authorized
                        ? "Yes"
                        : "No"
                    }
                  />

                  <Metric
                    label="Reason"
                    value={
                      result
                        .commercialAuthorization
                        ?.reason ??
                      "Not verified"
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
                    gridTemplateColumns:
                      "repeat(4, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="Adapter"
                    value={
                      result
                        .brokerAdapter
                        ?.id ??
                      "unconfigured"
                    }
                  />

                  <Metric
                    label="Configured"
                    value={
                      result
                        .brokerAdapter
                        ?.configured
                        ? "Yes"
                        : "No"
                    }
                  />

                  <Metric
                    label="Ready"
                    value={
                      result
                        .brokerAdapter
                        ?.ready
                        ? "Yes"
                        : "No"
                    }
                  />

                  <Metric
                    label="Diagnostic"
                    value={
                      result
                        .brokerAdapter
                        ?.diagnostic
                        ?.status ??
                      "unknown"
                    }
                  />
                </div>

                {result
                  .brokerAdapter
                  ?.diagnostic
                  ?.blockedReasons
                  ?.length ? (
                  <ul
                    style={{
                      margin:
                        "14px 0 0",
                      paddingLeft: 18,
                      fontSize: 12,
                      lineHeight: 1.7,
                      opacity: 0.72,
                    }}
                  >
                    {result
                      .brokerAdapter
                      .diagnostic
                      .blockedReasons.map(
                        (item) => (
                          <li
                            key={item}
                          >
                            {item}
                          </li>
                        ),
                      )}
                  </ul>
                ) : null}
              </Section>

              <Section
                title="Human Review Gate"
                eyebrow="PERSISTENT C147.15 STATE"
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
                      result
                        .humanReview
                        ?.taskId ??
                      (taskId ||
                        "Not supplied")
                    }
                  />

                  <Metric
                    label="Found"
                    value={
                      result
                        .humanReview
                        ?.found
                        ? "Yes"
                        : "No"
                    }
                  />

                  <Metric
                    label="Decision"
                    value={decisionLabel(
                      result
                        .humanReview
                        ?.decision,
                    )}
                  />

                  <Metric
                    label="Gate"
                    value={
                      result
                        .humanReview
                        ?.approved
                        ? "Approved"
                        : "Blocked"
                    }
                  />
                </div>

                <p
                  style={{
                    margin:
                      "14px 0 0",
                    fontSize: 12,
                    lineHeight: 1.65,
                    opacity: 0.65,
                  }}
                >
                  {result
                    .humanReview
                    ?.reason ??
                    "Persistent human review is required."}
                </p>
              </Section>

              <Section
                title="Next Requirements"
                eyebrow="CONTROL CHAIN BLOCKERS"
              >
                {result.nextRequirements
                  ?.length ? (
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: 18,
                      fontSize: 12,
                      lineHeight: 1.8,
                      opacity: 0.72,
                    }}
                  >
                    {result.nextRequirements.map(
                      (item) => (
                        <li
                          key={item}
                        >
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                ) : (
                  <div
                    style={{
                      fontSize: 12,
                      opacity: 0.6,
                    }}
                  >
                    No additional requirements returned.
                  </div>
                )}
              </Section>

              <Section
                title="Execution Safety Boundary"
                eyebrow="NON-AUTOMATIC EXECUTION"
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
                    label="Live Order"
                    value={
                      result
                        .safetyBoundary
                        ?.liveOrderPlacement
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
                </div>

                <p
                  style={{
                    margin:
                      "14px 0 0",
                    fontSize: 12,
                    lineHeight: 1.7,
                    opacity: 0.65,
                  }}
                >
                  Persistent human review is a required control gate. Even an accepted review does not independently enable live trading. Broker connection, credentials, account verification, paper verification, execution adapter readiness, commercial authorization, and final execution controls remain separate requirements.
                </p>
              </Section>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
