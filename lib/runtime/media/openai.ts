import "server-only";

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

import OpenAI from "openai";
import ffmpegPath from "ffmpeg-static";

import type {
  MediaAsset,
  MediaCapabilityContext,
  Storyboard,
} from "./types";

export interface OpenAIMediaGenerationOptions {
  imageModel?: string;
  speechModel?: string;
  voice?: string;
  imageQuality?: "low" | "medium" | "high" | "auto";
  imageSize?: string;
  outputDirectory?: string;
  frameRate?: number;
  width?: number;
  height?: number;
}

export interface OpenAIMediaGenerationResult {
  success: boolean;
  provider: "openai";
  code: string;
  assets: MediaAsset[];
  imageAssets: MediaAsset[];
  voiceAssets: MediaAsset[];
  videoAssets: MediaAsset[];
  errors: string[];
  warnings: string[];
  createdAt: number;
  completedAt?: number;
}

interface SceneImageResult {
  sceneId: string;
  asset: MediaAsset;
}

interface SceneVoiceResult {
  sceneId: string;
  asset: MediaAsset;
}

function normalizeText(
  value: string | undefined,
): string {
  return (
    value
      ?.replace(/\s+/g, " ")
      .trim() || ""
  );
}

function getApiKey(): string {
  const key =
    process.env.OPENAI_API_KEY?.trim();

  if (!key) {
    throw new Error(
      "OPENAI_API_KEY is not configured.",
    );
  }

  return key;
}

function createClient(): OpenAI {
  return new OpenAI({
    apiKey: getApiKey(),
  });
}

function safeNumber(
  value: number | undefined,
  fallback: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return fallback;
  }

  return value;
}

function resolveOutputDirectory(
  requested?: string,
): string {
  const configured =
    normalizeText(requested);

  if (configured) {
    return configured;
  }

  return path.join(
    os.tmpdir(),
    "aios-media",
  );
}

function resolveImageSize(
  aspectRatio?: string,
  explicit?: string,
): string {
  if (explicit) {
    return explicit;
  }

  const ratio =
    normalizeText(
      aspectRatio,
    );

  if (
    ratio === "16:9"
  ) {
    return "1536x1024";
  }

  if (
    ratio === "1:1"
  ) {
    return "1024x1024";
  }

  return "1024x1536";
}

function resolveImageMime(
  dataUrl: string,
): string {
  if (
    dataUrl.startsWith(
      "data:image/jpeg",
    )
  ) {
    return "image/jpeg";
  }

  if (
    dataUrl.startsWith(
      "data:image/webp",
    )
  ) {
    return "image/webp";
  }

  return "image/png";
}

function extensionForMime(
  mimeType: string,
): string {
  if (
    mimeType ===
    "image/jpeg"
  ) {
    return "jpg";
  }

  if (
    mimeType ===
    "image/webp"
  ) {
    return "webp";
  }

  return "png";
}

async function writeBase64Asset(
  base64: string,
  filePath: string,
): Promise<number> {
  const buffer =
    Buffer.from(
      base64,
      "base64",
    );

  await fs.writeFile(
    filePath,
    buffer,
  );

  return buffer.byteLength;
}

async function writeArrayBufferAsset(
  data: ArrayBuffer,
  filePath: string,
): Promise<number> {
  const buffer =
    Buffer.from(data);

  await fs.writeFile(
    filePath,
    buffer,
  );

  return buffer.byteLength;
}

function createImageAsset(
  sceneId: string,
  sceneIndex: number,
  filePath: string,
  fileSizeBytes: number,
  prompt: string,
  createdAt: number,
): MediaAsset {
  return {
    id:
      `openai-image-${sceneId}-${createdAt}`,

    type: "image",

    status: "ready",

    provider: "openai",

    mimeType:
      "image/png",

    storageKey:
      filePath,

    title:
      `AIOS Scene ${sceneIndex} Image`,

    description:
      "OpenAI-generated scene image.",

    fileSizeBytes,

    metadata: {
      sceneId,
      sceneIndex,
      generated: true,
      provider: "openai",
      prompt,
    },

    createdAt,

    updatedAt:
      Date.now(),
  };
}

function createVoiceAsset(
  sceneId: string,
  sceneIndex: number,
  filePath: string,
  fileSizeBytes: number,
  text: string,
  durationSeconds: number,
  createdAt: number,
): MediaAsset {
  return {
    id:
      `openai-voice-${sceneId}-${createdAt}`,

    type: "voice",

    status: "ready",

    provider: "openai",

    mimeType:
      "audio/mpeg",

    storageKey:
      filePath,

    title:
      `AIOS Scene ${sceneIndex} Voice`,

    description:
      "OpenAI-generated speech narration.",

    durationSeconds,

    fileSizeBytes,

    metadata: {
      sceneId,
      sceneIndex,
      generated: true,
      provider: "openai",
      text,
    },

    createdAt,

    updatedAt:
      Date.now(),
  };
}

