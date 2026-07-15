import {
  getRecentMemory,
  type MemoryRecord,
} from "@/lib/memory/store";

import { buildMemoryProfileText } from "@/lib/memory/index";

export interface ConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const DEFAULT_SYSTEM_PROMPT = [
  "你是 AIOS Alpha 的核心助手。",
  "请准确理解对话上下文，并提供清晰、可靠、可执行的回答。",
  "不要虚构用户信息。",
  "结构化用户资料只在与当前问题相关时使用。",
].join("\n");

function normalizeLimit(
  limit: number
): number {
  if (!Number.isFinite(limit)) {
    return 10;
  }

  return Math.min(
    40,
    Math.max(0, Math.floor(limit))
  );
}

function normalizeMemory(
  items: MemoryRecord[]
): ConversationMessage[] {
  return items
    .map((item) => ({
      role: item.role,
      content: item.content.trim(),
    }))
    .filter(
      (item) =>
        item.content.length > 0
    );
}

function removeDuplicatedCurrentPrompt(
  history: ConversationMessage[],
  prompt: string
): ConversationMessage[] {
  const lastMessage =
    history[history.length - 1];

  if (
    lastMessage?.role === "user" &&
    lastMessage.content === prompt
  ) {
    return history.slice(0, -1);
  }

  return history;
}

export function buildConversation(
  prompt: string,
  limit = 10
): ConversationMessage[] {
  const cleanPrompt = prompt.trim();

  const profileText =
    buildMemoryProfileText();

  const systemContent = [
    DEFAULT_SYSTEM_PROMPT,
    profileText
      ? [
          "",
          "已确认的用户资料：",
          profileText,
        ].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  let history = normalizeMemory(
    getRecentMemory(
      normalizeLimit(limit)
    )
  );

  /*
   * 当前 Brain 会先保存用户消息，再调用 Provider。
   * 因此 Memory 最后一条可能就是本轮 prompt。
   * 这里先删除它，再在末尾统一加入一次。
   */
  if (cleanPrompt) {
    history =
      removeDuplicatedCurrentPrompt(
        history,
        cleanPrompt
      );
  }

  const messages: ConversationMessage[] = [
    {
      role: "system",
      content: systemContent,
    },
    ...history,
  ];

  if (cleanPrompt) {
    messages.push({
      role: "user",
      content: cleanPrompt,
    });
  }

  return messages;
}