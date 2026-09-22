import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  isFounderRequest,
} from "@/lib/founder/auth";
import {
  runMarketChangeEventTaskBridge,
} from "@/lib/runtime/market/market-change-event-task-bridge-runtime";
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
      await runMarketChangeEventTaskBridge(
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
          "C147_14_MARKET_EVENT_TASK_BRIDGE_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Market event Task bridge failed.",
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
        "C147_14_MARKET_EVENT_TASK_BRIDGE_READY",
      runtime:
        "market-change-event-task-bridge-runtime",
      version:
        "C147.14",
      upstream:
        "C147.13",
      mutationPerformed:
        false,
      plannerDispatched:
        false,
      tradingExecuted:
        false,
      humanDecisionRequired:
        true,
      boundary:
        "Only material reassessment-required events may create persistent human-review Tasks. No autonomous execution is started.",
    },
  );
}
