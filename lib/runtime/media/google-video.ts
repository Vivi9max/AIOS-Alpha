import "server-only";

import type {
  MediaAspectRatio,
} from "./options";

export type GoogleVideoModel =
  | "veo-3.1-generate-preview"
  | "veo-3.1-fast-generate-preview"
  | "veo-3.1-lite-generate-preview";

export type GoogleVideoResolution =
  | "720p"
  | "1080p"
  | "4k";

export interface GoogleVideoCreateOptions {
  prompt: string;
  model?: GoogleVideoModel;
  aspectRatio?: MediaAspectRatio;
  resolution?: GoogleVideoResolution;
  durationSeconds?: number;
}

export interface GoogleVideoJob {
  name: string;
  done: boolean;
  status:
    | "queued"
    | "in_progress"
    | "completed"
    | "failed";
  progress: number;
  model: string;
  operationName: string;
  videoUri: string | null;
  error: {
    code?: string;
    message?: string;
  } | null;
}

const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta";

function getApiKey(): string {
  const key =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim();

  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not configured.",
    );
  }

  return key;
}

function normalizePrompt(
  prompt: string,
): string {
  return prompt
    .replace(/\s+/g, " ")
    .trim();
}

function resolveModel(
  model?: GoogleVideoModel,
): GoogleVideoModel {
  if (
    model ===
      "veo-3.1-fast-generate-preview" ||
    model ===
      "veo-3.1-lite-generate-preview"
  ) {
    return model;
  }

  return (
    process.env.GOOGLE_VIDEO_MODEL?.trim() as
      | GoogleVideoModel
      | undefined
  ) ||
    "veo-3.1-generate-preview";
}

function resolveAspectRatio(
  aspectRatio?: MediaAspectRatio,
): "16:9" | "9:16" {
  return aspectRatio ===
    "16:9"
    ? "16:9"
    : "9:16";
}

function resolveResolution(
  resolution?: GoogleVideoResolution,
): GoogleVideoResolution {
  if (
    resolution === "4k" ||
    resolution === "1080p"
  ) {
    return resolution;
  }

  return "720p";
}

function resolveDuration(
  seconds?: number,
): 4 | 6 | 8 {
  if (
    seconds === 4 ||
    seconds === 6 ||
    seconds === 8
  ) {
    return seconds;
  }

  return 8;
}

function parseProgress(
  operation: Record<string, unknown>,
): number {
  const metadata =
    operation.metadata;

  if (
    metadata &&
    typeof metadata ===
      "object"
  ) {
    const progress =
      (
        metadata as Record<
          string,
          unknown
        >
      ).progress;

    if (
      typeof progress ===
      "number"
    ) {
      return Math.max(
        0,
        Math.min(
          100,
          progress,
        ),
      );
    }

    if (
      typeof progress ===
      "string"
    ) {
      const parsed =
        Number.parseFloat(
          progress.replace(
            "%",
            "",
          ),
        );

      if (
        Number.isFinite(
          parsed,
        )
      ) {
        return Math.max(
          0,
          Math.min(
            100,
            parsed,
          ),
        );
      }
    }
  }

  return operation.done
    ? 100
    : 0;
}

function parseVideoUri(
  operation: Record<string, unknown>,
): string | null {
  const response =
    operation.response;

  if (
    !response ||
    typeof response !==
      "object"
  ) {
    return null;
  }

  const responseObject =
    response as Record<
      string,
      unknown
    >;

  const generateResponse =
    responseObject
      .generateVideoResponse;

  if (
    !generateResponse ||
    typeof generateResponse !==
      "object"
  ) {
    return null;
  }

  const samples =
    (
      generateResponse as Record<
        string,
        unknown
      >
    ).generatedSamples;

  if (
    !Array.isArray(samples) ||
    !samples.length
  ) {
    return null;
  }

  const first =
    samples[0];

  if (
    !first ||
    typeof first !==
      "object"
  ) {
    return null;
  }

  const video =
    (
      first as Record<
        string,
        unknown
      >
    ).video;

  if (
    !video ||
    typeof video !==
      "object"
  ) {
    return null;
  }

  const uri =
    (
      video as Record<
        string,
        unknown
      >
    ).uri;

  return typeof uri ===
    "string"
    ? uri
    : null;
}

