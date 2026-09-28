import OpenAI from "openai";

import type {
  AIOSInputItem,
} from "@/lib/runtime/input/aios-input-types";

const MAX_INPUTS = 8;

const MAX_IMAGE_BYTES =
  20 * 1024 * 1024;

const MAX_FILE_BYTES =
  25 * 1024 * 1024;

const MAX_OUTPUT_CHARS =
  8_000;

const IMAGE_TYPES =
  new Set<string>([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ]);

const TEXT_TYPES =
  new Set<string>([
    "text/plain",
    "text/csv",
    "application/json",
  ]);

export interface AIOSCNInputFile {
  inputId: string;
  file: File;
}

export interface AIOSCNInputUnderstandingResult {
  success: boolean;
  code:
    | "AIOS_CN_INPUT_UNDERSTANDING_COMPLETED"
    | "AIOS_CN_INPUT_UNDERSTANDING_PARTIAL"
    | "AIOS_CN_INPUT_UNDERSTANDING_REJECTED";
  inputs: AIOSInputItem[];
  understoodCount: number;
  pendingCount: number;
  failedCount: number;
  limitations: string[];
  safetyBoundary: {
    plannerDispatched: false;
    tradingExecuted: false;
    commercialActualWritten: false;
  };
  provider:
    | "deepseek"
    | "none";
  model?: string;
  generatedAt: string;
}

function cloneInput(
  input: AIOSInputItem,
): AIOSInputItem {
  return {
    ...input,
    metadata: {
      ...input.metadata,
    },
  };
}

function ready(
  input: AIOSInputItem,
  text: string,
): AIOSInputItem {
  return {
    ...cloneInput(input),
    extractedText:
      text
        .trim()
        .slice(
          0,
          MAX_OUTPUT_CHARS,
        ),
    processingStatus:
      "ready",
    processingError:
      null,
  };
}

function pending(
  input: AIOSInputItem,
  reason: string,
): AIOSInputItem {
  return {
    ...cloneInput(input),
    processingStatus:
      "pending",
    processingError:
      reason,
  };
}

function failed(
  input: AIOSInputItem,
  reason: string,
): AIOSInputItem {
  return {
    ...cloneInput(input),
    processingStatus:
      "failed",
    processingError:
      reason,
  };
}

function dataUrl(
  mimeType: string,
  base64: string,
): string {
  return `data:${mimeType};base64,${base64}`;
}

function normalizeImageMimeType(
  mimeType: string,
): string {
  const normalized =
    mimeType
      .trim()
      .toLowerCase();

  if (
    IMAGE_TYPES.has(
      normalized,
    )
  ) {
    return normalized;
  }

  return "image/jpeg";
}

async function analyzeImage(
  file: File,
  prompt: string,
): Promise<string> {
  const apiKey =
    process.env
      .DEEPSEEK_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "DEEPSEEK_API_KEY is not configured.",
    );
  }

  const bytes =
    await file.arrayBuffer();

  const base64 =
    Buffer.from(
      bytes,
    ).toString(
      "base64",
    );

  const mimeType =
    normalizeImageMimeType(
      file.type,
    );

  const client =
    new OpenAI({
      apiKey,
      baseURL:
        process.env
          .DEEPSEEK_BASE_URL?.trim() ||
        "https://api.deepseek.com",
    });

  const userPrompt =
    prompt.trim() ||
    "请分析这张图片。";

  const response =
    await client.chat.completions.create(
      {
        model:
          "deepseek-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: [
                  "你是 AIOS CN 的真实视觉理解层。",
                  "",
                  "下面提供的 image_url 是实际图片数据。",
                  "必须直接分析图片本身。",
                  "不要把文件名、用户描述或模型常识当作视觉事实。",
                  "不要声称看到了图片中不存在的内容。",
                  "必须明确区分视觉证据与推断。",
                  "如果文字无法确认，明确标记为不清晰。",
                  "",
                  "请使用中文返回：",
                  "1. 图片内容",
                  "2. 可确认的视觉事实",
                  "3. 图片文字 / OCR",
                  "4. 关键对象",
                  "5. 人物或场景",
                  "6. 商品 / 商业信息",
                  "7. 可能的上下文",
                  "8. 不确定项",
                  "9. 置信度",
                  "",
                  `用户任务：${userPrompt}`,
                ].join(
                  "\n",
                ),
              },
              {
                type:
                  "image_url",
                image_url: {
                  url:
                    dataUrl(
                      mimeType,
                      base64,
                    ),
                  detail:
                    "auto",
                },
              },
            ],
          },
        ],
        max_tokens:
          4_000,
      } as never,
    );

  const content =
    response
      .choices?.[0]
      ?.message
      ?.content;

  if (
    typeof content !==
      "string" ||
    !content.trim()
  ) {
    throw new Error(
      "DeepSeek Vision returned no usable content.",
    );
  }

  return content;
}

function isImage(
  file: File,
): boolean {
  return IMAGE_TYPES.has(
    file.type
      .trim()
      .toLowerCase(),
  );
}

function isText(
  file: File,
): boolean {
  return TEXT_TYPES.has(
    file.type
      .trim()
      .toLowerCase(),
  );
}

