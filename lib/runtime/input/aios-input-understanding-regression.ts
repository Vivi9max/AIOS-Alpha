import {
  processAIOSInputUnderstanding,
} from "@/lib/runtime/input/aios-input-understanding-runtime";
import type {
  AIOSInputItem,
} from "@/lib/runtime/input/aios-input-types";
function createInput(
  overrides: Partial<AIOSInputItem>,
): AIOSInputItem {
  return {
    id:
      overrides.id ??
      "c164-7-input",
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
export interface AIOSInputUnderstandingRegressionResult {
  success: boolean;
  code:
    | "C164_7_INPUT_UNDERSTANDING_REGRESSION_PASS"
    | "C164_7_INPUT_UNDERSTANDING_REGRESSION_FAIL";
  checks: Array<{
    name: string;
    passed: boolean;
    detail: string;
  }>;
  safetyBoundary: {
    plannerDispatched: false;
    tradingExecuted: false;
  };
}
export async function runAIOSInputUnderstandingRegression(): Promise<AIOSInputUnderstandingRegressionResult> {
  const checks:
    AIOSInputUnderstandingRegressionResult["checks"] =
    [];
  const text =
    "AIOS C164.7 regression";
  const textInput =
    createInput({
      id:
        "c164-7-text",
      kind:
        "file",
      metadata: {
        name:
          "regression.txt",
        mimeType:
          "text/plain",
        sizeBytes:
          text.length,
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
      text,
    );
  const textResult =
    await processAIOSInputUnderstanding(
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
      "plain text remains supported",
    passed:
      textResult.inputs[0]
        ?.processingStatus ===
        "ready" &&
      textResult.inputs[0]
        ?.extractedText ===
        text,
    detail:
      textResult.inputs[0]
        ?.extractedText ??
      "Text extraction failed.",
  });
  const imageInput =
    createInput({
      id:
        "c164-7-image",
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
      "C164.7 regression image payload",
    );
  const imageResult =
    await processAIOSInputUnderstanding(
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
  const imageConfigured =
    Boolean(
      process.env.OPENAI_API_KEY?.trim(),
    );
  checks.push({
    name:
      "image enters Vision bridge",
    passed:
      imageConfigured
        ? imageResult.inputs[0]
            ?.processingStatus ===
          "failed" ||
          imageResult.inputs[0]
            ?.processingStatus ===
          "ready"
        : imageResult.inputs[0]
            ?.processingStatus ===
          "pending",
    detail:
      imageConfigured
        ? imageResult.inputs[0]
            ?.processingError ??
          imageResult.inputs[0]
            ?.extractedText ??
          "Vision execution attempted."
        : imageResult.inputs[0]
            ?.processingError ??
          "Vision remains pending because OPENAI_API_KEY is not configured.",
  });
  const pdfInput =
    createInput({
      id:
        "c164-7-pdf",
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
      "C164.7 PDF placeholder",
    );
  const pdfResult =
    await processAIOSInputUnderstanding(
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
      "PDF remains explicitly pending",
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
      "PDF boundary missing.",
  });
  const officeInput =
    createInput({
      id:
        "c164-7-office",
      kind:
        "file",
      metadata: {
        name:
          "document.docx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        sizeBytes:
          1024,
        lastModifiedAt:
          "2026-01-01T00:00:00.000Z",
        source:
          "file-picker",
      },
    });
  const officeFile =
    createFile(
      "document.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "C164.7 Office placeholder",
    );
  const officeResult =
    await processAIOSInputUnderstanding(
      [officeInput],
      [
        {
          inputId:
            officeInput.id,
          file:
            officeFile,
        },
      ],
    );
  checks.push({
    name:
      "Office document remains explicitly pending",
    passed:
      officeResult.inputs[0]
        ?.processingStatus ===
      "pending",
    detail:
      officeResult.inputs[0]
        ?.processingError ??
      "Office parser boundary missing.",
  });
  const tooMany =
    Array.from(
      {
        length: 9,
      },
      (_, index) =>
        createInput({
          id:
            `c164-7-input-${index}`,
        }),
    );
  const tooManyResult =
    await processAIOSInputUnderstanding(
      tooMany,
      [],
    );
  checks.push({
    name:
      "maximum input count enforced",
    passed:
      !tooManyResult.success &&
      tooManyResult.code ===
        "C164_7_INPUT_UNDERSTANDING_REJECTED",
    detail:
      tooManyResult.limitations.join(
        " | ",
      ),
  });
  checks.push({
    name:
      "planner remains blocked",
    passed:
      textResult.safetyBoundary
        .plannerDispatched ===
      false,
    detail:
      "plannerDispatched=false",
  });
  checks.push({
    name:
      "trading remains blocked",
    passed:
      textResult.safetyBoundary
        .tradingExecuted ===
      false,
    detail:
      "tradingExecuted=false",
  });
  checks.push({
    name:
      "Vision output is explicitly evidence",
    passed:
      textResult.limitations.some(
        (item) =>
          item.includes(
            "evidence from the supplied image",
          ),
      ),
    detail:
      "Vision result is not treated as guaranteed fact.",
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
        ? "C164_7_INPUT_UNDERSTANDING_REGRESSION_PASS"
        : "C164_7_INPUT_UNDERSTANDING_REGRESSION_FAIL",
    checks,
    safetyBoundary: {
      plannerDispatched: false,
      tradingExecuted: false,
    },
  };
}
