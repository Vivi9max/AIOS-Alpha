import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

import ffmpegStatic from "ffmpeg-static";

import type { VideoMediaType } from "./video-types";

const FRAME_TIMEOUT_MS = 30_000;
const MAX_FRAME_BYTES = 2 * 1024 * 1024;
const MAX_FRAMES = 5;
const MAX_VIDEO_DOWNLOAD_BYTES =
  100 * 1024 * 1024;

const SAMPLE_RATIOS = [
  0,
  0.25,
  0.5,
  0.75,
  0.95,
];

export interface VideoFrameSample {
  index: number;
  timestampSeconds: number;
  ratio: number;
  success: boolean;
  mimeType?: string;
  bytesRead: number;
  width?: number;
  height?: number;
  checksum?: string;
  error?: string;
}

export interface VideoFrameRuntimeResult {
  success: boolean;
  code: string;
  mediaUrl: string;
  mediaType: VideoMediaType | string;
  decoder: {
    available: boolean;
    name?: string;
    version?: string;
    source?:
      | "bundled"
      | "environment"
      | "system";
  };
  frameCount: number;
  successfulFrameCount: number;
  totalBytesRead: number;
  frames: VideoFrameSample[];
  visualEvidence: {
    framesDecoded: boolean;
    imagesExtracted: boolean;
    dimensionsDetected: boolean;
    semanticUnderstandingReady: boolean;
  };
  error?: string;
}

interface DecoderInfo {
  path: string;
  source:
    | "bundled"
    | "environment"
    | "system";
  version?: string;
}

interface FrameExtractionResult {
  success: boolean;
  bytesRead: number;
  checksum?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  error?: string;
}

function isPrivateIpv4(
  hostname: string,
): boolean {
  const parts = hostname
    .split(".")
    .map(Number);

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
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }

  return false;
}

