import { NextResponse } from "next/server";

import { getHandoffSnapshot } from "@/lib/runtime/handoff";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      handoff: getHandoffSnapshot(),
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

