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
  coverageMode:
    | "full-timeline"
    | "none";
  semanticUnderstandingReady: boolean;
  safetyBoundary: {
    plannerDispatched: false;
    tradingExecuted: false;
    commercialActualWritten: false;
  };
  generatedAt: string;
}

const MAX_FRAMES = 48;

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
  provider:
    | "deepseek"
    | "none",
  frameCount: number,
  analyzedFrameCount: number,
  model?: string,
): AIOSCNVideoResult {
  return {
    success: false,
    code:
      "AIOS_CN_VIDEO_UNDERSTANDING_FAILED",
    provider,
    model,
    frameCount,
    analyzedFrameCount,
    coverageMode: "none",
    semanticUnderstandingReady:
      false,
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

function buildAnalysisPrompt(
  prompt: string,
  frameCount: number,
): string {
  const userPrompt =
    prompt.trim();

  return [
    "You are the AIOS multimodal understanding layer.",
    "",
    "The supplied images are ordered samples covering the complete video timeline.",
    `Analyze all ${frameCount} timeline samples as one continuous video.`,
    "Do not describe them as unrelated images.",
    "",
    "Required output structure:",
    "1. Video overview",
    "2. Timeline and temporal changes",
    "3. Key information",
    "4. Confirmed visual facts",
    "5. Visible text and OCR",
    "6. People, actions, scenes, and objects",
    "7. Products, brands, locations, or commercial information",
    "8. Important details that may be easy to miss",
    "9. Uncertainties and evidence limits",
    "10. Concise conclusion",
    "",
    "Compare earlier and later timeline samples.",
    "Identify changes, transitions, repeated actions, and important events.",
    "Do not claim audio content because this request contains visual frames only.",
    "Do not invent information that is not visually supported.",
    "Clearly separate confirmed observations from uncertain interpretation.",
    "",
    userPrompt ||
      "Provide a comprehensive visual understanding of the entire video.",
  ].join("\n");
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
          Number.isFinite(
            frame.ratio,
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

  const content: Array<
    Record<string, unknown>
  > = [
    {
      type: "text",
      text:
        buildAnalysisPrompt(
          prompt,
          usableFrames.length,
        ),
    },
  ];

  for (
    let index = 0;
    index <
    usableFrames.length;
    index += 1
  ) {
    const frame =
      usableFrames[index];

    content.push({
      type: "text",
      text:
        [
          "Timeline sample:",
          String(
            index + 1,
          ),
          "Timestamp:",
          frame.timestampSeconds.toFixed(
            2,
          ),
          "seconds",
          "Timeline ratio:",
          frame.ratio.toFixed(
            4,
          ),
        ].join(" "),
    });

    content.push({
      type: "image_url",
      image_url: {
        url:
          buildDataUrl(
            normalizeMimeType(
              frame.mimeType,
            ),
            frame.imageBase64,
          ),
        detail: "auto",
      },
    });
  }

  try {
    const response =
      await client.chat.completions.create(
        {
          model:
            "deepseek-flash",
          messages: [
            {
              role: "user",
              content:
                content as never,
            },
          ],
          temperature: 0.1,
          max_tokens: 8000,
        },
      );

    const output =
      response.choices?.[0]
        ?.message?.content;

    const contentText =
      typeof output ===
      "string"
        ? output.trim()
        : "";

    if (!contentText) {
      return buildFailure(
        "deepseek",
        frames.length,
        usableFrames.length,
        "deepseek-flash",
      );
    }

    return {
      success: true,
      code:
        "AIOS_CN_VIDEO_UNDERSTANDING_COMPLETED",
      content:
        contentText.slice(
          0,
          8000,
        ),
      provider: "deepseek",
      model:
        "deepseek-flash",
      frameCount:
        frames.length,
      analyzedFrameCount:
        usableFrames.length,
      coverageMode:
        "full-timeline",
      semanticUnderstandingReady:
        true,
      safetyBoundary: {
        plannerDispatched: false,
        tradingExecuted: false,
        commercialActualWritten:
          false,
      },
      generatedAt:
        new Date().toISOString(),
    };
  } catch {
    return buildFailure(
      "deepseek",
      frames.length,
      usableFrames.length,
      "deepseek-flash",
    );
  }
}
