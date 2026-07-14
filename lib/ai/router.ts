import type {
  AIProvider,
  ChatResponse,
} from "./types";

import { providers } from "./registry";
import { AI_CONFIG } from "./config";

export async function chat(
  prompt: string
): Promise<ChatResponse> {

  const provider =
    providers[AI_CONFIG.defaultProvider];

  if (provider.enabled) {
    try {
      return await provider.chat(prompt);
    } catch (error) {
      console.warn(error);
    }
  }

  return providers[
    AI_CONFIG.fallbackProvider
  ].chat(prompt);
}

export function getProvider(): AIProvider {
  return AI_CONFIG.defaultProvider;
}