import { createHash } from "node:crypto";

import type { VideoMediaType } from "./video-types";

const MAX_PROBE_BYTES = 4 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 20_000;

export interface VideoMediaRuntimeResult {
  success: boolean;
  code: string;
  mediaUrl: string;
  mediaType: VideoMediaType | string;
  statusCode?: number;
  contentType?: string;
  contentLength?: number;
  bytesRead: number;
  rangeSupported: boolean;
  container?: string;
  majorBrand?: string;
  brands?: string[];
  moovFound?: boolean;
  checksum?: string;
  error?: string;
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);

  if (
    parts.length !== 4 ||
    parts.some(
      (part) =>
        !Number.isInteger(part) ||
        part < 0 ||
        part > 255,
    )
  ) {
    return false;
  }

  const [a, b] = parts;

  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;

  return false;
}

function validateMediaUrl(rawUrl: string): URL {
  const parsed = new URL(rawUrl);

  if (
    parsed.protocol !== "http:" &&
    parsed.protocol !== "https:"
  ) {
    throw new Error(
      "Only HTTP(S) media URLs are supported.",
    );
  }

  const hostname = parsed.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  ) {
    throw new Error(
      "Localhost media URLs are blocked.",
    );
  }

  if (isPrivateIpv4(hostname)) {
    throw new Error(
      "Private IPv4 media URLs are blocked.",
    );
  }

  return parsed;
}

function readAscii(
  buffer: Buffer,
  offset: number,
  length: number,
): string {
  if (
    offset < 0 ||
    offset + length > buffer.length
  ) {
    return "";
  }

  return buffer
    .subarray(offset, offset + length)
    .toString("ascii")
    .replace(/\0/g, "");
}

function detectContainer(
  buffer: Buffer,
  contentType?: string,
): string {
  if (buffer.length >= 12) {
    const ftyp = readAscii(buffer, 4, 4);

    if (ftyp === "ftyp") {
      return "mp4";
    }
  }

  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return "webm";
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0x49 &&
    buffer[1] === 0x44 &&
    buffer[2] === 0x33
  ) {
    return "audio";
  }

  if (
    contentType?.includes("mpegurl") ||
    contentType?.includes("m3u8")
  ) {
    return "hls";
  }

  if (
    contentType?.includes("webm")
  ) {
    return "webm";
  }

  if (
    contentType?.includes("quicktime")
  ) {
    return "mov";
  }

  if (
    contentType?.includes("mp4")
  ) {
    return "mp4";
  }

  return "unknown";
}

function parseMp4Metadata(buffer: Buffer): {
  majorBrand?: string;
  brands?: string[];
  moovFound: boolean;
} {
  if (buffer.length < 16) {
    return {
      moovFound: false,
    };
  }

  let majorBrand: string | undefined;
  const brands: string[] = [];

  let offset = 0;

  while (offset + 8 <= buffer.length) {
    const size = buffer.readUInt32BE(offset);
    const type = readAscii(buffer, offset + 4, 4);

    if (size < 8) {
      break;
    }

    const end = Math.min(
      buffer.length,
      offset + size,
    );

    if (type === "ftyp" && end >= offset + 16) {
      majorBrand = readAscii(
        buffer,
        offset + 8,
        4,
      );

      for (
        let brandOffset = offset + 16;
        brandOffset + 4 <= end;
        brandOffset += 4
      ) {
        const brand = readAscii(
          buffer,
          brandOffset,
          4,
        );

        if (brand && !brands.includes(brand)) {
          brands.push(brand);
        }
      }
    }

    offset = end;
  }

  const moovFound = buffer.includes(
    Buffer.from("moov"),
  );

  return {
    majorBrand,
    brands,
    moovFound,
  };
}

async function calculateChecksum(
  buffer: Buffer,
): Promise<string> {
  return createHash("sha256")
    .update(buffer)
    .digest("hex");
}

