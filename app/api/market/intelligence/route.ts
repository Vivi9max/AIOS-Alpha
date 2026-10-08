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

import {
  getMarketResearchUsage,
  reserveMarketResearchReport,
} from "@/lib/billing/market-research-usage";

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

function marketResearchLimitResponse(
  identityUserId: string,
  usage: Awaited<
    ReturnType<
      typeof getMarketResearchUsage
    >
  >,
) {
  const response =
    NextResponse.json(
      {
        success: false,

        verified: false,

        code:
          "MARKET_RESEARCH_LIMIT_REACHED",

        message:
          "The monthly market research report limit has been reached.",

        publicBoundary:
          "C147.21",

        dataIsolated:
          true,

        timestamp:
          Date.now(),
      },
      {
        status: 429,
        headers:
          headers(),
      },
    );

  return applyIdentityCookie(
    response,
    identityUserId,
  );
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

  /*
   * C167.5.49
   *
   * Market Research access is resolved
   * server-side from the current
   * user-scoped usage record.
   *
   * The client is deliberately not
   * allowed to provide:
   * - planId
   * - reportsThisMonth
   * - usage counters
   *
   * The current Alpha plan is resolved
   * by the billing usage layer because
   * real subscription/payment mapping
   * is not connected yet.
   */
  let usage:
    Awaited<
      ReturnType<
        typeof getMarketResearchUsage
      >
    >;

  try {
    usage =
      await getMarketResearchUsage();
  } catch {
    const response =
      NextResponse.json(
        {
          success: false,

          verified: false,

          code:
            "MARKET_RESEARCH_ACCESS_UNAVAILABLE",

          message:
            "Market Research access could not be verified.",

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
          status: 503,
          headers:
            headers(),
        },
      );

    return applyIdentityCookie(
      response,
      identity.userId,
    );
  }

  if (!usage.allowed) {
    return marketResearchLimitResponse(
      identity.userId,
      usage,
    );
  }

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

    /*
     * Market Research usage is counted
     * only after the Research Runtime
     * returns successfully.
     *
     * This prevents malformed requests
     * and failed runtime calls from
     * consuming a monthly report.
     */
    let usageAfterSuccess:
      Awaited<
        ReturnType<
          typeof reserveMarketResearchReport
        >
      >;

    if (result.success) {
      usageAfterSuccess =
        await reserveMarketResearchReport();
    } else {
      usageAfterSuccess =
        usage;
    }

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

          /*
           * Keep quota information minimal
           * and product-facing. Internal
           * identity and storage keys are
           * never exposed.
           */
          marketResearchUsage:
            result.success
              ? {
                  used:
                    usageAfterSuccess.used,
                  limit:
                    usageAfterSuccess.limit,
                  remaining:
                    usageAfterSuccess.remaining,
                }
              : undefined,
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
     * user-scoped billing/usage features,
     * but the internal userId is deliberately
     * NOT returned in the public response.
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
