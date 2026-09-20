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

export type MediaProviderFailureClass =
  | "QUOTA_EXCEEDED"
  | "NO_CREDITS"
  | "RATE_LIMITED"
  | "AUTH_FAILED"
  | "BILLING_REQUIRED"
  | "REGION_RESTRICTED"
  | "CONFIGURATION_MISSING"
  | "INVALID_REQUEST"
  | "PROVIDER_UNAVAILABLE"
  | "TIMEOUT"
  | "UNKNOWN";

export type MediaProviderAttemptStatus =
  | "success"
  | "failed"
  | "not_attempted";

export interface MediaProviderAttemptTrace {
  provider: MediaGenerationProvider;
  model: string;
  status: MediaProviderAttemptStatus;
  failureClass?: MediaProviderFailureClass;
  code?: string;
  error?: string;
  jobId?: string | null;
  fallbackFrom?: MediaGenerationProvider | null;
  fallbackTo?: MediaGenerationProvider | null;
}

export interface MediaFailoverTrace {
  automatic: boolean;
  initialProvider: MediaGenerationProvider;
  finalProvider: MediaGenerationProvider;
  fallbackAttempted: boolean;
  fallbackFrom?: MediaGenerationProvider | null;
  fallbackTo?: MediaGenerationProvider | null;
  silentSubstitution: boolean;
  attempts: MediaProviderAttemptTrace[];
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

  failoverTrace?: MediaFailoverTrace;
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
      true,
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
        true,
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
    true,
  );
}

/**
 * Automatic provider resolution.
 *
 * Automatic video priority:
 *
 * Google Veo
 *    ↓ execution failure
 * OpenAI Sora
 *    ↓ execution failure
 * AIOS Composer
 *
 * Explicit provider requests never silently substitute.
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

  return buildRoute(
    "aios-composer",
    "video",
    requestedRoute.resolution,
    "aios-composer",
    "Google Veo and OpenAI Sora are unavailable; automatic routing falls back to the AIOS Composer pipeline.",
    true,
    true,
  );
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
      return true;

    default:
      return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Failure classification                                                     */
/* -------------------------------------------------------------------------- */

function classifyProviderFailure(
  error: unknown,
): MediaProviderFailureClass {
  const message =
    error instanceof Error
      ? error.message
      : String(error ?? "");

  const normalized =
    message.toLowerCase();

  if (
    normalized.includes("quota") ||
    normalized.includes(
      "exceeded your current quota",
    ) ||
    normalized.includes(
      "resource_exhausted",
    )
  ) {
    return "QUOTA_EXCEEDED";
  }

  if (
    normalized.includes(
      "no credits remaining",
    ) ||
    normalized.includes(
      "insufficient credits",
    ) ||
    normalized.includes(
      "credits remaining",
    )
  ) {
    return "NO_CREDITS";
  }

  if (
    normalized.includes("429") ||
    normalized.includes(
      "rate limit",
    ) ||
    normalized.includes(
      "too many requests",
    )
  ) {
    return "RATE_LIMITED";
  }

  if (
    normalized.includes(
      "unauthorized",
    ) ||
    normalized.includes(
      "authentication",
    ) ||
    normalized.includes(
      "invalid api key",
    ) ||
    normalized.includes(
      "api key is invalid",
    )
  ) {
    return "AUTH_FAILED";
  }

  if (
    normalized.includes(
      "billing",
    ) ||
    normalized.includes(
      "payment required",
    ) ||
    normalized.includes(
      "billing account",
    )
  ) {
    return "BILLING_REQUIRED";
  }

  if (
    normalized.includes(
      "region",
    ) ||
    normalized.includes(
      "location",
    ) ||
    normalized.includes(
      "not available in your country",
    ) ||
    normalized.includes(
      "not available in your region",
    )
  ) {
    return "REGION_RESTRICTED";
  }

  if (
    normalized.includes(
      "required",
    ) ||
    normalized.includes(
      "invalid request",
    ) ||
    normalized.includes(
      "bad request",
    )
  ) {
    return "INVALID_REQUEST";
  }

  if (
    normalized.includes(
      "timeout",
    ) ||
    normalized.includes(
      "timed out",
    )
  ) {
    return "TIMEOUT";
  }

  if (
    normalized.includes(
      "unavailable",
    ) ||
    normalized.includes(
      "service unavailable",
    ) ||
    normalized.includes(
      "temporarily unavailable",
    )
  ) {
    return "PROVIDER_UNAVAILABLE";
  }

  return "UNKNOWN";
}

