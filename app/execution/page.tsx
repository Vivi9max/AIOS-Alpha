"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import WorkspaceShell from "@/components/layout/WorkspaceShell";

type PlanId = "alpha" | "free" | "pro" | "business";

interface ExecutionJob {
  id: string;
  planId?: string;
  goal: string;
  input: string;
  taskId?: string;
  status: "queued" | "running" | "completed" | "failed";
  result?: string;
  error?: string;
  retryCount: number;
  verification: {
    status: "pending" | "passed" | "failed";
    message?: string;
    checkedAt: number;
  };
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  updatedAt: number;
}

interface ExecutionUsage {
  planId: PlanId;
  date: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  allowed: boolean;
  capability: "execution";
}

interface ExecutionEntitlement {
  planId: PlanId;
  capability: "execution";
  allowed: boolean;
}

interface PlannerState {
  found: boolean;
  outcome: {
    id: string;
    title: string;
    status: string;
    priority: string;
  } | null;
  nextTask: {
    id: string;
    title: string;
    description: string;
    status: "todo" | "doing" | "done";
  } | null;
  progress: number;
  completedTasks: number;
  remainingTasks: number;
  queueSize: number;
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
  entitlement?: ExecutionEntitlement;
  usage?: ExecutionUsage;
  error?: string;
  code?: string;
  message?: string;
  task?: { id: string; title: string; status: "todo" | "doing" | "done" };
  outcomeTitle?: string;
  nextTask?: PlannerState["nextTask"];
  progress?: number;
  completedTasks?: number;
  remainingTasks?: number;
  queueSize?: number;
}

const plans: [PlanId, string][] = [
  ["alpha", "Alpha"],
  ["free", "Free"],
  ["pro", "Pro"],
  ["business", "Business"],
];

const limitText = (value: number | null) =>
  value === null ? "Unlimited" : String(value);

const timeText = (value?: number) =>
  value ? new Date(value).toLocaleString() : "—";

