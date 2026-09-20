import { NextRequest, NextResponse } from "next/server";

import { isFounderRequest } from "@/lib/founder/auth";
import {
  runMarketScreeningRuntime,
} from "@/lib/runtime/market/market-screening-runtime";
import type {
  MarketScreeningCriteria,
  MarketScreeningRequest,
  MarketScreeningUniverseItem,
} from "@/lib/runtime/market/market-screening-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_UNIVERSE: MarketScreeningUniverseItem[] = [
  {
    symbol: "NVDA",
    market: "us",
  },
  {
    symbol: "AAPL",
    market: "us",
  },
  {
    symbol: "MSFT",
    market: "us",
  },
  {
    symbol: "0700.HK",
    market: "hk",
  },
  {
    symbol: "9988.HK",
    market: "hk",
  },
  {
    symbol: "600519.SH",
    market: "cn",
  },
  {
    symbol: "000858.SZ",
    market: "cn",
  },
];

const DEFAULT_CRITERIA: MarketScreeningCriteria = {
  minRevenueGrowth: null,
  minEps: null,
  minPe: null,
  maxPe: null,
  minPb: null,
  maxPb: null,
  minEvidenceSources: 3,
  minIndependentDomains: 2,
  allowedRiskLevels: [
    "low",
    "medium",
    "unknown",
  ],
  requireVerifiedData: false,
};

function parseMarket(
  value: string | null,
): "us" | "hk" | "cn" | "all" {
  if (
    value === "us" ||
    value === "hk" ||
    value === "cn"
  ) {
    return value;
  }

  return "all";
}

function filterUniverse(
  market: "us" | "hk" | "cn" | "all",
): MarketScreeningUniverseItem[] {
  if (market === "all") {
    return DEFAULT_UNIVERSE;
  }

  return DEFAULT_UNIVERSE.filter(
    (item) => item.market === market,
  );
}

function parseRequest(
  body: unknown,
): MarketScreeningRequest {
  if (
    body &&
    typeof body === "object"
  ) {
    const input =
      body as Partial<MarketScreeningRequest>;

    const universe =
      Array.isArray(input.universe) &&
      input.universe.length > 0
        ? input.universe
        : DEFAULT_UNIVERSE;

    const criteria =
      input.criteria ?? DEFAULT_CRITERIA;

    const mode =
      input.mode ?? "full";

    return {
      universe,
      criteria,
      mode,
    };
  }

  return {
    universe: DEFAULT_UNIVERSE,
    criteria: DEFAULT_CRITERIA,
    mode: "full",
  };
}

export async function POST(
  request: NextRequest,
) {
  if (!isFounderRequest(request)) {
    return NextResponse.json(
      {
        success: false,
        code: "FOUNDER_AUTH_REQUIRED",
        error: "Alpha founder access required.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const body =
      await request.json().catch(
        () => null,
      );

    const input =
      parseRequest(body);

    const result =
      await runMarketScreeningRuntime(
        input,
      );

    return NextResponse.json(
      result,
      {
        status:
          result.success
            ? 200
            : 422,
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown market screening error.";

    return NextResponse.json(
      {
        success: false,
        code: "C147_3_SCREENING_RUNTIME_ERROR",
        error: message,
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
  if (!isFounderRequest(request)) {
    return NextResponse.json(
      {
        success: false,
        code: "FOUNDER_AUTH_REQUIRED",
        error: "Alpha founder access required.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const market =
      parseMarket(
        request.nextUrl.searchParams.get(
          "market",
        ),
      );

    const universe =
      filterUniverse(market);

    const result =
      await runMarketScreeningRuntime(
        {
          universe,
          criteria:
            DEFAULT_CRITERIA,
          mode: "full",
        },
      );

    return NextResponse.json(
      result,
      {
        status:
          result.success
            ? 200
            : 422,
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown market screening error.";

    return NextResponse.json(
      {
        success: false,
        code: "C147_3_SCREENING_RUNTIME_ERROR",
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}
