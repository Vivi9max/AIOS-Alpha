import { NextResponse } from "next/server";

import { getProvider } from "@/lib/ai/router";
import { getMemory } from "@/lib/memory/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const memory = getMemory();

  return NextResponse.json({
    success: true,
    runtime: "aios-alpha",
    version: "0.2",
    status: "online",
    provider: getProvider(),
    memoryCount: memory.length,
    timestamp: Date.now(),
  });
}