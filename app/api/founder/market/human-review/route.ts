import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

import {
  runWithUserContext,
} from "@/lib/runtime/request-context";

import {
  runMarketHumanReview,
  getMarketHumanReview,
} from "@/lib/runtime/market/market-human-review-runtime";

import type {
  MarketHumanReviewDecision,
} from "@/lib/runtime/market/market-human-review-types";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function unauthorized() {
  return NextResponse.json(
    {
      success: false,
      code:
        "FOUNDER_AUTH_REQUIRED",
      error:
        "Founder authentication required.",
    },
    {
      status: 401,
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function isDecision(
  value: unknown,
): value is MarketHumanReviewDecision {
  return (
    value ===
      "acknowledged" ||
    value ===
      "accepted" ||
    value ===
      "rejected" ||
    value ===
      "deferred"
  );
}

function response(
  body: Record<
    string,
    unknown
  >,
  status = 200,
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control":
          "no-store",
        "Content-Type":
          "application/json; charset=utf-8",
      },
    },
  );
}

export async function GET(
  request: NextRequest,
) {
  if (
    !isFounderRequest(
      request,
    )
  ) {
    return unauthorized();
  }

  const identity =
    resolveAlphaIdentity(
      request,
    );

  const url =
    new URL(
      request.url,
    );

  const taskId =
    url.searchParams.get(
      "taskId",
    );

  if (!taskId) {
    return response({
      success: true,
      code:
        "C147_15_HUMAN_REVIEW_READY",
      runtime:
        "market-human-review-runtime",
      version:
        "C147.15",
      upstream:
        "C147.14",
      identity: {
        userId:
          identity.userId,
        isolated: true,
      },
      decisions: [
        "acknowledged",
        "accepted",
        "rejected",
        "deferred",
      ],
      mutationPerformed:
        false,
      automatedExecutionStarted:
        false,
      plannerDispatched:
        false,
      tradingExecuted:
        false,
      humanDecisionRequired:
        true,
      boundary:
        "Only an explicit human decision may be recorded. No decision is inferred or executed automatically.",
    });
  }

  try {
    const review =
      await runWithUserContext(
        identity.userId,
        () =>
          getMarketHumanReview(
            taskId,
          ),
      );

    return response({
      success: true,
      code:
        review
          ? "C147_15_HUMAN_REVIEW_FOUND"
          : "C147_15_HUMAN_REVIEW_NOT_FOUND",
      taskId,
      review,
      identity: {
        userId:
          identity.userId,
        isolated: true,
      },
      humanDecisionRequired:
        true,
      automatedExecutionStarted:
        false,
      plannerDispatched:
        false,
      tradingExecuted:
        false,
    });
  } catch (error) {
    return response(
      {
        success: false,
        code:
          "C147_15_HUMAN_REVIEW_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Human review lookup failed.",
        identity: {
          userId:
            identity.userId,
          isolated: true,
        },
      },
      500,
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  if (
    !isFounderRequest(
      request,
    )
  ) {
    return unauthorized();
  }

  const identity =
    resolveAlphaIdentity(
      request,
    );

  try {
    const body =
      await request.json();

    const taskId =
      typeof body?.taskId ===
      "string"
        ? body.taskId
        : "";

    const decision =
      body?.decision;

    if (
      !taskId.trim() ||
      !isDecision(
        decision,
      )
    ) {
      return response(
        {
          success: false,
          code:
            "C147_15_HUMAN_REVIEW_INSUFFICIENT",
          error:
            "taskId and an explicit human decision are required.",
          identity: {
            userId:
              identity.userId,
            isolated: true,
          },
        },
        400,
      );
    }

    const result =
      await runWithUserContext(
        identity.userId,
        () =>
          runMarketHumanReview(
            {
              taskId,
              decision,
              reviewerNote:
                typeof body?.reviewerNote ===
                "string"
                  ? body.reviewerNote
                  : null,
            },
          ),
      );

    return response(
      {
        ...result,
        identity: {
          userId:
            identity.userId,
          isolated: true,
        },
      },
      result.success
        ? 200
        : result.code ===
            "C147_15_HUMAN_REVIEW_TASK_NOT_FOUND"
          ? 404
          : result.code ===
              "C147_15_HUMAN_REVIEW_ALREADY_RECORDED"
            ? 409
            : 422,
    );
  } catch (error) {
    return response(
      {
        success: false,
        code:
          "C147_15_HUMAN_REVIEW_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Human review failed.",
        identity: {
          userId:
            identity.userId,
          isolated: true,
        },
      },
      500,
    );
  }
}
