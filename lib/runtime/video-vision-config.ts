export type VideoVisionProvider = "openai";

export interface VideoVisionConfig {
  provider: VideoVisionProvider;
  model: string;
  apiKeyConfigured: boolean;
  baseURL?: string;
  enabled: boolean;
}

const DEFAULT_VISION_MODEL =
  process.env.AIOS_VISION_MODEL ??
  "gpt-5.6-luna";

export function getVideoVisionConfig(): VideoVisionConfig {
  const apiKeyConfigured =
    Boolean(
      process.env.OPENAI_API_KEY?.trim(),
    );

  const provider: VideoVisionProvider =
    "openai";

  return {
    provider,

    model:
      DEFAULT_VISION_MODEL,

    apiKeyConfigured,

    ...(process.env.OPENAI_BASE_URL
      ? {
          baseURL:
            process.env.OPENAI_BASE_URL,
        }
      : {}),

    enabled:
      apiKeyConfigured,
  };
}
