import { NextResponse } from "next/server";
import { getAlphaAccessStatus } from "@/lib/auth/alpha-access";

export async function GET() {
  return NextResponse.json({
    success: true,
    project: "AIOS Alpha",
    ...getAlphaAccessStatus(),
    timestamp: Date.now(),
  });
}