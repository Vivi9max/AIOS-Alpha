"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { CSSProperties } from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";

type PlanId =
  | "alpha"
  | "free"
  | "pro"
  | "business";

type JobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

type TaskStatus =
  | "todo"
  | "doing"
  | "done";

interface ExecutionJob {
  id: string;
  planId?: string;
  goal: string;
  input: string;
  taskId?: string;
  status: JobStatus;
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

interface Usage {
  planId: PlanId;
  date: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  allowed: boolean;
  capability: "execution";
}

interface Entitlement {
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
    status: TaskStatus;
  } | null;
  progress: number;
  completedTasks: number;
  remainingTasks: number;
  queueSize: number;
}

interface ApiResponse {
  success: boolean;
  code?: string;
  error?: string;
  message?: string;
  job?: ExecutionJob;
  jobs?: ExecutionJob[];
  usage?: Usage;
  entitlement?: Entitlement;
  task?: {
    id: string;
    title: string;
    status: TaskStatus;
  };
  nextTask?: PlannerState["nextTask"];
  progress?: number;
  completedTasks?: number;
  remainingTasks?: number;
  queueSize?: number;
}

const plans: [
  PlanId,
  string,
][] = [
  ["alpha", "Alpha"],
  ["free", "Free"],
  ["pro", "Pro"],
  ["business", "Business"],
];

function limitText(
  value:
    | number
    | null
    | undefined,
) {
  if (value === null) {
    return "Unlimited";
  }

  if (value === undefined) {
    return "—";
  }

  return String(value);
}

function timeText(
  value?: number,
) {
  if (!value) {
    return "—";
  }

  return new Date(
    value,
  ).toLocaleString();
}

function plannerFromLegacy(
  data: any,
): PlannerState {
  const execution =
    data?.execution ??
    {};

  const task =
    execution.nextTask ??
    null;

  return {
    found: Boolean(
      data?.success &&
        data?.outcome,
    ),

    outcome: data?.outcome
      ? {
          id:
            data.outcome.id,
          title:
            data.outcome.title,
          status:
            data.outcome.status,
          priority:
            data.outcome.priority,
        }
      : null,

    nextTask: task
      ? {
          id: task.id,
          title:
            task.title,
          description:
            task.description ??
            "",
          status:
            task.status,
        }
      : null,

    progress:
      execution.progress ??
      0,

    completedTasks:
      execution.completedTasks ??
      0,

    remainingTasks:
      execution.remainingTasks ??
      0,

    queueSize:
      execution.queueSize ??
      execution.queue
        ?.length ??
      0,
  };
}

