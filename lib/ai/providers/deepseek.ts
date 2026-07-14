import type {
  AIProviderAdapter,
  ChatResponse,
} from "../types";

export const deepseekProvider: AIProviderAdapter = {
  enabled: false,

  async chat(prompt: string): Promise<ChatResponse> {
    return {
      success: false,
      provider: "deepseek",
      content: "DeepSeek Provider Disabled",
    };
  },
};