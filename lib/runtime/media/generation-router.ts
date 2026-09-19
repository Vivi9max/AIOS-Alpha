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
  available?: boolean;
  fallback?: boolean;
}

export interface MediaGenerationRouterResult {
  success: boolean;
  code: string;
  route: MediaGenerationRoute;
  requestedProvider?: string;
  fallback?: boolean;
  job?: GoogleVideoJob;
  providerJobId?: string;
  providerStatus?: string;
  providerProgress?: number;
  error?: string;
}

export interface MediaGenerationAvailability {
  provider: MediaGenerationProvider;
  configured: boolean;
  available: boolean;
  model: string;
  kind: MediaGenerationKind;
  reason: string;
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
    value === "veo-3.1-generate-preview" ||
    value === "veo-3.1-fast-generate-preview" ||
    value === "veo-3.1-lite-generate-preview"
  ) {
    return value;
  }

  const configured =
    process.env.GOOGLE_VIDEO_MODEL?.trim();

  if (
    configured === "veo-3.1-generate-preview" ||
    configured === "veo-3.1-fast-generate-preview" ||
    configured === "veo-3.1-lite-generate-preview"
  ) {
    return configured;
  }

  return "veo-3.1-generate-preview";
}

function resolveVideoProvider(
  request: MediaGenerationRouteRequest,
): MediaGenerationProvider {
  const requested =
    normalizeProvider(request.provider);

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

function isOpenAIConfigured(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY?.trim(),
  );
}

function buildRoute(
  provider: MediaGenerationProvider,
  kind: MediaGenerationKind,
  resolution: MediaGenerationResolution,
  model: string,
  reason: string,
  configured: boolean,
  fallback = false,
): MediaGenerationRoute {
  return {
    provider,
    model,
    kind,
    resolution,
    reason,
    configured,
    available: configured,
    fallback,
  };
}

export function getMediaGenerationRoutes(): MediaGenerationRoute[] {
  return [
    buildRoute(
      "google-veo",
      "video",
      "1080p",
      resolveGoogleModel(undefined),
      "Primary direct text-to-video provider. Uses GEMINI_API_KEY.",
      isGoogleVideoConfigured(),
    ),

    buildRoute(
      "aios-composer",
      "video",
      "1080p",
      "aios-composer",
      "Long-form composition pipeline using the existing AIOS storyboard, media and render runtime.",
      isOpenAIConfigured(),
    ),

    buildRoute(
      "openai",
      "image",
      "1080p",
      process.env.OPENAI_IMAGE_MODEL?.trim() ||
        "gpt-image-1",
      "Existing OpenAI image capability used by AIOS media composition.",
      isOpenAIConfigured(),
    ),
  ];
}

export function getMediaGenerationAvailability(): MediaGenerationAvailability[] {
  return getMediaGenerationRoutes().map(
    (route) => ({
      provider: route.provider,
      configured: route.configured,
      available:
        route.available === true,
      model: route.model,
      kind: route.kind,
      reason: route.reason,
    }),
  );
}

export function resolveMediaGenerationRoute(
  request: MediaGenerationRouteRequest,
): MediaGenerationRoute {
  const kind =
    normalizeKind(request.kind);

  const resolution =
    normalizeResolution(
      request.resolution,
    );

  if (kind === "video") {
    const provider =
      resolveVideoProvider(request);

    if (provider === "openai") {
      return buildRoute(
        provider,
        kind,
        resolution,
        request.model?.trim() ||
          process.env.OPENAI_VIDEO_MODEL?.trim() ||
          "openai-video",
        "Explicit OpenAI video provider requested.",
        isOpenAIConfigured(),
      );
    }

    if (
      provider === "aios-composer"
    ) {
      return buildRoute(
        provider,
        kind,
        resolution,
        "aios-composer",
        "Explicit AIOS Composer route requested for long-form generation.",
        isOpenAIConfigured(),
      );
    }

    return buildRoute(
      "google-veo",
      kind,
      resolution,
      resolveGoogleModel(
        request.model,
      ),
      "Direct video generation defaults to Google Veo.",
      isGoogleVideoConfigured(),
    );
  }

  if (kind === "image") {
    return buildRoute(
      "openai",
      kind,
      resolution,
      request.model?.trim() ||
        process.env.OPENAI_IMAGE_MODEL?.trim() ||
        "gpt-image-1",
      "AIOS image generation routes to the existing OpenAI image capability.",
      isOpenAIConfigured(),
    );
  }

  return buildRoute(
    "aios-composer",
    kind,
    resolution,
    "aios-composer",
    "Non-direct media operations remain inside the AIOS Composer runtime.",
    isOpenAIConfigured(),
  );
}

