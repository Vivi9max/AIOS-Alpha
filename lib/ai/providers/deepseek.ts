import type {
  AIProviderAdapter,
  ChatResponse,
} from "../types";

export const deepseekProvider: AIProviderAdapter = {
  async chat(prompt: string): Promise<ChatResponse> {
    return {
      success: true,
      content: `DeepSeek Provider\n\n${prompt}`,
    };
  },
};