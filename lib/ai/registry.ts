import { AIProvider } from "./types";

export const providers: Record<
  AIProvider,
  {
    enabled: boolean;
  }
> = {
  mock: {
    enabled: true,
  },

  openai: {
    enabled: false,
  },

  deepseek: {
    enabled: false,
  },

  qwen: {
    enabled: false,
  },

  claude: {
    enabled: false,
  },

  gemini: {
    enabled: false,
  },
};