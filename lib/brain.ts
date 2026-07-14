import { chat } from "./ai";
import {
  addMemory,
  addAssistantMemory,
  buildConversationContext,
  searchMemory,
} from "./memory/store";

export type AIProvider =
  | "mock"
  | "qwen"
  | "deepseek"
  | "claude"
  | "gemini"
  | "openai";

export interface BrainRequest {
  provider: AIProvider;
  prompt: string;
}

export interface BrainResponse {
  success: boolean;
  provider: AIProvider;
  content: string;
}

export async function runBrain(
  request: BrainRequest
): Promise<BrainResponse> {
  const prompt = request.prompt.trim();

  if (!prompt) {
    return {
      success: false,
      provider: "mock",
      content: "请输入内容。",
    };
  }

  // 先读取过去的记忆，避免当前问题被重复写入上下文。
  const conversationContext =
    buildConversationContext(20);

  const relatedMemory =
    searchMemory(prompt).slice(-5);

  // 再保存当前用户消息。
  addMemory("user", prompt);

  const finalPrompt = [
    "You are the AIOS Alpha brain.",
    "Use the supplied memory when it helps answer the current message.",
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

  const result = await chat(finalPrompt);

  addAssistantMemory(result.content);

  return {
    success: result.success,
    provider: result.provider,
    content: result.content,
  };
}