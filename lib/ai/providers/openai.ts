import type {
  AIProviderAdapter,
  ChatResponse,
} from "../types";

export const openaiProvider: AIProviderAdapter = {
  enabled: false,

  async chat(prompt: string): Promise<ChatResponse> {
    return {
      success: false,
      provider: "openai",
      content: "OpenAI Provider Disabled",
    };
  },
};