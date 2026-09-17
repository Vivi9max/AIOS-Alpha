import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

import type { VideoMediaType } from "./video-types";
import {
  executeVideoDecoderHealth,
  type VideoDecoderSource,
} from "./video-decoder-runtime";

const FRAME_TIMEOUT_MS = 30_000;

const MAX_FRAME_BYTES =
  2 * 1024 * 1024;

const MAX_FRAMES = 5;

const MAX_VIDEO_DOWNLOAD_BYTES =
  100 * 1024 * 1024;

const SAMPLE_RATIOS = [
  0,
  0.25,
  0.5,
  0.75,
  0.95,
] as const;

type DecoderSource =
  | VideoDecoderSource;

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

  /**
   * Temporary in-memory representation for the
   * visual understanding pipeline.
   *
   * This is intentionally not persisted into AIOS Memory
   * and is not exposed through the normal RuntimeResponse.
   */
  imageBase64?: string;

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
    source?: DecoderSource;
    path?: string;
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

interface FrameExtractionResult {
  success: boolean;
  bytesRead: number;
  checksum?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  imageBase64?: string;
  error?: string;
}

interface VideoDownloadResult {
  path: string;
  bytesRead: number;
  contentType?: string;
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

  if (a === 10) {
    return true;
  }

  if (a === 127) {
    return true;
  }

  if (
    a === 169 &&
    b === 254
  ) {
    return true;
  }

  if (
    a === 172 &&
    b >= 16 &&
    b <= 31
  ) {
    return true;
  }

  if (
    a === 192 &&
    b === 168
  ) {
    return true;
  }

  return false;
}

function isBlockedHostname(
  hostname: string,
): boolean {
  const normalized =
    hostname
      .trim()
      .toLowerCase();

  if (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized.endsWith(
      ".localhost",
    )
  ) {
    return true;
  }

  if (
    normalized === "0.0.0.0" ||
    normalized === "::"
  ) {
    return true;
  }

  return false;
}

function validateMediaUrl(
  rawUrl: string,
): URL {
  const parsed =
    new URL(rawUrl);

  if (
    parsed.protocol !== "http:" &&
    parsed.protocol !== "https:"
  ) {
    throw new Error(
      "Only HTTP(S) media URLs are supported.",
    );
  }

  const hostname =
    parsed.hostname
      .toLowerCase();

  if (
    isBlockedHostname(
      hostname,
    )
  ) {
    throw new Error(
      "Local media hosts are blocked.",
    );
  }

  if (
    isPrivateIpv4(
      hostname,
    )
  ) {
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
      let settled = false;

      const child =
        spawn(
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

      const finish = (
        callback: () => void,
      ) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timer);
        callback();
      };

      const timer =
        setTimeout(() => {
          try {
            child.kill(
              "SIGKILL",
            );
          } catch {
            // Best-effort process cleanup.
          }

          finish(() => {
            reject(
              new Error(
                `Command timed out after ${timeoutMs}ms.`,
              ),
            );
          });
        }, timeoutMs);

      child.stdout.on(
        "data",
        (chunk) => {
          stdout +=
            chunk.toString();
        },
      );

      child.stderr.on(
        "data",
        (chunk) => {
          stderr +=
            chunk.toString();
        },
      );

      child.on(
        "error",
        (error) => {
          finish(() => {
            reject(error);
          });
        },
      );

      child.on(
        "close",
        (code) => {
          finish(() => {
            resolve({
              stdout,
              stderr,
              code,
            });
          });
        },
      );
    },
  );
}

function parseDimensions(
  text: string,
): {
  width?: number;
  height?: number;
} {
  const matches = [
    ...text.matchAll(
      /(\d{2,5})x(\d{2,5})/g,
    ),
  ];

  if (
    matches.length === 0
  ) {
    return {};
  }

  for (
    let index = matches.length - 1;
    index >= 0;
    index -= 1
  ) {
    const width =
      Number(
        matches[index]?.[1],
      );

    const height =
      Number(
        matches[index]?.[2],
      );

    if (
      Number.isFinite(width) &&
      Number.isFinite(height) &&
      width > 0 &&
      height > 0
    ) {
      return {
        width,
        height,
      };
    }
  }

  return {};
}

