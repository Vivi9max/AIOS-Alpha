import "server-only";

import {
  executeFounderAutonomousDevelopment,
} from "@/lib/github/founder-autonomous-development";

const LIVE_TEST_PATH =
  "docs/c141-autonomous-development-live-test.md";

const LIVE_TEST_MARKER =
  "C141.12-D AUTONOMOUS DEVELOPMENT LIVE TEST";

export interface FounderAutonomousLiveTestResult {
  success: boolean;
  code: string;

  phase:
    | "preflight"
    | "execution"
    | "verification"
    | "completed"
    | "failed";

  path: string;

  objective: string;

  commitSha?: string;
  commitUrl?: string;

  readbackVerified?: boolean;

  checks: string[];

  error?: string;
}

function buildObjective(): string {
  return [
    "C141.12-D autonomous development live test.",
    "",
    "Modify ONLY the designated live-test document.",
    "",
    "The final file must contain the exact marker:",
    LIVE_TEST_MARKER,
    "",
    "Preserve all existing content.",
    "Do not modify any other file.",
    "Return a complete replacement file.",
  ].join("\n");
}

function validatePath(): boolean {
  return (
    LIVE_TEST_PATH ===
    "docs/c141-autonomous-development-live-test.md"
  );
}

export async function runFounderAutonomousLiveTest(): Promise<FounderAutonomousLiveTestResult> {
  const checks: string[] = [];

  /*
   * -------------------------------------------------
   * PREFLIGHT
   * -------------------------------------------------
   */

  if (!validatePath()) {
    return {
      success: false,
      code:
        "C141_LIVE_TEST_PATH_INVALID",
      phase:
        "preflight",
      path:
        LIVE_TEST_PATH,
      objective:
        buildObjective(),
      checks,
      error:
        "Live test path failed the hard-coded safety check.",
    };
  }

  checks.push(
    "fixed-test-path",
  );

  if (
    !LIVE_TEST_PATH.startsWith(
      "docs/",
    )
  ) {
    return {
      success: false,
      code:
        "C141_LIVE_TEST_PATH_OUTSIDE_DOCS",
      phase:
        "preflight",
      path:
        LIVE_TEST_PATH,
      objective:
        buildObjective(),
      checks,
      error:
        "Live test target must remain inside docs/.",
    };
  }

  checks.push(
    "docs-boundary",
  );

  /*
   * -------------------------------------------------
   * EXECUTION
   * -------------------------------------------------
   */

  const result =
    await executeFounderAutonomousDevelopment({
      objective:
        buildObjective(),

      path:
        LIVE_TEST_PATH,

      commitMessage:
        "test(C141.12-D): verify founder autonomous development loop",
    });

  if (
    !result.success
  ) {
    return {
      success: false,

      code:
        result.code,

      phase:
        result.phase ===
        "completed"
          ? "verification"
          : "execution",

      path:
        LIVE_TEST_PATH,

      objective:
        buildObjective(),

      commitSha:
        result.write
          ?.commitSha,

      commitUrl:
        result.write
          ?.commitUrl,

      readbackVerified:
        result.write
          ?.readbackVerified,

      checks,

      error:
        result.error,
    };
  }

  checks.push(
    "autonomous-execution",
  );

  /*
   * -------------------------------------------------
   * VERIFICATION
   * -------------------------------------------------
   */

  if (
    result.plan?.action !==
    "write"
  ) {
    return {
      success: false,

      code:
        "C141_LIVE_TEST_NO_WRITE",

      phase:
        "verification",

      path:
        LIVE_TEST_PATH,

      objective:
        buildObjective(),

      checks,

      error:
        "The live test did not produce a write operation.",
    };
  }

  checks.push(
    "write-planned",
  );

  if (
    !result.write
      ?.commitSha
  ) {
    return {
      success: false,

      code:
        "C141_LIVE_TEST_COMMIT_MISSING",

      phase:
        "verification",

      path:
        LIVE_TEST_PATH,

      objective:
        buildObjective(),

      checks,

      error:
        "No commit SHA was returned.",
    };
  }

  checks.push(
    "commit-sha",
  );

  if (
    result.write
      .readbackVerified !==
    true
  ) {
    return {
      success: false,

      code:
        "C141_LIVE_TEST_READBACK_FAILED",

      phase:
        "verification",

      path:
        LIVE_TEST_PATH,

      objective:
        buildObjective(),

      commitSha:
        result.write
          .commitSha,

      commitUrl:
        result.write
          .commitUrl,

      readbackVerified:
        result.write
          .readbackVerified,

      checks,

      error:
        "GitHub readback verification did not succeed.",
    };
  }

  checks.push(
    "readback-verified",
  );

  /*
   * The orchestrator has already compared the
   * authoritative GitHub readback with the generated
   * proposed content.
   *
   * This is the final C141.12-D gate.
   */
  if (
    result.verification
      ?.success !== true
  ) {
    return {
      success: false,

      code:
        "C141_LIVE_TEST_VERIFICATION_FAILED",

      phase:
        "verification",

      path:
        LIVE_TEST_PATH,

      objective:
        buildObjective(),

      commitSha:
        result.write
          ?.commitSha,

      commitUrl:
        result.write
          ?.commitUrl,

      readbackVerified:
        result.write
          ?.readbackVerified,

      checks,

      error:
        result.verification
          ?.reason ??
        "Final verification failed.",
    };
  }

  checks.push(
    "content-match",
  );

  checks.push(
    "autonomous-development-verified",
  );

  return {
    success: true,

    code:
      "C141_12_D_LIVE_TEST_VERIFIED",

    phase:
      "completed",

    path:
      LIVE_TEST_PATH,

    objective:
      buildObjective(),

    commitSha:
      result.write
        ?.commitSha,

    commitUrl:
      result.write
        ?.commitUrl,

    readbackVerified:
      true,

    checks,
  };
}
