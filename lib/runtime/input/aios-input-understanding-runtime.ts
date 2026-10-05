import OpenAI from "openai";

import type {
  AIOSInputItem,
} from "./aios-input-types";

import {
  getVideoVisionConfig,
} from "../video-vision-config";

export interface AIOSInputUnderstandingFile {
  inputId: string;
  file: File;
}

export interface AIOSInputUnderstandingResult {
  success: boolean;

  code:
    | "C164_7_INPUT_UNDERSTANDING_COMPLETED"
    | "C164_7_INPUT_UNDERSTANDING_PARTIAL"
    | "C164_7_INPUT_UNDERSTANDING_REJECTED";

  inputs: AIOSInputItem[];

  understoodCount: number;

  pendingCount: number;

  failedCount: number;

  limitations: string[];

  safetyBoundary: {
    plannerDispatched: false;
    tradingExecuted: false;
  };

  generatedAt: string;
}

const MAX_INPUTS = 8;

const MAX_IMAGE_BYTES =
  20 * 1024 * 1024;

const MAX_VIDEO_BYTES =
  100 * 1024 * 1024;

const MAX_TEXT_BYTES =
  25 * 1024 * 1024;

const MAX_IMAGE_ANALYSIS_LENGTH =
  8_000;

const TEXT_MIME_TYPES =
  new Set<string>([
    "text/plain",
    "text/csv",
    "application/json",
  ]);

const IMAGE_MIME_PREFIX =
  "image/";

const VIDEO_MIME_PREFIX =
  "video/";

const PDF_MIME_TYPE =
  "application/pdf";

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

function isTextMimeType(
  mimeType: string,
): boolean {
  return TEXT_MIME_TYPES.has(
    mimeType.toLowerCase(),
  );
}

function isImageMimeType(
  mimeType: string,
): boolean {
  return mimeType
    .toLowerCase()
    .startsWith(
      IMAGE_MIME_PREFIX,
    );
}

function isVideoMimeType(
  mimeType: string,
): boolean {
  return mimeType
    .toLowerCase()
    .startsWith(
      VIDEO_MIME_PREFIX,
    );
}

function buildImageDataUrl(
  mimeType: string,
  base64: string,
): string {
  return `data:${mimeType};base64,${base64}`;
}

function applyReadyState(
  input: AIOSInputItem,
  extractedText: string,
): AIOSInputItem {
  return {
    ...cloneInput(input),
    extractedText,
    processingStatus:
      "ready",
    processingError:
      null,
  };
}

