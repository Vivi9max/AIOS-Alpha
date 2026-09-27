import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  isFounderRequest,
} from "@/lib/founder/auth";
import {
  runMarketHistoricalValuationAdapterRegression,
} from "@/lib/runtime/market/market-historical-valuation-adapter-regression";
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
          "C163_4_ADAPTER_SYMBOL_REQUIRED",
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
      ) ??
        "5",
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
  const market =
    normalizeMarket(
      url.searchParams.get(
        "market",
      ),
    ) ??
    "us";
  const industry =
    url.searchParams
      .get(
        "industry",
      )
      ?.trim() ||
    "Regression Validation";
  try {
    const result =
      await runMarketHistoricalValuationAdapterRegression(
        {
          symbol,
          market,
          periods,
          industry,
        },
      );
    return NextResponse.json(
      result,
      {
        status:
          result.success
            ? 200
            : result.code ===
                "C163_4_ADAPTER_REGRESSION_PARTIAL"
              ? 422
              : 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        success:
          false,
        code:
          "C163_4_VALUATION_ADAPTER_REGRESSION_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Historical valuation adapter regression failed.",
      },
      {
        status:
          500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}
