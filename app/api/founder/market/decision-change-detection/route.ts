import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  isFounderRequest,
} from "@/lib/founder/auth";
import {
  runMarketDecisionChangeDetection,
} from "@/lib/runtime/market/market-decision-change-detection-runtime";
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
      await runMarketDecisionChangeDetection(
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
          "C147_12_CHANGE_DETECTION_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Market change detection runtime failed.",
      },
      {
        status: 500,
      },
    );
  }
}
