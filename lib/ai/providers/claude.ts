import type {
  AIProviderAdapter,
  ChatResponse,
} from "../types";

export const claudeProvider: AIProviderAdapter = {
  async chat(prompt: string): Promise<ChatResponse> {
    return {
      success: true,
      content: `Claude Provider\n\n${prompt}`,
    };
  },
};