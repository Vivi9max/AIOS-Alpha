import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  analyzeMarketRequest,
} from "@/lib/runtime/market/market-router";

import type {
  MarketRegion,
} from "@/lib/runtime/market/market-types";

import {
  AIOS_USER_COOKIE,
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function headers() {
  return {
    "Cache-Control":
      "no-store",
    "Content-Type":
      "application/json; charset=utf-8",
  };
}

function badRequest(
  message: string,
) {
  return NextResponse.json(
    {
      success: false,
      verified: false,
      code:
        "C147_21_INVALID_REQUEST",
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

function applyIdentityCookie(
  response: NextResponse,
  userId: string,
) {
  response.cookies.set(
    AIOS_USER_COOKIE,
    userId,
    {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
      path: "/",
      maxAge:
        60 * 60 * 24 * 365,
    },
  );

  return response;
}

export async function POST(
  request: NextRequest,
) {
  const startedAt =
    Date.now();

  const identity =
    resolveAlphaIdentity(
      request,
    );

  let body: unknown;

  try {
    body =
      await request.json();
  } catch {
    return applyIdentityCookie(
      badRequest(
        "Request body must be valid JSON.",
      ),
      identity.userId,
    );
  }

  if (
    !body ||
    typeof body !==
      "object"
  ) {
    return applyIdentityCookie(
      badRequest(
        "Request body must be an object.",
      ),
      identity.userId,
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
      ? input.symbol
          .trim()
          .toUpperCase()
      : "";

  if (!symbol) {
    return applyIdentityCookie(
      badRequest(
        "symbol is required.",
      ),
      identity.userId,
    );
  }

  if (symbol.length > 32) {
    return applyIdentityCookie(
      badRequest(
        "symbol is too long.",
      ),
      identity.userId,
    );
  }

  const market =
    normalizeMarket(
      input.market,
    );

  try {
    /*
     * C147.21 public runtime boundary.
     *
     * Public requests may:
     * - research a security
     * - retrieve external evidence
     * - analyze evidence
     * - expose verification/freshness metadata
     *
     * Public requests may not:
     * - use Founder authentication
     * - create human-review Tasks
     * - persist market decisions
     * - dispatch Planner
     * - execute trading
     *
     * The public route reuses the existing
     * read-only Market Runtime.
     */
    const result =
      await analyzeMarketRequest({
        symbol,
        market,
        mode: "full",
        query:
          typeof input.query ===
          "string"
            ? input.query
            : null,
      });

    const response =
      NextResponse.json(
        {
          ...result,

          publicBoundary:
            "C147.21",

          dataIsolated:
            true,

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
              : 502,

          headers:
            headers(),
        },
      );

    /*
     * The identity cookie is retained for
     * future user-scoped features, but the
     * internal userId is deliberately NOT
     * returned in the public response.
     */
    return applyIdentityCookie(
      response,
      identity.userId,
    );
  } catch (error) {
    const response =
      NextResponse.json(
        {
          success: false,

          verified: false,

          code:
            "C147_21_MARKET_INTELLIGENCE_ERROR",

          message:
            "Market Intelligence is temporarily unavailable.",

          error:
            error instanceof Error
              ? error.message
              : "Unknown market intelligence error.",

          publicBoundary:
            "C147.21",

          dataIsolated:
            true,

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

    return applyIdentityCookie(
      response,
      identity.userId,
    );
  }
}
