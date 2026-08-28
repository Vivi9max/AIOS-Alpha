"use client";

import { useState } from "react";

type StatusKey =
  | "connection"
  | "auth"
  | "repo"
  | "read"
  | "write"
  | "commit"
  | "readback";

type StatusValue =
  | "READY"
  | "ERROR"
  | "RUNNING"
  | "IDLE";

type StatusMap = Record<StatusKey, StatusValue>;

type VerificationResult = {
  success?: boolean;
  phase?: string;
  code?: string;
  error?: string;
  repository?: string;
  branch?: string;
  timestamp?: string;
  durationMs?: number;
  checks?: {
    connection?: string;
    authentication?: string;
    repository?: string;
    read?: string;
    write?: string;
    commit?: string;
    readback?: string;
  };
  read?: {
    sha?: string;
    size?: number;
  };
  write?: {
    sha?: string;
    commitSha?: string;
    commitUrl?: string;
    readbackVerified?: boolean;
  };
  commit?: {
    sha?: string;
    url?: string;
  };
};

const INITIAL_STATUS: StatusMap = {
  connection: "IDLE",
  auth: "IDLE",
  repo: "IDLE",
  read: "IDLE",
  write: "IDLE",
  commit: "IDLE",
  readback: "IDLE",
};

const STATUS_ITEMS: {
  key: StatusKey;
  label: string;
}[] = [
  {
    key: "connection",
    label: "C141 Verification Connection",
  },
  {
    key: "auth",
    label: "GitHub Authentication",
  },
  {
    key: "repo",
    label: "Repository Access",
  },
  {
    key: "read",
    label: "READ",
  },
  {
    key: "write",
    label: "WRITE",
  },
  {
    key: "commit",
    label: "COMMIT",
  },
  {
    key: "readback",
    label: "READBACK",
  },
];

const STATUS_COLOR: Record<string, string> = {
  READY: "#16a34a",
  ERROR: "#dc2626",
  RUNNING: "#ea580c",
  IDLE: "#9ca3af",
};

