import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  getMarketResearchInvalidationLedger,
  runMarketResearchInvalidationLedger,
} from "@/lib/runtime/market/market-research-invalidation-ledger-runtime";

import {
  runMarketResearchInvalidationLedgerRegression,
} from "@/lib/runtime/market/market-research-invalidation-ledger-regression";

import type {
  MarketResearchOutcomeReconciliationResult,
} from "@/lib/runtime/market/market-research-outcome-reconciliation-types";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function unauthorized() {
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

function isReconciliation(
  value: unknown,
): value is MarketResearchOutcomeReconciliationResult {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const item =
    value as Record<string, unknown>;

  return (
    item.success === true &&
    (
      item.code ===
        "C160_MARKET_RESEARCH_OUTCOME_RECONCILIATION_PASS" ||
      item.code ===
        "C160_MARKET_RESEARCH_OUTCOME_RECONCILIATION_PARTIAL"
    ) &&
    typeof item.symbol ===
      "string" &&
    typeof item.market ===
      "string" &&
    Array.isArray(
      item.conditionReviews,
    ) &&
    Array.isArray(
      item.findings,
    ) &&
    typeof item.reconciliation ===
      "object" &&
    item.reconciliation !== null
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
      await runMarketResearchInvalidationLedgerRegression(),
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }

  const ledgerId =
    url.searchParams.get(
      "ledgerId",
    );

  if (ledgerId) {
    const ledger =
      await getMarketResearchInvalidationLedger(
        ledgerId,
      );

    return NextResponse.json(
      {
        success:
          Boolean(ledger),
        code:
          ledger
            ? "C161_1_RESEARCH_INVALIDATION_LEDGER_FOUND"
            : "C161_1_RESEARCH_INVALIDATION_LEDGER_NOT_FOUND",
        ledger,
        humanReviewRequired:
          true,
      },
      {
        status:
          ledger ? 200 : 404,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }

  return NextResponse.json(
    {
      success: true,
      code:
        "C161_1_RESEARCH_INVALIDATION_LEDGER_READY",
      runtime:
        "market-research-invalidation-ledger-runtime",
      version:
        "C161.1",
      upstream:
        "C160",
      humanReviewRequired:
        true,
      automaticInvalidationEvaluation:
        false,
      recommendationGenerated:
        false,
      decisionAutomaticallyGenerated:
        false,
      decisionRecorded:
        false,
      taskCreated:
        false,
      plannerDispatched:
        false,
      brokerConnected:
        false,
      liveOrderPlaced:
        false,
      tradingExecuted:
        false,
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

export async function POST(
  request: NextRequest,
) {
  if (
    !isFounderRequest(
      request,
    )
  ) {
    return unauthorized();
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
          "C161_1_INVALID_REQUEST",
        error:
          "Request body must be valid JSON.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      {
        success: false,
        code:
          "C161_1_INVALID_REQUEST",
        error:
          "Request body must be an object.",
      },
      {
        status: 400,
      },
    );
  }

  const reconciliation =
    (body as Record<string, unknown>)
      .reconciliation;

  if (
    !isReconciliation(
      reconciliation,
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        code:
          "C161_1_INVALID_REQUEST",
        error:
          "A valid C160 reconciliation result is required.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const result =
      await runMarketResearchInvalidationLedger(
        {
          reconciliation,
        },
      );

    return NextResponse.json(
      result,
      {
        status:
          result.success
            ? 200
            : 422,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        code:
          "C161_1_RESEARCH_INVALIDATION_LEDGER_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "C161.1 ledger creation failed.",
        humanReviewRequired:
          true,
        boundary: {
          automaticInvalidationEvaluation:
            false,
          decisionAutomaticallyGenerated:
            false,
          decisionRecorded:
            false,
          taskCreated:
            false,
          plannerDispatched:
            false,
          brokerConnected:
            false,
          liveOrderPlaced:
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
