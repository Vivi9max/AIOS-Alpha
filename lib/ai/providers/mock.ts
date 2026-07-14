import type {
  AIProviderAdapter,
  ChatResponse,
} from "../types";

export const mockProvider: AIProviderAdapter = {
  enabled: true,

  async chat(prompt: string): Promise<ChatResponse> {
    return {
      success: true,
      provider: "mock",
      content:
        "🤖 AIOS Mock Provider\n\n" + prompt,
    };
  },
};