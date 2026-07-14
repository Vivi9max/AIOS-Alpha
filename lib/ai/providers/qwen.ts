import type {
  AIProviderAdapter,
  ChatResponse,
} from "../types";

import { AI_CONFIG } from "../config";

export const qwenProvider: AIProviderAdapter = {
  enabled:
    AI_CONFIG.providers.qwen.enabled &&
    AI_CONFIG.providers.qwen.apiKey.length > 0,

  async chat(prompt: string): Promise<ChatResponse> {
    return {
      success: false,
      provider: "qwen",
      content:
        "Qwen Provider Ready (API not connected yet)",
    };
  },
};