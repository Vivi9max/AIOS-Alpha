import type {
  AIProviderAdapter,
  ChatResponse,
} from "../types";

import { AI_CONFIG } from "../config";

import { createChatCompletion } from "../client";

export const deepseekProvider: AIProviderAdapter = {
  enabled:
    AI_CONFIG.providers.deepseek.enabled &&
    AI_CONFIG.providers.deepseek.apiKey.length > 0,

  async chat(
    prompt: string
  ): Promise<ChatResponse> {

    const result =
      await createChatCompletion({

        apiKey:
          AI_CONFIG.providers.deepseek.apiKey,

        baseURL:
          AI_CONFIG.providers.deepseek.baseURL,

        model:
          AI_CONFIG.providers.deepseek.model,

        prompt,
      });

    return {
      success: true,

      provider: "deepseek",

      content:
        result.choices?.[0]?.message?.content ??
        "No Response",
    };
  },
};