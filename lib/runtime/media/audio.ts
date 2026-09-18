import {
  MediaAsset,
  MediaCapabilityContext,
  MediaGenerationRequest,
  MusicTrack,
  Storyboard,
  VoiceTrack,
} from "./types";

export type AudioGenerationMode =
  | "voice"
  | "music"
  | "mixed"
  | "silent";

export type AudioCapability =
  | "media.audio.generate"
  | "media.voice.generate"
  | "media.music.generate"
  | "media.audio.mix";

export interface VoiceGenerationOptions {
  language?: string;
  voice?: string;
  style?: string;
  speed?: number;
  pitch?: number;
  emotion?: string;
  format?: "mp3" | "wav" | "webm";
  provider?: "openai" | "aios" | "external" | "generated";
}

export interface MusicGenerationOptions {
  style?: string;
  mood?: string;
  tempo?: number;
  instrumental?: boolean;
  format?: "mp3" | "wav" | "webm";
  provider?: "openai" | "aios" | "external" | "generated";
}

export interface AudioMixOptions {
  voiceVolume?: number;
  musicVolume?: number;
  voiceFadeInSeconds?: number;
  voiceFadeOutSeconds?: number;
  musicFadeInSeconds?: number;
  musicFadeOutSeconds?: number;
  musicLoop?: boolean;
  duckMusicUnderVoice?: boolean;
  duckingLevel?: number;
}

export interface AudioRuntimePlan {
  requestId: string;
  mode: AudioGenerationMode;
  capabilities: AudioCapability[];
  voiceRequests: MediaGenerationRequest[];
  musicRequests: MediaGenerationRequest[];
  voiceTracks: VoiceTrack[];
  musicTracks: MusicTrack[];
  durationSeconds: number;
  mix: AudioMixOptions;
  metadata?: Record<string, unknown>;
}

export interface AudioRuntimeResult {
  success: boolean;
  requestId: string;
  plan: AudioRuntimePlan;
  warnings: string[];
  errors: string[];
  code: string;
  createdAt: number;
}

const DEFAULT_MIX: Required<AudioMixOptions> = {
  voiceVolume: 1,
  musicVolume: 0.18,
  voiceFadeInSeconds: 0.05,
  voiceFadeOutSeconds: 0.15,
  musicFadeInSeconds: 0.5,
  musicFadeOutSeconds: 0.8,
  musicLoop: true,
  duckMusicUnderVoice: true,
  duckingLevel: 0.08,
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

function safeDuration(
  value: number | undefined,
  fallback = 1,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return fallback;
  }

  return value;
}

