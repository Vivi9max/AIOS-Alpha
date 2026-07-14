export type AIProvider =
  | "mock"
  | "openai"
  | "deepseek"
  | "claude"
  | "gemini"
  | "qwen";

export interface ChatResponse {
  success: boolean;
  content: string;
  provider: AIProvider;
}

export interface AIProviderAdapter {
  enabled: boolean;

  chat(
    prompt: string
  ): Promise<ChatResponse>;
}