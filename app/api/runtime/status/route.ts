import { NextResponse } from "next/server";

import { getMemory } from "@/lib/memory/store";

import {
  getProviderRuntimeStatus,
  providerStatus,
} from "@/lib/runtime/providerManager";

export const dynamic =
  "force-dynamic";

export async function GET() {
  try {
    const memory =
      getMemory();

    const provider =
      providerStatus();

    const diagnostics =
      getProviderRuntimeStatus();

    return NextResponse.json({
      success: true,

      runtime: "aios-alpha",

      version: "0.2",

      status: "online",

      provider:
        provider.current,

      currentProvider:
        provider.currentProvider,

      providers:
        provider.providers,

      providerRuntime:
        diagnostics,

      memoryCount:
        memory.length,

      modules: {
        brain: {
          enabled: true,
          status: "ready",
        },

        memory: {
          enabled: true,
          status: "ready",
        },

        tasks: {
          enabled: true,
          status: "ready",
        },

        diagnostics: {
          enabled: true,
          status: "ready",
        },
      },

      timestamp: Date.now(),
    });
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
        success: false,

        runtime: "aios-alpha",

        version: "0.2",

        status: "offline",

        provider: "unknown",

        currentProvider: null,

        providers: [],

        providerRuntime: {
          provider: "mock",
          requestedProvider:
            "mock",
          fallbackUsed: false,
          success: false,
          error: errorMessage,
          latencyMs: 0,
          lastRequestAt:
            Date.now(),
        },

        memoryCount: 0,

        modules: {
          brain: {
            enabled: false,
            status: "error",
          },

          memory: {
            enabled: false,
            status: "error",
          },

          tasks: {
            enabled: false,
            status: "error",
          },

          diagnostics: {
            enabled: false,
            status: "error",
          },
        },

        timestamp: Date.now(),
      },
      {
        status: 500,
      }
    );
  }
}