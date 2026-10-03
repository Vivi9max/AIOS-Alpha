"use client";

type ReceiptStatusProps = {
  status?: string;
  receiptValid?: boolean;
  successfulReceipt?: boolean;
  commitSha?: string;
  resultCommitSha?: string;
  commitShaConsistent?: boolean;
  readbackVerified?: boolean;
  verificationPassed?: boolean;
  missingEvidence?: string[];
};

function StatusBadge({
  label,
  passed,
}: {
  label: string;
  passed: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "8px 9px",
        borderRadius: 8,
        background: passed
          ? "#f0fdf4"
          : "#fef2f2",
        border: passed
          ? "1px solid #bbf7d0"
          : "1px solid #fecaca",
      }}
    >
      <span
        style={{
          color: "#64748b",
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </span>

      <span
        style={{
          color: passed
            ? "#15803d"
            : "#b91c1c",
          fontSize: 10,
          fontWeight: 900,
        }}
      >
        {passed
          ? "PASS"
          : "NOT VERIFIED"}
      </span>
    </div>
  );
}

function isValidCommitSha(
  value?: string,
) {
  const normalized =
    value?.trim() ?? "";

  return (
    normalized.length === 40 &&
    /^[0-9a-f]{40}$/i.test(
      normalized,
    )
  );
}

function resolveCommitConsistency(
  commitSha?: string,
  resultCommitSha?: string,
  commitShaConsistent?: boolean,
) {
  const normalizedCommitSha =
    commitSha?.trim() ?? "";

  const normalizedResultCommitSha =
    resultCommitSha?.trim() ?? "";

  /*
   * When both commit values are present, the actual
   * SHA values are authoritative.
   *
   * A stale boolean from an older receipt must never
   * override the real commit evidence.
   */
  if (
    normalizedCommitSha &&
    normalizedResultCommitSha
  ) {
    return (
      normalizedCommitSha.toLowerCase() ===
      normalizedResultCommitSha.toLowerCase()
    );
  }

  /*
   * If both commit values are unavailable, preserve
   * the supplied state only for non-completed tasks.
   *
   * Completed tasks must provide both commit evidences.
   */
  if (
    typeof commitShaConsistent ===
    "boolean"
  ) {
    return commitShaConsistent;
  }

  return false;
}

