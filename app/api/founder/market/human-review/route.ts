import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  isFounderRequest,
} from "@/lib/founder/auth";
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
  const url =
    new URL(
      request.url,
    );
  const taskId =
    url.searchParams.get(
      "taskId",
    );
  if (!taskId) {
    return NextResponse.json(
      {
        success: true,
        code:
          "C147_15_HUMAN_REVIEW_READY",
        runtime:
          "market-human-review-runtime",
        version:
          "C147.15",
        upstream:
          "C147.14",
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
      },
    );
  }
  const review =
    await getMarketHumanReview(
      taskId,
    );
  return NextResponse.json(
    {
      success: true,
      code:
        review
          ? "C147_15_HUMAN_REVIEW_FOUND"
          : "C147_15_HUMAN_REVIEW_NOT_FOUND",
      taskId,
      review,
      humanDecisionRequired:
        true,
      automatedExecutionStarted:
        false,
      plannerDispatched:
        false,
      tradingExecuted:
        false,
    },
  );
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
      return NextResponse.json(
        {
          success: false,
          code:
            "C147_15_HUMAN_REVIEW_INSUFFICIENT",
          error:
            "taskId and an explicit human decision are required.",
        },
        {
          status: 400,
        },
      );
    }
    const result =
      await runMarketHumanReview(
        {
          taskId,
          decision,
          reviewerNote:
            typeof body?.reviewerNote ===
            "string"
              ? body.reviewerNote
              : null,
        },
      );
    return NextResponse.json(
      result,
      {
        status:
          result.success
            ? 200
            : result.code ===
                "C147_15_HUMAN_REVIEW_TASK_NOT_FOUND"
              ? 404
              : result.code ===
                  "C147_15_HUMAN_REVIEW_ALREADY_RECORDED"
                ? 409
                : 422,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        code:
          "C147_15_HUMAN_REVIEW_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Human review failed.",
      },
      {
        status: 500,
      },
    );
  }
}
