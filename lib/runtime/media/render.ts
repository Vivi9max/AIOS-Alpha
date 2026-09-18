import "server-only";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

import ffmpegPath from "ffmpeg-static";

import type {
  MediaAsset,
  RenderJob,
  RenderRequest,
  RenderResult,
  Timeline,
  TimelineVisualTrack,
} from "./types";

export interface MediaRenderOptions {
  outputDirectory?: string;

  outputFileName?: string;

  overwrite?: boolean;

  timeoutMs?: number;

  keepIntermediateFiles?: boolean;

  ffmpegPathOverride?: string;

  metadata?: Record<string, unknown>;
}

export interface FFmpegCommandPlan {
  executable: string;

  args: string[];

  outputPath: string;

  inputCount: number;

  hasAudio: boolean;

  hasSubtitles: boolean;

  durationSeconds: number;

  warnings: string[];
}

export interface MediaRenderRuntimeResult {
  success: boolean;

  result: RenderResult;

  command?: FFmpegCommandPlan;

  outputPath?: string;

  stderr?: string;

  stdout?: string;
}

interface ResolvedInput {
  asset: MediaAsset;

  pathOrUrl: string;

  durationSeconds: number;

  index: number;
}

const DEFAULT_TIMEOUT_MS =
  15 * 60 * 1000;

const DEFAULT_OUTPUT_FORMAT =
  "mp4" as const;

const DEFAULT_QUALITY =
  "standard" as const;

function normalizeText(
  value: string | undefined,
): string {
  return (
    value
      ?.replace(/\s+/g, " ")
      .trim() || ""
  );
}

function safeNumber(
  value: number | undefined,
  fallback: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return value;
}

function resolveFFmpegPath(
  override?: string,
): string {
  const candidate =
    normalizeText(override);

  if (candidate) {
    return candidate;
  }

  if (
    typeof ffmpegPath === "string" &&
    ffmpegPath.trim()
  ) {
    return ffmpegPath;
  }

  throw new Error(
    "FFmpeg binary is not available.",
  );
}

function isRemoteUrl(
  value: string,
): boolean {
  return /^https?:\/\//i.test(
    value,
  );
}

function resolveAssetSource(
  asset: MediaAsset,
): string | undefined {
  const url =
    normalizeText(asset.url);

  if (url) {
    return url;
  }

  const storageKey =
    normalizeText(
      asset.storageKey,
    );

  if (storageKey) {
    return storageKey;
  }

  return undefined;
}

function resolveInputAsset(
  track: TimelineVisualTrack,
  index: number,
): ResolvedInput {
  const source =
    resolveAssetSource(
      track.asset,
    );

  if (!source) {
    throw new Error(
      `Visual asset ${track.asset.id} has no url or storageKey.`,
    );
  }

  if (
    !isRemoteUrl(source) &&
    !path.isAbsolute(source)
  ) {
    throw new Error(
      `Visual asset ${track.asset.id} must use an absolute local path or an HTTP(S) URL.`,
    );
  }

  return {
    asset:
      track.asset,

    pathOrUrl:
      source,

    durationSeconds:
      safeNumber(
        track.durationSeconds,
        1,
      ),

    index,
  };
}

function collectVisualInputs(
  timeline: Timeline,
): ResolvedInput[] {
  return timeline.visualTracks.map(
    (track, index) =>
      resolveInputAsset(
        track,
        index,
      ),
  );
}

function collectAudioAssets(
  timeline: Timeline,
): MediaAsset[] {
  const assets: MediaAsset[] = [];

  for (
    const track of
      timeline.voiceTracks
  ) {
    assets.push(track.asset);
  }

  for (
    const track of
      timeline.musicTracks
  ) {
    assets.push(track.asset);
  }

  return assets;
}

function validateAudioAsset(
  asset: MediaAsset,
): string | undefined {
  const source =
    resolveAssetSource(asset);

  if (!source) {
    return `Audio asset ${asset.id} has no url or storageKey.`;
  }

  if (
    !isRemoteUrl(source) &&
    !path.isAbsolute(source)
  ) {
    return `Audio asset ${asset.id} must use an absolute local path or an HTTP(S) URL.`;
  }

  return undefined;
}

