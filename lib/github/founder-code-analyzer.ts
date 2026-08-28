import "server-only";

import {
  executeRuntime,
} from "@/lib/runtime/engine";

export interface FounderCodeAnalysisRequest {
  objective: string;
  path: string;
  currentContent: string;
}

export interface FounderCodeAnalysisResult {
  success: boolean;
  code: string;

  objective: string;
  path: string;

  changed: boolean;

  analysis: string;

  plan: {
    action: "write" | "stop";
    reason: string;
  };

  proposedContent?: string;

  provider?: string;
  requestId?: string;

  error?: string;
}

function buildAnalysisPrompt(
  input: FounderCodeAnalysisRequest,
): string {
  return [
    "You are the AIOS Founder Code Analysis Engine.",
    "",
    "Your job is to analyze the authoritative source file supplied by AIOS and determine whether a concrete source-code change is required.",
    "",
    "IMPORTANT RULES:",
    "1. Treat CURRENT FILE as authoritative.",
    "2. Do not invent files that were not supplied.",
    "3. Do not claim that a change was made.",
    "4. If no change is required, return STOP.",
    "5. If a change is required, return the COMPLETE replacement file.",
    "6. Preserve unrelated existing behavior.",
    "7. Do not return a diff.",
    "8. Do not return Markdown fences around the replacement file.",
    "9. Do not include commentary inside proposedContent.",
    "",
    `OBJECTIVE: ${input.objective}`,
    `TARGET PATH: ${input.path}`,
    "",
    "CURRENT FILE:",
    "-----BEGIN CURRENT FILE-----",
    input.currentContent,
    "-----END CURRENT FILE-----",
    "",
    "Return the following structure:",
    "",
    "ANALYSIS:",
    "<short explanation>",
    "",
    "ACTION:",
    "WRITE or STOP",
    "",
    "REASON:",
    "<short reason>",
    "",
    "PROPOSED_CONTENT:",
    "<complete replacement source file when ACTION is WRITE>",
  ].join("\n");
}

function parseSection(
  content: string,
  section: string,
): string {
  const marker =
    `${section}:`;

  const index =
    content.indexOf(marker);

  if (index < 0) {
    return "";
  }

  const start =
    index + marker.length;

  const remaining =
    content.slice(start);

  const next =
    remaining.search(
      /\n(?:ANALYSIS|ACTION|REASON|PROPOSED_CONTENT):/,
    );

  return (
    next >= 0
      ? remaining.slice(0, next)
      : remaining
  ).trim();
}

function stripCodeFence(
  value: string,
): string {
  const text =
    value.trim();

  if (
    text.startsWith("```") &&
    text.endsWith("```")
  ) {
    const lines =
      text.split("\n");

    lines.shift();

    lines.pop();

    return lines.join("\n");
  }

  return text;
}

