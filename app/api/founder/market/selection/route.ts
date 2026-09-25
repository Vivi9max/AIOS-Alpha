import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireFounderAccess,
} from "@/lib/auth/founder";

import {
  selectMarketCandidates,
} from "@/lib/runtime/market/selection-engine";

import type {
  MarketRegion,
} from "@/lib/runtime/market/market-types";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function normalizeMarket(
  value: unknown,
): MarketRegion | undefined {
  return value === "us" ||
    value === "hk" ||
    value === "cn"
    ? value
    : undefined;
}

function isCandidate(
  value: unknown,
): boolean {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const candidate =
    value as Record<
      string,
      unknown
    >;

  return (
    typeof candidate.symbol ===
      "string" &&
    candidate.symbol.trim()
      .length > 0
  );
}

export async function POST(
  request: NextRequest,
) {
  const access =
    requireFounderAccess(
      request,
    );

  if (!access.authorized) {
    return access.response;
  }

  let body: unknown;

  try {
    body =
      await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        code:
          "C148_1_INVALID_REQUEST",
        error:
          "Request body must be valid JSON.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    !body ||
    typeof body !==
      "object"
  ) {
    return NextResponse.json(
      {
        success: false,
        code:
          "C148_1_INVALID_REQUEST",
        error:
          "Request body must be an object.",
      },
      {
        status: 400,
      },
    );
  }

  const input =
    body as Record<
      string,
      unknown
    >;

  const industry =
    typeof input.industry ===
    "string"
      ? input.industry.trim()
      : "";

  const rawCandidates =
    Array.isArray(
      input.candidates,
    )
      ? input.candidates
      : [];

  if (!industry) {
    return NextResponse.json(
      {
        success: false,
        code:
          "C148_1_INVALID_REQUEST",
        error:
          "industry is required.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    rawCandidates.length ===
      0 ||
    rawCandidates.length >
      20
  ) {
    return NextResponse.json(
      {
        success: false,
        code:
          "C148_1_INVALID_REQUEST",
        error:
          "candidates must contain between 1 and 20 items.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    rawCandidates.some(
      (candidate) =>
        !isCandidate(candidate),
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        code:
          "C148_1_INVALID_REQUEST",
        error:
          "Each candidate must contain a non-empty symbol.",
      },
      {
        status: 400,
      },
    );
  }

  const candidates =
    rawCandidates.map(
      (candidate) => {
        const item =
          candidate as Record<
            string,
            unknown
          >;

        return {
          symbol:
            String(
              item.symbol,
            )
              .trim()
              .toUpperCase(),
          market:
            normalizeMarket(
              item.market,
            ),
          name:
            typeof item.name ===
            "string"
              ? item.name.trim()
              : null,
        };
      },
    );

  try {
    const result =
      await selectMarketCandidates({
        industry,
        candidates,
        maxCandidates:
          typeof input.maxCandidates ===
          "number"
            ? input.maxCandidates
            : 8,
        query:
          typeof input.query ===
          "string"
            ? input.query
            : null,
      });

    return NextResponse.json(
      {
        ...result,
        publicBoundary:
          "FOUNDER_ONLY_C148.1",
        safetyBoundary: {
          founderAuthRequired:
            true,
          plannerDispatched:
            false,
          tradingExecuted:
            false,
          humanReviewRequiredBeforeTrading:
            true,
        },
      },
      {
        status: result.success
          ? 200
          : 422,
        headers: {
          "Cache-Control":
            "no-store",
          "Content-Type":
            "application/json; charset=utf-8",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        code:
          "C148_1_SELECTION_ERROR",
        stage:
          "C148.1",
        error:
          error instanceof Error
            ? error.message
            : "Selection engine failed.",
        safetyBoundary: {
          plannerDispatched:
            false,
          tradingExecuted:
            false,
        },
      },
      {
        status: 500,
      },
    );
  }
}
