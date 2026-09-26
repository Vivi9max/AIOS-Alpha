import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketHistoricalFundamentalSeries,
} from "@/lib/runtime/market/market-historical-fundamental-series-runtime";

import {
  runMarketHistoricalFundamentalSeriesRegression,
} from "@/lib/runtime/market/market-historical-fundamental-series-regression";

import type {
  MarketRegion,
} from "@/lib/runtime/market/market-types";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function unauthorized() {
  return NextResponse.json(
    {
      success:
        false,

      code:
        "FOUNDER_AUTH_REQUIRED",

      error:
        "Founder authentication required.",
    },
    {
      status:
        401,
    },
  );
}

function normalizeMarket(
  value: string | null,
):
  | MarketRegion
  | undefined {
  if (
    value === "us" ||
    value === "hk" ||
    value === "cn"
  ) {
    return value;
  }

  return undefined;
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

  const url =
    new URL(
      request.url,
    );

  if (
    url.searchParams.get(
      "regression",
    ) === "true"
  ) {
    return NextResponse.json(
      await runMarketHistoricalFundamentalSeriesRegression(),
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }

  const symbol =
    url.searchParams
      .get("symbol")
      ?.trim();

  if (!symbol) {
    return NextResponse.json(
      {
        success:
          false,

        code:
          "C162_2_SYMBOL_REQUIRED",

        error:
          "symbol is required.",
      },
      {
        status:
          400,
      },
    );
  }

  const periodsRaw =
    Number(
      url.searchParams.get(
        "periods",
      ) ?? "5",
    );

  const periods =
    Number.isFinite(
      periodsRaw,
    )
      ? periodsRaw
      : 5;

  try {
    const result =
      await runMarketHistoricalFundamentalSeries({
        symbol,

        market:
          normalizeMarket(
            url.searchParams.get(
              "market",
            ),
          ),

        periods,
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
          "C162_2_HISTORICAL_FUNDAMENTAL_SERIES_ERROR",

        error:
          error instanceof Error
            ? error.message
            : "Historical fundamental series failed.",
      },
      {
        status:
          500,
      },
    );
  }
}
