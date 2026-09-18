import type {
  MediaAsset,
  MediaCapabilityContext,
  MediaGenerationProvider,
  MediaGenerationRequest,
  Storyboard,
  StoryboardScene,
} from "./types";

export type VideoGenerationMode =
  | "text-to-video"
  | "image-to-video"
  | "scene-to-video"
  | "storyboard-to-video";

export type VideoCapability =
  | "media.video.generate"
  | "media.image.generate"
  | "media.video.extend"
  | "media.video.transform";

export interface VideoGenerationOptions {
  provider?:
    | MediaGenerationProvider
    | "openai"
    | "external";

  model?: string;

  aspectRatio?: string;

  width?: number;

  height?: number;

  durationSeconds?: number;

  fps?: number;

  style?: string;

  camera?: string;

  motion?: string;

  quality?:
    | "draft"
    | "standard"
    | "high";

  format?:
    | "mp4"
    | "webm";

  negativePrompt?: string;
}

export interface VideoGenerationRequest
  extends MediaGenerationRequest {
  type: "video";

  mode: VideoGenerationMode;

  sourceAsset?: MediaAsset;

  sceneId?: string;

  sceneIndex?: number;

  options: VideoGenerationOptions;
}

export interface VideoGenerationPlan {
  requestId: string;

  mode: VideoGenerationMode;

  requests: VideoGenerationRequest[];

  durationSeconds: number;

  aspectRatio: string;

  provider:
    MediaGenerationProvider;

  capabilities: VideoCapability[];

  metadata?: Record<
    string,
    unknown
  >;
}

export interface VideoGenerationResult {
  success: boolean;

  requestId: string;

  plan: VideoGenerationPlan;

  warnings: string[];

  errors: string[];

  code: string;

  createdAt: number;
}

const DEFAULT_VIDEO_OPTIONS:
  Required<
    Pick<
      VideoGenerationOptions,
      | "aspectRatio"
      | "width"
      | "height"
      | "durationSeconds"
      | "fps"
      | "quality"
      | "format"
    >
  > = {
    aspectRatio: "9:16",
    width: 1080,
    height: 1920,
    durationSeconds: 5,
    fps: 30,
    quality: "standard",
    format: "mp4",
  };

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(
    max,
    Math.max(min, value),
  );
}

function normalizeText(
  value: string | undefined,
): string {
  return (
    value
      ?.replace(/\s+/g, " ")
      .trim() || ""
  );
}

function safeDuration(
  value: number | undefined,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return DEFAULT_VIDEO_OPTIONS.durationSeconds;
  }

  return clamp(
    value,
    1,
    60,
  );
}

function normalizeProvider(
  provider?: MediaGenerationProvider,
): MediaGenerationProvider {
  return provider || "external";
}

function buildVideoPrompt(
  scene: StoryboardScene,
): string {
  const parts = [
    scene.videoPrompt,
    scene.visualPrompt,
    scene.description,
  ]
    .map(normalizeText)
    .filter(Boolean);

  if (parts.length === 0) {
    return "Generate a cinematic video scene.";
  }

  return parts.join(". ");
}

function buildRequest(
  scene: StoryboardScene,
  options: VideoGenerationOptions,
  context?: MediaCapabilityContext,
): VideoGenerationRequest {
  const now = Date.now();

  const durationSeconds =
    safeDuration(
      options.durationSeconds ??
        scene.durationSeconds,
    );

  const provider =
    normalizeProvider(
      options.provider,
    );

  const requestId =
    `${context?.requestId || "media"}-video-${scene.index}-${now}`;

  return {
    id: requestId,

    type: "video",

    mode: "scene-to-video",

    sceneId:
      scene.id,

    sceneIndex:
      scene.index,

    provider,

    prompt: {
      prompt:
        buildVideoPrompt(scene),

      negativePrompt:
        normalizeText(
          options.negativePrompt,
        ) || undefined,

      aspectRatio:
        options.aspectRatio ||
        "9:16",

      width:
        options.width ||
        DEFAULT_VIDEO_OPTIONS.width,

      height:
        options.height ||
        DEFAULT_VIDEO_OPTIONS.height,

      durationSeconds,

      metadata: {
        model:
          options.model,

        style:
          options.style ||
          "cinematic",

        camera:
          options.camera ||
          "natural cinematic camera",

        motion:
          options.motion ||
          "smooth realistic motion",

        fps:
          options.fps ||
          DEFAULT_VIDEO_OPTIONS.fps,

        quality:
          options.quality ||
          DEFAULT_VIDEO_OPTIONS.quality,

        format:
          options.format ||
          DEFAULT_VIDEO_OPTIONS.format,

        capability:
          "media.video.generate",
      },
    },

    options: {
      ...options,

      aspectRatio:
        options.aspectRatio ||
        DEFAULT_VIDEO_OPTIONS.aspectRatio,

      width:
        options.width ||
        DEFAULT_VIDEO_OPTIONS.width,

      height:
        options.height ||
        DEFAULT_VIDEO_OPTIONS.height,

      durationSeconds,

      fps:
        options.fps ||
        DEFAULT_VIDEO_OPTIONS.fps,

      quality:
        options.quality ||
        DEFAULT_VIDEO_OPTIONS.quality,

      format:
        options.format ||
        DEFAULT_VIDEO_OPTIONS.format,
    },

    userId:
      context?.userId,

    projectId:
      context?.projectId,

    createdAt:
      now,
  };
}

