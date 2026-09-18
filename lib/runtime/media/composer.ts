import type {
  MediaAsset,
  MediaCapabilityContext,
  MediaProject,
  RenderRequest,
  Storyboard,
  SubtitleCue,
  SubtitleTrack,
  Timeline,
  TimelineVisualTrack,
} from "./types";
import {
  type AudioRuntimePlan,
  createAudioRuntime,
  validateAudioRuntimePlan,
} from "./audio";
import {
  type VideoGenerationOptions,
  buildStoryboardVideoPlan,
  validateVideoGenerationPlan,
} from "./video";
import {
  validateStoryboard,
} from "./storyboard";

export interface VideoCompositionOptions {
  title?: string;

  description?: string;

  width?: number;

  height?: number;

  frameRate?: number;

  background?: string;

  outputFormat?: "mp4" | "webm";

  quality?: "draft" | "standard" | "high";

  language?: string;

  includeSubtitles?: boolean;

  subtitleStyle?: Record<string, unknown>;

  video?: VideoGenerationOptions;

  musicPrompt?: string;

  musicProvider?: string;

  musicModel?: string;

  musicVolume?: number;

  voiceVolume?: number;

  metadata?: Record<string, unknown>;
}

export interface CompositionRenderPlan {
  request: RenderRequest;

  status:
    | "ready"
    | "invalid";

  errors: string[];

  warnings: string[];

  ffmpegRequired: boolean;

  outputFormat: "mp4" | "webm";
}

export interface OneClickVideoPlan {
  requestId: string;

  projectId: string;

  title: string;

  storyboard: Storyboard;

  videoPlan: ReturnType<
    typeof buildStoryboardVideoPlan
  >;

  audioPlan: AudioRuntimePlan;

  timeline: Timeline;

  render: CompositionRenderPlan;

  assets: MediaAsset[];

  status:
    | "ready_for_generation"
    | "ready_for_render"
    | "invalid";

  errors: string[];

  warnings: string[];

  createdAt: number;

  updatedAt: number;
}

export interface OneClickVideoResult {
  success: boolean;

  requestId: string;

  project: MediaProject;

  plan: OneClickVideoPlan;

  code: string;

  errors: string[];

  warnings: string[];

  createdAt: number;
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

function safeDimension(
  value: number | undefined,
  fallback: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return fallback;
  }

  return Math.round(value);
}

function safeFrameRate(
  value: number | undefined,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return 30;
  }

  return clamp(
    Math.round(value),
    12,
    60,
  );
}

function buildDefaultSubtitleTrack(
  storyboard: Storyboard,
  options: VideoCompositionOptions,
): SubtitleTrack | undefined {
  if (
    options.includeSubtitles === false
  ) {
    return undefined;
  }

  const language =
    options.language ||
    storyboard.language ||
    "zh-CN";

  const cues: SubtitleCue[] = [];

  let cursor = 0;

  for (const scene of storyboard.scenes) {
    const text = normalizeText(
      scene.narration ||
        scene.description,
    );

    const start =
      Number(
        cursor.toFixed(2),
      );

    const end =
      Number(
        (
          cursor +
          scene.durationSeconds
        ).toFixed(2),
      );

    if (text) {
      cues.push({
        id:
          `subtitle-${scene.id}`,
        startTimeSeconds:
          start,
        endTimeSeconds:
          end,
        text,
        language,
        style:
          options.subtitleStyle,
      });
    }

    cursor = end;
  }

  return {
    id:
      `subtitle-track-${Date.now()}`,
    language,
    cues,
  };
}

