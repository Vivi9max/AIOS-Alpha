import type { ChatResponse } from "../types";

export const deepseekProvider = {
  async chat(prompt: string): Promise<ChatResponse> {
    throw new Error(
      "DeepSeek Provider not implemented yet."
    );
  },
};