/**
 * Build a single text-to-video request.
 */
export function createTextToVideoRequest(
  prompt: string,
  options: VideoGenerationOptions = {},
  context?: MediaCapabilityContext,
): VideoGenerationRequest {
  const normalized =
    normalizeText(prompt);

  const now = Date.now();

  const provider =
    normalizeProvider(
      options.provider,
    );

  const durationSeconds =
    safeDuration(
      options.durationSeconds,
    );

  return {
    id:
      `${context?.requestId || "media"}-text-video-${now}`,

    type: "video",

    mode: "text-to-video",

    provider,

    prompt: {
      prompt:
        normalized ||
        "Generate a cinematic video.",

      negativePrompt:
        normalizeText(
          options.negativePrompt,
        ) || undefined,

      aspectRatio:
        options.aspectRatio ||
        DEFAULT_VIDEO_OPTIONS.aspectRatio,

      width:
        options.width ||
        DEFAULT_VIDEO_OPTIONS.width,

      height:
        options.height ||
        DEFAULT_VIDEO_OPTIONS.height,

      durationSeconds,

      metadata: {
        model:
          options.model,

        style:
          options.style ||
          "cinematic",

        camera:
          options.camera,

        motion:
          options.motion,

        fps:
          options.fps ||
          DEFAULT_VIDEO_OPTIONS.fps,

        quality:
          options.quality ||
          DEFAULT_VIDEO_OPTIONS.quality,

        format:
          options.format ||
          DEFAULT_VIDEO_OPTIONS.format,
      },
    },

    options: {
      ...options,
      aspectRatio:
        options.aspectRatio ||
        DEFAULT_VIDEO_OPTIONS.aspectRatio,
      width:
        options.width ||
        DEFAULT_VIDEO_OPTIONS.width,
      height:
        options.height ||
        DEFAULT_VIDEO_OPTIONS.height,
      durationSeconds,
      fps:
        options.fps ||
        DEFAULT_VIDEO_OPTIONS.fps,
      quality:
        options.quality ||
        DEFAULT_VIDEO_OPTIONS.quality,
      format:
        options.format ||
        DEFAULT_VIDEO_OPTIONS.format,
    },

    userId:
      context?.userId,

    projectId:
      context?.projectId,

    createdAt:
      now,
  };
}

/**
 * Build an image-to-video request.
 */
export function createImageToVideoRequest(
  sourceAsset: MediaAsset,
  prompt: string,
  options: VideoGenerationOptions = {},
  context?: MediaCapabilityContext,
): VideoGenerationRequest {
  const now = Date.now();

  const provider =
    normalizeProvider(
      options.provider,
    );

  const durationSeconds =
    safeDuration(
      options.durationSeconds,
    );

  return {
    id:
      `${context?.requestId || "media"}-image-video-${now}`,

    type: "video",

    mode: "image-to-video",

    sourceAsset,

    provider,

    prompt: {
      prompt:
        normalizeText(prompt) ||
        "Animate the source image naturally.",

      negativePrompt:
        normalizeText(
          options.negativePrompt,
        ) || undefined,

      aspectRatio:
        options.aspectRatio ||
        DEFAULT_VIDEO_OPTIONS.aspectRatio,

      width:
        options.width ||
        DEFAULT_VIDEO_OPTIONS.width,

      height:
        options.height ||
        DEFAULT_VIDEO_OPTIONS.height,

      durationSeconds,

      metadata: {
        sourceAssetId:
          sourceAsset.id,

        model:
          options.model,

        style:
          options.style,

        camera:
          options.camera,

        motion:
          options.motion ||
          "natural motion",

        fps:
          options.fps ||
          DEFAULT_VIDEO_OPTIONS.fps,

        quality:
          options.quality ||
          DEFAULT_VIDEO_OPTIONS.quality,

        format:
          options.format ||
          DEFAULT_VIDEO_OPTIONS.format,
      },
    },

    inputAssets: [
      sourceAsset,
    ],

    options: {
      ...options,
      durationSeconds,
      aspectRatio:
        options.aspectRatio ||
        DEFAULT_VIDEO_OPTIONS.aspectRatio,
      width:
        options.width ||
        DEFAULT_VIDEO_OPTIONS.width,
      height:
        options.height ||
        DEFAULT_VIDEO_OPTIONS.height,
      fps:
        options.fps ||
        DEFAULT_VIDEO_OPTIONS.fps,
      quality:
        options.quality ||
        DEFAULT_VIDEO_OPTIONS.quality,
      format:
        options.format ||
        DEFAULT_VIDEO_OPTIONS.format,
    },

    userId:
      context?.userId,

    projectId:
      context?.projectId,

    createdAt:
      now,
  };
}

