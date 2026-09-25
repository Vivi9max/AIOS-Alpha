import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketOperatingSystem,
} from "@/lib/runtime/market/market-operating-system-runtime";

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
        error:
          "Founder authentication required.",
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
            "C155_MARKET_OS_UNIVERSE_REQUIRED",
          error:
            "At least one valid market instrument is required.",
        },
        {
          status: 400,
        },
      );
    }

    const result =
      await runMarketOperatingSystem({
        universe,

        query:
          typeof body.query ===
          "string"
            ? body.query
            : null,

        includeMonitoring:
          body.includeMonitoring !==
          false,

        includeBlocked:
          body.includeBlocked !==
          false,
      });

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
          "C155_MARKET_OS_RUNTIME_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Market Operating System runtime failed.",
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
        error:
          "Founder authentication required.",
      },
      {
        status: 401,
      },
    );
  }

  return NextResponse.json({
    success: true,
    verified: true,
    code:
      "C155_MARKET_OS_BOUNDARY_READY",

    runtime:
      "market-operating-system",

    version:
      "C155.1",

    upstream: [
      "C154.1",
      "C147.6",
      "C147.13",
      "C147.12",
    ],

    capabilities: [
      "continuous-market-monitoring",
      "change-detection",
      "evidence-organization",
      "evidence-verification",
      "research-organization",
      "human-decision-support",
    ],

    prohibitedActions: [
      "buy",
      "sell",
      "hold",
      "target-price",
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

    tradingExecuted:
      false,

    humanDecisionRequired:
      true,
  });
}
