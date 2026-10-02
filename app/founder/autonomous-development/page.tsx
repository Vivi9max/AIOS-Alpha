"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import AutonomousDevelopmentReceiptStatus from "./receipt-status";

const STORAGE_KEY =
  "aios-founder-access-key";

const POLL_INTERVAL_MS = 2500;
const HEARTBEAT_INTERVAL_MS = 30000;
const MAX_POLL_ROUNDS = 240;
const HEARTBEAT_WARNING_MS =
  5 * 60 * 1000;

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

type TaskResult = {
  commitSha?: string;
  readbackVerified: boolean;
  verificationPassed: boolean;
  reason?: string;
  receiptValid?: boolean;
  successfulReceipt?: boolean;
  resultCommitSha?: string;
  commitShaConsistent?: boolean;
  missingEvidence?: string[];
};

type TaskReceipt = {
  terminal?: boolean;
  successful?: boolean;
  valid?: boolean;
  receiptValid?: boolean;
  commitSha?: string;
  resultCommitSha?: string;
  commitShaConsistent?: boolean;
  readbackVerified?: boolean;
  verificationPassed?: boolean;
  missingEvidence?: string[];
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
  result?: TaskResult;
  receipt?: TaskReceipt;
  receiptValid?: boolean;
  successfulReceipt?: boolean;
  resultCommitSha?: string;
  commitShaConsistent?: boolean;
  missingEvidence?: string[];
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
  receipt?: TaskReceipt;
  receiptValid?: boolean;
  successfulReceipt?: boolean;
  resultCommitSha?: string;
  commitShaConsistent?: boolean;
  missingEvidence?: string[];
};

const DEFAULT_OBJECTIVE =
  "例如：把 /cn 页面做成正常用户可用的 AIOS CN 工作区，并保持现有 API 与 Founder 权限边界不变。";

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

  if (!Number.isFinite(timestamp)) {
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

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return Math.max(
    0,
    Date.now() - timestamp,
  );
}

function isTerminalStatus(
  status?: TaskStatus | "starting",
) {
  return (
    status === "completed" ||
    status === "failed" ||
    status === "blocked"
  );
}