function createVideoAsset(
  sceneId: string,
  sceneIndex: number,
  filePath: string,
  durationSeconds: number,
  width: number,
  height: number,
  createdAt: number,
): MediaAsset {
  return {
    id:
      `aios-scene-video-${sceneId}-${createdAt}`,

    type: "video",

    status: "ready",

    provider: "aios",

    mimeType:
      "video/mp4",

    storageKey:
      filePath,

    title:
      `AIOS Scene ${sceneIndex} Video`,

    description:
      "FFmpeg scene video created from an OpenAI-generated image.",

    durationSeconds,

    width,

    height,

    metadata: {
      sceneId,
      sceneIndex,
      generated: true,
      sourceProvider: "openai",
      compositionProvider: "ffmpeg",
    },

    createdAt,

    updatedAt:
      Date.now(),
  };
}

async function generateSceneImage(
  client: OpenAI,
  storyboard: Storyboard,
  scene: Storyboard["scenes"][number],
  options: OpenAIMediaGenerationOptions,
  outputDirectory: string,
  context?: MediaCapabilityContext,
): Promise<SceneImageResult> {
  const createdAt =
    Date.now();

  const prompt =
    normalizeText(
      scene.imagePrompt ||
        scene.visualPrompt ||
        scene.description,
    );

  const response =
    await client.images.generate({
      model:
        options.imageModel ||
        process.env.OPENAI_IMAGE_MODEL ||
        "gpt-image-1",

      prompt,

      size:
        resolveImageSize(
          storyboard.aspectRatio,
          options.imageSize,
        ),

      quality:
        options.imageQuality ||
        "auto",
    });

  const first =
    response.data?.[0];

  const base64 =
    first?.b64_json;

  if (!base64) {
    throw new Error(
      `OpenAI image generation returned no image data for scene ${scene.id}.`,
    );
  }

  const mimeType =
    first?.b64_json
      ? "image/png"
      : resolveImageMime(
          base64,
        );

  const extension =
    extensionForMime(
      mimeType,
    );

  const filePath =
    path.join(
      outputDirectory,
      `${context?.projectId || "media"}-${scene.id}.${extension}`,
    );

  const fileSizeBytes =
    await writeBase64Asset(
      base64,
      filePath,
    );

  return {
    sceneId:
      scene.id,

    asset:
      createImageAsset(
        scene.id,
        scene.index,
        filePath,
        fileSizeBytes,
        prompt,
        createdAt,
      ),
  };
}

async function generateSceneVoice(
  client: OpenAI,
  scene: Storyboard["scenes"][number],
  options: OpenAIMediaGenerationOptions,
  outputDirectory: string,
  context?: MediaCapabilityContext,
): Promise<SceneVoiceResult | undefined> {
  const text =
    normalizeText(
      scene.narration,
    );

  if (!text) {
    return undefined;
  }

  const createdAt =
    Date.now();

  const response =
    await client.audio.speech.create({
      model:
        options.speechModel ||
        process.env.OPENAI_TTS_MODEL ||
        "gpt-4o-mini-tts",

      voice:
        options.voice ||
        process.env.OPENAI_TTS_VOICE ||
        "alloy",

      input:
        text,

      response_format:
        "mp3",
    });

  const filePath =
    path.join(
      outputDirectory,
      `${context?.projectId || "media"}-${scene.id}-voice.mp3`,
    );

  const fileSizeBytes =
    await writeArrayBufferAsset(
      await response.arrayBuffer(),
      filePath,
    );

  const estimatedDuration =
    Math.max(
      0.8,
      Number(
        (
          text.length /
          4
        ).toFixed(2),
      ),
    );

  return {
    sceneId:
      scene.id,

    asset:
      createVoiceAsset(
        scene.id,
        scene.index,
        filePath,
        fileSizeBytes,
        text,
        estimatedDuration,
        createdAt,
      ),
  };
}

function runProcess(
  executable: string,
  args: string[],
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
        reject,
      );

      child.on(
        "close",
        (code) => {
          resolve({
            code:
              typeof code ===
              "number"
                ? code
                : -1,

            stdout,

            stderr,
          });
        },
      );
    },
  );
}

