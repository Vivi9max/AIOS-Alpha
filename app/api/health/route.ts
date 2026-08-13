import { NextResponse } from "next/server";
import manifest from "../../../aios-alpha.manifest.json";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "AIOS Alpha",
      release: manifest.release,
      status: manifest.status,
      locale: manifest.defaultLocale,
      timestamp: new Date().toISOString(),
      checks: { application: "ok", manifest: "ok" }
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
