import OpenAI from "openai";

import type {
  VideoVisualEvidenceResult,
} from "./video-visual-evidence-runtime";

import {
  getVideoVisionConfig,
  type VideoVisionProvider,
} from "./video-vision-config";

const MAX_VISION_FRAMES = 5;
const MAX_PROMPT_LENGTH = 4_000;

export interface VideoVisionGatewayResult {
  success: boolean;
  code: string;

  provider: VideoVisionProvider;

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

function buildVisionPrompt(
  userPrompt: string,
  visualEvidence: VideoVisualEvidenceResult,
): string {
  const boundedPrompt =
    userPrompt
      .trim()
      .slice(0, MAX_PROMPT_LENGTH);

  const timeline =
    visualEvidence.visionInputs
      .map(
        (frame) =>
          `Frame ${frame.index} · ${frame.timestampSeconds.toFixed(3)}s`,
      )
      .join("\n");

  return [
    "You are the visual understanding layer of AIOS.",

    "",

    "Analyze the supplied video frames as a temporal sequence.",

    "Only use the frames actually supplied.",
    "Do not claim access to unseen frames.",
    "Do not infer audio or speech.",
    "Clearly distinguish direct visual evidence from inference.",

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

    "If the task concerns commerce, products, advertising, Douyin, TikTok,",
    "or content performance, additionally identify visible products,",
    "packaging, demonstrations, selling points, text overlays, people,",
    "actions, pricing information, and other commercially relevant evidence.",

    "",

    `用户任务：${
      boundedPrompt ||
      "分析这个视频的视觉内容。"
    }`,

    "",

    "Frame timeline:",

    timeline,
  ].join("\n");
}

async function executeOpenAIVision(
  userPrompt: string,
  visualEvidence: VideoVisualEvidenceResult,
): Promise<VideoVisionGatewayResult> {
  const config =
    getVideoVisionConfig();

  const visionInputs =
    visualEvidence.visionInputs
      .slice(0, MAX_VISION_FRAMES);

  if (!config.apiKeyConfigured) {
    return {
      success: false,
      code:
        "C144_9_VIDEO_VISION_API_KEY_MISSING",
      provider: "openai",
      model: config.model,
      frameCount:
        visualEvidence.frameCount,
      analyzedFrameCount: 0,
      semanticUnderstandingReady:
        false,
      error:
        "OPENAI_API_KEY is not configured.",
    };
  }

  const client =
    new OpenAI({
      apiKey:
        process.env.OPENAI_API_KEY,
      ...(config.baseURL
        ? {
            baseURL:
              config.baseURL,
          }
        : {}),
    });

  const content = [
    {
      type: "input_text" as const,
      text:
        buildVisionPrompt(
          userPrompt,
          visualEvidence,
        ),
    },

    ...visionInputs.map(
      (frame) => ({
        type: "input_image" as const,

        image_url:
          buildDataUrl(
            frame.mimeType,
            frame.imageBase64,
          ),

        detail:
          "low" as const,
      }),
    ),
  ];

  try {
    const response =
      await client.responses.create({
        model:
          config.model,

        input: [
          {
            role: "user",

            content,
          },
        ],
      });

    const output =
      response.output_text
        ?.trim() ?? "";

    if (!output) {
      return {
        success: false,
        code:
          "C144_9_VIDEO_VISION_EMPTY",
        provider: "openai",
        model: config.model,
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
      model: config.model,
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
      model: config.model,
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

export async function executeVideoVisionGateway(
  userPrompt: string,
  visualEvidence: VideoVisualEvidenceResult,
): Promise<VideoVisionGatewayResult> {
  const config =
    getVideoVisionConfig();

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
      provider: config.provider,
      model: config.model,
      frameCount:
        visualEvidence.frameCount,
      analyzedFrameCount: 0,
      semanticUnderstandingReady:
        false,
      error:
        "Video visual evidence is not ready for Vision analysis.",
    };
  }

  if (config.provider === "openai") {
    return executeOpenAIVision(
      userPrompt,
      visualEvidence,
    );
  }

  return {
    success: false,
    code:
      "C144_9_VIDEO_VISION_PROVIDER_UNAVAILABLE",
    provider: "none",
    model: config.model,
    frameCount:
      visualEvidence.frameCount,
    analyzedFrameCount: 0,
    semanticUnderstandingReady:
      false,
    error:
      "No supported Vision provider is configured.",
  };
}
