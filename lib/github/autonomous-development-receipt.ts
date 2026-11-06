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
  checkoutRefConsistent: boolean;
  checkoutHeadConsistent: boolean;
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

function normalizeCheckoutRef(
  value?: string,
) {
  const checkoutRef =
    value?.trim() ?? "";

  return checkoutRef || undefined;
}

function isDetachedCheckoutRef(
  checkoutRef?: string,
) {
  const normalized =
    normalizeCheckoutRef(
      checkoutRef,
    );

  if (!normalized) {
    return false;
  }

  return (
    normalized === "HEAD" ||
    normalized === "head" ||
    normalized.startsWith(
      "refs/tags/",
    )
  );
}

function isBranchCheckoutRef(
  checkoutRef?: string,
) {
  const normalized =
    normalizeCheckoutRef(
      checkoutRef,
    );

  if (!normalized) {
    return false;
  }

  if (
    isDetachedCheckoutRef(
      normalized,
    )
  ) {
    return false;
  }

  return (
    normalized.startsWith(
      "refs/heads/",
    ) ||
    !/^[0-9a-f]{40}$/i.test(
      normalized,
    )
  );
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

  const expectedCommitSha =
    normalizeCommitSha(
      input.expectedCommitSha,
    );

  const checkoutRef =
    normalizeCheckoutRef(
      input.checkoutRef,
    );

  const checkoutHeadSha =
    normalizeCommitSha(
      input.checkoutHeadSha,
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

  const checkoutRefConsistent =
    !checkoutRef ||
    isBranchCheckoutRef(
      checkoutRef,
    ) ||
    isDetachedCheckoutRef(
      checkoutRef,
    );

  const checkoutHeadConsistent =
    !checkoutHeadSha ||
    isValidAutonomousDevelopmentCommitSha(
      checkoutHeadSha,
    );

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
    !isValidAutonomousDevelopmentCommitSha(
      expectedCommitSha,
    )
  ) {
    missingEvidence.push(
      "expectedCommitSha",
    );
  }

  if (
    input.status ===
      "completed" &&
    !checkoutRef
  ) {
    missingEvidence.push(
      "checkoutRef",
    );
  }

  if (
    input.status ===
      "completed" &&
    !isValidAutonomousDevelopmentCommitSha(
      checkoutHeadSha,
    )
  ) {
    missingEvidence.push(
      "checkoutHeadSha",
    );
  }

  if (
    input.status ===
      "completed" &&
    !checkoutRefConsistent
  ) {
    missingEvidence.push(
      "checkoutRefConsistency",
    );
  }

  if (
    input.status ===
      "completed" &&
    !checkoutHeadConsistent
  ) {
    missingEvidence.push(
      "checkoutHeadConsistency",
    );
  }

  if (
    input.status ===
      "completed" &&
    isValidAutonomousDevelopmentCommitSha(
      commitSha,
    ) &&
    isValidAutonomousDevelopmentCommitSha(
      expectedCommitSha,
    ) &&
    commitSha.toLowerCase() !==
      expectedCommitSha.toLowerCase()
  ) {
    missingEvidence.push(
      "expectedCommitShaConsistency",
    );
  }

  if (
    input.status ===
      "completed" &&
    isValidAutonomousDevelopmentCommitSha(
      commitSha,
    ) &&
    isValidAutonomousDevelopmentCommitSha(
      checkoutHeadSha,
    ) &&
    commitSha.toLowerCase() !==
      checkoutHeadSha.toLowerCase()
  ) {
    missingEvidence.push(
      "checkoutHeadShaConsistency",
    );
  }

  if (
    input.status ===
      "completed" &&
    isValidAutonomousDevelopmentCommitSha(
      expectedCommitSha,
    ) &&
    isValidAutonomousDevelopmentCommitSha(
      checkoutHeadSha,
    ) &&
    expectedCommitSha.toLowerCase() !==
      checkoutHeadSha.toLowerCase()
  ) {
    missingEvidence.push(
      "expectedCheckoutHeadConsistency",
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
    expectedCommitSha,
    checkoutRef,
    checkoutHeadSha,
    readbackVerified,
    verificationPassed,
    commitShaConsistent,
    checkoutRefConsistent,
    checkoutHeadConsistent,
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
