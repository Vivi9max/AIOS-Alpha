import { NextResponse } from "next/server";

import {
  buildMemoryProfile,
  type MemoryProfile,
} from "@/lib/memory/index";

import {
  clearManualProfile,
  updateManualProfile,
} from "@/lib/memory/profile-store";

export const dynamic = "force-dynamic";

function createResponse() {
  const profile =
    buildMemoryProfile();

  const completedFields =
    Object.values(profile).filter(
      (value) =>
        typeof value === "string" &&
        value.trim().length > 0
    ).length;

  return {
    success: true,
    profile,
    completedFields,
    timestamp: Date.now(),
  };
}

export async function GET() {
  try {
    return NextResponse.json(
      createResponse()
    );
  } catch (error) {
    console.error(
      "[AIOS Memory Profile GET]",
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

export async function PUT(
  request: Request
) {
  try {
    const body =
      (await request.json()) as Partial<MemoryProfile>;

    updateManualProfile(body);

    return NextResponse.json(
      createResponse()
    );
  } catch (error) {
    console.error(
      "[AIOS Memory Profile PUT]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Memory Profile 保存失败。",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE() {
  try {
    clearManualProfile();

    return NextResponse.json(
      createResponse()
    );
  } catch (error) {
    console.error(
      "[AIOS Memory Profile DELETE]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Memory Profile 重置失败。",
      },
      {
        status: 500,
      }
    );
  }
}