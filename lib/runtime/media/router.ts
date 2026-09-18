import type {
  MediaAssetType,
  MediaCapabilityContext,
  MediaGenerationProvider,
  MediaGenerationRequest,
  MediaPrompt,
} from "./types";

export type MediaCapability =
  | "media.script"
  | "media.storyboard"
  | "media.image.generate"
  | "media.video.generate"
  | "media.audio.generate"
  | "media.voice.generate"
  | "media.music.generate"
  | "media.subtitle.generate"
  | "media.timeline.compose"
  | "media.render"
  | "media.export";

export type MediaRouteMode =
  | "single"
  | "pipeline";

export interface MediaRoute {
  capability: MediaCapability;

  assetType: MediaAssetType;

  provider:
    MediaGenerationProvider;

  priority: number;

  reason: string;
}

export interface MediaRoutingResult {
  success: boolean;

  mode:
    MediaRouteMode;

  requestId: string;

  routes:
    MediaRoute[];

  primary:
    MediaRoute | null;

  capabilities:
    MediaCapability[];

  requiresRender:
    boolean;

  requiresExport:
    boolean;

  reason:
    string;

  createdAt:
    number;
}

const MEDIA_KEYWORDS = {
  script: [
    "脚本",
    "文案",
    "script",
    "screenplay",
    "台词",
    "旁白",
    "シナリオ",
    "台本",
  ],

  storyboard: [
    "分镜",
    "storyboard",
    "镜头",
    "shot list",
    "ショット",
    "絵コンテ",
  ],

  image: [
    "图片",
    "图像",
    "配图",
    "海报",
    "封面",
    "image",
    "images",
    "poster",
    "thumbnail",
    "画像",
    "ポスター",
  ],

  video: [
    "视频",
    "影片",
    "视频素材",
    "video",
    "movie",
    "clip",
    "動画",
    "映像",
  ],

  audio: [
    "音频",
    "audio",
    "sound",
    "音声",
  ],

  voice: [
    "配音",
    "语音",
    "旁白",
    "voice",
    "narration",
    "tts",
    "ナレーション",
    "音声合成",
  ],

  music: [
    "音乐",
    "背景音乐",
    "bgm",
    "music",
    "soundtrack",
    "音楽",
    "BGM",
  ],

  subtitle: [
    "字幕",
    "subtitles",
    "subtitle",
    "captions",
    "caption",
    "字幕生成",
  ],

  render: [
    "成片",
    "成片输出",
    "渲染",
    "render",
    "rendering",
    "mp4",
    "webm",
    "動画化",
    "書き出し",
  ],

  export: [
    "导出",
    "输出",
    "export",
    "download",
    "下载",
    "書き出し",
    "出力",
  ],
} as const;

function normalizeText(
  value: string
): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function includesKeyword(
  text: string,
  keywords:
    readonly string[]
): boolean {
  return keywords.some(
    (keyword) =>
      text.includes(
        keyword.toLowerCase()
      )
  );
}

function detectAssetTypes(
  prompt: string
): MediaAssetType[] {
  const text =
    normalizeText(prompt);

  const types:
    MediaAssetType[] = [];

  if (
    includesKeyword(
      text,
      MEDIA_KEYWORDS.script
    )
  ) {
    types.push(
      "script"
    );
  }

  if (
    includesKeyword(
      text,
      MEDIA_KEYWORDS.storyboard
    )
  ) {
    types.push(
      "storyboard"
    );
  }

  if (
    includesKeyword(
      text,
      MEDIA_KEYWORDS.image
    )
  ) {
    types.push(
      "image"
    );
  }

  if (
    includesKeyword(
      text,
      MEDIA_KEYWORDS.video
    )
  ) {
    types.push(
      "video"
    );
  }

  if (
    includesKeyword(
      text,
      MEDIA_KEYWORDS.audio
    )
  ) {
    types.push(
      "audio"
    );
  }

  if (
    includesKeyword(
      text,
      MEDIA_KEYWORDS.voice
    )
  ) {
    types.push(
      "voice"
    );
  }

  if (
    includesKeyword(
      text,
      MEDIA_KEYWORDS.music
    )
  ) {
    types.push(
      "music"
    );
  }

  if (
    includesKeyword(
      text,
      MEDIA_KEYWORDS.subtitle
    )
  ) {
    types.push(
      "subtitle"
    );
  }

  if (
    includesKeyword(
      text,
      MEDIA_KEYWORDS.render
    )
  ) {
    types.push(
      "render"
    );
  }

  return types;
}

