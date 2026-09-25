import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireFounderAccess,
} from "@/lib/auth/founder";

import {
  backtestMarketCandidates,
} from "@/lib/runtime/market/backtest-engine";

import type {
  MarketBar,
  MarketRegion,
} from "@/lib/runtime/market/market-types";

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

function isCandidate(
  value: unknown,
): boolean {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return false;
  }

  const candidate =
    value as Record<
      string,
      unknown
    >;

  return (
    typeof candidate.symbol ===
      "string" &&
    candidate.symbol
      .trim()
      .length > 0
  );
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

    const numeric =
      (
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
      numeric(
        "close",
      );

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
        numeric(
          "open",
        ),

      high:
        numeric(
          "high",
        ),

      low:
        numeric(
          "low",
        ),

      close,

      volume:
        numeric(
          "volume",
        ),
    });
  }

  return bars.length > 0
    ? bars
    : null;
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
          "C150_INVALID_REQUEST",
        error:
          "Request body must be valid JSON.",
      },
      {
        status: 400,
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
          "C150_INVALID_REQUEST",
        error:
          "Request body must be an object.",
      },
      {
        status: 400,
      },
    );
  }

  const input =
    body as Record<
      string,
      unknown
    >;

  const rawCandidates =
    Array.isArray(
      input.candidates,
    )
      ? input.candidates
      : [];

  if (
    rawCandidates.length ===
      0 ||
    rawCandidates.length >
      20
  ) {
    return NextResponse.json(
      {
        success: false,
        code:
          "C150_INVALID_REQUEST",
        error:
          "candidates must contain between 1 and 20 items.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    rawCandidates.some(
      (
        candidate,
      ) =>
        !isCandidate(
          candidate,
        ),
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        code:
          "C150_INVALID_REQUEST",
        error:
          "Each candidate must contain a non-empty symbol.",
      },
      {
        status: 400,
      },
    );
  }

  const candidates =
    rawCandidates.map(
      (
        candidate,
      ) => {
        const item =
          candidate as Record<
            string,
            unknown
          >;

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

          name:
            typeof item.name ===
            "string"
              ? item.name.trim()
              : null,
        };
      },
    );

  const rawBars =
    normalizeBars(
      input.bars,
    );

  const strategy =
    input.strategy ===
    "sma_crossover"
      ? "sma_crossover"
      : "sma_crossover";

  const initialCapital =
    typeof input.initialCapital ===
      "number" &&
    Number.isFinite(
      input.initialCapital,
    )
      ? input.initialCapital
      : 100000;

  const fastPeriod =
    typeof input.fastPeriod ===
      "number" &&
    Number.isFinite(
      input.fastPeriod,
    )
      ? input.fastPeriod
      : 5;

  const slowPeriod =
    typeof input.slowPeriod ===
      "number" &&
    Number.isFinite(
      input.slowPeriod,
    )
      ? input.slowPeriod
      : 20;

  const feeBps =
    typeof input.feeBps ===
      "number" &&
    Number.isFinite(
      input.feeBps,
    )
      ? input.feeBps
      : 5;

  const slippageBps =
    typeof input.slippageBps ===
      "number" &&
    Number.isFinite(
      input.slippageBps,
    )
      ? input.slippageBps
      : 5;

  try {
    const result =
      await backtestMarketCandidates(
        {
          candidates,

          strategy,

          initialCapital,

          fastPeriod,

          slowPeriod,

          feeBps,

          slippageBps,

          query:
            typeof input.query ===
            "string"
              ? input.query
              : null,

          bars:
            rawBars,
        },
      );

    return NextResponse.json(
      {
        ...result,

        publicBoundary:
          "FOUNDER_ONLY_C150",

        safetyBoundary: {
          founderAuthRequired:
            true,

          historicalOnly:
            true,

          plannerDispatched:
            false,

          tradingExecuted:
            false,

          liveOrderPlaced:
            false,

          humanReviewRequiredBeforeTrading:
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
          "C150_BACKTEST_ERROR",

        stage:
          "C150",

        error:
          error instanceof Error
            ? error.message
            : "Backtest engine failed.",

        safetyBoundary: {
          plannerDispatched:
            false,

          tradingExecuted:
            false,

          liveOrderPlaced:
            false,
        },
      },
      {
        status: 500,
      },
    );
  }
}
