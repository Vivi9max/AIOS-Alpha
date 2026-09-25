import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketRadarRuntime,
} from "@/lib/runtime/market/market-radar-runtime";

import type {
  MarketRegion,
} from "@/lib/runtime/market/market-types";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function responseHeaders() {
  return {
    "cache-control":
      "no-store",

    "content-type":
      "application/json; charset=utf-8",
  };
}

function unauthorized() {
  return NextResponse.json(
    {
      success: false,

      verified: false,

      code:
        "FOUNDER_AUTH_REQUIRED",

      message:
        "Founder authentication is required.",
    },
    {
      status: 401,

      headers:
        responseHeaders(),
    },
  );
}

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
  const startedAt =
    Date.now();

  if (
    !isFounderRequest(
      request,
    )
  ) {
    return unauthorized();
  }

  let body: unknown;

  try {
    body =
      await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,

        code:
          "C154_MARKET_RADAR_INVALID_JSON",

        message:
          "Request body must be valid JSON.",
      },
      {
        status: 400,

        headers:
          responseHeaders(),
      },
    );
  }

  if (
    !body ||
    typeof body !==
      "object"
  ) {
    return NextResponse.json(
      {
        success: false,

        code:
          "C154_MARKET_RADAR_INVALID_REQUEST",

        message:
          "Request body must be an object.",
      },
      {
        status: 400,

        headers:
          responseHeaders(),
      },
    );
  }

  const input =
    body as Record<
      string,
      unknown
    >;

  const universe =
    normalizeUniverse(
      input.universe,
    );

  if (
    universe.length === 0
  ) {
    return NextResponse.json(
      {
        success: false,

        code:
          "C154_MARKET_RADAR_UNIVERSE_REQUIRED",

        message:
          "At least one valid market instrument is required.",
      },
      {
        status: 400,

        headers:
          responseHeaders(),
      },
    );
  }

  try {
    const result =
      await runMarketRadarRuntime(
        {
          universe,

          query:
            typeof input.query ===
            "string"
              ? input.query
              : null,

          includeNoChange:
            input.includeNoChange !==
            false,

          includeNoHistory:
            input.includeNoHistory !==
            false,

          includeBlocked:
            input.includeBlocked !==
            false,
        },
      );

    return NextResponse.json(
      {
        ...result,

        latencyMs:
          Date.now() -
          startedAt,

        timestamp:
          new Date().toISOString(),
      },
      {
        status:
          result.success
            ? 200
            : 207,

        headers:
          responseHeaders(),
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        verified: false,

        code:
          "C154_MARKET_RADAR_RUNTIME_ERROR",

        message:
          "Market Radar runtime failed.",

        error:
          error instanceof Error
            ? error.message
            : "Unknown Market Radar error.",

        latencyMs:
          Date.now() -
          startedAt,

        timestamp:
          new Date().toISOString(),
      },
      {
        status: 500,

        headers:
          responseHeaders(),
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
    return unauthorized();
  }

  return NextResponse.json(
    {
      success: true,

      verified: true,

      code:
        "C154_MARKET_RADAR_BOUNDARY_READY",

      stage:
        "C154.1",

      runtime:
        "market-radar-runtime",

      upstream:
        "C147.13",

      capabilities: [
        "market-change-monitoring",
        "material-change-detection",
        "market-event-organization",
        "human-review-boundary",
      ],

      prohibitedActions: [
        "buy",
        "sell",
        "hold",
        "target-price",
        "automatic-trading",
        "planner-dispatch",
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

      disclaimer:
        "C154 is a market research monitoring layer, not an autonomous trading system.",
    },
    {
      headers:
        responseHeaders(),
    },
  );
}
