import { NextRequest, NextResponse } from "next/server";
import { AIOS_USER_COOKIE, resolveAlphaIdentity } from "@/lib/auth/identity";
import { listExecutionLedger } from "@/lib/planner/execution-ledger";
import { buildExecutionReview } from "@/lib/planner/execution-review";
import { runWithUserContext } from "@/lib/runtime/request-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const identity = resolveAlphaIdentity(request);

  try {
    const review = await runWithUserContext(identity.userId, async () =>
      buildExecutionReview(await listExecutionLedger(50))
    );
    const response = NextResponse.json({
      success: true,
      review,
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
      error: error instanceof Error ? error.message : "Execution review failed.",
      timestamp: Date.now(),
    }, { status: 500 });
  }
}
