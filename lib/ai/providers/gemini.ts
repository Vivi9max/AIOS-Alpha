import type {
  AIProviderAdapter,
  ChatResponse,
} from "../types";

export const geminiProvider: AIProviderAdapter = {
  enabled: false,

  async chat(prompt: string): Promise<ChatResponse> {
    return {
      success: false,
      provider: "gemini",
      content: "Gemini Provider Disabled",
    };
  },
};