import type {
  VideoMediaType,
} from "@/lib/video/video-resolver";

import ffmpegStatic from "ffmpeg-static";

import {
  spawn,
} from "node:child_process";

import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";

import {
  tmpdir,
} from "node:os";

import {
  join,
} from "node:path";

const FRAME_TIMEOUT_MS = 30_000;

const MAX_FRAME_BYTES =
  2 * 1024 * 1024;

const MAX_FRAMES = 5;

const MAX_VIDEO_BYTES =
  100 * 1024 * 1024;

const FRAME_TIMES_RATIO = [
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

  mimeType?:
    | "image/jpeg"
    | "image/png";

  bytesRead: number;

  width?: number;

  height?: number;

  checksum: string;

  framePath?: string;

  error?: string;
}

export interface VideoFrameRuntimeResult {
  success: boolean;

  code: string;

  mediaUrl: string;

  mediaType:
    | VideoMediaType
    | string;

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

function isHttpUrl(
  value: string,
): boolean {
  try {
    const url =
      new URL(value);

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
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localhost")
  ) {
    return true;
  }

  const ipv4 =
    host.match(
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

  const [a, b] =
    parts;

  return (
    a === 10 ||
    a === 127 ||
    (a === 169 &&
      b === 254) ||
    (a === 172 &&
      b >= 16 &&
      b <= 31) ||
    (a === 192 &&
      b === 168)
  );
}

function assertSafeUrl(
  value: string,
): void {
  if (!isHttpUrl(value)) {
    throw new Error(
      "Only HTTP and HTTPS video URLs are supported.",
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
      "The requested video URL is not allowed.",
    );
  }
}

function checksum(
  bytes: Uint8Array,
): string {
  let hash =
    2166136261;

  for (
    const byte of bytes
  ) {
    hash ^=
      byte;

    hash =
      Math.imul(
        hash,
        16777619,
      ) >>> 0;
  }

  return hash
    .toString(16)
    .padStart(8, "0");
}

function runCommand(
  command: string,
  args: string[],
  timeoutMs: number,
): Promise<{
  code: number;
  stdout: string;
  stderr: string;
}> {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
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

      const timer =
        setTimeout(
          () => {
            if (settled) {
              return;
            }

            settled = true;

            try {
              child.kill(
                "SIGKILL",
              );
            } catch {
              // Process may already have exited.
            }

            reject(
              new Error(
                `Command timed out after ${timeoutMs}ms.`,
              ),
            );
          },
          timeoutMs,
        );

      child.stdout.on(
        "data",
        (chunk) => {
          stdout +=
            String(chunk);
        },
      );

      child.stderr.on(
        "data",
        (chunk) => {
          stderr +=
            String(chunk);
        },
      );

      child.on(
        "error",
        (error) => {
          if (settled) {
            return;
          }

          settled = true;

          clearTimeout(
            timer,
          );

          reject(
            error,
          );
        },
      );

      child.on(
        "close",
        (code) => {
          if (settled) {
            return;
          }

          settled = true;

          clearTimeout(
            timer,
          );

          resolve({
            code:
              code ?? 1,
            stdout,
            stderr,
          });
        },
      );
    },
  );
}

async function getDecoderVersion(
  executable: string,
): Promise<string | undefined> {
  try {
    const result =
      await runCommand(
        executable,
        [
          "-version",
        ],
        5_000,
      );

    if (
      result.code !== 0
    ) {
      return undefined;
    }

    const firstLine =
      result.stdout
        .split("\n")
        .find(
          (line) =>
            line
              .trim()
              .length > 0,
        )
        ?.trim();

    const versionMatch =
      firstLine?.match(
        /ffmpeg version\s+([^\s]+)/i,
      );

    return versionMatch?.[1];
  } catch {
    return undefined;
  }
}