function validateReadyAssets(
  timeline: Timeline,
): string[] {
  const errors: string[] = [];

  for (
    const track of
      timeline.visualTracks
  ) {
    if (
      track.asset.status !==
      "ready"
    ) {
      errors.push(
        `Visual asset ${track.asset.id} is not ready.`,
      );
    }
  }

  for (
    const asset of
      collectAudioAssets(
        timeline,
      )
  ) {
    if (
      asset.status !==
      "ready"
    ) {
      errors.push(
        `Audio asset ${asset.id} is not ready.`,
      );
    }
  }

  return errors;
}

function addInputArguments(
  args: string[],
  input: ResolvedInput,
): void {
  args.push(
    "-i",
    input.pathOrUrl,
  );
}

function addAudioInputArguments(
  args: string[],
  assets: MediaAsset[],
): void {
  for (const asset of assets) {
    const source =
      resolveAssetSource(asset);

    if (!source) {
      continue;
    }

    args.push(
      "-i",
      source,
    );
  }
}

function buildVideoFilter(
  timeline: Timeline,
  inputCount: number,
): string {
  const width =
    Math.max(
      2,
      Math.round(
        timeline.width,
      ),
    );

  const height =
    Math.max(
      2,
      Math.round(
        timeline.height,
      ),
    );

  const fps =
    Math.max(
      1,
      Math.round(
        timeline.frameRate,
      ),
    );

  const filters: string[] = [];

  for (
    let index = 0;
    index < inputCount;
    index += 1
  ) {
    filters.push(
      `[${index}:v]` +
        `scale=${width}:${height}:force_original_aspect_ratio=increase,` +
        `crop=${width}:${height},` +
        `setsar=1,` +
        `fps=${fps},` +
        `format=yuv420p,` +
        `setpts=PTS-STARTPTS` +
        `[v${index}]`,
    );
  }

  if (inputCount === 1) {
    filters.push(
      `[v0]` +
        `trim=duration=${Math.max(
          0.1,
          timeline.durationSeconds,
        )},` +
        `setpts=PTS-STARTPTS` +
        `[vout]`,
    );

    return filters.join(";");
  }

  const concatInputs =
    Array.from(
      {
        length:
          inputCount,
      },
      (_, index) =>
        `[v${index}]`,
    ).join("");

  filters.push(
    `${concatInputs}` +
      `concat=n=${inputCount}:v=1:a=0` +
      `[vconcat]`,
  );

  filters.push(
    `[vconcat]` +
      `trim=duration=${Math.max(
        0.1,
        timeline.durationSeconds,
      )},` +
      `setpts=PTS-STARTPTS` +
      `[vout]`,
  );

  return filters.join(";");
}

function buildAudioFilter(
  timeline: Timeline,
  videoInputCount: number,
): {
  filter?: string;

  hasAudio: boolean;
} {
  const voiceTracks =
    timeline.voiceTracks;

  const musicTracks =
    timeline.musicTracks;

  const totalAudio =
    voiceTracks.length +
    musicTracks.length;

  if (totalAudio === 0) {
    return {
      hasAudio: false,
    };
  }

  const filters: string[] = [];

  const audioLabels: string[] = [];

  let inputIndex =
    videoInputCount;

  for (
    const track of
      voiceTracks
  ) {
    const volume =
      safeNumber(
        track.volume,
        1,
      );

    const label =
      `a${audioLabels.length}`;

    filters.push(
      `[${inputIndex}:a]` +
        `atrim=duration=${Math.max(
          0.1,
          track.durationSeconds,
        )},` +
        `asetpts=PTS-STARTPTS,` +
        `volume=${Math.max(
          0,
          volume,
        )}` +
        `[${label}]`,
    );

    audioLabels.push(
      `[${label}]`,
    );

    inputIndex += 1;
  }

  for (
    const track of
      musicTracks
  ) {
    const volume =
      safeNumber(
        track.volume,
        0.25,
      );

    const label =
      `a${audioLabels.length}`;

    filters.push(
      `[${inputIndex}:a]` +
        `atrim=duration=${Math.max(
          0.1,
          timeline.durationSeconds,
        )},` +
        `asetpts=PTS-STARTPTS,` +
        `volume=${Math.max(
          0,
          volume,
        )}` +
        `[${label}]`,
    );

    audioLabels.push(
      `[${label}]`,
    );

    inputIndex += 1;
  }

  if (
    audioLabels.length === 1
  ) {
    filters.push(
      `${audioLabels[0]}` +
        `atrim=duration=${Math.max(
          0.1,
          timeline.durationSeconds,
        )},` +
        `asetpts=PTS-STARTPTS` +
        `[aout]`,
    );

    return {
      filter:
        filters.join(";"),
      hasAudio: true,
    };
  }

  filters.push(
    `${audioLabels.join("")}` +
      `amix=inputs=${audioLabels.length}:` +
      `duration=longest:` +
      `dropout_transition=2,` +
      `atrim=duration=${Math.max(
        0.1,
        timeline.durationSeconds,
      )},` +
      `asetpts=PTS-STARTPTS` +
      `[aout]`,
  );

  return {
    filter:
      filters.join(";"),
    hasAudio: true,
  };
}

