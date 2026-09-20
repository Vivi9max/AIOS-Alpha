import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketIntelligenceRuntime,
} from "@/lib/runtime/market/market-intelligence-runtime";

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
      headers:
        headers(),
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

function normalizeMode(
  value: unknown,
): MarketAnalysisMode | null {
  if (
    value === "research" ||
    value === "screen" ||
    value === "valuation" ||
    value === "technical" ||
    value === "full"
  ) {
    return value;
  }

  return null;
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
          "C147_2_5_INVALID_JSON",
        message:
          "Request body must be valid JSON.",
      },
      {
        status: 400,
        headers:
          headers(),
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
          "C147_2_5_INVALID_REQUEST",
        message:
          "Request body must be an object.",
      },
      {
        status: 400,
        headers:
          headers(),
      },
    );
  }

  const input =
    body as Record<
      string,
      unknown
    >;

  const prompt =
    typeof input.prompt ===
    "string"
      ? input.prompt
      : null;

  const symbol =
    typeof input.symbol ===
    "string"
      ? input.symbol
      : null;

  const market =
    normalizeMarket(
      input.market,
    );

  const mode =
    normalizeMode(
      input.mode,
    );

  try {
    const result =
      await runMarketIntelligenceRuntime(
        {
          prompt,
          symbol,
          market,
          mode,
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
        status:
          result.success
            ? 200
            : 207,

        headers:
          headers(),
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        verified: false,

        code:
          "C147_2_5_RUNTIME_ERROR",

        message:
          "Market intelligence runtime failed.",

        error:
          error instanceof Error
            ? error.message
            : "Unknown market runtime error.",

        latencyMs:
          Date.now() -
          startedAt,

        timestamp:
          Date.now(),
      },
      {
        status: 500,
        headers:
          headers(),
      },
    );
  }
}

export async function GET(
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

  const symbol =
    request.nextUrl.searchParams
      .get("symbol");

  const prompt =
    request.nextUrl.searchParams
      .get("prompt");

  const market =
    normalizeMarket(
      request.nextUrl.searchParams
        .get("market"),
    );

  const mode =
    normalizeMode(
      request.nextUrl.searchParams
        .get("mode"),
    );

  if (
    !symbol &&
    !prompt
  ) {
    return NextResponse.json(
      {
        success: false,
        code:
          "C147_2_5_INPUT_REQUIRED",
        message:
          "symbol or prompt is required.",
      },
      {
        status: 400,
        headers:
          headers(),
      },
    );
  }

  try {
    const result =
      await runMarketIntelligenceRuntime(
        {
          prompt,
          symbol,
          market,
          mode,
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
        status:
          result.success
            ? 200
            : 207,

        headers:
          headers(),
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        verified: false,

        code:
          "C147_2_5_RUNTIME_ERROR",

        message:
          "Market intelligence runtime failed.",

        error:
          error instanceof Error
            ? error.message
            : "Unknown market runtime error.",

        latencyMs:
          Date.now() -
          startedAt,

        timestamp:
          Date.now(),
      },
      {
        status: 500,
        headers:
          headers(),
      },
    );
  }
}
