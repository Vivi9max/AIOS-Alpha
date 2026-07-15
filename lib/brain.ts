import { chat } from "./ai";

import type {
  AIProvider,
} from "./ai/types";

import {
  addMemory,
  addAssistantMemory,
  buildConversationContext,
  hydrateMemory,
  saveMemory,
  searchMemory,
} from "./memory/store";

import {
  buildMemoryProfileText,
} from "./memory/index";

export interface BrainRequest {
  prompt: string;
}

export interface BrainResponse {
  success: boolean;
  provider: AIProvider;
  requestedProvider?: AIProvider;
  fallbackUsed?: boolean;
  error?: string;
  content: string;
}

export async function runBrain(
  request: BrainRequest
): Promise<BrainResponse> {
  const prompt =
    request.prompt.trim();

  if (!prompt) {
    return {
      success: false,
      provider: "mock",
      content: "请输入内容。",
    };
  }

  /*
   * 在读取上下文之前，先从持久化层恢复 Memory。
   * 未配置 Redis 时会自动使用服务器内存。
   */
  await hydrateMemory();

  const conversationContext =
    buildConversationContext(20);

  const profileContext =
    buildMemoryProfileText();

  const relatedMemory =
    searchMemory(prompt).slice(-5);

  addMemory(
    "user",
    prompt
  );

  const finalPrompt = [
    "You are the AIOS Alpha brain.",
    "Answer the current user message directly.",
    "Use memory and profile only when relevant.",
    "Do not treat questions as new personal facts.",
    "",
    "USER_PROFILE:",
    profileContext || "(empty)",
    "",
    "CONVERSATION_MEMORY:",
    conversationContext || "(empty)",
    "",
    "RELATED_MEMORY:",
    relatedMemory.length > 0
      ? relatedMemory
          .map(
            (item) =>
              `${item.role}: ${item.content}`
          )
          .join("\n")
      : "(empty)",
    "",
    "CURRENT_USER_MESSAGE:",
    prompt,
  ].join("\n");

  try {
    const result =
      await chat(finalPrompt);

    addAssistantMemory(
      result.content
    );

    await saveMemory();

    return {
      success: result.success,
      provider: result.provider,
      requestedProvider:
        result.requestedProvider,
      fallbackUsed:
        result.fallbackUsed,
      error: result.error,
      content: result.content,
    };
  } catch (error) {
    /*
     * 即使 Provider 请求失败，
     * 用户本轮输入也应被保存。
     */
    await saveMemory();

    throw error;
  }
}