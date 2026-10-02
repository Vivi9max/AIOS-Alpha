import "server-only";

export type AutonomousDevelopmentReceiptInput = {
  status:
    | "todo"
    | "running"
    | "completed"
    | "failed"
    | "blocked";
  commitSha?: string;
  resultCommitSha?: string;
  readbackVerified?: boolean;
  verificationPassed?: boolean;
};

export type AutonomousDevelopmentReceipt = {
  terminal: boolean;
  successful: boolean;
  valid: boolean;
  commitSha?: string;
  resultCommitSha?: string;
  readbackVerified: boolean;
  verificationPassed: boolean;
  commitShaConsistent: boolean;
  missingEvidence: string[];
};

const TERMINAL_STATUSES =
  new Set([
    "completed",
    "failed",
    "blocked",
  ]);

function normalizeCommitSha(
  value?: string,
) {
  const commitSha =
    value?.trim() ?? "";

  return commitSha || undefined;
}

export function isAutonomousDevelopmentTerminalStatus(
  status: string,
) {
  return TERMINAL_STATUSES.has(
    status,
  );
}

export function isValidAutonomousDevelopmentCommitSha(
  commitSha?: string,
) {
  const normalized =
    normalizeCommitSha(
      commitSha,
    );

  return Boolean(
    normalized &&
      /^[0-9a-f]{40}$/i.test(
        normalized,
      ),
  );
}

/**
 * Builds the authoritative evidence state for
 * an autonomous development execution.
 *
 * Successful completion requires:
 *
 * 1. status = completed
 * 2. a real 40-character Git commit SHA
 * 3. GitHub readback verification
 * 4. final verification/build verification
 * 5. task-level and result-level commit evidence,
 *    when both are present, must identify the same commit
 */
export function buildAutonomousDevelopmentReceipt(
  input: AutonomousDevelopmentReceiptInput,
): AutonomousDevelopmentReceipt {
  const commitSha =
    normalizeCommitSha(
      input.commitSha,
    );

  const resultCommitSha =
    normalizeCommitSha(
      input.resultCommitSha,
    );

  const readbackVerified =
    input.readbackVerified ===
    true;

  const verificationPassed =
    input.verificationPassed ===
    true;

  const terminal =
    isAutonomousDevelopmentTerminalStatus(
      input.status,
    );

  const commitShaConsistent =
    !commitSha ||
    !resultCommitSha ||
    commitSha.toLowerCase() ===
      resultCommitSha.toLowerCase();

  const missingEvidence: string[] =
    [];

  if (
    input.status ===
      "completed" &&
    !isValidAutonomousDevelopmentCommitSha(
      commitSha,
    )
  ) {
    missingEvidence.push(
      "commitSha",
    );
  }

  if (
    input.status ===
      "completed" &&
    !readbackVerified
  ) {
    missingEvidence.push(
      "readbackVerified",
    );
  }

  if (
    input.status ===
      "completed" &&
    !verificationPassed
  ) {
    missingEvidence.push(
      "verificationPassed",
    );
  }

  if (
    input.status ===
      "completed" &&
    !commitShaConsistent
  ) {
    missingEvidence.push(
      "commitShaConsistency",
    );
  }

  const successful =
    input.status ===
      "completed" &&
    missingEvidence.length ===
      0;

  return {
    terminal,
    successful,
    valid:
      terminal &&
      (input.status !==
        "completed" ||
        successful),
    commitSha,
    resultCommitSha,
    readbackVerified,
    verificationPassed,
    commitShaConsistent,
    missingEvidence,
  };
}

/**
 * Returns the canonical reason used when a task
 * claims completion without complete evidence.
 */
export function getAutonomousDevelopmentReceiptFailureReason(
  receipt: AutonomousDevelopmentReceipt,
) {
  if (
    receipt.successful ||
    receipt.missingEvidence
      .length === 0
  ) {
    return undefined;
  }

  return `AUTONOMOUS_DEVELOPMENT_COMPLETED_RECEIPT_INVALID:${receipt.missingEvidence.join(
    ",",
  )}`;
}
