import type { AIProvider } from "./types";

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  baseURL: string;
  model: string;
}

export const AI_CONFIG: Record<AIProvider, AIProviderConfig> = {
  mock: {
    provider: "mock",
    apiKey: "",
    baseURL: "",
    model: "mock",
  },

  openai: {
    provider: "openai",
    apiKey: process.env.OPENAI_API_KEY ?? "",
    baseURL:
      process.env.OPENAI_BASE_URL ??
      "https://api.openai.com/v1",
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
  },

  deepseek: {
    provider: "deepseek",
    apiKey: process.env.DEEPSEEK_API_KEY ?? "",
    baseURL:
      process.env.DEEPSEEK_BASE_URL ??
      "https://api.deepseek.com/v1",
    model:
      process.env.DEEPSEEK_MODEL ??
      "deepseek-chat",
  },

  qwen: {
    provider: "qwen",
    apiKey: process.env.QWEN_API_KEY ?? "",
    baseURL:
      process.env.QWEN_BASE_URL ??
      "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model:
      process.env.QWEN_MODEL ??
      "qwen-plus",
  },

  claude: {
    provider: "claude",
    apiKey: "",
    baseURL: "",
    model: "",
  },

  gemini: {
    provider: "gemini",
    apiKey: "",
    baseURL: "",
    model: "",
  },
};