import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireFounderAccess,
} from "@/lib/auth/founder";

import {
  evaluateBrokerIntegrationBoundary,
} from "@/lib/runtime/market/broker-integration-boundary-engine";

import type {
  BrokerIntegrationBoundaryRequest,
  BrokerOrderIntent,
} from "@/lib/runtime/market/broker-integration-boundary-types";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function isObject(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    Boolean(value) &&
    typeof value ===
      "object" &&
    !Array.isArray(value)
  );
}

function normalizeOrder(
  value: unknown,
):
  | BrokerOrderIntent
  | null {
  if (
    !isObject(value)
  ) {
    return null;
  }

  const side =
    value.side ===
      "buy"
      ? "buy"
      : value.side ===
          "sell"
        ? "sell"
        : null;

  if (
    typeof value.symbol !==
      "string" ||
    !side ||
    typeof value.quantity !==
      "number" ||
    !Number.isFinite(
      value.quantity,
    ) ||
    value.quantity <= 0
  ) {
    return null;
  }

  return {
    symbol:
      value.symbol,

    market:
      value.market ===
        "us" ||
      value.market ===
        "hk" ||
      value.market ===
        "cn"
        ? value.market
        : null,

    side,

    quantity:
      value.quantity,

    limitPrice:
      typeof value.limitPrice ===
        "number" &&
      Number.isFinite(
        value.limitPrice,
      )
        ? value.limitPrice
        : null,

    reason:
      typeof value.reason ===
        "string"
        ? value.reason
        : null,
  };
}

export async function POST(
  request: NextRequest,
) {
  const access =
    requireFounderAccess(
      request,
    );

  if (
    !access.authorized
  ) {
    return access.response;
  }

  let body: unknown;

  try {
    body =
      await request.json();
  } catch {
    return NextResponse.json(
      {
        success:
          false,

        code:
          "C153_INVALID_REQUEST",

        error:
          "Request body must be valid JSON.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    !isObject(body)
  ) {
    return NextResponse.json(
      {
        success:
          false,

        code:
          "C153_INVALID_REQUEST",

        error:
          "Request body must be an object.",
      },
      {
        status: 400,
      },
    );
  }

  const normalizedOrder =
    body.order ===
      undefined
      ? null
      : normalizeOrder(
          body.order,
        );

  if (
    body.order !==
      undefined &&
    normalizedOrder ===
      null
  ) {
    return NextResponse.json(
      {
        success:
          false,

        code:
          "C153_INVALID_REQUEST",

        error:
          "order must include a valid symbol, side, and positive quantity.",
      },
      {
        status: 400,
      },
    );
  }

  const provider =
    body.provider ===
      "custom"
      ? "custom"
      : "unconfigured";

  const input:
    BrokerIntegrationBoundaryRequest =
    {
      order:
        normalizedOrder,

      paperTradingVerified:
        body.paperTradingVerified ===
        true,

      humanReviewApproved:
        body.humanReviewApproved ===
        true,

      provider,

      /*
       * Diagnostic input only.
       * Runtime never accepts this as
       * proof of a real connection.
       */
      connectionVerified:
        body.connectionVerified ===
        true,

      executionRequested:
        body.executionRequested ===
        true,
    };

  const result =
    evaluateBrokerIntegrationBoundary(
      input,
    );

  return NextResponse.json(
    {
      ...result,

      publicBoundary:
        "FOUNDER_ONLY_C153",

      safetyBoundary: {
        founderAuthRequired:
          true,

        founderOnly:
          true,

        simulationRequiredBeforeLive:
          true,

        humanReviewRequired:
          true,

        brokerVerificationRequired:
          true,

        brokerConnected:
          false,

        tradingExecuted:
          false,

        liveOrderPlaced:
          false,

        plannerDispatched:
          false,

        automaticExecutionAllowed:
          false,
      },
    },
    {
      status: 200,

      headers: {
        "Cache-Control":
          "no-store",

        "Content-Type":
          "application/json; charset=utf-8",
      },
    },
  );
}
