import type { AIProvider, AIProviderAdapter } from "./types";

import { mockProvider } from "./providers/mock";
import { openaiProvider } from "./providers/openai";
import { deepseekProvider } from "./providers/deepseek";
import { qwenProvider } from "./providers/qwen";
import { claudeProvider } from "./providers/claude";
import { geminiProvider } from "./providers/gemini";

export const providerRegistry: Record<AIProvider, AIProviderAdapter> = {
  mock: mockProvider,
  openai: openaiProvider,
  deepseek: deepseekProvider,
  qwen: qwenProvider,
  claude: claudeProvider,
  gemini: geminiProvider,
};