export async function processAIOSCNInputUnderstanding(
  inputs: AIOSInputItem[],
  files: AIOSCNInputFile[],
  prompt = "",
): Promise<AIOSCNInputUnderstandingResult> {
  if (
    inputs.length === 0 ||
    files.length === 0
  ) {
    return {
      success: false,
      code:
        "AIOS_CN_INPUT_UNDERSTANDING_REJECTED",
      inputs,
      understoodCount: 0,
      pendingCount: 0,
      failedCount:
        inputs.length,
      limitations: [
        "No uploaded input files were provided.",
      ],
      safetyBoundary: {
        plannerDispatched:
          false,
        tradingExecuted:
          false,
        commercialActualWritten:
          false,
      },
      provider:
        "none",
      generatedAt:
        new Date().toISOString(),
    };
  }

  if (
    inputs.length >
      MAX_INPUTS ||
    files.length >
      MAX_INPUTS
  ) {
    return {
      success: false,
      code:
        "AIOS_CN_INPUT_UNDERSTANDING_REJECTED",
      inputs:
        inputs.map(
          (input) =>
            failed(
              input,
              "AIOS CN accepts at most 8 inputs.",
            ),
        ),
      understoodCount: 0,
      pendingCount: 0,
      failedCount:
        inputs.length,
      limitations: [
        "Maximum input count is 8.",
      ],
      safetyBoundary: {
        plannerDispatched:
          false,
        tradingExecuted:
          false,
        commercialActualWritten:
          false,
      },
      provider:
        "none",
      generatedAt:
        new Date().toISOString(),
    };
  }

  const fileMap =
    new Map<
      string,
      File
    >(
      files.map(
        (entry) => [
          entry.inputId,
          entry.file,
        ],
      ),
    );

  const output:
    AIOSInputItem[] = [];

  let usedDeepSeek =
    false;

  for (
    const input of inputs
  ) {
    const file =
      fileMap.get(
        input.id,
      );

    if (!file) {
      output.push(
        failed(
          input,
          "Uploaded file was not mapped to the input id.",
        ),
      );
      continue;
    }

    if (
      file.size <= 0 ||
      !Number.isFinite(
        file.size,
      )
    ) {
      output.push(
        failed(
          input,
          "Uploaded file cannot be read.",
        ),
      );
      continue;
    }

    if (
      file.size >
      MAX_FILE_BYTES
    ) {
      output.push(
        failed(
          input,
          "Uploaded file exceeds the 25 MB limit.",
        ),
      );
      continue;
    }

    if (
      isImage(file)
    ) {
      if (
        file.size >
        MAX_IMAGE_BYTES
      ) {
        output.push(
          failed(
            input,
            "Image exceeds the 20 MB limit.",
          ),
        );
        continue;
      }

      try {
        const content =
          await analyzeImage(
            file,
            prompt,
          );

        usedDeepSeek =
          true;

        output.push(
          ready(
            input,
            content,
          ),
        );
      } catch (
        error
      ) {
        output.push(
          failed(
            input,
            error instanceof Error
              ? error.message
              : "DeepSeek image understanding failed.",
          ),
        );
      }

      continue;
    }

    if (
      isText(file)
    ) {
      try {
        const text =
          await file.text();

        if (
          !text.trim()
        ) {
          output.push(
            failed(
              input,
              "Text file is empty.",
            ),
          );
          continue;
        }

        output.push(
          ready(
            input,
            text,
          ),
        );
      } catch {
        output.push(
          failed(
            input,
            "Text file could not be read.",
          ),
        );
      }

      continue;
    }

    output.push(
      pending(
        input,
        "PDF and Office document parsing are not enabled in this CN runtime stage.",
      ),
    );
  }

  const understoodCount =
    output.filter(
      (item) =>
        item.processingStatus ===
        "ready",
    ).length;

  const pendingCount =
    output.filter(
      (item) =>
        item.processingStatus ===
        "pending",
    ).length;

  const failedCount =
    output.filter(
      (item) =>
        item.processingStatus ===
        "failed",
    ).length;

  const limitations: string[] =
    [
      "AIOS CN uses DeepSeek Flash for real image understanding.",
      "Supported image formats are JPEG, PNG, GIF, and WebP.",
      "Image analysis is performed from the supplied image data, not from the filename.",
      "Vision output is evidence and is not automatically verified fact.",
      "PDF and Office document parsing remain pending.",
      "Uploaded files are processed transiently and are not persisted by this runtime.",
      "Planner dispatch, trading execution, and commercial actual writes remain disabled.",
    ];

  return {
    success:
      understoodCount >
      0,
    code:
      understoodCount ===
        output.length
        ? "AIOS_CN_INPUT_UNDERSTANDING_COMPLETED"
        : "AIOS_CN_INPUT_UNDERSTANDING_PARTIAL",
    inputs:
      output,
    understoodCount,
    pendingCount,
    failedCount,
    limitations,
    safetyBoundary: {
      plannerDispatched:
        false,
      tradingExecuted:
        false,
      commercialActualWritten:
        false,
    },
    provider:
      usedDeepSeek
        ? "deepseek"
        : "none",
    model:
      usedDeepSeek
        ? "deepseek-flash"
        : undefined,
    generatedAt:
      new Date().toISOString(),
  };
}
