import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketScreeningResearchReport,
} from "@/lib/runtime/market/market-screening-report-runtime";

import type {
  MarketScreeningCriteria,
  MarketScreeningRequest,
  MarketScreeningUniverseItem,
} from "@/lib/runtime/market/market-screening-types";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

const DEFAULT_UNIVERSE:
  MarketScreeningUniverseItem[] = [
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

const DEFAULT_CRITERIA:
  MarketScreeningCriteria = {
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

    allowedRiskLevels: [
      "low",
      "medium",
      "unknown",
    ],

    requireVerifiedData:
      false,
  };

function parseMarket(
  value: string | null,
):
  | "us"
  | "hk"
  | "cn"
  | "all" {
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
  market:
    | "us"
    | "hk"
    | "cn"
    | "all",
): MarketScreeningUniverseItem[] {
  if (
    market === "all"
  ) {
    return DEFAULT_UNIVERSE;
  }

  return DEFAULT_UNIVERSE.filter(
    (item) =>
      item.market ===
      market,
  );
}

function parseBody(
  body: unknown,
): MarketScreeningRequest {
  if (
    body &&
    typeof body ===
      "object"
  ) {
    const input =
      body as Partial<MarketScreeningRequest>;

    return {
      universe:
        Array.isArray(
          input.universe,
        ) &&
        input.universe.length >
          0
          ? input.universe
          : DEFAULT_UNIVERSE,

      criteria:
        input.criteria ??
        DEFAULT_CRITERIA,

      mode:
        input.mode ??
        "full",
    };
  }

  return {
    universe:
      DEFAULT_UNIVERSE,

    criteria:
      DEFAULT_CRITERIA,

    mode:
      "full",
  };
}

async function execute(
  request: NextRequest,
  screening:
    MarketScreeningRequest,
  title?: string,
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
    const result =
      await runMarketScreeningResearchReport(
        {
          screening,
          title,
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
        : "Unknown market research report error.";

    return NextResponse.json(
      {
        success: false,
        code:
          "C147_3_2_REPORT_RUNTIME_ERROR",
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
  const market =
    parseMarket(
      request.nextUrl.searchParams.get(
        "market",
      ),
    );

  const title =
    request.nextUrl.searchParams.get(
      "title",
    ) ??
    undefined;

  return execute(
    request,
    {
      universe:
        filterUniverse(
          market,
        ),

      criteria:
        DEFAULT_CRITERIA,

      mode:
        "full",
    },
    title,
  );
}

export async function POST(
  request: NextRequest,
) {
  let body:
    | unknown
    | null = null;

  try {
    body =
      await request.json();
  } catch {
    body =
      null;
  }

  const screening =
    parseBody(body);

  const title =
    body &&
    typeof body ===
      "object" &&
    "title" in body &&
    typeof (
      body as {
        title?: unknown;
      }
    ).title ===
      "string"
      ? (
          body as {
            title: string;
          }
        ).title
      : undefined;

  return execute(
    request,
    screening,
    title,
  );
}
