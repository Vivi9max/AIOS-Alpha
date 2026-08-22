import { NextRequest, NextResponse } from "next/server";
import { listEvolutionTargets, runEvolutionHeartbeat } from "@/lib/evolution/heartbeat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret) &&
    request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const targets = await listEvolutionTargets();

  if (targets.length === 0) {
    return NextResponse.json({
      success: true,
      ran: false,
      reason: "No Evolution target is registered yet. Open /api/evolution/register once from the AIOS workspace.",
      timestamp: Date.now(),
    });
  }

  const results = [];
  for (const userId of targets) {
    try {
      results.push(await runEvolutionHeartbeat(userId));
    } catch (error) {
      results.push({
        userId,
        success: false,
        error: error instanceof Error ? error.message : "Evolution heartbeat failed.",
      });
    }
  }

  return NextResponse.json({
    success: true,
    ran: true,
    targetCount: targets.length,
    results,
    timestamp: Date.now(),
  });
}
