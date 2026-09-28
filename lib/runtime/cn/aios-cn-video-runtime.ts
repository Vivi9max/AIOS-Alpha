import OpenAI from "openai";

export interface AIOSCNVideoFrame {
  index: number;
  timestampSeconds: number;
  ratio: number;
  mimeType: string;
  imageBase64: string;
}

export interface AIOSCNVideoResult {
  success: boolean;
  code:
    | "AIOS_CN_VIDEO_UNDERSTANDING_COMPLETED"
    | "AIOS_CN_VIDEO_UNDERSTANDING_FAILED";
  content?: string;
  provider:
    | "deepseek"
    | "none";
  model?: string;
  frameCount: number;
  analyzedFrameCount: number;
  semanticUnderstandingReady: boolean;
  safetyBoundary: {
    plannerDispatched: false;
    tradingExecuted: false;
    commercialActualWritten: false;
  };
  generatedAt: string;
}

const MAX_FRAMES = 5;

const MAX_FRAME_DATA_BYTES =
  42 * 1024 * 1024;

const SUPPORTED_IMAGE_TYPES =
  new Set<string>([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ]);

function buildDataUrl(
  mimeType: string,
  base64: string,
): string {
  return `data:${mimeType};base64,${base64}`;
}

function normalizeMimeType(
  mimeType: string,
): string {
  const normalized =
    mimeType
      .trim()
      .toLowerCase();

  if (
    SUPPORTED_IMAGE_TYPES.has(
      normalized,
    )
  ) {
    return normalized;
  }

  return "image/jpeg";
}

function estimateBase64Bytes(
  value: string,
): number {
  return Math.floor(
    (value.length * 3) / 4,
  );
}

function buildFailure(
  code:
    | "AIOS_CN_VIDEO_UNDERSTANDING_FAILED",
  provider:
    | "deepseek"
    | "none",
  frameCount: number,
  analyzedFrameCount: number,
  model?: string,
): AIOSCNVideoResult {
  return {
    success: false,
    code,
    provider,
    model,
    frameCount,
    analyzedFrameCount,
    semanticUnderstandingReady:
      false,
    safetyBoundary: {
      plannerDispatched:
        false,
      tradingExecuted:
        false,
      commercialActualWritten:
        false,
    },
    generatedAt:
      new Date().toISOString(),
  };
}

export async function analyzeAIOSCNVideoFrames(
  prompt: string,
  frames: AIOSCNVideoFrame[],
): Promise<AIOSCNVideoResult> {
  const apiKey =
    process.env
      .DEEPSEEK_API_KEY?.trim();

  if (!apiKey) {
    return buildFailure(
      "AIOS_CN_VIDEO_UNDERSTANDING_FAILED",
      "none",
      frames.length,
      0,
    );
  }

  const usableFrames =
    frames
      .filter(
        (frame) =>
          Number.isInteger(
            frame.index,
          ) &&
          Number.isFinite(
            frame.timestampSeconds,
          ) &&
          typeof frame.imageBase64 ===
            "string" &&
          frame.imageBase64.length >
            0,
      )
      .slice(
        0,
        MAX_FRAMES,
      );

  if (
    usableFrames.length ===
    0
  ) {
    return buildFailure(
      "AIOS_CN_VIDEO_UNDERSTANDING_FAILED",
      "none",
      frames.length,
      0,
    );
  }

  const estimatedBytes =
    usableFrames.reduce(
      (
        total,
        frame,
      ) =>
        total +
        estimateBase64Bytes(
          frame.imageBase64,
        ),
      0,
    );

  if (
    estimatedBytes >
    MAX_FRAME_DATA_BYTES
  ) {
    return buildFailure(
      "AIOS_CN_VIDEO_UNDERSTANDING_FAILED",
      "none",
      frames.length,
      0,
    );
  }

  const client =
    new OpenAI({
      apiKey,
      baseURL:
        process.env
          .DEEPSEEK_BASE_URL?.trim() ||
        "https://api.deepseek.com",
    });

  const timeline =
    usableFrames
      .map(
        (frame) =>
          `Frame ${frame.index}: ${frame.timestampSeconds.toFixed(2)}s`,
      )
      .join(
        "\n",
      );

  const content = [
    {
      type: "text",
      text: [
        "你是 AIOS CN 视频视觉理解层。",
        "",
        "下面的图片是同一个真实视频按照时间顺序抽取的关键帧。",
        "这些图片是实际视觉输入。",
        "只能分析实际提供的关键帧。",
        "不能声称观察到了没有提供的其他视频内容。",
        "不能虚构音频、对白或没有出现的画面。",
        "必须区分直接视觉证据与推断。",
        "",
        "请使用中文返回：",
        "1. 视频整体内容",
        "2. 关键画面",
        "3. 时间顺序变化",
        "4. 可确认的视觉事实",
        "5. 画面文字 / OCR",
        "6. 人物动作或场景变化",
        "7. 商品 / 商业信息",
        "8. 可能的上下文",
        "9. 不确定项",
        "10. 置信度",
        "",
        `用户任务：${
          prompt.trim() ||
          "分析这个视频的视觉内容。"
        }`,
        "",
        "关键帧时间线：",
        timeline,
      ].join(
        "\n",
      ),
    },
    ...usableFrames.map(
      (frame) => ({
        type:
          "image_url",
        image_url: {
          url:
            buildDataUrl(
              normalizeMimeType(
                frame.mimeType,
              ),
              frame.imageBase64,
            ),
          detail:
            "auto",
        },
      }),
    ),
  ];

  try {
    const response =
      await client.chat.completions.create(
        {
          model:
            "deepseek-flash",
          messages: [
            {
              role:
                "user",
              content,
            },
          ],
          max_tokens:
            5_000,
        } as never,
      );

    const output =
      response
        .choices?.[0]
        ?.message
        ?.content;

    if (
      typeof output !==
        "string" ||
      !output.trim()
    ) {
      throw new Error(
        "DeepSeek returned no video analysis.",
      );
    }

    return {
      success: true,
      code:
        "AIOS_CN_VIDEO_UNDERSTANDING_COMPLETED",
      content:
        output.trim(),
      provider:
        "deepseek",
      model:
        "deepseek-flash",
      frameCount:
        frames.length,
      analyzedFrameCount:
        usableFrames.length,
      semanticUnderstandingReady:
        true,
      safetyBoundary: {
        plannerDispatched:
          false,
        tradingExecuted:
          false,
        commercialActualWritten:
          false,
      },
      generatedAt:
        new Date().toISOString(),
    };
  } catch {
    return buildFailure(
      "AIOS_CN_VIDEO_UNDERSTANDING_FAILED",
      "deepseek",
      frames.length,
      usableFrames.length,
      "deepseek-flash",
    );
  }
}
