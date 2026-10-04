export type VideoVisionProvider =
  "openai";

export interface VideoVisionConfig {
  provider: VideoVisionProvider;
  model: string;
  apiKeyConfigured: boolean;
  baseURL?: string;
  enabled: boolean;
}

const DEFAULT_VISION_MODEL =
  "gpt-6-luna";

function resolveVisionModel(): string {
  const configuredModel =
    process.env.AIOS_VISION_MODEL?.trim();

  if (
    configuredModel
  ) {
    return configuredModel;
  }

  return DEFAULT_VISION_MODEL;
}

export function getVideoVisionConfig(): VideoVisionConfig {
  const apiKeyConfigured =
    Boolean(
      process.env.OPENAI_API_KEY?.trim(),
    );

  const provider: VideoVisionProvider =
    "openai";

  const model =
    resolveVisionModel();

  return {
    provider,

    model,

    apiKeyConfigured,

    ...(process.env.OPENAI_BASE_URL?.trim()
      ? {
          baseURL:
            process.env.OPENAI_BASE_URL.trim(),
        }
      : {}),

    enabled:
      apiKeyConfigured &&
      Boolean(model),
  };
}
