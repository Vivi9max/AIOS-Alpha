import {
  processAIOSUploadedFiles,
} from "@/lib/runtime/input/aios-input-processing-runtime";
import type {
  AIOSInputItem,
} from "@/lib/runtime/input/aios-input-types";
function createInput(
  overrides: Partial<AIOSInputItem>,
): AIOSInputItem {
  return {
    id:
      overrides.id ??
      "c164-6-processing-input",
    kind:
      overrides.kind ??
      "file",
    metadata: {
      name:
        overrides.metadata?.name ??
        "regression.txt",
      mimeType:
        overrides.metadata?.mimeType ??
        "text/plain",
      sizeBytes:
        overrides.metadata?.sizeBytes ??
        64,
      lastModifiedAt:
        overrides.metadata
          ?.lastModifiedAt ??
        "2026-01-01T00:00:00.000Z",
      source:
        overrides.metadata?.source ??
        "file-picker",
    },
    localReference:
      overrides.localReference ??
      null,
    extractedText:
      overrides.extractedText ??
      null,
    processingStatus:
      overrides.processingStatus ??
      "pending",
    processingError:
      overrides.processingError ??
      null,
  };
}
function createFile(
  name: string,
  type: string,
  content: string,
): File {
  return new File(
    [content],
    name,
    {
      type,
      lastModified:
        Date.parse(
          "2026-01-01T00:00:00.000Z",
        ),
    },
  );
}
export interface AIOSInputProcessingRegressionResult {
  success: boolean;
  code:
    | "C164_6_2_PROCESSING_REGRESSION_PASS"
    | "C164_6_2_PROCESSING_REGRESSION_FAIL";
  checks: Array<{
    name: string;
    passed: boolean;
    detail: string;
  }>;
  safetyBoundary: {
    modelExecution: false;
    plannerDispatched: false;
    tradingExecuted: false;
  };
}
export async function runAIOSInputProcessingRegression(): Promise<AIOSInputProcessingRegressionResult> {
  const checks:
    AIOSInputProcessingRegressionResult["checks"] =
    [];
  const textContent =
    [
      "AIOS C164.6.2 regression",
      "Input processing runtime",
      "Revenue: 1000",
    ].join("\n");
  const textInput =
    createInput({
      id:
        "c164-6-2-text",
      kind:
        "file",
      metadata: {
        name:
          "regression.txt",
        mimeType:
          "text/plain",
        sizeBytes:
          textContent.length,
        lastModifiedAt:
          "2026-01-01T00:00:00.000Z",
        source:
          "file-picker",
      },
    });
  const textFile =
    createFile(
      "regression.txt",
      "text/plain",
      textContent,
    );
  const textResult =
    await processAIOSUploadedFiles(
      [textInput],
      [
        {
          inputId:
            textInput.id,
          file:
            textFile,
        },
      ],
    );
  checks.push({
    name:
      "plain text file processed",
    passed:
      textResult.success &&
      textResult.processedCount ===
        1 &&
      textResult.pendingCount ===
        0 &&
      textResult.failedCount ===
        0,
    detail:
      `processed=${textResult.processedCount}, pending=${textResult.pendingCount}, failed=${textResult.failedCount}`,
  });
  checks.push({
    name:
      "plain text extracted",
    passed:
      textResult.inputs[0]
        ?.processingStatus ===
        "ready" &&
      textResult.inputs[0]
        ?.extractedText ===
        textContent,
    detail:
      textResult.inputs[0]
        ?.extractedText ??
      "No extracted text.",
  });
  const csvContent =
    [
      "symbol,price",
      "NVDA,222.53",
      "0700.HK,",
    ].join("\n");
  const csvInput =
    createInput({
      id:
        "c164-6-2-csv",
      kind:
        "file",
      metadata: {
        name:
          "market.csv",
        mimeType:
          "text/csv",
        sizeBytes:
          csvContent.length,
        lastModifiedAt:
          "2026-01-01T00:00:00.000Z",
        source:
          "file-picker",
      },
    });
  const csvFile =
    createFile(
      "market.csv",
      "text/csv",
      csvContent,
    );
  const csvResult =
    await processAIOSUploadedFiles(
      [csvInput],
      [
        {
          inputId:
            csvInput.id,
          file:
            csvFile,
        },
      ],
    );
  checks.push({
    name:
      "CSV file processed",
    passed:
      csvResult.success &&
      csvResult.processedCount ===
        1 &&
      csvResult.inputs[0]
        ?.processingStatus ===
        "ready",
    detail:
      csvResult.inputs[0]
        ?.extractedText ??
      "CSV extraction missing.",
  });
  const jsonContent =
    JSON.stringify(
      {
        module:
          "C164.6.2",
        status:
          "regression",
        valid:
          true,
      },
    );
  const jsonInput =
    createInput({
      id:
        "c164-6-2-json",
      kind:
        "file",
      metadata: {
        name:
          "runtime.json",
        mimeType:
          "application/json",
        sizeBytes:
          jsonContent.length,
        lastModifiedAt:
          "2026-01-01T00:00:00.000Z",
        source:
          "file-picker",
      },
    });
  const jsonFile =
    createFile(
      "runtime.json",
      "application/json",
      jsonContent,
    );
  const jsonResult =
    await processAIOSUploadedFiles(
      [jsonInput],
      [
        {
          inputId:
            jsonInput.id,
          file:
            jsonFile,
        },
      ],
    );
  checks.push({
    name:
      "JSON file processed",
    passed:
      jsonResult.success &&
      jsonResult.processedCount ===
        1 &&
      jsonResult.inputs[0]
        ?.processingStatus ===
        "ready" &&
      jsonResult.inputs[0]
        ?.extractedText ===
        jsonContent,
    detail:
      jsonResult.inputs[0]
        ?.extractedText ??
      "JSON extraction missing.",
  });
  const imageInput =
    createInput({
      id:
        "c164-6-2-image",
      kind:
        "image",
      metadata: {
        name:
          "photo.jpg",
        mimeType:
          "image/jpeg",
        sizeBytes:
          1024,
        lastModifiedAt:
          "2026-01-01T00:00:00.000Z",
        source:
          "photo-library",
      },
    });
  const imageFile =
    createFile(
      "photo.jpg",
      "image/jpeg",
      "not-real-image-data",
    );
  const imageResult =
    await processAIOSUploadedFiles(
      [imageInput],
      [
        {
          inputId:
            imageInput.id,
          file:
            imageFile,
        },
      ],
    );
  checks.push({
    name:
      "image remains pending without Vision",
    passed:
      imageResult.inputs[0]
        ?.processingStatus ===
        "pending" &&
      imageResult.inputs[0]
        ?.processingError?.includes(
          "Vision and OCR",
        ) === true,
    detail:
      imageResult.inputs[0]
        ?.processingError ??
      "Vision boundary was not reported.",
  });
  const pdfInput =
    createInput({
      id:
        "c164-6-2-pdf",
      kind:
        "file",
      metadata: {
        name:
          "document.pdf",
        mimeType:
          "application/pdf",
        sizeBytes:
          1024,
        lastModifiedAt:
          "2026-01-01T00:00:00.000Z",
        source:
          "file-picker",
      },
    });
  const pdfFile =
    createFile(
      "document.pdf",
      "application/pdf",
      "not-real-pdf-data",
    );
  const pdfResult =
    await processAIOSUploadedFiles(
      [pdfInput],
      [
        {
          inputId:
            pdfInput.id,
          file:
            pdfFile,
        },
      ],
    );
  checks.push({
    name:
      "PDF remains pending without parser",
    passed:
      pdfResult.inputs[0]
        ?.processingStatus ===
        "pending" &&
      pdfResult.inputs[0]
        ?.processingError?.includes(
          "PDF parsing is not enabled",
        ) === true,
    detail:
      pdfResult.inputs[0]
        ?.processingError ??
      "PDF parser boundary was not reported.",
  });
  const missingFileInput =
    createInput({
      id:
        "c164-6-2-missing-file",
      kind:
        "file",
    });
  const missingFileResult =
    await processAIOSUploadedFiles(
      [missingFileInput],
      [],
    );
  checks.push({
    name:
      "missing uploaded file remains pending",
    passed:
      missingFileResult.inputs[0]
        ?.processingStatus ===
        "pending" &&
      missingFileResult.inputs[0]
        ?.processingError?.includes(
          "No server-side uploaded File",
        ) === true,
    detail:
      missingFileResult.inputs[0]
        ?.processingError ??
      "Missing file mapping was not reported.",
  });
  const tooManyInputs =
    Array.from(
      {
        length: 9,
      },
      (_, index) =>
        createInput({
          id:
            `c164-6-2-input-${index}`,
        }),
    );
  const tooManyResult =
    await processAIOSUploadedFiles(
      tooManyInputs,
      [],
    );
  checks.push({
    name:
      "processing maximum input count enforced",
    passed:
      !tooManyResult.success &&
      tooManyResult.code ===
        "AIOS_INPUT_PROCESSING_REJECTED" &&
      tooManyResult.limitations.some(
        (item) =>
          item.includes(
            "maximum of 8 inputs",
          ),
      ),
    detail:
      tooManyResult.limitations.join(
        " | ",
      ),
  });
  checks.push({
    name:
      "processed content is transient",
    passed:
      textResult.limitations.some(
        (item) =>
          item.includes(
            "not persisted",
          ),
      ),
    detail:
      "Processing runtime declares transient-only content handling.",
  });
  checks.push({
    name:
      "model execution blocked",
    passed:
      textResult.safetyBoundary
        .modelExecution ===
      false,
    detail:
      "modelExecution=false",
  });
  checks.push({
    name:
      "planner dispatch blocked",
    passed:
      textResult.safetyBoundary
        .plannerDispatched ===
      false,
    detail:
      "plannerDispatched=false",
  });
  checks.push({
    name:
      "trading execution blocked",
    passed:
      textResult.safetyBoundary
        .tradingExecuted ===
      false,
    detail:
      "tradingExecuted=false",
  });
  checks.push({
    name:
      "Vision and OCR are not falsely reported",
    passed:
      textResult.limitations.some(
        (item) =>
          item.includes(
            "Image Vision and OCR are not enabled",
          ),
      ),
    detail:
      "Vision/OCR remain outside the C164.6.2 processing boundary.",
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
        ? "C164_6_2_PROCESSING_REGRESSION_PASS"
        : "C164_6_2_PROCESSING_REGRESSION_FAIL",
    checks,
    safetyBoundary: {
      modelExecution: false,
      plannerDispatched: false,
      tradingExecuted: false,
    },
  };
}
