import type {
  AIProviderAdapter,
  AIChatOptions,
  ChatResponse,
} from "../types";

import { AI_CONFIG } from "../config";
import { createChatCompletion } from "../client";
import { buildConversation } from "@/lib/conversation/builder";

const config = AI_CONFIG.providers.openai;

export const openaiProvider: AIProviderAdapter = {
  enabled: config.enabled && config.apiKey.trim().length > 0,

  async chat(
    prompt: string,
    options?: AIChatOptions
  ): Promise<ChatResponse> {
    const cleanPrompt = prompt.trim();

    if (!this.enabled) {
      return {
        success: false,
        provider: "openai",
        content: "OpenAI Provider is disabled or missing an API key.",
      };
    }

    if (!cleanPrompt) {
      return {
        success: false,
        provider: "openai",
        content: "Please enter a message.",
      };
    }

    const messages = buildConversation(
      cleanPrompt,
      options?.historyLimit ?? 20,
      options?.systemPrompt
    );

    const result = await createChatCompletion({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      model: config.model,
      messages,
      temperature: 0.7,
      timeoutMs: 30000,
    });

    if (result.error?.message) {
      throw new Error(result.error.message);
    }

    const content = result.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("OpenAI returned empty content.");
    }

    return {
      success: true,
      provider: "openai",
      content,
    };
  },
};

export default openaiProvider;
