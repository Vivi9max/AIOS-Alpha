export type AIProvider =
  | "mock"
  | "qwen"
  | "deepseek"
  | "claude"
  | "gemini"
  | "openai";

export type AICapability =
  | "chat"
  | "reason"
  | "vision"
  | "embedding";

export interface ChatResponse {
  success: boolean;
  provider: AIProvider;
  content: string;
}

export interface AIProviderAdapter {
  enabled: boolean;

  chat(
    prompt: string
  ): Promise<ChatResponse>;
}