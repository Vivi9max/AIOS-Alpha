import {
  resolveVideoFromPage,
  type VideoCandidate,
  type VideoResolverResult,
} from "@/lib/video/video-resolver";

import {
  addAndSaveMemory,
} from "@/lib/memory/store";

import {
  executeRuntimeVideoMedia,
  type VideoMediaRuntimeResult,
} from "./video-media-runtime";

export interface RuntimeVideoResolutionResult {
  detected: boolean;

  success: boolean;

  code: string;

  sourceUrl?: string;

  selectedUrl?: string;

  mediaType?: string;

  title?: string;

  candidateCount: number;

  primary?: VideoCandidate;

  candidates: VideoCandidate[];

  htmlFetched: boolean;

  statusCode?: number;

  error?: string;

  content?: string;

  media?: VideoMediaRuntimeResult;
}

const VIDEO_INTENT_KEYWORDS = [
  "视频",
  "影片",
  "视频链接",
  "视频地址",
  "视频源",
  "视频资源",
  "解析视频",
  "提取视频",
  "获取视频",
  "找到视频",
  "找出视频",
  "下载视频",
  "视频下载",
  "网页视频",
  "网页里的视频",
  "页面里的视频",
  "视频url",
  "视频 url",
  "video",
  "video url",
  "video source",
  "video media",
  "extract video",
  "resolve video",
  "find video",
  "get video",
  "download video",
  "video link",
  "video source",
];

function extractHttpUrl(
  prompt: string,
): string | undefined {
  const match =
    prompt.match(
      /https?:\/\/[^\s<>"'`]+/i,
    );

  if (!match?.[0]) {
    return undefined;
  }

  return match[0]
    .replace(
      /[),.;!?！？。，、》）】]+$/u,
      "",
    )
    .trim();
}

function isHttpUrl(
  value?: string,
): boolean {
  if (!value) {
    return false;
  }

  try {
    const parsed =
      new URL(value);

    return (
      parsed.protocol ===
        "http:" ||
      parsed.protocol ===
        "https:"
    );
  } catch {
    return false;
  }
}

function hasVideoIntent(
  prompt: string,
): boolean {
  const normalized =
    prompt.toLowerCase();

  return VIDEO_INTENT_KEYWORDS.some(
    (keyword) =>
      normalized.includes(
        keyword.toLowerCase(),
      ),
  );
}

