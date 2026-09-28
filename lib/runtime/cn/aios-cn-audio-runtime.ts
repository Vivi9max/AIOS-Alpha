import OpenAI from "openai";

export type AIOSCNAudioMode =
  | "summary"
  | "transcription";

export interface AIOSCNAudioResult {
  success: boolean;
  code:
    | "AIOS_CN_AUDIO_TRANSCRIPTION_COMPLETED"
    | "AIOS_CN_AUDIO_TRANSCRIPTION_UNAVAILABLE"
    | "AIOS_CN_AUDIO_TRANSCRIPTION_FAILED";
  mode: AIOSCNAudioMode;
  content?: string;
  durationSeconds?: number;
  language?: string;
  speakerCount?: number;
  timestamped: boolean;
  safetyBoundary: {
    plannerDispatched: false;
    tradingExecuted: false;
    commercialActualWritten: false;
  };
  generatedAt: string;
}

const MAX_AUDIO_BYTES =
  25 * 1024 * 1024;

const SUPPORTED_AUDIO_TYPES =
  new Set<string>([
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/m4a",
    "audio/wav",
    "audio/x-wav",
    "audio/webm",
    "audio/ogg",
    "audio/aac",
    "audio/flac",
  ]);

function baseResult(
  code:
    | "AIOS_CN_AUDIO_TRANSCRIPTION_COMPLETED"
    | "AIOS_CN_AUDIO_TRANSCRIPTION_UNAVAILABLE"
    | "AIOS_CN_AUDIO_TRANSCRIPTION_FAILED",
  mode: AIOSCNAudioMode,
): AIOSCNAudioResult {
  return {
    success:
      code ===
      "AIOS_CN_AUDIO_TRANSCRIPTION_COMPLETED",
    code,
    mode,
    timestamped: false,
    safetyBoundary: {
      plannerDispatched: false,
      tradingExecuted: false,
      commercialActualWritten:
        false,
    },
    generatedAt:
      new Date().toISOString(),
  };
}

function normalizeAudioType(
  type: string,
): string {
  const normalized =
    type
      .trim()
      .toLowerCase();

  if (
    SUPPORTED_AUDIO_TYPES.has(
      normalized,
    )
  ) {
    return normalized;
  }

  return "";
}

function buildPrompt(
  mode: AIOSCNAudioMode,
  prompt: string,
): string {
  const instruction =
    prompt.trim();

  if (
    mode ===
    "transcription"
  ) {
    return [
      "Transcribe the supplied audio accurately.",
      "Preserve the spoken wording as faithfully as possible.",
      "Keep the original language.",
      "Do not invent words that are not audible.",
      "If a section is unclear, mark it as unclear.",
      "If timestamps are unavailable from the transcription service, do not fabricate timestamps.",
      instruction,
    ].join("\n");
  }

  return [
    "Transcribe and summarize the supplied audio.",
    "Extract the most important information.",
    "Identify speakers when the transcription service provides enough evidence.",
    "Preserve names, dates, numbers, decisions, requests, and conclusions accurately.",
    "Do not invent information.",
    instruction,
  ].join("\n");
}

export async function transcribeAIOSCNAudio(
  file: File,
  mode: AIOSCNAudioMode,
  prompt = "",
): Promise<AIOSCNAudioResult> {
  const normalizedType =
    normalizeAudioType(
      file.type,
    );

  if (
    !normalizedType
  ) {
    return baseResult(
      "AIOS_CN_AUDIO_TRANSCRIPTION_FAILED",
      mode,
    );
  }

  if (
    file.size <= 0 ||
    file.size >
      MAX_AUDIO_BYTES
  ) {
    return baseResult(
      "AIOS_CN_AUDIO_TRANSCRIPTION_FAILED",
      mode,
    );
  }

  const apiKey =
    process.env
      .OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return baseResult(
      "AIOS_CN_AUDIO_TRANSCRIPTION_UNAVAILABLE",
      mode,
    );
  }

  try {
    const client =
      new OpenAI({
        apiKey,
      });

    const transcription =
      await client.audio.transcriptions.create(
        {
          file,
          model:
            process.env
              .AIOS_AUDIO_TRANSCRIPTION_MODEL?.trim() ||
            "gpt-4o-mini-transcribe",
          prompt:
            buildPrompt(
              mode,
              prompt,
            ),
        },
      );

const text =
  typeof transcription.text ===
  "string"
    ? transcription.text.trim()
    : "";

    if (!text) {
      return baseResult(
        "AIOS_CN_AUDIO_TRANSCRIPTION_FAILED",
        mode,
      );
    }

    const result =
      baseResult(
        "AIOS_CN_AUDIO_TRANSCRIPTION_COMPLETED",
        mode,
      );

    result.content =
      text.slice(
        0,
        16000,
      );

    return result;
  } catch {
    return baseResult(
      "AIOS_CN_AUDIO_TRANSCRIPTION_FAILED",
      mode,
    );
  }
}

export function getAIOSCNAudioLimitBytes(): number {
  return MAX_AUDIO_BYTES;
}
