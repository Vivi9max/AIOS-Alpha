import "server-only";

import {
  createGoogleVideoJob,
  retrieveGoogleVideoJob,
  isGoogleVideoConfigured,
  type GoogleVideoModel,
  type GoogleVideoResolution,
  type GoogleVideoJob,
} from "./google-video";

import {
  createOpenAIVideoJob,
  retrieveOpenAIVideoJob,
  type OpenAIVideoJob,
  type OpenAIVideoModel,
} from "./openai-video";

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

  job?: GoogleVideoJob | OpenAIVideoJob;

  providerJobId?: string;
  providerStatus?: string;
  providerProgress?: number;

  error?: string;

  metadata?: Record<string, unknown>;
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
    value ===
      "veo-3.1-generate-preview" ||
    value ===
      "veo-3.1-fast-generate-preview" ||
    value ===
      "veo-3.1-lite-generate-preview"
  ) {
    return value;
  }

  const configured =
    process.env.GOOGLE_VIDEO_MODEL?.trim();

  if (
    configured ===
      "veo-3.1-generate-preview" ||
    configured ===
      "veo-3.1-fast-generate-preview" ||
    configured ===
      "veo-3.1-lite-generate-preview"
  ) {
    return configured;
  }

  return "veo-3.1-generate-preview";
}

function resolveOpenAIModel(
  value: unknown,
): OpenAIVideoModel {
  if (
    value === "sora-2" ||
    value === "sora-2-pro"
  ) {
    return value;
  }

  const configured =
    process.env.OPENAI_VIDEO_MODEL?.trim();

  if (
    configured === "sora-2" ||
    configured === "sora-2-pro"
  ) {
    return configured;
  }

  return "sora-2";
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
    requested === "openai-video" ||
    requested === "sora" ||
    requested === "sora-2"
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
      "Primary direct text-to-video provider. Uses GEMINI_API_KEY or GOOGLE_API_KEY.",
      isGoogleVideoConfigured(),
    ),

    buildRoute(
      "openai",
      "video",
      "1080p",
      resolveOpenAIModel(undefined),
      "Secondary direct video provider. Uses OPENAI_API_KEY.",
      isOpenAIConfigured(),
    ),

    buildRoute(
      "aios-composer",
      "video",
      "1080p",
      "aios-composer",
      "AIOS-native composition and rendering fallback.",
      isOpenAIConfigured(),
    ),

    buildRoute(
      "openai",
      "image",
      "1080p",
      process.env.OPENAI_IMAGE_MODEL?.trim() ||
        "gpt-image-1",
      "Existing OpenAI image generation capability.",
      isOpenAIConfigured(),
    ),
  ];
}

