import { NextResponse } from "next/server";

import { getRuntimeStatus } from "@/lib/runtime/status";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(
      getRuntimeStatus()
    );
  } catch (error) {
    console.error(
      "[AIOS Runtime Status]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        runtime: "aios-alpha",
        version: "0.2",
        status: "offline",
        provider: "unknown",
        memoryCount: 0,
        modules: {
          brain: {
            enabled: false,
            status: "disabled",
          },
          memory: {
            enabled: false,
            status: "disabled",
          },
          tasks: {
            enabled: false,
            status: "disabled",
          },
        },
        timestamp: Date.now(),
      },
      {
        status: 500,
      }
    );
  }
}