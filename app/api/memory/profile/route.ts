import { NextResponse } from "next/server";

import { buildMemoryProfile } from "@/lib/memory/index";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile =
      buildMemoryProfile();

    const completedFields =
      Object.values(profile).filter(
        (value) =>
          typeof value === "string" &&
          value.trim().length > 0
      ).length;

    return NextResponse.json({
      success: true,
      profile,
      completedFields,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error(
      "[AIOS Memory Profile]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        profile: {},
        completedFields: 0,
        timestamp: Date.now(),
      },
      {
        status: 500,
      }
    );
  }
}