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

function buildDataUrl(
  mimeType: string,
  base64: string,
): string {
  return `data:${mimeType};base64,${base64}`;
}

export async function analyzeAIOSCNVideoFrames(
  prompt: string,
  frames: AIOSCNVideoFrame[],
): Promise<AIOSCNVideoResult> {
  const apiKey =
    process.env
      .DEEPSEEK_API_KEY?.trim();

  if (!apiKey) {
    return {
      success: false,
      code:
        "AIOS_CN_VIDEO_UNDERSTANDING_FAILED",
      provider: "none",
      frameCount:
        frames.length,
      analyzedFrameCount: 0,
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
      .slice(0, 5);

  if (
    usableFrames.length ===
    0
  ) {
    return {
      success: false,
      code:
        "AIOS_CN_VIDEO_UNDERSTANDING_FAILED",
      provider: "none",
      frameCount:
        frames.length,
      analyzedFrameCount: 0,
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

  const client =
    new OpenAI({
      apiKey,
      baseURL:
        process.env
          .DEEPSEEK_BASE_URL ??
        "https://api.deepseek.com",
    });

  const timeline =
    usableFrames
      .map(
        (frame) =>
          `Frame ${frame.index}: ${frame.timestampSeconds.toFixed(2)}s`,
      )
      .join("\n");

  const content = [
    {
      type: "text",
      text: [
        "你是 AIOS CN 视频视觉理解层。",
        "",
        "这些图片是同一个视频按时间顺序抽取的关键帧。",
        "只能分析实际提供的关键帧。",
        "不能声称观察到了没有提供的其他视频内容。",
        "不能推断视频声音或没有提供的对白。",
        "必须区分直接视觉证据与推断。",
        "",
        "请使用中文返回：",
        "1. 视频整体内容",
        "2. 关键画面",
        "3. 时间顺序变化",
        "4. 可确认的视觉事实",
        "5. 画面文字",
        "6. 人物动作或场景变化",
        "7. 商品 / 商业信息",
        "8. 推断内容",
        "9. 未知项",
        "10. 置信度",
        "",
        `用户任务：${
          prompt.trim() ||
          "分析这个视频的视觉内容。"
        }`,
        "",
        "关键帧时间线：",
        timeline,
      ].join("\n"),
    },
    ...usableFrames.map(
      (frame) => ({
        type: "image_url",
        image_url: {
          url: buildDataUrl(
            frame.mimeType ||
              "image/jpeg",
            frame.imageBase64,
          ),
          detail: "low",
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
              role: "user",
              content,
            },
          ],
          thinking: {
            type: "disabled",
          },
          max_tokens: 5_000,
        } as never,
      );

    const output =
      response.choices?.[0]
        ?.message?.content;

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
    return {
      success: false,
      code:
        "AIOS_CN_VIDEO_UNDERSTANDING_FAILED",
      provider:
        "deepseek",
      model:
        "deepseek-flash",
      frameCount:
        frames.length,
      analyzedFrameCount:
        usableFrames.length,
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
}
