import { NextResponse } from "next/server";

import { getMemory } from "@/lib/memory/store";
import { providerStatus } from "@/lib/runtime/providerManager";

export const dynamic =
  "force-dynamic";

export async function GET() {
  try {
    const memory =
      getMemory();

    const provider =
      providerStatus();

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
      },

      timestamp: Date.now(),
    });
  } catch (error) {
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
        memoryCount: 0,
        modules: {
          brain: {
            enabled: false,
            status: "disabled",
          },

          memory: {
            enabled: false,
            status: "disabled",
          },

          tasks: {
            enabled: false,
            status: "disabled",
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