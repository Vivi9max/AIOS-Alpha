import { NextRequest, NextResponse } from "next/server";
import { AIOS_USER_COOKIE, resolveAlphaIdentity } from "@/lib/auth/identity";
import { listExecutionLedger, summarizeExecutionLedger } from "@/lib/planner/execution-ledger";
import { runWithUserContext } from "@/lib/runtime/request-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const identity = resolveAlphaIdentity(request);
  const rawLimit = Number(new URL(request.url).searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(rawLimit) ? rawLimit : 50;

  try {
    const entries = await runWithUserContext(identity.userId, () =>
      listExecutionLedger(limit)
    );
    const response = NextResponse.json({
      success: true,
      entries,
      summary: summarizeExecutionLedger(entries),
      identity: { userId: identity.userId, isolated: true },
      timestamp: Date.now(),
    }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(AIOS_USER_COOKIE, identity.userId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch (error) {
    return NextResponse.json({
      success: false,
      entries: [],
      summary: { total: 0, allowed: 0, blocked: 0, completed: 0, latestAt: null },
      error: error instanceof Error ? error.message : "Execution ledger loading failed.",
      timestamp: Date.now(),
    }, { status: 500 });
  }
}
