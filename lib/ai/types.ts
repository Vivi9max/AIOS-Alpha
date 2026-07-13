export type AIProvider =
  | "openai"
  | "deepseek"
  | "qwen"
  | "claude"
  | "gemini"
  | "mock";

export interface ChatRequest {
  prompt: string;
}

export interface ChatResponse {
  success: boolean;
  content: string;
}

export interface AIProviderAdapter {
  chat(prompt: string): Promise<ChatResponse>;
}