import type {
AIOSInputItem,
AIOSInputRequest,
AIOSInputResult,
} from “@/lib/runtime/input/aios-input-types”;

const MAX_INPUTS = 8;

const MAX_IMAGE_BYTES =
20 * 1024 * 1024;

const MAX_FILE_BYTES =
25 * 1024 * 1024;

const SUPPORTED_IMAGE_TYPES =
new Set([
“image/jpeg”,
“image/png”,
“image/webp”,
“image/heic”,
]);

const SUPPORTED_FILE_TYPES =
new Set([
“application/pdf”,
“text/plain”,
“text/csv”,
“application/json”,
“application/msword”,
“application/vnd.ms-excel”,
“application/vnd.openxmlformats-officedocument.wordprocessingml.document”,
“application/vnd.openxmlformats-officedocument.spreadsheetml.sheet”,
“application/octet-stream”,
]);

function normalizeInput(
input: AIOSInputItem,
): AIOSInputItem {
return {
…input,
id:
typeof input.id === “string” &&
input.id.trim()
? input.id.trim()
: aios-input-${Date.now()},

metadata: {
  ...input.metadata,
  name:
    typeof input.metadata.name ===
      "string" &&
    input.metadata.name.trim()
      ? input.metadata.name.trim()
      : null,
  mimeType:
    typeof input.metadata.mimeType ===
      "string" &&
    input.metadata.mimeType.trim()
      ? input.metadata.mimeType.trim()
      : "application/octet-stream",
  sizeBytes:
    typeof input.metadata.sizeBytes ===
      "number" &&
    Number.isFinite(
      input.metadata.sizeBytes,
    ) &&
    input.metadata.sizeBytes >= 0
      ? input.metadata.sizeBytes
      : null,
  lastModifiedAt:
    typeof input.metadata
      .lastModifiedAt === "string"
      ? input.metadata
          .lastModifiedAt
      : null,
  source:
    input.metadata.source ??
    "unknown",
},
localReference:
  typeof input.localReference ===
    "string"
    ? input.localReference
    : null,
extractedText:
  typeof input.extractedText ===
    "string"
    ? input.extractedText
    : null,
processingStatus:
  input.processingStatus ??
  "ready",
processingError:
  typeof input.processingError ===
    "string"
    ? input.processingError
    : null,

};
}

function validateInput(
input: AIOSInputItem,
): string | null {
const mimeType =
input.metadata.mimeType;

const sizeBytes =
input.metadata.sizeBytes;

if (
input.kind === “image”
) {
if (
!SUPPORTED_IMAGE_TYPES.has(
mimeType,
)
) {
return Unsupported image type: ${mimeType};
}

if (
  sizeBytes !== null &&
  sizeBytes >
    MAX_IMAGE_BYTES
) {
  return "Image exceeds the 20 MB input limit.";
}
return null;

}

if (
input.kind === “file”
) {
if (
!SUPPORTED_FILE_TYPES.has(
mimeType,
) &&
!mimeType.startsWith(
“image/”,
)
) {
return Unsupported file type: ${mimeType};
}

if (
  sizeBytes !== null &&
  sizeBytes >
    MAX_FILE_BYTES
) {
  return "File exceeds the 25 MB input limit.";
}
return null;

}

if (
input.kind === “text”
) {
return null;
}

return “Unsupported AIOS input kind.”;
}

export function prepareAIOSInputRequest(
request: AIOSInputRequest,
): AIOSInputRequest {
const normalized =
Array.isArray(request.inputs)
? request.inputs
.slice(0, MAX_INPUTS)
.map(normalizeInput)
: [];

return {
inputs: normalized,
prompt:
typeof request.prompt ===
“string”
? request.prompt.trim() ||
null
: null,
sessionId:
typeof request.sessionId ===
“string”
? request.sessionId.trim() ||
null
: null,
};
}

export function processAIOSInputs(
request: AIOSInputRequest,
): AIOSInputResult {
const normalized =
prepareAIOSInputRequest(
request,
);

const accepted: AIOSInputItem[] =
[];

const rejected: AIOSInputItem[] =
[];

const limitations: string[] =
[];

if (
request.inputs.length >
MAX_INPUTS
) {
limitations.push(
Only the first ${MAX_INPUTS} inputs were accepted.,
);
}

for (const input of normalized.inputs) {
const error =
validateInput(input);

if (error) {
  rejected.push({
    ...input,
    processingStatus:
      "failed",
    processingError:
      error,
  });
  continue;
}
accepted.push({
  ...input,
  processingStatus:
    "ready",
  processingError:
    null,
});

}

if (accepted.length > 0) {
limitations.push(
“Input metadata was accepted by the Runtime Input Foundation.”,
);
}

if (
accepted.some(
(item) =>
item.kind === “image”,
)
) {
limitations.push(
“Image bytes are not yet sent to a vision model.”,
);
}

if (
accepted.some(
(item) =>
item.kind === “file”,
)
) {
limitations.push(
“Document parsing and OCR are not yet executed by this foundation layer.”,
);
}

limitations.push(
“No model inference, Planner dispatch, recommendation, or trading execution is performed by this layer.”,
);

const success =
rejected.length === 0;

return {
success,

code:
  accepted.length === 0 &&
  rejected.length > 0
    ? "AIOS_INPUT_REJECTED"
    : rejected.length > 0
      ? "AIOS_INPUT_PARTIAL"
      : "AIOS_INPUT_ACCEPTED",
inputs: [
  ...accepted,
  ...rejected,
],
acceptedCount:
  accepted.length,
rejectedCount:
  rejected.length,
limitations,
safetyBoundary: {
  modelExecution: false,
  plannerDispatched: false,
  tradingExecuted: false,
},
generatedAt:
  new Date().toISOString(),

};
}
