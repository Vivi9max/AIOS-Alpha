"use client";

type ReceiptStatusProps = {
  status?: string;
  receiptValid?: boolean;
  successfulReceipt?: boolean;
  commitSha?: string;
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
        {passed ? "PASS" : "NOT VERIFIED"}
      </span>
    </div>
  );
}

function normalizeSha(
  value?: string,
) {
  const sha =
    value?.trim() ?? "";

  return (
    sha &&
    /^[0-9a-f]{40}$/i.test(
      sha,
    )
  );
}

export default function AutonomousDevelopmentReceiptStatus({
  status,
  receiptValid,
  successfulReceipt,
  commitSha,
  readbackVerified,
  verificationPassed,
  missingEvidence = [],
}: ReceiptStatusProps) {
  const terminal =
    status === "completed" ||
    status === "failed" ||
    status === "blocked";

  const validCommit =
    normalizeSha(commitSha);

  const successful =
    successfulReceipt === true ||
    (
      status === "completed" &&
      receiptValid === true &&
      validCommit === true &&
      readbackVerified === true &&
      verificationPassed === true
    );

  const hasInvalidCompletedReceipt =
    status === "completed" &&
    !successful;

  const title =
    successful
      ? "TERMINAL RECEIPT VALID"
      : hasInvalidCompletedReceipt
        ? "TERMINAL RECEIPT INVALID"
        : terminal
          ? "TERMINAL STATE"
          : "EXECUTION EVIDENCE";

  const titleColor =
    successful
      ? "#15803d"
      : hasInvalidCompletedReceipt
        ? "#b91c1c"
        : terminal
          ? "#64748b"
          : "#1d4ed8";

  const titleBackground =
    successful
      ? "#f0fdf4"
      : hasInvalidCompletedReceipt
        ? "#fef2f2"
        : "#eff6ff";

  const titleBorder =
    successful
      ? "#bbf7d0"
      : hasInvalidCompletedReceipt
        ? "#fecaca"
        : "#bfdbfe";

  return (
    <section
      aria-label="Autonomous Development Receipt"
      style={{
        marginTop: 10,
        padding: 12,
        borderRadius: 12,
        background: "#ffffff",
        border: "1px solid #e2e8f0",
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
          {successful
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
          passed={Boolean(
            validCommit,
          )}
        />

        <StatusBadge
          label="GITHUB READBACK"
          passed={
            readbackVerified === true
          }
        />

        <StatusBadge
          label="FINAL VERIFICATION"
          passed={
            verificationPassed ===
            true
          }
        />

        <StatusBadge
          label="RECEIPT INTEGRITY"
          passed={
            receiptValid === true
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

      {missingEvidence.length >
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
            {missingEvidence.map(
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

      {successful && (
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
          terminal receipt: Git commit, GitHub
          readback, and final verification are all
          confirmed.
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
