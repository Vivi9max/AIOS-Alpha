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
  };
  error?: string;
  latencyMs?: number;
}
export async function executeAIOSInputUnderstandingBridge(
  inputs: AIOSInputItem[],
  files: AIOSInputUnderstandingFile[],
  locale: string,
): Promise<AIOSInputUnderstandingBridgeResult> {
  const startedAt =
    Date.now();
  if (
    !Array.isArray(inputs) ||
    inputs.length === 0
  ) {
    return {
      success: false,
      code:
        "C164_7_2_INPUT_REQUIRED",
      inputs: [],
      understoodCount: 0,
      pendingCount: 0,
      failedCount: 0,
      limitations: [
        "No AIOS inputs were provided.",
      ],
      latencyMs:
        Date.now() -
        startedAt,
    };
  }
  if (
    !Array.isArray(files) ||
    files.length === 0
  ) {
    return {
      success: false,
      code:
        "C164_7_2_FILE_REQUIRED",
      inputs,
      understoodCount: 0,
      pendingCount:
        inputs.length,
      failedCount: 0,
      limitations: [
        "No browser File objects were provided to the understanding bridge.",
      ],
      latencyMs:
        Date.now() -
        startedAt,
    };
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
        (entry) =>
          entry.inputId,
      ),
    ),
  );
  for (const entry of files) {
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
          method: "POST",
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
  } catch (error) {
    return {
      success: false,
      code:
        "C164_7_2_BRIDGE_NETWORK_FAILED",
      inputs,
      understoodCount: 0,
      pendingCount:
        inputs.length,
      failedCount: 1,
      limitations: [
        error instanceof Error
          ? error.message
          : "Input understanding request failed.",
      ],
      latencyMs:
        Date.now() -
        startedAt,
    };
  }
  let data:
    UnderstandingApiResponse;
  try {
    data =
      (await response.json()) as
        UnderstandingApiResponse;
  } catch {
    return {
      success: false,
      code:
        "C164_7_2_INVALID_RESPONSE",
      inputs,
      understoodCount: 0,
      pendingCount:
        inputs.length,
      failedCount: 1,
      limitations: [
        "AIOS Input Understanding API returned an invalid response.",
      ],
      latencyMs:
        Date.now() -
        startedAt,
    };
  }
  const resultInputs =
    data.understandingResult
      ?.inputs ?? inputs;
  const understoodCount =
    data.understandingResult
      ?.understoodCount ??
    resultInputs.filter(
      (input) =>
        input.processingStatus ===
        "ready",
    ).length;
  const pendingCount =
    data.understandingResult
      ?.pendingCount ??
    resultInputs.filter(
      (input) =>
        input.processingStatus ===
        "pending",
    ).length;
  const failedCount =
    data.understandingResult
      ?.failedCount ??
    resultInputs.filter(
      (input) =>
        input.processingStatus ===
        "failed",
    ).length;
  const limitations =
    data.understandingResult
      ?.limitations ?? [];
  if (!response.ok) {
    return {
      success: false,
      code:
        data.code ??
        "C164_7_2_API_FAILED",
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
        Date.now() -
        startedAt,
    };
  }
  return {
    success:
      data.success === true,
    code:
      data.code ??
      "C164_7_2_INPUT_UNDERSTANDING_COMPLETED",
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