async function createSceneVideo(
  imageAsset: MediaAsset,
  scene: Storyboard["scenes"][number],
  outputDirectory: string,
  options: OpenAIMediaGenerationOptions,
  context?: MediaCapabilityContext,
): Promise<MediaAsset> {
  const executable =
    ffmpegPath;

  if (
    typeof executable !==
    "string" ||
    !executable
  ) {
    throw new Error(
      "FFmpeg binary is not available.",
    );
  }

  const input =
    imageAsset.storageKey;

  if (!input) {
    throw new Error(
      `Generated image ${imageAsset.id} has no storage path.`,
    );
  }

  const width =
    Math.max(
      2,
      Math.round(
        safeNumber(
          options.width,
          1080,
        ),
      ),
    );

  const height =
    Math.max(
      2,
      Math.round(
        safeNumber(
          options.height,
          1920,
        ),
      ),
    );

  const frameRate =
    Math.max(
      1,
      Math.round(
        safeNumber(
          options.frameRate,
          30,
        ),
      ),
    );

  const duration =
    Math.max(
      0.5,
      scene.durationSeconds,
    );

  const outputPath =
    path.join(
      outputDirectory,
      `${context?.projectId || "media"}-${scene.id}-video.mp4`,
    );

  const args = [
    "-y",

    "-loop",
    "1",

    "-i",
    input,

    "-t",
    String(duration),

    "-vf",
    [
      `scale=${width}:${height}:force_original_aspect_ratio=increase`,
      `crop=${width}:${height}`,
      "setsar=1",
      `fps=${frameRate}`,
      "format=yuv420p",
    ].join(","),

    "-an",

    "-c:v",
    "libx264",

    "-preset",
    "veryfast",

    "-pix_fmt",
    "yuv420p",

    "-movflags",
    "+faststart",

    outputPath,
  ];

  const execution =
    await runProcess(
      executable,
      args,
    );

  if (
    execution.code !== 0
  ) {
    throw new Error(
      execution.stderr ||
        `FFmpeg scene generation failed with code ${execution.code}.`,
    );
  }

  const stat =
    await fs.stat(
      outputPath,
    );

  return createVideoAsset(
    scene.id,
    scene.index,
    outputPath,
    duration,
    width,
    height,
    Date.now(),
  );
}

export async function generateOpenAIMedia(
  storyboard: Storyboard,
  options: OpenAIMediaGenerationOptions = {},
  context?: MediaCapabilityContext,
): Promise<OpenAIMediaGenerationResult> {
  const createdAt =
    Date.now();

  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    getApiKey();
  } catch (error) {
    return {
      success: false,

      provider: "openai",

      code:
        "OPENAI_API_KEY_MISSING",

      assets: [],

      imageAssets: [],

      voiceAssets: [],

      videoAssets: [],

      errors: [
        error instanceof Error
          ? error.message
          : String(error),
      ],

      warnings: [],

      createdAt,
    };
  }

  const outputDirectory =
    resolveOutputDirectory(
      options.outputDirectory,
    );

  await fs.mkdir(
    outputDirectory,
    {
      recursive: true,
    },
  );

  const client =
    createClient();

  const imageAssets: MediaAsset[] =
    [];

  const voiceAssets: MediaAsset[] =
    [];

  const videoAssets: MediaAsset[] =
    [];

  /*
   * Sequential generation is intentional.
   *
   * It keeps provider load and cost
   * predictable for the Alpha runtime.
   */
  for (const scene of storyboard.scenes) {
    try {
      const image =
        await generateSceneImage(
          client,
          storyboard,
          scene,
          options,
          outputDirectory,
          context,
        );

      imageAssets.push(
        image.asset,
      );

      const video =
        await createSceneVideo(
          image.asset,
          scene,
          outputDirectory,
          options,
          context,
        );

      videoAssets.push(
        video,
      );
    } catch (error) {
      errors.push(
        `Scene ${scene.index} visual generation failed: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );
    }

    try {
      const voice =
        await generateSceneVoice(
          client,
          scene,
          options,
          outputDirectory,
          context,
        );

      if (voice) {
        voiceAssets.push(
          voice.asset,
        );
      }
    } catch (error) {
      errors.push(
        `Scene ${scene.index} voice generation failed: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );
    }
  }

  if (
    videoAssets.length !==
    storyboard.scenes.length
  ) {
    warnings.push(
      "Not every storyboard scene has a generated video asset.",
    );
  }

  if (
    voiceAssets.length <
    storyboard.scenes.filter(
      (scene) =>
        normalizeText(
          scene.narration,
        ),
    ).length
  ) {
    warnings.push(
      "Not every narrated scene has a generated voice asset.",
    );
  }

  const completedAt =
    Date.now();

  return {
    success:
      errors.length === 0 &&
      videoAssets.length ===
        storyboard.scenes.length,

    provider: "openai",

    code:
      errors.length === 0
        ? "C146_9_OPENAI_MEDIA_GENERATION_COMPLETED"
        : "C146_9_OPENAI_MEDIA_GENERATION_PARTIAL",

    assets: [
      ...imageAssets,
      ...voiceAssets,
      ...videoAssets,
    ],

    imageAssets,

    voiceAssets,

    videoAssets,

    errors,

    warnings,

    createdAt,

    completedAt,
  };
}