function isOneClickVideoRequest(
  prompt: string
): boolean {
  const text =
    normalizeText(prompt);

  const hasVideo =
    includesKeyword(
      text,
      MEDIA_KEYWORDS.video
    );

  const hasRender =
    includesKeyword(
      text,
      MEDIA_KEYWORDS.render
    );

  const oneClickSignals = [
    "一键成片",
    "直接生成视频",
    "直接做成视频",
    "生成完整视频",
    "生成成片",
    "自动成片",
    "完整成片",
    "one click",
    "one-click",
    "create a video",
    "make a video",
    "generate a video",
    "complete video",
    "video from prompt",
    "動画を作成",
    "動画を生成",
  ];

  return (
    (hasVideo || hasRender) &&
    oneClickSignals.some(
      (signal) =>
        text.includes(
          signal.toLowerCase()
        )
    )
  );
}

function createRoute(
  capability:
    MediaCapability,
  assetType:
    MediaAssetType,
  priority:
    number,
  reason:
    string
): MediaRoute {
  return {
    capability,
    assetType,
    provider: "aios",
    priority,
    reason,
  };
}

function buildVideoPipeline(): MediaRoute[] {
  return [
    createRoute(
      "media.script",
      "script",
      100,
      "Video creation starts from structured script generation."
    ),

    createRoute(
      "media.storyboard",
      "storyboard",
      95,
      "Storyboard converts the script into executable visual scenes."
    ),

    createRoute(
      "media.image.generate",
      "image",
      90,
      "Image generation supplies visual assets when required."
    ),

    createRoute(
      "media.video.generate",
      "video",
      85,
      "Video generation supplies motion assets when required."
    ),

    createRoute(
      "media.voice.generate",
      "voice",
      80,
      "Voice generation supplies narration."
    ),

    createRoute(
      "media.music.generate",
      "music",
      75,
      "Music generation supplies background audio."
    ),

    createRoute(
      "media.subtitle.generate",
      "subtitle",
      70,
      "Subtitle generation creates timed captions."
    ),

    createRoute(
      "media.timeline.compose",
      "render",
      60,
      "Timeline composition combines visual, voice, music and subtitle tracks."
    ),

    createRoute(
      "media.render",
      "render",
      50,
      "Rendering produces the final playable media."
    ),

    createRoute(
      "media.export",
      "render",
      40,
      "Export makes the final media asset available to the user."
    ),
  ];
}

function buildSingleAssetRoute(
  type:
    MediaAssetType
): MediaRoute | null {
  switch (type) {
    case "script":
      return createRoute(
        "media.script",
        "script",
        100,
        "The request directly asks for a media script."
      );

    case "storyboard":
      return createRoute(
        "media.storyboard",
        "storyboard",
        100,
        "The request directly asks for a storyboard."
      );

    case "image":
      return createRoute(
        "media.image.generate",
        "image",
        100,
        "The request directly asks for image generation."
      );

    case "video":
      return createRoute(
        "media.video.generate",
        "video",
        100,
        "The request directly asks for video generation."
      );

    case "audio":
      return createRoute(
        "media.audio.generate",
        "audio",
        100,
        "The request directly asks for audio generation."
      );

    case "voice":
      return createRoute(
        "media.voice.generate",
        "voice",
        100,
        "The request directly asks for voice generation."
      );

    case "music":
      return createRoute(
        "media.music.generate",
        "music",
        100,
        "The request directly asks for music generation."
      );

    case "subtitle":
      return createRoute(
        "media.subtitle.generate",
        "subtitle",
        100,
        "The request directly asks for subtitle generation."
      );

    case "render":
      return createRoute(
        "media.render",
        "render",
        100,
        "The request directly asks for media rendering."
      );

    default:
      return null;
  }
}

