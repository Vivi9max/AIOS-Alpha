import { AIProviderAdapter, ChatResponse } from "../types";

export const mockProvider: AIProviderAdapter = {
  async chat(prompt: string): Promise<ChatResponse> {
    return {
      success: true,
      content: `🤖 Mock AI Response:\n\n${prompt}`,
    };
  },
};