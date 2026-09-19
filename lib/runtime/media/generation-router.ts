import "server-only";

import {
  createGoogleVideoJob,
  retrieveGoogleVideoJob,
  isGoogleVideoConfigured,
  type GoogleVideoModel,
  type GoogleVideoResolution,
  type GoogleVideoJob,
} from "./google-video";

export type MediaGenerationKind =
  | "video"
  | "image"
  | "audio"
  | "voice"
  | "music"
  | "render";

export type MediaGenerationProvider =
  | "google-veo"
  | "openai"
  | "aios-composer";

export type MediaGenerationResolution =
  | "720p"
  | "1080p"
  | "4k";

export interface MediaGenerationRouteRequest {
  kind: MediaGenerationKind;
  prompt?: string;
  provider?: string;
  model?: string;
  resolution?: string;
  aspectRatio?: string;
  durationSeconds?: number;
}

export interface MediaGenerationRoute {
  provider: MediaGenerationProvider;
  model: string;
  kind: MediaGenerationKind;
  resolution: MediaGenerationResolution;
  reason: string;
  configured: boolean;
}

export interface MediaGenerationRouterResult {
  success: boolean;
  code: string;
  route: MediaGenerationRoute;
  job?: GoogleVideoJob;
  providerJobId?: string;
  providerStatus?: string;
  providerProgress?: number;
  error?: string;
}

const RESOLUTIONS: MediaGenerationResolution[] = [
  "720p",
  "1080p",
  "4k",
];

function normalizeResolution(
  value: unknown,
): MediaGenerationResolution {
  const normalized =
    typeof value === "string"
      ? value.trim().toLowerCase()
      : "";

  if (normalized === "4k") {
    return "4k";
  }

  if (normalized === "1080p") {
    return "1080p";
  }

  return "720p";
}

function normalizeKind(
  value: unknown,
): MediaGenerationKind {
  switch (value) {
    case "image":
    case "audio":
    case "voice":
    case "music":
    case "render":
      return value;

    case "video":
    default:
      return "video";
  }
}

