import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketDecisionWorkspace,
} from "@/lib/runtime/market/market-decision-workspace-runtime";

import {
  runMarketDecisionWorkspaceRegression,
} from "@/lib/runtime/market/market-decision-workspace-regression";

import type {
  MarketRegion,
} from "@/lib/runtime/market/market-types";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function normalizeMarket(
  value: unknown,
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

function normalizeUniverse(
  value: unknown,
) {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value
    .map((item) => {
      if (
        !item ||
        typeof item !==
          "object"
      ) {
        return null;
      }

      const record =
        item as Record<
          string,
          unknown
        >;

      const symbol =
        typeof record.symbol ===
        "string"
          ? record.symbol
              .trim()
              .toUpperCase()
          : "";

      const market =
        normalizeMarket(
          record.market,
        );

      if (
        !symbol ||
        !market
      ) {
        return null;
      }

      return {
        symbol,
        market,
      };
    })
    .filter(
      (
        item,
      ): item is {
        symbol: string;
        market: MarketRegion;
      } =>
        Boolean(item),
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
    return NextResponse.json(
      {
        success: false,
        verified: false,
        code:
          "FOUNDER_AUTH_REQUIRED",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const body =
      (await request.json()) as Record<
        string,
        unknown
      >;

    const universe =
      normalizeUniverse(
        body.universe,
      );

    if (
      universe.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          code:
            "C157_DECISION_WORKSPACE_UNIVERSE_REQUIRED",
          error:
            "At least one valid market instrument is required.",
        },
        {
          status: 400,
        },
      );
    }

    const result =
      await runMarketDecisionWorkspace(
        {
          universe,
          query:
            typeof body.query ===
            "string"
              ? body.query
              : null,
        },
      );

    return NextResponse.json(
      result,
      {
        status:
          result.success
            ? 200
            : 207,
        headers: {
          "cache-control":
            "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        verified: false,
        code:
          "C157_DECISION_WORKSPACE_RUNTIME_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Decision Workspace runtime failed.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function GET(
  request: NextRequest,
) {
  if (
    !isFounderRequest(
      request,
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        verified: false,
        code:
          "FOUNDER_AUTH_REQUIRED",
      },
      {
        status: 401,
      },
    );
  }

  if (
    request.nextUrl.searchParams.get(
      "regression",
    ) === "true"
  ) {
    return NextResponse.json(
      await runMarketDecisionWorkspaceRegression(),
      {
        headers: {
          "cache-control":
            "no-store",
        },
      },
    );
  }

  return NextResponse.json({
    success: true,
    verified: true,

    code:
      "C157_MARKET_DECISION_WORKSPACE_BOUNDARY_READY",

    runtime:
      "market-decision-workspace",

    version:
      "C157.1",

    upstream: [
      "C156.1",
      "C155.1",
      "C147.6",
      "C149",
      "C147.17",
    ],

    capabilities: [
      "research-review",
      "decision-questions",
      "evidence-gap-analysis",
      "risk-invalidation-review",
      "human-decision-support",
    ],

    prohibitedActions: [
      "buy",
      "sell",
      "hold",
      "target-price",
      "ranking",
      "recommendation",
      "decision-recording",
      "automatic-trading",
      "planner-dispatch",
      "task-creation",
    ],

    mutationPerformed:
      false,

    taskCreated:
      false,

    plannerDispatched:
      false,

    decisionRecorded:
      false,

    recommendationGenerated:
      false,

    tradingExecuted:
      false,

    humanDecisionRequired:
      true,
  });
}
