export type MarketHumanReviewDecision =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "not-requested";

export type MarketHumanReviewStatus =
  | "not-requested"
  | "pending"
  | "approved"
  | "rejected"
  | "expired";

export interface MarketHumanReviewOrder {
  symbol: string;
  market: string;
  side: "buy" | "sell";
  quantity: number;
  limitPrice: number | null;
  reason: string;
}

export interface MarketHumanReviewRequest {
  reviewId: string;
  order: MarketHumanReviewOrder | null;
  requestedBy: string;
  requestedAt: string;
  expiresAt: string;
  decision: MarketHumanReviewDecision;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
}

export interface MarketHumanReviewEvaluation {
  status: MarketHumanReviewStatus;
  decision: MarketHumanReviewDecision;
  reviewRequired: boolean;
  approved: boolean;
  executionEligible: false;
  reason: string;
}

const REVIEW_TTL_MS = 15 * 60 * 1000;

function nowIso(): string {
  return new Date().toISOString();
}

function createReviewId(): string {
  const randomPart =
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `market-review-${Date.now()}-${randomPart}`;
}

function getRequestedBy(): string {
  return (
    process.env.MARKET_HUMAN_REVIEW_REQUESTED_BY?.trim() ||
    "founder"
  );
}

function getConfiguredDecision(): MarketHumanReviewDecision {
  const value =
    process.env.MARKET_HUMAN_REVIEW_DECISION?.trim().toLowerCase();

  if (
    value === "approved" ||
    value === "rejected" ||
    value === "expired" ||
    value === "pending" ||
    value === "not-requested"
  ) {
    return value;
  }

  return "not-requested";
}

function isExpired(expiresAt: string): boolean {
  const timestamp = Date.parse(expiresAt);

  if (!Number.isFinite(timestamp)) {
    return true;
  }

  return Date.now() >= timestamp;
}

export function createMarketHumanReviewRequest(
  order: MarketHumanReviewOrder | null,
): MarketHumanReviewRequest {
  const requestedAt = new Date();

  const expiresAt = new Date(
    requestedAt.getTime() + REVIEW_TTL_MS,
  );

  return {
    reviewId: createReviewId(),
    order,
    requestedBy: getRequestedBy(),
    requestedAt: requestedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    decision: "pending",
    decidedBy: null,
    decidedAt: null,
    decisionReason: null,
  };
}

export function evaluateMarketHumanReview(
  request: MarketHumanReviewRequest | null,
): MarketHumanReviewEvaluation {
  if (!request) {
    return {
      status: "not-requested",
      decision: "not-requested",
      reviewRequired: true,
      approved: false,
      executionEligible: false,
      reason:
        "Explicit human review has not been requested.",
    };
  }

  if (isExpired(request.expiresAt)) {
    return {
      status: "expired",
      decision: "expired",
      reviewRequired: true,
      approved: false,
      executionEligible: false,
      reason:
        "The human review request has expired and must be requested again.",
    };
  }

  if (request.decision === "approved") {
    return {
      status: "approved",
      decision: "approved",
      reviewRequired: false,
      approved: true,
      executionEligible: false,
      reason:
        "Human review was approved, but approval alone never enables execution.",
    };
  }

  if (request.decision === "rejected") {
    return {
      status: "rejected",
      decision: "rejected",
      reviewRequired: true,
      approved: false,
      executionEligible: false,
      reason:
        request.decisionReason ||
        "Human review rejected the execution intent.",
    };
  }

  return {
    status: "pending",
    decision: "pending",
    reviewRequired: true,
    approved: false,
    executionEligible: false,
    reason:
      "Explicit human approval is still required before any future execution review.",
  };
}

export function getMarketHumanReviewPolicy() {
  return {
    enabled: true,
    reviewTtlMinutes: REVIEW_TTL_MS / 60000,
    approvalRequired: true,
    approvalIsNonAutomatic: true,
    approvalDoesNotEnableExecution: true,
    brokerExecutionStillRequired: true,
    paperTradingStillRequired: true,
    liveExecutionEnabled: false,
  };
}

export function getConfiguredHumanReviewEvaluation(
  order: MarketHumanReviewOrder | null = null,
): MarketHumanReviewEvaluation {
  const decision = getConfiguredDecision();

  if (decision === "approved") {
    const requested =
      createMarketHumanReviewRequest(order);

    const approvedRequest: MarketHumanReviewRequest = {
      ...requested,
      decision: "approved",
      decidedBy:
        process.env.MARKET_HUMAN_REVIEW_APPROVED_BY?.trim() ||
        null,
      decidedAt: nowIso(),
      decisionReason:
        process.env.MARKET_HUMAN_REVIEW_REASON?.trim() ||
        "Explicit human review approval.",
    };

    return evaluateMarketHumanReview(
      approvedRequest,
    );
  }

  if (decision === "rejected") {
    const requested =
      createMarketHumanReviewRequest(order);

    const rejectedRequest: MarketHumanReviewRequest = {
      ...requested,
      decision: "rejected",
      decidedBy:
        process.env.MARKET_HUMAN_REVIEW_REJECTED_BY?.trim() ||
        null,
      decidedAt: nowIso(),
      decisionReason:
        process.env.MARKET_HUMAN_REVIEW_REASON?.trim() ||
        "Explicit human review rejection.",
    };

    return evaluateMarketHumanReview(
      rejectedRequest,
    );
  }

  if (decision === "expired") {
    const requested =
      createMarketHumanReviewRequest(order);

    const expiredRequest: MarketHumanReviewRequest = {
      ...requested,
      expiresAt: new Date(
        Date.now() - 1000,
      ).toISOString(),
      decision: "pending",
    };

    return evaluateMarketHumanReview(
      expiredRequest,
    );
  }

  if (decision === "pending") {
    return evaluateMarketHumanReview(
      createMarketHumanReviewRequest(order),
    );
  }

  return evaluateMarketHumanReview(null);
}
