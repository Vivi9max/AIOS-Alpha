import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  isFounderRequest,
} from "@/lib/founder/auth";
import {
  runMarketHistoricalValuationContext,
} from "@/lib/runtime/market/market-historical-valuation-context-runtime";
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
          "C163_4_SYMBOL_REQUIRED",
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
      ? Math.max(
          2,
          Math.min(
            Math.floor(
              periodsRaw,
            ),
            12,
          ),
        )
      : 5;
  try {
    const result =
      await runMarketHistoricalValuationContext({
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
          "C163_4_HISTORICAL_VALUATION_CONTEXT_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Historical valuation context failed.",
      },
      {
        status:
          500,
      },
    );
  }
}
