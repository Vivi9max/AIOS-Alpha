
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
  runWithUserContext,
} from "@/lib/runtime/request-context";

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
   * C167.5.51
   *
   * All user-scoped storage operations
   * must run inside the resolved user's
   * AsyncLocalStorage context.
   *
   * The client cannot provide:
   * - planId
   * - reportsThisMonth
   * - usage counters
   *
   * Real subscription/payment mapping
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
      await runWithUserContext(
        identity.userId,
        () =>
          getMarketResearchUsage(),
      );
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
     * Runtime execution and the successful
     * usage reservation share the same
     * resolved-user context.
     */
    const execution =
      await runWithUserContext(
        identity.userId,
        async () => {
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
           * Count a report only after
           * successful Research Runtime
           * completion.
           *
           * Failed runtime calls do not
           * consume a monthly report.
           */
          const usageAfterSuccess =
            result.success
              ? await reserveMarketResearchReport()
              : usage;

          return {
            result,
            usageAfterSuccess,
          };
        },
      );

    const result =
      execution.result;

    const usageAfterSuccess =
      execution.usageAfterSuccess;

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
           * Expose only product-facing
           * quota information.
           * Never expose internal identity
           * or storage keys.
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
     * Retain the identity cookie for
     * user-scoped billing and usage.
     * Never return the internal userId
     * in the public response.
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
