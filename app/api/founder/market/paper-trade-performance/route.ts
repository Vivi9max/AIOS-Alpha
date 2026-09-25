import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketPaperTradePerformanceReview,
} from "@/lib/runtime/market/market-paper-trade-performance-runtime";

import {
  runMarketPaperTradePerformanceRegression,
} from "@/lib/runtime/market/market-paper-trade-performance-regression";

import type {
  MarketRegion,
} from "@/lib/runtime/market/market-types";

import type {
  PaperTradingResult,
} from "@/lib/runtime/market/paper-trading-types";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function isObject(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value,
    )
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

function isPaperTradingResult(
  value: unknown,
): value is PaperTradingResult {
  if (
    !isObject(value)
  ) {
    return false;
  }

  return (
    typeof value.success ===
      "boolean" &&
    typeof value.code ===
      "string" &&
    value.stage ===
      "C151" &&
    isObject(
      value.metrics,
    ) &&
    Array.isArray(
      value.candidates,
    ) &&
    Array.isArray(
      value.equityCurve,
    )
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
        success:
          false,

        code:
          "FOUNDER_AUTH_REQUIRED",
      },
      {
        status:
          401,
      },
    );
  }

  let body: unknown;

  try {
    body =
      await request.json();
  } catch {
    return NextResponse.json(
      {
        success:
          false,

        code:
          "C159_INVALID_REQUEST",

        error:
          "Request body must be valid JSON.",
      },
      {
        status:
          400,
      },
    );
  }

  if (
    !isObject(body)
  ) {
    return NextResponse.json(
      {
        success:
          false,

        code:
          "C159_INVALID_REQUEST",

        error:
          "Request body must be an object.",
      },
      {
        status:
          400,
      },
    );
  }

  const symbol =
    typeof body.symbol ===
    "string"
      ? body.symbol
          .trim()
          .toUpperCase()
      : "";

  const market =
    normalizeMarket(
      body.market,
    );

  const paperTrading =
    body.paperTrading;

  if (
    !symbol ||
    !market ||
    !isPaperTradingResult(
      paperTrading,
    )
  ) {
    return NextResponse.json(
      {
        success:
          false,

        code:
          "C159_INVALID_REQUEST",

        error:
          "symbol, market and a valid C151 paperTrading result are required.",
      },
      {
        status:
          400,
      },
    );
  }

  try {
    const result =
      await runMarketPaperTradePerformanceReview({
        symbol,

        market,

        paperTrading,

        query:
          typeof body.query ===
          "string"
            ? body.query
            : null,
      });

    return NextResponse.json(
      result,
      {
        status:
          result.success
            ? 200
            : 422,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success:
          false,

        code:
          "C159_MARKET_PAPER_TRADE_PERFORMANCE_ERROR",

        error:
          error instanceof Error
            ? error.message
            : "C159 performance review failed.",

        boundary: {
          humanDecisionRequired:
            true,

          decisionAutomaticallyGenerated:
            false,

          taskCreated:
            false,

          plannerDispatched:
            false,

          brokerConnected:
            false,

          liveOrderPlaced:
            false,

          tradingExecuted:
            false,
        },
      },
      {
        status:
          500,
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
        success:
          false,

        code:
          "FOUNDER_AUTH_REQUIRED",
      },
      {
        status:
          401,
      },
    );
  }

  if (
    request.nextUrl.searchParams.get(
      "regression",
    ) === "true"
  ) {
    return NextResponse.json(
      await runMarketPaperTradePerformanceRegression(),
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }

  return NextResponse.json({
    success:
      true,

    code:
      "C159_MARKET_PAPER_TRADE_PERFORMANCE_READY",

    runtime:
      "market-paper-trade-performance",

    version:
      "C159.1",

    upstream: {
      decisionWorkspace:
        "C157.1",

      paperTradeGate:
        "C158",

      paperTrading:
        "C151",

      liveTradingBoundary:
        "C152",
    },

    requirements: [
      "valid-C151-paper-trading-result",
      "historical-simulation-review",
    ],

    boundaries: {
      recommendationGenerated:
        false,

      decisionAutomaticallyGenerated:
        false,

      taskCreated:
        false,

      plannerDispatched:
        false,

      brokerConnected:
        false,

      liveOrderPlaced:
        false,

      tradingExecuted:
        false,
    },

    humanDecisionRequired:
      true,
  });
}
