import type { AIProvider } from "./types";

export const AI_CONFIG = {
  defaultProvider: "qwen" as AIProvider,

  fallbackProvider: "mock" as AIProvider,

  providers: {
    mock: {
      enabled: true,
    },

    qwen: {
      enabled: false,
      model: "qwen-plus",
      apiKey: process.env.QWEN_API_KEY ?? "",
      baseURL:
        "https://dashscope.aliyuncs.com/compatible-mode/v1",
    },

    deepseek: {
      enabled: false,
      model: "deepseek-chat",
      apiKey: process.env.DEEPSEEK_API_KEY ?? "",
      baseURL: "https://api.deepseek.com/v1",
    },

    openai: {
      enabled: false,
      model: "gpt-4.1",
      apiKey: process.env.OPENAI_API_KEY ?? "",
      baseURL: "https://api.openai.com/v1",
    },

    gemini: {
      enabled: false,
    },

    claude: {
      enabled: false,
    },
  },
};