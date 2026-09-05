import {
  NextResponse,
} from "next/server";

import {
  APP_CONFIG,
} from "@/lib/config/app";

import {
  getMemory,
} from "@/lib/memory/store";

import {
  getRuntimeHealth,
  listProviders,
  providerStatus,
} from "@/lib/runtime/providerManager";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

export async function GET() {
  try {
    const memory =
      getMemory();

    const provider =
      providerStatus();

    const health =
      getRuntimeHealth();

    const providers =
      listProviders();

    return NextResponse.json(
      {
        success:
          true,

        runtime:
          APP_CONFIG.runtimeId,

        stage:
          APP_CONFIG.stage,

        version:
          APP_CONFIG.version,

        versionLabel:
          APP_CONFIG.fullTitle,

        codename:
          APP_CONFIG.codename,

        status:
          health.status,

        provider:
          provider.current,

        currentProvider:
          provider.currentProvider,

        providers,

        providerRuntime:
          health.providerRuntime,

        health: {
          status:
            health.status,

          reasons:
            health.reasons,
        },

        memoryCount:
          memory.length,

        modules: {
          brain: {
            enabled:
              true,

            status:
              "ready",
          },

          memory: {
            enabled:
              true,

            status:
              "ready",
          },

          tasks: {
            enabled:
              true,

            status:
              "ready",
          },

          diagnostics: {
            enabled:
              true,

            status:
              "ready",
          },
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
        : "Runtime Status Error";

    console.error(
      "[AIOS Runtime Status]",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        runtime:
          APP_CONFIG.runtimeId,

        stage:
          APP_CONFIG.stage,

        version:
          APP_CONFIG.version,

        versionLabel:
          APP_CONFIG.fullTitle,

        codename:
          APP_CONFIG.codename,

        status:
          "offline",

        provider:
          "unknown",

        currentProvider:
          null,

        providers:
          [],

        providerRuntime: {
          provider:
            "mock",

          requestedProvider:
            "mock",

          fallbackUsed:
            false,

          success:
            false,

          error:
            errorMessage,

          latencyMs:
            0,

          lastRequestAt:
            Date.now(),
        },

        health: {
          status:
            "offline",

          reasons: [
            errorMessage,
          ],
        },

        memoryCount:
          0,

        modules: {
          brain: {
            enabled:
              false,

            status:
              "error",
          },

          memory: {
            enabled:
              false,

            status:
              "error",
          },

          tasks: {
            enabled:
              false,

            status:
              "error",
          },

          diagnostics: {
            enabled:
              false,

            status:
              "error",
          },
        },

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