/**
 * Convert a complete storyboard into
 * independent video-generation requests.
 */
export function buildStoryboardVideoPlan(
  storyboard: Storyboard,
  options: VideoGenerationOptions = {},
  context?: MediaCapabilityContext,
): VideoGenerationPlan {
  const requests =
    storyboard.scenes.map(
      (scene) =>
        buildRequest(
          scene,
          {
            ...options,

            durationSeconds:
              options.durationSeconds ||
              scene.durationSeconds,

            aspectRatio:
              options.aspectRatio ||
              storyboard.aspectRatio ||
              DEFAULT_VIDEO_OPTIONS.aspectRatio,
          },
          context,
        ),
    );

  return {
    requestId:
      context?.requestId ||
      `media-video-${Date.now()}`,

    mode:
      "storyboard-to-video",

    requests,

    durationSeconds:
      storyboard.totalDurationSeconds,

    aspectRatio:
      options.aspectRatio ||
      storyboard.aspectRatio ||
      DEFAULT_VIDEO_OPTIONS.aspectRatio,

    provider:
      normalizeProvider(
        options.provider,
      ),

    capabilities: [
      "media.video.generate",
    ],

    metadata: {
      storyboardId:
        storyboard.id,

      sceneCount:
        storyboard.scenes.length,

      targetPlatform:
        storyboard.targetPlatform,

      language:
        storyboard.language,
    },
  };
}

export function validateVideoGenerationPlan(
  plan: VideoGenerationPlan,
): string[] {
  const errors: string[] = [];

  if (!plan.requestId) {
    errors.push(
      "Video requestId is required.",
    );
  }

  if (
    !Number.isFinite(
      plan.durationSeconds,
    ) ||
    plan.durationSeconds <= 0
  ) {
    errors.push(
      "Video duration must be greater than zero.",
    );
  }

  if (
    !plan.aspectRatio
  ) {
    errors.push(
      "Video aspect ratio is required.",
    );
  }

  if (
    !Array.isArray(
      plan.requests,
    ) ||
    plan.requests.length === 0
  ) {
    errors.push(
      "At least one video generation request is required.",
    );
  }

  for (const request of plan.requests) {
    if (!request.id) {
      errors.push(
        "Video generation request id is required.",
      );
    }

    if (
      request.type !== "video"
    ) {
      errors.push(
        `Request ${request.id} is not a video request.`,
      );
    }

    if (
      !request.prompt.prompt
    ) {
      errors.push(
        `Request ${request.id} has an empty prompt.`,
      );
    }

    const duration =
      request.options
        .durationSeconds;

    if (
      typeof duration !==
        "number" ||
      duration <= 0
    ) {
      errors.push(
        `Request ${request.id} has invalid duration.`,
      );
    }

    const width =
      request.options.width;

    const height =
      request.options.height;

    if (
      typeof width !==
        "number" ||
      width <= 0 ||
      typeof height !==
        "number" ||
      height <= 0
    ) {
      errors.push(
        `Request ${request.id} has invalid dimensions.`,
      );
    }
  }

  return errors;
}

/**
 * Main C146.5 entry point.
 *
 * This layer creates executable provider-neutral
 * video requests. It intentionally does not pretend
 * that a provider has already generated the video.
 */
export function createVideoGenerationRuntime(
  storyboard: Storyboard,
  options: VideoGenerationOptions = {},
  context?: MediaCapabilityContext,
): VideoGenerationResult {
  const createdAt = Date.now();

  const plan =
    buildStoryboardVideoPlan(
      storyboard,
      options,
      context,
    );

  const errors =
    validateVideoGenerationPlan(
      plan,
    );

  const warnings: string[] = [];

  if (
    plan.provider ===
    "external" ||
    plan.provider ===
    "unknown"
  ) {
    warnings.push(
      "No concrete video provider adapter is configured; requests remain provider-neutral.",
    );
  }

  if (
    plan.requests.length > 0
  ) {
    warnings.push(
      "Video generation requests require a provider adapter before remote generation can execute.",
    );
  }

  return {
    success:
      errors.length === 0,

    requestId:
      plan.requestId,

    plan,

    warnings,

    errors,

    code:
      errors.length === 0
        ? "C146_5_VIDEO_RUNTIME_PLAN_READY"
        : "C146_5_VIDEO_RUNTIME_PLAN_INVALID",

    createdAt,
  };
}
