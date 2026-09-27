import type {
  AIOSInputItem,
  AIOSInputResult,
} from "./aios-input-types";

export interface AIOSInputProcessingFile {
  inputId: string;
  file: File;
}

export interface AIOSInputProcessingResult {
  success: boolean;
  code:
    | "AIOS_INPUT_PROCESSING_COMPLETED"
    | "AIOS_INPUT_PROCESSING_PARTIAL"
    | "AIOS_INPUT_PROCESSING_REJECTED";
  inputs: AIOSInputItem[];
  processedCount: number;
  pendingCount: number;
  failedCount: number;
  limitations: string[];
  safetyBoundary: {
    modelExecution: false;
    plannerDispatched: false;
    tradingExecuted: false;
  };
  generatedAt: string;
}

const MAX_INPUTS = 8;

const MAX_TEXT_BYTES =
  25 * 1024 * 1024;

const TEXT_MIME_TYPES =
  new Set<string>([
    "text/plain",
    "text/csv",
    "application/json",
  ]);

const IMAGE_MIME_PREFIX =
  "image/";

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

function decodeTextFile(
  file: File,
): Promise<string> {
  return file.text();
}

function validateProcessingFile(
  entry: AIOSInputProcessingFile,
): string | null {
  if (
    !entry ||
    typeof entry !== "object"
  ) {
    return "Invalid processing file entry.";
  }

  if (
    typeof entry.inputId !==
      "string" ||
    !entry.inputId.trim()
  ) {
    return "Invalid input id.";
  }

  if (
    typeof File === "undefined" ||
    !(entry.file instanceof File)
  ) {
    return "Invalid uploaded file.";
  }

  if (
    entry.file.size >
    MAX_TEXT_BYTES
  ) {
    return "Uploaded file exceeds the processing size limit.";
  }

  return null;
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

async function processSingleFile(
  input: AIOSInputItem,
  file: File,
): Promise<AIOSInputItem> {
  const mimeType =
    input.metadata.mimeType ||
    file.type ||
    "application/octet-stream";

  if (
    isTextMimeType(
      mimeType,
    )
  ) {
    try {
      const text =
        await decodeTextFile(
          file,
        );

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
    mimeType ===
    PDF_MIME_TYPE
  ) {
    return applyPendingState(
      input,
      "PDF parsing is not enabled in C164.6 yet.",
    );
  }

  if (
    mimeType.startsWith(
      IMAGE_MIME_PREFIX,
    )
  ) {
    return applyPendingState(
      input,
      "Vision and OCR processing are not enabled in C164.6 yet.",
    );
  }

  return applyPendingState(
    input,
    "This file type is accepted by the Input Foundation but has no parser in C164.6 yet.",
  );
}

export async function processAIOSUploadedFiles(
  inputs: AIOSInputItem[],
  files: AIOSInputProcessingFile[],
): Promise<AIOSInputProcessingResult> {
  const generatedAt =
    new Date().toISOString();

  if (
    !Array.isArray(inputs) ||
    inputs.length === 0
  ) {
    return {
      success: false,
      code:
        "AIOS_INPUT_PROCESSING_REJECTED",
      inputs: [],
      processedCount: 0,
      pendingCount: 0,
      failedCount: 0,
      limitations: [
        "No AIOS inputs were provided.",
      ],
      safetyBoundary: {
        modelExecution: false,
        plannerDispatched: false,
        tradingExecuted: false,
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
        "AIOS_INPUT_PROCESSING_REJECTED",
      inputs,
      processedCount: 0,
      pendingCount: 0,
      failedCount: 0,
      limitations: [
        `A maximum of ${MAX_INPUTS} inputs can be processed in one request.`,
      ],
      safetyBoundary: {
        modelExecution: false,
        plannerDispatched: false,
        tradingExecuted: false,
      },
      generatedAt,
    };
  }

  const fileMap =
    new Map<
      string,
      File
    >();

  for (const entry of files) {
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

  const processedInputs: AIOSInputItem[] =
    [];

  for (const input of inputs) {
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
      validateProcessingFile({
        inputId:
          input.id,
        file,
      });

    if (validationError) {
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

  const processedCount =
    processedInputs.filter(
      (input) =>
        input.processingStatus ===
        "ready",
    ).length;

  const pendingCount =
    processedInputs.filter(
      (input) =>
        input.processingStatus ===
        "pending",
    ).length;

  const failedCount =
    processedInputs.filter(
      (input) =>
        input.processingStatus ===
        "failed",
    ).length;

  const limitations: string[] =
    [
      "C164.6 performs server-side processing only for plain text, CSV, and JSON files.",
      "PDF parsing is not enabled yet.",
      "Image Vision and OCR are not enabled yet.",
      "DOC, DOCX, XLS, and XLSX parsing are not enabled yet.",
      "Processed file content is transient and is not persisted by this runtime.",
      "No model execution is performed by this processor.",
      "Planner dispatch and trading execution remain disabled.",
    ];

  const success =
    failedCount === 0;

  return {
    success,
    code:
      success &&
      pendingCount === 0
        ? "AIOS_INPUT_PROCESSING_COMPLETED"
        : failedCount > 0
          ? "AIOS_INPUT_PROCESSING_PARTIAL"
          : "AIOS_INPUT_PROCESSING_PARTIAL",
    inputs:
      processedInputs,
    processedCount,
    pendingCount,
    failedCount,
    limitations,
    safetyBoundary: {
      modelExecution: false,
      plannerDispatched: false,
      tradingExecuted: false,
    },
    generatedAt,
  };
}

export function mergeAIOSInputProcessingResult(
  baseResult: AIOSInputResult,
  processingResult: AIOSInputProcessingResult,
): AIOSInputResult {
  return {
    ...baseResult,
    inputs:
      processingResult.inputs,
    limitations: Array.from(
      new Set([
        ...baseResult.limitations,
        ...processingResult.limitations,
      ]),
    ),
    safetyBoundary: {
      modelExecution: false,
      plannerDispatched: false,
      tradingExecuted: false,
    },
  };
}
