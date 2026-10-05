import type {
  AIOSInputItem,
} from "@/lib/runtime/input/aios-input-types";

export interface AIOSInputUnderstandingFile {
  inputId: string;
  file: File;
}

export interface AIOSInputUnderstandingBridgeResult {
  success: boolean;

  code?: string;

  content?: string;

  inputs: AIOSInputItem[];

  understoodCount: number;

  pendingCount: number;

  failedCount: number;

  limitations: string[];

  latencyMs: number;
}

interface UnderstandingApiResponse {
  success?: boolean;

  code?: string;

  content?: string;

  understandingResult?: {
    inputs?: AIOSInputItem[];

    understoodCount?: number;

    pendingCount?: number;

    failedCount?: number;

    limitations?: string[];

    safetyBoundary?: {
      plannerDispatched?: boolean;

      tradingExecuted?: boolean;
    };
  };

  safetyBoundary?: {
    plannerDispatched?: boolean;

    tradingExecuted?: boolean;
  };

  error?: string;

  latencyMs?: number;
}

const MAX_INPUTS =
  8;

function calculateCounts(
  inputs: AIOSInputItem[],
): {
  understoodCount: number;
  pendingCount: number;
  failedCount: number;
} {
  return {
    understoodCount:
      inputs.filter(
        (
          input,
        ) =>
          input.processingStatus ===
          "ready",
      ).length,

    pendingCount:
      inputs.filter(
        (
          input,
        ) =>
          input.processingStatus ===
          "pending",
      ).length,

    failedCount:
      inputs.filter(
        (
          input,
        ) =>
          input.processingStatus ===
          "failed",
      ).length,
  };
}

function validateFiles(
  inputs: AIOSInputItem[],
  files: AIOSInputUnderstandingFile[],
): string | null {
  if (
    files.length ===
    0
  ) {
    return "No browser File objects were provided to the understanding bridge.";
  }

  if (
    files.length >
    MAX_INPUTS
  ) {
    return `A maximum of ${MAX_INPUTS} files can be processed in one request.`;
  }

  const inputIds =
    new Set(
      inputs.map(
        (
          input,
        ) =>
          input.id,
      ),
    );

  const fileIds =
    new Set<string>();

  for (
    const entry of files
  ) {
    if (
      !entry ||
      typeof entry.inputId !==
        "string" ||
      !entry.inputId.trim()
    ) {
      return "An uploaded file is missing a valid input id.";
    }

    if (
      fileIds.has(
        entry.inputId,
      )
    ) {
      return `Duplicate uploaded file input id: ${entry.inputId}`;
    }

    fileIds.add(
      entry.inputId,
    );

    if (
      !inputIds.has(
        entry.inputId,
      )
    ) {
      return `Uploaded file input id is not declared in the input collection: ${entry.inputId}`;
    }

    if (
      typeof File ===
        "undefined" ||
      !(entry.file instanceof File)
    ) {
      return `Uploaded input ${entry.inputId} does not contain a valid browser File.`;
    }
  }

  return null;
}

function buildFailureResult(
  inputs: AIOSInputItem[],
  code: string,
  limitation: string,
  startedAt: number,
): AIOSInputUnderstandingBridgeResult {
  const counts =
    calculateCounts(
      inputs,
    );

  return {
    success:
      false,

    code,

    inputs,

    understoodCount:
      counts.understoodCount,

    pendingCount:
      counts.pendingCount,

    failedCount:
      Math.max(
        counts.failedCount,
        1,
      ),

    limitations: [
      limitation,
    ],

    latencyMs:
      Date.now() -
      startedAt,
  };
}

