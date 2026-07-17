import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

import {
  runWithUserContext,
} from "@/lib/runtime/request-context";

import {
  getPersistentMemory,
} from "@/lib/memory/store";

import {
  buildMemoryProfile,
} from "@/lib/memory/index";

import type {
  MemoryProfile,
} from "@/lib/memory/index";

import {
  hydrateManualProfile,
} from "@/lib/memory/profile-store";

import {
  listPersistentTasks,
} from "@/lib/task/server-store";

import {
  getFeedbackCount,
} from "@/lib/feedback/store";

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

export const runtime =
  "nodejs";

const profileFields: Array<
  keyof MemoryProfile
> = [
  "name",
  "location",
  "project",
  "goal",
  "preference",
];

function countProfileFields(
  profile: MemoryProfile
): number {
  return profileFields.filter(
    (field) => {
      const value =
        profile[field];

      return (
        typeof value ===
          "string" &&
        value.trim().length > 0
      );
    }
  ).length;
}

export async function GET(
  request: NextRequest
) {
  const identity =
    resolveAlphaIdentity(
      request
    );

  try {
    const result =
      await runWithUserContext(
        identity.userId,
        async () => {
          await hydrateManualProfile();

          const [
            memory,
            tasks,
            feedbackCount,
            storageHealth,
          ] =
            await Promise.all([
              getPersistentMemory(),

              listPersistentTasks(),

              getFeedbackCount(),

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
                task.status ===
                "done"
            ).length;

          const activeTasks =
            tasks.filter(
              (task) =>
                task.status !==
                "done"
            ).length;

          const storageMode =
            getStorageMode();

          return {
            runtime: {
              id:
                "aios-alpha",

              version:
                "0.4",

              status:
                "online" as const,
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
                providerRuntime
                  .latencyMs ??
                null,

              error:
                providerRuntime.error ??
                null,

              lastRequestAt:
                providerRuntime
                  .lastRequestAt ??
                null,
            },

            storage: {
              mode:
                storageMode,

              persistent:
                storageMode ===
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
                    item.role ===
                    "user"
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

              totalFields:
                5,
            },

            tasks: {
              count:
                tasks.length,

              active:
                activeTasks,

              completed:
                completedTasks,
            },

            feedback: {
              count:
                feedbackCount,
            },
          };
        }
      );

    return NextResponse.json(
      {
        success:
          true,

        ...result,

        identity: {
          userId:
            identity.userId,

          isolated:
            true,
        },

        timestamp:
          Date.now(),
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
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
        success:
          false,

        runtime: {
          id:
            "aios-alpha",

          version:
            "0.4",

          status:
            "offline",
        },

        provider: {
          configured:
            "unknown",

          active:
            "unknown",

          requested:
            "unknown",

          fallbackUsed:
            false,

          success:
            false,

          latencyMs:
            null,

          error:
            errorMessage,

          lastRequestAt:
            null,
        },

        storage: {
          mode:
            "unknown",

          persistent:
            false,

          healthy:
            false,

          error:
            errorMessage,
        },

        memory: {
          count:
            0,

          userMessages:
            0,

          assistantMessages:
            0,
        },

        profile: {
          completedFields:
            0,

          totalFields:
            5,
        },

        tasks: {
          count:
            0,

          active:
            0,

          completed:
            0,
        },

        feedback: {
          count:
            0,
        },

        identity: {
          userId:
            identity.userId,

          isolated:
            true,
        },

        error:
          errorMessage,

        timestamp:
          Date.now(),
      },
      {
        status:
          500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}