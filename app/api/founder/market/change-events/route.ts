import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketChangeEventRuntime,
} from "@/lib/runtime/market/market-change-event-runtime";

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
      await runMarketChangeEventRuntime(
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
          "C147_13_MARKET_CHANGE_EVENT_ERROR",

        error:
          error instanceof Error
            ? error.message
            : "Market change event runtime failed.",
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

        error:
          "Founder authentication required.",
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
        "C147_13_MARKET_CHANGE_EVENT_READY",

      runtime:
        "market-change-event-runtime",

      version:
        "C147.13",

      upstream:
        "C147.12",

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
    },
  );
}
