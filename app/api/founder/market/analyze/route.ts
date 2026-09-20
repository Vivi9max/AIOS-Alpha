import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  analyzeMarketRequest,
} from "@/lib/runtime/market/market-router";

import type {
  MarketAnalysisMode,
  MarketRegion,
} from "@/lib/runtime/market/market-types";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function headers() {
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
      headers: headers(),
    },
  );
}

function badRequest(
  message: string,
) {
  return NextResponse.json(
    {
      success: false,
      verified: false,
      code:
        "C147_1_INVALID_REQUEST",
      message,
    },
    {
      status: 400,
      headers: headers(),
    },
  );
}

function normalizeMarket(
  value: unknown,
): MarketRegion | undefined {
  if (
    value === "us" ||
    value === "hk" ||
    value === "cn"
  ) {
    return value;
  }

  return undefined;
}

function normalizeMode(
  value: unknown,
): MarketAnalysisMode {
  if (
    value === "research" ||
    value === "screen" ||
    value === "valuation" ||
    value === "technical" ||
    value === "full"
  ) {
    return value;
  }

  return "full";
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
    return badRequest(
      "Request body must be valid JSON.",
    );
  }

  if (
    !body ||
    typeof body !==
      "object"
  ) {
    return badRequest(
      "Request body must be an object.",
    );
  }

  const input =
    body as Record<
      string,
      unknown
    >;

  const symbol =
    typeof input.symbol ===
    "string"
      ? input.symbol.trim()
      : "";

  if (!symbol) {
    return badRequest(
      "symbol is required. Example: NVDA, 0700.HK, 600519.SH.",
    );
  }

  try {
    const result =
      await analyzeMarketRequest(
        {
          symbol,
          market:
            normalizeMarket(
              input.market,
            ),
          mode:
            normalizeMode(
              input.mode,
            ),
          query:
            typeof input.query ===
            "string"
              ? input.query
              : null,
        },
      );

    return NextResponse.json(
      {
        ...result,
        latencyMs:
          Date.now() -
          startedAt,
        timestamp:
          Date.now(),
      },
      {
        status: 200,
        headers: headers(),
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        verified: false,
        code:
          "C147_1_MARKET_ANALYSIS_ERROR",
        message:
          "Market analysis failed.",
        error:
          error instanceof Error
            ? error.message
            : "Unknown market analysis error.",
        latencyMs:
          Date.now() -
          startedAt,
        timestamp:
          Date.now(),
      },
      {
        status: 500,
        headers: headers(),
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

  const symbol =
    request.nextUrl.searchParams
      .get("symbol")
      ?.trim();

  if (!symbol) {
    return badRequest(
      "symbol query parameter is required.",
    );
  }

  const market =
    normalizeMarket(
      request.nextUrl.searchParams.get(
        "market",
      ),
    );

  const mode =
    normalizeMode(
      request.nextUrl.searchParams.get(
        "mode",
      ),
    );

  try {
    const result =
      await analyzeMarketRequest(
        {
          symbol,
          market,
          mode,
        },
      );

    return NextResponse.json(
      {
        ...result,
        timestamp:
          Date.now(),
      },
      {
        status: 200,
        headers: headers(),
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        verified: false,
        code:
          "C147_1_MARKET_ANALYSIS_ERROR",
        message:
          "Market analysis failed.",
        error:
          error instanceof Error
            ? error.message
            : "Unknown market analysis error.",
        timestamp:
          Date.now(),
      },
      {
        status: 500,
        headers: headers(),
      },
    );
  }
}
