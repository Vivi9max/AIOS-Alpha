import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireFounderAccess,
} from "@/lib/auth/founder";

import {
  paperTradeMarket,
} from "@/lib/runtime/market/paper-trading-engine";

import type {
  MarketBar,
  MarketRegion,
} from "@/lib/runtime/market/market-types";

import type {
  PaperOrderSide,
  PaperTradingCandidateInput,
  PaperTradingOrderInput,
} from "@/lib/runtime/market/paper-trading-types";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function normalizeMarket(
  value: unknown,
): MarketRegion | undefined {
  return value === "us" ||
    value === "hk" ||
    value === "cn"
    ? value
    : undefined;
}

function normalizeBars(
  value: unknown,
): MarketBar[] | null {
  if (
    !Array.isArray(value)
  ) {
    return null;
  }

  const bars: MarketBar[] =
    [];

  for (
    const item of value
  ) {
    if (
      !item ||
      typeof item !==
        "object"
    ) {
      continue;
    }

    const bar =
      item as Record<
        string,
        unknown
      >;

    if (
      typeof bar.timestamp !==
        "string" ||
      bar.timestamp.trim()
        .length === 0
    ) {
      continue;
    }

    const numeric = (
      key:
        | "open"
        | "high"
        | "low"
        | "close"
        | "volume",
    ): number | null => {
      const value =
        bar[key];

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
    };

    const close =
      numeric("close");

    if (
      close === null ||
      close <= 0
    ) {
      continue;
    }

    bars.push({
      timestamp:
        bar.timestamp,

      open:
        numeric("open"),

      high:
        numeric("high"),

      low:
        numeric("low"),

      close,

      volume:
        numeric("volume"),
    });
  }

  return bars.length > 0
    ? bars
    : null;
}

function isObject(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    Boolean(value) &&
    typeof value ===
      "object" &&
    !Array.isArray(value)
  );
}

function normalizeCandidates(
  value: unknown,
): PaperTradingCandidateInput[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value
    .filter(
      (item) =>
        isObject(item) &&
        typeof item.symbol ===
          "string" &&
        item.symbol.trim()
          .length > 0,
    )
    .map(
      (item) => ({
        symbol:
          String(
            item.symbol,
          )
            .trim()
            .toUpperCase(),

        market:
          normalizeMarket(
            item.market,
          ),

        name:
          typeof item.name ===
            "string"
            ? item.name.trim()
            : null,
      }),
    );
}

function normalizeOrders(
  value: unknown,
): PaperTradingOrderInput[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value
    .filter(
      (item) =>
        isObject(item) &&
        typeof item.symbol ===
          "string" &&
        item.symbol.trim()
          .length > 0 &&
        (
          item.side ===
            "buy" ||
          item.side ===
            "sell"
        ) &&
        typeof item.quantity ===
          "number" &&
        Number.isFinite(
          item.quantity,
        ) &&
        item.quantity > 0,
    )
    .map(
      (item) => {
        const side: PaperOrderSide =
          item.side ===
          "sell"
            ? "sell"
            : "buy";

        return {
          symbol:
            String(
              item.symbol,
            )
              .trim()
              .toUpperCase(),

          market:
            normalizeMarket(
              item.market,
            ),

          side,

          quantity:
            item.quantity as number,

          price:
            typeof item.price ===
              "number" &&
            Number.isFinite(
              item.price,
            ) &&
            item.price > 0
              ? item.price
              : null,

          timestamp:
            typeof item.timestamp ===
              "string"
              ? item.timestamp
              : null,

          reason:
            typeof item.reason ===
              "string"
              ? item.reason.trim()
              : null,
        };
      },
    );
}

export async function POST(
  request: NextRequest,
) {
  const access =
    requireFounderAccess(
      request,
    );

  if (
    !access.authorized
  ) {
    return access.response;
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
          "C151_INVALID_REQUEST",

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
          "C151_INVALID_REQUEST",

        error:
          "Request body must be an object.",
      },
      {
        status: 400,
      },
    );
  }

  const candidates =
    normalizeCandidates(
      body.candidates,
    );

  const orders =
    normalizeOrders(
      body.orders,
    );

  if (
    orders.length ===
      0
  ) {
    return NextResponse.json(
      {
        success: false,

        code:
          "C151_INVALID_REQUEST",

        error:
          "orders must contain at least one valid paper-trading order.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    orders.length >
    100
  ) {
    return NextResponse.json(
      {
        success: false,

        code:
          "C151_INVALID_REQUEST",

        error:
          "orders cannot contain more than 100 items.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    candidates.length >
    20
  ) {
    return NextResponse.json(
      {
        success: false,

        code:
          "C151_INVALID_REQUEST",

        error:
          "candidates cannot contain more than 20 items.",
      },
      {
        status: 400,
      },
    );
  }

  const rawInitialCapital =
    body.initialCapital;

  const initialCapital =
    typeof rawInitialCapital ===
      "number" &&
    Number.isFinite(
      rawInitialCapital,
    ) &&
    rawInitialCapital > 0
      ? rawInitialCapital
      : 100000;

  const rawFeeBps =
    body.feeBps;

  const feeBps =
    typeof rawFeeBps ===
      "number" &&
    Number.isFinite(
      rawFeeBps,
    ) &&
    rawFeeBps >= 0
      ? rawFeeBps
      : 5;

  const rawSlippageBps =
    body.slippageBps;

  const slippageBps =
    typeof rawSlippageBps ===
      "number" &&
    Number.isFinite(
      rawSlippageBps,
    ) &&
    rawSlippageBps >= 0
      ? rawSlippageBps
      : 5;

  const bars =
    normalizeBars(
      body.bars,
    );

  try {
    const result =
      await paperTradeMarket({
        candidates,

        orders,

        initialCapital,

        feeBps,

        slippageBps,

        query:
          typeof body.query ===
            "string"
            ? body.query
            : null,

        bars,
      });

    return NextResponse.json(
      {
        ...result,

        publicBoundary:
          "FOUNDER_ONLY_C151",

        safetyBoundary: {
          founderAuthRequired:
            true,

          simulationOnly:
            true,

          brokerConnected:
            false,

          tradingExecuted:
            false,

          liveOrderPlaced:
            false,

          plannerDispatched:
            false,

          humanReviewRequiredBeforeLiveTrading:
            true,
        },
      },
      {
        status:
          result.success
            ? 200
            : 422,

        headers: {
          "Cache-Control":
            "no-store",

          "Content-Type":
            "application/json; charset=utf-8",
        },
      },
    );
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        success: false,

        code:
          "C151_PAPER_TRADING_ERROR",

        stage:
          "C151",

        error:
          error instanceof Error
            ? error.message
            : "Paper trading engine failed.",

        safetyBoundary: {
          founderAuthRequired:
            true,

          simulationOnly:
            true,

          brokerConnected:
            false,

          tradingExecuted:
            false,

          liveOrderPlaced:
            false,

          plannerDispatched:
            false,
        },
      },
      {
        status: 500,
      },
    );
  }
}
