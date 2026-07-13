import type {
  AIProviderAdapter,
  ChatResponse,
} from "../types";

export const geminiProvider: AIProviderAdapter = {
  async chat(prompt: string): Promise<ChatResponse> {
    return {
      success: true,
      content: `Gemini Provider\n\n${prompt}`,
    };
  },
};