function buildSubtitleFilter(
  timeline: Timeline,
): {
  filter?: string;

  hasSubtitles: boolean;

  warnings: string[];
} {
  const warnings: string[] = [];

  if (
    timeline.subtitleTracks
      .length === 0
  ) {
    return {
      hasSubtitles: false,
      warnings,
    };
  }

  /*
   * Subtitle assets are intentionally not
   * rendered from raw cue text here.
   *
   * C146.7 keeps subtitle rendering deterministic
   * by requiring a concrete subtitle asset in a
   * later subtitle adapter. The timeline itself
   * remains authoritative.
   */
  const subtitleAssets =
    timeline.subtitleTracks
      .map(
        (track) =>
          track.asset,
      )
      .filter(
        (
          asset,
        ): asset is MediaAsset =>
          Boolean(asset),
      );

  if (
    subtitleAssets.length === 0
  ) {
    warnings.push(
      "Subtitle cues exist but no subtitle asset is attached; subtitle burn-in is deferred to the subtitle adapter.",
    );

    return {
      hasSubtitles: false,
      warnings,
    };
  }

  warnings.push(
    "Subtitle asset burn-in is reserved for the subtitle adapter to avoid assuming a specific subtitle file format.",
  );

  return {
    hasSubtitles: false,
    warnings,
  };
}

export function buildFFmpegCommandPlan(
  request: RenderRequest,
  options: MediaRenderOptions = {},
): FFmpegCommandPlan {
  const timeline =
    request.timeline;

  const executable =
    resolveFFmpegPath(
      options.ffmpegPathOverride,
    );

  const visualInputs =
    collectVisualInputs(
      timeline,
    );

  const audioAssets =
    collectAudioAssets(
      timeline,
    );

  const outputDirectory =
    options.outputDirectory ||
    path.join(
      os.tmpdir(),
      "aios-media",
    );

  fs.mkdirSync(
    outputDirectory,
    {
      recursive: true,
    },
  );

  const extension =
    request.outputFormat ===
    "webm"
      ? "webm"
      : "mp4";

  const outputFileName =
    options.outputFileName ||
    `aios-${request.id}.${extension}`;

  const outputPath =
    path.join(
      outputDirectory,
      outputFileName,
    );

  const args: string[] = [
    "-hide_banner",
    "-loglevel",
    "error",
  ];

  if (
    options.overwrite !==
    false
  ) {
    args.push("-y");
  } else {
    args.push("-n");
  }

  for (
    const input of
      visualInputs
  ) {
    addInputArguments(
      args,
      input,
    );
  }

  addAudioInputArguments(
    args,
    audioAssets,
  );

  const videoFilter =
    buildVideoFilter(
      timeline,
      visualInputs.length,
    );

  const audioFilter =
    buildAudioFilter(
      timeline,
      visualInputs.length,
    );

  const subtitleFilter =
    buildSubtitleFilter(
      timeline,
    );

  const filterParts = [
    videoFilter,
    audioFilter.filter,
  ].filter(
    (
      value,
    ): value is string =>
      Boolean(value),
  );

  if (
    filterParts.length > 0
  ) {
    args.push(
      "-filter_complex",
      filterParts.join(";"),
    );
  }

  args.push(
    "-map",
    "[vout]",
  );

  if (
    audioFilter.hasAudio
  ) {
    args.push(
      "-map",
      "[aout]",
    );
  }

  if (
    request.outputFormat ===
    "webm"
  ) {
    args.push(
      "-c:v",
      "libvpx-vp9",
      "-crf",
      request.quality ===
        "high"
        ? "30"
        : request.quality ===
            "draft"
          ? "40"
          : "35",
      "-b:v",
      "0",
    );

    if (
      audioFilter.hasAudio
    ) {
      args.push(
        "-c:a",
        "libopus",
      );
    }
  } else {
    args.push(
      "-c:v",
      "libx264",
      "-preset",
      request.quality ===
        "high"
        ? "slow"
        : request.quality ===
            "draft"
          ? "veryfast"
          : "medium",
      "-crf",
      request.quality ===
        "high"
        ? "18"
        : request.quality ===
            "draft"
          ? "28"
          : "23",
      "-pix_fmt",
      "yuv420p",
    );

    if (
      audioFilter.hasAudio
    ) {
      args.push(
        "-c:a",
        "aac",
        "-b:a",
        "192k",
      );
    }
  }

  args.push(
    "-movflags",
    "+faststart",
  );

  args.push(
    "-t",
    String(
      Math.max(
        0.1,
        timeline.durationSeconds,
      ),
    ),
  );

  args.push(
    outputPath,
  );

  return {
    executable,

    args,

    outputPath,

    inputCount:
      visualInputs.length +
      audioAssets.length,

    hasAudio:
      audioFilter.hasAudio,

    hasSubtitles:
      subtitleFilter.hasSubtitles,

    durationSeconds:
      timeline.durationSeconds,

    warnings:
      subtitleFilter.warnings,
  };
}

