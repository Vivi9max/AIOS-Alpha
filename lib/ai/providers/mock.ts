import type { ChatResponse } from "../types";

export const mockProvider = {
  async chat(prompt: string): Promise<ChatResponse> {
    return {
      success: true,
      content: `🤖 Mock Provider\n\n${prompt}`,
      provider: "mock",
    };
  },
};