import {
  NextResponse,
} from "next/server";

import {
  getStorageHealth,
  getStorageMode,
} from "@/lib/server-storage";

export const dynamic =
  "force-dynamic";

export async function GET() {
  const mode =
    getStorageMode();

  try {
    const health =
      await getStorageHealth();

    return NextResponse.json({
      success:
        health.success,

      mode,

      persistent:
        mode === "redis",

      error:
        health.error,

      timestamp:
        Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        mode,

        persistent: false,

        error:
          error instanceof Error
            ? error.message
            : "Storage status failed.",

        timestamp:
          Date.now(),
      },
      {
        status: 500,
      }
    );
  }
}