export async function executeAIOSInputUnderstandingBridge(
  inputs: AIOSInputItem[],
  files: AIOSInputUnderstandingFile[],
  locale: string,
): Promise<AIOSInputUnderstandingBridgeResult> {
  const startedAt =
    Date.now();

  if (
    !Array.isArray(
      inputs,
    ) ||
    inputs.length ===
      0
  ) {
    return {
      success:
        false,

      code:
        "C164_7_2_INPUT_REQUIRED",

      inputs: [],

      understoodCount:
        0,

      pendingCount:
        0,

      failedCount:
        0,

      limitations: [
        "No AIOS inputs were provided.",
      ],

      latencyMs:
        Date.now() -
        startedAt,
    };
  }

  if (
    inputs.length >
    MAX_INPUTS
  ) {
    return {
      success:
        false,

      code:
        "C164_7_2_INPUT_LIMIT_EXCEEDED",

      inputs,

      understoodCount:
        0,

      pendingCount:
        inputs.length,

      failedCount:
        0,

      limitations: [
        `A maximum of ${MAX_INPUTS} inputs can be processed in one request.`,
      ],

      latencyMs:
        Date.now() -
        startedAt,
    };
  }

  if (
    !Array.isArray(
      files,
    )
  ) {
    return buildFailureResult(
      inputs,
      "C164_7_2_FILE_REQUIRED",
      "No browser File objects were provided to the understanding bridge.",
      startedAt,
    );
  }

  const validationError =
    validateFiles(
      inputs,
      files,
    );

  if (
    validationError
  ) {
    return buildFailureResult(
      inputs,
      "C164_7_2_FILE_MAPPING_INVALID",
      validationError,
      startedAt,
    );
  }

  const formData =
    new FormData();

  formData.append(
    "inputs",
    JSON.stringify(
      inputs,
    ),
  );

  formData.append(
    "fileInputIds",
    JSON.stringify(
      files.map(
        (
          entry,
        ) =>
          entry.inputId,
      ),
    ),
  );

  for (
    const entry of files
  ) {
    formData.append(
      "files",
      entry.file,
      entry.file.name,
    );
  }

  let response: Response;

  try {
    response =
      await fetch(
        "/api/input/understanding",
        {
          method:
            "POST",

          headers: {
            "x-aios-locale":
              locale,
          },

          credentials:
            "same-origin",

          body:
            formData,
        },
      );
  } catch (
    error
  ) {
    return buildFailureResult(
      inputs,
      "C164_7_2_BRIDGE_NETWORK_FAILED",
      error instanceof Error
        ? error.message
        : "Input understanding request failed.",
      startedAt,
    );
  }

  let data:
    UnderstandingApiResponse;

  try {
    data =
      (await response.json()) as
        UnderstandingApiResponse;
  } catch {
    return buildFailureResult(
      inputs,
      "C164_7_2_INVALID_RESPONSE",
      "AIOS Input Understanding API returned an invalid response.",
      startedAt,
    );
  }

  const resultInputs =
    Array.isArray(
      data
        .understandingResult
        ?.inputs,
    )
      ? data
          .understandingResult
          ?.inputs ??
        inputs
      : inputs;

  const calculatedCounts =
    calculateCounts(
      resultInputs,
    );

  const understoodCount =
    typeof data
      .understandingResult
      ?.understoodCount ===
    "number"
      ? data
          .understandingResult
          .understoodCount
      : calculatedCounts.understoodCount;

  const pendingCount =
    typeof data
      .understandingResult
      ?.pendingCount ===
    "number"
      ? data
          .understandingResult
          .pendingCount
      : calculatedCounts.pendingCount;

  const failedCount =
    typeof data
      .understandingResult
      ?.failedCount ===
    "number"
      ? data
          .understandingResult
          .failedCount
      : calculatedCounts.failedCount;

  const limitations =
    Array.isArray(
      data
        .understandingResult
        ?.limitations,
    )
      ? data
          .understandingResult
          ?.limitations ?? []
      : [];

  const apiSafetyBoundary =
    data
      .understandingResult
      ?.safetyBoundary ??
    data.safetyBoundary;

  if (
    apiSafetyBoundary &&
    (
      apiSafetyBoundary
        .plannerDispatched ===
        true ||
      apiSafetyBoundary
        .tradingExecuted ===
        true
    )
  ) {
    return {
      success:
        false,

      code:
        "C164_7_2_SAFETY_BOUNDARY_VIOLATION",

      content:
        data.content,

      inputs:
        resultInputs,

      understoodCount,

      pendingCount,

      failedCount:
        Math.max(
          failedCount,
          1,
        ),

      limitations: [
        ...limitations,

        "AIOS Input Understanding rejected a response that reported planner dispatch or trading execution.",
      ],

      latencyMs:
        Date.now() -
        startedAt,
    };
  }

  if (
    !response.ok
  ) {
    return {
      success:
        false,

      code:
        data.code ??
        "C164_7_2_API_FAILED",

      content:
        data.content,

      inputs:
        resultInputs,

      understoodCount,

      pendingCount,

      failedCount:
        Math.max(
          failedCount,
          1,
        ),

      limitations: [
        ...limitations,

        data.error ??
          data.content ??
          "AIOS Input Understanding API failed.",
      ],

      latencyMs:
        data.latencyMs ??
        Date.now() -
          startedAt,
    };
  }

  const reportedSuccess =
    data.success ===
    true;

  const hasFailedInputs =
    failedCount >
    0;

  const hasPendingInputs =
    pendingCount >
    0;

  return {
    success:
      reportedSuccess &&
      !hasFailedInputs &&
      !hasPendingInputs,

    code:
      data.code ??
      (
        reportedSuccess &&
        !hasFailedInputs &&
        !hasPendingInputs
          ? "C164_7_2_INPUT_UNDERSTANDING_COMPLETED"
          : "C164_7_2_INPUT_UNDERSTANDING_PARTIAL"
      ),

    content:
      data.content,

    inputs:
      resultInputs,

    understoodCount,

    pendingCount,

    failedCount,

    limitations,

    latencyMs:
      data.latencyMs ??
      Date.now() -
        startedAt,
  };
}