async function resolveDecoder(): Promise<{
  available: boolean;

  executable?: string;

  name?: string;

  version?: string;

  source?:
    | "bundled"
    | "environment"
    | "system";
}> {
  const environmentPath =
    process.env.FFMPEG_PATH?.trim();

  if (
    environmentPath
  ) {
    const version =
      await getDecoderVersion(
        environmentPath,
      );

    if (
      version
    ) {
      return {
        available: true,
        executable:
          environmentPath,
        name: "ffmpeg",
        version,
        source:
          "environment",
      };
    }
  }

  const bundledPath =
    typeof ffmpegStatic ===
      "string" &&
    ffmpegStatic.trim().length > 0
      ? ffmpegStatic
      : undefined;

  if (
    bundledPath
  ) {
    const version =
      await getDecoderVersion(
        bundledPath,
      );

    if (
      version
    ) {
      return {
        available: true,
        executable:
          bundledPath,
        name: "ffmpeg",
        version,
        source:
          "bundled",
      };
    }
  }

  const systemVersion =
    await getDecoderVersion(
      "ffmpeg",
    );

  if (
    systemVersion
  ) {
    return {
      available: true,
      executable: "ffmpeg",
      name: "ffmpeg",
      version:
        systemVersion,
      source:
        "system",
    };
  }

  return {
    available: false,
  };
}

async function downloadVideo(
  mediaUrl: string,
  outputPath: string,
): Promise<void> {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      FRAME_TIMEOUT_MS,
    );

  try {
    const response =
      await fetch(
        mediaUrl,
        {
          method: "GET",

          headers: {
            Accept:
              "video/mp4,video/webm,video/*,*/*",
          },

          redirect: "follow",

          signal:
            controller.signal,
        },
      );

    if (
      !response.ok
    ) {
      throw new Error(
        `Video download failed with HTTP ${response.status}.`,
      );
    }

    if (
      !response.body
    ) {
      const bytes =
        new Uint8Array(
          await response.arrayBuffer(),
        );

      if (
        bytes.length >
        MAX_VIDEO_BYTES
      ) {
        throw new Error(
          "Video exceeds the bounded frame-extraction download limit.",
        );
      }

      await writeFile(
        outputPath,
        bytes,
      );

      return;
    }

    const reader =
      response.body.getReader();

    const chunks:
      Uint8Array[] = [];

    let total = 0;

    try {
      while (true) {
        const result =
          await reader.read();

        if (
          result.done
        ) {
          break;
        }

        total +=
          result.value.length;

        if (
          total >
          MAX_VIDEO_BYTES
        ) {
          throw new Error(
            "Video exceeds the bounded frame-extraction download limit.",
          );
        }

        chunks.push(
          result.value,
        );
      }
    } finally {
      reader.releaseLock();
    }

    const bytes =
      new Uint8Array(
        total,
      );

    let offset = 0;

    for (
      const chunk of chunks
    ) {
      bytes.set(
        chunk,
        offset,
      );

      offset +=
        chunk.length;
    }

    await writeFile(
      outputPath,
      bytes,
    );
  } finally {
    clearTimeout(
      timer,
    );
  }
}

async function extractFrame(
  ffmpegPath: string,
  inputPath: string,
  outputPath: string,
  timestampSeconds: number,
): Promise<{
  bytes: Uint8Array;
  width?: number;
  height?: number;
}> {
  const result =
    await runCommand(
      ffmpegPath,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        String(
          Math.max(
            0,
            timestampSeconds,
          ),
        ),
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
    throw new Error(
      result.stderr ||
        "FFmpeg frame extraction failed.",
    );
  }

  const bytes =
    new Uint8Array(
      await readFile(
        outputPath,
      ),
    );

  if (
    bytes.length === 0
  ) {
    throw new Error(
      "FFmpeg produced an empty frame.",
    );
  }

  if (
    bytes.length >
    MAX_FRAME_BYTES
  ) {
    throw new Error(
      "Extracted frame exceeds the bounded frame size.",
    );
  }

  let width:
    | number
    | undefined;

  let height:
    | number
    | undefined;

  try {
    const probe =
      await runCommand(
        ffmpegPath,
        [
          "-hide_banner",
          "-i",
          outputPath,
        ],
        5_000,
      );

    const dimensionMatch =
      `${probe.stdout}\n${probe.stderr}`.match(
        /(\d{2,5})x(\d{2,5})/,
      );

    if (
      dimensionMatch
    ) {
      width =
        Number(
          dimensionMatch[1],
        );

      height =
        Number(
          dimensionMatch[2],
        );
    }
  } catch {
    // Frame extraction remains valid even if dimension probing fails.
  }

  return {
    bytes,
    width,
    height,
  };
}