function parseError(
  operation: Record<string, unknown>,
) {
  const error =
    operation.error;

  if (
    !error ||
    typeof error !==
      "object"
  ) {
    return null;
  }

  const value =
    error as Record<
      string,
      unknown
    >;

  return {
    code:
      typeof value.code ===
      "string"
        ? value.code
        : undefined,

    message:
      typeof value.message ===
      "string"
        ? value.message
        : undefined,
  };
}

function toJob(
  operation: Record<string, unknown>,
  model: string,
): GoogleVideoJob {
  const name =
    typeof operation.name ===
    "string"
      ? operation.name
      : "";

  const done =
    operation.done ===
    true;

  const error =
    parseError(
      operation,
    );

  const failed =
    Boolean(error);

  return {
    name,

    done,

    status:
      failed
        ? "failed"
        : done
          ? "completed"
          : name
            ? "in_progress"
            : "queued",

    progress:
      parseProgress(
        operation,
      ),

    model,

    operationName:
      name,

    videoUri:
      parseVideoUri(
        operation,
      ),

    error,
  };
}

async function geminiRequest(
  path: string,
  init?: RequestInit,
): Promise<Record<string, unknown>> {
  const key =
    getApiKey();

  const response =
    await fetch(
      `${GEMINI_BASE_URL}${path}`,
      {
        ...init,

        headers: {
          "Content-Type":
            "application/json",

          "x-goog-api-key":
            key,

          ...(init?.headers ||
            {}),
        },

        cache:
          "no-store",
      },
    );

  const text =
    await response.text();

  let data:
    | Record<string, unknown>
    | null = null;

  try {
    data =
      JSON.parse(
        text,
      ) as Record<
        string,
        unknown
      >;
  } catch {
    data = null;
  }

  if (
    !response.ok
  ) {
    const message =
      data &&
      typeof data.error ===
        "object" &&
      data.error
        ? String(
            (
              data.error as Record<
                string,
                unknown
              >
            ).message ||
              text ||
              `Gemini API returned ${response.status}.`,
          )
        : text ||
          `Gemini API returned ${response.status}.`;

    throw new Error(
      message,
    );
  }

  return (
    data || {}
  );
}

export async function createGoogleVideoJob(
  options: GoogleVideoCreateOptions,
): Promise<GoogleVideoJob> {
  const prompt =
    normalizePrompt(
      options.prompt,
    );

  if (!prompt) {
    throw new Error(
      "Video prompt is required.",
    );
  }

  const model =
    resolveModel(
      options.model,
    );

  const aspectRatio =
    resolveAspectRatio(
      options.aspectRatio,
    );

  const resolution =
    resolveResolution(
      options.resolution,
    );

  const durationSeconds =
    resolveDuration(
      options.durationSeconds,
    );

  const operation =
    await geminiRequest(
      `/models/${model}:predictLongRunning`,
      {
        method: "POST",

        body: JSON.stringify({
          instances: [
            {
              prompt,
            },
          ],

          parameters: {
            aspectRatio,

            resolution,

            durationSeconds,
          },
        }),
      },
    );

  return toJob(
    operation,
    model,
  );
}

export async function retrieveGoogleVideoJob(
  operationName: string,
): Promise<GoogleVideoJob> {
  const name =
    operationName.trim();

  if (!name) {
    throw new Error(
      "Video operation name is required.",
    );
  }

  const operation =
    await geminiRequest(
      `/${name}`,
      {
        method: "GET",
      },
    );

  const model =
    typeof operation.model ===
    "string"
      ? operation.model
      : process.env.GOOGLE_VIDEO_MODEL ||
        "veo-3.1-generate-preview";

  return toJob(
    operation,
    model,
  );
}

export async function downloadGoogleVideo(
  videoUri: string,
): Promise<Response> {
  const uri =
    videoUri.trim();

  if (!uri) {
    throw new Error(
      "Video URI is required.",
    );
  }

  const response =
    await fetch(
      uri,
      {
        method: "GET",

        headers: {
          "x-goog-api-key":
            getApiKey(),
        },

        cache:
          "no-store",
      },
    );

  if (
    !response.ok
  ) {
    const text =
      await response.text();

    throw new Error(
      text ||
        `Google video download failed with ${response.status}.`,
    );
  }

  return response;
}

export function isGoogleVideoConfigured(): boolean {
  return Boolean(
    process.env.GEMINI_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim(),
  );
}
