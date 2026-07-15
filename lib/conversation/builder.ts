import { getRecentMemory } from "@/lib/memory/store";

export interface ConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const DEFAULT_SYSTEM_PROMPT =
  "你是 AIOS Alpha 的核心助手。请准确理解上下文，并提供清晰、可靠、可执行的回答。";

export function buildConversation(
  prompt: string,
  limit = 10
): ConversationMessage[] {
  const cleanPrompt = prompt.trim();

  const messages: ConversationMessage[] = [
    {
      role: "system",
      content: DEFAULT_SYSTEM_PROMPT,
    },
  ];

  const history = getRecentMemory(
    Math.max(0, Math.floor(limit))
  );

  for (const item of history) {
    const content = item.content.trim();

    if (!content) {
      continue;
    }

    messages.push({
      role: item.role,
      content,
    });
  }

  if (cleanPrompt) {
    messages.push({
      role: "user",
      content: cleanPrompt,
    });
  }

  return messages;
}