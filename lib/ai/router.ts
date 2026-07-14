import { providers } from "./registry";
import type {
  AIProvider,
  ChatResponse,
} from "./types";

const order: AIProvider[] = [
  "deepseek",
  "openai",
  "claude",
  "gemini",
  "qwen",
  "mock",
];

export async function chat(
  prompt: string
): Promise<ChatResponse> {
  let lastError: unknown;

  for (const name of order) {
    const provider = providers[name];

    if (!provider?.enabled) continue;

    try {
      return await provider.chat(prompt);
    } catch (error) {
      console.warn(
        `[AI Router] ${name} failed`,
        error
      );

      lastError = error;
    }
  }

  throw lastError ?? new Error("No AI Provider");
}