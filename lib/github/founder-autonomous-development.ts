import "server-only";

import {
  executeFounderRuntimeGitHubTask,
} from "@/lib/github/founder-runtime-task";

import {
  detectFounderRuntimeGitHubTask,
} from "@/lib/github/founder-runtime-task-detector";

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

function buildWriteContent(
  input: AutonomousDevelopmentRequest,
  currentContent: string,
): string | undefined {
  if (
    typeof input.proposedContent ===
    "string"
  ) {
    return input.proposedContent;
  }

  /*
   * C141.12-A intentionally does NOT allow
   * the orchestrator to invent source code.
   *
   * A later Analyze/Plan provider will populate
   * proposedContent.
   */
  void currentContent;

  return undefined;
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
   * PHASE 1 — READ
   * -------------------------------------------------
   *
   * Always read the current authoritative file first.
   */
  const readResult =
    await executeFounderRuntimeGitHubTask({
      action: "read",
      path: input.path,
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
   * PHASE 2 — ANALYZE
   * -------------------------------------------------
   *
   * C141.12-A does deterministic analysis only.
   *
   * No model is allowed to claim that a change is
   * necessary without an explicit proposedContent.
   */
  const proposedContent =
    buildWriteContent(
      input,
      currentContent,
    );

  const changed =
    typeof proposedContent ===
      "string" &&
    proposedContent !==
      currentContent;

  const analysis = {
    changed,

    reason: changed
      ? "A concrete proposed content differs from the authoritative GitHub file."
      : "No concrete source change was supplied; autonomous write is therefore blocked.",
  };

  /*
   * -------------------------------------------------
   * PHASE 3 — PLAN
   * -------------------------------------------------
   */
  const plan = changed
    ? {
        action:
          "write" as const,

        reason:
          "The proposed content differs from the current GitHub state.",
      }
    : {
        action:
          "stop" as const,

        reason:
          "No verified source change is available.",
      };

  if (
    plan.action === "stop"
  ) {
    return {
      success: true,

      code:
        "AUTONOMOUS_ANALYSIS_COMPLETE",

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

      analysis,

      plan,

      verification: {
        success: true,

        checks: [
          "authoritative-read",
          "change-detection",
          "write-safety-stop",
        ],

        reason:
          "AIOS correctly refused to invent or overwrite source without a concrete proposed change.",
      },
    };
  }

  /*
   * -------------------------------------------------
   * PHASE 4 — WRITE
   * -------------------------------------------------
   *
   * Founder Runtime creates the Contract and
   * task-dispatch enforces it before GitHub I/O.
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
    return fail(
      input,
      "write",
      writeResult.code,
      writeResult.github.error ??
        "GitHub autonomous write failed.",
    );
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
   *
   * task-dispatch already returns the real commit SHA.
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
   * PHASE 6 — READBACK
   * -------------------------------------------------
   *
   * task-dispatch performs an immediate readback,
   * but C141.12 performs an additional authoritative
   * read so the outer orchestration layer has its own
   * verification boundary.
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
    return fail(
      input,
      "readback",
      "AUTONOMOUS_READBACK_FAILED",
      readback.github.error ??
        "Autonomous readback failed.",
    );
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

      analysis,

      plan,

      write: {
        success: true,
        commitSha:
          write.commitSha,
        commitUrl:
          write.commitUrl,
        readbackVerified:
          false,
      },

      verification: {
        success: false,
        checks,
        reason:
          "The authoritative post-write file does not exactly match the proposed content.",
      },

      error:
        "Readback content mismatch.",
    };
  }

  return {
    success: true,

    code:
      "AUTONOMOUS_DEVELOPMENT_VERIFIED",

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

    analysis,

    plan,

    write: {
      success: true,
      commitSha:
        write.commitSha,
      commitUrl:
        write.commitUrl,
      readbackVerified:
        write.readbackVerified === true &&
        contentMatches,
    },

    verification: {
      success:
        write.readbackVerified === true &&
        contentMatches,

      checks,

      reason:
        "READ → PLAN → WRITE → COMMIT → READBACK → VERIFY completed successfully.",
    },
  };
}
