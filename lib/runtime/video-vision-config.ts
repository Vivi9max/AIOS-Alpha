export type VideoVisionProvider =
  | "openai"
  | "none";

export interface VideoVisionConfig {
  provider: VideoVisionProvider;
  model: string;
  apiKeyConfigured: boolean;
  baseURL?: string;
  enabled: boolean;
}

const DEFAULT_MODEL =
  process.env.AIOS_VISION_MODEL ??
  "gpt-5.6-luna";

function normalizeProvider(
  value: string | undefined,
): VideoVisionProvider {
  const normalized =
    value?.trim().toLowerCase();

  if (normalized === "openai") {
    return "openai";
  }

  if (
    normalized === undefined ||
    normalized === ""
  ) {
    return "openai";
  }

  return "none";
}

export function getVideoVisionConfig(): VideoVisionConfig {
  const provider =
    normalizeProvider(
      process.env.AIOS_VISION_PROVIDER,
    );

  const apiKeyConfigured =
    Boolean(
      process.env.OPENAI_API_KEY?.trim(),
    );

  const enabled =
    provider === "openai" &&
    apiKeyConfigured;

  return {
    provider,
    model: DEFAULT_MODEL,
    apiKeyConfigured,
    ...(process.env.OPENAI_BASE_URL
      ? {
          baseURL:
            process.env.OPENAI_BASE_URL,
        }
      : {}),
    enabled,
  };
}
