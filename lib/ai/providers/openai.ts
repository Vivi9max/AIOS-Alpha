import type { ChatResponse } from "../types";

export const openaiProvider = {
  async chat(prompt: string): Promise<ChatResponse> {
    throw new Error(
      "OpenAI Provider not implemented yet."
    );
  },
};