function applyPendingState(
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

function applyFailedState(
  input: AIOSInputItem,
  error: string,
): AIOSInputItem {
  return {
    ...cloneInput(input),
    processingStatus:
      "failed",
    processingError:
      error,
  };
}

function validateFile(
  entry: AIOSInputUnderstandingFile,
): string | null {
  if (
    !entry ||
    typeof entry !==
      "object"
  ) {
    return "Invalid input file entry.";
  }

  if (
    typeof entry.inputId !==
      "string" ||
    !entry.inputId.trim()
  ) {
    return "Invalid input id.";
  }

  if (
    typeof File ===
      "undefined" ||
    !(entry.file instanceof File)
  ) {
    return "Invalid uploaded File.";
  }

  const mime =
    entry.file.type
      .toLowerCase();

  if (
    isImageMimeType(
      mime,
    ) &&
    entry.file.size >
      MAX_IMAGE_BYTES
  ) {
    return "Image exceeds the 20 MB processing limit.";
  }

  if (
    isVideoMimeType(
      mime,
    ) &&
    entry.file.size >
      MAX_VIDEO_BYTES
  ) {
    return "Video exceeds the 100 MB processing limit.";
  }

  if (
    !isImageMimeType(
      mime,
    ) &&
    !isVideoMimeType(
      mime,
    ) &&
    entry.file.size >
      MAX_TEXT_BYTES
  ) {
    return "Uploaded file exceeds the 25 MB processing limit.";
  }

  return null;
}

async function analyzeImage(
  input: AIOSInputItem,
  file: File,
  isVideoFrameSheet = false,
): Promise<AIOSInputItem> {
  const config =
    getVideoVisionConfig();

  if (
    !config.apiKeyConfigured
  ) {
    return applyPendingState(
      input,
      "Vision provider is configured in the runtime boundary, but OPENAI_API_KEY is not available.",
    );
  }

  const mimeType =
    file.type ||
    input.metadata
      .mimeType ||
    "application/octet-stream";

  if (
    !isImageMimeType(
      mimeType,
    )
  ) {
    return applyFailedState(
      input,
      "Uploaded processing input is not a supported image.",
    );
  }

  try {
    const arrayBuffer =
      await file.arrayBuffer();

    const base64 =
      Buffer.from(
        arrayBuffer,
      ).toString(
        "base64",
      );

    const client =
      new OpenAI({
        apiKey:
          process.env
            .OPENAI_API_KEY,
        ...(config.baseURL
          ? {
              baseURL:
                config.baseURL,
            }
          : {}),
      });

    const context =
      isVideoFrameSheet
        ? [
            "You are the AIOS uploaded-video visual understanding layer.",
            "",
            "The supplied image is a contact sheet containing sampled frames from an uploaded video.",
            "Analyze the frames in chronological order.",
            "Describe only visual facts that are actually visible.",
            "Distinguish observed facts from interpretation.",
            "Identify visible people, products, actions, packaging, demonstrations, subtitles, prices, text, and other commercial signals.",
            "If a frame is unclear, explicitly say so.",
            "",
            "Return concise Chinese using this structure:",
            "",
            "1. 视频关键帧内容",
            "2. 按时间顺序的视觉事实",
            "3. 可见文字/OCR",
            "4. 人物与动作",
            "5. 商品与展示方式",
            "6. 商业信号",
            "7. 可确认与不可确认的信息",
            "8. 置信度",
            "",
            "Do not invent missing information.",
          ].join(
            "\n",
          )
        : [
            "You are the AIOS visual understanding layer.",
            "",
            "Analyze only the supplied image.",
            "Do not claim access to information that is not visually present.",
            "Clearly distinguish visible facts from interpretation.",
            "Read visible text when possible.",
            "If text is unclear, say that it is unclear.",
            "",
            "Return concise Chinese using this structure:",
            "",
            "1. 图片内容",
            "2. 可确认的视觉事实",
            "3. 图片中的文字/OCR",
            "4. 关键对象",
            "5. 可能的上下文",
            "6. 置信度",
            "",
            "Do not invent missing information.",
          ].join(
            "\n",
          );

    const response =
      await client.responses.create({
        model:
          config.model,

        input: [
          {
            role:
              "user",

            content: [
              {
                type:
                  "input_text",

                text:
                  context,
              },

              {
                type:
                  "input_image",

                image_url:
                  buildImageDataUrl(
                    mimeType,
                    base64,
                  ),

                detail:
                  "low",
              },
            ],
          },
        ],
      });

    const output =
      response.output_text
        ?.trim()
        .slice(
          0,
          MAX_IMAGE_ANALYSIS_LENGTH,
        ) ?? "";

    if (
      !output
    ) {
      return applyFailedState(
        input,
        "Vision provider returned no visual analysis.",
      );
    }

    return applyReadyState(
      input,
      output,
    );
  } catch (
    error
  ) {
    return applyFailedState(
      input,
      error instanceof Error
        ? error.message
        : "Vision processing failed.",
    );
  }
}

async function processSingleFile(
  input: AIOSInputItem,
  file: File,
): Promise<AIOSInputItem> {
  const mimeType =
    (
      file.type ||
      input.metadata
        .mimeType ||
      "application/octet-stream"
    ).toLowerCase();

  if (
    isTextMimeType(
      mimeType,
    )
  ) {
    try {
      const text =
        await file.text();

      return applyReadyState(
        input,
        text,
      );
    } catch {
      return applyFailedState(
        input,
        "Text file could not be decoded.",
      );
    }
  }

  if (
    isImageMimeType(
      mimeType,
    )
  ) {
    const isVideoFrameSheet =
      input.kind ===
        "video" ||
      Boolean(
        input.metadata.name?.endsWith(
          ".frames.jpg",
        ),
      );

    return analyzeImage(
      input,
      file,
      isVideoFrameSheet,
    );
  }

  if (
    isVideoMimeType(
      mimeType,
    )
  ) {
    /*
     * The browser Input Picker creates a
     * bounded contact sheet before this
     * server-side processing stage.
     *
     * If the original video reaches this
     * layer without a derived frame sheet,
     * do not pretend that raw video bytes
     * were semantically understood.
     */
    return applyPendingState(
      input,
      "Uploaded video was received, but no derived frame evidence was provided for Vision analysis.",
    );
  }

  if (
    mimeType ===
    PDF_MIME_TYPE
  ) {
    return applyPendingState(
      input,
      "PDF parsing is not enabled in C164.8 yet.",
    );
  }

  return applyPendingState(
    input,
    "This file type is accepted by AIOS Input Foundation but does not have a document parser enabled in C164.8.",
  );
}

export async function processAIOSInputUnderstanding(
  inputs: AIOSInputItem[],
  files: AIOSInputUnderstandingFile[],
): Promise<AIOSInputUnderstandingResult> {
  const generatedAt =
    new Date().toISOString();

  if (
    !Array.isArray(
      inputs,
    ) ||
    inputs.length ===
      0
  ) {
    return {
      success: false,

      code:
        "C164_7_INPUT_UNDERSTANDING_REJECTED",

      inputs: [],

      understoodCount: 0,

      pendingCount: 0,

      failedCount: 0,

      limitations: [
        "No AIOS inputs were provided.",
      ],

      safetyBoundary: {
        plannerDispatched:
          false,

        tradingExecuted:
          false,
      },

      generatedAt,
    };
  }

  if (
    inputs.length >
    MAX_INPUTS
  ) {
    return {
      success: false,

      code:
        "C164_7_INPUT_UNDERSTANDING_REJECTED",

      inputs,

      understoodCount: 0,

      pendingCount: 0,

      failedCount: 0,

      limitations: [
        `A maximum of ${MAX_INPUTS} inputs can be processed in one request.`,
      ],

      safetyBoundary: {
        plannerDispatched:
          false,

        tradingExecuted:
          false,
      },

      generatedAt,
    };
  }

  const fileMap =
    new Map<
      string,
      File
    >();

  for (
    const entry of files
  ) {
    if (
      !entry ||
      typeof entry.inputId !==
        "string" ||
      !entry.inputId.trim()
    ) {
      continue;
    }

    if (
      typeof File !==
        "undefined" &&
      entry.file instanceof File
    ) {
      fileMap.set(
        entry.inputId,
        entry.file,
      );
    }
  }

  const processedInputs:
    AIOSInputItem[] =
    [];

  for (
    const input of inputs
  ) {
    const file =
      fileMap.get(
        input.id,
      );

    if (!file) {
      processedInputs.push(
        applyPendingState(
          input,
          "No server-side uploaded File was mapped to this input.",
        ),
      );

      continue;
    }

    const validationError =
      validateFile({
        inputId:
          input.id,

        file,
      });

    if (
      validationError
    ) {
      processedInputs.push(
        applyFailedState(
          input,
          validationError,
        ),
      );

      continue;
    }

    const processed =
      await processSingleFile(
        input,
        file,
      );

    processedInputs.push(
      processed,
    );
  }

  const understoodCount =
    processedInputs.filter(
      (
        input,
      ) =>
        input.processingStatus ===
        "ready",
    ).length;

  const pendingCount =
    processedInputs.filter(
      (
        input,
      ) =>
        input.processingStatus ===
        "pending",
    ).length;

  const failedCount =
    processedInputs.filter(
      (
        input,
      ) =>
        input.processingStatus ===
        "failed",
    ).length;

  const limitations = [
    "C164.8 supports transient server-side processing for plain text, CSV, and JSON.",
    "C164.8 supports OpenAI Vision processing for uploaded images.",
    "Uploaded videos are sampled into bounded browser-generated frame sheets before Vision processing.",
    "Video frame evidence is limited to five sampled frames per uploaded video.",
    "Image analysis may include OCR of text visibly present in the supplied image.",
    "PDF parsing is not enabled yet.",
    "DOC, DOCX, XLS, and XLSX parsing are not enabled yet.",
    "No uploaded file is persisted by this runtime.",
    "Vision output is evidence from the supplied input and is not a guarantee of factual correctness.",
    "Planner dispatch and trading execution remain disabled.",
  ];

  const success =
    failedCount ===
    0 &&
    pendingCount ===
      0;

  return {
    success,

    code:
      success
        ? "C164_7_INPUT_UNDERSTANDING_COMPLETED"
        : failedCount ===
              0
          ? "C164_7_INPUT_UNDERSTANDING_PARTIAL"
          : "C164_7_INPUT_UNDERSTANDING_PARTIAL",

    inputs:
      processedInputs,

    understoodCount,

    pendingCount,

    failedCount,

    limitations,

    safetyBoundary: {
      plannerDispatched:
        false,

      tradingExecuted:
        false,
    },

    generatedAt,
  };
}
