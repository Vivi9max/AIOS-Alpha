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
  expectedCommitSha?: string;
  checkoutRef?: string;
  checkoutHeadSha?: string;
  readbackVerified?: boolean;
  verificationPassed?: boolean;
};

export type AutonomousDevelopmentReceipt = {
  terminal: boolean;
  successful: boolean;
  valid: boolean;
  commitSha?: string;
  resultCommitSha?: string;
  expectedCommitSha?: string;
  checkoutRef?: string;
  checkoutHeadSha?: string;
  readbackVerified: boolean;
  verificationPassed: boolean;
  commitShaConsistent: boolean;
  checkoutRefValid: boolean;
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

function isRealCheckoutRef(
  value?: string,
) {
  const checkoutRef =
    value?.trim() ?? "";

  if (!checkoutRef) {
    return false;
  }

  if (
    checkoutRef.startsWith(
      "refs/",
    )
  ) {
    return checkoutRef.length >
      "refs/".length;
  }

  if (
    /^[0-9a-f]{40}$/i.test(
      checkoutRef,
    )
  ) {
    return false;
  }

  if (
    checkoutRef ===
      "HEAD" ||
    checkoutRef.startsWith(
      "HEAD~",
    ) ||
    checkoutRef.startsWith(
      "HEAD^",
    )
  ) {
    return false;
  }

  return /^[A-Za-z0-9._\/-]+$/.test(
    checkoutRef,
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

  const expectedCommitSha =
    normalizeCommitSha(
      input.expectedCommitSha,
    );

  const checkoutHeadSha =
    normalizeCommitSha(
      input.checkoutHeadSha,
    );

  const checkoutRef =
    input.checkoutRef?.trim() ??
    "";

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

  const commitShaValid =
    isValidAutonomousDevelopmentCommitSha(
      commitSha,
    );

  const resultCommitShaValid =
    isValidAutonomousDevelopmentCommitSha(
      resultCommitSha,
    );

  const expectedCommitShaValid =
    isValidAutonomousDevelopmentCommitSha(
      expectedCommitSha,
    );

  const checkoutHeadShaValid =
    isValidAutonomousDevelopmentCommitSha(
      checkoutHeadSha,
    );

  const checkoutRefValid =
    isRealCheckoutRef(
      checkoutRef,
    );

  const commitShaConsistent =
    commitShaValid &&
    resultCommitShaValid &&
    expectedCommitShaValid &&
    checkoutHeadShaValid &&
    typeof commitSha === "string" &&
    typeof resultCommitSha === "string" &&
    typeof expectedCommitSha === "string" &&
    typeof checkoutHeadSha === "string" &&
    commitSha.toLowerCase() ===
      resultCommitSha.toLowerCase() &&
    commitSha.toLowerCase() ===
      expectedCommitSha.toLowerCase() &&
    commitSha.toLowerCase() ===
      checkoutHeadSha.toLowerCase();

  const missingEvidence: string[] =
    [];

  if (
    input.status ===
      "completed" &&
    !commitShaValid
  ) {
    missingEvidence.push(
      "commitSha",
    );
  }

  if (
    input.status ===
      "completed" &&
    !resultCommitShaValid
  ) {
    missingEvidence.push(
      "resultCommitSha",
    );
  }

  if (
    input.status ===
      "completed" &&
    !expectedCommitShaValid
  ) {
    missingEvidence.push(
      "expectedCommitSha",
    );
  }

  if (
    input.status ===
      "completed" &&
    !checkoutHeadShaValid
  ) {
    missingEvidence.push(
      "checkoutHeadSha",
    );
  }

  if (
    input.status ===
      "completed" &&
    !checkoutRefValid
  ) {
    missingEvidence.push(
      "checkoutRef",
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
    commitShaValid &&
    resultCommitShaValid &&
    expectedCommitShaValid &&
    checkoutHeadShaValid &&
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
    expectedCommitSha,
    checkoutRef:
      checkoutRef || undefined,
    checkoutHeadSha,
    readbackVerified,
    verificationPassed,
    commitShaConsistent,
    checkoutRefValid,
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
