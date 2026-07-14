import type {
  AIProvider,
  AIProviderAdapter,
} from "./types";

import { mockProvider } from "./providers/mock";
import { openaiProvider } from "./providers/openai";
import { deepseekProvider } from "./providers/deepseek";
import { claudeProvider } from "./providers/claude";
import { geminiProvider } from "./providers/gemini";
import { qwenProvider } from "./providers/qwen";

export const providers: Record<
  AIProvider,
  AIProviderAdapter
> = {
  mock: mockProvider,

  openai: openaiProvider,

  deepseek: deepseekProvider,

  claude: claudeProvider,

  gemini: geminiProvider,

  qwen: qwenProvider,
};