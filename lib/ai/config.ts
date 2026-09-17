import type { AIProvider } from "./types";

const openAIKey =
  process.env.OPENAI_API_KEY ?? "";

const deepSeekKey =
  process.env.DEEPSEEK_API_KEY ?? "";

const qwenKey =
  process.env.QWEN_API_KEY ?? "";

export const AI_CONFIG = {
  defaultProvider:
    "deepseek" as AIProvider,

  fallbackProvider:
    "mock" as AIProvider,

  providers: {
    mock: {
      enabled: true,
    },

    qwen: {
      enabled:
        Boolean(qwenKey),

      model:
        "qwen-plus",

      apiKey:
        qwenKey,

      baseURL:
        "https://dashscope.aliyuncs.com/compatible-mode/v1",
    },

    deepseek: {
      enabled:
        Boolean(deepSeekKey),

      model:
        "deepseek-chat",

      apiKey:
        deepSeekKey,

      baseURL:
        "https://api.deepseek.com/v1",
    },

    openai: {
      enabled:
        Boolean(openAIKey),

      model:
        process.env.AIOS_VISION_MODEL ??
        "gpt-5.6-luna",

      apiKey:
        openAIKey,

      baseURL:
        process.env.OPENAI_BASE_URL ??
        "https://api.openai.com/v1",
    },

    gemini: {
      enabled: false,
    },

    claude: {
      enabled: false,
    },
  },
};
