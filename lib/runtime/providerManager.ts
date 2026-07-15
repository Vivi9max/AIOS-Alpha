import type { AIProvider } from "@/lib/ai/types";

import { AI_CONFIG } from "@/lib/ai/config";
import { getActiveProvider } from "@/lib/ai/router";

export interface RuntimeProvider {
  id: AIProvider;
  name: string;
  enabled: boolean;
  configured: boolean;
}

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

export function getCurrentProvider(): RuntimeProvider {
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

export function listProviders(): RuntimeProvider[] {
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