/**
 * Resolves the first usable media provider.
 *
 * Explicit provider requests are always respected.
 * Automatic video routing falls back from Google Veo
 * to AIOS Composer when GEMINI_API_KEY is unavailable.
 */
export function resolveAvailableMediaGenerationRoute(
  request: MediaGenerationRouteRequest,
): MediaGenerationRoute {
  const requested =
    normalizeProvider(
      request.provider,
    );

  const requestedRoute =
    resolveMediaGenerationRoute(
      request,
    );

  if (requested) {
    return requestedRoute;
  }

  if (
    requestedRoute.kind === "video" &&
    requestedRoute.provider ===
      "google-veo" &&
    !requestedRoute.configured
  ) {
    return buildRoute(
      "aios-composer",
      "video",
      requestedRoute.resolution,
      "aios-composer",
      "Google Veo is not configured; automatic routing falls back to the existing AIOS Composer pipeline.",
      isOpenAIConfigured(),
      true,
    );
  }

  return requestedRoute;
}

export function isMediaProviderConfigured(
  provider: MediaGenerationProvider,
): boolean {
  switch (provider) {
    case "google-veo":
      return isGoogleVideoConfigured();

    case "openai":
    case "aios-composer":
      return isOpenAIConfigured();

    default:
      return false;
  }
}

export async function createMediaGenerationJob(
  request: MediaGenerationRouteRequest,
): Promise<MediaGenerationRouterResult> {
  const explicitlyRequestedProvider =
    normalizeProvider(
      request.provider,
    );

  const route =
    explicitlyRequestedProvider
      ? resolveMediaGenerationRoute(
          request,
        )
      : resolveAvailableMediaGenerationRoute(
          request,
        );

  const requestedProvider =
    explicitlyRequestedProvider ||
    undefined;

  if (!route.configured) {
    return {
      success: false,

      code:
        route.provider ===
        "google-veo"
          ? "GEMINI_API_KEY_MISSING"
          : "MEDIA_PROVIDER_NOT_CONFIGURED",

      route,

      requestedProvider,

      fallback:
        route.fallback,

      error:
        route.provider ===
        "google-veo"
          ? "GEMINI_API_KEY is not configured."
          : `${route.provider} is not configured.`,
    };
  }

  /*
   * Google Veo is currently the provider
   * implemented as an asynchronous provider job
   * by this router.
   *
   * AIOS Composer remains available as the
   * automatic fallback, but its execution continues
   * through the existing composition/render pipeline.
   */
  if (
    route.provider !==
    "google-veo"
  ) {
    return {
      success: false,

      code:
        "MEDIA_PROVIDER_ROUTE_NOT_ASYNC",

      route,

      requestedProvider,

      fallback:
        route.fallback,

      error:
        route.provider ===
        "aios-composer"
          ? "AIOS Composer is available as the automatic fallback and long-form composition pipeline. Use the media render operation for composition."
          : "This provider is handled by an existing AIOS media pipeline rather than an asynchronous provider job.",
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

      requestedProvider,

      fallback:
        route.fallback,

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

      requestedProvider,

      fallback:
        route.fallback,

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

      requestedProvider,

      fallback:
        route.fallback,

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

      requestedProvider,

      fallback:
        route.fallback,

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

      requestedProvider,

      fallback:
        route.fallback,

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

      provider:
        "google-veo",
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
