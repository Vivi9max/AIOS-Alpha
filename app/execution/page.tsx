"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";

interface ExecutionJob {
  id: string;
  goal: string;
  input: string;
  status:
    | "queued"
    | "running"
    | "completed"
    | "failed";
  result?: string;
  error?: string;
  retryCount: number;
  verification: {
    status:
      | "pending"
      | "passed"
      | "failed";
    message?: string;
    checkedAt: number;
  };
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  updatedAt: number;
}

interface ExecutionResponse {
  success: boolean;
  job?: ExecutionJob;
  jobs?: ExecutionJob[];
  execution?: {
    provider?: string;
    requestId?: string;
    latencyMs?: number;
    content?: string;
    capabilityTrace?: unknown[];
  } | null;
  error?: string;
  message?: string;
}

export default function ExecutionPage() {
  const [goal, setGoal] =
    useState(
      "验证 AIOS Execution Job Runtime",
    );

  const [input, setInput] =
    useState(
      "请返回一句话：AIOS Execution Job Runtime 验证成功。",
    );

  const [jobs, setJobs] =
    useState<ExecutionJob[]>(
      [],
    );

  const [selectedJob, setSelectedJob] =
    useState<ExecutionJob | null>(
      null,
    );

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const loadJobs =
    useCallback(async () => {
      try {
        const response =
          await fetch(
            "/api/execution/jobs",
            {
              cache: "no-store",
            },
          );

        const data =
          (await response.json()) as ExecutionResponse;

        if (
          data.success &&
          Array.isArray(data.jobs)
        ) {
          setJobs(data.jobs);

          if (
            selectedJob
          ) {
            const current =
              data.jobs.find(
                (job) =>
                  job.id ===
                  selectedJob.id,
              );

            if (current) {
              setSelectedJob(
                current,
              );
            }
          }
        }
      } catch {
        setMessage(
          "Unable to load execution history.",
        );
      }
    }, [selectedJob]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  async function executeJob() {
    if (!goal.trim()) {
      setMessage(
        "Please enter an execution goal.",
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/execution/jobs",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              goal:
                goal.trim(),
              input:
                input.trim() ||
                goal.trim(),
              execute: true,
            }),
          },
        );

      const data =
        (await response.json()) as ExecutionResponse;

      if (!data.success) {
        setMessage(
          data.error ??
            "Execution failed.",
        );

        if (data.job) {
          setSelectedJob(
            data.job,
          );
        }

        return;
      }

      if (data.job) {
        setSelectedJob(
          data.job,
        );
      }

      setMessage(
        "Execution completed successfully.",
      );

      await loadJobs();
    } catch {
      setMessage(
        "Unable to connect to the Execution API.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function retryJob() {
    if (
      !selectedJob ||
      selectedJob.status !==
        "failed"
    ) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/execution/jobs",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              id:
                selectedJob.id,
              action:
                "retry",
            }),
          },
        );

      const data =
        (await response.json()) as ExecutionResponse;

      if (!data.success) {
        setMessage(
          data.error ??
            "Retry failed.",
        );

        return;
      }

      if (data.job) {
        setSelectedJob(
          data.job,
        );
      }

      setMessage(
        "Execution retry completed.",
      );

      await loadJobs();
    } catch {
      setMessage(
        "Unable to retry execution.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <WorkspaceShell>
      <main
        style={{
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
          padding: "24px 20px 40px",
          boxSizing: "border-box",
        }}
      >
        <header
          style={{
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing:
                "0.08em",
              textTransform:
                "uppercase",
              color: "#6366f1",
            }}
          >
            AIOS EXECUTION OS
          </div>

          <h1
            style={{
              margin:
                "6px 0 0",
              fontSize: 30,
              lineHeight: 1.15,
              color: "#0f172a",
            }}
          >
            Execution Console
          </h1>

          <p
            style={{
              margin:
                "8px 0 0",
              color: "#64748b",
              fontSize: 14,
              maxWidth: 720,
            }}
          >
            Turn an AIOS goal into a real execution
            job, observe the runtime result, verify
            it, and recover from failures.
          </p>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1.4fr) minmax(280px, 0.8fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border:
                "1px solid #e5e7eb",
              borderRadius: 18,
              padding: 20,
              boxShadow:
                "0 10px 30px rgba(15, 23, 42, 0.06)",
            }}
          >
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 800,
                color: "#334155",
                marginBottom: 7,
              }}
            >
              Goal
            </label>

            <input
              value={goal}
              onChange={(event) =>
                setGoal(
                  event.target.value,
                )
              }
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding:
                  "12px 13px",
                border:
                  "1px solid #dbe1ea",
                borderRadius: 10,
                fontSize: 14,
                outline: "none",
              }}
              maxLength={1000}
            />

            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 800,
                color: "#334155",
                margin:
                  "18px 0 7px",
              }}
            >
              Runtime Input
            </label>

            <textarea
              value={input}
              onChange={(event) =>
                setInput(
                  event.target.value,
                )
              }
              rows={7}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding:
                  "12px 13px",
                border:
                  "1px solid #dbe1ea",
                borderRadius: 10,
                fontSize: 14,
                lineHeight: 1.55,
                resize: "vertical",
                outline: "none",
              }}
            />

            <button
              type="button"
              onClick={() =>
                void executeJob()
              }
              disabled={loading}
              style={{
                width: "100%",
                marginTop: 14,
                padding:
                  "13px 16px",
                border: 0,
                borderRadius: 11,
                background:
                  loading
                    ? "#94a3b8"
                    : "#312e81",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: 14,
                cursor:
                  loading
                    ? "wait"
                    : "pointer",
              }}
            >
              {loading
                ? "Executing..."
                : "Execute Job"}
            </button>

            {message ? (
              <div
                style={{
                  marginTop: 12,
                  padding: 11,
                  borderRadius: 10,
                  background:
                    "#f8fafc",
                  color: "#475569",
                  fontSize: 13,
                }}
              >
                {message}
              </div>
            ) : null}
          </div>

          <div
            style={{
              background: "#0f172a",
              borderRadius: 18,
              padding: 20,
              color: "#ffffff",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing:
                  "0.08em",
                textTransform:
                  "uppercase",
                color: "#a5b4fc",
              }}
            >
              Runtime Status
            </div>

            <div
              style={{
                marginTop: 12,
                fontSize: 26,
                fontWeight: 800,
              }}
            >
              {selectedJob?.status ??
                "idle"}
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gap: 9,
                fontSize: 13,
                color: "#cbd5e1",
              }}
            >
              <div>
                Verification:{" "}
                <strong
                  style={{
                    color:
                      "#ffffff",
                  }}
                >
                  {selectedJob
                    ?.verification
                    .status ??
                    "pending"}
                </strong>
              </div>

              <div>
                Retry count:{" "}
                <strong
                  style={{
                    color:
                      "#ffffff",
                  }}
                >
                  {selectedJob
                    ?.retryCount ??
                    0}
                </strong>
              </div>

              {selectedJob?.id ? (
                <div
                  style={{
                    wordBreak:
                      "break-all",
                  }}
                >
                  Job ID:{" "}
                  {selectedJob.id}
                </div>
              ) : null}
            </div>

            {selectedJob?.status ===
            "failed" ? (
              <button
                type="button"
                onClick={() =>
                  void retryJob()
                }
                disabled={loading}
                style={{
                  marginTop: 18,
                  width: "100%",
                  padding:
                    "11px 14px",
                  border:
                    "1px solid #475569",
                  borderRadius: 10,
                  background:
                    "transparent",
                  color: "#ffffff",
                  fontWeight: 800,
                  cursor:
                    loading
                      ? "wait"
                      : "pointer",
                }}
              >
                Retry Execution
              </button>
            ) : null}
          </div>
        </section>

        {selectedJob ? (
          <section
            style={{
              marginTop: 18,
              background:
                "#ffffff",
              border:
                "1px solid #e5e7eb",
              borderRadius: 18,
              padding: 20,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 17,
                color: "#0f172a",
              }}
            >
              Latest Result
            </h2>

            <div
              style={{
                marginTop: 12,
                padding: 14,
                borderRadius: 12,
                background:
                  "#f8fafc",
                whiteSpace:
                  "pre-wrap",
                wordBreak:
                  "break-word",
                fontSize: 14,
                lineHeight: 1.6,
                color: "#334155",
              }}
            >
              {selectedJob.result ??
                selectedJob.error ??
                "No result yet."}
            </div>

            {selectedJob
              .verification
              .message ? (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                Verification:{" "}
                {
                  selectedJob
                    .verification
                    .message
                }
              </div>
            ) : null}
          </section>
        ) : null}

        <section
          style={{
            marginTop: 18,
            background:
              "#ffffff",
            border:
              "1px solid #e5e7eb",
            borderRadius: 18,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 17,
                color: "#0f172a",
              }}
            >
              Execution History
            </h2>

            <button
              type="button"
              onClick={() =>
                void loadJobs()
              }
              style={{
                border:
                  "1px solid #dbe1ea",
                background:
                  "#ffffff",
                borderRadius: 9,
                padding:
                  "8px 11px",
                color: "#475569",
                fontWeight: 700,
                cursor:
                  "pointer",
              }}
            >
              Refresh
            </button>
          </div>

          {jobs.length === 0 ? (
            <div
              style={{
                padding: 22,
                borderRadius: 12,
                background:
                  "#f8fafc",
                color: "#64748b",
                fontSize: 13,
              }}
            >
              No execution jobs yet.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              {jobs.map(
                (job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() =>
                      setSelectedJob(
                        job,
                      )
                    }
                    style={{
                      textAlign:
                        "left",
                      border:
                        "1px solid #e5e7eb",
                      borderRadius: 11,
                      background:
                        selectedJob
                          ?.id ===
                        job.id
                          ? "#eef2ff"
                          : "#ffffff",
                      padding:
                        "12px 13px",
                      cursor:
                        "pointer",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap: 10,
                      }}
                    >
                      <strong
                        style={{
                          color:
                            "#0f172a",
                          fontSize:
                            13,
                        }}
                      >
                        {job.goal}
                      </strong>

                      <span
                        style={{
                          flexShrink: 0,
                          fontSize:
                            11,
                          fontWeight:
                            800,
                          color:
                            job.status ===
                            "completed"
                              ? "#15803d"
                              : job.status ===
                                  "failed"
                                ? "#b91c1c"
                                : "#475569",
                        }}
                      >
                        {job.status}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 5,
                        fontSize:
                          11,
                        color:
                          "#64748b",
                      }}
                    >
                      Retry{" "}
                      {job.retryCount}
                      {" · "}
                      Verification{" "}
                      {
                        job
                          .verification
                          .status
                      }
                    </div>
                  </button>
                ),
              )}
            </div>
          )}
        </section>
      </main>
    </WorkspaceShell>
  );
}
