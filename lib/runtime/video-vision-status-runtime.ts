import {
  getVideoVisionConfig,
} from "./video-vision-config";

export interface VideoVisionStatusResult {
  success: boolean;

  code: string;

  provider: "openai";

  model: string;

  apiKeyConfigured: boolean;

  enabled: boolean;

  ready: boolean;

  semanticUnderstandingReady: boolean;

  message: string;
}

export function getVideoVisionStatus(): VideoVisionStatusResult {
  const config =
    getVideoVisionConfig();

  if (!config.apiKeyConfigured) {
    return {
      success: true,

      code:
        "C144_9_5_VIDEO_VISION_PROVIDER_NOT_CONFIGURED",

      provider:
        "openai",

      model:
        config.model,

      apiKeyConfigured:
        false,

      enabled:
        false,

      ready:
        false,

      semanticUnderstandingReady:
        false,

      message:
        "Vision provider is available but OPENAI_API_KEY is not configured.",
    };
  }

  if (!config.enabled) {
    return {
      success: true,

      code:
        "C144_9_5_VIDEO_VISION_PROVIDER_DISABLED",

      provider:
        "openai",

      model:
        config.model,

      apiKeyConfigured:
        true,

      enabled:
        false,

      ready:
        false,

      semanticUnderstandingReady:
        false,

      message:
        "Vision provider is configured but disabled.",
    };
  }

  return {
    success: true,

    code:
      "C144_9_5_VIDEO_VISION_PROVIDER_READY",

    provider:
      "openai",

    model:
      config.model,

    apiKeyConfigured:
      true,

    enabled:
      true,

    ready:
      true,

    semanticUnderstandingReady:
      false,

    message:
      "Vision provider is configured and ready for model analysis.",
  };
}
