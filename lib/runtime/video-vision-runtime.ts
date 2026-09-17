import OpenAI from "openai";

import type {
  VideoVisualEvidenceResult,
} from "./video-visual-evidence-runtime";

const DEFAULT_VISION_MODEL =
  process.env.AIOS_VISION_MODEL ??
  "gpt-5.6-luna";

const MAX_VISION_FRAMES = 5;

const MAX_PROMPT_LENGTH = 4_000;

export interface VideoVisionRuntimeResult {
  success: boolean;
  code: string;

  provider: "openai";

  model?: string;

  frameCount: number;

  analyzedFrameCount: number;

  semanticUnderstandingReady: boolean;

  content?: string;

  error?: string;
}

function buildDataUrl(
  mimeType: string,
  imageBase64: string,
): string {
  return `data:${mimeType};base64,${imageBase64}`;
}

function createVisionPrompt(
  userPrompt: string,
  visualEvidence: VideoVisualEvidenceResult,
): string {
  const boundedPrompt =
    userPrompt
      .trim()
      .slice(0, MAX_PROMPT_LENGTH);

  const timeline = visualEvidence.visionInputs
    .map(
      (frame) =>
        `Frame ${frame.index} · ${frame.timestampSeconds.toFixed(3)}s`,
    )
    .join("\n");

  return [
    "You are the visual understanding layer of AIOS.",
    "",
    "Analyze the supplied video frames as a temporal sequence.",
    "Do not pretend to have access to frames that were not supplied.",
    "Do not infer audio, speech, or unseen frames.",
    "Distinguish direct visual evidence from inference.",
    "",
    "Return the result in concise Chinese with this structure:",
    "",
    "1. 视频整体内容",
    "2. 关键画面",
    "3. 时间顺序变化",
    "4. 可确认的视觉事实",
    "5. 推断内容",
    "6. 置信度",
    "",
    "If the user's request concerns commerce, products, advertising, Douyin/TikTok,",
    "or content performance, additionally identify visible product, packaging,",
    "demonstration, selling points, text overlays, people/actions, and other",
    "commercially relevant visual evidence.",
    "",
    `用户任务：${boundedPrompt || "分析这个视频的视觉内容。"}`,
    "",
    "Frame timeline:",
    timeline,
  ].join("\n");
}

export async function executeRuntimeVideoVision(
  userPrompt: string,
  visualEvidence: VideoVisualEvidenceResult,
): Promise<VideoVisionRuntimeResult> {
  const visionInputs =
    visualEvidence.visionInputs
      .slice(0, MAX_VISION_FRAMES);

  if (
    !visualEvidence.success ||
    !visualEvidence.evidence.visionReady ||
    visionInputs.length === 0
  ) {
    return {
      success: false,
      code:
        "C144_9_VIDEO_VISION_INPUT_NOT_READY",
      provider: "openai",
      frameCount:
        visualEvidence.frameCount,
      analyzedFrameCount: 0,
      semanticUnderstandingReady: false,
      error:
        "Video visual evidence is not ready for Vision analysis.",
    };
  }

  const apiKey =
    process.env.OPENAI_API_KEY ??
    "";

  if (!apiKey) {
    return {
      success: false,
      code:
        "C144_9_VIDEO_VISION_API_KEY_MISSING",
      provider: "openai",
      model: DEFAULT_VISION_MODEL,
      frameCount:
        visualEvidence.frameCount,
      analyzedFrameCount: 0,
      semanticUnderstandingReady: false,
      error:
        "OPENAI_API_KEY is not configured.",
    };
  }

  const client = new OpenAI({
    apiKey,
    ...(process.env.OPENAI_BASE_URL
      ? {
          baseURL:
            process.env.OPENAI_BASE_URL,
        }
      : {}),
  });

  const content = [
    {
      type: "input_text" as const,
      text: createVisionPrompt(
        userPrompt,
        visualEvidence,
      ),
    },
    ...visionInputs.map(
      (frame) => ({
        type: "input_image" as const,
        image_url: buildDataUrl(
          frame.mimeType,
          frame.imageBase64,
        ),
        detail: "low" as const,
      }),
    ),
  ];

  try {
    const response =
      await client.responses.create({
        model:
          DEFAULT_VISION_MODEL,
        input: [
          {
            role: "user",
            content,
          },
        ],
      });

    const output =
      response.output_text?.trim() ??
      "";

    if (!output) {
      return {
        success: false,
        code:
          "C144_9_VIDEO_VISION_EMPTY",
        provider: "openai",
        model:
          DEFAULT_VISION_MODEL,
        frameCount:
          visualEvidence.frameCount,
        analyzedFrameCount:
          visionInputs.length,
        semanticUnderstandingReady:
          false,
        error:
          "Vision model returned no textual analysis.",
      };
    }

    return {
      success: true,
      code:
        "C144_9_VIDEO_VISION_PASS",
      provider: "openai",
      model:
        DEFAULT_VISION_MODEL,
      frameCount:
        visualEvidence.frameCount,
      analyzedFrameCount:
        visionInputs.length,
      semanticUnderstandingReady:
        true,
      content: output,
    };
  } catch (error) {
    return {
      success: false,
      code:
        "C144_9_VIDEO_VISION_ERROR",
      provider: "openai",
      model:
        DEFAULT_VISION_MODEL,
      frameCount:
        visualEvidence.frameCount,
      analyzedFrameCount:
        visionInputs.length,
      semanticUnderstandingReady:
        false,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }
}
