import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketPaperTradeGate,
} from "@/lib/runtime/market/market-paper-trade-gate-runtime";

import {
  runMarketPaperTradeGateRegression,
} from "@/lib/runtime/market/market-paper-trade-gate-regression";

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

function normalizeNumber(
  value: unknown,
): number | null {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value,
    )
  ) {
    return null;
  }

  return value;
}

function optionalNumber(
  value: unknown,
): number | undefined {
  const normalized =
    normalizeNumber(
      value,
    );

  return normalized ===
    null
    ? undefined
    : normalized;
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

        code:
          "FOUNDER_AUTH_REQUIRED",
      },
      {
        status: 401,
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
        success: false,

        code:
          "C158_INVALID_REQUEST",

        error:
          "Request body must be valid JSON.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    !isObject(body)
  ) {
    return NextResponse.json(
      {
        success: false,

        code:
          "C158_INVALID_REQUEST",

        error:
          "Request body must be an object.",
      },
      {
        status: 400,
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

  const order =
    isObject(
      body.order,
    )
      ? body.order
      : null;

  if (
    !symbol ||
    !market ||
    !order
  ) {
    return NextResponse.json(
      {
        success: false,

        code:
          "C158_INVALID_REQUEST",

        error:
          "symbol, market and order are required.",
      },
      {
        status: 400,
      },
    );
  }

  const orderSymbol =
    typeof order.symbol ===
    "string"
      ? order.symbol
          .trim()
          .toUpperCase()
      : symbol;

  const orderMarket =
    normalizeMarket(
      order.market,
    );

  const side =
    order.side ===
      "sell"
      ? "sell"
      : order.side ===
          "buy"
        ? "buy"
        : null;

  const quantity =
    normalizeNumber(
      order.quantity,
    );

  if (
    !side ||
    !orderMarket ||
    quantity ===
      null ||
    quantity <= 0
  ) {
    return NextResponse.json(
      {
        success: false,

        code:
          "C158_INVALID_REQUEST",

        error:
          "order must contain a valid market, side and positive quantity.",
      },
      {
        status: 400,
      },
    );
  }

  const rawPrice =
    normalizeNumber(
      order.price,
    );

  /*
   * C158 request types use optional numbers:
   * number | undefined.
   *
   * normalizeNumber intentionally returns
   * number | null for validation, therefore
   * convert null to undefined before passing
   * the request into the C158 runtime.
   */
  const initialCapital =
    optionalNumber(
      body.initialCapital,
    );

  const feeBps =
    optionalNumber(
      body.feeBps,
    );

  const slippageBps =
    optionalNumber(
      body.slippageBps,
    );

  try {
    const result =
      await runMarketPaperTradeGate({
        symbol,

        market,

        humanDecisionConfirmed:
          body.humanDecisionConfirmed ===
          true,

        order: {
          symbol:
            orderSymbol,

          market:
            orderMarket,

          side,

          quantity,

          price:
            rawPrice,

          timestamp:
            typeof order.timestamp ===
            "string"
              ? order.timestamp
              : null,

          reason:
            typeof order.reason ===
            "string"
              ? order.reason
              : null,
        },

        initialCapital,

        feeBps,

        slippageBps,

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
        success: false,

        code:
          "C158_MARKET_PAPER_TRADE_GATE_ERROR",

        error:
          error instanceof Error
            ? error.message
            : "C158 Paper Trade Gate failed.",

        boundary: {
          humanDecisionRequired:
            true,

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
      await runMarketPaperTradeGateRegression(),
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
      "C158_MARKET_PAPER_TRADE_GATE_READY",

    runtime:
      "market-paper-trade-gate",

    version:
      "C158.1",

    upstream: {
      decisionWorkspace:
        "C157.1",

      paperTrading:
        "C151",

      liveTradingBoundary:
        "C152",
    },

    requirements: [
      "explicit-human-decision-confirmation",
      "matching-decision-workspace",
      "valid-paper-order",
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
