import type {
  AIProviderAdapter,
  ChatResponse,
} from "../types";

export const qwenProvider: AIProviderAdapter = {
  async chat(prompt: string): Promise<ChatResponse> {
    return {
      success: true,
      content: `Qwen Provider\n\n${prompt}`,
    };
  },
};