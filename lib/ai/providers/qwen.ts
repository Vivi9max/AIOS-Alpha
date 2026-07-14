import type { ChatResponse } from "../types";

export const qwenProvider = {
  async chat(prompt: string): Promise<ChatResponse> {
    throw new Error(
      "Qwen Provider not implemented yet."
    );
  },
};