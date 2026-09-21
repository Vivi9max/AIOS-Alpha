import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketDecisionHistoryQuery,
} from "@/lib/runtime/market/market-decision-history-query-runtime";

function getFounderKey(
  request: NextRequest,
): string {
  const authorization =
    request.headers.get(
      "authorization",
    );

  if (
    authorization?.startsWith(
      "Bearer ",
    )
  ) {
    return authorization.slice(
      7,
    );
  }

  return (
    request.headers.get(
      "x-aios-founder-key",
    ) ?? ""
  );
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

  try {
    const params =
      request.nextUrl.searchParams;

    const symbol =
      params.get(
        "symbol",
      ) ?? "";

    const market =
      params.get(
        "market",
      ) ?? "us";

    const limitRaw =
      params.get(
        "limit",
      );

    const includeReassessment =
      params.get(
        "includeReassessment",
      ) !== "false";

    const limit =
      limitRaw
        ? Number(
            limitRaw,
          )
        : undefined;

    const result =
      await runMarketDecisionHistoryQuery(
        {
          symbol,

          market:
            market as
              | "us"
              | "hk"
              | "cn",

          limit,

          includeReassessment,
        },
      );

    return NextResponse.json(
      {
        ...result,

        founderSession:
          Boolean(
            getFounderKey(
              request,
            ),
          ),
      },
      {
        status:
          result.success
            ? 200
            : result.code ===
                "C147_10_HISTORY_QUERY_EMPTY"
              ? 404
              : 422,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        code:
          "C147_10_HISTORY_QUERY_ERROR",

        error:
          error instanceof Error
            ? error.message
            : "Market history query failed.",
      },
      {
        status: 500,
      },
    );
  }
}
