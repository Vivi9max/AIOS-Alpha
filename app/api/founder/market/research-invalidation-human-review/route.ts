import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  decideMarketResearchInvalidationHumanReview,
  runMarketResearchInvalidationHumanReview,
} from "@/lib/runtime/market/market-research-invalidation-human-review-runtime";

import {
  runMarketResearchInvalidationHumanReviewRegression,
} from "@/lib/runtime/market/market-research-invalidation-human-review-regression";

import type {
  MarketResearchInvalidationHumanReviewDecision,
} from "@/lib/runtime/market/market-research-invalidation-human-review-types";

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

function validDecision(
  value: unknown,
): value is MarketResearchInvalidationHumanReviewDecision {
  return (
    value ===
      "accept-current-research" ||
    value ===
      "invalidate-current-research" ||
    value ===
      "request-research-update"
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

  if (
    url.searchParams.get(
      "regression",
    ) === "true"
  ) {
    return NextResponse.json(
      await runMarketResearchInvalidationHumanReviewRegression(),
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }

  const ledgerId =
    url.searchParams.get(
      "ledgerId",
    )?.trim();

  if (!ledgerId) {
    return NextResponse.json(
      {
        success: false,

        code:
          "C161_3_RESEARCH_INVALIDATION_HUMAN_REVIEW_INSUFFICIENT",

        error:
          "ledgerId is required.",
      },
      {
        status: 400,
      },
    );
  }

  return NextResponse.json(
    await runMarketResearchInvalidationHumanReview({
      ledgerId,
    }),
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
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

  let body:
    | {
        ledgerId?: unknown;
        decision?: unknown;
        rationale?: unknown;
      }
    | null = null;

  try {
    body =
      await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,

        code:
          "C161_3_RESEARCH_INVALIDATION_HUMAN_REVIEW_INSUFFICIENT",

        error:
          "Invalid JSON request body.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    typeof body?.ledgerId !==
    "string"
  ) {
    return NextResponse.json(
      {
        success: false,

        code:
          "C161_3_RESEARCH_INVALIDATION_HUMAN_REVIEW_INSUFFICIENT",

        error:
          "ledgerId is required.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    !validDecision(
      body.decision,
    )
  ) {
    return NextResponse.json(
      {
        success: false,

        code:
          "C161_3_RESEARCH_INVALIDATION_HUMAN_REVIEW_INSUFFICIENT",

        error:
          "An explicit human review decision is required.",
      },
      {
        status: 400,
      },
    );
  }

  const result =
    await decideMarketResearchInvalidationHumanReview({
      ledgerId:
        body.ledgerId,

      decision:
        body.decision,

      rationale:
        typeof body.rationale ===
        "string"
          ? body.rationale
          : null,
    });

  return NextResponse.json(
    result,
    {
      status:
        result.success
          ? 200
          : 404,

      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}
