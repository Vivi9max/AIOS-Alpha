import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketEvidenceMatrix,
} from "@/lib/runtime/market/market-evidence-matrix-runtime";

import type {
  MarketEvidenceMatrixRequest,
} from "@/lib/runtime/market/market-evidence-matrix-types";

export async function POST(
  request: NextRequest,
) {
  if (
    !isFounderRequest(request)
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
      (await request.json()) as Partial<
        MarketEvidenceMatrixRequest
      >;

    const result =
      await runMarketEvidenceMatrix({
        universe:
          Array.isArray(
            body.universe,
          )
            ? body.universe
            : [],
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
            : 422,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        code:
          "C147_6_EVIDENCE_MATRIX_API_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Evidence matrix request failed.",
      },
      {
        status: 500,
      },
    );
  }
}