export default function AutonomousDevelopmentReceiptStatus({
  status,
  receiptValid,
  successfulReceipt,
  commitSha,
  resultCommitSha,
  commitShaConsistent,
  readbackVerified,
  verificationPassed,
  missingEvidence = [],
}: ReceiptStatusProps) {
  const terminal =
    status === "completed" ||
    status === "failed" ||
    status === "blocked";

  const validCommit =
    isValidCommitSha(
      commitSha,
    );

  const validResultCommit =
    isValidCommitSha(
      resultCommitSha,
    );

  /*
   * Canonical terminal evidence.
   *
   * These values are deliberately derived from the
   * actual evidence passed into this component instead
   * of trusting receiptValid/successfulReceipt booleans.
   *
   * This prevents an old persisted receipt flag such as
   * receiptValid=false from masking a currently valid
   * execution evidence chain.
   */
  const consistency =
    resolveCommitConsistency(
      commitSha,
      resultCommitSha,
      commitShaConsistent,
    );

  const readbackPassed =
    readbackVerified === true;

  const verificationPassedValue =
    verificationPassed === true;

  const canonicalEvidenceComplete =
    validCommit &&
    validResultCommit &&
    consistency &&
    readbackPassed &&
    verificationPassedValue;

  /*
   * For a completed task, Receipt Integrity is derived
   * entirely from the complete evidence chain.
   *
   * The legacy receiptValid value is intentionally not
   * allowed to downgrade a receipt that has complete
   * current evidence.
   *
   * For non-completed states, receiptValid can still be
   * displayed as supplied by the server because a task
   * has not yet reached its terminal evidence boundary.
   */
  const effectiveReceiptValid =
    status === "completed"
      ? canonicalEvidenceComplete
      : receiptValid === true;

  /*
   * Successful Receipt follows the same canonical rule.
   *
   * A completed task is successful only when all terminal
   * evidence is present and consistent.
   */
  const effectiveSuccessfulReceipt =
    status === "completed"
      ? canonicalEvidenceComplete
      : successfulReceipt === true;

  const hasInvalidCompletedReceipt =
    status === "completed" &&
    !effectiveSuccessfulReceipt;

  const title =
    effectiveSuccessfulReceipt
      ? "TERMINAL RECEIPT VALID"
      : hasInvalidCompletedReceipt
        ? "TERMINAL RECEIPT INVALID"
        : terminal
          ? "TERMINAL STATE"
          : "EXECUTION EVIDENCE";

  const titleColor =
    effectiveSuccessfulReceipt
      ? "#15803d"
      : hasInvalidCompletedReceipt
        ? "#b91c1c"
        : terminal
          ? "#64748b"
          : "#1d4ed8";

  const titleBackground =
    effectiveSuccessfulReceipt
      ? "#f0fdf4"
      : hasInvalidCompletedReceipt
        ? "#fef2f2"
        : "#eff6ff";

  const titleBorder =
    effectiveSuccessfulReceipt
      ? "#bbf7d0"
      : hasInvalidCompletedReceipt
        ? "#fecaca"
        : "#bfdbfe";

  const derivedMissingEvidence =
    status === "completed"
      ? [
          ...new Set([
            ...missingEvidence,
            ...(!validCommit
              ? ["commitSha"]
              : []),
            ...(!validResultCommit
              ? ["resultCommitSha"]
              : []),
            ...(!consistency
              ? ["commitShaConsistency"]
              : []),
            ...(!readbackPassed
              ? ["readbackVerified"]
              : []),
            ...(!verificationPassedValue
              ? ["verificationPassed"]
              : []),
          ]),
        ]
      : missingEvidence;

  return (
    <section
      aria-label="Autonomous Development Receipt"
      style={{
        marginTop: 10,
        padding: 12,
        borderRadius: 12,
        background: "#ffffff",
        border:
          "1px solid #e2e8f0",
      }}
    >
      <div
        style={{
          padding: 10,
          borderRadius: 10,
          background:
            titleBackground,
          border:
            `1px solid ${titleBorder}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              color: titleColor,
              fontSize: 10,
              fontWeight: 900,
              letterSpacing:
                "0.08em",
            }}
          >
            {title}
          </div>

          <div
            style={{
              color: titleColor,
              fontSize: 10,
              fontWeight: 850,
            }}
          >
            {status
              ? status.toUpperCase()
              : "UNKNOWN"}
          </div>
        </div>

        <div
          style={{
            marginTop: 5,
            color: "#64748b",
            fontSize: 10,
            lineHeight: 1.5,
          }}
        >
          {effectiveSuccessfulReceipt
            ? "AIOS has a complete terminal evidence chain."
            : hasInvalidCompletedReceipt
              ? "Completed status was reported, but the required terminal evidence is incomplete."
              : terminal
                ? "AIOS reached a terminal state."
                : "AIOS is still building the terminal evidence chain."}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
          gap: 7,
          marginTop: 9,
        }}
      >
        <StatusBadge
          label="COMMIT SHA"
          passed={validCommit}
        />

        <StatusBadge
          label="RESULT COMMIT"
          passed={
            validResultCommit
          }
        />

        <StatusBadge
          label="COMMIT CONSISTENCY"
          passed={consistency}
        />

        <StatusBadge
          label="GITHUB READBACK"
          passed={
            readbackPassed
          }
        />

        <StatusBadge
          label="FINAL VERIFICATION"
          passed={
            verificationPassedValue
          }
        />

        <StatusBadge
          label="RECEIPT INTEGRITY"
          passed={
            effectiveReceiptValid
          }
        />
      </div>

      {validCommit && (
        <div
          style={{
            marginTop: 9,
            padding: 9,
            borderRadius: 8,
            background: "#f8fafc",
            border:
              "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              color: "#94a3b8",
              fontSize: 9,
              fontWeight: 850,
              letterSpacing:
                "0.08em",
            }}
          >
            VERIFIED COMMIT
          </div>

          <div
            style={{
              marginTop: 4,
              color: "#334155",
              fontSize: 10,
              lineHeight: 1.4,
              fontFamily:
                "monospace",
              overflowWrap:
                "anywhere",
            }}
          >
            {commitSha}
          </div>
        </div>
      )}

      {validResultCommit && (
        <div
          style={{
            marginTop: 7,
            padding: 9,
            borderRadius: 8,
            background: "#f8fafc",
            border:
              "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              color: "#94a3b8",
              fontSize: 9,
              fontWeight: 850,
              letterSpacing:
                "0.08em",
            }}
          >
            RESULT COMMIT SHA
          </div>

          <div
            style={{
              marginTop: 4,
              color: "#334155",
              fontSize: 10,
              lineHeight: 1.4,
              fontFamily:
                "monospace",
              overflowWrap:
                "anywhere",
            }}
          >
            {resultCommitSha}
          </div>
        </div>
      )}

      {!consistency && (
        <div
          style={{
            marginTop: 9,
            padding: 9,
            borderRadius: 8,
            background: "#fef2f2",
            border:
              "1px solid #fecaca",
            color: "#991b1b",
            fontSize: 10,
            fontWeight: 800,
            lineHeight: 1.5,
          }}
        >
          AIOS detected a commit SHA mismatch
          between the task record and the final
          execution result. This receipt cannot
          be considered valid until the commit
          evidence is consistent.
        </div>
      )}

      {derivedMissingEvidence.length >
        0 && (
        <div
          style={{
            marginTop: 9,
            padding: 9,
            borderRadius: 8,
            background: "#fff7f7",
            border:
              "1px solid #fecaca",
          }}
        >
          <div
            style={{
              color: "#b91c1c",
              fontSize: 9,
              fontWeight: 900,
              letterSpacing:
                "0.08em",
            }}
          >
            MISSING RECEIPT EVIDENCE
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 5,
              marginTop: 6,
            }}
          >
            {derivedMissingEvidence.map(
              (item) => (
                <span
                  key={item}
                  style={{
                    padding:
                      "4px 7px",
                    borderRadius: 6,
                    background:
                      "#fee2e2",
                    color: "#991b1b",
                    fontSize: 9,
                    fontWeight: 800,
                  }}
                >
                  {item}
                </span>
              ),
            )}
          </div>
        </div>
      )}

      {effectiveSuccessfulReceipt && (
        <div
          style={{
            marginTop: 9,
            padding: 9,
            borderRadius: 8,
            background: "#f0fdf4",
            border:
              "1px solid #bbf7d0",
            color: "#166534",
            fontSize: 10,
            fontWeight: 750,
            lineHeight: 1.5,
          }}
        >
          AIOS Autonomous Development has a valid
          terminal receipt: Git commit, result
          commit, GitHub readback, commit
          consistency, and final verification are
          all confirmed.
        </div>
      )}

      {hasInvalidCompletedReceipt && (
        <div
          style={{
            marginTop: 9,
            padding: 9,
            borderRadius: 8,
            background: "#fef2f2",
            border:
              "1px solid #fecaca",
            color: "#991b1b",
            fontSize: 10,
            fontWeight: 750,
            lineHeight: 1.5,
          }}
        >
          AIOS must not treat this task as a
          successful delivery until the missing
          terminal evidence is restored.
        </div>
      )}
    </section>
  );
}
