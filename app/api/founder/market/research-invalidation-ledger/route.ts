import { NextRequest, NextResponse } from "next/server";
import { isFounderRequest } from "@/lib/founder/auth";
import { runMarketResearchInvalidationLedger } from "@/lib/runtime/market/market-research-invalidation-ledger-runtime";
import { runMarketResearchInvalidationLedgerRegression } from "@/lib/runtime/market/market-research-invalidation-ledger-regression";
import type { MarketRegion } from "@/lib/runtime/market/market-types";
import type { MarketResearchOutcomeReconciliationResult } from "@/lib/runtime/market/market-research-outcome-reconciliation-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeMarket(value: unknown): MarketRegion | null {
  if (value === "us" || value === "hk" || value === "cn") return value;
  return null;
}

function isReconciliationResult(value: unknown): value is MarketResearchOutcomeReconciliationResult {
  if (!isObject(value)) return false;
  return (
    typeof value.success === "boolean" &&
    typeof value.code === "string" &&
    typeof value.symbol === "string" &&
    typeof value.market === "string" &&
    isObject(value.reconciliation) &&
    Array.isArray(value.conditionReviews) &&
    Array.isArray(value.findings) &&
    isObject(value.boundary)
  );
}

export async function POST(request: NextRequest) {
  if (!isFounderRequest(request)) {
    return NextResponse.json({ success: false, code: "FOUNDER_AUTH_REQUIRED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, code: "C161_INVALID_REQUEST", error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (!isObject(body)) {
    return NextResponse.json(
      { success: false, code: "C161_INVALID_REQUEST", error: "Request body must be an object." },
      { status: 400 },
    );
  }

  const symbol = typeof body.symbol === "string" ? body.symbol.trim().toUpperCase() : "";
  const market = normalizeMarket(body.market);
  const reconciliation = body.reconciliation;

  if (!symbol || !market || !isReconciliationResult(reconciliation)) {
    return NextResponse.json(
      {
        success: false,
        code: "C161_INVALID_REQUEST",
        error: "symbol, market and reconciliation are required.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await runMarketResearchInvalidationLedger({
      symbol,
      market,
      reconciliation,
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
        code: "C161_MARKET_RESEARCH_INVALIDATION_LEDGER_ERROR",
        error: error instanceof Error ? error.message : "C161 ledger construction failed.",
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
    return NextResponse.json({ success: false, code: "FOUNDER_AUTH_REQUIRED" }, { status: 401 });
  }

  if (request.nextUrl.searchParams.get("regression") === "true") {
    return NextResponse.json(await runMarketResearchInvalidationLedgerRegression(), {
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json({
    success: true,
    code: "C161_MARKET_RESEARCH_INVALIDATION_LEDGER_READY",
    runtime: "market-research-invalidation-ledger",
    version: "C161.1",
    upstream: {
      reconciliation: "C160.1",
      performanceReview: "C159.1",
      decisionWorkspace: "C157.1",
      paperTrading: "C151",
      liveTradingBoundary: "C152",
    },
    requirements: ["valid-C160-reconciliation", "same-symbol-and-market"],
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
