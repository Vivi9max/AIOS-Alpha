import type { AIProvider } from "./types";

const openAIKey = process.env.OPENAI_API_KEY ?? "";
const deepSeekKey = process.env.DEEPSEEK_API_KEY ?? "";
const qwenKey = process.env.QWEN_API_KEY ?? "";

const VALID_PROVIDERS: AIProvider[] = [
  "deepseek",
  "qwen",
  "openai",
  "gemini",
  "claude",
  "mock",
];

function isProvider(value: string): value is AIProvider {
  return VALID_PROVIDERS.includes(value as AIProvider);
}

function parseProvider(
  value: string | undefined,
  fallback: AIProvider
): AIProvider {
  const normalized = value?.trim().toLowerCase() ?? "";
  return isProvider(normalized) ? normalized : fallback;
}

function parseProviderChain(value: string | undefined): AIProvider[] {
  const source = value ?? "deepseek,qwen,openai";
  const chain: AIProvider[] = [];

  for (const item of source.split(",")) {
    const normalized = item.trim().toLowerCase();

    if (
      isProvider(normalized) &&
      normalized !== "mock" &&
      !chain.includes(normalized)
    ) {
      chain.push(normalized);
    }
  }

  return chain.length > 0
    ? chain
    : ["deepseek", "qwen", "openai"];
}

export const AI_CONFIG = {
  defaultProvider: parseProvider(
    process.env.AIOS_DEFAULT_PROVIDER,
    "deepseek"
  ),

  fallbackProvider: "mock" as AIProvider,

  providerChain: parseProviderChain(
    process.env.AIOS_PROVIDER_CHAIN
  ),

  providers: {
    mock: {
      enabled: true,
    },

    qwen: {
      enabled: Boolean(qwenKey),
      model: process.env.QWEN_MODEL ?? "qwen-plus",
      apiKey: qwenKey,
      baseURL:
        process.env.QWEN_BASE_URL ??
        "https://dashscope.aliyuncs.com/compatible-mode/v1",
    },

    deepseek: {
      enabled: Boolean(deepSeekKey),
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      apiKey: deepSeekKey,
      baseURL:
        process.env.DEEPSEEK_BASE_URL ??
        "https://api.deepseek.com/v1",
    },

    openai: {
      enabled: Boolean(openAIKey),
      model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
      apiKey: openAIKey,
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