export async function analyzeFounderCode(
  input: FounderCodeAnalysisRequest,
): Promise<FounderCodeAnalysisResult> {
  if (!input.objective.trim()) {
    return {
      success: false,
      code:
        "FOUNDER_CODE_ANALYSIS_OBJECTIVE_REQUIRED",
      objective:
        input.objective,
      path:
        input.path,
      changed: false,
      analysis: "",
      plan: {
        action: "stop",
        reason:
          "Objective is required.",
      },
      error:
        "Objective is required.",
    };
  }

  if (!input.path.trim()) {
    return {
      success: false,
      code:
        "FOUNDER_CODE_ANALYSIS_PATH_REQUIRED",
      objective:
        input.objective,
      path:
        input.path,
      changed: false,
      analysis: "",
      plan: {
        action: "stop",
        reason:
          "Target path is required.",
      },
      error:
        "Target path is required.",
    };
  }

  if (
    input.path.includes("..") ||
    input.path.includes("\0") ||
    input.path.startsWith(".git/") ||
    input.path.startsWith(".env")
  ) {
    return {
      success: false,
      code:
        "FOUNDER_CODE_ANALYSIS_UNSAFE_PATH",
      objective:
        input.objective,
      path:
        input.path,
      changed: false,
      analysis: "",
      plan: {
        action: "stop",
        reason:
          "Unsafe target path.",
      },
      error:
        "Unsafe target path.",
    };
  }

  const runtime =
    await executeRuntime({
      prompt:
        buildAnalysisPrompt(
          input,
        ),
    });

  if (
    !runtime.success
  ) {
    return {
      success: false,
      code:
        "FOUNDER_CODE_ANALYSIS_RUNTIME_FAILED",
      objective:
        input.objective,
      path:
        input.path,
      changed: false,
      analysis: "",
      plan: {
        action: "stop",
        reason:
          "AI Runtime failed.",
      },
      provider:
        runtime.provider,
      requestId:
        runtime.requestId,
      error:
        runtime.error ??
        "AI Runtime failed.",
    };
  }

  const output =
    runtime.content.trim();

  const analysis =
    parseSection(
      output,
      "ANALYSIS",
    );

  const action =
    parseSection(
      output,
      "ACTION",
    ).toUpperCase();

  const reason =
    parseSection(
      output,
      "REASON",
    );

  const proposedRaw =
    parseSection(
      output,
      "PROPOSED_CONTENT",
    );

  const proposedContent =
    proposedRaw
      ? stripCodeFence(
          proposedRaw,
        )
      : "";

  if (
    action !== "WRITE"
  ) {
    return {
      success: true,
      code:
        "FOUNDER_CODE_ANALYSIS_STOP",

      objective:
        input.objective,

      path:
        input.path,

      changed: false,

      analysis:
        analysis ||
        output,

      plan: {
        action: "stop",

        reason:
          reason ||
          "AIOS determined that no source change is required.",
      },

      provider:
        runtime.provider,

      requestId:
        runtime.requestId,
    };
  }

  if (
    !proposedContent
  ) {
    return {
      success: false,

      code:
        "FOUNDER_CODE_ANALYSIS_MISSING_PROPOSED_CONTENT",

      objective:
        input.objective,

      path:
        input.path,

      changed: false,

      analysis:
        analysis ||
        output,

      plan: {
        action: "stop",

        reason:
          "AI requested WRITE but did not return complete proposedContent.",
      },

      provider:
        runtime.provider,

      requestId:
        runtime.requestId,

      error:
        "Missing proposedContent.",
    };
  }

  if (
    proposedContent ===
    input.currentContent
  ) {
    return {
      success: true,

      code:
        "FOUNDER_CODE_ANALYSIS_NO_CHANGE",

      objective:
        input.objective,

      path:
        input.path,

      changed: false,

      analysis:
        analysis ||
        "The proposed source is identical to the authoritative source.",

      plan: {
        action: "stop",

        reason:
          "No actual source change detected.",
      },

      provider:
        runtime.provider,

      requestId:
        runtime.requestId,
    };
  }

  /*
   * Basic source-integrity checks.
   *
   * These do not replace TypeScript/build verification.
   * They prevent obviously malformed model output from
   * entering the write layer.
   */
  if (
    proposedContent.length <
    10
  ) {
    return {
      success: false,

      code:
        "FOUNDER_CODE_ANALYSIS_INVALID_PROPOSAL",

      objective:
        input.objective,

      path:
        input.path,

      changed: false,

      analysis:
        analysis,

      plan: {
        action: "stop",

        reason:
          "Proposed source is suspiciously short.",
      },

      provider:
        runtime.provider,

      requestId:
        runtime.requestId,

      error:
        "Invalid proposedContent.",
    };
  }

  return {
    success: true,

    code:
      "FOUNDER_CODE_ANALYSIS_WRITE_READY",

    objective:
      input.objective,

    path:
      input.path,

    changed: true,

    analysis:
      analysis ||
      "A concrete source-code change was generated.",

    plan: {
      action: "write",

      reason:
        reason ||
        "The generated source differs from the authoritative GitHub source.",
    },

    proposedContent,

    provider:
      runtime.provider,

    requestId:
      runtime.requestId,
  };
}
