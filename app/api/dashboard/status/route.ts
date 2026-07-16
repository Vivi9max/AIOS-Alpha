import {
  NextResponse,
} from "next/server";

import {
  getPersistentMemory,
} from "@/lib/memory/store";

import {
  buildMemoryProfile,
} from "@/lib/memory/index";

import {
  hydrateManualProfile,
} from "@/lib/memory/profile-store";

import {
  listPersistentTasks,
} from "@/lib/task/server-store";

import {
  getProviderRuntimeStatus,
  providerStatus,
} from "@/lib/runtime/providerManager";

import {
  getStorageHealth,
  getStorageMode,
} from "@/lib/server-storage";

export const dynamic =
  "force-dynamic";

function countProfileFields(
  profile: Record<
    string,
    unknown
  >
): number {
  return Object.values(
    profile
  ).filter(
    (value) =>
      typeof value ===
        "string" &&
      value.trim().length > 0
  ).length;
}

export async function GET() {
  try {
    await hydrateManualProfile();

    const [
      memory,
      tasks,
      storageHealth,
    ] = await Promise.all([
      getPersistentMemory(),
      listPersistentTasks(),
      getStorageHealth(),
    ]);

    const provider =
      providerStatus();

    const providerRuntime =
      getProviderRuntimeStatus();

    const profile =
      buildMemoryProfile();

    const completedTasks =
      tasks.filter(
        (task) =>
          task.status === "done"
      ).length;

    const activeTasks =
      tasks.filter(
        (task) =>
          task.status !== "done"
      ).length;

    return NextResponse.json({
      success: true,

      runtime: {
        id: "aios-alpha",
        version: "0.2",
        status: "online",
      },

      provider: {
        configured:
          provider.current,

        active:
          providerRuntime.provider,

        requested:
          providerRuntime
            .requestedProvider,

        fallbackUsed:
          providerRuntime
            .fallbackUsed,

        success:
          providerRuntime.success,

        latencyMs:
          providerRuntime.latencyMs ??
          null,

        error:
          providerRuntime.error ??
          null,

        lastRequestAt:
          providerRuntime
            .lastRequestAt,
      },

      storage: {
        mode:
          getStorageMode(),

        persistent:
          getStorageMode() ===
          "redis",

        healthy:
          storageHealth.success,

        error:
          storageHealth.error ??
          null,
      },

      memory: {
        count:
          memory.length,

        userMessages:
          memory.filter(
            (item) =>
              item.role === "user"
          ).length,

        assistantMessages:
          memory.filter(
            (item) =>
              item.role ===
              "assistant"
          ).length,
      },

      profile: {
        completedFields:
          countProfileFields(
            profile
          ),

        totalFields: 5,
      },

      tasks: {
        count:
          tasks.length,

        active:
          activeTasks,

        completed:
          completedTasks,
      },

      timestamp:
        Date.now(),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Dashboard loading failed.";

    console.error(
      "[AIOS Dashboard Status]",
      error
    );

    return NextResponse.json(
      {
        success: false,

        runtime: {
          id: "aios-alpha",
          version: "0.2",
          status: "offline",
        },

        provider: {
          configured:
            "unknown",
          active: "unknown",
          requested: "unknown",
          fallbackUsed: false,
          success: false,
          latencyMs: null,
          error:
            errorMessage,
          lastRequestAt: null,
        },

        storage: {
          mode: "unknown",
          persistent: false,
          healthy: false,
          error:
            errorMessage,
        },

        memory: {
          count: 0,
          userMessages: 0,
          assistantMessages: 0,
        },

        profile: {
          completedFields: 0,
          totalFields: 5,
        },

        tasks: {
          count: 0,
          active: 0,
          completed: 0,
        },

        timestamp:
          Date.now(),
      },
      {
        status: 500,
      }
    );
  }
}