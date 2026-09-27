"use client";

import type {
  AIOSInputItem,
} from "@/lib/runtime/input/aios-input-types";

export interface AIOSCNInputBridgeFile {
  inputId: string;
  file: File;
}

export interface AIOSCNInputBridgeResult {
  success: boolean;
  inputs: AIOSInputItem[];
  understoodCount: number;
  pendingCount: number;
  failedCount: number;
  limitations: string[];
  provider?: string;
  model?: string;
  error?: string;
}

export async function executeAIOSCNInputUnderstandingBridge(
  inputs: AIOSInputItem[],
  files: AIOSCNInputBridgeFile[],
  prompt: string,
  locale: string,
): Promise<AIOSCNInputBridgeResult> {
  if (
    inputs.length === 0 ||
    files.length === 0
  ) {
    return {
      success: false,
      inputs,
      understoodCount: 0,
      pendingCount: 0,
      failedCount:
        inputs.length,
      limitations: [
        "No input files were provided.",
      ],
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

  formData.append(
    "prompt",
    prompt,
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

  try {
    const response =
      await fetch(
        "/api/cn/input/understanding",
        {
          method: "POST",
          headers: {
            "x-aios-locale":
              locale,
          },
          credentials:
            "same-origin",
          body: formData,
        },
      );

    const data =
      (await response.json()) as Partial<AIOSCNInputBridgeResult>;

    if (
      !response.ok &&
      response.status !==
        207
    ) {
      return {
        success: false,
        inputs:
          Array.isArray(
            data.inputs,
          )
            ? data.inputs
            : inputs,
        understoodCount:
          data.understoodCount ??
          0,
        pendingCount:
          data.pendingCount ??
          0,
        failedCount:
          data.failedCount ??
          inputs.length,
        limitations:
          data.limitations ??
          [],
        error:
          data.error ??
          "AIOS CN input understanding request failed.",
      };
    }

    return {
      success:
        data.success === true,
      inputs:
        Array.isArray(
          data.inputs,
        )
          ? data.inputs
          : inputs,
      understoodCount:
        data.understoodCount ??
        0,
      pendingCount:
        data.pendingCount ??
        0,
      failedCount:
        data.failedCount ??
        0,
      limitations:
        data.limitations ??
        [],
      provider:
        data.provider,
      model:
        data.model,
    };
  } catch (
    error
  ) {
    return {
      success: false,
      inputs,
      understoodCount: 0,
      pendingCount: 0,
      failedCount:
        inputs.length,
      limitations: [],
      error:
        error instanceof Error
          ? error.message
          : "AIOS CN input understanding network error.",
    };
  }
}
