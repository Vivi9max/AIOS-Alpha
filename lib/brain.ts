import { chat } from "./ai";
import {
  addMemory,
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

  const finalPrompt =
    relatedMemory.length > 0
      ? [
          "Memory:",
          ...relatedMemory.map(
            (item) => item.content
          ),
          "",
          "User:",
          request.prompt,
        ].join("\n")
      : request.prompt;

  const result = await chat(finalPrompt);

  return {
    success: result.success,
    provider: result.provider,
    content: result.content,
  };
}