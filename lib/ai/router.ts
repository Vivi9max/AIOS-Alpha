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
    const result =
      await provider.chat(prompt);

    return {
      ...result,
      requestedProvider:
        activeProvider,
      fallbackUsed: false,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "未知 Provider 错误";

    console.error(
      `[AIOS Provider Error: ${activeProvider}]`,
      error
    );

    const fallbackProvider =
      AI_CONFIG.fallbackProvider;

    if (
      activeProvider !==
      fallbackProvider
    ) {
      const fallback =
        providers[fallbackProvider];

      const fallbackResult =
        await fallback.chat(prompt);

      return {
        ...fallbackResult,
        requestedProvider:
          activeProvider,
        fallbackUsed: true,
        error: errorMessage,
      };
    }

    return {
      success: false,
      provider:
        fallbackProvider,
      requestedProvider:
        activeProvider,
      fallbackUsed: false,
      error: errorMessage,
      content:
        "AIOS Provider 暂时不可用。",
    };
  }
}

export function getProvider(): AIProvider {
  return getActiveProvider();
}