export function getMediaGenerationAvailability(): MediaGenerationAvailability[] {
  return getMediaGenerationRoutes().map(
    (route) => ({
      provider: route.provider,
      configured:
        route.configured,
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
      resolveVideoProvider(
        request,
      );

    if (provider === "openai") {
      return buildRoute(
        "openai",
        kind,
        resolution,
        resolveOpenAIModel(
          request.model,
        ),
        "Explicit OpenAI/Sora video provider requested.",
        isOpenAIConfigured(),
      );
    }

    if (
      provider === "aios-composer"
    ) {
      return buildRoute(
        "aios-composer",
        kind,
        resolution,
        "aios-composer",
        "Explicit AIOS Composer route requested.",
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
      "AIOS image generation uses the existing OpenAI image capability.",
      isOpenAIConfigured(),
    );
  }

  return buildRoute(
    "aios-composer",
    kind,
    resolution,
    "aios-composer",
    "Non-direct media operations remain inside AIOS Composer.",
    isOpenAIConfigured(),
  );
}

/**
 * Automatic provider resolution.
 *
 * IMPORTANT:
 *
 * This function is intentionally different from
 * resolveMediaGenerationRoute().
 *
 * resolveMediaGenerationRoute()
 * = explicit/direct route.
 *
 * resolveAvailableMediaGenerationRoute()
 * = capability-aware automatic route.
 *
 * Automatic video priority:
 *
 * Google Veo
 *   ↓ unavailable
 * OpenAI Sora
 *   ↓ unavailable
 * AIOS Composer
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

  /*
   * Explicit provider requests are never
   * silently substituted.
   *
   * This is critical for founder verification.
   */
  if (requested) {
    return requestedRoute;
  }

  if (
    requestedRoute.kind === "video" &&
    requestedRoute.provider ===
      "google-veo" &&
    requestedRoute.configured
  ) {
    return requestedRoute;
  }

  if (
    requestedRoute.kind === "video" &&
    requestedRoute.provider ===
      "google-veo" &&
    !requestedRoute.configured &&
    isOpenAIConfigured()
  ) {
    return buildRoute(
      "openai",
      "video",
      requestedRoute.resolution,
      resolveOpenAIModel(
        undefined,
      ),
      "Google Veo is unavailable; automatic routing falls back to OpenAI Sora.",
      true,
      true,
    );
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
      "Google Veo and OpenAI Sora are unavailable; automatic routing falls back to the AIOS Composer pipeline.",
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
      return isOpenAIConfigured();

    case "aios-composer":
      return isOpenAIConfigured();

    default:
      return false;
  }
}

function normalizeOpenAISeconds(
  value?: number,
): "4" | "8" | "12" {
  if (value === 4) {
    return "4";
  }

  if (
    value === 6 ||
    value === 8
  ) {
    return "8";
  }

  return "12";
}

function normalizeOpenAIAspectRatio(
  value?: string,
): "16:9" | "9:16" {
  return value === "16:9"
    ? "16:9"
    : "9:16";
}

function buildOpenAIJobResult(
  job: OpenAIVideoJob,
  route: MediaGenerationRoute,
  requestedProvider?: string,
  fallback = false,
): MediaGenerationRouterResult {
  return {
    success: true,

    code:
      "MEDIA_GENERATION_JOB_CREATED",

    route,

    requestedProvider,

    fallback,

    job,

    providerJobId:
      job.id,

    providerStatus:
      job.status,

    providerProgress:
      job.progress,

    metadata: {
      provider:
        "openai",

      providerJobId:
        job.id,

      model:
        job.model,

      seconds:
        job.seconds,

      size:
        job.size,
    },
  };
}

function buildGoogleJobResult(
  job: GoogleVideoJob,
  route: MediaGenerationRoute,
  requestedProvider?: string,
  fallback = false,
): MediaGenerationRouterResult {
  return {
    success: true,

    code:
      "MEDIA_GENERATION_JOB_CREATED",

    route,

    requestedProvider,

    fallback,

    job,

    providerJobId:
      job.operationName,

    providerStatus:
      job.status,

    providerProgress:
      job.progress,

    metadata: {
      provider:
        "google-veo",

      providerJobId:
        job.operationName,

      model:
        job.model,
    },
  };
}

async function createOpenAIVideo(
  request: MediaGenerationRouteRequest,
  route: MediaGenerationRoute,
  requestedProvider?: string,
  fallback = false,
): Promise<MediaGenerationRouterResult> {
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
      fallback,
      error:
        "A media prompt is required.",
    };
  }

  try {
    const job =
      await createOpenAIVideoJob({
        prompt,

        model:
          route.model as OpenAIVideoModel,

        seconds:
          normalizeOpenAISeconds(
            request.durationSeconds,
          ),

        aspectRatio:
          normalizeOpenAIAspectRatio(
            request.aspectRatio,
          ),
      });

    return buildOpenAIJobResult(
      job,
      route,
      requestedProvider,
      fallback,
    );
  } catch (error) {
    return {
      success: false,
      code:
        "MEDIA_GENERATION_PROVIDER_FAILED",
      route,
      requestedProvider,
      fallback,
      error:
        error instanceof Error
          ? error.message
          : "OpenAI video generation failed.",
    };
  }
}