function createRenderJob(
  request: RenderRequest,
  now: number,
): RenderJob {
  return {
    id:
      request.id,

    timelineId:
      request.timeline.id,

    status:
      "processing",

    outputFormat:
      request.outputFormat ||
      DEFAULT_OUTPUT_FORMAT,

    progress: 0,

    startedAt:
      now,

    createdAt:
      request.createdAt ||
      now,
  };
}

function createOutputAsset(
  request: RenderRequest,
  outputPath: string,
  now: number,
): MediaAsset {
  const stats =
    fs.statSync(
      outputPath,
    );

  return {
    id:
      `render-${request.id}`,

    type: "render",

    status: "ready",

    provider: "aios",

    mimeType:
      request.outputFormat ===
      "webm"
        ? "video/webm"
        : "video/mp4",

    storageKey:
      outputPath,

    title:
      "AIOS rendered video",

    description:
      "Rendered by AIOS FFmpeg media runtime.",

    durationSeconds:
      request.timeline
        .durationSeconds,

    width:
      request.timeline.width,

    height:
      request.timeline.height,

    fileSizeBytes:
      stats.size,

    metadata: {
      renderer:
        "ffmpeg-static",

      timelineId:
        request.timeline.id,

      requestId:
        request.id,

      outputPath,
    },

    createdAt:
      now,

    updatedAt:
      now,
  };
}

function runProcess(
  executable: string,
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
      const child =
        spawn(
          executable,
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

      let settled =
        false;

      const finish = (
        callback: () => void,
      ) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(
          timer,
        );
        callback();
      };

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
          finish(() =>
            reject(error),
          );
        },
      );

      child.on(
        "close",
        (code) => {
          finish(() =>
            resolve({
              code:
                typeof code ===
                "number"
                  ? code
                  : -1,
              stdout,
              stderr,
            }),
          );
        },
      );

      const timer =
        setTimeout(
          () => {
            try {
              child.kill(
                "SIGKILL",
              );
            } catch {
              // Ignore kill errors.
            }

            finish(() =>
              reject(
                new Error(
                  `FFmpeg render timed out after ${timeoutMs}ms.`,
                ),
              ),
            );
          },
          timeoutMs,
        );
    },
  );
}

/**
 * Execute an actual FFmpeg render.
 *
 * This is a Node/server-only runtime.
 * It refuses to render incomplete AIOS media plans
 * instead of producing a fake "completed" result.
 */
