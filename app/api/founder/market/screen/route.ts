import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketScreeningRuntime,
} from "@/lib/runtime/market/market-screening-runtime";

import type {
  MarketScreeningRequest,
} from "@/lib/runtime/market/market-screening-types";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

const DEFAULT_UNIVERSE: MarketScreeningRequest["universe"] =
  [
    {
      symbol:
        "NVDA",
      market:
        "us",
    },
    {
      symbol:
        "AAPL",
      market:
        "us",
    },
    {
      symbol:
        "MSFT",
      market:
        "us",
    },
    {
      symbol:
        "0700.HK",
      market:
        "hk",
    },
    {
      symbol:
        "9988.HK",
      market:
        "hk",
    },
    {
      symbol:
        "600519.SH",
      market:
        "cn",
    },
    {
      symbol:
        "000858.SZ",
      market:
        "cn",
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

    allowedRiskLevels: [
      "low",
      "medium",
      "unknown",
    ],

    requireVerifiedData:
      false,
  } as const;

function parseRequest(
  body: unknown,
): MarketScreeningRequest {
  if (
    !body ||
    typeof body !==
      "object"
  ) {
    return {
      universe:
        DEFAULT_UNIVERSE,

      criteria:
        DEFAULT_CRITERIA,

      mode:
        "full",
    };
  }

  const value =
    body as Partial<MarketScreeningRequest>;

  return {
    universe:
      Array.isArray(
        value.universe,
      ) &&
      value.universe.length
        ? value.universe
        : DEFAULT_UNIVERSE,

    criteria:
      value.criteria ??
      DEFAULT_CRITERIA,

    mode:
      value.mode ??
      "full",
  };
}

export async function POST(
  request: Request,
) {
  if (
    !isFounderRequest(
      request,
    )
  ) {
    return Response.json(
      {
        success:
          false,

        verified:
          false,

        code:
          "FOUNDER_AUTH_REQUIRED",

        message:
          "Founder authentication is required.",
      },
      {
        status:
          401,
      },
    );
  }

  try {
    const body =
      await request.json();

    const input =
      parseRequest(
        body,
      );

    const result =
      await runMarketScreeningRuntime(
        input,
      );

    return Response.json(
      result,
      {
        status:
          result.success
            ? 200
            : 422,
      },
    );
  } catch (error) {
    return Response.json(
      {
        success:
          false,

        verified:
          false,

        code:
          "C147_3_SCREENING_RUNTIME_ERROR",

        error:
          error instanceof Error
            ? error.message
            : "Market screening runtime failed.",
      },
      {
        status:
          500,
      },
    );
  }
}

export async function GET(
  request: Request,
) {
  if (
    !isFounderRequest(
      request,
    )
  ) {
    return Response.json(
      {
        success:
          false,

        verified:
          false,

        code:
          "FOUNDER_AUTH_REQUIRED",

        message:
          "Founder authentication is required.",
      },
      {
        status:
          401,
      },
    );
  }

  try {
    const url =
      new URL(
        request.url,
      );

    const market =
      url.searchParams.get(
        "market",
      );

    const filtered =
      market ===
        "us" ||
      market ===
        "hk" ||
      market ===
        "cn"
        ? DEFAULT_UNIVERSE.filter(
            (item) =>
              item.market ===
              market,
          )
        : DEFAULT_UNIVERSE;

    const result =
      await runMarketScreeningRuntime(
        {
          universe:
            filtered,

          criteria:
            DEFAULT_CRITERIA,

          mode:
            "full",
        },
      );

    return Response.json(
      result,
    );
  } catch (error) {
    return Response.json(
      {
        success:
          false,

        verified:
          false,

        code:
          "C147_3_SCREENING_RUNTIME_ERROR",

        error:
          error instanceof Error
            ? error.message
            : "Market screening runtime failed.",
      },
      {
        status:
          500,
      },
    );
  }
}
