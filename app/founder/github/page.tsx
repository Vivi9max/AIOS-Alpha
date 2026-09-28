"use client";

import Link from "next/link";
import {
  useState,
} from "react";

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

type StatusMap =
  Record<
    StatusKey,
    StatusValue
  >;

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

const INITIAL_STATUS:
  StatusMap = {
    connection:
      "IDLE",
    auth:
      "IDLE",
    repo:
      "IDLE",
    read:
      "IDLE",
    write:
      "IDLE",
    commit:
      "IDLE",
    readback:
      "IDLE",
  };

const STATUS_ITEMS: {
  key: StatusKey;
  label: string;
}[] = [
  {
    key:
      "connection",
    label:
      "Connection",
  },
  {
    key:
      "auth",
    label:
      "Authentication",
  },
  {
    key:
      "repo",
    label:
      "Repository",
  },
  {
    key:
      "read",
    label:
      "READ",
  },
  {
    key:
      "write",
    label:
      "WRITE",
  },
  {
    key:
      "commit",
    label:
      "COMMIT",
  },
  {
    key:
      "readback",
    label:
      "READBACK",
  },
];

const STATUS_COLOR:
  Record<
    string,
    string
  > = {
  READY:
    "#16a34a",
  ERROR:
    "#dc2626",
  RUNNING:
    "#ea580c",
  IDLE:
    "#94a3b8",
};

