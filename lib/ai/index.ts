import { getProvider } from "./router";
import type { ChatResponse } from "./types";

export async function chat(prompt: string): Promise<ChatResponse> {
  const provider = getProvider();
  return provider.chat(prompt);
}