function getTaskReceipt(
  task?: Task | null,
) {
  if (!task) {
    return {
      receiptValid: false,
      successfulReceipt: false,
      commitSha: undefined,
      resultCommitSha: undefined,
      commitShaConsistent: false,
      readbackVerified: false,
      verificationPassed: false,
      missingEvidence: [],
    };
  }

  return {
    receiptValid:
      task.receiptValid ??
      task.result?.receiptValid ??
      task.receipt?.receiptValid ??
      task.receipt?.valid ??
      false,

    successfulReceipt:
      task.successfulReceipt ??
      task.result?.successfulReceipt ??
      task.receipt?.successful ??
      false,

    commitSha:
      task.commitSha ??
      task.result?.commitSha ??
      task.receipt?.commitSha,

    resultCommitSha:
      task.result?.commitSha ??
      task.resultCommitSha ??
      task.result?.resultCommitSha ??
      task.receipt?.resultCommitSha,

    commitShaConsistent:
      task.commitShaConsistent ??
      task.result?.commitShaConsistent ??
      task.receipt?.commitShaConsistent ??
      (typeof (task.commitSha ?? task.result?.commitSha) === "string" &&
      /^[0-9a-f]{40}$/i.test(
        String(task.commitSha ?? task.result?.commitSha),
      ) &&
      (task.result?.commitSha ?? task.resultCommitSha ?? task.receipt?.resultCommitSha) ===
        (task.commitSha ?? task.result?.commitSha)
        ? true
        : false),

    readbackVerified:
      task.receipt?.readbackVerified ??
      task.result?.readbackVerified ??
      false,

    verificationPassed:
      task.receipt?.verificationPassed ??
      task.result?.verificationPassed ??
      false,

    missingEvidence:
      task.missingEvidence ??
      task.result?.missingEvidence ??
      task.receipt?.missingEvidence ??
      [],
  };
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

  const heartbeatTimerRef =
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

      if (
        heartbeatTimerRef.current
      ) {
        clearTimeout(
          heartbeatTimerRef.current,
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
    if (pollTimerRef.current) {
      clearTimeout(
        pollTimerRef.current,
      );

      pollTimerRef.current =
        null;
    }
  };

  const clearHeartbeat = () => {
    if (
      heartbeatTimerRef.current
    ) {
      clearTimeout(
        heartbeatTimerRef.current,
      );

      heartbeatTimerRef.current =
        null;
    }
  };

  const clearFounderSession = () => {
    window.sessionStorage.removeItem(
      STORAGE_KEY,
    );

    activeTaskIdRef.current =
      null;

    clearPolling();
    clearHeartbeat();
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

  const scheduleHeartbeat = (
    key: string,
    taskId: string,
    delay =
      HEARTBEAT_INTERVAL_MS,
  ) => {
    clearHeartbeat();

    heartbeatTimerRef.current =
      setTimeout(() => {
        void sendHeartbeat(
          key,
          taskId,
        );
      }, delay);
  };

  const sendHeartbeat =
    async (
      key: string,
      taskId: string,
    ) => {
      if (
        activeTaskIdRef.current !==
        taskId
      ) {
        return;
      }

      try {
        const response =
          await fetch(
            "/api/founder/autonomous-development/heartbeat",
            {
              method: "POST",
              cache: "no-store",
              headers:
                getHeaders(key),
              body: JSON.stringify({
                taskId,
                reason:
                  "Founder Autonomous Development UI heartbeat",
              }),
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
            setRunning(false);
            setError(
              data.error ||
                "Founder authorization failed.",
            );
            return;
          }

          if (
            data.code ===
            "AUTONOMOUS_DEVELOPMENT_HEARTBEAT_STALE"
          ) {
            clearHeartbeat();
            return;
          }

          if (
            data.code ===
            "AUTONOMOUS_DEVELOPMENT_TASK_NOT_RUNNING"
          ) {
            clearHeartbeat();
            return;
          }

          scheduleHeartbeat(
            key,
            taskId,
          );

          return;
        }

        if (data.task) {
          const heartbeatTask =
            data.task;

          const receipt =
            getTaskReceipt(
              heartbeatTask,
            );

          const successful =
            data.successfulReceipt ===
            true;

          setResult(
            (previous) => ({
              ...(previous || {}),
              ok: successful,
              success:
                successful,
              taskId,
              status:
                heartbeatTask.status,
              objective:
                heartbeatTask.objective,
              repository:
                heartbeatTask.repository,
              branch:
                heartbeatTask.branch,
              task:
                heartbeatTask,
              tasks: [
                heartbeatTask,
              ],
              receipt:
                data.receipt ??
                heartbeatTask.receipt,
              receiptValid:
                data.receiptValid ??
                receipt.receiptValid,
              successfulReceipt:
                data.successfulReceipt ??
                receipt.successfulReceipt,
              resultCommitSha:
                data.resultCommitSha ??
                receipt.resultCommitSha,
              commitShaConsistent:
                data.commitShaConsistent ??
                receipt.commitShaConsistent,
              missingEvidence:
                data.missingEvidence ??
                receipt.missingEvidence,
            }),
          );
        }

        if (
          isTerminalStatus(
            data.task?.status,
          )
        ) {
          clearHeartbeat();
          return;
        }

        scheduleHeartbeat(
          key,
          taskId,
        );
      } catch {
        scheduleHeartbeat(
          key,
          taskId,
        );
      }
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
      clearHeartbeat();

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
        clearHeartbeat();

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
          success: false,
          code:
            "AUTONOMOUS_DEVELOPMENT_PLANNING",
          objective:
            result?.objective,
          taskId,
          status: "starting",
          message:
            "AIOS 正在读取真实 GitHub 仓库并进行 Planner 判断。",
        });

        schedulePoll(
          key,
          taskId,
        );

        scheduleHeartbeat(
          key,
          taskId,
        );

        return;
      }

      const receipt =
        getTaskReceipt(task);

      const taskCommitSha =
        task.commitSha ??
        task.result?.commitSha ??
        data.receipt?.commitSha;

      const resultCommitSha =
        task.result?.commitSha ??
        task.resultCommitSha ??
        task.result?.resultCommitSha ??
        data.receipt?.resultCommitSha;

      const commitShaValid =
        typeof taskCommitSha === "string" &&
        /^[0-9a-f]{40}$/i.test(taskCommitSha);

      const resultCommitShaValid =
        typeof resultCommitSha === "string" &&
        /^[0-9a-f]{40}$/i.test(resultCommitSha);

      const commitShaConsistent =
        commitShaValid &&
        resultCommitShaValid &&
        taskCommitSha === resultCommitSha;

      const readbackVerified =
        task.result?.readbackVerified === true ||
        task.receipt?.readbackVerified === true;

      const verificationPassed =
        task.result?.verificationPassed === true ||
        task.receipt?.verificationPassed === true;

      const successfulReceipt =
        data.successfulReceipt ===
        true;

      const receiptValid =
        data.receiptValid ===
        true;

      const completedWithValidReceipt =
        task.status ===
          "completed" &&
        commitShaValid &&
        commitShaConsistent &&
        readbackVerified &&
        verificationPassed &&
        successfulReceipt &&
        receiptValid;

      const code =
        completedWithValidReceipt
          ? "AUTONOMOUS_DEVELOPMENT_COMPLETED"
          : task.status ===
              "completed"
            ? "AUTONOMOUS_DEVELOPMENT_COMPLETED_RECEIPT_INVALID"
            : task.status ===
                "running"
              ? "AUTONOMOUS_DEVELOPMENT_RUNNING"
              : task.status ===
                  "todo"
                ? "AUTONOMOUS_DEVELOPMENT_RUNNING"
                : "AUTONOMOUS_DEVELOPMENT_BLOCKED";

      setResult({
        ok:
          completedWithValidReceipt,
        success:
          completedWithValidReceipt,
        code,
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
        receipt:
          data.receipt ??
          task.receipt,
        receiptValid,
        successfulReceipt,
        resultCommitSha:
          resultCommitSha ??
          data.resultCommitSha ??
          receipt.resultCommitSha,
        commitShaConsistent:
          commitShaConsistent ??
          data.commitShaConsistent ??
          receipt.commitShaConsistent,
        missingEvidence:
          data.missingEvidence ??
          receipt.missingEvidence,
      });

      if (
        isTerminalStatus(
          task.status,
        )
      ) {
        setRunning(false);

        activeTaskIdRef.current =
          null;

        clearHeartbeat();

        if (
          task.status !==
          "completed"
        ) {
          setError(
            task.reason ||
              `AIOS Autonomous Development ${task.status}.`,
          );
        } else if (
          !completedWithValidReceipt
        ) {
          const missing = (
            data.missingEvidence ??
            receipt.missingEvidence ??
            []
          ).slice();

          if (!commitShaValid) {
            missing.push("task.commitSha");
          }

          if (!resultCommitShaValid) {
            missing.push("result.commitSha");
          }

          if (!commitShaConsistent) {
            missing.push("commitShaConsistent");
          }

          if (!readbackVerified) {
            missing.push("readbackVerified");
          }

          if (!verificationPassed) {
            missing.push("verificationPassed");
          }

          const missingLabel =
            missing.join(", ");

          setError(
            missingLabel
              ? `AIOS completed the execution, but the terminal receipt is invalid. Missing evidence: ${missingLabel}.`
              : "AIOS completed the execution, but the terminal receipt is invalid.",
          );
        }

        return;
      }

      schedulePoll(
        key,
        taskId,
      );

      scheduleHeartbeat(
        key,
        taskId,
      );
    } catch (pollError) {
      setRunning(false);
      clearHeartbeat();

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
    clearHeartbeat();

    activeTaskIdRef.current =
      null;

    pollRoundsRef.current =
      0;

    window.sessionStorage.setItem(
      STORAGE_KEY,
      key,
    );

    setRunning(true);
    setError("");

    setResult({
      ok: true,
      success: false,
      code:
        "AUTONOMOUS_DEVELOPMENT_STARTING",
      objective:
        requestObjective,
      status: "starting",
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

      pollRoundsRef.current =
        0;

      schedulePoll(
        key,
        taskId,
        500,
      );

      scheduleHeartbeat(
        key,
        taskId,
        1000,
      );
    } catch (
      requestError
    ) {
      setRunning(false);

      activeTaskIdRef.current =
        null;

      clearHeartbeat();

      setError(
        requestError instanceof
          Error
          ? requestError.message
          : "Autonomous development request failed.",
      );
    }
  };

  const currentTask =
    result?.task ??
    result?.tasks?.[0];

  const changedPaths =
    currentTask?.changedPaths ?? [];

  const status =
    currentTask?.status ??
    result?.status ??
    "starting";

  const phase =
    currentTask?.phase;

  const currentReceipt =
    getTaskReceipt(
      currentTask,
    );

  const success =
    status === "completed" &&
    typeof currentReceipt.commitSha ===
      "string" &&
    /^[0-9a-f]{40}$/i.test(
      currentReceipt.commitSha,
    ) &&
    typeof currentReceipt.resultCommitSha ===
      "string" &&
    /^[0-9a-f]{40}$/i.test(
      currentReceipt.resultCommitSha,
    ) &&
    currentReceipt.commitSha ===
      currentReceipt.resultCommitSha &&
    currentReceipt.readbackVerified ===
      true &&
    currentReceipt.verificationPassed ===
      true &&
    currentReceipt.commitShaConsistent ===
      true &&
    currentReceipt.receiptValid ===
      true &&
    currentReceipt.successfulReceipt ===
      true;

  const isTerminal =
    isTerminalStatus(
      status,
    );

  const phaseLabel =
    phase
      ? PHASE_LABELS[phase]
      : status === "starting"
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
        minHeight: "100vh",
        background: "#f6f7fb",
        padding:
          "20px 14px 44px",
        boxSizing:
          "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 760,
          margin: "0 auto",
        }}
      >
        <header
          style={{
            marginBottom: 16,
          }}
        >
          <div
            style={{
              color: "#dc2626",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing:
                "0.14em",
            }}
          >
            FOUNDER ONLY · C167.31.30
          </div>

          <h1
            style={{
              margin:
                "8px 0 7px",
              fontSize: 28,
              lineHeight: 1.1,
              fontWeight: 850,
              color: "#111827",
            }}
          >
            AIOS Autonomous Development
          </h1>

          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            AIOS reads the real repository,
            plans the change, executes the
            development task, writes through
            the AIOS GitHub bridge, verifies
            the result, and returns a terminal
            evidence receipt.
          </p>
        </header>

        <section
          style={{
            padding: 14,
            borderRadius: 14,
            background: "#ffffff",
            border:
              "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              color: "#64748b",
              fontSize: 10,
              fontWeight: 850,
              letterSpacing:
                "0.08em",
            }}
          >
            DEVELOPMENT OBJECTIVE
          </div>

          <textarea
            value={objective}
            onChange={(event) =>
              setObjective(
                event.target.value,
              )
            }
            disabled={running}
            placeholder={
              DEFAULT_OBJECTIVE
            }
            rows={5}
            style={{
              width: "100%",
              marginTop: 8,
              padding: 11,
              boxSizing:
                "border-box",
              resize: "vertical",
              borderRadius: 10,
              border:
                "1px solid #cbd5e1",
              background:
                running
                  ? "#f8fafc"
                  : "#ffffff",
              color: "#111827",
              fontSize: 12,
              lineHeight: 1.6,
              outline: "none",
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems:
                "center",
              marginTop: 9,
              flexWrap: "wrap",
            }}
          >
            <input
              value={accessKey}
              onChange={(event) =>
                setAccessKey(
                  event.target.value,
                )
              }
              type="password"
              placeholder="Founder Access Key"
              disabled={running}
              style={{
                flex: "1 1 260px",
                minWidth: 0,
                padding:
                  "10px 11px",
                borderRadius: 9,
                border:
                  "1px solid #cbd5e1",
                background:
                  "#ffffff",
                color:
                  "#111827",
                fontSize: 11,
                outline: "none",
              }}
            />

            <button
              type="button"
              onClick={() =>
                void handleRun()
              }
              disabled={running}
              style={{
                flex:
                  "0 0 auto",
                padding:
                  "10px 15px",
                borderRadius: 9,
                border:
                  "1px solid #111827",
                background:
                  running
                    ? "#94a3b8"
                    : "#111827",
                color:
                  "#ffffff",
                fontSize: 11,
                fontWeight: 850,
                cursor:
                  running
                    ? "default"
                    : "pointer",
              }}
            >
              {running
                ? "AIOS DEVELOPMENT RUNNING..."
                : "RUN AUTONOMOUS DEVELOPMENT"}
            </button>
          </div>

          {error && (
            <div
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 9,
                background:
                  "#fff7f7",
                border:
                  "1px solid #fecaca",
                color:
                  "#991b1b",
                fontSize: 11,
                lineHeight: 1.55,
              }}
            >
              {error}
            </div>
          )}
        </section>

        <section
          style={{
            marginTop: 12,
            padding: 14,
            borderRadius: 14,
            background: "#ffffff",
            border:
              "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "flex-start",
              gap: 10,
              flexWrap:
                "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color:
                    "#94a3b8",
                  fontSize: 9,
                  fontWeight: 850,
                  letterSpacing:
                    "0.08em",
                }}
              >
                AUTONOMOUS DEVELOPMENT STATUS
              </div>

              <div
                style={{
                  marginTop: 5,
                  color:
                    success
                      ? "#15803d"
                      : status ===
                          "blocked" ||
                        status ===
                          "failed"
                        ? "#b91c1c"
                        : "#2563eb",
                  fontSize: 17,
                  fontWeight: 900,
                }}
              >
                {success
                  ? "COMPLETED · VERIFIED"
                  : status ===
                      "completed"
                    ? "COMPLETED · RECEIPT INVALID"
                    : phaseLabel}
              </div>
            </div>

            <div
              style={{
                padding:
                  "6px 9px",
                borderRadius: 8,
                background:
                  success
                    ? "#f0fdf4"
                    : "#f8fafc",
                border:
                  success
                    ? "1px solid #bbf7d0"
                    : "1px solid #e2e8f0",
                color:
                  success
                    ? "#15803d"
                    : "#64748b",
                fontSize: 9,
                fontWeight: 900,
              }}
            >
              {status.toUpperCase()}
            </div>
          </div>

          {result?.message && (
            <div
              style={{
                marginTop: 8,
                color:
                  "#64748b",
                fontSize: 11,
                lineHeight: 1.55,
              }}
            >
              {result.message}
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
                  gap: 8,
                  marginTop: 11,
                }}
              >
                <div
                  style={{
                    padding: 9,
                    borderRadius: 9,
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
                      fontSize: 9,
                      fontWeight:
                        850,
                    }}
                  >
                    REPOSITORY
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      color:
                        "#334155",
                      fontSize: 10,
                      overflowWrap:
                        "anywhere",
                    }}
                  >
                    {
                      currentTask.repository
                    }
                  </div>
                </div>

                <div
                  style={{
                    padding: 9,
                    borderRadius: 9,
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
                      fontSize: 9,
                      fontWeight:
                        850,
                    }}
                  >
                    BRANCH
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      color:
                        "#334155",
                      fontSize: 10,
                    }}
                  >
                    {
                      currentTask.branch
                    }
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 10,
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
                    fontSize: 9,
                    fontWeight:
                      850,
                  }}
                >
                  TASK ID
                </div>

                <div
                  style={{
                    marginTop: 4,
                    color:
                      "#334155",
                    fontSize: 10,
                    fontFamily:
                      "monospace",
                    overflowWrap:
                      "anywhere",
                  }}
                >
                  {
                    currentTask.id
                  }
                </div>
              </div>

              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 10,
                  background:
                    "#ffffff",
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
                    alignItems:
                      "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      color:
                        "#64748b",
                      fontSize: 10,
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
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: 6,
                      color:
                        heartbeatWarning
                          ? "#c2410c"
                          : currentTask.lastHeartbeatAt
                            ? "#15803d"
                            : "#64748b",
                      fontSize: 10,
                      fontWeight:
                        850,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius:
                          "50%",
                        background:
                          heartbeatWarning
                            ? "#f97316"
                            : currentTask.lastHeartbeatAt
                              ? "#22c55e"
                              : "#94a3b8",
                      }}
                    />

                    {heartbeatWarning
                      ? "Heartbeat aging"
                      : currentTask.lastHeartbeatAt
                        ? "Heartbeat healthy"
                        : "Heartbeat pending"}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 6,
                    color:
                      "#64748b",
                    fontSize: 10,
                  }}
                >
                  Last heartbeat:{" "}
                  {formatTime(
                    currentTask.lastHeartbeatAt,
                  )}
                </div>

                {heartbeatAge !==
                  null && (
                  <div
                    style={{
                      marginTop: 3,
                      color:
                        "#94a3b8",
                      fontSize: 9,
                    }}
                  >
                    Age:{" "}
                    {Math.floor(
                      heartbeatAge /
                        1000,
                    )}
                    s
                  </div>
                )}
              </div>

              <AutonomousDevelopmentReceiptStatus
                status={
                  currentTask.status
                }
                receiptValid={
                  currentReceipt.receiptValid
                }
                successfulReceipt={
                  currentReceipt.successfulReceipt
                }
                commitSha={
                  currentReceipt.commitSha
                }
                resultCommitSha={
                  currentReceipt.resultCommitSha
                }
                commitShaConsistent={
                  currentReceipt.commitShaConsistent
                }
                readbackVerified={
                  currentReceipt.readbackVerified
                }
                verificationPassed={
                  currentReceipt.verificationPassed
                }
                missingEvidence={
                  currentReceipt.missingEvidence
                }
              />

              {currentTask.reason && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 11,
                    borderRadius: 10,
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
                      fontSize: 10,
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
                      marginTop: 5,
                      color:
                        "#7f1d1d",
                      fontSize: 12,
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

              {phaseHistory.length >
                0 && (
                <div
                  style={{
                    marginTop: 10,
                  }}
                >
                  <div
                    style={{
                      color:
                        "#64748b",
                      fontSize: 11,
                      fontWeight:
                        800,
                    }}
                  >
                    EXECUTION PHASE HISTORY
                  </div>

                  <div
                    style={{
                      marginTop: 7,
                      display:
                        "grid",
                      gap: 6,
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
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                marginTop: 4,
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
                                  gap: 8,
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
                                  {formatTime(
                                    event.at,
                                  )}
                                </span>
                              </div>

                              {event.reason && (
                                <div
                                  style={{
                                    marginTop: 3,
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
              )}

              {currentTask.targetPaths?.length >
                0 && (
                <div
                  style={{
                    marginTop: 10,
                  }}
                >
                  <div
                    style={{
                      color:
                        "#64748b",
                      fontSize: 11,
                      fontWeight:
                        800,
                    }}
                  >
                    AIOS SELECTED FILES
                  </div>

                  {currentTask.targetPaths.map(
                    (path) => (
                      <div
                        key={path}
                        style={{
                          marginTop: 4,
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
                          fontSize: 11,
                          overflowWrap:
                            "anywhere",
                        }}
                      >
                        {path}
                      </div>
                    ),
                  )}
                </div>
              )}

              {changedPaths.length > 0 && (
                <div
                  style={{
                    marginTop: 10,
                  }}
                >
                  <div
                    style={{
                      color:
                        "#64748b",
                      fontSize: 11,
                      fontWeight:
                        800,
                    }}
                  >
                    CHANGED FILES
                  </div>

                  {changedPaths.map(
                    (path) => (
                      <div
                        key={path}
                        style={{
                          marginTop: 4,
                          padding:
                            "5px 7px",
                          borderRadius:
                            7,
                          background:
                            "#f0fdf4",
                          border:
                            "1px solid #bbf7d0",
                          color:
                            "#166534",
                          fontSize: 11,
                          overflowWrap:
                            "anywhere",
                        }}
                      >
                        {path}
                      </div>
                    ),
                  )}
                </div>
              )}

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                <div
                  style={{
                    padding: 9,
                    borderRadius: 9,
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
                      fontSize: 9,
                      fontWeight:
                        850,
                    }}
                  >
                    CREATED
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      color:
                        "#334155",
                      fontSize: 10,
                    }}
                  >
                    {formatTime(
                      currentTask.createdAt,
                    )}
                  </div>
                </div>

                <div
                  style={{
                    padding: 9,
                    borderRadius: 9,
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
                      fontSize: 9,
                      fontWeight:
                        850,
                    }}
                  >
                    UPDATED
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      color:
                        "#334155",
                      fontSize: 10,
                    }}
                  >
                    {formatTime(
                      currentTask.updatedAt,
                    )}
                  </div>
                </div>

                <div
                  style={{
                    padding: 9,
                    borderRadius: 9,
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
                      fontSize: 9,
                      fontWeight:
                        850,
                    }}
                  >
                    STARTED
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      color:
                        "#334155",
                      fontSize: 10,
                    }}
                  >
                    {formatTime(
                      currentTask.startedAt,
                    )}
                  </div>
                </div>

                <div
                  style={{
                    padding: 9,
                    borderRadius: 9,
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
                      fontSize: 9,
                      fontWeight:
                        850,
                    }}
                  >
                    COMPLETED
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      color:
                        "#334155",
                      fontSize: 10,
                    }}
                  >
                    {formatTime(
                      currentTask.completedAt,
                    )}
                  </div>
                </div>
              </div>

              {currentTask.result && (
                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  <div
                    style={{
                      padding: 9,
                      borderRadius: 9,
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
                        fontSize: 9,
                        fontWeight:
                          850,
                      }}
                    >
                      GITHUB READBACK
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        color:
                          currentReceipt.readbackVerified
                            ? "#15803d"
                            : "#b91c1c",
                        fontSize: 11,
                        fontWeight:
                          850,
                      }}
                    >
                      {currentReceipt.readbackVerified
                        ? "PASS"
                        : "NOT VERIFIED"}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 9,
                      borderRadius: 9,
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
                        fontSize: 9,
                        fontWeight:
                          850,
                      }}
                    >
                      FINAL VERIFICATION
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        color:
                          currentReceipt.verificationPassed
                            ? "#15803d"
                            : "#b91c1c",
                        fontSize: 11,
                        fontWeight:
                          850,
                      }}
                    >
                      {currentReceipt.verificationPassed
                        ? "PASS"
                        : "NOT PASSED"}
                    </div>
                  </div>
                </div>
              )}

              {currentTask.objective && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 10,
                    borderRadius: 10,
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
                      fontSize: 9,
                      fontWeight:
                        850,
                      letterSpacing:
                        "0.08em",
                    }}
                  >
                    ACTIVE OBJECTIVE
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      color:
                        "#334155",
                      fontSize: 11,
                      lineHeight:
                        1.55,
                      overflowWrap:
                        "anywhere",
                    }}
                  >
                    {
                      currentTask.objective
                    }
                  </div>
                </div>
              )}

              {isTerminal &&
                success && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 10,
                      background:
                        "#f0fdf4",
                      border:
                        "1px solid #bbf7d0",
                      color:
                        "#166534",
                      fontSize: 11,
                      fontWeight:
                        800,
                      lineHeight:
                        1.55,
                    }}
                  >
                    AIOS Autonomous
                    Development is
                    terminal and its
                    canonical receipt
                    is valid. The
                    delivery evidence
                    chain is complete.
                  </div>
                )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