export default function ExecutionPage() {
  const [goal, setGoal] = useState("验证 AIOS Execution Job Runtime");
  const [input, setInput] = useState(
    "请返回一句话：AIOS Execution Job Runtime 验证成功。",
  );
  const [jobs, setJobs] = useState<ExecutionJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<PlanId>("alpha");
  const [usage, setUsage] = useState<ExecutionUsage | null>(null);
  const [entitlement, setEntitlement] =
    useState<ExecutionEntitlement | null>(null);
  const [planner, setPlanner] = useState<PlannerState | null>(null);
  const [loading, setLoading] = useState(false);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [message, setMessage] = useState("");

  const selectedJob =
    jobs.find((job) => job.id === selectedJobId) ?? null;

  const blocked = useMemo(
    () =>
      (!!entitlement && !entitlement.allowed) ||
      (!!usage &&
        usage.limit !== null &&
        usage.remaining !== null &&
        usage.remaining <= 0),
    [entitlement, usage],
  );

  const apply = (data: ExecutionResponse) => {
    if (data.entitlement) setEntitlement(data.entitlement);
    if (data.usage) setUsage(data.usage);

    if (data.job) {
      setJobs((current) => {
        const exists = current.some((job) => job.id === data.job!.id);
        return exists
          ? current.map((job) =>
              job.id === data.job!.id ? data.job! : job,
            )
          : [data.job!, ...current];
      });
      setSelectedJobId(data.job.id);
    }
  };

  const loadPlanner = useCallback(async () => {
    try {
      const response = await fetch("/api/execution/planner-next", {
        cache: "no-store",
      });
      const data = (await response.json()) as PlannerState & {
        success: boolean;
      };
      if (data.success) setPlanner(data);
    } catch {
      setMessage("Unable to load Planner execution state.");
    }
  }, []);

  const loadJobs = useCallback(
    async (currentPlan: PlanId = planId) => {
      try {
        const response = await fetch(
          `/api/execution/jobs?plan=${currentPlan}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as ExecutionResponse;
        apply(data);

        if (data.success && Array.isArray(data.jobs)) {
          setJobs(data.jobs);
          setSelectedJobId((current) =>
            current && data.jobs!.some((job) => job.id === current)
              ? current
              : data.jobs![0]?.id ?? null,
          );
        } else if (!data.success) {
          setMessage(data.error ?? "Unable to load execution state.");
        }
      } catch {
        setMessage("Unable to load execution history.");
      }
    },
    [planId],
  );

  useEffect(() => {
    void loadJobs(planId);
    void loadPlanner();
  }, [loadJobs, loadPlanner, planId]);

  async function executeJob() {
    if (!goal.trim()) {
      setMessage("Please enter an execution goal.");
      return;
    }
    if (blocked) {
      setMessage(
        usage?.remaining === 0
          ? "Daily execution limit reached for this plan."
          : "Execution capability is not available for this plan.",
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/execution/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          goal: goal.trim(),
          input: input.trim() || goal.trim(),
          execute: true,
        }),
      });
      const data = (await response.json()) as ExecutionResponse;
      apply(data);
      setMessage(
        data.success
          ? "Execution completed successfully."
          : data.error ?? "Execution failed.",
      );
      void loadPlanner();
    } catch {
      setMessage("Unable to connect to the Execution API.");
    } finally {
      setLoading(false);
    }
  }

  async function executePlannerNext() {
    if (blocked) {
      setMessage(
        usage?.remaining === 0
          ? "Daily execution limit reached for this plan."
          : "Execution capability is not available for this plan.",
      );
      return;
    }

    setPlannerLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/execution/planner-next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = (await response.json()) as ExecutionResponse;
      apply(data);

      setMessage(
        data.success
          ? data.code === "PLAN_COMPLETE"
            ? "Planner queue is complete."
            : "Planner task executed and marked complete."
          : data.error ?? "Planner task execution failed.",
      );

      await loadJobs(planId);
      await loadPlanner();
    } catch {
      setMessage("Unable to connect to the Planner Execution Bridge.");
    } finally {
      setPlannerLoading(false);
    }
  }

  async function retryJob() {
    if (!selectedJob || selectedJob.status !== "failed") return;
    if (blocked) {
      setMessage(
        usage?.remaining === 0
          ? "Daily execution limit reached for this plan."
          : "Execution capability is not available for this plan.",
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/execution/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedJob.id,
          action: "retry",
          planId,
        }),
      });
      const data = (await response.json()) as ExecutionResponse;
      apply(data);
      setMessage(
        data.success
          ? "Execution retry completed."
          : data.error ?? "Retry failed.",
      );
      void loadPlanner();
    } catch {
      setMessage("Unable to retry execution.");
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
        <header style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: "#6366f1",
            }}
          >
            AIOS EXECUTION OS · C136
          </div>
          <h1
            style={{
              margin: "6px 0 0",
              fontSize: 30,
              lineHeight: 1.15,
              color: "#0f172a",
            }}
          >
            Planner → Execution Bridge
          </h1>
          <p
            style={{
              margin: "8px 0 0",
              color: "#64748b",
              fontSize: 14,
              maxWidth: 780,
            }}
          >
            The Planner can now hand its next real task to the Execution
            Runtime. A successful runtime result is written back to the task
            state and reflected in execution history.
          </p>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1.35fr) minmax(280px, .85fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 18,
              padding: 20,
              boxShadow: "0 10px 30px rgba(15,23,42,.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 14,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#334155",
                  }}
                >
                  Execution Plan
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    color: "#64748b",
                  }}
                >
                  Entitlement and daily usage remain enforced by C135.3/C135.4.
                </div>
              </div>

              <select
                value={planId}
                onChange={(event) => {
                  setPlanId(event.target.value as PlanId);
                  setUsage(null);
                  setEntitlement(null);
                  setMessage("");
                }}
                disabled={loading || plannerLoading}
                style={{
                  minWidth: 150,
                  padding: "9px 11px",
                  border: "1px solid #dbe1ea",
                  borderRadius: 9,
                  background: "#fff",
                  fontWeight: 800,
                }}
              >
                {plans.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

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
              onChange={(event) => setGoal(event.target.value)}
              maxLength={1000}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 13px",
                border: "1px solid #dbe1ea",
                borderRadius: 10,
                fontSize: 14,
              }}
            />

            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 800,
                color: "#334155",
                margin: "18px 0 7px",
              }}
            >
              Runtime Input
            </label>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={7}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 13px",
                border: "1px solid #dbe1ea",
                borderRadius: 10,
                fontSize: 14,
                lineHeight: 1.55,
                resize: "vertical",
              }}
            />

            <button
              type="button"
              onClick={() => void executeJob()}
              disabled={loading || plannerLoading || blocked}
              style={{
                width: "100%",
                marginTop: 14,
                padding: "13px 16px",
                border: 0,
                borderRadius: 11,
                background:
                  loading || plannerLoading || blocked
                    ? "#94a3b8"
                    : "#312e81",
                color: "#fff",
                fontWeight: 800,
              }}
            >
              {loading
                ? "Executing..."
                : blocked
                  ? "Execution Unavailable"
                  : "Execute Manual Job"}
            </button>

            {message ? (
              <div
                style={{
                  marginTop: 12,
                  padding: 11,
                  borderRadius: 10,
                  background: "#f8fafc",
                  color: "#475569",
                  fontSize: 13,
                }}
              >
                {message}
              </div>
            ) : null}
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div
              style={{
                background: "#0f172a",
                borderRadius: 18,
                padding: 20,
                color: "#fff",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: "#a5b4fc",
                }}
              >
                Planner Next Task
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 20,
                  fontWeight: 800,
                  lineHeight: 1.3,
                }}
              >
                {planner?.nextTask?.title ?? "No executable task"}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: "#cbd5e1",
                }}
              >
                Outcome:{" "}
                <strong style={{ color: "#fff" }}>
                  {planner?.outcome?.title ?? "—"}
                </strong>
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: "#cbd5e1",
                }}
              >
                Progress:{" "}
                <strong style={{ color: "#fff" }}>
                  {planner?.progress ?? 0}%
                </strong>
              </div>

              <button
                type="button"
                onClick={() => void executePlannerNext()}
                disabled={
                  plannerLoading ||
                  loading ||
                  blocked ||
                  !planner?.nextTask
                }
                style={{
                  width: "100%",
                  marginTop: 16,
                  padding: "12px 14px",
                  border: "1px solid #475569",
                  borderRadius: 10,
                  background:
                    plannerLoading ||
                    loading ||
                    blocked ||
                    !planner?.nextTask
                      ? "#334155"
                      : "#4f46e5",
                  color: "#fff",
                  fontWeight: 800,
                }}
              >
                {plannerLoading
                  ? "Running Planner Task..."
                  : blocked
                    ? "Planner Execution Unavailable"
                    : planner?.nextTask
                      ? "Execute Next Planner Task"
                      : "Planner Queue Complete"}
              </button>
            </div>

            <div
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 18,
                padding: 20,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: "#6366f1",
                }}
              >
                Daily Usage
              </div>
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  {usage?.used ?? 0}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: "#64748b",
                  }}
                >
                  / {limitText(usage?.limit ?? null)}
                </span>
              </div>
              <div
                style={{
                  marginTop: 7,
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                Remaining:{" "}
                <strong style={{ color: "#0f172a" }}>
                  {usage?.remaining === null
                    ? "Unlimited"
                    : usage?.remaining ?? "—"}
                </strong>
              </div>
              <div
                style={{
                  marginTop: 7,
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                Entitlement:{" "}
                <strong style={{ color: "#0f172a" }}>
                  {entitlement?.allowed ? "Allowed" : "Checking"}
                </strong>
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns:
              "minmax(0,.9fr) minmax(0,1.1fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div
            style={{
              background: "#0f172a",
              borderRadius: 18,
              padding: 20,
              color: "#fff",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: ".08em",
                textTransform: "uppercase",
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
              {selectedJob?.status ?? "idle"}
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
                <strong style={{ color: "#fff" }}>
                  {selectedJob?.verification.status ?? "pending"}
                </strong>
              </div>
              <div>
                Retry count:{" "}
                <strong style={{ color: "#fff" }}>
                  {selectedJob?.retryCount ?? 0}
                </strong>
              </div>
              <div>
                Last updated:{" "}
                <strong style={{ color: "#fff" }}>
                  {timeText(selectedJob?.updatedAt)}
                </strong>
              </div>
              {selectedJob?.taskId ? (
                <div>
                  Planner Task:{" "}
                  <strong style={{ color: "#fff" }}>
                    {selectedJob.taskId}
                  </strong>
                </div>
              ) : null}
              {selectedJob?.id ? (
                <div style={{ wordBreak: "break-all" }}>
                  Job ID: {selectedJob.id}
                </div>
              ) : null}
            </div>

            {selectedJob?.status === "failed" ? (
              <button
                type="button"
                onClick={() => void retryJob()}
                disabled={loading || blocked}
                style={{
                  marginTop: 18,
                  width: "100%",
                  padding: "11px 14px",
                  border: "1px solid #475569",
                  borderRadius: 10,
                  background: "transparent",
                  color: "#fff",
                  fontWeight: 800,
                }}
              >
                {blocked ? "Retry Unavailable" : "Retry Execution"}
              </button>
            ) : null}
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
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
                background: "#f8fafc",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 14,
                lineHeight: 1.6,
                color: "#334155",
                minHeight: 84,
              }}
            >
              {selectedJob?.result ??
                selectedJob?.error ??
                "No result yet."}
            </div>
            {selectedJob?.verification.message ? (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                Verification: {selectedJob.verification.message}
              </div>
            ) : null}
          </div>
        </section>

        <section
          style={{
            marginTop: 18,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 18,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 17,
                  color: "#0f172a",
                }}
              >
                Execution History
              </h2>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                Manual jobs and Planner-triggered jobs share the same
                execution history.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                void loadJobs(planId);
                void loadPlanner();
              }}
              disabled={loading || plannerLoading}
              style={{
                border: "1px solid #dbe1ea",
                background: "#fff",
                borderRadius: 9,
                padding: "8px 11px",
                color: "#475569",
                fontWeight: 700,
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
                background: "#f8fafc",
                color: "#64748b",
                fontSize: 13,
              }}
            >
              No execution jobs yet.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {jobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => setSelectedJobId(job.id)}
                  style={{
                    textAlign: "left",
                    border: "1px solid #e5e7eb",
                    borderRadius: 11,
                    background:
                      selectedJobId === job.id ? "#eef2ff" : "#fff",
                    padding: "12px 13px",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <strong
                      style={{
                        color: "#0f172a",
                        fontSize: 13,
                      }}
                    >
                      {job.goal}
                    </strong>
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 11,
                        fontWeight: 800,
                        color:
                          job.status === "completed"
                            ? "#15803d"
                            : job.status === "failed"
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
                      fontSize: 11,
                      color: "#64748b",
                    }}
                  >
                    {job.taskId ? `Planner Task ${job.taskId} · ` : ""}
                    Retry {job.retryCount} · Verification{" "}
                    {job.verification.status} · Updated{" "}
                    {timeText(job.updatedAt)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </WorkspaceShell>
  );
}