function buildMediaSummary(
  media:
    | VideoMediaRuntimeResult
    | undefined,
  locale:
    | "en"
    | "zh-CN"
    | "ja",
): string[] {
  if (!media) {
    return [];
  }

  if (
    locale === "zh-CN"
  ) {
    return [
      "",
      "实际媒体能力：",
      `媒体访问：${
        media.reachable
          ? "成功"
          : "失败"
      }`,
      `HTTP：${
        media.httpStatus ??
        "unknown"
      }`,
      `Content-Type：${
        media.contentType ??
        "unknown"
      }`,
      `读取字节：${media.bytesRead}`,
      `Range：${
        media.rangeSupported
          ? "支持"
          : "未确认"
      }`,
      ...(media.contentLength !==
      undefined
        ? [
            `媒体大小：${media.contentLength} bytes`,
          ]
        : []),
      ...(media.metadata?.container
        ? [
            `容器：${media.metadata.container}`,
          ]
        : []),
      ...(media.metadata?.majorBrand
        ? [
            `Major Brand：${media.metadata.majorBrand}`,
          ]
        : []),
      ...(media.metadata?.hasMoov !==
        undefined
        ? [
            `MP4 moov：${
              media.metadata.hasMoov
                ? "已发现"
                : "未在探测区间发现"
            }`,
          ]
        : []),
    ];
  }

  if (
    locale === "ja"
  ) {
    return [
      "",
      "実メディア能力：",
      `メディアアクセス：${
        media.reachable
          ? "成功"
          : "失敗"
      }`,
      `HTTP：${
        media.httpStatus ??
        "unknown"
      }`,
      `Content-Type：${
        media.contentType ??
        "unknown"
      }`,
      `読み取りバイト数：${media.bytesRead}`,
      `Range：${
        media.rangeSupported
          ? "対応"
          : "未確認"
      }`,
      ...(media.contentLength !==
      undefined
        ? [
            `メディアサイズ：${media.contentLength} bytes`,
          ]
        : []),
      ...(media.metadata?.container
        ? [
            `コンテナ：${media.metadata.container}`,
          ]
        : []),
      ...(media.metadata?.majorBrand
        ? [
            `Major Brand：${media.metadata.majorBrand}`,
          ]
        : []),
    ];
  }

  return [
    "",
    "Actual media capability:",
    `Media access: ${
      media.reachable
        ? "success"
        : "failed"
    }`,
    `HTTP: ${
      media.httpStatus ??
      "unknown"
    }`,
    `Content-Type: ${
      media.contentType ??
      "unknown"
    }`,
    `Bytes read: ${media.bytesRead}`,
    `Range: ${
      media.rangeSupported
        ? "supported"
        : "not confirmed"
    }`,
    ...(media.contentLength !==
    undefined
      ? [
          `Media size: ${media.contentLength} bytes`,
        ]
      : []),
    ...(media.metadata?.container
      ? [
          `Container: ${media.metadata.container}`,
        ]
      : []),
    ...(media.metadata?.majorBrand
      ? [
          `Major brand: ${media.metadata.majorBrand}`,
        ]
      : []),
    ...(media.metadata?.hasMoov !==
      undefined
      ? [
          `MP4 moov: ${
            media.metadata.hasMoov
              ? "detected"
              : "not detected in probe range"
          }`,
        ]
      : []),
  ];
}

