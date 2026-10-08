import { NextRequest, NextResponse } from "next/server";
import { isFounderRequest } from "@/lib/founder/auth";
import {
  evaluateMarketExecutionReadiness,
  type MarketExecutionReadinessOrder,
} from "@/lib/runtime/market/market-execution-readiness";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): NextResponse {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}

function readString(
  value: unknown,
  fallback = "",
): string {
  return typeof value === "string"
    ? value
    : fallback;
}

function readNumber(
  value: unknown,
  fallback = 0,
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim().length > 0
  ) {
    const parsed =
      Number(value);

    if (
      Number.isFinite(parsed)
    ) {
      return parsed;
    }
  }

  return fallback;
}

function readNullableNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    readNumber(
      value,
      Number.NaN,
    );

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function readMarket(
  value: unknown,
): MarketExecutionReadinessOrder["market"] {
  const market =
    readString(
      value,
    ).toLowerCase();

  if (
    market === "hk"
  ) {
    return "hk";
  }

  if (
    market === "cn"
  ) {
    return "cn";
  }

  return "us";
}

function readSide(
  value: unknown,
): MarketExecutionReadinessOrder["side"] {
  return readString(
    value,
  ).toLowerCase() === "sell"
    ? "sell"
    : "buy";
}

function buildOrder(
  input: Record<string, unknown>,
): MarketExecutionReadinessOrder {
  return {
    symbol:
      readString(
        input.symbol,
      )
        .trim()
        .toUpperCase(),

    market:
      readMarket(
        input.market,
      ),

    side:
      readSide(
        input.side,
      ),

    quantity:
      Math.floor(
        readNumber(
          input.quantity,
          0,
        ),
      ),

    limitPrice:
      readNullableNumber(
        input.limitPrice,
      ),

    reason:
      readString(
        input.reason,
      ).trim(),
  };
}

function parseQueryOrder(
  request: NextRequest,
): MarketExecutionReadinessOrder {
  const searchParams =
    request.nextUrl.searchParams;

  return buildOrder({
    symbol:
      searchParams.get(
        "symbol",
      ),

    market:
      searchParams.get(
        "market",
      ),

    side:
      searchParams.get(
        "side",
      ),

    quantity:
      searchParams.get(
        "quantity",
      ),

    limitPrice:
      searchParams.get(
        "limitPrice",
      ),

    reason:
      searchParams.get(
        "reason",
      ),
  });
}

function extractBodyOrder(
  body: unknown,
): {
  order: MarketExecutionReadinessOrder;
  taskId: string | null;
} {
  if (
    !body ||
    typeof body !== "object"
  ) {
    return {
      order:
        buildOrder({}),
      taskId: null,
    };
  }

  const payload =
    body as Record<
      string,
      unknown
    >;

  const nestedOrder =
    payload.order;

  const orderInput =
    nestedOrder &&
    typeof nestedOrder === "object"
      ? nestedOrder as Record<
          string,
          unknown
        >
      : payload;

  const taskIdValue =
    payload.taskId;

  return {
    order:
      buildOrder(
        orderInput,
      ),

    taskId:
      typeof taskIdValue ===
        "string" &&
      taskIdValue.trim()
        .length > 0
        ? taskIdValue.trim()
        : null,
  };
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse> {
  if (
    !isFounderRequest(
      request,
    )
  ) {
    return jsonResponse(
      {
        code:
          "FOUNDER_ACCESS_REQUIRED",

        message:
          "Founder access is required.",

        safetyBoundary: {
          founderOnly: true,
          automaticExecution: false,
          liveOrderPlacement: false,
          tradingExecuted: false,
        },
      },
      401,
    );
  }

  const order =
    parseQueryOrder(
      request,
    );

  const taskId =
    request.nextUrl.searchParams.get(
      "taskId",
    );

  const readiness =
    await evaluateMarketExecutionReadiness(
      order,
      taskId,
    );

  return jsonResponse({
    code:
      "C167_5_37_EXECUTION_READINESS_DIAGNOSTICS",

    stage:
      "C167.5.37",

    success:
      readiness.success,

    readiness,

    requestContract: {
      method:
        "GET",

      query: {
        symbol:
          "string",

        market:
          "us | hk | cn",

        side:
          "buy | sell",

        quantity:
          "positive integer",

        limitPrice:
          "number | null",

        reason:
          "string",

        taskId:
          "optional persistent human review task id",
      },
    },

    controlChain: [
      "research",
      "provider",
      "commercial-authorization",
      "pre-trade-risk",
      "persistent-human-review",
      "broker-connection-verification",
      "broker-execution-adapter",
      "final-execution-readiness",
    ],

    safetyBoundary: {
      founderOnly: true,
      automaticExecution: false,
      liveOrderPlacement: false,
      tradingExecuted: false,
      liveExecutionEnabled: false,
      callerCanOverride: false,
      callerCanBypass: false,
    },

    generatedAt:
      new Date().toISOString(),
  });
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse> {
  if (
    !isFounderRequest(
      request,
    )
  ) {
    return jsonResponse(
      {
        code:
          "FOUNDER_ACCESS_REQUIRED",

        message:
          "Founder access is required.",

        safetyBoundary: {
          founderOnly: true,
          automaticExecution: false,
          liveOrderPlacement: false,
          tradingExecuted: false,
        },
      },
      401,
    );
  }

  let body: unknown;

  try {
    body =
      await request.json();
  } catch {
    return jsonResponse(
      {
        code:
          "INVALID_REQUEST_BODY",

        message:
          "Request body must be valid JSON.",

        safetyBoundary: {
          automaticExecution: false,
          liveOrderPlacement: false,
          tradingExecuted: false,
        },
      },
      400,
    );
  }

  const {
    order,
    taskId,
  } =
    extractBodyOrder(
      body,
    );

  const readiness =
    await evaluateMarketExecutionReadiness(
      order,
      taskId,
    );

  return jsonResponse({
    code:
      "C167_5_37_EXECUTION_READINESS",

    stage:
      "C167.5.37",

    success:
      readiness.success,

    readiness,

    orderIntent:
      order,

    humanReviewTaskId:
      taskId,

    controlDecision:
      readiness.decision,

    executionReady:
      readiness.executionReady,

    gates:
      readiness.gates,

    failureCodes:
      readiness.failureCodes,

    safetyBoundary:
      readiness.safetyBoundary,

    executionPolicy: {
      readinessOnly:
        true,

      executionRequested:
        false,

      automaticExecution:
        false,

      liveOrderPlacement:
        false,

      tradingExecuted:
        false,

      liveExecutionEnabled:
        false,
    },

    generatedAt:
      new Date().toISOString(),
  });
}
