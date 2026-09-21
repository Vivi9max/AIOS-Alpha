import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireFounderAuth,
} from "@/lib/founder/auth";

import {
  runMarketDecisionSupport,
} from "@/lib/runtime/market/market-decision-support-runtime";

export async function POST(
  request: NextRequest,
) {
  const auth =
    requireFounderAuth(
      request,
    );

  if (!auth.ok) {
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
      await runMarketDecisionSupport(
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
          "C147_5_DECISION_SUPPORT_ERROR",

        error:
          error instanceof Error
            ? error.message
            : "Decision support runtime failed.",
      },
      {
        status: 500,
      },
    );
  }
}