async function createGoogleVideo(
  request: MediaGenerationRouteRequest,
  route: MediaGenerationRoute,
  requestedProvider?: string,
  fallback = false,
): Promise<MediaGenerationRouterResult> {
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
      fallback,
      error:
        "A media prompt is required.",
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

    return buildGoogleJobResult(
      job,
      route,
      requestedProvider,
      fallback,
    );
  } catch (error) {
    return {
      success: false,
      code:
        "MEDIA_GENERATION_PROVIDER_FAILED",
      route,
      requestedProvider,
      fallback,
      error:
        error instanceof Error
          ? error.message
          : "Google Veo generation failed.",
    };
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

  /*
   * Explicit provider means:
   *
   * NO automatic substitution.
   *
   * This preserves C146.18.3:
   *
   * provider=google-veo
   * -> Google only
   */
  if (
    explicitlyRequestedProvider &&
    !route.configured
  ) {
    return {
      success: false,

      code:
        route.provider ===
        "google-veo"
          ? "GEMINI_API_KEY_MISSING"
          : "MEDIA_PROVIDER_NOT_CONFIGURED",

      route,

      requestedProvider,

      fallback: false,

      error:
        route.provider ===
        "google-veo"
          ? "GEMINI_API_KEY or GOOGLE_API_KEY is not configured."
          : `${route.provider} is not configured.`,
    };
  }

  /*
   * Automatic routing may still end up
   * with Composer.
   *
   * Composer is not an asynchronous provider
   * job and therefore remains handled by the
   * existing media composition API.
   */
  if (
    route.provider ===
    "aios-composer"
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
        "AIOS Composer is available as the native composition fallback. Use the media render/composer pipeline for final composition.",
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

  /*
   * OpenAI/Sora currently receives the
   * requested resolution as a routing intent,
   * while its actual output size is determined
   * by the provider adapter.
   *
   * We intentionally do not pretend that Sora
   * produced native 4K.
   */
  if (
    route.provider ===
    "openai"
  ) {
    const result =
      await createOpenAIVideo(
        request,
        route,
        requestedProvider,
        route.fallback,
      );

    /*
     * Automatic Google -> OpenAI route is
     * already selected before execution.
     *
     * No duplicate provider call occurs.
     */
    return result;
  }

  /*
   * Google Veo direct execution.
   */
  const googleResult =
    await createGoogleVideo(
      request,
      route,
      requestedProvider,
      route.fallback,
    );

  /*
   * IMPORTANT:
   *
   * Only automatic requests may fall back.
   *
   * Explicit:
   * provider=google-veo
   *
   * never falls back.
   *
   * Automatic:
   * provider omitted
   *
   * may fall back to OpenAI if Google rejects
   * the request at execution time.
   */
  if (
    googleResult.success ||
    explicitlyRequestedProvider ||
    !isOpenAIConfigured()
  ) {
    return googleResult;
  }

  const fallbackRoute =
    buildRoute(
      "openai",
      "video",
      route.resolution,
      resolveOpenAIModel(
        undefined,
      ),
      "Google Veo execution failed; automatic failover to OpenAI Sora.",
      true,
      true,
    );

  const fallbackResult =
    await createOpenAIVideo(
      request,
      fallbackRoute,
      requestedProvider,
      true,
    );

  if (
    fallbackResult.success
  ) {
    return {
      ...fallbackResult,

      code:
        "MEDIA_GENERATION_FALLBACK_CREATED",

      metadata: {
        ...(fallbackResult.metadata ||
          {}),
        fallbackFrom:
          "google-veo",
        fallbackReason:
          googleResult.error ||
          googleResult.code,
      },
    };
  }

  return {
    ...googleResult,

    code:
      "MEDIA_GENERATION_ALL_PROVIDERS_FAILED",

    metadata: {
      fallbackAttempted:
        true,
      primaryProvider:
        "google-veo",
      fallbackProvider:
        "openai",
      primaryError:
        googleResult.error ||
        googleResult.code,
      fallbackError:
        fallbackResult.error ||
        fallbackResult.code,
    },

    error: [
      "Primary provider failed:",
      googleResult.error ||
        googleResult.code,
      "Fallback provider failed:",
      fallbackResult.error ||
        fallbackResult.code,
    ].join(" "),
  };
}

export async function getMediaGenerationJob(
  operationName: string,
  provider?: string,
): Promise<MediaGenerationRouterResult> {
  const normalizedOperation =
    operationName.trim();

  if (!normalizedOperation) {
    return {
      success: false,
      code:
        "MEDIA_OPERATION_REQUIRED",
      route:
        resolveMediaGenerationRoute({
          kind: "video",
          provider:
            provider ||
            "google-veo",
        }),
      error:
        "A provider operation ID is required.",
    };
  }

  const normalizedProvider =
    normalizeProvider(
      provider,
    );

  /*
   * Explicit provider status.
   *
   * C146.18.3 calls this without provider,
   * therefore Google remains the default.
   */
  if (
    normalizedProvider ===
      "openai" ||
    normalizedProvider ===
      "openai-video" ||
    normalizedProvider ===
      "sora" ||
    normalizedProvider ===
      "sora-2"
  ) {
    const route =
      resolveMediaGenerationRoute({
        kind: "video",
        provider: "openai",
      });

    if (!route.configured) {
      return {
        success: false,
        code:
          "OPENAI_API_KEY_MISSING",
        route,
        error:
          "OPENAI_API_KEY is not configured.",
      };
    }

    try {
      const job =
        await retrieveOpenAIVideoJob(
          normalizedOperation,
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
          job.id,

        providerStatus:
          job.status,

        providerProgress:
          job.progress,

        error:
          job.error?.message,

        metadata: {
          provider:
            "openai",
          providerJobId:
            job.id,
          model:
            job.model,
        },
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
            : "Unable to retrieve OpenAI video status.",
      };
    }
  }

  /*
   * Default status provider = Google Veo.
   *
   * This preserves C146.18.3 compatibility.
   */
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
        "GEMINI_API_KEY or GOOGLE_API_KEY is not configured.",
    };
  }

  try {
    const job =
      await retrieveGoogleVideoJob(
        normalizedOperation,
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

      metadata: {
        provider:
          "google-veo",
        providerJobId:
          job.operationName,
        model:
          job.model,
      },
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
          : "Unable to retrieve Google Veo status.",
    };
  }
}
