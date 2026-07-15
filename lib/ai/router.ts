import type {
  AIProvider,
  ChatResponse,
} from "./types";

import { AI_CONFIG } from "./config";
import { providers } from "./registry";

export function getActiveProvider(): AIProvider {
  const defaultProvider =
    providers[AI_CONFIG.defaultProvider];

  if (defaultProvider?.enabled) {
    return AI_CONFIG.defaultProvider;
  }

  return AI_CONFIG.fallbackProvider;
}

export async function chat(
  prompt: string
): Promise<ChatResponse> {
  const activeProvider =
    getActiveProvider();

  const provider =
    providers[activeProvider];

  try {
    return await provider.chat(prompt);
  } catch (error) {
    console.warn(
      `[AIOS Provider Error: ${activeProvider}]`,
      error
    );

    const fallback =
      providers[
        AI_CONFIG.fallbackProvider
      ];

    if (
      activeProvider !==
      AI_CONFIG.fallbackProvider
    ) {
      return fallback.chat(prompt);
    }

    return {
      success: false,
      provider:
        AI_CONFIG.fallbackProvider,
      content:
        "AIOS Provider 暂时不可用。",
    };
  }
}

export function getProvider(): AIProvider {
  return getActiveProvider();
}