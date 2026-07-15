import type {
  AIProvider,
} from "@/lib/ai/types";

import { AI_CONFIG } from "@/lib/ai/config";
import { getActiveProvider } from "@/lib/ai/router";

export interface RuntimeProvider {
  id: AIProvider;
  name: string;
  enabled: boolean;
  configured: boolean;
}

export interface ProviderRuntimeStatus {
  provider: AIProvider;
  requestedProvider: AIProvider;
  fallbackUsed: boolean;
  success: boolean;
  error?: string;
  latencyMs?: number;
  lastRequestAt: number | null;
}

type ProviderManagerGlobal =
  typeof globalThis & {
    __aiosProviderRuntimeStatus?:
      ProviderRuntimeStatus;
  };

const globalProviderManager =
  globalThis as ProviderManagerGlobal;

const providerNames: Record<
  AIProvider,
  string
> = {
  mock: "Mock",
  qwen: "Qwen",
  deepseek: "DeepSeek",
  openai: "OpenAI",
  gemini: "Gemini",
  claude: "Claude",
};

const providerIds = Object.keys(
  AI_CONFIG.providers
) as AIProvider[];

function hasApiKey(
  provider: AIProvider
): boolean {
  const config =
    AI_CONFIG.providers[provider];

  if (
    "apiKey" in config &&
    typeof config.apiKey === "string"
  ) {
    return (
      config.apiKey.trim().length > 0
    );
  }

  return provider === "mock";
}

function createInitialRuntimeStatus():
  ProviderRuntimeStatus {
  const activeProvider =
    getActiveProvider();

  return {
    provider: activeProvider,
    requestedProvider:
      activeProvider,
    fallbackUsed: false,
    success: true,
    lastRequestAt: null,
  };
}

export function getCurrentProvider():
  RuntimeProvider {
  const current =
    getActiveProvider();

  const config =
    AI_CONFIG.providers[current];

  return {
    id: current,
    name:
      providerNames[current] ??
      current,
    enabled: config.enabled,
    configured:
      hasApiKey(current),
  };
}

export function listProviders():
  RuntimeProvider[] {
  return providerIds.map(
    (id) => {
      const config =
        AI_CONFIG.providers[id];

      return {
        id,
        name:
          providerNames[id] ?? id,
        enabled: config.enabled,
        configured:
          hasApiKey(id),
      };
    }
  );
}

export function providerStatus() {
  const current =
    getCurrentProvider();

  return {
    current: current.id,
    currentProvider: current,
    providers: listProviders(),
  };
}

export function updateProviderRuntimeStatus(
  status: ProviderRuntimeStatus
): ProviderRuntimeStatus {
  const nextStatus = {
    ...status,
    error:
      status.error?.trim() ||
      undefined,
  };

  globalProviderManager
    .__aiosProviderRuntimeStatus =
    nextStatus;

  return nextStatus;
}

export function getProviderRuntimeStatus():
  ProviderRuntimeStatus {
  const existing =
    globalProviderManager
      .__aiosProviderRuntimeStatus;

  if (existing) {
    return {
      ...existing,
    };
  }

  const initialStatus =
    createInitialRuntimeStatus();

  globalProviderManager
    .__aiosProviderRuntimeStatus =
    initialStatus;

  return {
    ...initialStatus,
  };
}

export function resetProviderRuntimeStatus():
  ProviderRuntimeStatus {
  const status =
    createInitialRuntimeStatus();

  globalProviderManager
    .__aiosProviderRuntimeStatus =
    status;

  return {
    ...status,
  };
}