function buildLocalizedContent(
  locale:
    | "en"
    | "zh-CN"
    | "ja",
  result: VideoResolverResult,
  media:
    | VideoMediaRuntimeResult
    | undefined,
): string {
  const primary =
    result.primary;

  const selectedUrl =
    primary?.url;

  const mediaType =
    primary?.mediaType ??
    "unknown";

  const candidateCount =
    result.candidates.length;

  if (
    locale === "zh-CN"
  ) {
    if (
      result.success &&
      selectedUrl &&
      media?.success
    ) {
      return [
        "视频解析与实际媒体读取完成。",
        "",
        `来源页面：${result.pageUrl}`,
        `视频类型：${mediaType}`,
        `候选视频：${candidateCount}`,
        "",
        `主视频：${selectedUrl}`,
        "",
        "Runtime 已完成：",
        "网页 → 视频候选 → 媒体类型识别 → Primary 视频选择 → 实际媒体请求 → 媒体字节读取 → 基础媒体验证。",
        ...buildMediaSummary(
          media,
          locale,
        ),
      ].join("\n");
    }

    if (
      result.success &&
      selectedUrl
    ) {
      return [
        "视频网页解析完成，但实际媒体读取未完成。",
        "",
        `来源页面：${result.pageUrl}`,
        `视频类型：${mediaType}`,
        `主视频：${selectedUrl}`,
        "",
        `媒体状态：${
          media?.error ??
          media?.code ??
          "unknown"
        }`,
      ].join("\n");
    }

    return [
      "视频解析未完成。",
      "",
      `来源页面：${result.pageUrl}`,
      `状态：${
        result.error ??
        "没有找到可直接解析的视频资源。"
      }`,
    ].join("\n");
  }

  if (
    locale === "ja"
  ) {
    if (
      result.success &&
      selectedUrl &&
      media?.success
    ) {
      return [
        "動画解析と実メディア読み取りが完了しました。",
        "",
        `ページ：${result.pageUrl}`,
        `動画形式：${mediaType}`,
        `候補数：${candidateCount}`,
        "",
        `Primary：${selectedUrl}`,
        "",
        "Runtime：",
        "ページ → 動画候補 → メディア形式判定 → Primary選択 → 実メディア要求 → バイト読み取り → 基本メディア検証。",
        ...buildMediaSummary(
          media,
          locale,
        ),
      ].join("\n");
    }

    if (
      result.success &&
      selectedUrl
    ) {
      return [
        "動画ページの解析は完了しましたが、実メディアの読み取りを完了できませんでした。",
        "",
        `ページ：${result.pageUrl}`,
        `動画形式：${mediaType}`,
        `Primary：${selectedUrl}`,
        "",
        `メディア状態：${
          media?.error ??
          media?.code ??
          "unknown"
        }`,
      ].join("\n");
    }

    return [
      "動画の解析を完了できませんでした。",
      "",
      `ページ：${result.pageUrl}`,
      `状態：${
        result.error ??
        "直接解析可能な動画リソースが見つかりませんでした。"
      }`,
    ].join("\n");
  }

  if (
    result.success &&
    selectedUrl &&
    media?.success
  ) {
    return [
      "Video resolution and actual media reading completed.",
      "",
      `Source page: ${result.pageUrl}`,
      `Media type: ${mediaType}`,
      `Candidates: ${candidateCount}`,
      "",
      `Primary video: ${selectedUrl}`,
      "",
      "Runtime completed:",
      "page → video candidates → media type detection → Primary selection → actual media request → media byte read → basic media validation.",
      ...buildMediaSummary(
        media,
        locale,
      ),
    ].join("\n");
  }

  if (
    result.success &&
    selectedUrl
  ) {
    return [
      "Video page resolution completed, but actual media reading failed.",
      "",
      `Source page: ${result.pageUrl}`,
      `Media type: ${mediaType}`,
      `Primary video: ${selectedUrl}`,
      "",
      `Media status: ${
        media?.error ??
        media?.code ??
        "unknown"
      }`,
    ].join("\n");
  }

  return [
    "Video resolution could not be completed.",
    "",
    `Source page: ${result.pageUrl}`,
    `Status: ${
      result.error ??
      "No directly resolvable video resource was found."
    }`,
  ].join("\n");
}

function buildInvalidRequestContent(
  locale:
    | "en"
    | "zh-CN"
    | "ja",
): string {
  if (
    locale === "zh-CN"
  ) {
    return [
      "已识别为视频解析请求。",
      "",
      "但请求中没有找到有效的 HTTP(S) 网页地址。",
      "",
      "请提供需要解析的视频网页 URL。",
    ].join("\n");
  }

  if (
    locale === "ja"
  ) {
    return [
      "動画解析リクエストとして認識しました。",
      "",
      "ただし、有効なHTTP(S)ページURLが見つかりませんでした。",
      "",
      "解析対象の動画ページURLを指定してください。",
    ].join("\n");
  }

  return [
    "This was detected as a video-resolution request.",
    "",
    "However, no valid HTTP(S) source page URL was found.",
    "",
    "Provide the video page URL to resolve.",
  ].join("\n");
}

function buildPersistentMemoryContent(
  content: string,
): string {
  return content.trim();
}

async function persistVideoConversation(
  prompt: string,
  content: string,
): Promise<void> {
  /*
   * C144.4.10
   *
   * Video Runtime returns directly from engine.ts before
   * the normal Executor persistence path.
   *
   * Therefore Video Runtime must explicitly persist the
   * real user request and real Runtime result here.
   */
  await addAndSaveMemory(
    "user",
    prompt,
  );

  await addAndSaveMemory(
    "assistant",
    buildPersistentMemoryContent(
      content,
    ),
  );
}

