export type MediaAssetType =
  | "image"
  | "video"
  | "audio"
  | "voice"
  | "music"
  | "subtitle"
  | "script"
  | "storyboard"
  | "render";

export type MediaGenerationProvider =
  | "openai"
  | "aios"
  | "external"
  | "uploaded"
  | "generated"
  | "unknown";

export type MediaAssetStatus =
  | "pending"
  | "processing"
  | "ready"
  | "failed";

export type MediaMimeType =
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "video/mp4"
  | "video/webm"
  | "audio/mpeg"
  | "audio/mp4"
  | "audio/wav"
  | "audio/webm"
  | "text/plain"
  | "application/json"
  | string;

export interface MediaAsset {
  id: string;

  type: MediaAssetType;

  status: MediaAssetStatus;

  provider: MediaGenerationProvider;

  mimeType?: MediaMimeType;

  url?: string;

  storageKey?: string;

  title?: string;

  description?: string;

  durationSeconds?: number;

  width?: number;

  height?: number;

  fileSizeBytes?: number;

  checksum?: string;

  metadata?: Record<
    string,
    unknown
  >;

  createdAt: number;

  updatedAt: number;
}

export interface MediaPrompt {
  prompt: string;

  negativePrompt?: string;

  language?: string;

  style?: string;

  aspectRatio?: string;

  durationSeconds?: number;

  width?: number;

  height?: number;

  metadata?: Record<
    string,
    unknown
  >;
}

export interface MediaGenerationRequest {
  id: string;

  type: MediaAssetType;

  prompt: MediaPrompt;

  provider?: MediaGenerationProvider;

  inputAssets?: MediaAsset[];

  userId?: string;

  projectId?: string;

  createdAt: number;
}

export interface MediaGenerationResult {
  success: boolean;

  requestId: string;

  asset?: MediaAsset;

  assets?: MediaAsset[];

  provider: MediaGenerationProvider;

  code: string;

  error?: string;

  metadata?: Record<
    string,
    unknown
  >;

  createdAt: number;

  completedAt?: number;
}

export interface StoryboardScene {
  id: string;

  index: number;

  title?: string;

  description: string;

  narration?: string;

  visualPrompt?: string;

  imagePrompt?: string;

  videoPrompt?: string;

  durationSeconds: number;

  transition?: string;

  assets?: MediaAsset[];

  metadata?: Record<
    string,
    unknown
  >;
}

export interface Storyboard {
  id: string;

  title: string;

  description?: string;

  totalDurationSeconds: number;

  scenes: StoryboardScene[];

  language?: string;

  aspectRatio?: string;

  targetPlatform?: string;

  createdAt: number;

  updatedAt: number;
}

export interface VoiceTrack {
  id: string;

  asset: MediaAsset;

  startTimeSeconds: number;

  durationSeconds: number;

  volume?: number;

  fadeInSeconds?: number;

  fadeOutSeconds?: number;

  metadata?: Record<
    string,
    unknown
  >;
}

export interface MusicTrack {
  id: string;

  asset: MediaAsset;

  startTimeSeconds: number;

  durationSeconds: number;

  volume?: number;

  fadeInSeconds?: number;

  fadeOutSeconds?: number;

  loop?: boolean;

  metadata?: Record<
    string,
    unknown
  >;
}

export interface SubtitleCue {
  id: string;

  startTimeSeconds: number;

  endTimeSeconds: number;

  text: string;

  language?: string;

  style?: Record<
    string,
    unknown
  >;
}

export interface SubtitleTrack {
  id: string;

  language: string;

  cues: SubtitleCue[];

  asset?: MediaAsset;
}

export interface TimelineVisualTrack {
  id: string;

  asset: MediaAsset;

  startTimeSeconds: number;

  durationSeconds: number;

  x?: number;

  y?: number;

  width?: number;

  height?: number;

  opacity?: number;

  crop?: Record<
    string,
    unknown
  >;

  transitionIn?: string;

  transitionOut?: string;

  metadata?: Record<
    string,
    unknown
  >;
}

export interface Timeline {
  id: string;

  durationSeconds: number;

  width: number;

  height: number;

  frameRate: number;

  background?: string;

  visualTracks: TimelineVisualTrack[];

  voiceTracks: VoiceTrack[];

  musicTracks: MusicTrack[];

  subtitleTracks: SubtitleTrack[];

  metadata?: Record<
    string,
    unknown
  >;

  createdAt: number;

  updatedAt: number;
}

export type RenderJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export interface RenderJob {
  id: string;

  timelineId: string;

  status: RenderJobStatus;

  outputFormat: "mp4" | "webm";

  outputAsset?: MediaAsset;

  progress?: number;

  error?: string;

  startedAt?: number;

  completedAt?: number;

  createdAt: number;
}

export interface RenderRequest {
  id: string;

  timeline: Timeline;

  outputFormat?: "mp4" | "webm";

  quality?: "draft" | "standard" | "high";

  userId?: string;

  projectId?: string;

  createdAt: number;
}

export interface RenderResult {
  success: boolean;

  jobId: string;

  status: RenderJobStatus;

  outputAsset?: MediaAsset;

  error?: string;

  code: string;

  durationMs: number;

  createdAt: number;

  completedAt?: number;
}

export interface MediaProject {
  id: string;

  title: string;

  description?: string;

  assets: MediaAsset[];

  storyboard?: Storyboard;

  timeline?: Timeline;

  renderJob?: RenderJob;

  status:
    | "draft"
    | "generating"
    | "rendering"
    | "completed"
    | "failed";

  createdAt: number;

  updatedAt: number;
}

export interface MediaCapabilityContext {
  requestId: string;

  userId?: string;

  projectId?: string;

  locale?: string;

  inputAssets: MediaAsset[];

  project?: MediaProject;

  metadata?: Record<
    string,
    unknown
  >;
}
