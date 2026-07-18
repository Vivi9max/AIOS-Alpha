import {
  NextResponse,
} from "next/server";

import {
  APP_CONFIG,
} from "@/lib/config/app";

import {
  getLastRuntimeTrace,
} from "@/lib/runtime/trace-store";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

export async function GET() {
  const trace =
    getLastRuntimeTrace();

  return NextResponse.json(
    {
      success:
        true,

      runtime:
        APP_CONFIG.runtimeId,

      version:
        APP_CONFIG.version,

      hasTrace:
        trace !== null,

      trace,

      timestamp:
        Date.now(),
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}