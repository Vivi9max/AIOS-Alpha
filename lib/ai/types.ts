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

export interface AIChatOptions {
  systemPrompt?: string;
  historyLimit?: number;
}

export interface ChatResponse {
  success: boolean;
  provider: AIProvider;
  content: string;
  requestedProvider?: AIProvider;
  fallbackUsed?: boolean;
  error?: string;
}

export interface AIProviderAdapter {
  enabled: boolean;

  chat(
    prompt: string,
    options?: AIChatOptions
  ): Promise<ChatResponse>;
}
