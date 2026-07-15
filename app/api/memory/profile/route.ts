import {
  NextResponse,
} from "next/server";

import {
  buildMemoryProfile,
  type MemoryProfile,
} from "@/lib/memory/index";

import {
  clearPersistentManualProfile,
  hydrateManualProfile,
  updateAndSaveManualProfile,
} from "@/lib/memory/profile-store";

import {
  hydrateMemory,
} from "@/lib/memory/store";

export const dynamic =
  "force-dynamic";

function createResponse() {
  const profile =
    buildMemoryProfile();

  const completedFields =
    Object.values(
      profile
    ).filter(
      (value) =>
        typeof value ===
          "string" &&
        value.trim().length >
          0
    ).length;

  return {
    success: true,
    profile,
    completedFields,
    timestamp:
      Date.now(),
  };
}

async function hydrateProfileData():
  Promise<void> {
  await Promise.all([
    hydrateMemory(),
    hydrateManualProfile(),
  ]);
}

export async function GET() {
  try {
    await hydrateProfileData();

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
        error:
          error instanceof Error
            ? error.message
            : "Memory Profile loading failed.",
        timestamp:
          Date.now(),
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

    await hydrateMemory();

    await updateAndSaveManualProfile(
      body
    );

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
        profile: {},
        completedFields: 0,
        message:
          "Memory Profile 保存失败。",
        error:
          error instanceof Error
            ? error.message
            : "Memory Profile saving failed.",
        timestamp:
          Date.now(),
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE() {
  try {
    await hydrateMemory();

    await clearPersistentManualProfile();

    /*
     * 只重置手动资料。
     * 从 Conversation Memory
     * 自动提取出的资料仍会保留。
     */
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
        profile: {},
        completedFields: 0,
        message:
          "Memory Profile 重置失败。",
        error:
          error instanceof Error
            ? error.message
            : "Memory Profile reset failed.",
        timestamp:
          Date.now(),
      },
      {
        status: 500,
      }
    );
  }
}