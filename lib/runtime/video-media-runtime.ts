import type {
  VideoMediaType,
} from "@/lib/video/video-resolver";

const MEDIA_TIMEOUT_MS = 20_000;
const MEDIA_PROBE_BYTES = 4 * 1024 * 1024;

export interface VideoMediaRuntimeResult {
  success: boolean;

  code: string;

  mediaUrl: string;

  mediaType: VideoMediaType | string;

  httpStatus?: number;

  contentType?: string;

  contentLength?: number;

  bytesRead: number;

  rangeSupported: boolean;

  reachable: boolean;

  metadata?: {
    container?: string;
    majorBrand?: string;
    brands?: string[];
    hasFtyp?: boolean;
    hasMoov?: boolean;
    hasVideoTrackHint?: boolean;
    hasAudioTrackHint?: boolean;
    playlist?: boolean;
    playlistType?: "master" | "media" | "unknown";
  };

  error?: string;
}

function isHttpUrl(
  value: string,
): boolean {
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

function isBlockedHostname(
  hostname: string,
): boolean {
  const host =
    hostname
      .toLowerCase()
      .replace(/\.$/, "");

  if (
    host === "localhost" ||
    host ===
      "localhost.localdomain" ||
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

  const parts =
    ipv4
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

  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 &&
      b >= 16 &&
      b <= 31) ||
    (a === 192 && b === 168)
  );
}

function assertSafeMediaUrl(
  value: string,
): URL {
  if (!isHttpUrl(value)) {
    throw new Error(
      "Only HTTP and HTTPS media URLs are supported.",
    );
  }

  const url =
    new URL(value);

  if (
    isBlockedHostname(
      url.hostname,
    )
  ) {
    throw new Error(
      "The requested media URL is not allowed.",
    );
  }

  return url;
}

function normalizeContentType(
  value: string | null,
): string | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .split(";")[0]
    .trim()
    .toLowerCase();
}

function parseContentLength(
  value: string | null,
): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return undefined;
  }

  return parsed;
}

function bytesToAscii(
  bytes: Uint8Array,
  start: number,
  length: number,
): string {
  return Array.from(
    bytes.slice(
      start,
      start + length,
    ),
  )
    .map((value) =>
      value >= 32 &&
      value <= 126
        ? String.fromCharCode(
            value,
          )
        : ".",
    )
    .join("");
}

function readUint32(
  bytes: Uint8Array,
  offset: number,
): number {
  if (
    offset + 4 >
    bytes.length
  ) {
    return 0;
  }

  return (
    bytes[offset] * 0x1000000 +
    bytes[offset + 1] * 0x10000 +
    bytes[offset + 2] * 0x100 +
    bytes[offset + 3]
  );
}

function parseMp4Metadata(
  bytes: Uint8Array,
): VideoMediaRuntimeResult["metadata"] {
  let offset = 0;

  let majorBrand:
    | string
    | undefined;

  const brands: string[] = [];

  let hasFtyp = false;
  let hasMoov = false;
  let hasVideoTrackHint =
    false;
  let hasAudioTrackHint =
    false;

  while (
    offset + 8 <=
    bytes.length
  ) {
    const size =
      readUint32(
        bytes,
        offset,
      );

    const type =
      bytesToAscii(
        bytes,
        offset + 4,
        4,
      );

    if (!type) {
      break;
    }

    if (
      size < 8 ||
      offset + size >
        bytes.length
    ) {
      break;
    }

    if (type === "ftyp") {
      hasFtyp = true;

      majorBrand =
        bytesToAscii(
          bytes,
          offset + 8,
          4,
        );

      if (majorBrand) {
        brands.push(
          majorBrand,
        );
      }

      let brandOffset =
        offset + 16;

      while (
        brandOffset + 4 <=
        offset + size
      ) {
        const brand =
          bytesToAscii(
            bytes,
            brandOffset,
            4,
          );

        if (
          brand &&
          brand !== "...." &&
          !brands.includes(
            brand,
          )
        ) {
          brands.push(
            brand,
          );
        }

        brandOffset += 4;
      }
    }

    if (type === "moov") {
      hasMoov = true;
    }

    if (type === "trak") {
      const sample =
        bytesToAscii(
          bytes,
          offset,
          Math.min(
            size,
            4096,
          ),
        );

      if (
        sample.includes(
          "vide",
        )
      ) {
        hasVideoTrackHint =
          true;
      }

      if (
        sample.includes(
          "soun",
        )
      ) {
        hasAudioTrackHint =
          true;
      }
    }

    offset += size;
  }

  return {
    container: "mp4",
    majorBrand,
    brands,
    hasFtyp,
    hasMoov,
    hasVideoTrackHint,
    hasAudioTrackHint,
  };
}

function parseWebmMetadata(
  bytes: Uint8Array,
): VideoMediaRuntimeResult["metadata"] {
  const header =
    bytesToAscii(
      bytes,
      0,
      Math.min(
        bytes.length,
        64,
      ),
    );

  return {
    container: "webm",
    hasFtyp: false,
    hasMoov: false,
    hasVideoTrackHint:
      header.includes(
        "V_VP8",
      ) ||
      header.includes(
        "V_VP9",
      ) ||
      header.includes(
        "V_AV1",
      ),
    hasAudioTrackHint:
      header.includes(
        "A_OPUS",
      ) ||
      header.includes(
        "A_VORBIS",
      ),
  };
}