function normalizeProvider(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

function resolveGoogleModel(
  value: unknown,
): GoogleVideoModel {
  if (
    value ===
      "veo-3.1-fast-generate-preview" ||
    value ===
      "veo-3.1-lite-generate-preview"
  ) {
    return value;
  }

  if (
    value ===
    "veo-3.1-generate-preview"
  ) {
    return value;
  }

  const configured =
    process.env.GOOGLE_VIDEO_MODEL?.trim();

  if (
    configured ===
      "veo-3.1-fast-generate-preview" ||
    configured ===
      "veo-3.1-lite-generate-preview" ||
    configured ===
      "veo-3.1-generate-preview"
  ) {
    return configured;
  }

  return "veo-3.1-generate-preview";
}

function resolveVideoProvider(
  request: MediaGenerationRouteRequest,
): MediaGenerationProvider {
  const requested =
    normalizeProvider(
      request.provider,
    );

  if (
    requested === "openai" ||
    requested === "openai-video"
  ) {
    return "openai";
  }

  if (
    requested === "composer" ||
    requested === "aios" ||
    requested === "aios-composer"
  ) {
    return "aios-composer";
  }

  return "google-veo";
}

export function getMediaGenerationRoutes(): MediaGenerationRoute[] {
  return [
    {
      provider: "google-veo",
      model: resolveGoogleModel(
        undefined,
      ),
      kind: "video",
      resolution: "1080p",
      reason:
        "Primary direct text-to-video provider. Uses GEMINI_API_KEY.",
      configured:
        isGoogleVideoConfigured(),
    },

    {
      provider: "aios-composer",
      model: "aios-composer",
      kind: "video",
      resolution: "1080p",
      reason:
        "Long-form composition pipeline using AIOS storyboard, OpenAI media and FFmpeg.",
      configured:
        Boolean(
          process.env.OPENAI_API_KEY?.trim(),
        ),
    },

    {
      provider: "openai",
      model:
        process.env.OPENAI_IMAGE_MODEL?.trim() ||
        "gpt-image-1",
      kind: "image",
      resolution: "1080p",
      reason:
        "Scene image generation provider used by AIOS Composer.",
      configured:
        Boolean(
          process.env.OPENAI_API_KEY?.trim(),
        ),
    },
  ];
}

export function resolveMediaGenerationRoute(
  request: MediaGenerationRouteRequest,
): MediaGenerationRoute {
  const kind =
    normalizeKind(
      request.kind,
    );

  const resolution =
    normalizeResolution(
      request.resolution,
    );

  if (kind === "video") {
    const provider =
      resolveVideoProvider(
        request,
      );

    if (provider === "openai") {
      return {
        provider,
        model:
          request.model?.trim() ||
          process.env.OPENAI_VIDEO_MODEL?.trim() ||
          "openai-video",
        kind,
        resolution,
        reason:
          "Explicit OpenAI video provider requested.",
        configured:
          Boolean(
            process.env.OPENAI_API_KEY?.trim(),
          ),
      };
    }

    if (
      provider ===
      "aios-composer"
    ) {
      return {
        provider,
        model:
          "aios-composer",
        kind,
        resolution,
        reason:
          "Explicit AIOS Composer route requested for long-form generation.",
        configured:
          Boolean(
            process.env.OPENAI_API_KEY?.trim(),
          ),
      };
    }

    return {
      provider:
        "google-veo",
      model:
        resolveGoogleModel(
          request.model,
        ),
      kind,
      resolution,
      reason:
        "Direct video generation defaults to Google Veo.",
      configured:
        isGoogleVideoConfigured(),
    };
  }

  if (kind === "image") {
    return {
      provider:
        "openai",
      model:
        request.model?.trim() ||
        process.env.OPENAI_IMAGE_MODEL?.trim() ||
        "gpt-image-1",
      kind,
      resolution,
      reason:
        "AIOS image generation currently routes to the existing OpenAI image capability.",
      configured:
        Boolean(
          process.env.OPENAI_API_KEY?.trim(),
        ),
    };
  }

  return {
    provider:
      "aios-composer",
    model:
      "aios-composer",
    kind,
    resolution,
    reason:
      "Non-direct media operations remain inside the AIOS Composer runtime.",
    configured:
      Boolean(
        process.env.OPENAI_API_KEY?.trim(),
      ),
  };
}

export async function createMediaGenerationJob(
  request: MediaGenerationRouteRequest,
): Promise<MediaGenerationRouterResult> {
  const route =
    resolveMediaGenerationRoute(
      request,
    );

  if (!route.configured) {
    return {
      success: false,

      code:
        route.provider ===
        "google-veo"
          ? "GEMINI_API_KEY_MISSING"
          : "MEDIA_PROVIDER_NOT_CONFIGURED",

      route,

      error:
        route.provider ===
        "google-veo"
          ? "GEMINI_API_KEY is not configured."
          : `${route.provider} is not configured.`,
    };
  }

  if (
    route.provider !==
    "google-veo"
  ) {
    return {
      success: false,

      code:
        "MEDIA_PROVIDER_ROUTE_NOT_ASYNC",

      route,

      error:
        "This provider is handled by the existing AIOS Composer pipeline rather than an asynchronous provider job.",
    };
  }

  const prompt =
    typeof request.prompt ===
    "string"
      ? request.prompt.trim()
      : "";

  if (!prompt) {
    return {
      success: false,

      code:
        "MEDIA_PROMPT_REQUIRED",

      route,

      error:
        "A media prompt is required.",
    };
  }

  if (
    !RESOLUTIONS.includes(
      route.resolution,
    )
  ) {
    return {
      success: false,

      code:
        "MEDIA_RESOLUTION_INVALID",

      route,

      error:
        "Unsupported media resolution.",
    };
  }

  if (
    route.resolution ===
      "4k" &&
    route.model ===
      "veo-3.1-lite-generate-preview"
  ) {
    return {
      success: false,

      code:
        "VEO_4K_NOT_SUPPORTED_BY_MODEL",

      route,

      error:
        "The Veo Lite model does not support 4K.",
    };
  }

  try {
    const job =
      await createGoogleVideoJob({
        prompt,

        model:
          route.model as GoogleVideoModel,

        aspectRatio:
          request.aspectRatio ===
          "16:9"
            ? "16:9"
            : "9:16",

        resolution:
          route.resolution as GoogleVideoResolution,

        durationSeconds:
          request.durationSeconds,
      });

    return {
      success: true,

      code:
        "MEDIA_GENERATION_JOB_CREATED",

      route,

      job,

      providerJobId:
        job.operationName,

      providerStatus:
        job.status,

      providerProgress:
        job.progress,
    };
  } catch (error) {
    return {
      success: false,

      code:
        "MEDIA_GENERATION_PROVIDER_FAILED",

      route,

      error:
        error instanceof Error
          ? error.message
          : "Media generation provider failed.",
    };
  }
}

export async function getMediaGenerationJob(
  operationName: string,
): Promise<MediaGenerationRouterResult> {
  const route =
    resolveMediaGenerationRoute({
      kind: "video",
      provider: "google",
    });

  if (!route.configured) {
    return {
      success: false,

      code:
        "GEMINI_API_KEY_MISSING",

      route,

      error:
        "GEMINI_API_KEY is not configured.",
    };
  }

  try {
    const job =
      await retrieveGoogleVideoJob(
        operationName,
      );

    return {
      success:
        job.status !==
        "failed",

      code:
        job.status ===
        "completed"
          ? "MEDIA_GENERATION_COMPLETED"
          : job.status ===
              "failed"
            ? "MEDIA_GENERATION_FAILED"
            : "MEDIA_GENERATION_IN_PROGRESS",

      route: {
        ...route,

        model:
          job.model ||
          route.model,
      },

      job,

      providerJobId:
        job.operationName,

      providerStatus:
        job.status,

      providerProgress:
        job.progress,

      error:
        job.error?.message,
    };
  } catch (error) {
    return {
      success: false,

      code:
        "MEDIA_GENERATION_STATUS_FAILED",

      route,

      error:
        error instanceof Error
          ? error.message
          : "Unable to retrieve media generation status.",
    };
  }
}
