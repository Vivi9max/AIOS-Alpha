import { chat as routerChat } from "./router";
import type { ChatResponse } from "./types";

export async function chat(
  prompt: string
): Promise<ChatResponse> {
  return routerChat(prompt);
}