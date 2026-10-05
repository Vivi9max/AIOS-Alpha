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
      "c164-9-input",
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

function createBinaryFile(
  name: string,
  type: string,
  bytes: number[],
): File {
  return new File(
    [
      new Uint8Array(
        bytes,
      ),
    ],
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
    | "C164_9_INPUT_UNDERSTANDING_REGRESSION_PASS"
    | "C164_9_INPUT_UNDERSTANDING_REGRESSION_FAIL";

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

function addCheck(
  checks: AIOSInputUnderstandingRegressionResult["checks"],
  name: string,
  passed: boolean,
  detail: string,
): void {
  checks.push({
    name,
    passed,
    detail,
  });
}

export async function runAIOSInputUnderstandingRegression(): Promise<AIOSInputUnderstandingRegressionResult> {
  const checks:
    AIOSInputUnderstandingRegressionResult["checks"] =
    [];

  const text =
    "AIOS C164.9 regression";

  const textInput =
    createInput({
      id:
        "c164-9-text",
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

  addCheck(
    checks,
    "plain text remains supported",
    textResult.inputs[0]
        ?.processingStatus ===
      "ready" &&
      textResult.inputs[0]
        ?.extractedText ===
        text,
    textResult.inputs[0]
        ?.extractedText ??
      "Text extraction failed.",
  );

  const imageInput =
    createInput({
      id:
        "c164-9-image",
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
    createBinaryFile(
      "photo.jpg",
      "image/jpeg",
      [
        0xff,
        0xd8,
        0xff,
        0xe0,
        0x00,
        0x10,
        0x4a,
        0x46,
        0x49,
        0x46,
        0x00,
        0x01,
        0x00,
        0x01,
        0x00,
        0x01,
        0x00,
        0x48,
        0x00,
        0x48,
        0x00,
        0x00,
        0xff,
        0xd9,
      ],
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

  const imageStatus =
    imageResult.inputs[0]
      ?.processingStatus;

  const imageContractPassed =
    imageConfigured
      ? imageStatus ===
          "ready" ||
        imageStatus ===
          "failed"
      : imageStatus ===
        "pending";

  addCheck(
    checks,
    "image enters Vision bridge",
    imageContractPassed,
    imageConfigured
      ? imageResult.inputs[0]
          ?.processingError ??
        imageResult.inputs[0]
          ?.extractedText ??
        "Vision execution attempted."
      : imageResult.inputs[0]
          ?.processingError ??
        "Vision remains pending because OPENAI_API_KEY is not configured.",
  );

  const videoInput =
    createInput({
      id:
        "c164-9-video",
      kind:
        "video",
      metadata: {
        name:
          "sample.mp4",
        mimeType:
          "video/mp4",
        sizeBytes:
          4096,
        lastModifiedAt:
          "2026-01-01T00:00:00.000Z",
        source:
          "file-picker",
      },
    });

  const videoFile =
    createFile(
      "sample.mp4",
      "video/mp4",
      "C164.9 original video placeholder",
    );

  const videoResult =
    await processAIOSInputUnderstanding(
      [videoInput],
      [
        {
          inputId:
            videoInput.id,
          file:
            videoFile,
        },
      ],
    );

  addCheck(
    checks,
    "raw video without frame evidence is never falsely marked ready",
    videoResult.inputs[0]
        ?.processingStatus ===
      "pending" &&
      videoResult.inputs[0]
        ?.processingError?.includes(
          "no derived frame evidence",
        ) === true,
    videoResult.inputs[0]
        ?.processingError ??
      "Raw video boundary is missing.",
  );

  const frameSheetInput =
    createInput({
      id:
        "c164-9-video-frame-sheet",
      kind:
        "video",
      metadata: {
        name:
          "sample.frames.jpg",
        mimeType:
          "image/jpeg",
        sizeBytes:
          1024,
        lastModifiedAt:
          "2026-01-01T00:00:00.000Z",
        source:
          "file-picker",
      },
    });

  const frameSheetFile =
    createBinaryFile(
      "sample.frames.jpg",
      "image/jpeg",
      [
        0xff,
        0xd8,
        0xff,
        0xe0,
        0x00,
        0x10,
        0x4a,
        0x46,
        0x49,
        0x46,
        0x00,
        0x01,
        0x00,
        0x01,
        0x00,
        0x01,
        0x00,
        0x48,
        0x00,
        0x48,
        0x00,
        0x00,
        0xff,
        0xd9,
      ],
    );

  const frameSheetResult =
    await processAIOSInputUnderstanding(
      [frameSheetInput],
      [
        {
          inputId:
            frameSheetInput.id,
          file:
            frameSheetFile,
        },
      ],
    );

  const frameSheetStatus =
    frameSheetResult.inputs[0]
      ?.processingStatus;

  const frameSheetContractPassed =
    imageConfigured
      ? frameSheetStatus ===
          "ready" ||
        frameSheetStatus ===
          "failed"
      : frameSheetStatus ===
        "pending";

  addCheck(
    checks,
    "video frame sheet enters the image Vision bridge",
    frameSheetContractPassed,
    imageConfigured
      ? frameSheetResult.inputs[0]
          ?.processingError ??
        frameSheetResult.inputs[0]
          ?.extractedText ??
        "Video frame sheet Vision execution attempted."
      : frameSheetResult.inputs[0]
          ?.processingError ??
        "Video frame sheet remains pending because OPENAI_API_KEY is not configured.",
  );

  const pdfInput =
    createInput({
      id:
        "c164-9-pdf",
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
      "C164.9 PDF placeholder",
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

  addCheck(
    checks,
    "PDF remains explicitly pending",
    pdfResult.inputs[0]
        ?.processingStatus ===
      "pending" &&
      pdfResult.inputs[0]
        ?.processingError?.includes(
          "PDF parsing is not enabled",
        ) === true,
    pdfResult.inputs[0]
        ?.processingError ??
      "PDF boundary missing.",
  );

  const officeInput =
    createInput({
      id:
        "c164-9-office",
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
      "C164.9 Office placeholder",
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

  addCheck(
    checks,
    "Office document remains explicitly pending",
    officeResult.inputs[0]
        ?.processingStatus ===
      "pending",
    officeResult.inputs[0]
        ?.processingError ??
      "Office parser boundary missing.",
  );

  const tooMany =
    Array.from(
      {
        length: 9,
      },
      (_, index) =>
        createInput({
          id:
            `c164-9-input-${index}`,
        }),
    );

  const tooManyResult =
    await processAIOSInputUnderstanding(
      tooMany,
      [],
    );

  addCheck(
    checks,
    "maximum input count enforced",
    !tooManyResult.success &&
      tooManyResult.code ===
        "C164_7_INPUT_UNDERSTANDING_REJECTED",
    tooManyResult.limitations.join(
      " | ",
    ),
  );

  const missingFileInput =
    createInput({
      id:
        "c164-9-missing-file",
      kind:
        "image",
      metadata: {
        name:
          "missing.jpg",
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

  const missingFileResult =
    await processAIOSInputUnderstanding(
      [missingFileInput],
      [],
    );

  addCheck(
    checks,
    "missing server-side file mapping remains pending",
    missingFileResult.inputs[0]
        ?.processingStatus ===
      "pending" &&
      missingFileResult.inputs[0]
        ?.processingError?.includes(
          "No server-side uploaded File",
        ) === true,
    missingFileResult.inputs[0]
        ?.processingError ??
      "Missing file mapping boundary failed.",
  );

  addCheck(
    checks,
    "planner remains blocked",
    textResult.safetyBoundary
        .plannerDispatched ===
      false,
    "plannerDispatched=false",
  );

  addCheck(
    checks,
    "trading remains blocked",
    textResult.safetyBoundary
        .tradingExecuted ===
      false,
    "tradingExecuted=false",
  );

  addCheck(
    checks,
    "Vision output is explicitly evidence",
    textResult.limitations.some(
      (item) =>
        item.includes(
          "evidence from the supplied image",
        ),
    ),
    "Vision result is not treated as guaranteed fact.",
  );

  addCheck(
    checks,
    "video understanding remains bounded",
    videoResult.limitations.some(
      (item) =>
        item.includes(
          "five sampled frames",
        ),
    ),
    "Video understanding is limited to bounded representative frame evidence.",
  );

  addCheck(
    checks,
    "uploaded files are not persisted",
    textResult.limitations.some(
      (item) =>
        item.includes(
          "No uploaded file is persisted",
        ),
    ),
    "Uploaded file processing remains transient.",
  );

  const success =
    checks.every(
      (check) =>
        check.passed,
    );

  return {
    success,

    code:
      success
        ? "C164_9_INPUT_UNDERSTANDING_REGRESSION_PASS"
        : "C164_9_INPUT_UNDERSTANDING_REGRESSION_FAIL",

    checks,

    safetyBoundary: {
      plannerDispatched:
        false,

      tradingExecuted:
        false,
    },
  };
}