function classifyProviderCode(
  code: string,
): MediaProviderFailureClass {
  const normalized =
    code.toLowerCase();

  if (
    normalized.includes("quota")
  ) {
    return "QUOTA_EXCEEDED";
  }

  if (
    normalized.includes("credit")
  ) {
    return "NO_CREDITS";
  }

  if (
    normalized.includes("rate")
  ) {
    return "RATE_LIMITED";
  }

  if (
    normalized.includes("auth") ||
    normalized.includes("key")
  ) {
    return "AUTH_FAILED";
  }

  if (
    normalized.includes("billing")
  ) {
    return "BILLING_REQUIRED";
  }

  return "UNKNOWN";
}

function getFailureClass(
  code: string,
  error?: string,
): MediaProviderFailureClass {
  if (error) {
    const classified =
      classifyProviderFailure(
        error,
      );

    if (classified !== "UNKNOWN") {
      return classified;
    }
  }

  return classifyProviderCode(
    code,
  );
}

/* -------------------------------------------------------------------------- */
/* Trace helpers                                                              */
/* -------------------------------------------------------------------------- */

function createTrace(
  initialProvider: MediaGenerationProvider,
  automatic: boolean,
): MediaFailoverTrace {
  return {
    automatic,
    initialProvider,
    finalProvider: initialProvider,
    fallbackAttempted: false,
    fallbackFrom: null,
    fallbackTo: null,
    silentSubstitution: false,
    attempts: [],
  };
}

function appendAttempt(
  trace: MediaFailoverTrace,
  attempt: MediaProviderAttemptTrace,
): MediaFailoverTrace {
  trace.attempts.push(attempt);
  return trace;
}

function finalizeTrace(
  trace: MediaFailoverTrace,
  finalProvider: MediaGenerationProvider,
): MediaFailoverTrace {
  return {
    ...trace,
    finalProvider,
  };
}

function failureAttempt(
  route: MediaGenerationRoute,
  code: string,
  error?: string,
  fallbackFrom?: MediaGenerationProvider | null,
  fallbackTo?: MediaGenerationProvider | null,
): MediaProviderAttemptTrace {
  return {
    provider: route.provider,
    model: route.model,
    status: "failed",
    failureClass:
      getFailureClass(
        code,
        error,
      ),
    code,
    error,
    jobId: null,
    fallbackFrom:
      fallbackFrom ?? null,
    fallbackTo:
      fallbackTo ?? null,
  };
}

function successAttempt(
  route: MediaGenerationRoute,
  jobId?: string | null,
  fallbackFrom?: MediaGenerationProvider | null,
): MediaProviderAttemptTrace {
  return {
    provider: route.provider,
    model: route.model,
    status: "success",
    code:
      "MEDIA_GENERATION_JOB_CREATED",
    jobId:
      jobId ?? null,
    fallbackFrom:
      fallbackFrom ?? null,
    fallbackTo: null,
  };
}

/* -------------------------------------------------------------------------- */
/* Provider adapters                                                          */
/* -------------------------------------------------------------------------- */

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
  trace?: MediaFailoverTrace,
): MediaGenerationRouterResult {
  return {
    success: true,
    code:
      fallback
        ? "MEDIA_GENERATION_FALLBACK_CREATED"
        : "MEDIA_GENERATION_JOB_CREATED",
    route,
    requestedProvider,
    fallback,
    job,
    providerJobId: job.id,
    providerStatus: job.status,
    providerProgress: job.progress,
    failoverTrace: trace,
    metadata: {
      provider: "openai",
      providerJobId: job.id,
      model: job.model,
      seconds: job.seconds,
      size: job.size,
    },
  };
}

function buildGoogleJobResult(
  job: GoogleVideoJob,
  route: MediaGenerationRoute,
  requestedProvider?: string,
  fallback = false,
  trace?: MediaFailoverTrace,
): MediaGenerationRouterResult {
  return {
    success: true,
    code:
      fallback
        ? "MEDIA_GENERATION_FALLBACK_CREATED"
        : "MEDIA_GENERATION_JOB_CREATED",
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
    failoverTrace: trace,
    metadata: {
      provider: "google-veo",
      providerJobId:
        job.operationName,
      model: job.model,
    },
  };
}

async function createOpenAIVideo(
  request: MediaGenerationRouteRequest,
  route: MediaGenerationRoute,
  requestedProvider?: string,
  fallback = false,
  trace?: MediaFailoverTrace,
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
      failoverTrace: trace,
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
      trace,
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
      failoverTrace: trace,
    };
  }
}

