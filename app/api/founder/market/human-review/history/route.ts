import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketHumanReviewHistory,
} from "@/lib/runtime/market/market-human-review-history-runtime";

import type {
  MarketHumanReviewDecision,
} from "@/lib/runtime/market/market-human-review-types";

import type {
  MarketRegion,
} from "@/lib/runtime/market/market-types";

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

function parseMarket(
  value: string | null,
): MarketRegion | null {
  if (
    value === "us" ||
    value === "hk" ||
    value === "cn" ||
    value === "jp" ||
    value === "global"
  ) {
    return value;
  }

  return null;
}

function parseDecision(
  value: string | null,
): MarketHumanReviewDecision | null {
  if (
    value ===
      "acknowledged" ||
    value ===
      "accepted" ||
    value ===
      "rejected" ||
    value ===
      "deferred"
  ) {
    return value;
  }

  return null;
}

function parseLimit(
  value: string | null,
): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    return undefined;
  }

  return Math.floor(
    parsed,
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

  try {
    const url =
      new URL(
        request.url,
      );

    const symbol =
      url.searchParams.get(
        "symbol",
      );

    const marketValue =
      url.searchParams.get(
        "market",
      );

    const decisionValue =
      url.searchParams.get(
        "decision",
      );

    const limit =
      parseLimit(
        url.searchParams.get(
          "limit",
        ),
      );

    const includeNotes =
      url.searchParams.get(
        "includeNotes",
      ) ===
      "true";

    if (
      marketValue &&
      !parseMarket(
        marketValue,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          code:
            "C147_16_HUMAN_REVIEW_HISTORY_INSUFFICIENT",

          error:
            "Unsupported market.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      decisionValue &&
      !parseDecision(
        decisionValue,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          code:
            "C147_16_HUMAN_REVIEW_HISTORY_INSUFFICIENT",

          error:
            "Unsupported review decision.",
        },
        {
          status: 400,
        },
      );
    }

    const result =
      await runMarketHumanReviewHistory(
        {
          symbol,
          market:
            parseMarket(
              marketValue,
            ),
          decision:
            parseDecision(
              decisionValue,
            ),
          limit,
          includeNotes,
        },
      );

    return NextResponse.json(
      result,
      {
        status:
          result.code ===
          "C147_16_HUMAN_REVIEW_HISTORY_INSUFFICIENT"
            ? 400
            : 200,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        code:
          "C147_16_HUMAN_REVIEW_HISTORY_ERROR",

        error:
          error instanceof Error
            ? error.message
            : "Human review history query failed.",
      },
      {
        status: 500,
      },
    );
  }
}