function uniqueCapabilities(
  routes:
    MediaRoute[]
): MediaCapability[] {
  return Array.from(
    new Set(
      routes.map(
        (route) =>
          route.capability
      )
    )
  );
}

export function routeMediaRequest(
  prompt: string,
  context?: Partial<MediaCapabilityContext>
): MediaRoutingResult {
  const requestId =
    context?.requestId ??
    `media-route-${Date.now()}`;

  const createdAt =
    Date.now();

  const normalized =
    normalizeText(prompt);

  if (
    normalized.length === 0
  ) {
    return {
      success: false,
      mode: "single",
      requestId,
      routes: [],
      primary: null,
      capabilities: [],
      requiresRender: false,
      requiresExport: false,
      reason:
        "Media routing requires a non-empty request.",
      createdAt,
    };
  }

  if (
    isOneClickVideoRequest(
      normalized
    )
  ) {
    const routes =
      buildVideoPipeline();

    return {
      success: true,
      mode: "pipeline",
      requestId,
      routes,
      primary:
        routes[0] ??
        null,
      capabilities:
        uniqueCapabilities(
          routes
        ),
      requiresRender: true,
      requiresExport: true,
      reason:
        "Detected a one-click video creation request and routed it to the complete media pipeline.",
      createdAt,
    };
  }

  const types =
    detectAssetTypes(
      normalized
    );

  const routes =
    types
      .map(
        (type) =>
          buildSingleAssetRoute(
            type
          )
      )
      .filter(
        (
          route
        ): route is MediaRoute =>
          Boolean(route)
      );

  if (
    routes.length === 0
  ) {
    return {
      success: false,
      mode: "single",
      requestId,
      routes: [],
      primary: null,
      capabilities: [],
      requiresRender: false,
      requiresExport: false,
      reason:
        "No media capability was detected from the request.",
      createdAt,
    };
  }

  const shouldCompose =
    routes.length > 1 ||
    types.includes(
      "render"
    );

  const finalRoutes =
    shouldCompose
      ? [
          ...routes,
          createRoute(
            "media.timeline.compose",
            "render",
            60,
            "Multiple media assets require timeline composition."
          ),
        ]
      : routes;

  const capabilities =
    uniqueCapabilities(
      finalRoutes
    );

  return {
    success: true,
    mode:
      finalRoutes.length > 1
        ? "pipeline"
        : "single",
    requestId,
    routes:
      finalRoutes.sort(
        (a, b) =>
          b.priority -
          a.priority
      ),
    primary:
      finalRoutes[0] ??
      null,
    capabilities,
    requiresRender:
      capabilities.includes(
        "media.render"
      ),
    requiresExport:
      capabilities.includes(
        "media.export"
      ),
    reason:
      "Media request routed through the provider-neutral AIOS media capability layer.",
    createdAt,
  };
}

export function createMediaGenerationRequest(
  prompt: string,
  type:
    MediaAssetType,
  options?: {
    requestId?: string;
    userId?: string;
    projectId?: string;
    provider?: MediaGenerationProvider;
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
    inputAssets?: MediaCapabilityContext["inputAssets"];
  }
): MediaGenerationRequest {
  const now =
    Date.now();

  const mediaPrompt:
    MediaPrompt = {
      prompt,
      negativePrompt:
        options?.negativePrompt,
      language:
        options?.language,
      style:
        options?.style,
      aspectRatio:
        options?.aspectRatio,
      durationSeconds:
        options?.durationSeconds,
      width:
        options?.width,
      height:
        options?.height,
      metadata:
        options?.metadata,
    };

  return {
    id:
      options?.requestId ??
      `media-${now}`,

    type,

    prompt:
      mediaPrompt,

    provider:
      options?.provider ??
      "aios",

    inputAssets:
      options?.inputAssets ??
      [],

    userId:
      options?.userId,

    projectId:
      options?.projectId,

    createdAt:
      now,
  };
}
