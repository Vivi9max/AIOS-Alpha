import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketResearchInvalidationLedgerHistory,
} from "@/lib/runtime/market/market-research-invalidation-ledger-history-runtime";

import {
  runMarketResearchInvalidationLedgerHistoryRegression,
} from "@/lib/runtime/market/market-research-invalidation-ledger-history-regression";

import type {
  MarketRegion,
} from "@/lib/runtime/market/market-types";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function unauthorized() {
  return NextResponse.json(
    {
      success:
        false,

      code:
        "FOUNDER_AUTH_REQUIRED",

      error:
        "Founder authentication required.",
    },
    {
      status:
        401,
    },
  );
}

function normalizeLimit(
  value: string | null,
): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    return undefined;
  }

  return Math.max(
    1,
    Math.min(
      Math.floor(
        parsed,
      ),
      100,
    ),
  );
}

function normalizeMarket(
  value: string | null,
): MarketRegion | undefined {
  if (
    value === "us" ||
    value === "hk" ||
    value === "cn"
  ) {
    return value;
  }

  return undefined;
}

export async function GET(
  request: NextRequest,
) {
  if (
    !isFounderRequest(
      request,
    )
  ) {
    return unauthorized();
  }

  const url =
    new URL(
      request.url,
    );

  if (
    url.searchParams.get(
      "regression",
    ) === "true"
  ) {
    return NextResponse.json(
      await runMarketResearchInvalidationLedgerHistoryRegression(),
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }

  const result =
    await runMarketResearchInvalidationLedgerHistory(
      {
        symbol:
          url.searchParams.get(
            "symbol",
          ) ?? undefined,

        market:
          normalizeMarket(
            url.searchParams.get(
              "market",
            ),
          ),

        limit:
          normalizeLimit(
            url.searchParams.get(
              "limit",
            ),
          ),
      },
    );

  return NextResponse.json(
    result,
    {
      status:
        result.success
          ? 200
          : 404,

      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}