async function probeVideoDimensions(
  decoderPath: string,
  inputPath: string,
): Promise<{
  width?: number;
  height?: number;
}> {
  try {
    const result =
      await runCommand(
        decoderPath,
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

    return parseDimensions(
      `${result.stdout}\n${result.stderr}`,
    );
  } catch {
    return {};
  }
}

async function downloadVideo(
  mediaUrl: string,
  workspace: string,
): Promise<VideoDownloadResult> {
  const initialUrl =
    validateMediaUrl(
      mediaUrl,
    );

  const response =
    await fetch(
      initialUrl.toString(),
      {
        method: "GET",
        redirect: "manual",
        headers: {
          Accept:
            "video/*,application/octet-stream;q=0.9,*/*;q=0.1",
        },
      },
    );

  let finalResponse =
    response;

  if (
    response.status >= 300 &&
    response.status < 400
  ) {
    const location =
      response.headers.get(
        "location",
      );

    if (!location) {
      throw new Error(
        `Video redirect returned HTTP ${response.status} without a Location header.`,
      );
    }

    const redirectedUrl =
      new URL(
        location,
        initialUrl,
      );

    validateMediaUrl(
      redirectedUrl.toString(),
    );

    finalResponse =
      await fetch(
        redirectedUrl.toString(),
        {
          method: "GET",
          redirect: "manual",
          headers: {
            Accept:
              "video/*,application/octet-stream;q=0.9,*/*;q=0.1",
          },
        },
      );

    if (
      finalResponse.status >=
        300 &&
      finalResponse.status < 400
    ) {
      throw new Error(
        "Multiple video redirects are not supported by the bounded frame runtime.",
      );
    }
  }

  if (
    !finalResponse.ok
  ) {
    throw new Error(
      `Video download failed with HTTP ${finalResponse.status}.`,
    );
  }

  if (
    !finalResponse.body
  ) {
    throw new Error(
      "Video response body is unavailable.",
    );
  }

  const contentLengthHeader =
    finalResponse.headers.get(
      "content-length",
    );

  if (
    contentLengthHeader
  ) {
    const contentLength =
      Number(
        contentLengthHeader,
      );

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

  const chunks: Buffer[] =
    [];

  let totalBytes = 0;

  const reader =
    finalResponse.body.getReader();

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

  if (
    totalBytes === 0
  ) {
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
    Buffer.concat(
      chunks,
    ),
  );

  return {
    path: outputPath,
    bytesRead: totalBytes,
    contentType:
      finalResponse.headers.get(
        "content-type",
      ) ?? undefined,
  };
}

async function extractFrame(
  decoderPath: string,
  inputPath: string,
  outputPath: string,
  timestampSeconds: number,
  dimensions: {
    width?: number;
    height?: number;
  },
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

    if (
      result.code !== 0
    ) {
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

    if (
      data.length === 0
    ) {
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
      await checksum(
        data,
      );

    /*
     * C144.8.2:
     * Preserve the decoded JPEG in-memory so the next
     * visual evidence layer can consume it directly.
     *
     * The temporary file is still removed by the caller.
     */
    const imageBase64 =
      data.toString(
        "base64",
      );

    return {
      success: true,
      bytesRead:
        data.length,
      checksum: hash,
      mimeType:
        "image/jpeg",
      width:
        dimensions.width,
      height:
        dimensions.height,
      imageBase64,
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

export async function executeRuntimeVideoFrames(
  mediaUrl: string,
  mediaType: VideoMediaType | string,
  options?: {
    durationSeconds?: number;
    decoderPath?: string;
  },
): Promise<VideoFrameRuntimeResult> {
  const base = {
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
      ...base,
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

  const decoderHealth =
    await executeVideoDecoderHealth();

  if (
    !decoderHealth.success ||
    !decoderHealth.decoder
  ) {
    return {
      ...base,
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
        decoderHealth.error ??
        "No usable FFmpeg decoder was found.",
    };
  }

  const decoder =
    decoderHealth.decoder;

  const workspace =
    await fs.mkdtemp(
      join(
        tmpdir(),
        "aios-video-",
      ),
    );

  try {
    const download =
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

    const dimensions =
      await probeVideoDimensions(
        decoder.path,
        download.path,
      );

    const frames:
      VideoFrameSample[] =
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
              duration *
                ratio,
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
          download.path,
          outputPath,
          timestampSeconds,
          dimensions,
        );

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
        width:
          extracted.width,
        height:
          extracted.height,
        checksum:
          extracted.checksum,
        imageBase64:
          extracted.imageBase64,
        error:
          extracted.error,
      });

      try {
        await fs.rm(
          outputPath,
          {
            force: true,
          },
        );
      } catch {
        // Best-effort cleanup.
      }
    }

    const successfulFrameCount =
      frames.filter(
        (frame) =>
          frame.success,
      ).length;

    const totalBytesRead =
      frames.reduce(
        (
          total,
          frame,
        ) =>
          total +
          frame.bytesRead,
        0,
      );

    const dimensionsDetected =
      frames.some(
        (frame) =>
          Boolean(
            frame.width &&
              frame.height,
          ),
      ) ||
      Boolean(
        dimensions.width &&
          dimensions.height,
      );

    const allFramesDecoded =
      successfulFrameCount ===
        frames.length &&
      frames.length ===
        SAMPLE_RATIOS.length;

    if (
      allFramesDecoded
    ) {
      return {
        ...base,
        success: true,
        code:
          "C144_7_VIDEO_FRAME_EXTRACTION_PASS",
        decoder: {
          available: true,
          name:
            decoder.name,
          version:
            decoder.version,
          source:
            decoder.source,
          path:
            decoder.path,
        },
        frameCount:
          frames.length,
        successfulFrameCount,
        totalBytesRead,
        frames,
        visualEvidence: {
          framesDecoded: true,
          imagesExtracted: true,
          dimensionsDetected,
          semanticUnderstandingReady: false,
        },
      };
    }

    if (
      successfulFrameCount > 0
    ) {
      return {
        ...base,
        success: false,
        code:
          "C144_7_VIDEO_FRAME_EXTRACTION_PARTIAL",
        decoder: {
          available: true,
          name:
            decoder.name,
          version:
            decoder.version,
          source:
            decoder.source,
          path:
            decoder.path,
        },
        frameCount:
          frames.length,
        successfulFrameCount,
        totalBytesRead,
        frames,
        visualEvidence: {
          framesDecoded:
            successfulFrameCount > 0,
          imagesExtracted:
            successfulFrameCount > 0,
          dimensionsDetected,
          semanticUnderstandingReady: false,
        },
        error:
          "Only part of the requested video frame samples could be decoded.",
      };
    }

    return {
      ...base,
      success: false,
      code:
        "C144_7_VIDEO_FRAME_EXTRACTION_ERROR",
      decoder: {
        available: true,
        name:
          decoder.name,
        version:
          decoder.version,
        source:
          decoder.source,
        path:
          decoder.path,
      },
      frameCount:
        frames.length,
      successfulFrameCount: 0,
      totalBytesRead,
      frames,
      visualEvidence: {
        framesDecoded: false,
        imagesExtracted: false,
        dimensionsDetected,
        semanticUnderstandingReady: false,
      },
      error:
        frames
          .map(
            (frame) =>
              frame.error,
          )
          .filter(
            Boolean,
          )
          .join("; ") ||
        "No video frames could be decoded.",
    };
  } catch (error) {
    return {
      ...base,
      success: false,
      code:
        "C144_7_VIDEO_FRAME_EXTRACTION_ERROR",
      decoder: {
        available: true,
        name:
          decoder.name,
        version:
          decoder.version,
        source:
          decoder.source,
        path:
          decoder.path,
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
          : "Unexpected video frame runtime error.",
    };
  } finally {
    try {
      await fs.rm(
        workspace,
        {
          recursive: true,
          force: true,
        },
      );
    } catch {
      // Best-effort cleanup.
    }
  }
}
