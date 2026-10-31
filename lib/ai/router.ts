import type {
  AIProvider,
  AIChatOptions,
  ChatResponse,
} from "./types";

import { AI_CONFIG } from "./config";
import { providers } from "./registry";

function uniqueProviders(values: AIProvider[]): AIProvider[] {
  return values.filter(
    (provider, index, list) => list.indexOf(provider) === index
  );
}

export function getProviderChain(): AIProvider[] {
  return uniqueProviders([
    AI_CONFIG.defaultProvider,
    ...AI_CONFIG.providerChain,
  ]).filter(
    (provider) =>
      provider !== "mock" && providers[provider]?.enabled
  );
}

export function getActiveProvider(): AIProvider {
  return getProviderChain()[0] ?? AI_CONFIG.fallbackProvider;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function chat(
  prompt: string,
  options?: AIChatOptions
): Promise<ChatResponse> {
  const chain = getProviderChain();
  const requestedProvider = chain[0] ?? AI_CONFIG.defaultProvider;
  const failures: string[] = [];

  for (let index = 0; index < chain.length; index += 1) {
    const providerId = chain[index];
    const provider = providers[providerId];

    try {
      const result = await provider.chat(prompt, options);

      if (!result.success) {
        failures.push(
          `${providerId}: ${result.error ?? result.content}`
        );
        continue;
      }

      return {
        ...result,
        requestedProvider,
        fallbackUsed: index > 0,
        error:
          failures.length > 0 ? failures.join(" | ") : undefined,
      };
    } catch (error) {
      const message = getErrorMessage(error);
      failures.push(`${providerId}: ${message}`);
      console.error(`[AIOS Provider Error: ${providerId}]`, error);
    }
  }

  return {
    success: false,
    provider: AI_CONFIG.fallbackProvider,
    requestedProvider,
    fallbackUsed: chain.length > 0,
    error:
      failures.length > 0
        ? failures.join(" | ")
        : "No configured intelligence provider is available.",
    content: "AIOS intelligence providers are temporarily unavailable.",
  };
}

export function getProvider(): AIProvider {
  return getActiveProvider();
}
