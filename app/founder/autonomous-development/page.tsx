"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

type TaskStatus =
  | "todo"
  | "running"
  | "completed"
  | "failed"
  | "blocked";

type TaskPhase =
  | "QUEUED"
  | "DISCOVERING"
  | "PLANNING"
  | "READING"
  | "GENERATING"
  | "WRITING"
  | "READBACK"
  | "BUILD"
  | "REPAIR"
  | "COMPLETED"
  | "BLOCKED";

type PhaseEvent = {
  phase: TaskPhase;
  at: string;
  reason?: string;
};

type Task = {
  id: string;
  objective: string;
  repository: string;
  branch: string;
  targetPaths: string[];
  status: TaskStatus;
  phase?: TaskPhase;
  reason?: string;
  commitSha?: string;
  changedPaths?: string[];
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  lastHeartbeatAt?: string;
  phaseHistory?: PhaseEvent[];
  result?: {
    commitSha?: string;
    readbackVerified: boolean;
    verificationPassed: boolean;
    reason?: string;
  };
};

type Result = {
  ok?: boolean;
  success?: boolean;
  code?: string;
  error?: string;
  message?: string;
  objective?: string;
  status?: TaskStatus | "starting";
  repository?: string;
  branch?: string;
  taskId?: string;
  tasks?: Task[];
  task?: Task;
};

const DEFAULT_OBJECTIVE =
  "例如：把 /cn 页面做成正常用户可用的 AIOS CN 工作区，并保持现有 API 与 Founder 权限边界不变。";

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_ROUNDS = 240;
const HEARTBEAT_WARNING_MS =
  5 * 60 * 1000;

const PHASE_LABELS: Record<
  TaskPhase,
  string
> = {
  QUEUED: "Queued",
  DISCOVERING:
    "Discovering Repository",
  PLANNING: "AIOS Planning",
  READING: "Reading",
  GENERATING: "Generating",
  WRITING: "Writing GitHub",
  READBACK: "GitHub Readback",
  BUILD: "Vercel Build Verification",
  REPAIR: "Build Repair",
  COMPLETED: "Completed",
  BLOCKED: "Blocked",
};

function formatTime(
  value?: string,
) {
  if (!value) {
    return "-";
  }

  const timestamp =
    new Date(value).getTime();

  if (
    !Number.isFinite(
      timestamp,
    )
  ) {
    return value;
  }

  return new Date(
    timestamp,
  ).toLocaleString();
}

function getHeartbeatAge(
  value?: string,
) {
  if (!value) {
    return null;
  }

  const timestamp =
    new Date(value).getTime();

  if (
    !Number.isFinite(
      timestamp,
    )
  ) {
    return null;
  }

  return Math.max(
    0,
    Date.now() - timestamp,
  );
}

