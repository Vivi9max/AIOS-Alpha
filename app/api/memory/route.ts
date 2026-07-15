import {
  NextResponse,
} from "next/server";

import {
  clearPersistentMemory,
  getPersistentMemory,
} from "@/lib/memory/store";

export const dynamic =
  "force-dynamic";

export async function GET() {
  try {
    const items =
      await getPersistentMemory();

    return NextResponse.json({
      success: true,
      items,
      count: items.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error(
      "[AIOS Memory GET]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        items: [],
        count: 0,
        error:
          error instanceof Error
            ? error.message
            : "Memory loading failed.",
        timestamp: Date.now(),
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE() {
  try {
    await clearPersistentMemory();

    return NextResponse.json({
      success: true,
      items: [],
      count: 0,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error(
      "[AIOS Memory DELETE]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        items: [],
        count: 0,
        error:
          error instanceof Error
            ? error.message
            : "Memory clearing failed.",
        timestamp: Date.now(),
      },
      {
        status: 500,
      }
    );
  }
}