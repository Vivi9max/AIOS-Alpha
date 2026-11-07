import "server-only";

export type AutonomousDevelopmentReceiptInput = {
  status:
    | "todo"
    | "running"
    | "completed"
    | "failed"
    | "blocked";
  commitSha?: string;
  expectedCommitSha?: string;
  resultCommitSha?: string;
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
  expectedCommitSha?: string;
  resultCommitSha?: string;
  checkoutRef?: string;
  checkoutHeadSha?: string;
  readbackVerified: boolean;
  verificationPassed: boolean;
  commitShaConsistent: boolean;
  expectedCommitShaConsistent: boolean;
  resultCommitShaConsistent: boolean;
  checkoutHeadShaConsistent: boolean;
  checkoutRefValid: boolean;
  checkoutRefIsCommitSha: boolean;
  checkoutRefIsBranchRef: boolean;
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

const GIT_REF_FORBIDDEN_CHARACTERS =
  /[\u0000-\u001f\u007f ~^:?*\[\\]/;

const GIT_REF_FORBIDDEN_SEQUENCES =
  [
    "..",
    "@{",
    "//",
  ];

const GIT_REF_FORBIDDEN_PREFIXES =
  [
    ".",
    "/",
  ];

const GIT_REF_FORBIDDEN_SUFFIXES =
  [
    ".",
    "/",
    ".lock",
  ];

const GIT_REF_FORBIDDEN_COMPONENT_PREFIXES =
  [
    ".",
  ];

const GIT_REF_FORBIDDEN_COMPONENT_SUFFIXES =
  [
    ".lock",
  ];

/**
 * Validates a Git ref using Git-compatible
 * ref semantics (see git-check-ref-format).
 *
 * Rejects:
 * - empty refs
 * - refs starting or ending with "/" or "."
 * - refs ending with ".lock"
 * - refs containing "..", "@{", "//"
 * - refs containing spaces, control characters,
 *   or any of ~ ^ : ? * [ \ characters
 * - refs with any path component starting with "."
 *   or ending with ".lock"
 */
export function isValidAutonomousDevelopmentGitRef(
  ref?: string,
) {
  const normalized =
    ref?.trim() ?? "";

  if (!normalized) {
    return false;
  }

  if (
    GIT_REF_FORBIDDEN_CHARACTERS.test(
      normalized,
    )
  ) {
    return false;
  }

  for (const sequence of GIT_REF_FORBIDDEN_SEQUENCES) {
    if (normalized.includes(sequence)) {
      return false;
    }
  }

  for (const prefix of GIT_REF_FORBIDDEN_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      return false;
    }
  }

  for (const suffix of GIT_REF_FORBIDDEN_SUFFIXES) {
    if (normalized.endsWith(suffix)) {
      return false;
    }
  }

  const components =
    normalized.split("/");

  for (const component of components) {
    if (!component) {
      return false;
    }

    for (const prefix of GIT_REF_FORBIDDEN_COMPONENT_PREFIXES) {
      if (component.startsWith(prefix)) {
        return false;
      }
    }

    for (const suffix of GIT_REF_FORBIDDEN_COMPONENT_SUFFIXES) {
      if (component.endsWith(suffix)) {
        return false;
      }
    }
  }

  return true;
}

export function isAutonomousDevelopmentBranchRef(
  ref?: string,
) {
  const normalized =
    ref?.trim() ?? "";

  if (!normalized) {
    return false;
  }

  if (
    isValidAutonomousDevelopmentCommitSha(
      normalized,
    )
  ) {
    return false;
  }

  return isValidAutonomousDevelopmentGitRef(
    normalized,
  );
}

export function isValidAutonomousDevelopmentCheckoutRef(
  ref?: string,
) {
  const normalized =
    ref?.trim() ?? "";

  if (!normalized) {
    return false;
  }

  if (
    isValidAutonomousDevelopmentCommitSha(
      normalized,
    )
  ) {
    return true;
  }

  return isValidAutonomousDevelopmentGitRef(
    normalized,
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

  const expectedCommitSha =
    normalizeCommitSha(
      input.expectedCommitSha,
    );

  const resultCommitSha =
    normalizeCommitSha(
      input.resultCommitSha,
    );

  const checkoutRef =
    normalizeCommitSha(
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

  const checkoutRefIsCommitSha =
    Boolean(
      checkoutRef &&
        isValidAutonomousDevelopmentCommitSha(
          checkoutRef,
        ),
    );

  const checkoutRefIsBranchRef =
    Boolean(
      checkoutRef &&
        !checkoutRefIsCommitSha &&
        isValidAutonomousDevelopmentGitRef(
          checkoutRef,
        ),
    );

  const checkoutRefValid =
    checkoutRefIsCommitSha ||
    checkoutRefIsBranchRef;

  const shaValues =
    [
      commitSha,
      expectedCommitSha,
      resultCommitSha,
      checkoutHeadSha,
    ];

  const allShaValuesValid =
    shaValues.every(
      (value) =>
        isValidAutonomousDevelopmentCommitSha(
          value,
        ),
    );

  const normalizedShaValues =
    shaValues
      .filter(
        (value): value is string =>
          Boolean(value),
      )
      .map((value) =>
        value.toLowerCase(),
      );

  const allShaValuesMatch =
    normalizedShaValues.length === 4 &&
    normalizedShaValues.every(
      (value) =>
        value ===
        normalizedShaValues[0],
    );

  const commitShaConsistent =
    Boolean(
      commitSha &&
        expectedCommitSha &&
        resultCommitSha &&
        checkoutHeadSha &&
        commitSha.toLowerCase() ===
          expectedCommitSha.toLowerCase() &&
        commitSha.toLowerCase() ===
          resultCommitSha.toLowerCase() &&
        commitSha.toLowerCase() ===
          checkoutHeadSha.toLowerCase(),
    );

  const expectedCommitShaConsistent =
    commitShaConsistent;

  const resultCommitShaConsistent =
    commitShaConsistent;

  const checkoutHeadShaConsistent =
    commitShaConsistent;

  const missingEvidence: string[] =
    [];

  if (input.status === "completed") {
    if (!commitSha) {
      missingEvidence.push(
        "commitSha",
      );
    }

    if (!expectedCommitSha) {
      missingEvidence.push(
        "expectedCommitSha",
      );
    }

    if (!resultCommitSha) {
      missingEvidence.push(
        "resultCommitSha",
      );
    }

    if (!checkoutRef) {
      missingEvidence.push(
        "checkoutRef",
      );
    }

    if (!checkoutHeadSha) {
      missingEvidence.push(
        "checkoutHeadSha",
      );
    }

    if (
      commitSha &&
      !isValidAutonomousDevelopmentCommitSha(
        commitSha,
      )
    ) {
      missingEvidence.push(
        "commitShaMalformed",
      );
    }

    if (
      expectedCommitSha &&
      !isValidAutonomousDevelopmentCommitSha(
        expectedCommitSha,
      )
    ) {
      missingEvidence.push(
        "expectedCommitShaMalformed",
      );
    }

    if (
      resultCommitSha &&
      !isValidAutonomousDevelopmentCommitSha(
        resultCommitSha,
      )
    ) {
      missingEvidence.push(
        "resultCommitShaMalformed",
      );
    }

    if (
      checkoutHeadSha &&
      !isValidAutonomousDevelopmentCommitSha(
        checkoutHeadSha,
      )
    ) {
      missingEvidence.push(
        "checkoutHeadShaMalformed",
      );
    }

    if (
      checkoutRef &&
      !checkoutRefValid
    ) {
      missingEvidence.push(
        "checkoutRefInvalid",
      );
    }

    if (
      allShaValuesValid &&
      !allShaValuesMatch
    ) {
      missingEvidence.push(
        "commitShaConsistency",
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
    expectedCommitSha,
    resultCommitSha,
    checkoutRef,
    checkoutHeadSha,
    readbackVerified,
    verificationPassed,
    commitShaConsistent,
    expectedCommitShaConsistent,
    resultCommitShaConsistent,
    checkoutHeadShaConsistent,
    checkoutRefValid,
    checkoutRefIsCommitSha,
    checkoutRefIsBranchRef,
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
