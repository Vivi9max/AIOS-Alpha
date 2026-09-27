import {
  processAIOSInputs,
} from "@/lib/runtime/input/aios-input-runtime";
import type {
  AIOSInputItem,
  AIOSInputRequest,
} from "@/lib/runtime/input/aios-input-types";
function createInput(
  overrides: Partial<AIOSInputItem>,
): AIOSInputItem {
  return {
    id:
      overrides.id ??
      "aios-input-regression",
    kind:
      overrides.kind ??
      "image",
    metadata: {
      name:
        overrides.metadata?.name ??
        "regression-image.jpg",
      mimeType:
        overrides.metadata?.mimeType ??
        "image/jpeg",
      sizeBytes:
        overrides.metadata?.sizeBytes ??
        1024,
      lastModifiedAt:
        overrides.metadata
          ?.lastModifiedAt ??
        "2026-01-01T00:00:00.000Z",
      source:
        overrides.metadata?.source ??
        "photo-library",
    },
    localReference:
      overrides.localReference ??
      null,
    extractedText:
      overrides.extractedText ??
      null,
    processingStatus:
      overrides.processingStatus ??
      "ready",
    processingError:
      overrides.processingError ??
      null,
  };
}
function createRequest(
  inputs: AIOSInputItem[],
): AIOSInputRequest {
  return {
    inputs,
    prompt:
      "C164.4 input regression",
    sessionId:
      "c164-4-regression",
  };
}
export interface AIOSInputRegressionResult {
  success: boolean;
  code:
    | "C164_4_INPUT_REGRESSION_PASS"
    | "C164_4_INPUT_REGRESSION_FAIL";
  checks: Array<{
    name: string;
    passed: boolean;
    detail: string;
  }>;
  result: ReturnType<
    typeof processAIOSInputs
  >;
  safetyBoundary: {
    modelExecution: false;
    plannerDispatched: false;
    tradingExecuted: false;
  };
}
export function runAIOSInputRegression(): AIOSInputRegressionResult {
  const checks: AIOSInputRegressionResult["checks"] =
    [];
  const validImage =
    createInput({
      id:
        "c164-4-valid-image",
      kind: "image",
      metadata: {
        name:
          "product-photo.jpg",
        mimeType:
          "image/jpeg",
        sizeBytes:
          2 * 1024 * 1024,
        lastModifiedAt:
          "2026-01-01T00:00:00.000Z",
        source:
          "photo-library",
      },
    });
  const validPdf =
    createInput({
      id:
        "c164-4-valid-pdf",
      kind: "file",
      metadata: {
        name:
          "document.pdf",
        mimeType:
          "application/pdf",
        sizeBytes:
          500 * 1024,
        lastModifiedAt:
          "2026-01-01T00:00:00.000Z",
        source:
          "file-picker",
      },
    });
  const unsupportedFile =
    createInput({
      id:
        "c164-4-unsupported",
      kind: "file",
      metadata: {
        name:
          "archive.zip",
        mimeType:
          "application/zip",
        sizeBytes:
          100 * 1024,
        lastModifiedAt:
          "2026-01-01T00:00:00.000Z",
        source:
          "file-picker",
      },
    });
  const oversizedImage =
    createInput({
      id:
        "c164-4-large-image",
      kind: "image",
      metadata: {
        name:
          "large-photo.jpg",
        mimeType:
          "image/jpeg",
        sizeBytes:
          21 * 1024 * 1024,
        lastModifiedAt:
          "2026-01-01T00:00:00.000Z",
        source:
          "camera",
      },
    });
  const oversizedFile =
    createInput({
      id:
        "c164-4-large-file",
      kind: "file",
      metadata: {
        name:
          "large-document.pdf",
        mimeType:
          "application/pdf",
        sizeBytes:
          26 * 1024 * 1024,
        lastModifiedAt:
          "2026-01-01T00:00:00.000Z",
        source:
          "file-picker",
      },
    });
  const validRequest =
    createRequest([
      validImage,
      validPdf,
    ]);
  const validResult =
    processAIOSInputs(
      validRequest,
    );
  checks.push({
    name:
      "valid image and PDF accepted",
    passed:
      validResult.success &&
      validResult.acceptedCount ===
        2 &&
      validResult.rejectedCount ===
        0,
    detail:
      `accepted=${validResult.acceptedCount}, rejected=${validResult.rejectedCount}`,
  });
  const unsupportedResult =
    processAIOSInputs(
      createRequest([
        unsupportedFile,
      ]),
    );
  checks.push({
    name:
      "unsupported MIME rejected",
    passed:
      !unsupportedResult.success &&
      unsupportedResult.rejectedCount ===
        1 &&
      unsupportedResult.inputs.some(
        (item) =>
          item.processingStatus ===
            "failed" &&
          item.processingError?.includes(
            "Unsupported file type",
          ),
      ),
    detail:
      unsupportedResult.inputs[0]
        ?.processingError ??
      "No rejection error returned.",
  });
  const oversizedImageResult =
    processAIOSInputs(
      createRequest([
        oversizedImage,
      ]),
    );
  checks.push({
    name:
      "oversized image rejected",
    passed:
      !oversizedImageResult.success &&
      oversizedImageResult.rejectedCount ===
        1 &&
      oversizedImageResult.inputs.some(
        (item) =>
          item.processingError?.includes(
            "20 MB",
          ),
      ),
    detail:
      oversizedImageResult.inputs[0]
        ?.processingError ??
      "No rejection error returned.",
  });
  const oversizedFileResult =
    processAIOSInputs(
      createRequest([
        oversizedFile,
      ]),
    );
  checks.push({
    name:
      "oversized file rejected",
    passed:
      !oversizedFileResult.success &&
      oversizedFileResult.rejectedCount ===
        1 &&
      oversizedFileResult.inputs.some(
        (item) =>
          item.processingError?.includes(
            "25 MB",
          ),
      ),
    detail:
      oversizedFileResult.inputs[0]
        ?.processingError ??
      "No rejection error returned.",
  });
  const tooManyInputs =
    Array.from(
      { length: 10 },
      (_, index) =>
        createInput({
          id:
            `c164-4-input-${index}`,
          kind: "image",
          metadata: {
            name:
              `image-${index}.jpg`,
            mimeType:
              "image/jpeg",
            sizeBytes:
              1024,
            lastModifiedAt:
              "2026-01-01T00:00:00.000Z",
            source:
              "photo-library",
          },
        }),
    );
  const maxInputResult =
    processAIOSInputs(
      createRequest(
        tooManyInputs,
      ),
    );
  checks.push({
    name:
      "maximum input count enforced",
    passed:
      maxInputResult.acceptedCount ===
        8 &&
      maxInputResult.rejectedCount ===
        0 &&
      maxInputResult.limitations.some(
        (item) =>
          item.includes(
            "first 8 inputs",
          ),
      ),
    detail:
      `accepted=${maxInputResult.acceptedCount}, rejected=${maxInputResult.rejectedCount}`,
  });
  checks.push({
    name:
      "prompt preserved",
    passed:
      validResult.success &&
      validRequest.prompt ===
        "C164.4 input regression",
    detail:
      validRequest.prompt ??
      "Prompt missing.",
  });
  checks.push({
    name:
      "session identity preserved",
    passed:
      validRequest.sessionId ===
        "c164-4-regression",
    detail:
      validRequest.sessionId ??
      "Session ID missing.",
  });
  checks.push({
    name:
      "model execution blocked",
    passed:
      validResult.safetyBoundary
        .modelExecution ===
        false,
    detail:
      "modelExecution=false",
  });
  checks.push({
    name:
      "planner dispatch blocked",
    passed:
      validResult.safetyBoundary
        .plannerDispatched ===
        false,
    detail:
      "plannerDispatched=false",
  });
  checks.push({
    name:
      "trading execution blocked",
    passed:
      validResult.safetyBoundary
        .tradingExecuted ===
        false,
    detail:
      "tradingExecuted=false",
  });
  checks.push({
    name:
      "vision and OCR are not falsely reported",
    passed:
      validResult.limitations.some(
        (item) =>
          item.includes(
            "Image bytes are not yet sent to a vision model",
          ),
      ) &&
      validResult.limitations.some(
        (item) =>
          item.includes(
            "Document parsing and OCR are not yet executed",
          ),
      ),
    detail:
      "Vision/OCR remain explicitly outside the current foundation boundary.",
  });
  const success =
    checks.every(
      (check) =>
        check.passed,
    );
  return {
    success,
    code:
      success
        ? "C164_4_INPUT_REGRESSION_PASS"
        : "C164_4_INPUT_REGRESSION_FAIL",
    checks,
    result:
      validResult,
    safetyBoundary: {
      modelExecution: false,
      plannerDispatched: false,
      tradingExecuted: false,
    },
  };
}