function createPlaceholderAsset(
  sceneId: string,
  index: number,
  durationSeconds: number,
  now: number,
): MediaAsset {
  return {
    id:
      `video-scene-${sceneId}-${now}`,
    type: "video",
    status: "pending",
    provider: "unknown",
    mimeType: "video/mp4",
    title:
      `Scene ${index} video`,
    description:
      `Pending generated video for ${sceneId}.`,
    durationSeconds,
    metadata: {
      sceneId,
      sceneIndex: index,
      generated:
        false,
      requiresProvider:
        true,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function buildVisualTracks(
  storyboard: Storyboard,
  existingAssets: MediaAsset[],
  now: number,
): TimelineVisualTrack[] {
  let cursor = 0;

  return storyboard.scenes.map(
    (scene) => {
      const matchingAsset =
        existingAssets.find(
          (asset) =>
            asset.type === "video" &&
            (
              asset.metadata
                ?.sceneId ===
              scene.id
            ),
        );

      const asset =
        matchingAsset ||
        scene.assets?.find(
          (candidate) =>
            candidate.type === "video",
        ) ||
        createPlaceholderAsset(
          scene.id,
          scene.index,
          scene.durationSeconds,
          now,
        );

      const track:
        TimelineVisualTrack = {
        id:
          `visual-${scene.id}`,
        asset,
        startTimeSeconds:
          Number(
            cursor.toFixed(2),
          ),
        durationSeconds:
          scene.durationSeconds,
        opacity: 1,
        transitionIn:
          scene.transition,
        transitionOut:
          scene.transition,
        metadata: {
          sceneId:
            scene.id,
          sceneIndex:
            scene.index,
          pending:
            asset.status !==
            "ready",
        },
      };

      cursor +=
        scene.durationSeconds;

      return track;
    },
  );
}

function buildTimeline(
  storyboard: Storyboard,
  audioPlan: AudioRuntimePlan,
  assets: MediaAsset[],
  options: VideoCompositionOptions,
  now: number,
): Timeline {
  const width =
    safeDimension(
      options.width,
      1080,
    );

  const height =
    safeDimension(
      options.height,
      1920,
    );

  const frameRate =
    safeFrameRate(
      options.frameRate,
    );

  const subtitleTrack =
    buildDefaultSubtitleTrack(
      storyboard,
      options,
    );

  const subtitleTracks =
    subtitleTrack
      ? [subtitleTrack]
      : [];

  return {
    id:
      `timeline-${now}`,

    durationSeconds:
      storyboard.totalDurationSeconds,

    width,

    height,

    frameRate,

    background:
      options.background ||
      "#000000",

    visualTracks:
      buildVisualTracks(
        storyboard,
        assets,
        now,
      ),

    voiceTracks:
      audioPlan.voiceTracks,

    musicTracks:
      audioPlan.musicTracks,

    subtitleTracks,

    metadata: {
      architecture:
        "aios-one-click-video-composer",

      storyboardId:
        storyboard.id,

      sceneCount:
        storyboard.scenes.length,

      subtitleEnabled:
        subtitleTracks.length >
        0,

      audioDuration:
        audioPlan.durationSeconds,

      ...options.metadata,
    },

    createdAt:
      now,

    updatedAt:
      now,
  };
}

function validateTimeline(
  timeline: Timeline,
): string[] {
  const errors: string[] = [];

  if (!timeline.id) {
    errors.push(
      "Timeline id is required.",
    );
  }

  if (
    !Number.isFinite(
      timeline.durationSeconds,
    ) ||
    timeline.durationSeconds <= 0
  ) {
    errors.push(
      "Timeline duration must be greater than zero.",
    );
  }

  if (
    timeline.width <= 0 ||
    timeline.height <= 0
  ) {
    errors.push(
      "Timeline dimensions must be greater than zero.",
    );
  }

  if (
    timeline.frameRate <= 0
  ) {
    errors.push(
      "Timeline frame rate must be greater than zero.",
    );
  }

  if (
    !Array.isArray(
      timeline.visualTracks,
    ) ||
    timeline.visualTracks.length === 0
  ) {
    errors.push(
      "Timeline must contain at least one visual track.",
    );
  }

  for (
    const track of
      timeline.visualTracks
  ) {
    if (!track.asset) {
      errors.push(
        `Visual track ${track.id} has no asset.`,
      );
    }

    if (
      track.startTimeSeconds <
      0
    ) {
      errors.push(
        `Visual track ${track.id} has invalid start time.`,
      );
    }

    if (
      track.durationSeconds <=
      0
    ) {
      errors.push(
        `Visual track ${track.id} has invalid duration.`,
      );
    }
  }

  for (
    const track of
      timeline.voiceTracks
  ) {
    if (
      track.startTimeSeconds <
      0
    ) {
      errors.push(
        `Voice track ${track.id} has invalid start time.`,
      );
    }
  }

  for (
    const track of
      timeline.musicTracks
  ) {
    if (
      track.startTimeSeconds <
      0
    ) {
      errors.push(
        `Music track ${track.id} has invalid start time.`,
      );
    }
  }

  for (
    const track of
      timeline.subtitleTracks
  ) {
    for (
      const cue of
        track.cues
    ) {
      if (
        cue.startTimeSeconds <
        0 ||
        cue.endTimeSeconds <=
        cue.startTimeSeconds
      ) {
        errors.push(
          `Subtitle cue ${cue.id} has invalid timing.`,
        );
      }
    }
  }

  return errors;
}

function buildRenderRequest(
  timeline: Timeline,
  options: VideoCompositionOptions,
  context: MediaCapabilityContext | undefined,
  now: number,
): RenderRequest {
  return {
    id:
      `${context?.requestId || "media"}-render-${now}`,

    timeline,

    outputFormat:
      options.outputFormat ||
      "mp4",

    quality:
      options.quality ||
      "standard",

    userId:
      context?.userId,

    projectId:
      context?.projectId,

    createdAt:
      now,
  };
}

function buildRenderPlan(
  timeline: Timeline,
  options: VideoCompositionOptions,
  context: MediaCapabilityContext | undefined,
  now: number,
): CompositionRenderPlan {
  const request =
    buildRenderRequest(
      timeline,
      options,
      context,
      now,
    );

  const errors =
    validateTimeline(
      timeline,
    );

  const warnings: string[] = [];

  const pendingVisualAssets =
    timeline.visualTracks.filter(
      (track) =>
        track.asset.status !==
        "ready",
    );

  if (
    pendingVisualAssets.length >
    0
  ) {
    warnings.push(
      `${pendingVisualAssets.length} visual asset(s) are not ready and require generation before rendering.`,
    );
  }

  if (
    timeline.voiceTracks.some(
      (track) =>
        track.asset.status !==
        "ready",
    )
  ) {
    warnings.push(
      "One or more voice assets are not ready and require a configured TTS provider.",
    );
  }

  if (
    timeline.musicTracks.some(
      (track) =>
        track.asset.status !==
        "ready",
    )
  ) {
    warnings.push(
      "One or more music assets are not ready and require a configured music provider.",
    );
  }

  warnings.push(
    "Final MP4 generation requires the server-side render adapter.",
  );

  return {
    request,

    status:
      errors.length === 0
        ? "ready"
        : "invalid",

    errors,

    warnings,

    ffmpegRequired:
      true,

    outputFormat:
      request.outputFormat ||
      "mp4",
  };
}

/**
 * Build the complete AIOS one-click video
 * composition pipeline.
 *
 * This function intentionally does not claim that
 * remote AI generation or final FFmpeg rendering
 * has already happened. It creates the executable
 * media plan that the generation and render adapters
 * can consume.
 */
export function createOneClickVideoPlan(
  prompt: string,
  options: VideoCompositionOptions = {},
  context?: MediaCapabilityContext,
): OneClickVideoPlan {
  const now = Date.now();

  const requestId =
    context?.requestId ||
    `one-click-video-${now}`;

  const projectId =
    context?.projectId ||
    `media-project-${now}`;

  const title =
    options.title ||
    "AIOS One-Click Video";

  const storyboardResult =
    context?.project?.storyboard
      ? {
          success: true,
          storyboard:
            context.project
              .storyboard,
          requestId,
          code:
            "STORYBOARD_FROM_PROJECT",
          createdAt: now,
        }
      : null;

  const storyboard =
    storyboardResult?.storyboard ||
    undefined;

  if (!storyboard) {
    throw new Error(
      `Storyboard is required for one-click composition. Generate a storyboard before calling createOneClickVideoPlan for prompt: ${normalizeText(prompt)}`,
    );
  }

  const storyboardValidation =
    validateStoryboard(
      storyboard,
    );

  const videoPlan =
    buildStoryboardVideoPlan(
      storyboard,
      {
        ...options.video,

        aspectRatio:
          options.video
            ?.aspectRatio ||
          storyboard.aspectRatio,

      },
      context,
    );

  const videoErrors =
    validateVideoGenerationPlan(
      videoPlan,
    );

  const audioPlan =
    createAudioRuntime(
      storyboard,
      {
        context,
        musicPrompt:
          options.musicPrompt,
        mix: {
          voiceVolume:
            options.voiceVolume ??
            1,
          musicVolume:
            options.musicVolume ??
            0.25,
        },
      },
    ).plan;

  const audioErrors =
    validateAudioRuntimePlan(
      audioPlan,
    );

  const assets =
    context?.inputAssets || [];

  const timeline =
    buildTimeline(
      storyboard,
      audioPlan,
      assets,
      options,
      now,
    );

  const render =
    buildRenderPlan(
      timeline,
      options,
      context,
      now,
    );

  const errors = [
    ...storyboardValidation
      .errors,
    ...videoErrors,
    ...audioErrors,
    ...render.errors,
  ];

  const warnings = [
    ...render.warnings,
    ...(
      videoPlan.provider ===
      "external"
        ? [
            "Video generation provider is not configured at composition level; generated scene assets must be supplied by a concrete adapter.",
          ]
        : []
    ),
  ];

  const pendingAssets =
    timeline.visualTracks.some(
      (track) =>
        track.asset.status !==
        "ready",
    );

  const status =
    errors.length > 0
      ? "invalid"
      : pendingAssets
        ? "ready_for_generation"
        : "ready_for_render";

  return {
    requestId,

    projectId,

    title,

    storyboard,

    videoPlan,

    audioPlan,

    timeline,

    render,

    assets,

    status,

    errors,

    warnings,

    createdAt: now,

    updatedAt: now,
  };
}

/**
 * Main C146.6 entry point.
 *
 * A storyboard is intentionally required here.
 * The higher-level runtime should create the
 * storyboard first, then pass it through context.
 */
export function createOneClickVideoProject(
  storyboard: Storyboard,
  options: VideoCompositionOptions = {},
  context?: MediaCapabilityContext,
): OneClickVideoResult {
  const now = Date.now();

  const projectContext: MediaCapabilityContext = {
    requestId:
      context?.requestId ||
      `one-click-video-${now}`,

    userId:
      context?.userId,

    projectId:
      context?.projectId ||
      `media-project-${now}`,

    locale:
      context?.locale ||
      options.language ||
      storyboard.language,

    inputAssets:
      context?.inputAssets ||
      [],

    project: {
      id:
        context?.project?.id ||
        context?.projectId ||
        `media-project-${now}`,

      title:
        context?.project?.title ||
        options.title ||
        "AIOS One-Click Video",

      description:
        context?.project?.description,

      assets:
        context?.project?.assets ||
        context?.inputAssets ||
        [],

      storyboard,

      status: "draft",

      createdAt:
        context?.project?.createdAt ||
        now,

      updatedAt:
        now,
    },

    metadata:
      context?.metadata,
  };

  const plan =
    createOneClickVideoPlan(
      storyboard.description ||
        storyboard.title,
      options,
      projectContext,
    );

  const projectStatus: MediaProject["status"] =
    plan.status ===
    "invalid"
      ? "failed"
      : plan.status ===
          "ready_for_render"
        ? "rendering"
        : "generating";

  const project: MediaProject =
    {
      id:
        plan.projectId,

      title:
        plan.title,

      description:
        options.description ||
        storyboard.description,

      assets:
        plan.assets,

      storyboard:
        plan.storyboard,

      timeline:
        plan.timeline,

      status:
        projectStatus,

      createdAt:
        projectContext.project
          ?.createdAt ||
        now,

      updatedAt:
        now,
    };

  return {
    success:
      plan.errors.length === 0,

    requestId:
      plan.requestId,

    project,

    plan,

    code:
      plan.errors.length > 0
        ? "C146_6_ONE_CLICK_VIDEO_INVALID"
        : plan.status ===
            "ready_for_generation"
          ? "C146_6_ONE_CLICK_VIDEO_READY_FOR_GENERATION"
          : "C146_6_ONE_CLICK_VIDEO_READY_FOR_RENDER",

    errors:
      plan.errors,

    warnings:
      plan.warnings,

    createdAt: now,
  };
}
