import { NextRequest, NextResponse } from "next/server";
import { isFounderRequest } from "@/lib/founder/auth";
import {
  runMarketHumanReviewHistory,
} from "@/lib/runtime/market/market-human-review-history-runtime";
import type {
  MarketHumanReviewHistoryRequest,
} from "@/lib/runtime/market/market-human-review-history-types";
import type {
  MarketHumanReviewDecision,
} from "@/lib/runtime/market/market-human-review-types";
import type {
  MarketRegion,
} from "@/lib/runtime/market/market-types";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
function parseMarket(
  value: string | null,
): MarketRegion | null {
  if (
    value === "us" ||
    value === "hk" ||
    value === "cn"
  ) {
    return value;
  }
  return null;
}
function parseDecision(
  value: string | null,
): MarketHumanReviewDecision | null {
  if (
    value === "acknowledged" ||
    value === "accepted" ||
    value === "rejected" ||
    value === "deferred"
  ) {
    return value;
  }
  return null;
}
function parseLimit(
  value: string | null,
): number {
  if (!value) {
    return 20;
  }
  const parsed =
    Number(value);
  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    return 20;
  }
  return Math.min(
    100,
    Math.max(
      1,
      Math.floor(
        parsed,
      ),
    ),
  );
}
function parseIncludeNotes(
  value: string | null,
): boolean {
  return (
    value === "true" ||
    value === "1"
  );
}
export async function GET(
  request: NextRequest,
) {
  const startedAt =
    Date.now();
  try {
    if (
      !isFounderRequest(
        request,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          code:
            "FOUNDER_AUTH_REQUIRED",
          error:
            "Founder access required.",
        },
        {
          status: 401,
        },
      );
    }
    const {
      searchParams,
    } =
      new URL(
        request.url,
      );
    const symbol =
      searchParams
        .get("symbol")
        ?.trim() ||
      null;
    const market =
      parseMarket(
        searchParams.get(
          "market",
        ),
      );
    const decision =
      parseDecision(
        searchParams.get(
          "decision",
        ),
      );
    const limit =
      parseLimit(
        searchParams.get(
          "limit",
        ),
      );
    const includeNotes =
      parseIncludeNotes(
        searchParams.get(
          "includeNotes",
        ),
      );
    const marketParam =
      searchParams.get(
        "market",
      );
    const decisionParam =
      searchParams.get(
        "decision",
      );
    if (
      marketParam !== null &&
      market === null
    ) {
      return NextResponse.json(
        {
          success: false,
          code:
            "C147_16_INVALID_MARKET",
          error:
            "Invalid market. Supported markets are: us, hk, cn.",
          runtime: {
            name:
              "market-human-review-history-route",
            version:
              "C147.16",
            latencyMs:
              Date.now() -
              startedAt,
          },
        },
        {
          status: 422,
        },
      );
    }
    if (
      decisionParam !== null &&
      decision === null
    ) {
      return NextResponse.json(
        {
          success: false,
          code:
            "C147_16_INVALID_DECISION",
          error:
            "Invalid decision. Supported decisions are: acknowledged, accepted, rejected, deferred.",
          runtime: {
            name:
              "market-human-review-history-route",
            version:
              "C147.16",
            latencyMs:
              Date.now() -
              startedAt,
          },
        },
        {
          status: 422,
        },
      );
    }
    const query:
      MarketHumanReviewHistoryRequest =
      {
        symbol,
        market,
        decision,
        limit,
        includeNotes,
      };
    const result =
      await runMarketHumanReviewHistory(
        query,
      );
    return NextResponse.json(
      {
        ...result,
        runtime: {
          ...result.runtime,
          latencyMs:
            Date.now() -
            startedAt,
        },
      },
      {
        status:
          result.success
            ? 200
            : 422,
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
            : "Unknown human review history error.",
        runtime: {
          name:
            "market-human-review-history-route",
          version:
            "C147.16",
          latencyMs:
            Date.now() -
            startedAt,
        },
      },
      {
        status: 500,
      },
    );
  }
}