export async function executeRuntimeVideoRequest(
  prompt: string,
  locale:
    | "en"
    | "zh-CN"
    | "ja" = "en",
): Promise<RuntimeVideoResolutionResult> {
  const detected =
    hasVideoIntent(prompt);

  if (!detected) {
    return {
      detected: false,
      success: false,
      code:
        "VIDEO_INTENT_NOT_DETECTED",
      candidateCount: 0,
      candidates: [],
      htmlFetched: false,
    };
  }

  const sourceUrl =
    extractHttpUrl(prompt);

  if (
    !sourceUrl ||
    !isHttpUrl(sourceUrl)
  ) {
    return {
      detected: true,
      success: false,
      code:
        "VIDEO_SOURCE_URL_REQUIRED",
      candidateCount: 0,
      candidates: [],
      htmlFetched: false,
      content:
        buildInvalidRequestContent(
          locale,
        ),
    };
  }

  try {
    const result =
      await resolveVideoFromPage(
        sourceUrl,
      );

    const resolved =
      result.success === true &&
      Boolean(
        result.primary?.url,
      ) &&
      result.candidates
        .length > 0;

    if (!resolved) {
      const content =
        buildLocalizedContent(
          locale,
          result,
          undefined,
        );

      await persistVideoConversation(
        prompt,
        content,
      );

      return {
        detected: true,
        success: false,
        code:
          "C144_4_10_VIDEO_RESOLUTION_FAILED",
        sourceUrl,
        mediaType:
          result.primary
            ?.mediaType,
        title:
          result.title,
        candidateCount:
          result.candidates
            .length,
        primary:
          result.primary,
        candidates:
          result.candidates,
        htmlFetched:
          result.htmlFetched,
        statusCode:
          result.statusCode,
        error:
          result.error,
        content,
      };
    }

    const selectedUrl =
      result.primary?.url;

    if (!selectedUrl) {
      throw new Error(
        "VIDEO_PRIMARY_URL_MISSING",
      );
    }

    const media =
      await executeRuntimeVideoMedia(
        selectedUrl,
        result.primary
          ?.mediaType ??
          "unknown",
      );

    const success =
      media.success === true;

    const content =
      buildLocalizedContent(
        locale,
        result,
        media,
      );

    /*
     * C144.4.10 persistence:
     * The exact result visible to the user is the result
     * that is persisted. Refresh therefore reconstructs
     * the same Runtime answer instead of losing it.
     */
    await persistVideoConversation(
      prompt,
      content,
    );

    return {
      detected: true,

      success,

      code: success
        ? "C144_4_10_VIDEO_MEDIA_PASS"
        : "C144_4_10_VIDEO_MEDIA_FAILED",

      sourceUrl,

      selectedUrl,

      mediaType:
        result.primary
          ?.mediaType,

      title:
        result.title,

      candidateCount:
        result.candidates.length,

      primary:
        result.primary,

      candidates:
        result.candidates,

      htmlFetched:
        result.htmlFetched,

      statusCode:
        result.statusCode,

      error: success
        ? undefined
        : media.error ??
          media.code,

      content,

      media,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Video Runtime execution failed.";

    const content =
      locale === "zh-CN"
        ? [
            "Video Runtime 执行失败。",
            "",
            `状态：${errorMessage}`,
          ].join("\n")
        : locale === "ja"
          ? [
              "Video Runtime の実行に失敗しました。",
              "",
              `状態：${errorMessage}`,
            ].join("\n")
          : [
              "Video Runtime execution failed.",
              "",
              `Status: ${errorMessage}`,
            ].join("\n");

    try {
      await persistVideoConversation(
        prompt,
        content,
      );
    } catch (persistenceError) {
      console.error(
        "[AIOS Video Runtime Persistence]",
        persistenceError,
      );
    }

    return {
      detected: true,

      success: false,

      code:
        "C144_4_10_VIDEO_RUNTIME_ERROR",

      sourceUrl,

      candidateCount: 0,

      candidates: [],

      htmlFetched: false,

      error:
        errorMessage,

      content,
    };
  }
}
