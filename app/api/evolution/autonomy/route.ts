import { NextResponse } from "next/server";
import { evaluateAutonomyGate } from "@/lib/evolution/autonomy-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const result = await evaluateAutonomyGate();

  return NextResponse.json(result, {
    status: result.success ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
