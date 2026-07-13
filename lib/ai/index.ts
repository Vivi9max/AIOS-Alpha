import { getProvider } from "./router";
import type { ChatResponse } from "./types";

export async function chat(prompt: string): Promise<ChatResponse> {
  const provider = getProvider();

  switch (provider) {
    case "mock":
      return {
        success: true,
        content: `🤖 AIOS Mock\n\n${prompt}`,
      };

    default:
      return {
        success: false,
        content: `${provider} provider not implemented.`,
      };
  }
}