function detectContainer(
  bytes: Uint8Array,
  mediaType: string,
  contentType?: string,
): VideoMediaRuntimeResult["metadata"] {
  if (
    bytes.length >= 12 &&
    bytesToAscii(
      bytes,
      4,
      4,
    ) === "ftyp"
  ) {
    return parseMp4Metadata(
      bytes,
    );
  }

  if (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return parseWebmMetadata(
      bytes,
    );
  }

  const normalizedType =
    (
      contentType ??
      ""
    ).toLowerCase();

  if (
    mediaType === "m3u8" ||
    normalizedType.includes(
      "mpegurl",
    ) ||
    normalizedType.includes(
      "m3u8",
    )
  ) {
    const text =
      new TextDecoder(
        "utf-8",
      ).decode(bytes);

    const lines =
      text
        .split(/\r?\n/)
        .map(
          (line) =>
            line.trim(),
        )
        .filter(Boolean);

    const master =
      lines.some((line) =>
        line.startsWith(
          "#EXT-X-STREAM-INF",
        ),
      );

    const media =
      lines.some((line) =>
        line.startsWith(
          "#EXTINF",
        ),
      );

    return {
      container: "hls",
      playlist: true,
      playlistType:
        master
          ? "master"
          : media
            ? "media"
            : "unknown",
    };
  }

  return {
    container:
      mediaType ||
      "unknown",
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      MEDIA_TIMEOUT_MS,
    );

  try {
    return await fetch(
      url,
      {
        ...init,
        redirect: "follow",
        signal:
          controller.signal,
      },
    );
  } finally {
    clearTimeout(timer);
  }
}

async function readProbeBytes(
  response: Response,
): Promise<Uint8Array> {
  const buffer =
    await response.arrayBuffer();

  return new Uint8Array(
    buffer.slice(
      0,
      Math.min(
        buffer.byteLength,
        MEDIA_PROBE_BYTES,
      ),
    ),
  );
}

export async function executeRuntimeVideoMedia(
  mediaUrl: string,
  mediaType: VideoMediaType | string = "unknown",
): Promise<VideoMediaRuntimeResult> {
  try {
    assertSafeMediaUrl(
      mediaUrl,
    );

    let head:
      | Response
      | undefined;

    try {
      head =
        await fetchWithTimeout(
          mediaUrl,
          {
            method: "HEAD",
            headers: {
              Accept:
                "video/*,application/vnd.apple.mpegurl,application/x-mpegURL,*/*",
            },
          },
        );
    } catch {
      head = undefined;
    }

    const headContentType =
      normalizeContentType(
        head?.headers.get(
          "content-type",
        ) ?? null,
      );

    const headLength =
      parseContentLength(
        head?.headers.get(
          "content-length",
        ) ?? null,
      );

    const headReachable =
      Boolean(
        head &&
          head.status >= 200 &&
          head.status < 400,
      );

    const rangeResponse =
      await fetchWithTimeout(
        mediaUrl,
        {
          method: "GET",
          headers: {
            Range:
              `bytes=0-${MEDIA_PROBE_BYTES - 1}`,
            Accept:
              "video/*,application/vnd.apple.mpegurl,application/x-mpegURL,*/*",
          },
        },
      );

    if (
      !rangeResponse.ok
    ) {
      return {
        success: false,
        code:
          "C144_4_10_VIDEO_MEDIA_HTTP_FAILED",
        mediaUrl,
        mediaType,
        httpStatus:
          rangeResponse.status,
        contentType:
          normalizeContentType(
            rangeResponse.headers.get(
              "content-type",
            ),
          ),
        contentLength:
          parseContentLength(
            rangeResponse.headers.get(
              "content-length",
            ),
          ),
        bytesRead: 0,
        rangeSupported: false,
        reachable:
          headReachable,
        error:
          `Media request returned HTTP ${rangeResponse.status}.`,
      };
    }

    const contentType =
      normalizeContentType(
        rangeResponse.headers.get(
          "content-type",
        ),
      ) ??
      headContentType;

    const contentLength =
      parseContentLength(
        rangeResponse.headers.get(
          "content-length",
        ),
      ) ??
      headLength;

    const contentRange =
      rangeResponse.headers.get(
        "content-range",
      );

    const rangeSupported =
      Boolean(
        contentRange ||
          rangeResponse.status ===
            206,
      );

    const bytes =
      await readProbeBytes(
        rangeResponse,
      );

    const metadata =
      detectContainer(
        bytes,
        mediaType,
        contentType,
      );

    const effectiveReachable =
      headReachable ||
      rangeResponse.status ===
        200 ||
      rangeResponse.status ===
        206;

    if (
      bytes.length === 0
    ) {
      return {
        success: false,
        code:
          "C144_4_10_VIDEO_MEDIA_EMPTY",
        mediaUrl,
        mediaType,
        httpStatus:
          rangeResponse.status,
        contentType,
        contentLength,
        bytesRead: 0,
        rangeSupported,
        reachable:
          effectiveReachable,
        metadata,
        error:
          "The media endpoint was reachable but returned no readable bytes.",
      };
    }

    return {
      success: true,
      code:
        "C144_4_10_VIDEO_MEDIA_PASS",
      mediaUrl,
      mediaType,
      httpStatus:
        rangeResponse.status,
      contentType,
      contentLength,
      bytesRead:
        bytes.length,
      rangeSupported,
      reachable:
        effectiveReachable,
      metadata,
    };
  } catch (error) {
    return {
      success: false,
      code:
        "C144_4_10_VIDEO_MEDIA_ERROR",
      mediaUrl,
      mediaType,
      bytesRead: 0,
      rangeSupported: false,
      reachable: false,
      error:
        error instanceof Error
          ? error.message
          : "Video media runtime failed.",
    };
  }
}
