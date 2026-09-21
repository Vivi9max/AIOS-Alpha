import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketSelectionFramework,
} from "@/lib/runtime/market/market-selection-framework-runtime";

import type {
  MarketSelectionFrameworkRequest,
} from "@/lib/runtime/market/market-selection-framework-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_UNIVERSE:
  MarketSelectionFrameworkRequest["universe"] =
  [
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

const DEFAULT_CRITERIA =
  {
    minRevenueGrowth:
      null,

    minEps:
      null,

    minPe:
      null,

    maxPe:
      null,

    minPb:
      null,

    maxPb:
      null,

    minEvidenceSources:
      3,

    minIndependentDomains:
      2,

    allowedRiskLevels:
      [
        "low",
        "medium",
        "unknown",
      ] as Array<
        "low" |
        "medium" |
        "high" |
        "unknown"
      >,

    requireVerifiedData:
      false,
  };

function parseMarket(
  value: string | null,
) {
  if (
    value === "us" ||
    value === "hk" ||
    value === "cn"
  ) {
    return DEFAULT_UNIVERSE.filter(
      (item) =>
        item.market ===
        value,
    );
  }

  return DEFAULT_UNIVERSE;
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
        error:
          "Alpha founder access required.",
      },
      {
        status: 401,
      },
    );
  }

  const market =
    request.nextUrl
      .searchParams
      .get("market");

  const result =
    await runMarketSelectionFramework(
      {
        universe:
          parseMarket(
            market,
          ),

        criteria:
          DEFAULT_CRITERIA,
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
        error:
          "Alpha founder access required.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const body =
      (await request.json()) as
        MarketSelectionFrameworkRequest;

    const result =
      await runMarketSelectionFramework(
        body,
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
    return NextResponse.json(
      {
        success: false,
        code:
          "C147_4_FRAMEWORK_REQUEST_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Invalid framework request.",
      },
      {
        status: 400,
      },
    );
  }
}