function normalizeLanguage(
  language?: string,
): string {
  const value = language?.trim();

  if (!value) {
    return "zh-CN";
  }

  return value;
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

/**
 * Rough narration duration estimator.
 *
 * This is intentionally provider-neutral.
 * Actual duration will be replaced by the generated
 * audio asset duration once a TTS provider returns audio.
 */
export function estimateSpeechDuration(
  text: string,
  language = "zh-CN",
  speed = 1,
): number {
  const normalized = normalizeText(text);

  if (!normalized) {
    return 0;
  }

  const safeSpeed = clamp(
    Number.isFinite(speed) && speed > 0
      ? speed
      : 1,
    0.5,
    2,
  );

  const normalizedLanguage =
    language.toLowerCase();

  let charactersPerSecond = 4.2;

  if (
    normalizedLanguage.startsWith("en") ||
    normalizedLanguage.startsWith("de") ||
    normalizedLanguage.startsWith("fr") ||
    normalizedLanguage.startsWith("es")
  ) {
    charactersPerSecond = 12;
  } else if (
    normalizedLanguage.startsWith("ja") ||
    normalizedLanguage.startsWith("ko")
  ) {
    charactersPerSecond = 5;
  }

  const baseDuration =
    normalized.length /
    charactersPerSecond;

  return Number(
    Math.max(
      0.8,
      baseDuration / safeSpeed,
    ).toFixed(2),
  );
}

/**
 * Extract narration from storyboard scenes.
 */
export function extractStoryboardNarration(
  storyboard: Storyboard,
): Array<{
  sceneId: string;
  index: number;
  text: string;
  startTimeSeconds: number;
  durationSeconds: number;
}> {
  const result: Array<{
    sceneId: string;
    index: number;
    text: string;
    startTimeSeconds: number;
    durationSeconds: number;
  }> = [];

  let cursor = 0;

  for (const scene of storyboard.scenes) {
    const text = normalizeText(
      scene.narration,
    );

    const duration = safeDuration(
      scene.durationSeconds,
      estimateSpeechDuration(text),
    );

    if (text) {
      result.push({
        sceneId: scene.id,
        index: scene.index,
        text,
        startTimeSeconds: Number(
          cursor.toFixed(2),
        ),
        durationSeconds: duration,
      });
    }

    cursor += safeDuration(
      scene.durationSeconds,
      duration,
    );
  }

  return result;
}

/**
 * Create a provider-neutral voice generation request.
 *
 * This does not call a provider.
 * It creates the request consumed by the future
 * media provider adapter.
 */
export function createVoiceGenerationRequest(
  text: string,
  options: VoiceGenerationOptions = {},
  context?: MediaCapabilityContext,
): MediaGenerationRequest {
  const normalizedText = normalizeText(text);
  const language = normalizeLanguage(
    options.language || context?.locale,
  );

  const speed = clamp(
    options.speed ?? 1,
    0.5,
    2,
  );

  const durationSeconds =
    estimateSpeechDuration(
      normalizedText,
      language,
      speed,
    );

  const requestId =
    `${context?.requestId || "media"}-voice-${Date.now()}`;

  return {
    id: requestId,
    type: "voice",
    provider:
      options.provider || "openai",
    prompt: {
      prompt: normalizedText,
      language,
      durationSeconds,
      metadata: {
        voice: options.voice || "default",
        style: options.style || "natural",
        speed,
        pitch: options.pitch ?? 0,
        emotion:
          options.emotion || "neutral",
        format:
          options.format || "mp3",
        capability:
          "media.voice.generate",
      },
    },
    userId: context?.userId,
    projectId: context?.projectId,
    createdAt: Date.now(),
  };
}

/**
 * Create a provider-neutral music generation request.
 */
export function createMusicGenerationRequest(
  prompt: string,
  options: MusicGenerationOptions = {},
  durationSeconds = 30,
  context?: MediaCapabilityContext,
): MediaGenerationRequest {
  const normalizedPrompt =
    normalizeText(prompt) ||
    "cinematic background music";

  const safeDuration =
    clamp(
      durationSeconds,
      1,
      3600,
    );

  const requestId =
    `${context?.requestId || "media"}-music-${Date.now()}`;

  return {
    id: requestId,
    type: "music",
    provider:
      options.provider || "generated",
    prompt: {
      prompt: normalizedPrompt,
      durationSeconds: safeDuration,
      metadata: {
        style:
          options.style || "cinematic",
        mood:
          options.mood || "neutral",
        tempo:
          options.tempo ?? 100,
        instrumental:
          options.instrumental ?? true,
        format:
          options.format || "mp3",
        capability:
          "media.music.generate",
      },
    },
    userId: context?.userId,
    projectId: context?.projectId,
    createdAt: Date.now(),
  };
}

function createPendingAsset(
  type: "voice" | "music",
  provider: MediaAsset["provider"],
): MediaAsset {
  const now = Date.now();

  return {
    id:
      `pending-${type}-${now}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    type,
    status: "pending",
    provider,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildVoiceTrack(
  asset: MediaAsset,
  startTimeSeconds: number,
  durationSeconds: number,
  options: AudioMixOptions = {},
): VoiceTrack {
  const volume = clamp(
    options.voiceVolume ??
      DEFAULT_MIX.voiceVolume,
    0,
    2,
  );

  return {
    id:
      `voice-track-${asset.id}`,
    asset,
    startTimeSeconds:
      Math.max(0, startTimeSeconds),
    durationSeconds:
      Math.max(0.01, durationSeconds),
    volume,
    fadeInSeconds:
      clamp(
        options.voiceFadeInSeconds ??
          DEFAULT_MIX.voiceFadeInSeconds,
        0,
        10,
      ),
    fadeOutSeconds:
      clamp(
        options.voiceFadeOutSeconds ??
          DEFAULT_MIX.voiceFadeOutSeconds,
        0,
        10,
      ),
    metadata: {
      capability:
        "media.voice.generate",
    },
  };
}

export function buildMusicTrack(
  asset: MediaAsset,
  durationSeconds: number,
  options: AudioMixOptions = {},
): MusicTrack {
  const volume = clamp(
    options.musicVolume ??
      DEFAULT_MIX.musicVolume,
    0,
    2,
  );

  return {
    id:
      `music-track-${asset.id}`,
    asset,
    startTimeSeconds: 0,
    durationSeconds:
      Math.max(0.01, durationSeconds),
    volume,
    fadeInSeconds:
      clamp(
        options.musicFadeInSeconds ??
          DEFAULT_MIX.musicFadeInSeconds,
        0,
        20,
      ),
    fadeOutSeconds:
      clamp(
        options.musicFadeOutSeconds ??
          DEFAULT_MIX.musicFadeOutSeconds,
        0,
        20,
      ),
    loop:
      options.musicLoop ??
      DEFAULT_MIX.musicLoop,
    metadata: {
      capability:
        "media.music.generate",
      duckMusicUnderVoice:
        options.duckMusicUnderVoice ??
        DEFAULT_MIX.duckMusicUnderVoice,
      duckingLevel:
        clamp(
          options.duckingLevel ??
            DEFAULT_MIX.duckingLevel,
          0,
          1,
        ),
    },
  };
}

/**
 * Build the complete audio plan for a storyboard.
 */
export function buildAudioRuntimePlan(
  storyboard: Storyboard,
  options?: {
    voice?: VoiceGenerationOptions;
    music?: MusicGenerationOptions;
    mix?: AudioMixOptions;
    musicPrompt?: string;
    context?: MediaCapabilityContext;
  },
): AudioRuntimePlan {
  const context =
    options?.context;

  const mix: AudioMixOptions = {
    ...DEFAULT_MIX,
    ...(options?.mix || {}),
  };

  const narration =
    extractStoryboardNarration(
      storyboard,
    );

  const voiceRequests =
    narration.map((item) =>
      createVoiceGenerationRequest(
        item.text,
        {
          ...options?.voice,
          language:
            options?.voice?.language ||
            storyboard.language ||
            context?.locale ||
            "zh-CN",
        },
        context,
      ),
    );

  const voiceAssets =
    voiceRequests.map((request) =>
      createPendingAsset(
        "voice",
        request.provider || "openai",
      ),
    );

  const voiceTracks =
    narration.map((item, index) =>
      buildVoiceTrack(
        voiceAssets[index],
        item.startTimeSeconds,
        item.durationSeconds,
        mix,
      ),
    );

  const musicRequest =
    createMusicGenerationRequest(
      options?.musicPrompt ||
        `${storyboard.title} background music`,
      options?.music || {},
      storyboard.totalDurationSeconds,
      context,
    );

  const musicAsset =
    createPendingAsset(
      "music",
      musicRequest.provider ||
        "generated",
    );

  const musicTrack =
    buildMusicTrack(
      musicAsset,
      storyboard.totalDurationSeconds,
      mix,
    );

  const mode: AudioGenerationMode =
    voiceRequests.length > 0
      ? "mixed"
      : "music";

  return {
    requestId:
      context?.requestId ||
      `media-audio-${Date.now()}`,
    mode,
    capabilities: [
      ...(voiceRequests.length > 0
        ? ["media.voice.generate" as const]
        : []),
      "media.music.generate",
      "media.audio.mix",
    ],
    voiceRequests,
    musicRequests: [
      musicRequest,
    ],
    voiceTracks,
    musicTracks: [
      musicTrack,
    ],
    durationSeconds:
      storyboard.totalDurationSeconds,
    mix,
    metadata: {
      storyboardId:
        storyboard.id,
      sceneCount:
        storyboard.scenes.length,
      narrationCount:
        narration.length,
      language:
        storyboard.language ||
        context?.locale ||
        "zh-CN",
      architecture:
        "provider-neutral",
    },
  };
}

/**
 * Validate an audio plan before sending it
 * to an actual provider / renderer.
 */
export function validateAudioRuntimePlan(
  plan: AudioRuntimePlan,
): string[] {
  const errors: string[] = [];

  if (!plan.requestId) {
    errors.push(
      "Audio requestId is required.",
    );
  }

  if (
    !Number.isFinite(
      plan.durationSeconds,
    ) ||
    plan.durationSeconds <= 0
  ) {
    errors.push(
      "Audio duration must be greater than zero.",
    );
  }

  for (const track of plan.voiceTracks) {
    if (!track.asset) {
      errors.push(
        `Voice track ${track.id} has no asset.`,
      );
    }

    if (
      track.durationSeconds <= 0
    ) {
      errors.push(
        `Voice track ${track.id} has invalid duration.`,
      );
    }

    if (
      track.startTimeSeconds <
      0
    ) {
      errors.push(
        `Voice track ${track.id} has invalid start time.`,
      );
    }
  }

  for (const track of plan.musicTracks) {
    if (!track.asset) {
      errors.push(
        `Music track ${track.id} has no asset.`,
      );
    }

    if (
      track.durationSeconds <= 0
    ) {
      errors.push(
        `Music track ${track.id} has invalid duration.`,
      );
    }
  }

  if (
    plan.mix.voiceVolume === undefined ||
    plan.mix.musicVolume === undefined
  ) {
    errors.push(
      "Audio mix volumes must be defined.",
    );
  }

  return errors;
}

/**
 * Main C146.4 entry point.
 */
export function createAudioRuntime(
  storyboard: Storyboard,
  options?: {
    voice?: VoiceGenerationOptions;
    music?: MusicGenerationOptions;
    mix?: AudioMixOptions;
    musicPrompt?: string;
    context?: MediaCapabilityContext;
  },
): AudioRuntimeResult {
  const createdAt = Date.now();

  const plan =
    buildAudioRuntimePlan(
      storyboard,
      options,
    );

  const errors =
    validateAudioRuntimePlan(
      plan,
    );

  const warnings: string[] = [];

  if (
    plan.voiceRequests.length > 0
  ) {
    warnings.push(
      "Voice generation requests are provider-neutral and require a configured TTS adapter.",
    );
  }

  warnings.push(
    "Music generation is provider-neutral and requires a configured audio generation adapter.",
  );

  if (
    plan.musicTracks.some(
      (track) =>
        track.loop === true,
    )
  ) {
    warnings.push(
      "Music looping is planned at timeline level and will be applied by the render engine.",
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
        ? "C146_4_AUDIO_RUNTIME_PLAN_READY"
        : "C146_4_AUDIO_RUNTIME_PLAN_INVALID",
    createdAt,
  };
}