export default function ExecutionPage() {
  const [
    planId,
    setPlanId,
  ] = useState<PlanId>(
    "alpha",
  );

  const [goal, setGoal] =
    useState(
      "验证 AIOS Execution Job Runtime",
    );

  const [input, setInput] =
    useState(
      "请返回一句话：AIOS Execution Job Runtime 验证成功。",
    );

  const [
    jobs,
    setJobs,
  ] = useState<
    ExecutionJob[]
  >([]);

  const [
    selectedJobId,
    setSelectedJobId,
  ] = useState<
    string | null
  >(null);

  const [
    usage,
    setUsage,
  ] = useState<Usage | null>(
    null,
  );

  const [
    entitlement,
    setEntitlement,
  ] =
    useState<Entitlement | null>(
      null,
    );

  const [
    planner,
    setPlanner,
  ] =
    useState<PlannerState | null>(
      null,
    );

  const [loading, setLoading] =
    useState(false);

  const [
    plannerLoading,
    setPlannerLoading,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const selectedJob =
    jobs.find(
      (job) =>
        job.id ===
        selectedJobId,
    ) ?? null;

  const blocked =
    useMemo(
      () =>
        Boolean(
          entitlement &&
            !entitlement.allowed,
        ) ||
        Boolean(
          usage &&
            usage.limit !==
              null &&
            (usage.remaining ??
              0) <= 0,
        ),
      [
        entitlement,
        usage,
      ],
    );

  const apply =
    useCallback(
      (data: ApiResponse) => {
        if (data.entitlement) {
          setEntitlement(
            data.entitlement,
          );
        }

        if (data.usage) {
          setUsage(
            data.usage,
          );
        }

        if (data.job) {
          setJobs(
            (current) =>
              current.some(
                (item) =>
                  item.id ===
                  data.job!.id,
              )
                ? current.map(
                    (item) =>
                      item.id ===
                      data.job!.id
                        ? data.job!
                        : item,
                  )
                : [
                    data.job!,
                    ...current,
                  ],
          );

          setSelectedJobId(
            data.job.id,
          );
        }
      },
      [],
    );

  const loadPlanner =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              "/api/planner/execute",
              {
                cache:
                  "no-store",
              },
            );

          const raw =
            await response.text();

          let data: any;

          try {
            data =
              JSON.parse(raw);
          } catch {
            throw new Error(
              "Planner API returned HTTP " +
                response.status +
                ".",
            );
          }

          if (
            !response.ok ||
            data.success ===
              false
          ) {
            throw new Error(
              data.error ??
                "Planner API returned HTTP " +
                response.status +
                ".",
            );
          }

          setPlanner(
            plannerFromLegacy(
              data,
            ),
          );
        } catch (
          error
        ) {
          setMessage(
            error instanceof
              Error
              ? error.message
              : "Unable to load Planner execution state.",
          );
        }
      },
      [],
    );

  const loadJobs =
    useCallback(
      async (
        currentPlan: PlanId =
          planId,
      ) => {
        try {
          const response =
            await fetch(
              "/api/execution/jobs?plan=" +
                currentPlan,
              {
                cache:
                  "no-store",
              },
            );

          const raw =
            await response.text();

          let data: ApiResponse;

          try {
            data =
              JSON.parse(
                raw,
              ) as ApiResponse;
          } catch {
            throw new Error(
              "Execution API returned HTTP " +
                response.status +
                ".",
            );
          }

          apply(data);

          if (
            data.success &&
            Array.isArray(
              data.jobs,
            )
          ) {
            setJobs(
              data.jobs,
            );

            setSelectedJobId(
              (current) =>
                current &&
                data.jobs!.some(
                  (job) =>
                    job.id ===
                    current,
                )
                  ? current
                  : data.jobs![0]
                      ?.id ??
                    null,
            );
          } else if (
            !data.success
          ) {
            setMessage(
              data.error ??
                "Unable to load execution state.",
            );
          }
        } catch (
          error
        ) {
          setMessage(
            error instanceof
              Error
              ? error.message
              : "Unable to load execution history.",
          );
        }
      },
      [apply, planId],
    );

  useEffect(() => {
    void loadJobs(
      planId,
    );

    void loadPlanner();
  }, [
    loadJobs,
    loadPlanner,
    planId,
  ]);

  async function executeManual() {
    if (!goal.trim()) {
      setMessage(
        "Please enter an execution goal.",
      );
      return;
    }

    if (blocked) {
      setMessage(
        usage?.remaining ===
          0
          ? "Daily execution limit reached for this plan."
          : "Execution capability is not available for this plan.",
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
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              planId,
              goal:
                goal.trim(),
              input:
                input.trim() ||
                goal.trim(),
              execute:
                true,
            }),
          },
        );

      const data =
        (await response.json()) as ApiResponse;

      apply(data);

      setMessage(
        data.success
          ? "Execution completed successfully."
          : data.error ??
              "Execution failed.",
      );

      await loadPlanner();
    } catch {
      setMessage(
        "Unable to connect to the Execution API.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function executePlannerNext() {
    if (blocked) {
      setMessage(
        usage?.remaining ===
          0
          ? "Daily execution limit reached for this plan."
          : "Execution capability is not available for this plan.",
      );
      return;
    }

    setPlannerLoading(
      true,
    );
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/execution/planner-next",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              planId,
            }),
          },
        );

      const data =
        (await response.json()) as ApiResponse;

      apply(data);

      setMessage(
        data.success
          ? data.code ===
            "PLAN_COMPLETE"
            ? "Planner queue is complete."
            : "Planner task executed and marked complete."
          : data.error ??
              "Planner task execution failed.",
      );

      await loadJobs(
        planId,
      );

      await loadPlanner();
    } catch {
      setMessage(
        "Unable to connect to the Planner Execution Bridge.",
      );
    } finally {
      setPlannerLoading(
        false,
      );
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

    if (blocked) {
      setMessage(
        usage?.remaining ===
          0
          ? "Daily execution limit reached for this plan."
          : "Execution capability is not available for this plan.",
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
            method:
              "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              id:
                selectedJob.id,
              action:
                "retry",
              planId,
            }),
          },
        );

      const data =
        (await response.json()) as ApiResponse;

      apply(data);

      setMessage(
        data.success
          ? "Execution retry completed."
          : data.error ??
              "Retry failed.",
      );

      await loadPlanner();
    } catch {
      setMessage(
        "Unable to retry execution.",
      );
    } finally {
      setLoading(false);
    }
  }

  const card: CSSProperties =
    {
      background:
        "#ffffff",
      border:
        "1px solid #e5e7eb",
      borderRadius: 18,
      padding: 20,
      boxSizing:
        "border-box",
    };

  const darkCard: CSSProperties =
    {
      ...card,
      background:
        "#0f172a",
      color:
        "#ffffff",
      borderColor:
        "#0f172a",
    };

  const label: CSSProperties =
    {
      fontSize: 10,
      fontWeight: 850,
      letterSpacing:
        "0.10em",
      textTransform:
        "uppercase",
      color:
        "#6366f1",
    };

  const button: CSSProperties =
    {
      border: 0,
      borderRadius: 11,
      padding:
        "12px 14px",
      fontWeight: 800,
      cursor:
        "pointer",
      width:
        "100%",
      minHeight: 44,
    };

  const statusColor =
    selectedJob?.status ===
    "completed"
      ? "#15803d"
      : selectedJob?.status ===
          "failed"
        ? "#b91c1c"
        : "#475569";

  return (
    <WorkspaceShell>
      <main
        style={{
          width:
            "100%",
          maxWidth:
            1100,
          margin:
            "0 auto",
          padding:
            "22px 12px 42px",
          boxSizing:
            "border-box",
          color:
            "#111827",
        }}
      >
        <header
          style={{
            marginBottom:
              20,
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: 8,
              color:
                "#6366f1",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing:
                "0.10em",
            }}
          >
            AIOS EXECUTION OS
            <span
              style={{
                color:
                  "#94a3b8",
              }}
            >
              C136.1
            </span>
          </div>

          <h1
            style={{
              margin:
                "7px 0 0",
              fontSize:
                "clamp(28px, 6vw, 38px)",
              lineHeight:
                1.1,
              letterSpacing:
                "-0.03em",
            }}
          >
            Planner →
            Execution
          </h1>

          <p
            style={{
              maxWidth:
                760,
              margin:
                "9px 0 0",
              color:
                "#64748b",
              fontSize: 14,
              lineHeight:
                1.6,
            }}
          >
            Planner tasks can
            enter the Execution
            Runtime, return a
            verified result,
            update task state,
            and remain visible
            in shared execution
            history.
          </p>
        </header>

        <section
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
            gap: 14,
            alignItems:
              "start",
          }}
        >
          <div
            style={card}
          >
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                gap: 12,
                flexWrap:
                  "wrap",
                marginBottom:
                  14,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 850,
                    color:
                      "#334155",
                  }}
                >
                  Manual Execution
                </div>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    color:
                      "#64748b",
                    lineHeight:
                      1.45,
                  }}
                >
                  Direct Runtime execution
                  with plan entitlement
                  and daily usage control.
                </div>
              </div>

              <select
                value={planId}
                onChange={(
                  event,
                ) => {
                  setPlanId(
                    event.target
                      .value as PlanId,
                  );

                  setUsage(
                    null,
                  );

                  setEntitlement(
                    null,
                  );

                  setMessage(
                    "",
                  );
                }}
                disabled={
                  loading ||
                  plannerLoading
                }
                style={{
                  width:
                    "100%",
                  maxWidth:
                    180,
                  minHeight:
                    38,
                  padding:
                    "0 10px",
                  border:
                    "1px solid #dbe1ea",
                  borderRadius:
                    9,
                  background:
                    "#ffffff",
                  fontWeight:
                    800,
                }}
              >
                {plans.map(
                  ([
                    id,
                    name,
                  ]) => (
                    <option
                      key={
                        id
                      }
                      value={
                        id
                      }
                    >
                      {name}
                    </option>
                  ),
                )}
              </select>
            </div>

            <label
              style={{
                display:
                  "block",
                marginBottom:
                  7,
                color:
                  "#334155",
                fontSize: 13,
                fontWeight:
                  800,
              }}
            >
              Goal
            </label>

            <input
              value={
                goal
              }
              onChange={(
                event,
              ) =>
                setGoal(
                  event.target
                    .value,
                )
              }
              maxLength={
                1000
              }
              style={{
                width:
                  "100%",
                boxSizing:
                  "border-box",
                minHeight:
                  44,
                padding:
                  "0 13px",
                border:
                  "1px solid #dbe1ea",
                borderRadius:
                  10,
                fontSize:
                  14,
              }}
            />

            <label
              style={{
                display:
                  "block",
                margin:
                  "16px 0 7px",
                color:
                  "#334155",
                fontSize: 13,
                fontWeight:
                  800,
              }}
            >
              Runtime Input
            </label>

            <textarea
              value={
                input
              }
              onChange={(
                event,
              ) =>
                setInput(
                  event.target
                    .value,
                )
              }
              rows={5}
              style={{
                width:
                  "100%",
                boxSizing:
                  "border-box",
                padding:
                  "12px 13px",
                border:
                  "1px solid #dbe1ea",
                borderRadius:
                  10,
                fontSize:
                  14,
                lineHeight:
                  1.55,
                resize:
                  "vertical",
              }}
            />

            <button
              type="button"
              onClick={() =>
                void executeManual()
              }
              disabled={
                loading ||
                plannerLoading ||
                blocked
              }
              style={{
                ...button,
                marginTop:
                  13,
                background:
                  loading ||
                  plannerLoading ||
                  blocked
                    ? "#94a3b8"
                    : "#312e81",
                color:
                  "#ffffff",
                cursor:
                  loading ||
                  plannerLoading ||
                  blocked
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {loading
                ? "Executing..."
                : blocked
                  ? "Execution Unavailable"
                  : "Execute Manual Job"}
            </button>

            {message && (
              <div
                role="status"
                style={{
                  marginTop:
                    11,
                  padding:
                    "10px 12px",
                  borderRadius:
                    10,
                  background:
                    "#f8fafc",
                  color:
                    "#475569",
                  fontSize:
                    12,
                  lineHeight:
                    1.5,
                }}
              >
                {message}
              </div>
            )}
          </div>

          <div
            style={{
              display:
                "grid",
              gap: 12,
            }}
          >
            <div
              style={darkCard}
            >
              <div
                style={{
                  ...label,
                  color:
                    "#a5b4fc",
                }}
              >
                Planner Next Task
              </div>

              <div
                style={{
                  marginTop:
                    9,
                  fontSize:
                    21,
                  fontWeight:
                    850,
                  lineHeight:
                    1.35,
                }}
              >
                {planner
                  ?.nextTask
                  ?.title ??
                  "No executable task"}
              </div>

              <div
                style={{
                  marginTop:
                    8,
                  color:
                    "#cbd5e1",
                  fontSize:
                    12,
                }}
              >
                Outcome:{" "}
                <strong
                  style={{
                    color:
                      "#ffffff",
                  }}
                >
                  {planner
                    ?.outcome
                    ?.title ??
                    "—"}
                </strong>
              </div>

              <div
                style={{
                  marginTop:
                    4,
                  color:
                    "#cbd5e1",
                  fontSize:
                    12,
                }}
              >
                Progress:{" "}
                <strong
                  style={{
                    color:
                      "#ffffff",
                  }}
                >
                  {planner
                    ?.progress ??
                    0}
                  %
                </strong>
                {" · "}
                Queue:{" "}
                <strong
                  style={{
                    color:
                      "#ffffff",
                  }}
                >
                  {planner
                    ?.queueSize ??
                    0}
                </strong>
              </div>

              <button
                type="button"
                onClick={() =>
                  void executePlannerNext()
                }
                disabled={
                  plannerLoading ||
                  loading ||
                  blocked ||
                  !planner?.nextTask
                }
                style={{
                  ...button,
                  marginTop:
                    15,
                  background:
                    plannerLoading ||
                    loading ||
                    blocked ||
                    !planner?.nextTask
                      ? "#334155"
                      : "#4f46e5",
                  color:
                    "#ffffff",
                  cursor:
                    plannerLoading ||
                    loading ||
                    blocked ||
                    !planner?.nextTask
                      ? "not-allowed"
                      : "pointer",
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
              style={card}
            >
              <div
                style={label}
              >
                Daily Usage
              </div>

              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "baseline",
                  gap: 6,
                  marginTop:
                    9,
                }}
              >
                <strong
                  style={{
                    fontSize:
                      28,
                    color:
                      "#0f172a",
                  }}
                >
                  {usage?.used ??
                    0}
                </strong>

                <span
                  style={{
                    color:
                      "#64748b",
                    fontSize:
                      13,
                  }}
                >
                  /{" "}
                  {limitText(
                    usage?.limit ??
                      null,
                  )}
                </span>
              </div>

              <div
                style={{
                  marginTop:
                    7,
                  color:
                    "#64748b",
                  fontSize:
                    12,
                }}
              >
                Remaining:{" "}
                <strong
                  style={{
                    color:
                      "#0f172a",
                  }}
                >
                  {usage?.remaining ===
                  null
                    ? "Unlimited"
                    : usage?.remaining ??
                      "—"}
                </strong>
              </div>

              <div
                style={{
                  marginTop:
                    7,
                  color:
                    "#64748b",
                  fontSize:
                    12,
                }}
              >
                Entitlement:{" "}
                <strong
                  style={{
                    color:
                      entitlement
                        ?.allowed
                        ? "#15803d"
                        : "#475569",
                  }}
                >
                  {entitlement
                    ? entitlement.allowed
                      ? "Allowed"
                      : "Blocked"
                    : "Checking"}
                </strong>
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            gap: 14,
            marginTop:
              14,
            alignItems:
              "start",
          }}
        >
          <div
            style={darkCard}
          >
            <div
              style={{
                ...label,
                color:
                  "#a5b4fc",
              }}
            >
              Runtime Status
            </div>

            <div
              style={{
                marginTop:
                  10,
                fontSize:
                  26,
                fontWeight:
                  850,
                textTransform:
                  "capitalize",
              }}
            >
              {selectedJob
                ?.status ??
                "idle"}
            </div>

            <div
              style={{
                display:
                  "grid",
                gap: 8,
                marginTop:
                  13,
                color:
                  "#cbd5e1",
                fontSize:
                  12,
                lineHeight:
                  1.5,
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

              <div>
                Last updated:{" "}
                <strong
                  style={{
                    color:
                      "#ffffff",
                  }}
                >
                  {timeText(
                    selectedJob
                      ?.updatedAt,
                  )}
                </strong>
              </div>

              {selectedJob
                ?.taskId && (
                <div
                  style={{
                    overflowWrap:
                      "anywhere",
                  }}
                >
                  Planner Task:{" "}
                  <strong
                    style={{
                      color:
                        "#ffffff",
                    }}
                  >
                    {
                      selectedJob.taskId
                    }
                  </strong>
                </div>
              )}

              <div
                style={{
                  overflowWrap:
                    "anywhere",
                }}
              >
                Job ID:{" "}
                {selectedJob
                  ?.id ??
                  "—"}
              </div>
            </div>

            {selectedJob
              ?.status ===
              "failed" && (
              <button
                type="button"
                onClick={() =>
                  void retryJob()
                }
                disabled={
                  loading ||
                  blocked
                }
                style={{
                  ...button,
                  marginTop:
                    16,
                  background:
                    "transparent",
                  color:
                    "#ffffff",
                  border:
                    "1px solid #475569",
                  cursor:
                    loading ||
                    blocked
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {blocked
                  ? "Retry Unavailable"
                  : "Retry Execution"}
              </button>
            )}
          </div>

          <div
            style={card}
          >
            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                gap: 10,
              }}
            >
              <h2
                style={{
                  margin:
                    0,
                  fontSize:
                    17,
                  color:
                    "#0f172a",
                }}
              >
                Latest Result
              </h2>

              <span
                style={{
                  color:
                    statusColor,
                  fontSize:
                    10,
                  fontWeight:
                    850,
                  textTransform:
                    "uppercase",
                }}
              >
                {selectedJob
                  ?.verification
                  .status ??
                  "pending"}
              </span>
            </div>

            <div
              style={{
                marginTop:
                  12,
                minHeight:
                  84,
                padding:
                  14,
                borderRadius:
                  12,
                background:
                  "#f8fafc",
                color:
                  "#334155",
                whiteSpace:
                  "pre-wrap",
                overflowWrap:
                  "anywhere",
                fontSize:
                  13,
                lineHeight:
                  1.65,
              }}
            >
              {selectedJob
                ?.result ??
                selectedJob
                  ?.error ??
                "No result yet."}
            </div>

            {selectedJob
              ?.verification
              .message && (
              <div
                style={{
                  marginTop:
                    10,
                  color:
                    "#64748b",
                  fontSize:
                    11,
                  lineHeight:
                    1.5,
                }}
              >
                Verification:{" "}
                {
                  selectedJob
                    .verification
                    .message
                }
              </div>
            )}
          </div>
        </section>

        <section
          style={{
            ...card,
            marginTop:
              14,
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "flex-end",
              justifyContent:
                "space-between",
              gap: 12,
              flexWrap:
                "wrap",
              marginBottom:
                13,
            }}
          >
            <div>
              <div
                style={label}
              >
                Execution Ledger
              </div>

              <h2
                style={{
                  margin:
                    "5px 0 0",
                  fontSize:
                    19,
                  color:
                    "#0f172a",
                }}
              >
                Execution History
              </h2>

              <p
                style={{
                  margin:
                    "5px 0 0",
                  color:
                    "#64748b",
                  fontSize:
                    12,
                  lineHeight:
                    1.45,
                }}
              >
                Manual jobs and
                Planner-triggered jobs
                share the same execution
                history.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void loadJobs(
                  planId,
                );

                void loadPlanner();
              }}
              disabled={
                loading ||
                plannerLoading
              }
              style={{
                minHeight:
                  36,
                padding:
                  "0 11px",
                border:
                  "1px solid #dbe1ea",
                borderRadius:
                  9,
                background:
                  "#ffffff",
                color:
                  "#475569",
                fontSize:
                  12,
                fontWeight:
                  750,
                cursor:
                  loading ||
                  plannerLoading
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              Refresh
            </button>
          </div>

          {jobs.length ===
          0 ? (
            <div
              style={{
                padding:
                  "30px 18px",
                border:
                  "1px dashed #cbd5e1",
                borderRadius:
                  13,
                background:
                  "#f8fafc",
                color:
                  "#64748b",
                textAlign:
                  "center",
                fontSize:
                  13,
              }}
            >
              No execution
              jobs yet.
            </div>
          ) : (
            <div
              style={{
                display:
                  "grid",
                gap: 8,
              }}
            >
              {jobs.map(
                (job) => {
                  const selected =
                    selectedJobId ===
                    job.id;

                  const jobStatusColor =
                    job.status ===
                    "completed"
                      ? "#15803d"
                      : job.status ===
                          "failed"
                        ? "#b91c1c"
                        : "#475569";

                  return (
                    <button
                      key={
                        job.id
                      }
                      type="button"
                      onClick={() =>
                        setSelectedJobId(
                          job.id,
                        )
                      }
                      style={{
                        width:
                          "100%",
                        minWidth:
                          0,
                        padding:
                          "12px 13px",
                        border:
                          selected
                            ? "1px solid #c7d2fe"
                            : "1px solid #e5e7eb",
                        borderRadius:
                          11,
                        background:
                          selected
                            ? "#eef2ff"
                            : "#ffffff",
                        textAlign:
                          "left",
                        cursor:
                          "pointer",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "flex-start",
                          justifyContent:
                            "space-between",
                          gap: 10,
                          minWidth:
                            0,
                        }}
                      >
                        <strong
                          style={{
                            minWidth:
                              0,
                            color:
                              "#0f172a",
                            fontSize:
                              13,
                            lineHeight:
                              1.45,
                            overflowWrap:
                              "anywhere",
                          }}
                        >
                          {
                            job.goal
                          }
                        </strong>

                        <span
                          style={{
                            flexShrink:
                              0,
                            color:
                              jobStatusColor,
                            fontSize:
                              10,
                            fontWeight:
                              850,
                            textTransform:
                              "uppercase",
                          }}
                        >
                          {
                            job.status
                          }
                        </span>
                      </div>

                      <div
                        style={{
                          marginTop:
                            6,
                          color:
                            "#64748b",
                          fontSize:
                            10,
                          lineHeight:
                            1.5,
                          overflowWrap:
                            "anywhere",
                        }}
                      >
                        {job.taskId
                          ? "Planner Task " +
                            job.taskId +
                            " · "
                          : ""}
                        Retry{" "}
                        {
                          job.retryCount
                        }
                        {" · "}
                        Verification{" "}
                        {
                          job
                            .verification
                            .status
                        }
                        {" · "}
                        Updated{" "}
                        {timeText(
                          job.updatedAt,
                        )}
                      </div>
                    </button>
                  );
                },
              )}
            </div>
          )}
        </section>
      </main>
    </WorkspaceShell>
  );
}
