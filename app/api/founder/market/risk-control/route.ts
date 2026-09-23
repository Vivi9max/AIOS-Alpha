import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  isFounderRequest,
} from "@/lib/founder/auth";
import {
  runMarketRiskControl,
} from "@/lib/runtime/market/market-risk-control-runtime";
import type {
  MarketRegion,
} from "@/lib/runtime/market/market-types";
export const dynamic =
  "force-dynamic";
export const runtime =
  "nodejs";
function parseMarket(
  value: string | null,
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
function unauthorized() {
  return NextResponse.json(
    {
      success:
        false,
      code:
        "FOUNDER_AUTH_REQUIRED",
      error:
        "Founder access required.",
    },
    {
      status: 401,
    },
  );
}
export async function GET(
  request: NextRequest,
) {
  const startedAt =
    Date.now();
  if (
    !isFounderRequest(
      request,
    )
  ) {
    return unauthorized();
  }
  const {
    searchParams,
  } =
    new URL(
      request.url,
    );
  const symbol =
    searchParams
      .get("symbol")
      ?.trim() ?? "";
  const market =
    parseMarket(
      searchParams.get(
        "market",
      ),
    );
  const query =
    searchParams
      .get("query")
      ?.trim() ||
    null;
  if (
    !symbol
  ) {
    return NextResponse.json(
      {
        success:
          false,
        code:
          "C147_17_SYMBOL_REQUIRED",
        error:
          "symbol is required.",
        runtime: {
          name:
            "market-risk-control-route",
          version:
            "C147.17",
          latencyMs:
            Date.now() -
            startedAt,
        },
      },
      {
        status: 422,
      },
    );
  }
  if (
    !market
  ) {
    return NextResponse.json(
      {
        success:
          false,
        code:
          "C147_17_INVALID_MARKET",
        error:
          "market is required and must be one of: us, hk, cn.",
        runtime: {
          name:
            "market-risk-control-route",
          version:
            "C147.17",
          latencyMs:
            Date.now() -
            startedAt,
        },
      },
      {
        status: 422,
      },
    );
  }
  try {
    const result =
      await runMarketRiskControl(
        {
          symbol,
          market,
          query,
        },
      );
    return NextResponse.json(
      {
        ...result,
        runtime: {
          ...result.runtime,
          latencyMs:
            Date.now() -
            startedAt,
        },
      },
      {
        status:
          result.success
            ? 200
            : 422,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success:
          false,
        code:
          "C147_17_RISK_CONTROL_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Risk-control request failed.",
        runtime: {
          name:
            "market-risk-control-route",
          version:
            "C147.17",
          latencyMs:
            Date.now() -
            startedAt,
        },
      },
      {
        status: 500,
      },
    );
  }
}
