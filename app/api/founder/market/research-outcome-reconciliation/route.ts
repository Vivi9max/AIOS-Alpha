import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketResearchOutcomeReconciliation,
} from "@/lib/runtime/market/market-research-outcome-reconciliation-runtime";

import {
  runMarketResearchOutcomeReconciliationRegression,
} from "@/lib/runtime/market/market-research-outcome-reconciliation-regression";

import type {
  MarketRegion,
} from "@/lib/runtime/market/market-types";

import type {
  MarketDecisionWorkspaceItem,
} from "@/lib/runtime/market/market-decision-workspace-types";

import type {
  MarketPaperTradePerformanceResult,
} from "@/lib/runtime/market/market-paper-trade-performance-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeMarket(value: unknown): MarketRegion | null {
  if (value === "us" || value === "hk" || value === "cn") return value;
  return null;
}

function isDecisionWorkspaceItem(
  value: unknown,
): value is MarketDecisionWorkspaceItem {
  if (!isObject(value)) return false;
  return (
    typeof value.decisionId === "string" &&
    typeof value.symbol === "string" &&
    typeof value.market === "string" &&
    isObject(value.evidence) &&
    Array.isArray(value.invalidationConditions)
  );
}

function isPerformanceReview(
  value: unknown,
): value is MarketPaperTradePerformanceResult {
  if (!isObject(value)) return false;
  return (
    typeof value.success === "boolean" &&
    typeof value.code === "string" &&
    typeof value.symbol === "string" &&
    typeof value.market === "string" &&
    isObject(value.metrics) &&
    isObject(value.dataQuality) &&
    isObject(value.boundary)
  );
}

export async function POST(request: NextRequest) {
  if (!isFounderRequest(request)) {
    return NextResponse.json(
      { success: false, code: "FOUNDER_AUTH_REQUIRED" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        code: "C160_INVALID_REQUEST",
        error: "Request body must be valid JSON.",
      },
      { status: 400 },
    );
  }

  if (!isObject(body)) {
    return NextResponse.json(
      {
        success: false,
        code: "C160_INVALID_REQUEST",
        error: "Request body must be an object.",
      },
      { status: 400 },
    );
  }

  const symbol =
    typeof body.symbol === "string"
      ? body.symbol.trim().toUpperCase()
      : "";
  const market = normalizeMarket(body.market);
  const decisionWorkspace = body.decisionWorkspace;
  const performanceReview = body.performanceReview;

  if (
    !symbol ||
    !market ||
    !isDecisionWorkspaceItem(decisionWorkspace) ||
    !isPerformanceReview(performanceReview)
  ) {
    return NextResponse.json(
      {
        success: false,
        code: "C160_INVALID_REQUEST",
        error:
          "symbol, market, decisionWorkspace and performanceReview are required.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await runMarketResearchOutcomeReconciliation({
      symbol,
      market,
      decisionWorkspace,
      performanceReview,
      query: typeof body.query === "string" ? body.query : null,
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 422,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        code: "C160_MARKET_RESEARCH_OUTCOME_RECONCILIATION_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "C160 reconciliation failed.",
        boundary: {
          humanDecisionRequired: true,
          decisionAutomaticallyGenerated: false,
          decisionRecorded: false,
          taskCreated: false,
          plannerDispatched: false,
          brokerConnected: false,
          liveOrderPlaced: false,
          tradingExecuted: false,
        },
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  if (!isFounderRequest(request)) {
    return NextResponse.json(
      { success: false, code: "FOUNDER_AUTH_REQUIRED" },
      { status: 401 },
    );
  }

  if (request.nextUrl.searchParams.get("regression") === "true") {
    return NextResponse.json(
      await runMarketResearchOutcomeReconciliationRegression(),
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json({
    success: true,
    code: "C160_MARKET_RESEARCH_OUTCOME_RECONCILIATION_READY",
    runtime: "market-research-outcome-reconciliation",
    version: "C160.1",
    upstream: {
      decisionWorkspace: "C157.1",
      paperTradeGate: "C158",
      paperTrading: "C151",
      performanceReview: "C159.1",
      liveTradingBoundary: "C152",
    },
    requirements: [
      "valid-C157-decision-workspace-item",
      "valid-C159-performance-review",
      "same-symbol-and-market",
    ],
    boundaries: {
      recommendationGenerated: false,
      decisionAutomaticallyGenerated: false,
      decisionRecorded: false,
      taskCreated: false,
      plannerDispatched: false,
      brokerConnected: false,
      liveOrderPlaced: false,
      tradingExecuted: false,
    },
    humanDecisionRequired: true,
  });
}
