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
  addMemory("user", request.prompt);

  const relatedMemory =
    searchMemory(request.prompt);

  const context =
    buildConversationContext();

  const finalPrompt =
    [
      context,
      "",
      relatedMemory.length
        ? "Related Memory:\n" +
          relatedMemory
            .map((item) => item.content)
            .join("\n")
        : "",
      "",
      "User:",
      request.prompt,
    ]
      .filter(Boolean)
      .join("\n");

  const result =
    await chat(finalPrompt);

  addAssistantMemory(result.content);

  return {
    success: result.success,
    provider: result.provider,
    content: result.content,
  };
}