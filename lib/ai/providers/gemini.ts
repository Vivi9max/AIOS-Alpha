import type { ChatResponse } from "../types";

export const geminiProvider = {
  async chat(prompt: string): Promise<ChatResponse> {
    throw new Error(
      "Gemini Provider not implemented yet."
    );
  },
};