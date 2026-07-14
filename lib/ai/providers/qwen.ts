import type {
  AIProviderAdapter,
  ChatResponse,
} from "../types";

export const qwenProvider: AIProviderAdapter = {
  enabled: false,

  async chat(prompt: string): Promise<ChatResponse> {
    return {
      success: false,
      provider: "qwen",
      content: "Qwen Provider Disabled",
    };
  },
};