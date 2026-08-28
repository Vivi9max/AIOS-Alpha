import "server-only";

import {
  executeFounderRuntimeGitHubTask,
} from "@/lib/github/founder-runtime-task";

import {
  analyzeFounderCode,
} from "@/lib/github/founder-code-analyzer";

export type AutonomousDevelopmentPhase =
  | "read"
  | "analyze"
  | "plan"
  | "write"
  | "commit"
  | "readback"
  | "verify"
  | "completed"
  | "failed";

export interface AutonomousDevelopmentRequest {
  objective: string;
  path: string;
  proposedContent?: string;
  commitMessage?: string;
}

export interface AutonomousDevelopmentResult {
  success: boolean;

  code: string;

  phase:
    AutonomousDevelopmentPhase;

  objective: string;

  path: string;

  read?: {
    success: boolean;
    content?: string;
    sha?: string;
    size?: number;
  };

  analysis?: {
    changed: boolean;
    reason: string;
    summary?: string;
    provider?: string;
    requestId?: string;
  };

  plan?: {
    action: "write" | "stop";
    reason: string;
  };

  write?: {
    success: boolean;
    commitSha?: string;
    commitUrl?: string;
    readbackVerified?: boolean;
  };

  verification?: {
    success: boolean;
    checks: string[];
    reason?: string;
  };

  error?: string;
}

function fail(
  input: AutonomousDevelopmentRequest,
  phase: AutonomousDevelopmentPhase,
  code: string,
  error: string,
): AutonomousDevelopmentResult {
  return {
    success: false,
    code,
    phase,
    objective: input.objective,
    path: input.path,
    error,
  };
}

function validateRequest(
  input: AutonomousDevelopmentRequest,
): string | null {
  if (!input.objective.trim()) {
    return "Development objective is required.";
  }

  if (!input.path.trim()) {
    return "Target file path is required.";
  }

  if (
    input.path.includes("..") ||
    input.path.includes("\0") ||
    input.path.startsWith(".git/") ||
    input.path.startsWith(".env")
  ) {
    return "Unsafe target path.";
  }

  return null;
}