async function fetchProbe(
  url: URL,
): Promise<{
  response: Response;
  buffer: Buffer;
}> {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(
      url.toString(),
      {
        method: "GET",
        redirect: "follow",
        headers: {
          Range: `bytes=0-${MAX_PROBE_BYTES - 1}`,
          Accept:
            "video/*,application/octet-stream;q=0.9,*/*;q=0.1",
        },
        signal: controller.signal,
      },
    );

    if (!response.ok && response.status !== 206) {
      return {
        response,
        buffer: Buffer.alloc(0),
      };
    }

    if (!response.body) {
      return {
        response,
        buffer: Buffer.alloc(0),
      };
    }

    const reader = response.body.getReader();

    const chunks: Buffer[] = [];
    let total = 0;

    try {
      while (total < MAX_PROBE_BYTES) {
        const { done, value } =
          await reader.read();

        if (done) {
          break;
        }

        if (!value || value.byteLength === 0) {
          continue;
        }

        const remaining =
          MAX_PROBE_BYTES - total;

        const chunk =
          value.byteLength > remaining
            ? value.slice(0, remaining)
            : value;

        chunks.push(Buffer.from(chunk));
        total += chunk.byteLength;

        if (total >= MAX_PROBE_BYTES) {
          break;
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      response,
      buffer: Buffer.concat(chunks),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function executeRuntimeVideoMedia(
  mediaUrl: string,
  mediaType: VideoMediaType | string,
): Promise<VideoMediaRuntimeResult> {
  let url: URL;

  try {
    url = validateMediaUrl(mediaUrl);
  } catch (error) {
    return {
      success: false,
      code: "C144_4_10_VIDEO_MEDIA_ERROR",
      mediaUrl,
      mediaType,
      bytesRead: 0,
      rangeSupported: false,
      error:
        error instanceof Error
          ? error.message
          : "Invalid media URL.",
    };
  }

  try {
    const { response, buffer } =
      await fetchProbe(url);

    if (
      !response.ok &&
      response.status !== 206
    ) {
      return {
        success: false,
        code: "C144_4_10_VIDEO_MEDIA_HTTP_FAILED",
        mediaUrl,
        mediaType,
        statusCode: response.status,
        contentType:
          response.headers.get("content-type") ??
          undefined,
        bytesRead: 0,
        rangeSupported: false,
        error:
          `Media request failed with HTTP ${response.status}.`,
      };
    }

    if (buffer.length === 0) {
      return {
        success: false,
        code: "C144_4_10_VIDEO_MEDIA_EMPTY",
        mediaUrl,
        mediaType,
        statusCode: response.status,
        contentType:
          response.headers.get("content-type") ??
          undefined,
        bytesRead: 0,
        rangeSupported:
          response.status === 206,
        error:
          "Media response contained no readable bytes.",
      };
    }

    const contentType =
      response.headers.get("content-type") ??
      undefined;

    const contentLengthHeader =
      response.headers.get("content-length");

    const contentLength =
      contentLengthHeader &&
      Number.isFinite(Number(contentLengthHeader))
        ? Number(contentLengthHeader)
        : undefined;

    const contentRange =
      response.headers.get("content-range");

    const rangeSupported =
      response.status === 206 ||
      Boolean(contentRange);

    const container = detectContainer(
      buffer,
      contentType,
    );

    const mp4Metadata =
      container === "mp4"
        ? parseMp4Metadata(buffer)
        : {
            moovFound: false,
          };

    const digest =
      await calculateChecksum(buffer);

    return {
      success: true,
      code: "C144_4_10_VIDEO_MEDIA_PASS",
      mediaUrl,
      mediaType,
      statusCode: response.status,
      contentType,
      contentLength,
      bytesRead: buffer.length,
      rangeSupported,
      container,
      majorBrand:
        mp4Metadata.majorBrand,
      brands:
        mp4Metadata.brands,
      moovFound:
        mp4Metadata.moovFound,
      checksum: digest,
    };
  } catch (error) {
    return {
      success: false,
      code: "C144_4_10_VIDEO_MEDIA_ERROR",
      mediaUrl,
      mediaType,
      bytesRead: 0,
      rangeSupported: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown media runtime error.",
    };
  }
}
