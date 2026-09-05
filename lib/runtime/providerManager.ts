import type {
  AIProvider,
} from "@/lib/ai/types";

import {
  AI_CONFIG,
} from "@/lib/ai/config";

import {
  getActiveProvider,
} from "@/lib/ai/router";

export interface RuntimeProvider {
  id: AIProvider;
  name: string;
  enabled: boolean;
  configured: boolean;
}

export interface ProviderRuntimeStatus {
  provider: AIProvider;

  requestedProvider:
    AIProvider;

  fallbackUsed:
    boolean;

  success:
    boolean;

  error?:
    string;

  latencyMs?:
    number;

  lastRequestAt:
    number | null;
}

export type RuntimeHealthStatus =
  | "online"
  | "degraded"
  | "offline";

export interface RuntimeHealth {
  status:
    RuntimeHealthStatus;

  provider:
    RuntimeProvider;

  providerRuntime:
    ProviderRuntimeStatus;

  reasons:
    string[];
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

const providerIds =
  Object.keys(
    AI_CONFIG.providers
  ) as AIProvider[];

function hasApiKey(
  provider: AIProvider
): boolean {
  const config =
    AI_CONFIG.providers[provider];

  if (
    "apiKey" in config &&
    typeof config.apiKey ===
      "string"
  ) {
    return (
      config.apiKey.trim()
        .length > 0
    );
  }

  return provider === "mock";
}

function createInitialRuntimeStatus():
  ProviderRuntimeStatus {
  const activeProvider =
    getActiveProvider();

  return {
    provider:
      activeProvider,

    requestedProvider:
      activeProvider,

    fallbackUsed:
      false,

    success:
      true,

    lastRequestAt:
      null,
  };
}

export function getCurrentProvider():
  RuntimeProvider {
  const current =
    getActiveProvider();

  const config =
    AI_CONFIG.providers[current];

  return {
    id:
      current,

    name:
      providerNames[current] ??
      current,

    enabled:
      config.enabled,

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
          providerNames[id] ??
          id,

        enabled:
          config.enabled,

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
    current:
      current.id,

    currentProvider:
      current,

    providers:
      listProviders(),
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

export function getRuntimeHealth():
  RuntimeHealth {
  const provider =
    getCurrentProvider();

  const providerRuntime =
    getProviderRuntimeStatus();

  const reasons: string[] = [];

  if (!provider.enabled) {
    reasons.push(
      "Current provider is disabled."
    );
  }

  if (!provider.configured) {
    reasons.push(
      "Current provider is not configured."
    );
  }

  if (!providerRuntime.success) {
    reasons.push(
      providerRuntime.error ??
        "Last provider runtime request failed."
    );
  }

  if (providerRuntime.fallbackUsed) {
    reasons.push(
      "Runtime is using a fallback provider."
    );
  }

  let status:
    RuntimeHealthStatus =
    "online";

  if (
    !providerRuntime.success &&
    !providerRuntime.fallbackUsed
  ) {
    status =
      "offline";
  } else if (
    !provider.configured ||
    !provider.enabled ||
    providerRuntime.fallbackUsed ||
    !providerRuntime.success
  ) {
    status =
      "degraded";
  }

  return {
    status,

    provider,

    providerRuntime,

    reasons,
  };
}
