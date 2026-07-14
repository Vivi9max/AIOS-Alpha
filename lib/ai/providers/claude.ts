import type {
  AIProviderAdapter,
  ChatResponse,
} from "../types";

export const claudeProvider: AIProviderAdapter = {
  enabled: false,

  async chat(prompt: string): Promise<ChatResponse> {
    return {
      success: false,
      provider: "claude",
      content: "Claude Provider Disabled",
    };
  },
};