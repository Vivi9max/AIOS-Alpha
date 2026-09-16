const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_HTML_BYTES = 8 * 1024 * 1024;
const MAX_DOWNLOAD_BYTES = 500 * 1024 * 1024;

export type VideoMediaType =
  | "mp4"
  | "webm"
  | "mov"
  | "m3u8"
  | "unknown";

export interface VideoCandidate {
  url: string;
  mediaType: VideoMediaType;
  score: number;
  source:
    | "video"
    | "source"
    | "og"
    | "json"
    | "html"
    | "aliyun"
    | "1688";
  title?: string;
}

export interface VideoResolverResult {
  success: boolean;
  pageUrl: string;
  canonicalUrl?: string;
  title?: string;
  candidates: VideoCandidate[];
  primary?: VideoCandidate;
  htmlFetched: boolean;
  statusCode?: number;
  error?: string;
  resolvedAt: number;
}

export interface VideoDownloadResult {
  success: boolean;
  contentType: string;
  contentLength?: number;
  filename: string;
  response: Response;
  mediaUrl: string;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname
    .toLowerCase()
    .replace(/\.$/, "");

  if (
    host === "localhost" ||
    host === "localhost.localdomain" ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return true;
  }

  if (
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localhost")
  ) {
    return true;
  }

  const ipv4 = host.match(
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/,
  );

  if (!ipv4) {
    return false;
  }

  const parts = ipv4
    .slice(1)
    .map(Number);

  if (
    parts.some(
      (part) =>
        !Number.isInteger(part) ||
        part < 0 ||
        part > 255,
    )
  ) {
    return true;
  }

  const [a, b] = parts;

  if (a === 10) {
    return true;
  }

  if (a === 127) {
    return true;
  }

  if (a === 169 && b === 254) {
    return true;
  }

  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }

  if (a === 192 && b === 168) {
    return true;
  }

  return false;
}

function assertSafeHttpUrl(value: string): URL {
  if (!isHttpUrl(value)) {
    throw new Error(
      "Only HTTP and HTTPS URLs are supported.",
    );
  }

  const url = new URL(value);

  if (isBlockedHostname(url.hostname)) {
    throw new Error(
      "The requested URL is not allowed.",
    );
  }

  return url;
}

