import "server-only";

export type AutonomousDevelopmentExecutionMode =
  | "PRODUCT_DEVELOPMENT"
  | "READ_ONLY_AUDIT";

export type AutonomousDevelopmentAuditStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETE"
  | "INCOMPLETE"
  | "FAILED";

export type AutonomousDevelopmentReceiptInput = {
  status:
    | "todo"
    | "running"
    | "completed"
    | "failed"
    | "blocked";
  executionMode?: AutonomousDevelopmentExecutionMode;
  commitSha?: string;
  resultCommitSha?: string;
  readbackVerified?: boolean;
  verificationPassed?: boolean;
  auditReport?: string;
  auditStatus?: AutonomousDevelopmentAuditStatus;
};

export type AutonomousDevelopmentReceipt = {
  terminal: boolean;
  successful: boolean;
  valid: boolean;
  executionMode: AutonomousDevelopmentExecutionMode;
  commitSha?: string;
  resultCommitSha?: string;
  readbackVerified: boolean;
  verificationPassed: boolean;
  commitShaConsistent: boolean;
  auditReport?: string;
  auditStatus?: AutonomousDevelopmentAuditStatus;
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

function normalizeAuditReport(
  value?: string,
) {
  const report =
    value?.trim() ?? "";

  return report || undefined;
}

/**
 * Read-only audits are deliberately excluded from
 * the commit / readback / verification contract.
 * A read-only audit must never be treated as a
 * product-development completion.
 */
export function isReadOnlyAuditExecutionMode(
  executionMode?: AutonomousDevelopmentExecutionMode,
) {
  return (
    executionMode ===
    "READ_ONLY_AUDIT"
  );
}

/**
 * Builds the authoritative evidence state for
 * an autonomous development execution.
 *
 * Product development completion requires:
 *
 * 1. status = completed
 * 2. a real 40-character Git commit SHA
 * 3. GitHub readback verification
 * 4. final verification/build verification
 * 5. task-level and result-level commit evidence,
 *    when both are present, must identify the same commit
 *
 * Read-only audit completion requires:
 *
 * 1. status = completed
 * 2. executionMode = READ_ONLY_AUDIT
 * 3. auditStatus = COMPLETE
 * 4. a non-empty, Founder-readable audit report
 *
 * Read-only audit completion must not require a
 * Git commit, GitHub readback, build, or production
 * verification, and must not claim any of them.
 */
export function buildAutonomousDevelopmentReceipt(
  input: AutonomousDevelopmentReceiptInput,
): AutonomousDevelopmentReceipt {
  const executionMode =
    input.executionMode ===
    "READ_ONLY_AUDIT"
      ? "READ_ONLY_AUDIT"
      : "PRODUCT_DEVELOPMENT";

  const commitSha =
    normalizeCommitSha(
      input.commitSha,
    );

  const resultCommitSha =
    normalizeCommitSha(
      input.resultCommitSha,
    );

  const auditReport =
    normalizeAuditReport(
      input.auditReport,
    );

  const auditStatus =
    input.auditStatus;

  const isAudit =
    isReadOnlyAuditExecutionMode(
      executionMode,
    );

  const readbackVerified =
    isAudit
      ? false
      : input.readbackVerified ===
        true;

  const verificationPassed =
    isAudit
      ? false
      : input.verificationPassed ===
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
    isAudit
  ) {
    if (
      auditStatus !==
      "COMPLETE"
    ) {
      missingEvidence.push(
        "auditStatus",
      );
    }

    if (!auditReport) {
      missingEvidence.push(
        "auditReport",
      );
    }
  }

  if (
    input.status ===
      "completed" &&
    !isAudit
  ) {
    if (
      !isValidAutonomousDevelopmentCommitSha(
        commitSha,
      )
    ) {
      missingEvidence.push(
        "commitSha",
      );
    }

    if (!readbackVerified) {
      missingEvidence.push(
        "readbackVerified",
      );
    }

    if (!verificationPassed) {
      missingEvidence.push(
        "verificationPassed",
      );
    }

    if (!commitShaConsistent) {
      missingEvidence.push(
        "commitShaConsistency",
      );
    }
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
    executionMode,
    commitSha,
    resultCommitSha,
    readbackVerified,
    verificationPassed,
    commitShaConsistent,
    auditReport,
    auditStatus,
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
