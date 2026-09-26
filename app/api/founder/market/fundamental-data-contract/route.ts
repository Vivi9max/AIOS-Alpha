import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketFundamentalDataContract,
} from "@/lib/runtime/market/market-fundamental-data-contract-runtime";

import {
  runMarketFundamentalDataContractRegression,
} from "@/lib/runtime/market/market-fundamental-data-contract-regression";

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
      await runMarketFundamentalDataContractRegression(),
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
          "C162_1_SYMBOL_REQUIRED",

        error:
          "symbol is required.",
      },
      {
        status:
          400,
      },
    );
  }

  const result =
    await runMarketFundamentalDataContract({
      symbol,

      market:
        normalizeMarket(
          url.searchParams.get(
            "market",
          ),
        ),
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
}