function normalizeUrl(
  raw: string,
  baseUrl: string,
): string | null {
  let value = raw.trim();

  if (!value) {
    return null;
  }

  value = value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#x2F;/gi, "/")
    .replace(/&#47;/gi, "/")
    .replace(/\\u002F/gi, "/")
    .replace(/\\u003A/gi, ":")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u003F/gi, "?")
    .replace(/\\u003D/gi, "=")
    .replace(/\\\//g, "/")
    .replace(/^["']|["']$/g, "");

  try {
    const resolved = new URL(
      value,
      baseUrl,
    );

    if (
      resolved.protocol !== "http:" &&
      resolved.protocol !== "https:"
    ) {
      return null;
    }

    if (
      isBlockedHostname(
        resolved.hostname,
      )
    ) {
      return null;
    }

    return resolved.toString();
  } catch {
    return null;
  }
}

function detectMediaType(
  url: string,
  declaredType?: string,
): VideoMediaType {
  const type =
    declaredType
      ?.toLowerCase()
      .trim();

  if (
    type.includes("mpegurl") ||
    type.includes("m3u8")
  ) {
    return "m3u8";
  }

  if (
    type.includes("webm")
  ) {
    return "webm";
  }

  if (
    type.includes("quicktime") ||
    type.includes("mov")
  ) {
    return "mov";
  }

  if (
    type.includes("mp4")
  ) {
    return "mp4";
  }

  try {
    const pathname =
      new URL(url)
        .pathname
        .toLowerCase();

    if (
      pathname.endsWith(".m3u8")
    ) {
      return "m3u8";
    }

    if (
      pathname.endsWith(".webm")
    ) {
      return "webm";
    }

    if (
      pathname.endsWith(".mov")
    ) {
      return "mov";
    }

    if (
      pathname.endsWith(".mp4")
    ) {
      return "mp4";
    }
  } catch {
    // Ignore malformed URL.
  }

  return "unknown";
}

function scoreCandidate(
  url: string,
  mediaType: VideoMediaType,
  source: VideoCandidate["source"],
): number {
  let score = 0;

  if (mediaType === "mp4") {
    score += 70;
  }

  if (mediaType === "webm") {
    score += 50;
  }

  if (mediaType === "mov") {
    score += 40;
  }

  if (mediaType === "m3u8") {
    score += 30;
  }

  if (source === "video") {
    score += 35;
  }

  if (source === "source") {
    score += 30;
  }

  if (source === "og") {
    score += 25;
  }

  if (source === "aliyun") {
    score += 20;
  }

  if (source === "1688") {
    score += 20;
  }

  if (
    /alicdn\.com/i.test(url)
  ) {
    score += 20;
  }

  if (
    /taobao\.com|tmall\.com|1688\.com/i.test(
      url,
    )
  ) {
    score += 10;
  }

  if (
    /video|media|play|stream/i.test(
      url,
    )
  ) {
    score += 8;
  }

  if (
    /thumbnail|poster|cover|image|img\./i.test(
      url,
    )
  ) {
    score -= 40;
  }

  return score;
}

function addCandidate(
  map: Map<string, VideoCandidate>,
  rawUrl: string,
  baseUrl: string,
  source: VideoCandidate["source"],
  declaredType?: string,
  title?: string,
): void {
  const url =
    normalizeUrl(
      rawUrl,
      baseUrl,
    );

  if (!url) {
    return;
  }

  const mediaType =
    detectMediaType(
      url,
      declaredType,
    );

  if (
    mediaType === "unknown" &&
    !/video|media|stream|play/i.test(
      url,
    )
  ) {
    return;
  }

  const candidate: VideoCandidate = {
    url,
    mediaType,
    score:
      scoreCandidate(
        url,
        mediaType,
        source,
      ),
    source,
    title,
  };

  const previous =
    map.get(url);

  if (
    !previous ||
    candidate.score >
      previous.score
  ) {
    map.set(
      url,
      candidate,
    );
  }
}

function decodeHtmlEntities(
  value: string,
): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#47;/gi, "/");
}

function extractTitle(
  html: string,
): string | undefined {
  const patterns = [
    /<title[^>]*>([\s\S]*?)<\/title>/i,
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
  ];

  for (const pattern of patterns) {
    const match =
      html.match(pattern);

    if (match?.[1]) {
      return decodeHtmlEntities(
        match[1]
          .replace(/\s+/g, " ")
          .trim(),
      ).slice(0, 300);
    }
  }

  return undefined;
}

function extractCanonical(
  html: string,
  baseUrl: string,
): string | undefined {
  const patterns = [
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i,
  ];

  for (const pattern of patterns) {
    const match =
      html.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    return (
      normalizeUrl(
        match[1],
        baseUrl,
      ) ?? undefined
    );
  }

  return undefined;
}

function extractFromVideoTags(
  html: string,
  baseUrl: string,
  map: Map<string, VideoCandidate>,
): void {
  const videoTagPattern =
    /<video\b[^>]*>([\s\S]*?)<\/video>/gi;

  let videoMatch:
    | RegExpExecArray
    | null;

  while (
    (videoMatch =
      videoTagPattern.exec(
        html,
      ))
  ) {
    const block =
      videoMatch[0];

    const srcPatterns = [
      /<video[^>]+src=["']([^"']+)["']/i,
      /<source[^>]+src=["']([^"']+)["']/gi,
    ];

    for (const pattern of srcPatterns) {
      if (pattern.global) {
        let match:
          | RegExpExecArray
          | null;

        while (
          (match =
            pattern.exec(
              block,
            ))
        ) {
          addCandidate(
            map,
            match[1],
            baseUrl,
            "source",
            undefined,
          );
        }
      } else {
        const match =
          block.match(pattern);

        if (match?.[1]) {
          addCandidate(
            map,
            match[1],
            baseUrl,
            "video",
          );
        }
      }
    }
  }

  const standaloneSourcePattern =
    /<source\b[^>]*src=["']([^"']+)["'][^>]*>/gi;

  let sourceMatch:
    | RegExpExecArray
    | null;

  while (
    (sourceMatch =
      standaloneSourcePattern.exec(
        html,
      ))
  ) {
    const tag =
      sourceMatch[0];

    const type =
      tag.match(
        /\btype=["']([^"']+)["']/i,
      )?.[1];

    addCandidate(
      map,
      sourceMatch[1],
      baseUrl,
      "source",
      type,
    );
  }
}

function extractFromOpenGraph(
  html: string,
  baseUrl: string,
  map: Map<string, VideoCandidate>,
): void {
  const patterns = [
    /<meta[^>]+property=["']og:video(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video(?::secure_url)?["']/gi,
  ];

  for (const pattern of patterns) {
    let match:
      | RegExpExecArray
      | null;

    while (
      (match =
        pattern.exec(
          html,
        ))
    ) {
      addCandidate(
        map,
        match[1],
        baseUrl,
        "og",
      );
    }
  }
}

function extractQuotedUrls(
  html: string,
  baseUrl: string,
  map: Map<string, VideoCandidate>,
): void {
  const patterns = [
    /["']((?:https?:)?\/\/[^"'\\\s<>]+)["']/gi,
    /["'](\/[^"'\\\s<>]*(?:\.mp4|\.m3u8|\.webm|\.mov)[^"'\\\s<>]*)["']/gi,
    /["']([^"'\\\s<>]*(?:\.mp4|\.m3u8|\.webm|\.mov)(?:\?[^"'\\\s<>]*)?)["']/gi,
  ];

  for (
    const pattern of patterns
  ) {
    let match:
      | RegExpExecArray
      | null;

    while (
      (match =
        pattern.exec(
          html,
        ))
    ) {
      addCandidate(
        map,
        match[1],
        baseUrl,
        "json",
      );
    }
  }
}

function extractAlibabaCandidates(
  html: string,
  baseUrl: string,
  map: Map<string, VideoCandidate>,
): void {
  const patterns = [
    /https?:\/\/[^"'\\\s<>]*alicdn\.com[^"'\\\s<>]*/gi,
    /https?:\/\/[^"'\\\s<>]*(?:tbcdn|taobao)[^"'\\\s<>]*(?:\.mp4|\.m3u8)[^"'\\\s<>]*/gi,
    /https?:\/\/[^"'\\\s<>]*1688[^"'\\\s<>]*(?:\.mp4|\.m3u8)[^"'\\\s<>]*/gi,
  ];

  for (
    const pattern of patterns
  ) {
    let match:
      | RegExpExecArray
      | null;

    while (
      (match =
        pattern.exec(
          html,
        ))
    ) {
      addCandidate(
        map,
        match[0],
        baseUrl,
        /1688/i.test(
          match[0],
        )
          ? "1688"
          : "aliyun",
      );
    }
  }
}

function extractVideoUrls(
  html: string,
  baseUrl: string,
): VideoCandidate[] {
  const map =
    new Map<
      string,
      VideoCandidate
    >();

  extractFromVideoTags(
    html,
    baseUrl,
    map,
  );

  extractFromOpenGraph(
    html,
    baseUrl,
    map,
  );

  extractQuotedUrls(
    html,
    baseUrl,
    map,
  );

  extractAlibabaCandidates(
    html,
    baseUrl,
    map,
  );

  return Array.from(
    map.values(),
  )
    .sort(
      (a, b) =>
        b.score - a.score,
    )
    .slice(0, 50);
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      timeoutMs,
    );

  try {
    return await fetch(
      input,
      {
        ...init,
        signal:
          init.signal ??
          controller.signal,
      },
    );
  } finally {
    clearTimeout(timer);
  }
}

async function readTextLimited(
  response: Response,
): Promise<string> {
  const contentLength =
    Number(
      response.headers.get(
        "content-length",
      ) ?? "0",
    );

  if (
    contentLength >
    MAX_HTML_BYTES
  ) {
    throw new Error(
      "The source page is too large.",
    );
  }

  const buffer =
    await response.arrayBuffer();

  if (
    buffer.byteLength >
    MAX_HTML_BYTES
  ) {
    throw new Error(
      "The source page is too large.",
    );
  }

  return new TextDecoder(
    "utf-8",
  ).decode(buffer);
}

export async function resolveVideoFromPage(
  pageUrl: string,
): Promise<VideoResolverResult> {
  const startedAt =
    Date.now();

  let safeUrl: URL;

  try {
    safeUrl =
      assertSafeHttpUrl(
        pageUrl,
      );
  } catch (error) {
    return {
      success: false,
      pageUrl,
      candidates: [],
      htmlFetched: false,
      error:
        error instanceof Error
          ? error.message
          : "Invalid page URL.",
      resolvedAt:
        Date.now(),
    };
  }

  try {
    const response =
      await fetchWithTimeout(
        safeUrl.toString(),
        {
          redirect: "follow",
          headers: {
            Accept:
              "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36 AIOS-VideoResolver/1.0",
            Referer:
              safeUrl.origin + "/",
          },
        },
      );

    if (!response.ok) {
      return {
        success: false,
        pageUrl,
        canonicalUrl:
          response.url || undefined,
        candidates: [],
        htmlFetched: false,
        statusCode:
          response.status,
        error:
          `Source page returned HTTP ${response.status}.`,
        resolvedAt:
          Date.now(),
      };
    }

    const html =
      await readTextLimited(
        response,
      );

    const canonicalUrl =
      extractCanonical(
        html,
        response.url ||
          safeUrl.toString(),
      );

    const title =
      extractTitle(html);

    const candidates =
      extractVideoUrls(
        html,
        response.url ||
          safeUrl.toString(),
      );

    return {
      success:
        candidates.length > 0,
      pageUrl,
      canonicalUrl,
      title,
      candidates,
      primary:
        candidates[0],
      htmlFetched: true,
      statusCode:
        response.status,
      error:
        candidates.length === 0
          ? "No directly resolvable video media URL was found in the source HTML."
          : undefined,
      resolvedAt:
        Date.now(),
    };
  } catch (error) {
    return {
      success: false,
      pageUrl,
      candidates: [],
      htmlFetched: false,
      error:
        error instanceof Error
          ? error.name ===
            "AbortError"
            ? "Video resolver request timed out."
            : error.message
          : "Video resolver failed.",
      resolvedAt:
        Date.now(),
    };
  }
}

function filenameFromUrl(
  mediaUrl: string,
  mediaType: VideoMediaType,
): string {
  try {
    const url =
      new URL(mediaUrl);

    const last =
      url.pathname
        .split("/")
        .filter(Boolean)
        .pop();

    if (
      last &&
      /\.(mp4|webm|mov|m3u8)$/i.test(
        last,
      )
    ) {
      return decodeURIComponent(
        last,
      ).slice(0, 180);
    }
  } catch {
    // Fall through.
  }

  const extension =
    mediaType === "webm"
      ? "webm"
      : mediaType === "mov"
        ? "mov"
        : mediaType === "m3u8"
          ? "m3u8"
          : "mp4";

  return `aios-video-${Date.now()}.${extension}`;
}

function inferContentType(
  mediaType: VideoMediaType,
): string {
  switch (mediaType) {
    case "webm":
      return "video/webm";

    case "mov":
      return "video/quicktime";

    case "m3u8":
      return "application/vnd.apple.mpegurl";

    case "mp4":
    default:
      return "video/mp4";
  }
}

export async function downloadVideoMedia(
  mediaUrl: string,
  requestedFilename?: string,
): Promise<VideoDownloadResult> {
  const safeUrl =
    assertSafeHttpUrl(
      mediaUrl,
    );

  const mediaType =
    detectMediaType(
      mediaUrl,
    );

  const response =
    await fetchWithTimeout(
      safeUrl.toString(),
      {
        redirect: "follow",
        headers: {
          Accept:
            "video/mp4,video/webm,video/*;q=0.9,*/*;q=0.5",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36 AIOS-VideoResolver/1.0",
          Referer:
            safeUrl.origin + "/",
        },
      },
    );

  if (!response.ok) {
    throw new Error(
      `Video source returned HTTP ${response.status}.`,
    );
  }

  const contentLength =
    Number(
      response.headers.get(
        "content-length",
      ) ?? "0",
    );

  if (
    contentLength >
    MAX_DOWNLOAD_BYTES
  ) {
    throw new Error(
      "Video exceeds the maximum allowed download size.",
    );
  }

  const contentType =
    response.headers.get(
      "content-type",
    ) ||
    inferContentType(
      mediaType,
    );

  const filename =
    requestedFilename?.trim() ||
    filenameFromUrl(
      mediaUrl,
      mediaType,
    );

  return {
    success: true,
    contentType,
    contentLength:
      contentLength > 0
        ? contentLength
        : undefined,
    filename:
      filename
        .replace(/[^\w.\-()\u4e00-\u9fff ]+/g, "_")
        .slice(0, 180),
    response,
    mediaUrl,
  };
}