export default function FounderAutonomousDevelopmentPage() {
  const [accessKey, setAccessKey] =
    useState("");

  const [objective, setObjective] =
    useState("");

  const [running, setRunning] =
    useState(false);

  const [result, setResult] =
    useState<Result | null>(null);

  const [error, setError] =
    useState("");

  const pollTimerRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  const pollRoundsRef =
    useRef(0);

  const activeTaskIdRef =
    useRef<string | null>(null);

  useEffect(() => {
    const storedKey =
      window.sessionStorage.getItem(
        STORAGE_KEY,
      );

    if (storedKey) {
      setAccessKey(storedKey);
    }

    return () => {
      if (pollTimerRef.current) {
        clearTimeout(
          pollTimerRef.current,
        );
      }
    };
  }, []);

  const getHeaders = (
    key: string,
  ) => ({
    "Content-Type":
      "application/json",
    Accept:
      "application/json",
    Authorization:
      `Bearer ${key}`,
  });

  const clearPolling = () => {
    if (
      pollTimerRef.current
    ) {
      clearTimeout(
        pollTimerRef.current,
      );

      pollTimerRef.current =
        null;
    }
  };

  const clearFounderSession = () => {
    window.sessionStorage.removeItem(
      STORAGE_KEY,
    );

    activeTaskIdRef.current =
      null;
  };

  const schedulePoll = (
    key: string,
    taskId: string,
    delay = POLL_INTERVAL_MS,
  ) => {
    clearPolling();

    pollTimerRef.current =
      setTimeout(() => {
        void pollTask(
          key,
          taskId,
        );
      }, delay);
  };

  const pollTask = async (
    key: string,
    taskId: string,
  ): Promise<void> => {
    if (
      pollRoundsRef.current >=
      MAX_POLL_ROUNDS
    ) {
      setRunning(false);

      setError(
        "AIOS 任务仍在后台执行。页面轮询已停止，可稍后重新打开 Founder Autonomous Development 查看任务状态。",
      );

      return;
    }

    if (
      activeTaskIdRef.current &&
      activeTaskIdRef.current !==
        taskId
    ) {
      return;
    }

    pollRoundsRef.current += 1;

    try {
      const response =
        await fetch(
          `/api/founder/autonomous-development?taskId=${encodeURIComponent(
            taskId,
          )}`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept:
                "application/json",
              Authorization:
                `Bearer ${key}`,
            },
          },
        );

      const data =
        (await response.json()) as Result;

      if (!response.ok) {
        if (
          data.code ===
            "FOUNDER_UNAUTHORIZED" ||
          data.code ===
            "FOUNDER_NOT_CONFIGURED"
        ) {
          clearFounderSession();
        }

        setRunning(false);

        setError(
          data.error ||
            `Task status request failed (${response.status})`,
        );

        return;
      }

      const task =
        data.task ??
        data.tasks?.[0] ??
        null;

      if (!task) {
        setResult({
          ok: true,
          success: true,
          code:
            "AUTONOMOUS_DEVELOPMENT_PLANNING",
          objective:
            result?.objective,
          taskId,
          status:
            "starting",
          message:
            "AIOS 正在读取真实 GitHub 仓库并进行 Planner 判断。",
        });

        schedulePoll(
          key,
          taskId,
        );

        return;
      }

      setResult({
        ok:
          task.status ===
          "completed",
        success:
          task.status ===
          "completed",
        code:
          task.status ===
          "completed"
            ? "AUTONOMOUS_DEVELOPMENT_COMPLETED"
            : task.status ===
                "running"
              ? "AUTONOMOUS_DEVELOPMENT_RUNNING"
              : task.status ===
                  "todo"
                ? "AUTONOMOUS_DEVELOPMENT_RUNNING"
                : "AUTONOMOUS_DEVELOPMENT_BLOCKED",
        objective:
          task.objective,
        repository:
          task.repository,
        branch:
          task.branch,
        taskId:
          task.id,
        status:
          task.status,
        tasks: [task],
        task,
      });

      if (
        task.status ===
          "completed" ||
        task.status ===
          "failed" ||
        task.status ===
          "blocked"
      ) {
        setRunning(false);

        activeTaskIdRef.current =
          null;

        if (
          task.status !==
          "completed"
        ) {
          setError(
            task.reason ||
              `AIOS Autonomous Development ${task.status}.`,
          );
        }

        return;
      }

      schedulePoll(
        key,
        taskId,
      );
    } catch (
      pollError
    ) {
      setRunning(false);

      setError(
        pollError instanceof Error
          ? pollError.message
          : "Task status request failed.",
      );
    }
  };

  const handleRun = async () => {
    const key =
      accessKey.trim();

    const requestObjective =
      objective.trim();

    if (!key) {
      setError(
        "请输入 Founder Access Key，或先在 Founder Console 完成验证。",
      );

      return;
    }

    if (!requestObjective) {
      setError(
        "请先告诉 AIOS 你想实现什么，不需要填写 Target Path。",
      );

      return;
    }

    clearPolling();

    activeTaskIdRef.current =
      null;

    window.sessionStorage.setItem(
      STORAGE_KEY,
      key,
    );

    pollRoundsRef.current = 0;

    setRunning(true);
    setError("");

    setResult({
      ok: true,
      success: true,
      code:
        "AUTONOMOUS_DEVELOPMENT_STARTING",
      objective:
        requestObjective,
      status:
        "starting",
      message:
        "正在启动 AIOS Autonomous Development。",
    });

    try {
      const response =
        await fetch(
          "/api/founder/autonomous-development",
          {
            method: "POST",
            cache: "no-store",
            headers:
              getHeaders(key),
            body: JSON.stringify({
              action:
                "autonomous",
              objective:
                requestObjective,
            }),
          },
        );

      let data: Result = {};

      try {
        data =
          (await response.json()) as Result;
      } catch {
        data = {
          ok: false,
          success: false,
          code:
            "AUTONOMOUS_RESPONSE_INVALID",
          error:
            "AIOS returned an invalid response.",
        };
      }

      if (!response.ok) {
        if (
          data.code ===
            "FOUNDER_UNAUTHORIZED" ||
          data.code ===
            "FOUNDER_NOT_CONFIGURED"
        ) {
          clearFounderSession();
        }

        setRunning(false);
        setError(
          data.error ||
            `Request failed (${response.status})`,
        );
        setResult(data);

        return;
      }

      setResult(data);

      const taskId =
        data.taskId ??
        data.task?.id ??
        data.tasks?.[0]?.id ??
        null;

      if (!taskId) {
        setRunning(false);

        setError(
          "AIOS returned a successful response but did not provide a task ID.",
        );

        return;
      }

      activeTaskIdRef.current =
        taskId;

      pollRoundsRef.current = 0;

      schedulePoll(
        key,
        taskId,
        500,
      );
    } catch (
      requestError
    ) {
      setRunning(false);

      activeTaskIdRef.current =
        null;

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Autonomous development request failed.",
      );
    }
  };

  const currentTask =
    result?.task ??
    result?.tasks?.[0];

  const status =
    currentTask?.status ||
    result?.status ||
    "starting";

  const phase =
    currentTask?.phase;

  const success =
    status ===
    "completed";

  const isTerminal =
    status ===
      "completed" ||
    status ===
      "failed" ||
    status ===
      "blocked";

  const phaseLabel =
    phase
      ? PHASE_LABELS[
          phase
        ]
      : status ===
          "starting"
        ? "Starting"
        : status.toUpperCase();

  const heartbeatAge =
    useMemo(
      () =>
        getHeartbeatAge(
          currentTask?.lastHeartbeatAt,
        ),
      [
        currentTask?.lastHeartbeatAt,
      ],
    );

  const heartbeatWarning =
    status === "running" &&
    heartbeatAge !== null &&
    heartbeatAge >=
      HEARTBEAT_WARNING_MS;

  const phaseHistory =
    currentTask?.phaseHistory ??
    [];

  return (
    <main
      style={{
        minHeight:
          "100vh",
        background:
          "#f6f7fb",
        padding:
          "20px 14px 44px",
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
              16,
          }}
        >
          <div
            style={{
              color:
                "#dc2626",
              fontSize:
                10,
              fontWeight:
                900,
              letterSpacing:
                "0.14em",
            }}
          >
            FOUNDER ONLY · C167.31.4
          </div>

          <h1
            style={{
              margin:
                "8px 0 7px",
              fontSize:
                28,
              lineHeight:
                1.1,
              fontWeight:
                850,
              color:
                "#111827",
            }}
          >
            AIOS Autonomous Development
          </h1>

          <p
            style={{
              margin:
                0,
              color:
                "#64748b",
              fontSize:
                13,
              lineHeight:
                1.6,
            }}
          >
            你只说需求。AIOS 自动发现真实仓库、读取代码、判断目标文件、生成、写入 GitHub、Commit、Readback 并执行 Build Verification。
          </p>
        </header>

        <section
          style={{
            padding:
              16,
            border:
              "1px solid #e2e8f0",
            borderRadius:
              18,
            background:
              "#ffffff",
            boxShadow:
              "0 8px 26px rgba(15, 23, 42, 0.05)",
          }}
        >
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
              gap:
                7,
              marginBottom:
                16,
            }}
          >
            {[
              "Understand",
              "Discover",
              "Read",
              "Plan",
              "Generate",
              "Write",
              "Commit",
              "Verify",
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
                    padding:
                      "8px 5px",
                    borderRadius:
                      9,
                    background:
                      "#f8fafc",
                    textAlign:
                      "center",
                    color:
                      "#475569",
                    fontSize:
                      9,
                    fontWeight:
                      750,
                  }}
                >
                  <span
                    style={{
                      display:
                        "block",
                      marginBottom:
                        3,
                      color:
                        "#94a3b8",
                      fontSize:
                        8,
                    }}
                  >
                    {String(
                      index +
                        1,
                    ).padStart(
                      2,
                      "0",
                    )}
                  </span>
                  {
                    step
                  }
                </div>
              ),
            )}
          </div>

          <div
            style={{
              padding:
                12,
              borderRadius:
                12,
              background:
                "#f8fafc",
              border:
                "1px solid #e2e8f0",
              marginBottom:
                12,
            }}
          >
            <div
              style={{
                marginBottom:
                  5,
                color:
                  "#94a3b8",
                fontSize:
                  10,
                fontWeight:
                  850,
                letterSpacing:
                  "0.08em",
              }}
            >
              FOUNDER AUTH SESSION
            </div>

            <div
              style={{
                color:
                  accessKey
                    ? "#15803d"
                    : "#64748b",
                fontSize:
                  13,
                fontWeight:
                  700,
              }}
            >
              {accessKey
                ? "Founder Access Key loaded"
                : "Founder Access Key required"}
            </div>
          </div>

          <label
            htmlFor="autonomous-objective"
            style={{
              display:
                "block",
              marginBottom:
                7,
              color:
                "#334155",
              fontSize:
                12,
              fontWeight:
                750,
            }}
          >
            What do you want AIOS to build or change?
          </label>

          <textarea
            id="autonomous-objective"
            value={
              objective
            }
            onChange={(
              event,
            ) =>
              setObjective(
                event.target
                  .value,
              )
            }
            placeholder={
              DEFAULT_OBJECTIVE
            }
            disabled={
              running
            }
            rows={
              7
            }
            spellCheck={
              false
            }
            style={{
              width:
                "100%",
              boxSizing:
                "border-box",
              padding:
                12,
              border:
                "1px solid #cbd5e1",
              borderRadius:
                10,
              outline:
                "none",
              color:
                "#111827",
              background:
                "#ffffff",
              fontSize:
                14,
              lineHeight:
                1.6,
              resize:
                "vertical",
            }}
          />

          <div
            style={{
              marginTop:
                7,
              color:
                "#94a3b8",
              fontSize:
                11,
              lineHeight:
                1.5,
            }}
          >
            不需要 Target Path。AIOS 会从真实 GitHub 仓库自行判断需要读取和修改哪些文件。
          </div>

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
              minHeight:
                48,
              marginTop:
                12,
              border:
                "none",
              borderRadius:
                10,
              background:
                running
                  ? "#94a3b8"
                  : "#111827",
              color:
                "#ffffff",
              fontSize:
                13,
              fontWeight:
                850,
              cursor:
                running
                  ? "default"
                  : "pointer",
            }}
          >
            {running
              ? "AIOS Autonomous Development Running..."
              : "Start Autonomous Development"}
          </button>

          {result && (
            <div
              style={{
                marginTop:
                  12,
                padding:
                  13,
                borderRadius:
                  12,
                border:
                  success
                    ? "1px solid #bbf7d0"
                    : isTerminal
                      ? "1px solid #fecaca"
                      : "1px solid #bfdbfe",
                background:
                  success
                    ? "#f0fdf4"
                    : isTerminal
                      ? "#fef2f2"
                      : "#eff6ff",
              }}
            >
              <div
                style={{
                  marginBottom:
                    8,
                  color:
                    success
                      ? "#15803d"
                      : isTerminal
                        ? "#b91c1c"
                        : "#1d4ed8",
                  fontSize:
                    12,
                  fontWeight:
                    850,
                }}
              >
                {success
                  ? "AUTONOMOUS DEVELOPMENT COMPLETED"
                  : status ===
                        "running" ||
                      status ===
                        "todo"
                    ? "AUTONOMOUS DEVELOPMENT RUNNING"
                    : status ===
                        "starting"
                      ? "AIOS IS PLANNING"
                      : "AUTONOMOUS DEVELOPMENT BLOCKED"}
              </div>

              {result.code && (
                <div
                  style={{
                    color:
                      "#475569",
                    fontSize:
                      12,
                  }}
                >
                  <strong>
                    Code:
                  </strong>{" "}
                  {
                    result.code
                  }
                </div>
              )}

              {(
                currentTask?.id ||
                result.taskId
              ) && (
                <div
                  style={{
                    marginTop:
                      5,
                    color:
                      "#475569",
                    fontSize:
                      12,
                  }}
                >
                  <strong>
                    Task:
                  </strong>{" "}
                  {
                    currentTask?.id ||
                    result.taskId
                  }
                </div>
              )}

              {currentTask && (
                <>
                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(2, minmax(0, 1fr))",
                      gap:
                        8,
                      marginTop:
                        10,
                    }}
                  >
                    <div
                      style={{
                        padding:
                          9,
                        borderRadius:
                          9,
                        background:
                          "#ffffff",
                        border:
                          "1px solid #e2e8f0",
                      }}
                    >
                      <div
                        style={{
                          color:
                            "#94a3b8",
                          fontSize:
                            9,
                          fontWeight:
                            850,
                          letterSpacing:
                            "0.08em",
                        }}
                      >
                        STATUS
                      </div>

                      <div
                        style={{
                          marginTop:
                            4,
                          color:
                            "#334155",
                          fontSize:
                            12,
                          fontWeight:
                            800,
                        }}
                      >
                        {currentTask.status.toUpperCase()}
                      </div>
                    </div>

                    <div
                      style={{
                        padding:
                          9,
                        borderRadius:
                          9,
                        background:
                          "#ffffff",
                        border:
                          "1px solid #e2e8f0",
                      }}
                    >
                      <div
                        style={{
                          color:
                            "#94a3b8",
                          fontSize:
                            9,
                          fontWeight:
                            850,
                          letterSpacing:
                            "0.08em",
                        }}
                      >
                        PHASE
                      </div>

                      <div
                        style={{
                          marginTop:
                            4,
                          color:
                            currentTask.phase ===
                            "BLOCKED"
                              ? "#b91c1c"
                              : "#334155",
                          fontSize:
                            12,
                          fontWeight:
                            800,
                        }}
                      >
                        {phaseLabel}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop:
                        8,
                      padding:
                        10,
                      borderRadius:
                        10,
                      background:
                        heartbeatWarning
                          ? "#fff7ed"
                          : "#f8fafc",
                      border:
                        heartbeatWarning
                          ? "1px solid #fed7aa"
                          : "1px solid #e2e8f0",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap:
                          10,
                        alignItems:
                          "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color:
                              "#94a3b8",
                            fontSize:
                              9,
                            fontWeight:
                              850,
                            letterSpacing:
                              "0.08em",
                          }}
                        >
                          EXECUTION HEARTBEAT
                        </div>

                        <div
                          style={{
                            marginTop:
                              4,
                            color:
                              heartbeatWarning
                                ? "#c2410c"
                                : "#334155",
                            fontSize:
                              11,
                            fontWeight:
                              800,
                          }}
                        >
                          {currentTask.lastHeartbeatAt
                            ? heartbeatWarning
                              ? "Heartbeat aging"
                              : "Heartbeat healthy"
                            : "Heartbeat pending"}
                        </div>
                      </div>

                      <div
                        style={{
                          width:
                            9,
                          height:
                            9,
                          borderRadius:
                            "50%",
                          background:
                            heartbeatWarning
                              ? "#f97316"
                              : currentTask.lastHeartbeatAt
                                ? "#22c55e"
                                : "#94a3b8",
                          flexShrink:
                            0,
                        }}
                      />
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
                      }}
                    >
                      Last heartbeat:{" "}
                      {
                        formatTime(
                          currentTask.lastHeartbeatAt,
                        )
                      }
                    </div>
                  </div>
                </>
              )}

              {currentTask?.reason && (
                <div
                  style={{
                    marginTop:
                      10,
                    padding:
                      11,
                    borderRadius:
                      10,
                    border:
                      "1px solid #fecaca",
                    background:
                      "#fff7f7",
                  }}
                >
                  <div
                    style={{
                      color:
                        "#b91c1c",
                      fontSize:
                        10,
                      fontWeight:
                        900,
                      letterSpacing:
                        "0.08em",
                    }}
                  >
                    EXECUTION REASON
                  </div>

                  <div
                    style={{
                      marginTop:
                        5,
                      color:
                        "#7f1d1d",
                      fontSize:
                        12,
                      lineHeight:
                        1.6,
                      overflowWrap:
                        "anywhere",
                    }}
                  >
                    {
                      currentTask.reason
                    }
                  </div>
                </div>
              )}

              {currentTask?.phaseHistory
                ?.length ? (
                <div
                  style={{
                    marginTop:
                      10,
                  }}
                >
                  <div
                    style={{
                      color:
                        "#64748b",
                      fontSize:
                        11,
                      fontWeight:
                        800,
                    }}
                  >
                    EXECUTION PHASE HISTORY
                  </div>

                  <div
                    style={{
                      marginTop:
                        7,
                      display:
                        "grid",
                      gap:
                        6,
                    }}
                  >
                    {phaseHistory
                      .slice()
                      .reverse()
                      .slice(
                        0,
                        12,
                      )
                      .map(
                        (
                          event,
                          index,
                        ) => (
                          <div
                            key={`${event.at}-${event.phase}-${index}`}
                            style={{
                              display:
                                "grid",
                              gridTemplateColumns:
                                "8px minmax(0, 1fr)",
                              gap:
                                8,
                              alignItems:
                                "start",
                            }}
                          >
                            <div
                              style={{
                                width:
                                  8,
                                height:
                                  8,
                                marginTop:
                                  4,
                                borderRadius:
                                  "50%",
                                background:
                                  index ===
                                  0
                                    ? "#2563eb"
                                    : "#cbd5e1",
                              }}
                            />

                            <div
                              style={{
                                padding:
                                  "7px 8px",
                                borderRadius:
                                  8,
                                background:
                                  "#f8fafc",
                                border:
                                  "1px solid #e2e8f0",
                              }}
                            >
                              <div
                                style={{
                                  display:
                                    "flex",
                                  justifyContent:
                                    "space-between",
                                  gap:
                                    8,
                                  flexWrap:
                                    "wrap",
                                }}
                              >
                                <span
                                  style={{
                                    color:
                                      "#334155",
                                    fontSize:
                                      10,
                                    fontWeight:
                                      850,
                                  }}
                                >
                                  {
                                    PHASE_LABELS[
                                      event.phase
                                    ]
                                  }
                                </span>

                                <span
                                  style={{
                                    color:
                                      "#94a3b8",
                                    fontSize:
                                      9,
                                  }}
                                >
                                  {
                                    formatTime(
                                      event.at,
                                    )
                                  }
                                </span>
                              </div>

                              {event.reason && (
                                <div
                                  style={{
                                    marginTop:
                                      3,
                                    color:
                                      "#64748b",
                                    fontSize:
                                      10,
                                    lineHeight:
                                      1.45,
                                    overflowWrap:
                                      "anywhere",
                                  }}
                                >
                                  {
                                    event.reason
                                  }
                                </div>
                              )}
                            </div>
                          </div>
                        ),
                      )}
                  </div>
                </div>
              ) : null}

              {currentTask?.commitSha && (
                <div
                  style={{
                    marginTop:
                      10,
                    padding:
                      10,
                    borderRadius:
                      10,
                    background:
                      "#f8fafc",
                    border:
                      "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      color:
                        "#94a3b8",
                      fontSize:
                        9,
                      fontWeight:
                        850,
                      letterSpacing:
                        "0.08em",
                    }}
                  >
                    LATEST COMMIT
                  </div>

                  <div
                    style={{
                      marginTop:
                        4,
                      color:
                        "#334155",
                      fontSize:
                        11,
                      fontFamily:
                        "monospace",
                      overflowWrap:
                        "anywhere",
                    }}
                  >
                    {
                      currentTask.commitSha
                    }
                  </div>
                </div>
              )}

              {currentTask?.result && (
                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",
                    gap:
                      8,
                    marginTop:
                      10,
                  }}
                >
                  <div
                    style={{
                      padding:
                        9,
                      borderRadius:
                        9,
                      background:
                        "#f8fafc",
                      border:
                        "1px solid #e2e8f0",
                    }}
                  >
                    <div
                      style={{
                        color:
                          "#94a3b8",
                        fontSize:
                          9,
                        fontWeight:
                          850,
                        letterSpacing:
                          "0.08em",
                      }}
                    >
                      READBACK
                    </div>

                    <div
                      style={{
                        marginTop:
                          4,
                        color:
                          currentTask
                            .result
                            .readbackVerified
                            ? "#15803d"
                            : "#b91c1c",
                        fontSize:
                          11,
                        fontWeight:
                          850,
                      }}
                    >
                      {currentTask
                        .result
                        .readbackVerified
                        ? "PASS"
                        : "NOT VERIFIED"}
                    </div>
                  </div>

                  <div
                    style={{
                      padding:
                        9,
                      borderRadius:
                        9,
                      background:
                        "#f8fafc",
                      border:
                        "1px solid #e2e8f0",
                    }}
                  >
                    <div
                      style={{
                        color:
                          "#94a3b8",
                        fontSize:
                          9,
                        fontWeight:
                          850,
                        letterSpacing:
                          "0.08em",
                      }}
                    >
                      VERIFICATION
                    </div>

                    <div
                      style={{
                        marginTop:
                          4,
                        color:
                          currentTask
                            .result
                            .verificationPassed
                            ? "#15803d"
                            : "#b91c1c",
                        fontSize:
                          11,
                        fontWeight:
                          850,
                      }}
                    >
                      {currentTask
                        .result
                        .verificationPassed
                        ? "PASS"
                        : "NOT PASSED"}
                    </div>
                  </div>
                </div>
              )}

              {currentTask?.targetPaths
                ?.length ? (
                <div
                  style={{
                    marginTop:
                      10,
                  }}
                >
                  <div
                    style={{
                      color:
                        "#64748b",
                      fontSize:
                        11,
                      fontWeight:
                        800,
                    }}
                  >
                    AIOS SELECTED FILES
                  </div>

                  {currentTask.targetPaths.map(
                    (
                      path,
                    ) => (
                      <div
                        key={
                          path
                        }
                        style={{
                          marginTop:
                            4,
                          padding:
                            "5px 7px",
                          borderRadius:
                            7,
                          background:
                            "#ffffff",
                          border:
                            "1px solid #e2e8f0",
                          color:
                            "#334155",
                          fontSize:
                            11,
                          overflowWrap:
                            "anywhere",
                        }}
                      >
                        {
                          path
                        }
                      </div>
                    ),
                  )}
                </div>
              ) : null}

              {currentTask?.changedPaths
                ?.length ? (
                <div
                  style={{
                    marginTop:
                      10,
                  }}
                >
                  <div
                    style={{
                      color:
                        "#64748b",
                      fontSize:
                        11,
                      fontWeight:
                        800,
                    }}
                  >
                    CHANGED PATHS
                  </div>

                  {currentTask.changedPaths.map(
                    (
                      path,
                    ) => (
                      <div
                        key={
                          path
                        }
                        style={{
                          marginTop:
                            4,
                          padding:
                            "5px 7px",
                          borderRadius:
                            7,
                          background:
                            "#f8fafc",
                          color:
                            "#334155",
                          fontSize:
                            11,
                          overflowWrap:
                            "anywhere",
                        }}
                      >
                        {
                          path
                        }
                      </div>
                    ),
                  )}
                </div>
              ) : null}

              {currentTask?.startedAt && (
                <div
                  style={{
                    marginTop:
                      10,
                    color:
                      "#94a3b8",
                    fontSize:
                      10,
                    lineHeight:
                      1.5,
                  }}
                >
                  Started:{" "}
                  {
                    formatTime(
                      currentTask.startedAt,
                    )
                  }
                  <br />
                  Updated:{" "}
                  {
                    formatTime(
                      currentTask.updatedAt,
                    )
                  }
                  {currentTask.completedAt && (
                    <>
                      <br />
                      Completed:{" "}
                      {
                        formatTime(
                          currentTask.completedAt,
                        )
                      }
                    </>
                  )}
                </div>
              )}

              {result.message && (
                <div
                  style={{
                    marginTop:
                      9,
                    color:
                      "#64748b",
                    fontSize:
                      11,
                    lineHeight:
                      1.55,
                  }}
                >
                  {
                    result.message
                  }
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  style={{
                    marginTop:
                      9,
                    paddingTop:
                      9,
                    borderTop:
                      "1px solid #fecaca",
                    color:
                      "#b91c1c",
                    fontSize:
                      11,
                    lineHeight:
                      1.55,
                    overflowWrap:
                      "anywhere",
                  }}
                >
                  {
                    error
                  }
                </div>
              )}
            </div>
          )}

          {error &&
            !result && (
              <div
                role="alert"
                style={{
                  marginTop:
                    10,
                  padding:
                    11,
                  border:
                    "1px solid #fecaca",
                  borderRadius:
                    10,
                  background:
                    "#fef2f2",
                  color:
                    "#b91c1c",
                  fontSize:
                    12,
                  lineHeight:
                    1.5,
                }}
              >
                {
                  error
                }
              </div>
            )}
        </section>
      </div>
    </main>
  );
}
