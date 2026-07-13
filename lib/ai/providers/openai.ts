import type {
  AIProviderAdapter,
  ChatResponse,
} from "../types";

export const openaiProvider: AIProviderAdapter = {
  async chat(prompt: string): Promise<ChatResponse> {
    return {
      success: true,
      content: `OpenAI Provider\n\n${prompt}`,
    };
  },
};