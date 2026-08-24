import { chat as routerChat } from "./router";

import type {
  AIChatOptions,
  ChatResponse,
} from "./types";

export async function chat(
  prompt: string,
  options?: AIChatOptions
): Promise<ChatResponse> {
  return routerChat(
    prompt,
    options
  );
}