export async function executeRuntimeVideoFrames(
  mediaUrl: string,
  mediaType:
    | VideoMediaType
    | string = "unknown",
  options?: {
    durationSeconds?: number;
    decoderPath?: string;
  },
): Promise<VideoFrameRuntimeResult> {
  let workspace:
    | string
    | undefined;

  try {
    assertSafeUrl(
      mediaUrl,
    );

    const durationSeconds =
      options?.durationSeconds !==
        undefined &&
      Number.isFinite(
        options.durationSeconds,
      ) &&
      options.durationSeconds >= 0
        ? options.durationSeconds
        : undefined;

    const decoder =
      options?.decoderPath
        ? {
            available: true,
            executable:
              options.decoderPath,
            name: "ffmpeg",
            version:
              await getDecoderVersion(
                options.decoderPath,
              ),
            source:
              "environment" as const,
          }
        : await resolveDecoder();

    if (
      !decoder.available ||
      !decoder.executable
    ) {
      return {
        success: false,

        code:
          "C144_7_VIDEO_FRAME_DECODER_UNAVAILABLE",

        mediaUrl,

        mediaType,

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
          semanticUnderstandingReady:
            false,
        },

        error:
          "No FFmpeg-compatible video decoder is available in the current runtime.",
      };
    }

    const ffmpegPath =
      decoder.executable;

    workspace =
      await mkdtemp(
        join(
          tmpdir(),
          "aios-video-frame-",
        ),
      );

    const inputPath =
      join(
        workspace,
        "input-video",
      );

    await downloadVideo(
      mediaUrl,
      inputPath,
    );

    const ratios =
      FRAME_TIMES_RATIO.slice(
        0,
        MAX_FRAMES,
      );

    const frames:
      VideoFrameSample[] =
        [];

    for (
      let index = 0;
      index < ratios.length;
      index += 1
    ) {
      const ratio =
        ratios[index];

      const timestampSeconds =
        durationSeconds !==
          undefined
          ? Number(
              (
                durationSeconds *
                ratio
              ).toFixed(3),
            )
          : 0;

      const outputPath =
        join(
          workspace,
          `frame-${index}.jpg`,
        );

      try {
        const extracted =
          await extractFrame(
            ffmpegPath,
            inputPath,
            outputPath,
            timestampSeconds,
          );

        frames.push({
          index,

          timestampSeconds,

          ratio,

          success: true,

          mimeType:
            "image/jpeg",

          bytesRead:
            extracted.bytes.length,

          width:
            extracted.width,

          height:
            extracted.height,

          checksum:
            checksum(
              extracted.bytes,
            ),
        });
      } catch (error) {
        frames.push({
          index,

          timestampSeconds,

          ratio,

          success: false,

          bytesRead: 0,

          checksum: "",

          error:
            error instanceof Error
              ? error.message
              : "Frame extraction failed.",
        });
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
          sum,
          frame,
        ) =>
          sum +
          frame.bytesRead,
        0,
      );

    const dimensionsDetected =
      frames.some(
        (frame) =>
          frame.success &&
          frame.width !==
            undefined &&
          frame.height !==
            undefined,
      );

    const framesDecoded =
      successfulFrameCount >
      0;

    const imagesExtracted =
      successfulFrameCount >
      0;

    const allFramesSuccessful =
      successfulFrameCount ===
      frames.length &&
      frames.length > 0;

    const code =
      allFramesSuccessful
        ? "C144_7_VIDEO_FRAME_EXTRACTION_PASS"
        : successfulFrameCount >
            0
          ? "C144_7_VIDEO_FRAME_EXTRACTION_PARTIAL"
          : "C144_7_VIDEO_FRAME_EXTRACTION_ERROR";

    return {
      success:
        successfulFrameCount >
        0,

      code,

      mediaUrl,

      mediaType,

      decoder: {
        available: true,

        name:
          decoder.name,

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
      success: false,

      code:
        "C144_7_VIDEO_FRAME_EXTRACTION_ERROR",

      mediaUrl,

      mediaType,

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

        semanticUnderstandingReady:
          false,
      },

      error:
        error instanceof Error
          ? error.message
          : "Video frame extraction failed.",
    };
  } finally {
    if (
      workspace
    ) {
      try {
        await rm(
          workspace,
          {
            recursive: true,
            force: true,
          },
        );
      } catch {
        // Temporary workspace cleanup is best-effort.
      }
    }
  }
}