async function createGoogleVideo(
  request: MediaGenerationRouteRequest,
  route: MediaGenerationRoute,
  requestedProvider?: string,
  fallback = false,
  trace?: MediaFailoverTrace,
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
      failoverTrace: trace,
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
      trace,
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
      failoverTrace: trace,
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Main execution router                                                     */
/* -------------------------------------------------------------------------- */

export async function createMediaGenerationJob(
  request: MediaGenerationRouteRequest,
): Promise<MediaGenerationRouterResult> {
  const explicitlyRequestedProvider =
    normalizeProvider(
      request.provider,
    );

  const automatic =
    !explicitlyRequestedProvider;

  const route =
    automatic
      ? resolveAvailableMediaGenerationRoute(
          request,
        )
      : resolveMediaGenerationRoute(
          request,
        );

  const requestedProvider =
    explicitlyRequestedProvider ||
    undefined;

  const trace =
    createTrace(
      route.provider,
      automatic,
    );

  /*
   * Explicit provider requests NEVER fallback.
   */
  if (
    explicitlyRequestedProvider &&
    !route.configured
  ) {
    const code =
      route.provider ===
      "google-veo"
        ? "GEMINI_API_KEY_MISSING"
        : "MEDIA_PROVIDER_NOT_CONFIGURED";

    const error =
      route.provider ===
      "google-veo"
        ? "GEMINI_API_KEY or GOOGLE_API_KEY is not configured."
        : `${route.provider} is not configured.`;

    appendAttempt(
      trace,
      failureAttempt(
        route,
        code,
        error,
      ),
    );

    return {
      success: false,
      code,
      route,
      requestedProvider,
      fallback: false,
      error,
      failoverTrace:
        finalizeTrace(
          trace,
          route.provider,
        ),
    };
  }

  if (
    route.provider ===
    "aios-composer"
  ) {
    appendAttempt(
      trace,
      {
        provider:
          "aios-composer",
        model:
          "aios-composer",
        status:
          "not_attempted",
        code:
          "MEDIA_PROVIDER_ROUTE_NOT_ASYNC",
        error:
          "AIOS Composer remains the native composition/rendering fallback.",
        jobId: null,
      },
    );

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
      failoverTrace:
        finalizeTrace(
          trace,
          "aios-composer",
        ),
    };
  }

  const prompt =
    typeof request.prompt ===
    "string"
      ? request.prompt.trim()
      : "";

  if (!prompt) {
    appendAttempt(
      trace,
      failureAttempt(
        route,
        "MEDIA_PROMPT_REQUIRED",
        "A media prompt is required.",
      ),
    );

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
      failoverTrace:
        finalizeTrace(
          trace,
          route.provider,
        ),
    };
  }

  if (
    !RESOLUTIONS.includes(
      route.resolution,
    )
  ) {
    appendAttempt(
      trace,
      failureAttempt(
        route,
        "MEDIA_RESOLUTION_INVALID",
        "Unsupported media resolution.",
      ),
    );

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
      failoverTrace:
        finalizeTrace(
          trace,
          route.provider,
        ),
    };
  }

  /*
   * OpenAI direct route.
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
        trace,
      );

    if (result.success) {
      appendAttempt(
        trace,
        successAttempt(
          route,
          result.providerJobId,
        ),
      );

      return {
        ...result,
        failoverTrace:
          finalizeTrace(
            trace,
            "openai",
          ),
      };
    }

    appendAttempt(
      trace,
      failureAttempt(
        route,
        result.code,
        result.error,
      ),
    );

    return {
      ...result,
      failoverTrace:
        finalizeTrace(
          trace,
          "openai",
        ),
    };
  }

  /*
   * Google Veo primary execution.
   */
  const googleResult =
    await createGoogleVideo(
      request,
      route,
      requestedProvider,
      false,
      trace,
    );

  if (googleResult.success) {
    appendAttempt(
      trace,
      successAttempt(
        route,
        googleResult.providerJobId,
      ),
    );

    return {
      ...googleResult,
      failoverTrace:
        finalizeTrace(
          trace,
          "google-veo",
        ),
    };
  }

  appendAttempt(
    trace,
    failureAttempt(
      route,
      googleResult.code,
      googleResult.error,
    ),
  );

  /*
   * Explicit Google request:
   *
   * STOP.
   *
   * No silent fallback.
   */
  if (
    explicitlyRequestedProvider
  ) {
    return {
      ...googleResult,
      fallback: false,
      failoverTrace:
        finalizeTrace(
          trace,
          "google-veo",
        ),
    };
  }

  /*
   * Automatic request:
   *
   * Google failed.
   * Try OpenAI.
   */
  if (
    isOpenAIConfigured()
  ) {
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

    trace.fallbackAttempted =
      true;

    trace.fallbackFrom =
      "google-veo";

    trace.fallbackTo =
      "openai";

    const fallbackResult =
      await createOpenAIVideo(
        request,
        fallbackRoute,
        undefined,
        true,
        trace,
      );

    if (
      fallbackResult.success
    ) {
      appendAttempt(
        trace,
        successAttempt(
          fallbackRoute,
          fallbackResult.providerJobId,
          "google-veo",
        ),
      );

      return {
        ...fallbackResult,
        code:
          "MEDIA_GENERATION_FALLBACK_CREATED",
        fallback: true,
        failoverTrace:
          finalizeTrace(
            trace,
            "openai",
          ),
        metadata: {
          ...(fallbackResult.metadata ||
            {}),
          fallbackFrom:
            "google-veo",
          fallbackTo:
            "openai",
          fallbackReason:
            googleResult.error ||
            googleResult.code,
          primaryFailureClass:
            getFailureClass(
              googleResult.code,
              googleResult.error,
            ),
        },
      };
    }

    appendAttempt(
      trace,
      failureAttempt(
        fallbackRoute,
        fallbackResult.code,
        fallbackResult.error,
        "google-veo",
        "openai",
      ),
    );

    /*
     * OpenAI failed too.
     *
     * Composer is the next native fallback,
     * but Composer is not an async provider job.
     * Record it explicitly instead of pretending
     * that a provider job was created.
     */
    const composerRoute =
      buildRoute(
        "aios-composer",
        "video",
        route.resolution,
        "aios-composer",
        "Direct providers failed; AIOS Composer is the native rendering fallback.",
        true,
        true,
      );

    appendAttempt(
      trace,
      {
        provider:
          "aios-composer",
        model:
          "aios-composer",
        status:
          "not_attempted",
        code:
          "MEDIA_PROVIDER_ROUTE_NOT_ASYNC",
        error:
          "Composer fallback requires the native AIOS composition/render pipeline.",
        jobId: null,
        fallbackFrom:
          "openai",
        fallbackTo:
          "aios-composer",
      },
    );

    trace.finalProvider =
      "aios-composer";

    return {
      success: false,
      code:
        "MEDIA_GENERATION_ALL_PROVIDERS_FAILED",
      route: composerRoute,
      requestedProvider,
      fallback: true,
      error: [
        "Google Veo failed:",
        googleResult.error ||
          googleResult.code,
        "OpenAI Sora failed:",
        fallbackResult.error ||
          fallbackResult.code,
        "AIOS Composer was not executed because it uses the native composition/render pipeline rather than an asynchronous provider job.",
      ].join(" "),
      failoverTrace:
        finalizeTrace(
          trace,
          "aios-composer",
        ),
      metadata: {
        fallbackAttempted:
          true,
        primaryProvider:
          "google-veo",
        fallbackProvider:
          "openai",
        composerFallback:
          "available-but-not-async",
        primaryError:
          googleResult.error ||
          googleResult.code,
        primaryFailureClass:
          getFailureClass(
            googleResult.code,
            googleResult.error,
          ),
        fallbackError:
          fallbackResult.error ||
          fallbackResult.code,
        fallbackFailureClass:
          getFailureClass(
            fallbackResult.code,
            fallbackResult.error,
          ),
      },
    };
  }

  /*
   * Google failed and OpenAI is not configured.
   * Record Composer as available native fallback.
   */
  const composerRoute =
    buildRoute(
      "aios-composer",
      "video",
      route.resolution,
      "aios-composer",
      "Google Veo failed and OpenAI is unavailable; AIOS Composer is the native fallback.",
      true,
      true,
    );

  appendAttempt(
    trace,
    {
      provider:
        "aios-composer",
      model:
        "aios-composer",
      status:
        "not_attempted",
      code:
        "MEDIA_PROVIDER_ROUTE_NOT_ASYNC",
      error:
        "Composer fallback requires the native AIOS composition/render pipeline.",
      jobId: null,
      fallbackFrom:
        "google-veo",
      fallbackTo:
        "aios-composer",
    },
  );

  return {
    success: false,
    code:
      "MEDIA_GENERATION_ALL_PROVIDERS_FAILED",
    route: composerRoute,
    requestedProvider,
    fallback: true,
    error: [
      "Google Veo failed:",
      googleResult.error ||
        googleResult.code,
      "OpenAI Sora is not configured.",
      "AIOS Composer requires the native composition/render pipeline.",
    ].join(" "),
    failoverTrace:
      finalizeTrace(
        trace,
        "aios-composer",
      ),
    metadata: {
      fallbackAttempted:
        true,
      primaryProvider:
        "google-veo",
      primaryError:
        googleResult.error ||
        googleResult.code,
      primaryFailureClass:
        getFailureClass(
          googleResult.code,
          googleResult.error,
        ),
      fallbackProvider:
        "aios-composer",
      composerFallback:
        "available-but-not-async",
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Job retrieval                                                              */
/* -------------------------------------------------------------------------- */

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
   * OpenAI status retrieval.
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
   * Preserves C146.18.3 compatibility.
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
