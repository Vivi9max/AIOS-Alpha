import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketResearchDossier,
} from "@/lib/runtime/market/market-research-dossier-runtime";

import {
  runMarketResearchDossierRegression,
} from "@/lib/runtime/market/market-research-dossier-regression";

import type {
  MarketRegion,
} from "@/lib/runtime/market/market-types";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function normalizeMarket(
  value: unknown,
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

function normalizeUniverse(
  value: unknown,
) {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value
    .map((item) => {
      if (
        !item ||
        typeof item !==
          "object"
      ) {
        return null;
      }

      const record =
        item as Record<
          string,
          unknown
        >;

      const symbol =
        typeof record.symbol ===
        "string"
          ? record.symbol
              .trim()
              .toUpperCase()
          : "";

      const market =
        normalizeMarket(
          record.market,
        );

      if (
        !symbol ||
        !market
      ) {
        return null;
      }

      return {
        symbol,
        market,
      };
    })
    .filter(
      (
        item,
      ): item is {
        symbol: string;
        market: MarketRegion;
      } =>
        Boolean(item),
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
        verified: false,
        code:
          "FOUNDER_AUTH_REQUIRED",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const body =
      (await request.json()) as Record<
        string,
        unknown
      >;

    const universe =
      normalizeUniverse(
        body.universe,
      );

    if (
      universe.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          code:
            "C156_RESEARCH_DOSSIER_UNIVERSE_REQUIRED",
          error:
            "At least one valid market instrument is required.",
        },
        {
          status: 400,
        },
      );
    }

    const result =
      await runMarketResearchDossier({
        universe,

        query:
          typeof body.query ===
          "string"
            ? body.query
            : null,
      });

    return NextResponse.json(
      result,
      {
        status:
          result.success
            ? 200
            : 207,
        headers: {
          "cache-control":
            "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        verified: false,
        code:
          "C156_RESEARCH_DOSSIER_RUNTIME_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Research Dossier runtime failed.",
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
  if (
    !isFounderRequest(
      request,
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        verified: false,
        code:
          "FOUNDER_AUTH_REQUIRED",
      },
      {
        status: 401,
      },
    );
  }

  const regression =
    request.nextUrl.searchParams.get(
      "regression",
    );

  if (
    regression === "true"
  ) {
    return NextResponse.json(
      await runMarketResearchDossierRegression(),
      {
        headers: {
          "cache-control":
            "no-store",
        },
      },
    );
  }

  return NextResponse.json({
    success: true,

    verified: true,

    code:
      "C156_MARKET_RESEARCH_DOSSIER_BOUNDARY_READY",

    runtime:
      "market-research-dossier",

    version:
      "C156.1",

    upstream: [
      "C155.1",
      "C147.4",
      "C147.6",
      "C149",
      "C147.17",
    ],

    capabilities: [
      "market-change-research",
      "evidence-verification",
      "industry-analysis",
      "company-analysis",
      "fundamental-analysis",
      "valuation-analysis",
      "risk-control",
      "human-decision-support",
    ],

    prohibitedActions: [
      "buy",
      "sell",
      "hold",
      "target-price",
      "ranking",
      "automatic-trading",
      "planner-dispatch",
      "task-creation",
    ],

    mutationPerformed:
      false,

    taskCreated:
      false,

    plannerDispatched:
      false,

    tradingExecuted:
      false,

    humanDecisionRequired:
      true,
  });
}
