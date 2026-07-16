import {
  NextResponse,
} from "next/server";

import {
  getNamespacedStorageKey,
  getStorageHealth,
  getStorageMode,
  getWorkspaceId,
} from "@/lib/server-storage";

export const dynamic =
  "force-dynamic";

export async function GET() {
  const mode =
    getStorageMode();

  const workspaceId =
    getWorkspaceId();

  try {
    const health =
      await getStorageHealth();

    return NextResponse.json({
      success:
        health.success,

      mode,

      persistent:
        mode === "redis",

      workspace: {
        id:
          workspaceId,

        conversationMemoryKey:
          getNamespacedStorageKey(
            "aios:default:conversation-memory"
          ),

        manualProfileKey:
          getNamespacedStorageKey(
            "aios:default:manual-profile"
          ),

        tasksKey:
          getNamespacedStorageKey(
            "aios:default:tasks"
          ),
      },

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

        workspace: {
          id:
            workspaceId,
        },

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