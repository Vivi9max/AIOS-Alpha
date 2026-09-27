import type {
  AIOSInputItem,
  AIOSInputRequest,
  AIOSInputResult,
} from "@/lib/runtime/input/aios-input-types";
const MAX_INPUTS = 8;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);
const SUPPORTED_FILE_TYPES = new Set<string>([
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
]);
function normalizeInput(input: AIOSInputItem): AIOSInputItem {
  const metadata = input.metadata;
  const normalizedMimeType =
    typeof metadata?.mimeType === "string" &&
    metadata.mimeType.trim().length > 0
      ? metadata.mimeType.trim()
      : "application/octet-stream";
  const normalizedName =
    typeof metadata?.name === "string" &&
    metadata.name.trim().length > 0
      ? metadata.name.trim()
      : null;
  const normalizedSize =
    typeof metadata?.sizeBytes === "number" &&
    Number.isFinite(metadata.sizeBytes) &&
    metadata.sizeBytes >= 0
      ? metadata.sizeBytes
      : null;
  const normalizedLastModified =
    typeof metadata?.lastModifiedAt === "string"
      ? metadata.lastModifiedAt
      : null;
  const normalizedSource = metadata?.source ?? "unknown";
  const normalizedLocalReference =
    typeof input.localReference === "string"
      ? input.localReference
      : null;
  const normalizedExtractedText =
    typeof input.extractedText === "string"
      ? input.extractedText
      : null;
  const normalizedProcessingError =
    typeof input.processingError === "string"
      ? input.processingError
      : null;
  const normalizedId =
    typeof input.id === "string" &&
    input.id.trim().length > 0
      ? input.id.trim()
      : `aios-input-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;
  return {
    ...input,
    id: normalizedId,
    metadata: {
      ...metadata,
      name: normalizedName,
      mimeType: normalizedMimeType,
      sizeBytes: normalizedSize,
      lastModifiedAt: normalizedLastModified,
      source: normalizedSource,
    },
    localReference: normalizedLocalReference,
    extractedText: normalizedExtractedText,
    processingStatus:
      input.processingStatus === "pending" ||
      input.processingStatus === "ready" ||
      input.processingStatus === "failed"
        ? input.processingStatus
        : "ready",
    processingError: normalizedProcessingError,
  };
}
function validateInput(
  input: AIOSInputItem,
): string | null {
  const mimeType = input.metadata.mimeType;
  const sizeBytes = input.metadata.sizeBytes;
  if (input.kind === "image") {
    if (!SUPPORTED_IMAGE_TYPES.has(mimeType)) {
      return `Unsupported image type: ${mimeType}`;
    }
    if (
      sizeBytes !== null &&
      sizeBytes > MAX_IMAGE_BYTES
    ) {
      return "Image exceeds the 20 MB input limit.";
    }
    return null;
  }
  if (input.kind === "file") {
    const supportedFile =
      SUPPORTED_FILE_TYPES.has(mimeType);
    const supportedImage =
      mimeType.startsWith("image/");
    if (!supportedFile && !supportedImage) {
      return `Unsupported file type: ${mimeType}`;
    }
    if (
      sizeBytes !== null &&
      sizeBytes > MAX_FILE_BYTES
    ) {
      return "File exceeds the 25 MB input limit.";
    }
    return null;
  }
  if (input.kind === "text") {
    return null;
  }
  return "Unsupported AIOS input kind.";
}
export function prepareAIOSInputRequest(
  request: AIOSInputRequest,
): AIOSInputRequest {
  const sourceInputs = Array.isArray(request.inputs)
    ? request.inputs
    : [];
  const normalizedInputs = sourceInputs
    .slice(0, MAX_INPUTS)
    .map(normalizeInput);
  return {
    inputs: normalizedInputs,
    prompt:
      typeof request.prompt === "string"
        ? request.prompt.trim() || null
        : null,
    sessionId:
      typeof request.sessionId === "string"
        ? request.sessionId.trim() || null
        : null,
  };
}
export function processAIOSInputs(
  request: AIOSInputRequest,
): AIOSInputResult {
  const normalizedRequest =
    prepareAIOSInputRequest(request);
  const accepted: AIOSInputItem[] = [];
  const rejected: AIOSInputItem[] = [];
  const limitations: string[] = [];
  const originalInputCount = Array.isArray(
    request.inputs,
  )
    ? request.inputs.length
    : 0;
  if (originalInputCount > MAX_INPUTS) {
    limitations.push(
      `Only the first ${MAX_INPUTS} inputs were accepted.`,
    );
  }
  for (const input of normalizedRequest.inputs) {
    const validationError =
      validateInput(input);
    if (validationError !== null) {
      rejected.push({
        ...input,
        processingStatus: "failed",
        processingError: validationError,
      });
      continue;
    }
    accepted.push({
      ...input,
      processingStatus: "ready",
      processingError: null,
    });
  }
  if (accepted.length > 0) {
    limitations.push(
      "Input metadata was accepted by the Runtime Input Foundation.",
    );
  }
  const containsImage = accepted.some(
    (item) => item.kind === "image",
  );
  if (containsImage) {
    limitations.push(
      "Image bytes are not yet sent to a vision model.",
    );
  }
  const containsFile = accepted.some(
    (item) => item.kind === "file",
  );
  if (containsFile) {
    limitations.push(
      "Document parsing and OCR are not yet executed by this foundation layer.",
    );
  }
  limitations.push(
    "No model inference, Planner dispatch, recommendation, or trading execution is performed by this layer.",
  );
  const rejectedCount = rejected.length;
  const acceptedCount = accepted.length;
  let code: AIOSInputResult["code"];
  if (acceptedCount === 0 && rejectedCount > 0) {
    code = "AIOS_INPUT_REJECTED";
  } else if (rejectedCount > 0) {
    code = "AIOS_INPUT_PARTIAL";
  } else {
    code = "AIOS_INPUT_ACCEPTED";
  }
  return {
    success: rejectedCount === 0,
    code,
    inputs: [
      ...accepted,
      ...rejected,
    ],
    acceptedCount,
    rejectedCount,
    limitations,
    safetyBoundary: {
      modelExecution: false,
      plannerDispatched: false,
      tradingExecuted: false,
    },
    generatedAt: new Date().toISOString(),
  };
}
