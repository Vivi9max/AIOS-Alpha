import {
  resolveVideoFromPage,
  type VideoCandidate,
  type VideoResolverResult,
} from "@/lib/video/video-resolver";

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

function buildLocalizedContent(
  locale: "en" | "zh-CN" | "ja",
  result: VideoResolverResult,
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

  if (locale === "zh-CN") {
    if (
      result.success &&
      selectedUrl
    ) {
      return [
        "视频解析完成。",
        "",
        `来源页面：${result.pageUrl}`,
        `视频类型：${mediaType}`,
        `候选视频：${candidateCount}`,
        "",
        `主视频：${selectedUrl}`,
        "",
        "Runtime 已完成：网页 → 视频候选 → 媒体类型识别 → Primary 视频选择。",
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

  if (locale === "ja") {
    if (
      result.success &&
      selectedUrl
    ) {
      return [
        "動画の解析が完了しました。",
        "",
        `ページ：${result.pageUrl}`,
        `動画形式：${mediaType}`,
        `候補数：${candidateCount}`,
        "",
        `Primary：${selectedUrl}`,
        "",
        "Runtime は ページ → 動画候補 → メディア形式判定 → Primary 選択 を完了しました。",
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
    selectedUrl
  ) {
    return [
      "Video resolution completed.",
      "",
      `Source page: ${result.pageUrl}`,
      `Media type: ${mediaType}`,
      `Candidates: ${candidateCount}`,
      "",
      `Primary video: ${selectedUrl}`,
      "",
      "Runtime completed: page → video candidates → media type detection → Primary selection.",
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
  locale: "en" | "zh-CN" | "ja",
): string {
  if (locale === "zh-CN") {
    return [
      "已识别为视频解析请求。",
      "",
      "但请求中没有找到有效的 HTTP(S) 网页地址。",
      "",
      "请提供需要解析的视频网页 URL。",
    ].join("\n");
  }

  if (locale === "ja") {
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

export async function executeRuntimeVideoRequest(
  prompt: string,
  locale: "en" | "zh-CN" | "ja" = "en",
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

    const success =
      result.success === true &&
      Boolean(result.primary?.url) &&
      result.candidates.length >
        0;

    return {
      detected: true,

      success,

      code: success
        ? "C144_4_9_VIDEO_RUNTIME_PASS"
        : "C144_4_9_VIDEO_RUNTIME_RESOLUTION_FAILED",

      sourceUrl,

      selectedUrl:
        result.primary?.url,

      mediaType:
        result.primary?.mediaType,

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

      error:
        result.error,

      content:
        buildLocalizedContent(
          locale,
          result,
        ),
    };
  } catch (error) {
    return {
      detected: true,

      success: false,

      code:
        "C144_4_9_VIDEO_RUNTIME_ERROR",

      sourceUrl,

      candidateCount: 0,

      candidates: [],

      htmlFetched: false,

      error:
        error instanceof Error
          ? error.message
          : "Video Runtime execution failed.",

      content:
        locale === "zh-CN"
          ? "Video Runtime 执行失败。"
          : locale === "ja"
            ? "Video Runtime の実行に失敗しました。"
            : "Video Runtime execution failed.",
    };
  }
}