export async function renderMedia(
  request: RenderRequest,
  options: MediaRenderOptions = {},
): Promise<MediaRenderRuntimeResult> {
  const createdAt =
    Date.now();

  const validationErrors =
    validateReadyAssets(
      request.timeline,
    );

  if (
    validationErrors.length >
    0
  ) {
    const result:
      RenderResult = {
      success: false,

      jobId:
        request.id,

      status:
        "failed",

      error:
        validationErrors.join(
          " ",
        ),

      code:
        "C146_7_RENDER_ASSETS_NOT_READY",

      durationMs:
        Date.now() -
        createdAt,

      createdAt,
    };

    return {
      success: false,
      result,
    };
  }

  let command:
    FFmpegCommandPlan;

  try {
    command =
      buildFFmpegCommandPlan(
        request,
        options,
      );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    const result:
      RenderResult = {
      success: false,

      jobId:
        request.id,

      status:
        "failed",

      error:
        message,

      code:
        "C146_7_RENDER_COMMAND_INVALID",

      durationMs:
        Date.now() -
        createdAt,

      createdAt,
    };

    return {
      success: false,
      result,
    };
  }

  const job =
    createRenderJob(
      request,
      createdAt,
    );

  const timeoutMs =
    Math.max(
      10_000,
      options.timeoutMs ||
        DEFAULT_TIMEOUT_MS,
    );

  let execution:
    {
      code: number;
      stdout: string;
      stderr: string;
    };

  try {
    execution =
      await runProcess(
        command.executable,
        command.args,
        timeoutMs,
      );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    const result:
      RenderResult = {
      success: false,

      jobId:
        job.id,

      status:
        "failed",

      error:
        message,

      code:
        "C146_7_RENDER_PROCESS_FAILED",

      durationMs:
        Date.now() -
        createdAt,

      createdAt,

      completedAt:
        Date.now(),
    };

    return {
      success: false,
      result,
      command,
      stderr:
        message,
    };
  }

  if (
    execution.code !== 0
  ) {
    const result:
      RenderResult = {
      success: false,

      jobId:
        job.id,

      status:
        "failed",

      error:
        execution.stderr ||
        `FFmpeg exited with code ${execution.code}.`,

      code:
        "C146_7_RENDER_FFMPEG_FAILED",

      durationMs:
        Date.now() -
        createdAt,

      createdAt,

      completedAt:
        Date.now(),
    };

    return {
      success: false,
      result,
      command,
      stderr:
        execution.stderr,
      stdout:
        execution.stdout,
    };
  }

  if (
    !fs.existsSync(
      command.outputPath,
    )
  ) {
    const result:
      RenderResult = {
      success: false,

      jobId:
        job.id,

      status:
        "failed",

      error:
        "FFmpeg completed without producing an output file.",

      code:
        "C146_7_RENDER_OUTPUT_MISSING",

      durationMs:
        Date.now() -
        createdAt,

      createdAt,

      completedAt:
        Date.now(),
    };

    return {
      success: false,
      result,
      command,
      stderr:
        execution.stderr,
      stdout:
        execution.stdout,
    };
  }

  const completedAt =
    Date.now();

  const outputAsset =
    createOutputAsset(
      request,
      command.outputPath,
      completedAt,
    );

  const result:
    RenderResult = {
    success: true,

    jobId:
      job.id,

    status:
      "completed",

    outputAsset,

    code:
      "C146_7_RENDER_COMPLETED",

    durationMs:
      completedAt -
      createdAt,

    createdAt,

    completedAt,
  };

  return {
    success: true,

    result,

    command,

    outputPath:
      command.outputPath,

    stderr:
      execution.stderr,

    stdout:
      execution.stdout,
  };
}

/**
 * Build-only verification entry point.
 *
 * Useful for Founder regression tests without
 * actually spending render resources.
 */
export function verifyMediaRenderPlan(
  request: RenderRequest,
  options: MediaRenderOptions = {},
): {
  valid: boolean;
  command?: FFmpegCommandPlan;
  errors: string[];
  warnings: string[];
} {
  const errors =
    validateReadyAssets(
      request.timeline,
    );

  if (
    errors.length > 0
  ) {
    return {
      valid: false,
      errors,
      warnings: [],
    };
  }

  try {
    const command =
      buildFFmpegCommandPlan(
        request,
        options,
      );

    return {
      valid: true,

      command,

      errors: [],

      warnings:
        command.warnings,
    };
  } catch (error) {
    return {
      valid: false,

      errors: [
        error instanceof Error
          ? error.message
          : String(error),
      ],

      warnings: [],
    };
  }
}