export default function C141GithubLiveVerification() {
  const [accessKey, setAccessKey] = useState("");

  const [status, setStatus] =
    useState<StatusMap>(INITIAL_STATUS);

  const [running, setRunning] = useState(false);

  const [error, setError] = useState("");

  const [result, setResult] =
    useState<VerificationResult | null>(null);

  const handleRun = async () => {
    const normalizedKey =
      accessKey.trim();

    if (!normalizedKey) {
      setError(
        "请输入 Founder Access Key",
      );
      return;
    }

    setRunning(true);
    setError("");
    setResult(null);

    setStatus({
      ...INITIAL_STATUS,
      connection: "RUNNING",
    });

    try {
      const response = await fetch(
        "/api/founder/github-verify",
        {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
            Authorization:
              `Bearer ${normalizedKey}`,
          },
        },
      );

      const data =
        (await response.json()) as VerificationResult;

      setResult(data);

      const checks = data.checks;

      setStatus({
        connection:
          checks?.connection === "PASS"
            ? "READY"
            : "ERROR",

        auth:
          checks?.authentication === "PASS"
            ? "READY"
            : "ERROR",

        repo:
          checks?.repository === "PASS"
            ? "READY"
            : "ERROR",

        read:
          checks?.read === "PASS"
            ? "READY"
            : "ERROR",

        write:
          checks?.write === "PASS"
            ? "READY"
            : "ERROR",

        commit:
          checks?.commit === "PASS"
            ? "READY"
            : "ERROR",

        readback:
          checks?.readback === "PASS"
            ? "READY"
            : "ERROR",
      });

      if (!response.ok) {
        throw new Error(
          data.error ||
            "C141 Live Verification failed.",
        );
      }

      if (data.success !== true) {
        throw new Error(
          data.error ||
            "C141 Live Verification failed.",
        );
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "C141 Live Verification failed.";

      setError(message);

      setStatus((previous) => ({
        ...previous,
        connection: "ERROR",
      }));
    } finally {
      setRunning(false);
    }
  };

  const getStatusColor = (
    value: string,
  ) =>
    STATUS_COLOR[value] ||
    STATUS_COLOR.IDLE;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#fafafa",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          background: "#fff",
          border:
            "1px solid #e5e5e5",
          borderRadius: 12,
          padding: 32,
          boxShadow:
            "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing:
                "0.05em",
              color: "#dc2626",
              border:
                "1px solid #dc2626",
              borderRadius: 4,
              padding:
                "2px 8px",
            }}
          >
            FOUNDER ONLY
          </span>
        </div>

        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            margin:
              "0 0 4px",
            color: "#111",
          }}
        >
          C141 LIVE VERIFICATION
        </h1>

        <p
          style={{
            fontSize: 13,
            color: "#666",
            margin:
              "0 0 24px",
            lineHeight: 1.5,
          }}
        >
          GitHub Direct Bridge
          真实验证：AIOS Alpha
          Production →
          GitHub Authentication →
          Founder Contract →
          READ → WRITE → COMMIT →
          READBACK
        </p>

        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
            color: "#333",
          }}
        >
          Founder Access Key
        </label>

        <input
          type="password"
          placeholder="Enter your Founder Access Key"
          value={accessKey}
          onChange={(event) =>
            setAccessKey(
              event.target.value,
            )
          }
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !running
            ) {
              void handleRun();
            }
          }}
          autoComplete="off"
          style={{
            width: "100%",
            padding:
              "10px 12px",
            border:
              "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: 14,
            outline: "none",
            boxSizing:
              "border-box",
          }}
        />

        <button
          type="button"
          onClick={() =>
            void handleRun()
          }
          disabled={running}
          style={{
            width: "100%",
            marginTop: 12,
            padding:
              "12px 16px",
            background:
              running
                ? "#6b7280"
                : "#111",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor:
              running
                ? "not-allowed"
                : "pointer",
          }}
        >
          {running
            ? "Running C141 Live Test..."
            : "Run C141 Live Test"}
        </button>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding:
                "10px 12px",
              border:
                "1px solid #fecaca",
              borderRadius: 8,
              background:
                "#fef2f2",
              color: "#dc2626",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            marginTop: 28,
            borderTop:
              "1px solid #e5e5e5",
            paddingTop: 16,
          }}
        >
          {STATUS_ITEMS.map(
            (item) => (
              <div
                key={item.key}
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  padding:
                    "8px 0",
                  fontSize: 13,
                  borderBottom:
                    "1px solid #f3f4f6",
                }}
              >
                <span
                  style={{
                    color: "#333",
                  }}
                >
                  {item.label}
                </span>

                <span
                  style={{
                    fontWeight: 700,
                    color:
                      getStatusColor(
                        status[
                          item.key
                        ],
                      ),
                  }}
                >
                  {
                    status[
                      item.key
                    ]
                  }
                </span>
              </div>
            ),
          )}
        </div>

        {result && (
          <section
            style={{
              marginTop: 24,
              border:
                "1px solid #e5e7eb",
              borderRadius: 10,
              padding: 16,
              background:
                result.success
                  ? "#f0fdf4"
                  : "#fef2f2",
            }}
          >
            <h2
              style={{
                margin:
                  "0 0 12px",
                fontSize: 15,
                fontWeight: 700,
                color: "#111",
              }}
            >
              C141 LIVE RESULT
            </h2>

            <div
              style={{
                display: "grid",
                gap: 8,
                fontSize: 13,
              }}
            >
              <div>
                <strong>Status:</strong>{" "}
                {result.success
                  ? "PASS"
                  : "FAIL"}
              </div>

              {result.phase && (
                <div>
                  <strong>Phase:</strong>{" "}
                  {result.phase}
                </div>
              )}

              {result.code && (
                <div>
                  <strong>Code:</strong>{" "}
                  {result.code}
                </div>
              )}

              {result.repository && (
                <div>
                  <strong>Repository:</strong>{" "}
                  {result.repository}
                </div>
              )}

              {result.branch && (
                <div>
                  <strong>Branch:</strong>{" "}
                  {result.branch}
                </div>
              )}

              {result.read?.sha && (
                <div
                  style={{
                    wordBreak:
                      "break-all",
                  }}
                >
                  <strong>Read SHA:</strong>{" "}
                  {result.read.sha}
                </div>
              )}

              {result.write?.commitSha && (
                <div
                  style={{
                    wordBreak:
                      "break-all",
                  }}
                >
                  <strong>Commit SHA:</strong>{" "}
                  {result.write.commitSha}
                </div>
              )}

              {result.write
                ?.readbackVerified !==
                undefined && (
                <div>
                  <strong>
                    Readback:
                  </strong>{" "}
                  {result.write
                    .readbackVerified
                    ? "VERIFIED"
                    : "FAILED"}
                </div>
              )}

              {result.durationMs !==
                undefined && (
                <div>
                  <strong>
                    Duration:
                  </strong>{" "}
                  {result.durationMs} ms
                </div>
              )}

              {result.timestamp && (
                <div
                  style={{
                    wordBreak:
                      "break-all",
                  }}
                >
                  <strong>
                    Timestamp:
                  </strong>{" "}
                  {result.timestamp}
                </div>
              )}

              {result.commit?.url && (
                <a
                  href={
                    result.commit.url
                  }
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    marginTop: 4,
                    color: "#2563eb",
                    textDecoration:
                      "underline",
                  }}
                >
                  Open GitHub Commit
                </a>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
