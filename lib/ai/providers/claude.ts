import type { ChatResponse } from "../types";

export const claudeProvider = {
  async chat(prompt: string): Promise<ChatResponse> {
    throw new Error(
      "Claude Provider not implemented yet."
    );
  },
};