import "server-only";

import OpenAI from "openai";

import type {
  MediaAspectRatio,
} from "./options";

export type OpenAIVideoModel =
  | "sora-2"
  | "sora-2-pro";

export type OpenAIVideoSeconds =
  | "4"
  | "8"
  | "12";

export interface OpenAIVideoCreateOptions {
  model?: OpenAIVideoModel;
  seconds?: OpenAIVideoSeconds;
  aspectRatio?: MediaAspectRatio;
  prompt: string;
}

export interface OpenAIVideoJob {
  id: string;
  object: "video";
  model: string;
  status:
    | "queued"
    | "in_progress"
    | "completed"
    | "failed";
  progress: number;
  prompt: string | null;
  seconds: string;
  size: string;
  createdAt: number;
  completedAt: number | null;
  expiresAt: number | null;
  error: {
    code: string;
    message: string;
  } | null;
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

function normalizePrompt(
  prompt: string,
): string {
  return prompt
    .replace(/\s+/g, " ")
    .trim();
}

function resolveVideoSize(
  aspectRatio?: MediaAspectRatio,
): "720x1280" | "1280x720" | "1024x1792" | "1792x1024" {
  switch (aspectRatio) {
    case "16:9":
    case "4:3":
    case "3:2":
      return "1792x1024";

    case "9:16":
    case "4:5":
      return "1024x1792";

    case "1:1":
    default:
      /*
       * Sora does not currently expose a
       * native 1:1 create-video size.
       *
       * Use portrait and let the AIOS
       * composition layer crop later.
       */
      return "1024x1792";
  }
}

function normalizeSeconds(
  value: OpenAIVideoSeconds | undefined,
): OpenAIVideoSeconds {
  if (
    value === "4" ||
    value === "8" ||
    value === "12"
  ) {
    return value;
  }

  return "12";
}

function toJob(
  video: {
    id: string;
    object: "video";
    model: string;
    status:
      | "queued"
      | "in_progress"
      | "completed"
      | "failed";
    progress: number;
    prompt: string | null;
    seconds: string;
    size: string;
    created_at: number;
    completed_at: number | null;
    expires_at: number | null;
    error?: {
      code: string;
      message: string;
    } | null;
  },
): OpenAIVideoJob {
  return {
    id: video.id,
    object: video.object,
    model: video.model,
    status: video.status,
    progress: video.progress,
    prompt: video.prompt,
    seconds: video.seconds,
    size: video.size,
    createdAt: video.created_at,
    completedAt:
      video.completed_at,
    expiresAt:
      video.expires_at,
    error:
      video.error || null,
  };
}

export async function createOpenAIVideoJob(
  options: OpenAIVideoCreateOptions,
): Promise<OpenAIVideoJob> {
  const prompt =
    normalizePrompt(
      options.prompt,
    );

  if (!prompt) {
    throw new Error(
      "Video prompt is required.",
    );
  }

  const client =
    createClient();

  const video =
    await client.videos.create({
      model:
        options.model ||
        process.env.OPENAI_VIDEO_MODEL ||
        "sora-2",

      prompt,

      seconds:
        normalizeSeconds(
          options.seconds,
        ),

      size:
        resolveVideoSize(
          options.aspectRatio,
        ),
    });

  return toJob(
    video,
  );
}

export async function retrieveOpenAIVideoJob(
  videoId: string,
): Promise<OpenAIVideoJob> {
  const normalizedId =
    videoId.trim();

  if (!normalizedId) {
    throw new Error(
      "Video ID is required.",
    );
  }

  const client =
    createClient();

  const video =
    await client.videos.retrieve(
      normalizedId,
    );

  return toJob(
    video,
  );
}

export async function downloadOpenAIVideo(
  videoId: string,
): Promise<Response> {
  const normalizedId =
    videoId.trim();

  if (!normalizedId) {
    throw new Error(
      "Video ID is required.",
    );
  }

  const client =
    createClient();

  const video =
    await client.videos.retrieve(
      normalizedId,
    );

  if (
    video.status !==
    "completed"
  ) {
    throw new Error(
      `Video is not ready. Current status: ${video.status}.`,
    );
  }

  return client.videos.downloadContent(
    normalizedId,
    {
      variant: "video",
    },
  );
}
