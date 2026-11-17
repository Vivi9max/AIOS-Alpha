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
  auditState?: AutonomousDevelopmentAuditState;
  report?: string;
  reportLength?: number;
};

export type AutonomousDevelopmentAuditState =
  | "AUDIT_COMPLETE"
  | "AUDIT_BLOCKED"
  | "AUDIT_INCOMPLETE";

export type AutonomousDevelopmentAuditResultInput = {
  auditState: AutonomousDevelopmentAuditState;
  report: string;
};

export type AutonomousDevelopmentAuditResult = {
  terminal: boolean;
  successful: boolean;
  valid: boolean;
  auditState: AutonomousDevelopmentAuditState;
  report: string;
  reportLength: number;
  readbackVerified: false;
  verificationPassed: false;
  commitShaConsistent: true;
  missingEvidence: string[];
};

function isNonEmptyAuditReport(
  value: string,
) {
  return value.trim().length > 0;
}

/**
 * Builds the authoritative result for a
 * READ_ONLY_AUDIT execution.
 *
 * Audit executions never produce a Git commit,
 * never produce GitHub readback evidence, and
 * never produce build verification evidence.
 * They must not impersonate a product-development
 * terminal receipt.
 */
export function buildAuditOnlyResult(
  input: AutonomousDevelopmentAuditResultInput,
): AutonomousDevelopmentAuditResult {
  const report =
    typeof input.report === "string"
      ? input.report
      : "";

  const reportLength =
    report.length;

  const hasReport =
    isNonEmptyAuditReport(
      report,
    );

  const missingEvidence: string[] =
    [];

  if (!hasReport) {
    missingEvidence.push(
      "report",
    );
  }

  const auditState: AutonomousDevelopmentAuditState =
    hasReport
      ? input.auditState
      : "AUDIT_INCOMPLETE";

  const successful =
    auditState ===
      "AUDIT_COMPLETE" &&
    hasReport;

  return {
    terminal: true,
    successful,
    valid: hasReport,
    auditState,
    report,
    reportLength,
    readbackVerified: false,
    verificationPassed: false,
    commitShaConsistent: true,
    missingEvidence,
  };
}

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
