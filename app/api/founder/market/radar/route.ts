import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketRadarRuntime,
} from "@/lib/runtime/market/market-radar-runtime";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

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
          "Founder authentication required.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const body =
      await request.json();

    const result =
      await runMarketRadarRuntime(
        {
          universe:
            Array.isArray(
              body?.universe,
            )
              ? body.universe
              : [],

          query:
            body?.query ??
            null,

          includeNoChange:
            body?.includeNoChange ??
            true,

          includeNoHistory:
            body?.includeNoHistory ??
            true,

          includeBlocked:
            body?.includeBlocked ??
            true,
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
    return NextResponse.json(
      {
        success: false,

        code:
          "C154_MARKET_RADAR_ERROR",

        error:
          error instanceof Error
            ? error.message
            : "Market Radar runtime failed.",
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
        code:
          "FOUNDER_AUTH_REQUIRED",
      },
      {
        status: 401,
      },
    );
  }

  return NextResponse.json(
    {
      success: true,

      code:
        "C154_MARKET_RADAR_BOUNDARY_READY",

      stage:
        "C154.1",

      runtime:
        "market-radar-runtime",

      upstream:
        "C147.13",

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

      disclaimer:
        "Founder-only Market Radar boundary. Runtime execution requires POST with a market universe.",
    },
  );
}
