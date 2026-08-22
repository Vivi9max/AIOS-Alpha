import { NextRequest, NextResponse } from "next/server";
import { resolveAlphaIdentity, AIOS_USER_COOKIE } from "@/lib/auth/identity";
import { registerEvolutionTarget } from "@/lib/evolution/heartbeat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const identity = resolveAlphaIdentity(request);

  try {
    const result = await registerEvolutionTarget(identity.userId);
    const response = NextResponse.json({
      success: true,
      ...result,
      message: "AIOS workspace registered for autonomous Evolution Heartbeats.",
      timestamp: Date.now(),
    });

    response.cookies.set(AIOS_USER_COOKIE, identity.userId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Evolution target registration failed.",
      },
      { status: 500 },
    );
  }
}