export default function FounderGithubControlPage() {
  const [
    accessKey,
    setAccessKey,
  ] = useState("");

  const [
    status,
    setStatus,
  ] =
    useState<StatusMap>(
      INITIAL_STATUS,
    );

  const [
    running,
    setRunning,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    result,
    setResult,
  ] =
    useState<VerificationResult | null>(
      null,
    );

  async function handleRun() {
    const key =
      accessKey.trim();

    if (!key) {
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
      connection:
        "RUNNING",
    });

    try {
      const response =
        await fetch(
          "/api/founder/github-verify",
          {
            method:
              "POST",
            cache:
              "no-store",
            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
              Authorization:
                `Bearer ${key}`,
            },
          },
        );

      const data =
        (await response.json()) as VerificationResult;

      setResult(
        data,
      );

      const checks =
        data.checks;

      setStatus({
        connection:
          checks?.connection ===
          "PASS"
            ? "READY"
            : "ERROR",
        auth:
          checks?.authentication ===
          "PASS"
            ? "READY"
            : "ERROR",
        repo:
          checks?.repository ===
          "PASS"
            ? "READY"
            : "ERROR",
        read:
          checks?.read ===
          "PASS"
            ? "READY"
            : "ERROR",
        write:
          checks?.write ===
          "PASS"
            ? "READY"
            : "ERROR",
        commit:
          checks?.commit ===
          "PASS"
            ? "READY"
            : "ERROR",
        readback:
          checks?.readback ===
          "PASS"
            ? "READY"
            : "ERROR",
      });

      if (
        !response.ok ||
        data.success !==
          true
      ) {
        throw new Error(
          data.error ||
            "GitHub Direct Control verification failed.",
        );
      }
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "GitHub Direct Control verification failed.",
      );

      setStatus(
        (
          previous,
        ) => ({
          ...previous,
          connection:
            "ERROR",
        }),
      );
    } finally {
      setRunning(
        false,
      );
    }
  }

  return (
    <main
      style={{
        minHeight:
          "100vh",
        background:
          "#f4f6fb",
        padding:
          "24px 16px 60px",
        boxSizing:
          "border-box",
      }}
    >
      <div
        style={{
          width:
            "100%",
          maxWidth:
            760,
          margin:
            "0 auto",
        }}
      >
        <header
          style={{
            marginBottom:
              18,
          }}
        >
          <div
            style={{
              color:
                "#dc2626",
              fontSize:
                11,
              fontWeight:
                900,
              letterSpacing:
                "0.12em",
            }}
          >
            PRIVATE FOUNDER ACCESS
          </div>

          <h1
            style={{
              margin:
                "8px 0 0",
              fontSize:
                30,
              lineHeight:
                1.1,
              color:
                "#0f172a",
            }}
          >
            Founder GitHub Direct Control
          </h1>

          <p
            style={{
              margin:
                "9px 0 0",
              color:
                "#64748b",
              fontSize:
                13,
              lineHeight:
                1.6,
            }}
          >
            Founder-only control boundary for
            repository READ, WRITE, COMMIT and
            READBACK verification.
          </p>
        </header>

        <section
          style={{
            padding:
              20,
            border:
              "1px solid #dbe3f0",
            borderRadius:
              20,
            background:
              "#ffffff",
          }}
        >
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(4, 1fr)",
              gap:
                8,
              marginBottom:
                20,
            }}
          >
            {[
              "READ",
              "WRITE",
              "COMMIT",
              "READBACK",
            ].map(
              (
                item,
              ) => (
                <div
                  key={
                    item
                  }
                  style={{
                    padding:
                      "12px 8px",
                    border:
                      "1px solid #e2e8f0",
                    borderRadius:
                      12,
                    background:
                      "#f8fafc",
                    textAlign:
                      "center",
                    fontSize:
                      11,
                    fontWeight:
                      850,
                    color:
                      "#334155",
                  }}
                >
                  {item}
                </div>
              ),
            )}
          </div>

          <label
            htmlFor="founder-github-key"
            style={{
              display:
                "block",
              marginBottom:
                7,
              color:
                "#334155",
              fontSize:
                13,
              fontWeight:
                800,
            }}
          >
            Founder Access Key
          </label>

          <input
            id="founder-github-key"
            type="password"
            value={
              accessKey
            }
            onChange={(
              event,
            ) =>
              setAccessKey(
                event.target
                  .value,
              )
            }
            onKeyDown={(
              event,
            ) => {
              if (
                event.key ===
                  "Enter" &&
                !running
              ) {
                void handleRun();
              }
            }}
            autoComplete="off"
            spellCheck={false}
            placeholder="Enter Founder Access Key"
            style={{
              width:
                "100%",
              height:
                48,
              boxSizing:
                "border-box",
              padding:
                "0 13px",
              border:
                "1px solid #cbd5e1",
              borderRadius:
                12,
              fontSize:
                14,
              color:
                "#0f172a",
              background:
                "#ffffff",
            }}
          />

          <button
            type="button"
            disabled={
              running
            }
            onClick={() =>
              void handleRun()
            }
            style={{
              width:
                "100%",
              height:
                48,
              marginTop:
                12,
              border:
                "none",
              borderRadius:
                12,
              background:
                running
                  ? "#94a3b8"
                  : "#0f172a",
              color:
                "#ffffff",
              fontSize:
                14,
              fontWeight:
                850,
              cursor:
                running
                  ? "default"
                  : "pointer",
            }}
          >
            {running
              ? "Verifying..."
              : "Run Direct Control Verification"}
          </button>

          {error && (
            <div
              role="alert"
              style={{
                marginTop:
                  12,
                padding:
                  12,
                border:
                  "1px solid #fecaca",
                borderRadius:
                  12,
                background:
                  "#fef2f2",
                color:
                  "#b91c1c",
                fontSize:
                  13,
                lineHeight:
                  1.5,
              }}
            >
              {error}
            </div>
          )}
        </section>

        <section
          style={{
            marginTop:
              14,
            display:
              "grid",
            gap:
              8,
          }}
        >
          {STATUS_ITEMS.map(
            (
              item,
            ) => (
              <div
                key={
                  item.key
                }
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "space-between",
                  padding:
                    "12px 14px",
                  border:
                    "1px solid #e2e8f0",
                  borderRadius:
                    12,
                  background:
                    "#ffffff",
                }}
              >
                <span
                  style={{
                    color:
                      "#334155",
                    fontSize:
                      13,
                    fontWeight:
                      700,
                  }}
                >
                  {item.label}
                </span>

                <span
                  style={{
                    color:
                      STATUS_COLOR[
                        status[
                          item.key
                        ]
                      ],
                    fontSize:
                      11,
                    fontWeight:
                      900,
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
        </section>

        <section
          style={{
            marginTop:
              18,
            padding:
              20,
            border:
              "1px solid #dbe3f0",
            borderRadius:
              20,
            background:
              "#ffffff",
          }}
        >
          <div
            style={{
              color:
                "#94a3b8",
              fontSize:
                11,
              fontWeight:
                900,
              letterSpacing:
                "0.1em",
            }}
          >
            AUTONOMOUS RUNTIME
          </div>

          <h2
            style={{
              margin:
                "8px 0 6px",
              fontSize:
                21,
              color:
                "#0f172a",
            }}
          >
            24h Autonomous Runtime
          </h2>

          <p
            style={{
              margin:
                "0 0 16px",
              color:
                "#64748b",
              fontSize:
                13,
              lineHeight:
                1.6,
            }}
          >
            Existing Founder autonomous-development
            control plane. This page provides the
            direct entry point; continuous operation
            remains governed by the existing runtime
            and safety boundaries.
          </p>

          <div
            style={{
              display:
                "grid",
              gap:
                7,
            }}
          >
            {[
              "Research",
              "Detect",
              "Plan",
              "GitHub",
              "Verify",
              "Deploy",
              "Monitor",
              "Continue",
            ].map(
              (
                step,
                index,
              ) => (
                <div
                  key={
                    step
                  }
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap:
                      9,
                    padding:
                      "8px 10px",
                    borderRadius:
                      9,
                    background:
                      "#f8fafc",
                    color:
                      "#334155",
                    fontSize:
                      12,
                    fontWeight:
                      750,
                  }}
                >
                  <span
                    style={{
                      width:
                        7,
                      height:
                        7,
                      borderRadius:
                        "50%",
                      background:
                        "#94a3b8",
                    }}
                  />

                  {step}

                  {index <
                    7 && (
                    <span
                      style={{
                        marginLeft:
                          "auto",
                        color:
                          "#cbd5e1",
                      }}
                    >
                      →
                    </span>
                  )}
                </div>
              ),
            )}
          </div>

          <Link
            href="/founder/autonomous-development"
            style={{
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              marginTop:
                16,
              minHeight:
                46,
              padding:
                "0 14px",
              borderRadius:
                11,
              background:
                "#0f172a",
              color:
                "#ffffff",
              textDecoration:
                "none",
              fontSize:
                13,
              fontWeight:
                850,
            }}
          >
            <span>
              Open Autonomous Runtime
            </span>

            <span>
              →
            </span>
          </Link>
        </section>

        {result && (
          <section
            style={{
              marginTop:
                18,
              padding:
                18,
              border:
                result.success
                  ? "1px solid #bbf7d0"
                  : "1px solid #fecaca",
              borderRadius:
                18,
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
                fontSize:
                  17,
                color:
                  "#0f172a",
              }}
            >
              Verification Result
            </h2>

            <div
              style={{
                display:
                  "grid",
                gap:
                  7,
                fontSize:
                  12,
                color:
                  "#334155",
              }}
            >
              <div>
                <strong>
                  Status:
                </strong>{" "}
                {result.success
                  ? "PASS"
                  : "FAIL"}
              </div>

              {result.repository && (
                <div>
                  <strong>
                    Repository:
                  </strong>{" "}
                  {
                    result.repository
                  }
                </div>
              )}

              {result.branch && (
                <div>
                  <strong>
                    Branch:
                  </strong>{" "}
                  {
                    result.branch
                  }
                </div>
              )}

              {result.write
                ?.commitSha && (
                <div
                  style={{
                    wordBreak:
                      "break-all",
                  }}
                >
                  <strong>
                    Commit:
                  </strong>{" "}
                  {
                    result.write
                      .commitSha
                  }
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

              {result.commit?.url && (
                <a
                  href={
                    result.commit.url
                  }
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color:
                      "#2563eb",
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