function validateMediaUrl(
  rawUrl: string,
): URL {
  const parsed = new URL(rawUrl);

  if (
    parsed.protocol !== "http:" &&
    parsed.protocol !== "https:"
  ) {
    throw new Error(
      "Only HTTP(S) media URLs are supported.",
    );
  }

  const hostname =
    parsed.hostname.toLowerCase();

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

async function checksum(
  data: Buffer,
): Promise<string> {
  return createHash("sha256")
    .update(data)
    .digest("hex");
}

function runCommand(
  command: string,
  args: string[],
  timeoutMs: number,
): Promise<{
  stdout: string;
  stderr: string;
  code: number | null;
}> {
  return new Promise(
    (resolve, reject) => {
      const child = spawn(
        command,
        args,
        {
          stdio: [
            "ignore",
            "pipe",
            "pipe",
          ],
        },
      );

      let stdout = "";
      let stderr = "";

      const timer = setTimeout(() => {
        child.kill("SIGKILL");

        reject(
          new Error(
            `Command timed out after ${timeoutMs}ms.`,
          ),
        );
      }, timeoutMs);

      child.stdout.on(
        "data",
        (chunk) => {
          stdout += chunk.toString();
        },
      );

      child.stderr.on(
        "data",
        (chunk) => {
          stderr += chunk.toString();
        },
      );

      child.on(
        "error",
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );

      child.on(
        "close",
        (code) => {
          clearTimeout(timer);

          resolve({
            stdout,
            stderr,
            code,
          });
        },
      );
    },
  );
}

async function getDecoderVersion(
  decoderPath: string,
): Promise<string | undefined> {
  try {
    const result =
      await runCommand(
        decoderPath,
        ["-version"],
        10_000,
      );

    if (
      result.code !== 0 &&
      !result.stdout &&
      !result.stderr
    ) {
      return undefined;
    }

    const combined =
      `${result.stdout}\n${result.stderr}`;

    const match =
      combined.match(
        /ffmpeg version\s+([^\s]+)/i,
      );

    return match?.[1];
  } catch {
    return undefined;
  }
}

async function resolveDecoder(
  requestedPath?: string,
): Promise<DecoderInfo | null> {
  const environmentPath =
    requestedPath ??
    process.env.FFMPEG_PATH?.trim();

  if (environmentPath) {
    const version =
      await getDecoderVersion(
        environmentPath,
      );

    if (version) {
      return {
        path: environmentPath,
        source: "environment",
        version,
      };
    }
  }

  if (ffmpegStatic) {
    const version =
      await getDecoderVersion(
        ffmpegStatic,
      );

    if (version) {
      return {
        path: ffmpegStatic,
        source: "bundled",
        version,
      };
    }
  }

  const systemVersion =
    await getDecoderVersion(
      "ffmpeg",
    );

  if (systemVersion) {
    return {
      path: "ffmpeg",
      source: "system",
      version: systemVersion,
    };
  }

  return null;
}

async function downloadVideo(
  mediaUrl: string,
  workspace: string,
): Promise<string> {
  const response =
    await fetch(
      mediaUrl,
      {
        method: "GET",
        redirect: "follow",
        headers: {
          Accept:
            "video/*,application/octet-stream;q=0.9,*/*;q=0.1",
        },
      },
    );

  if (!response.ok) {
    throw new Error(
      `Video download failed with HTTP ${response.status}.`,
    );
  }

  const contentLengthHeader =
    response.headers.get(
      "content-length",
    );

  if (contentLengthHeader) {
    const contentLength =
      Number(contentLengthHeader);

    if (
      Number.isFinite(
        contentLength,
      ) &&
      contentLength >
        MAX_VIDEO_DOWNLOAD_BYTES
    ) {
      throw new Error(
        `Video exceeds ${MAX_VIDEO_DOWNLOAD_BYTES} byte download limit.`,
      );
    }
  }

  if (!response.body) {
    throw new Error(
      "Video response body is unavailable.",
    );
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;

  const reader =
    response.body.getReader();

  try {
    while (true) {
      const {
        done,
        value,
      } = await reader.read();

      if (done) {
        break;
      }

      if (
        !value ||
        value.byteLength === 0
      ) {
        continue;
      }

      totalBytes +=
        value.byteLength;

      if (
        totalBytes >
        MAX_VIDEO_DOWNLOAD_BYTES
      ) {
        throw new Error(
          `Video exceeds ${MAX_VIDEO_DOWNLOAD_BYTES} byte download limit.`,
        );
      }

      chunks.push(
        Buffer.from(value),
      );
    }
  } finally {
    reader.releaseLock();
  }

  if (totalBytes === 0) {
    throw new Error(
      "Video download returned no bytes.",
    );
  }

  const outputPath =
    join(
      workspace,
      "input-video",
    );

  await fs.writeFile(
    outputPath,
    Buffer.concat(chunks),
  );

  return outputPath;
}

async function extractFrame(
  decoderPath: string,
  inputPath: string,
  outputPath: string,
  timestampSeconds: number,
): Promise<FrameExtractionResult> {
  try {
    const result =
      await runCommand(
        decoderPath,
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-ss",
          Math.max(
            0,
            timestampSeconds,
          ).toFixed(3),
          "-i",
          inputPath,
          "-frames:v",
          "1",
          "-f",
          "image2",
          "-y",
          outputPath,
        ],
        FRAME_TIMEOUT_MS,
      );

    if (result.code !== 0) {
      return {
        success: false,
        bytesRead: 0,
        error:
          result.stderr.trim() ||
          `FFmpeg exited with code ${result.code}.`,
      };
    }

    const data =
      await fs.readFile(
        outputPath,
      );

    if (data.length === 0) {
      return {
        success: false,
        bytesRead: 0,
        error:
          "FFmpeg produced an empty frame.",
      };
    }

    if (
      data.length >
      MAX_FRAME_BYTES
    ) {
      return {
        success: false,
        bytesRead: data.length,
        error:
          `Frame exceeds ${MAX_FRAME_BYTES} byte limit.`,
      };
    }

    const hash =
      await checksum(data);

    return {
      success: true,
      bytesRead: data.length,
      checksum: hash,
      mimeType: "image/jpeg",
    };
  } catch (error) {
    return {
      success: false,
      bytesRead: 0,
      error:
        error instanceof Error
          ? error.message
          : "Unknown frame extraction error.",
    };
  }
}

function estimateDimensions(
  stderr: string,
): {
  width?: number;
  height?: number;
} {
  const match =
    stderr.match(
      /(?:Stream #.*Video:.*?,\s*)?(\d{2,5})x(\d{2,5})/,
    );

  if (!match) {
    return {};
  }

  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

export async function executeRuntimeVideoFrames(
  mediaUrl: string,
  mediaType: VideoMediaType | string,
  options?: {
    durationSeconds?: number;
    decoderPath?: string;
  },
): Promise<VideoFrameRuntimeResult> {
  const baseResult = {
    mediaUrl,
    mediaType,
  };

  let validatedUrl: URL;

  try {
    validatedUrl =
      validateMediaUrl(
        mediaUrl,
      );
  } catch (error) {
    return {
      ...baseResult,
      success: false,
      code:
        "C144_7_VIDEO_FRAME_EXTRACTION_ERROR",
      decoder: {
        available: false,
      },
      frameCount: 0,
      successfulFrameCount: 0,
      totalBytesRead: 0,
      frames: [],
      visualEvidence: {
        framesDecoded: false,
        imagesExtracted: false,
        dimensionsDetected: false,
        semanticUnderstandingReady: false,
      },
      error:
        error instanceof Error
          ? error.message
          : "Invalid media URL.",
    };
  }

  const decoder =
    await resolveDecoder(
      options?.decoderPath,
    );

  if (!decoder) {
    return {
      ...baseResult,
      success: false,
      code:
        "C144_7_VIDEO_FRAME_DECODER_UNAVAILABLE",
      decoder: {
        available: false,
      },
      frameCount: 0,
      successfulFrameCount: 0,
      totalBytesRead: 0,
      frames: [],
      visualEvidence: {
        framesDecoded: false,
        imagesExtracted: false,
        dimensionsDetected: false,
        semanticUnderstandingReady: false,
      },
      error:
        "No usable FFmpeg decoder was found.",
    };
  }

  const workspace =
    await fs.mkdtemp(
      join(
        tmpdir(),
        "aios-video-",
      ),
    );

  try {
    const inputPath =
      await downloadVideo(
        validatedUrl.toString(),
        workspace,
      );

    const duration =
      typeof options?.durationSeconds ===
        "number" &&
      Number.isFinite(
        options.durationSeconds,
      ) &&
      options.durationSeconds > 0
        ? options.durationSeconds
        : undefined;

    const frames: VideoFrameSample[] =
      [];

    for (
      let index = 0;
      index <
        SAMPLE_RATIOS.length &&
        index < MAX_FRAMES;
      index += 1
    ) {
      const ratio =
        SAMPLE_RATIOS[index];

      const timestampSeconds =
        duration
          ? Math.min(
              duration,
              duration * ratio,
            )
          : 0;

      const outputPath =
        join(
          workspace,
          `frame-${index}.jpg`,
        );

      const extracted =
        await extractFrame(
          decoder.path,
          inputPath,
          outputPath,
          timestampSeconds,
        );

      let width =
        extracted.width;
      let height =
        extracted.height;

      if (
        extracted.success &&
        (!width || !height)
      ) {
        try {
          const probe =
            await runCommand(
              decoder.path,
              [
                "-hide_banner",
                "-loglevel",
                "info",
                "-i",
                inputPath,
                "-frames:v",
                "1",
                "-f",
                "null",
                "-",
              ],
              FRAME_TIMEOUT_MS,
            );

          const dimensions =
            estimateDimensions(
              `${probe.stdout}\n${probe.stderr}`,
            );

          width =
            dimensions.width;
          height =
            dimensions.height;
        } catch {
          // Best-effort dimension detection.
        }
      }

      frames.push({
        index,
        timestampSeconds,
        ratio,
        success:
          extracted.success,
        mimeType:
          extracted.mimeType,
        bytesRead:
          extracted.bytesRead,
        width,
        height,
        checksum:
          extracted.checksum,
        error:
          extracted.error,
      });
    }

    const successfulFrameCount =
      frames.filter(
        (frame) =>
          frame.success,
      ).length;

    const totalBytesRead =
      frames.reduce(
        (sum, frame) =>
          sum + frame.bytesRead,
        0,
      );

    const framesDecoded =
      successfulFrameCount > 0;

    const imagesExtracted =
      successfulFrameCount ===
        frames.length &&
      frames.length > 0;

    const dimensionsDetected =
      successfulFrameCount > 0 &&
      frames
        .filter(
          (frame) =>
            frame.success,
        )
        .every(
          (frame) =>
            Boolean(frame.width) &&
            Boolean(frame.height),
        );

    let code:
      | "C144_7_VIDEO_FRAME_EXTRACTION_PASS"
      | "C144_7_VIDEO_FRAME_EXTRACTION_PARTIAL"
      | "C144_7_VIDEO_FRAME_EXTRACTION_ERROR";

    if (
      successfulFrameCount ===
        frames.length &&
      frames.length > 0
    ) {
      code =
        "C144_7_VIDEO_FRAME_EXTRACTION_PASS";
    } else if (
      successfulFrameCount > 0
    ) {
      code =
        "C144_7_VIDEO_FRAME_EXTRACTION_PARTIAL";
    } else {
      code =
        "C144_7_VIDEO_FRAME_EXTRACTION_ERROR";
    }

    return {
      ...baseResult,
      success:
        successfulFrameCount > 0,
      code,
      decoder: {
        available: true,
        name: "FFmpeg",
        version:
          decoder.version,
        source:
          decoder.source,
      },
      frameCount:
        frames.length,
      successfulFrameCount,
      totalBytesRead,
      frames,
      visualEvidence: {
        framesDecoded,
        imagesExtracted,
        dimensionsDetected,
        semanticUnderstandingReady:
          false,
      },
    };
  } catch (error) {
    return {
      ...baseResult,
      success: false,
      code:
        "C144_7_VIDEO_FRAME_EXTRACTION_ERROR",
      decoder: {
        available: true,
        name: "FFmpeg",
        version:
          decoder.version,
        source:
          decoder.source,
      },
      frameCount: 0,
      successfulFrameCount: 0,
      totalBytesRead: 0,
      frames: [],
      visualEvidence: {
        framesDecoded: false,
        imagesExtracted: false,
        dimensionsDetected: false,
        semanticUnderstandingReady:
          false,
      },
      error:
        error instanceof Error
          ? error.message
          : "Unknown video frame runtime error.",
    };
  } finally {
    await fs.rm(
      workspace,
      {
        recursive: true,
        force: true,
      },
    );
  }
}