export async function executeFounderAutonomousDevelopment(
  input: AutonomousDevelopmentRequest,
): Promise<AutonomousDevelopmentResult> {
  const validation =
    validateRequest(input);

  if (validation) {
    return fail(
      input,
      "failed",
      "AUTONOMOUS_REQUEST_INVALID",
      validation,
    );
  }

  /*
   * -------------------------------------------------
   * PHASE 1 — AUTHORITATIVE READ
   * -------------------------------------------------
   *
   * Always read GitHub before analysis.
   *
   * GitHub remains the source of truth.
   */
  const readResult =
    await executeFounderRuntimeGitHubTask({
      action: "read",

      path:
        input.path,

      objective:
        `Autonomous development READ phase: ${input.objective}`,
    });

  if (
    !readResult.success ||
    !readResult.github.read
  ) {
    return fail(
      input,
      "read",
      readResult.code,
      readResult.github.error ??
        "Unable to read target GitHub file.",
    );
  }

  const currentContent =
    readResult.github.read.content ??
    "";

  const currentSha =
    readResult.github.read.sha;

  /*
   * -------------------------------------------------
   * PHASE 2 — AI ANALYZE
   * -------------------------------------------------
   *
   * If the caller explicitly supplies proposedContent,
   * use it as the already-authorized proposal.
   *
   * Otherwise AIOS must analyze the authoritative
   * GitHub source and generate a complete replacement.
   */
  let proposedContent =
    input.proposedContent;

  let analysisSummary =
    "";

  let analysisProvider:
    | string
    | undefined;

  let analysisRequestId:
    | string
    | undefined;

  if (
    typeof proposedContent !==
    "string"
  ) {
    const analysis =
      await analyzeFounderCode({
        objective:
          input.objective,

        path:
          input.path,

        currentContent,
      });

    analysisSummary =
      analysis.analysis;

    analysisProvider =
      analysis.provider;

    analysisRequestId =
      analysis.requestId;

    if (
      !analysis.success
    ) {
      return {
        success: false,

        code:
          analysis.code,

        phase:
          "analyze",

        objective:
          input.objective,

        path:
          input.path,

        read: {
          success: true,

          content:
            currentContent,

          sha:
            currentSha,

          size:
            readResult.github.read
              .size,
        },

        analysis: {
          changed:
            false,

          reason:
            analysis.plan.reason,

          summary:
            analysis.analysis,

          provider:
            analysis.provider,

          requestId:
            analysis.requestId,
        },

        plan: {
          action: "stop",

          reason:
            analysis.plan.reason,
        },

        error:
          analysis.error,
      };
    }

    if (
      analysis.plan.action ===
      "stop"
    ) {
      return {
        success: true,

        code:
          analysis.code,

        phase:
          "completed",

        objective:
          input.objective,

        path:
          input.path,

        read: {
          success: true,

          content:
            currentContent,

          sha:
            currentSha,

          size:
            readResult.github.read
              .size,
        },

        analysis: {
          changed:
            false,

          reason:
            analysis.plan.reason,

          summary:
            analysis.analysis,

          provider:
            analysis.provider,

          requestId:
            analysis.requestId,
        },

        plan: {
          action:
            "stop",

          reason:
            analysis.plan.reason,
        },

        verification: {
          success:
            true,

          checks: [
            "authoritative-read",
            "ai-analysis",
            "change-detection",
            "safe-stop",
          ],

          reason:
            "AIOS determined that no source change is required.",
        },
      };
    }

    proposedContent =
      analysis.proposedContent;
  } else {
    analysisSummary =
      "A concrete proposedContent was supplied to the autonomous development orchestrator.";

    analysisProvider =
      "caller-supplied-proposal";

    analysisRequestId =
      undefined;
  }

  /*
   * -------------------------------------------------
   * PHASE 3 — PLAN
   * -------------------------------------------------
   */
  if (
    typeof proposedContent !==
      "string" ||
    !proposedContent
  ) {
    return fail(
      input,
      "plan",
      "AUTONOMOUS_PROPOSAL_MISSING",
      "No proposed source content was produced.",
    );
  }

  const changed =
    proposedContent !==
    currentContent;

  if (!changed) {
    return {
      success: true,

      code:
        "AUTONOMOUS_NO_CHANGE",

      phase:
        "completed",

      objective:
        input.objective,

      path:
        input.path,

      read: {
        success: true,

        content:
          currentContent,

        sha:
          currentSha,

        size:
          readResult.github.read
            .size,
      },

      analysis: {
        changed:
          false,

        reason:
          "The proposed content is identical to the authoritative GitHub content.",

        summary:
          analysisSummary,

        provider:
          analysisProvider,

        requestId:
          analysisRequestId,
      },

      plan: {
        action:
          "stop",

        reason:
          "No actual source change detected.",
      },

      verification: {
        success:
          true,

        checks: [
          "authoritative-read",
          "analysis",
          "content-comparison",
          "write-skipped",
        ],

        reason:
          "AIOS correctly avoided an unnecessary GitHub write.",
      },
    };
  }

  /*
   * Basic proposal integrity gate.
   */
  if (
    proposedContent.length <
    10
  ) {
    return fail(
      input,
      "plan",
      "AUTONOMOUS_PROPOSAL_INVALID",
      "Generated source content is suspiciously short.",
    );
  }

  /*
   * Do not allow obvious model-wrapper output
   * to enter the source file.
   */
  if (
    /^```[\s\S]*```$/.test(
      proposedContent.trim(),
    )
  ) {
    return fail(
      input,
      "plan",
      "AUTONOMOUS_PROPOSAL_CODE_FENCE",
      "Generated source still contains a Markdown code fence.",
    );
  }

  const plan = {
    action:
      "write" as const,

    reason:
      "AIOS produced concrete source content that differs from the authoritative GitHub file.",
  };

  /*
   * -------------------------------------------------
   * PHASE 4 — WRITE
   * -------------------------------------------------
   *
   * The write NEVER bypasses Founder Runtime.
   *
   * Founder Runtime creates the development contract.
   * task-dispatch enforces the contract before GitHub I/O.
   */
  const writeResult =
    await executeFounderRuntimeGitHubTask({
      action: "write",

      path:
        input.path,

      content:
        proposedContent,

      commitMessage:
        input.commitMessage?.trim() ||
        `feat(C141.12): autonomous development for ${input.path}`,

      objective:
        `Autonomous development WRITE phase: ${input.objective}`,
    });

  if (
    !writeResult.success
  ) {
    return {
      success: false,

      code:
        writeResult.code,

      phase:
        "write",

      objective:
        input.objective,

      path:
        input.path,

      read: {
        success: true,

        content:
          currentContent,

        sha:
          currentSha,

        size:
          readResult.github.read
            .size,
      },

      analysis: {
        changed:
          true,

        reason:
          plan.reason,

        summary:
          analysisSummary,

        provider:
          analysisProvider,

        requestId:
          analysisRequestId,
      },

      plan,

      error:
        writeResult.github.error ??
        "GitHub autonomous write failed.",
    };
  }

  const write =
    writeResult.github.write;

  if (!write) {
    return fail(
      input,
      "commit",
      "AUTONOMOUS_COMMIT_RESULT_MISSING",
      "GitHub reported success without a commit result.",
    );
  }

  /*
   * -------------------------------------------------
   * PHASE 5 — COMMIT
   * -------------------------------------------------
   */
  if (
    !write.commitSha
  ) {
    return fail(
      input,
      "commit",
      "AUTONOMOUS_COMMIT_SHA_MISSING",
      "GitHub write completed without a commit SHA.",
    );
  }

  /*
   * -------------------------------------------------
   * PHASE 6 — AUTHORITATIVE READBACK
   * -------------------------------------------------
   *
   * Do another complete GitHub READ after commit.
   */
  const readback =
    await executeFounderRuntimeGitHubTask({
      action: "read",

      path:
        input.path,

      objective:
        `Autonomous development READBACK phase: ${input.objective}`,
    });

  if (
    !readback.success ||
    !readback.github.read
  ) {
    return {
      success: false,

      code:
        "AUTONOMOUS_READBACK_FAILED",

      phase:
        "readback",

      objective:
        input.objective,

      path:
        input.path,

      read: {
        success: true,

        content:
          currentContent,

        sha:
          currentSha,

        size:
          readResult.github.read
            .size,
      },

      analysis: {
        changed:
          true,

        reason:
          plan.reason,

        summary:
          analysisSummary,

        provider:
          analysisProvider,

        requestId:
          analysisRequestId,
      },

      plan,

      write: {
        success:
          true,

        commitSha:
          write.commitSha,

        commitUrl:
          write.commitUrl,

        readbackVerified:
          false,
      },

      error:
        readback.github.error ??
        "Autonomous readback failed.",
    };
  }

  const readbackContent =
    readback.github.read.content ??
    "";

  const contentMatches =
    readbackContent ===
    proposedContent;

  /*
   * -------------------------------------------------
   * PHASE 7 — VERIFY
   * -------------------------------------------------
   */
  const checks = [
    "authoritative-read",
    "ai-analysis",
    "change-detection",
    "founder-contract",
    "safe-write-path",
    "github-write",
    "commit-sha",
    "github-readback",
    "content-match",
  ];

  if (
    !contentMatches
  ) {
    return {
      success: false,

      code:
        "AUTONOMOUS_READBACK_CONTENT_MISMATCH",

      phase:
        "verify",

      objective:
        input.objective,

      path:
        input.path,

      read: {
        success: true,

        content:
          currentContent,

        sha:
          currentSha,

        size:
          readResult.github.read
            .size,
      },

      analysis: {
        changed:
          true,

        reason:
          plan.reason,

        summary:
          analysisSummary,

        provider:
          analysisProvider,

        requestId:
          analysisRequestId,
      },

      plan,

      write: {
        success:
          true,

        commitSha:
          write.commitSha,

        commitUrl:
          write.commitUrl,

        readbackVerified:
          false,
      },

      verification: {
        success:
          false,

        checks,

        reason:
          "The authoritative GitHub readback does not exactly match the generated source.",
      },

      error:
        "Readback content mismatch.",
    };
  }

  return {
    success:
      true,

    code:
      "AUTONOMOUS_DEVELOPMENT_VERIFIED",

    phase:
      "completed",

    objective:
      input.objective,

    path:
      input.path,

    read: {
      success:
        true,

      content:
        currentContent,

      sha:
        currentSha,

      size:
        readResult.github.read
          .size,
    },

    analysis: {
      changed:
        true,

      reason:
        plan.reason,

      summary:
        analysisSummary,

      provider:
        analysisProvider,

      requestId:
        analysisRequestId,
    },

    plan,

    write: {
      success:
        true,

      commitSha:
        write.commitSha,

      commitUrl:
        write.commitUrl,

      readbackVerified:
        true,
    },

    verification: {
      success:
        true,

      checks,

      reason:
        "READ → ANALYZE → PLAN → WRITE → COMMIT → READBACK → VERIFY completed successfully.",
    },
  };
}
