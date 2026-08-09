"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

interface ExecutionTask {
  id: string;
  title: string;
  description: string;
  status:
    | "todo"
    | "doing"
    | "done";
  createdAt: number;
  updatedAt: number;
}

interface ExecutionMilestone {
  id: string;
  title: string;
  status: string;
  order: number;
}

interface ExecutionOutcome {
  id: string;
  title: string;
  status: string;
  priority: string;
  storedProgress: number;
}

interface NextAction {
  type: string;
  title: string;
  description: string;
}

interface ExecutionData {
  progress: number;
  completedTasks: number;
  remainingTasks: number;
  queueSize: number;
  nextTaskId: string | null;
  milestoneId: string | null;
  currentMilestone:
    | ExecutionMilestone
    | null;
  nextTask:
    | ExecutionTask
    | null;
  nextAction: NextAction;
  queue: ExecutionTask[];
}

interface ExecutionResponse {
  success: boolean;
  state?: string;
  outcome:
    | ExecutionOutcome
    | null;
  execution?: ExecutionData;
  performedAction?: string;
  error?: string;
}

type ExecutionAction =
  | "start-next"
  | "complete-current"
  | "sync";

export default function OutcomeExecutionCenter() {
  const { t } = useLanguage();
  const [
    data,
    setData,
  ] =
    useState<ExecutionResponse | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] =
    useState<
      ExecutionAction | null
    >(null);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const loadExecution =
    useCallback(async () => {
      setLoading(true);

      try {
        const response =
          await fetch(
            "/api/planner/execute",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const result =
          (await response.json()) as
            ExecutionResponse;

        setData(result);

        if (
          !response.ok ||
          !result.success
        ) {
          setMessage(
            result.error ??
              t("execution.loadError")
          );
        }
      } catch {
        setData(null);
        setMessage(
          t("execution.connectionError")
        );
      } finally {
        setLoading(false);
      }
    }, [t]);

  useEffect(() => {
    void loadExecution();
  }, [loadExecution]);

  async function runAction(
    action: ExecutionAction
  ) {
    if (
      actionLoading ||
      !data?.outcome
    ) {
      return;
    }

    setActionLoading(action);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/planner/execute",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              outcomeId:
                data.outcome.id,

              action,
            }),
          }
        );

      const result =
        (await response.json()) as
          ExecutionResponse;

      setData(result);

      if (
        !response.ok ||
        !result.success
      ) {
        setMessage(
          result.error ??
            t("execution.actionError")
        );

        return;
      }

      setMessage(
        getActionMessage(
          result.performedAction
        )
      );
    } catch {
      setMessage(
        t("execution.actionError")
      );
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <section style={panelStyle}>
        <div style={loadingStyle}>
          <span style={pulseStyle} />

          <div>
            <strong>
              {t("execution.loading")}
            </strong>

            <p style={mutedTextStyle}>
              {t("execution.loadingDescription")}
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (
    !data?.success ||
    !data.outcome ||
    !data.execution
  ) {
    return (
      <section style={panelStyle}>
        <div style={emptyStyle}>
          <span style={emptyIconStyle}>
            🎯
          </span>

          <div>
            <p style={eyebrowStyle}>
              OUTCOME EXECUTION
            </p>

            <h2 style={emptyTitleStyle}>
              {t("execution.emptyTitle")}
            </h2>

            <p style={emptyTextStyle}>
              {t("execution.emptyDescription")}
            </p>
          </div>

          <div style={emptyActionsStyle}>
            <Link
              href="/outcomes"
              style={primaryLinkStyle}
            >
              {t("execution.openOutcomes")}
            </Link>

            <button
              type="button"
              onClick={() =>
                void loadExecution()
              }
              style={secondaryButtonStyle}
            >
              {t("execution.retry")}
            </button>
          </div>
        </div>

        {message && (
          <p style={messageStyle}>
            {message}
          </p>
        )}
      </section>
    );
  }

  const {
    outcome,
    execution,
  } = data;

  const doingTasks =
    execution.queue.filter(
      (task) =>
        task.status === "doing"
    );

  const todoTasks =
    execution.queue.filter(
      (task) =>
        task.status === "todo"
    );

  const doneTasks =
    execution.queue.filter(
      (task) =>
        task.status === "done"
    );

  const isCompleted =
    execution.remainingTasks ===
      0 &&
    execution.queueSize > 0;

  return (
    <section style={panelStyle}>
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>
            OUTCOME EXECUTION
          </p>

          <h2 style={titleStyle}>
            ⚡ Execution Command Center
          </h2>

          <p style={subtitleStyle}>
            {t("execution.description")}
          </p>
        </div>

        <div style={headerActionsStyle}>
          <button
            type="button"
            disabled={
              actionLoading !== null
            }
            onClick={() =>
              void runAction("sync")
            }
            style={refreshButtonStyle}
          >
            {actionLoading ===
            "sync"
              ? t("execution.syncing")
              : t("execution.sync")}
          </button>

          <Link
            href="/outcomes"
            style={outcomeLinkStyle}
          >
            Outcome Center →
          </Link>
        </div>
      </div>

      <div style={outcomeCardStyle}>
        <div style={outcomeTopStyle}>
          <div style={{ minWidth: 0 }}>
            <div style={badgeRowStyle}>
              <span style={activeBadgeStyle}>
                {formatStatus(
                  outcome.status
                )}
              </span>

              <span style={priorityBadgeStyle}>
                {formatPriority(
                  outcome.priority
                )}
              </span>
            </div>

            <h3 style={outcomeTitleStyle}>
              {outcome.title}
            </h3>
          </div>

          <strong style={progressValueStyle}>
            {execution.progress}%
          </strong>
        </div>

        <div style={progressTrackStyle}>
          <span
            style={{
              ...progressBarStyle,

              width: `${clampProgress(
                execution.progress
              )}%`,
            }}
          />
        </div>

        <div style={metricGridStyle}>
          <MetricCard
            label={t("execution.completed")}
            value={
              execution.completedTasks
            }
          />

          <MetricCard
            label={t("execution.remaining")}
            value={
              execution.remainingTasks
            }
          />

          <MetricCard
            label={t("execution.queueTotal")}
            value={
              execution.queueSize
            }
          />

          <MetricCard
            label={t("execution.stage")}
            value={
              execution
                .currentMilestone
                ?.order ?? "—"
            }
          />
        </div>
      </div>

      <div style={nextActionStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={cardEyebrowStyle}>
            NEXT ACTION
          </p>

          <h3 style={nextActionTitleStyle}>
            {isCompleted
              ? t("execution.outcomeComplete")
              : execution.nextAction
                  .title}
          </h3>

          <p style={nextActionTextStyle}>
            {isCompleted
              ? t("execution.outcomeCompleteDescription")
              : execution.nextAction
                  .description ||
                execution
                  .currentMilestone
                  ?.title ||
                t("execution.defaultAction")}
          </p>

          {execution.currentMilestone && (
            <div
              style={milestoneStyle}
            >
              <span>
                {t("execution.milestone")}
              </span>

              <strong>
                {
                  execution
                    .currentMilestone
                    .title
                }
              </strong>
            </div>
          )}
        </div>

        <div style={nextButtonsStyle}>
          {!isCompleted &&
            execution.nextTask
              ?.status === "todo" && (
              <button
                type="button"
                disabled={
                  actionLoading !==
                  null
                }
                onClick={() =>
                  void runAction(
                    "start-next"
                  )
                }
                style={startButtonStyle}
              >
                {actionLoading ===
                "start-next"
                  ? t("execution.starting")
                  : `▶ ${t("execution.startNext")}`}
              </button>
            )}

          {!isCompleted &&
            execution.nextTask && (
              <button
                type="button"
                disabled={
                  actionLoading !==
                  null
                }
                onClick={() =>
                  void runAction(
                    "complete-current"
                  )
                }
                style={completeButtonStyle}
              >
                {actionLoading ===
                "complete-current"
                  ? t("execution.completing")
                  : `✓ ${t("execution.completeCurrent")}`}
              </button>
            )}

          {isCompleted && (
            <Link
              href="/outcomes"
              style={startButtonStyle}
            >
              {t("execution.viewOutcome")}
            </Link>
          )}
        </div>
      </div>

      {message && (
        <div style={messageStyle}>
          {message}
        </div>
      )}

      <div style={queueGridStyle}>
        <QueueColumn
          title={t("execution.doing")}
          icon="🚀"
          tasks={doingTasks}
          emptyText={t("execution.noDoing")}
        />

        <QueueColumn
          title={t("execution.todo")}
          icon="⏳"
          tasks={todoTasks}
          emptyText={t("execution.noTodo")}
        />

        <QueueColumn
          title={t("execution.done")}
          icon="✅"
          tasks={doneTasks.slice(0, 6)}
          emptyText={t("execution.noDone")}
        />
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div style={metricCardStyle}>
      <strong style={metricValueStyle}>
        {value}
      </strong>

      <span style={metricLabelStyle}>
        {label}
      </span>
    </div>
  );
}

function QueueColumn({
  title,
  icon,
  tasks,
  emptyText,
}: {
  title: string;
  icon: string;
  tasks: ExecutionTask[];
  emptyText: string;
}) {
  return (
    <div style={queueColumnStyle}>
      <div style={queueHeaderStyle}>
        <strong>
          {icon} {title}
        </strong>

        <span style={queueCountStyle}>
          {tasks.length}
        </span>
      </div>

      <div style={taskListStyle}>
        {tasks.length === 0 ? (
          <p style={queueEmptyStyle}>
            {emptyText}
          </p>
        ) : (
          tasks.map((task) => (
            <article
              key={task.id}
              style={taskCardStyle}
            >
              <div
                style={taskStatusDotStyle(
                  task.status
                )}
              />

              <div style={{ minWidth: 0 }}>
                <strong
                  style={taskTitleStyle}
                >
                  {task.title}
                </strong>

                {task.description && (
                  <p
                    style={
                      taskDescriptionStyle
                    }
                  >
                    {task.description}
                  </p>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function getActionMessage(
  action:
    | string
    | undefined
): string {
  switch (action) {
    case "task-started":
      return "下一项任务已经进入执行状态。";

    case "task-already-doing":
      return "当前任务已经处于执行状态。";

    case "planner-concurrency-blocked":
      return "Planner 已达到当前并行上限，请先完成正在执行的任务。";

    case "task-completed":
      return "任务已完成，执行队列和 Outcome 进度已更新。";

    case "no-task-to-start":
      return "当前没有可以启动的任务。";

    case "no-task-to-complete":
      return "当前没有可以完成的任务。";

    default:
      return "Outcome、Milestone 和 Task 状态已同步。";
  }
}

function formatStatus(
  status: string
): string {
  switch (status) {
    case "active":
      return "执行中";

    case "planned":
      return "待启动";

    case "blocked":
      return "受阻";

    case "completed":
      return "已完成";

    default:
      return status;
  }
}

function formatPriority(
  priority: string
): string {
  switch (priority) {
    case "critical":
      return "最高优先级";

    case "high":
      return "高优先级";

    case "low":
      return "低优先级";

    default:
      return "普通优先级";
  }
}

function clampProgress(
  value: number
): number {
  return Math.max(
    0,
    Math.min(100, value)
  );
}

function taskStatusDotStyle(
  status: ExecutionTask["status"]
): React.CSSProperties {
  const background =
    status === "done"
      ? "#22c55e"
      : status === "doing"
        ? "#2563eb"
        : "#94a3b8";

  return {
    width: 10,
    height: 10,
    marginTop: 6,
    borderRadius: 999,
    flexShrink: 0,
    background,
    boxShadow:
      status === "doing"
        ? "0 0 0 5px rgba(37, 99, 235, 0.12)"
        : "none",
  };
}

const panelStyle: React.CSSProperties = {
  marginBottom: 24,
  padding: 20,
  border:
    "1px solid rgba(148, 163, 184, 0.22)",
  borderRadius: 24,
  background:
    "linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(17, 24, 39, 0.96))",
  boxShadow:
    "0 24px 70px rgba(15, 23, 42, 0.18)",
  color: "#f8fafc",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-start",
  gap: 18,
  flexWrap: "wrap",
  marginBottom: 18,
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  color: "#60a5fa",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.14em",
};

const titleStyle: React.CSSProperties = {
  margin: "7px 0 0",
  fontSize: 24,
  lineHeight: 1.25,
};

const subtitleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  maxWidth: 620,
  color: "#94a3b8",
  lineHeight: 1.6,
};

const headerActionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  flexWrap: "wrap",
};

const refreshButtonStyle: React.CSSProperties = {
  minHeight: 40,
  padding: "0 14px",
  border:
    "1px solid rgba(148, 163, 184, 0.3)",
  borderRadius: 12,
  background:
    "rgba(255,255,255,0.05)",
  color: "#e2e8f0",
  fontWeight: 700,
  cursor: "pointer",
};

const outcomeLinkStyle: React.CSSProperties = {
  minHeight: 40,
  display: "inline-flex",
  alignItems: "center",
  padding: "0 14px",
  borderRadius: 12,
  background:
    "rgba(37, 99, 235, 0.15)",
  color: "#93c5fd",
  fontWeight: 700,
  textDecoration: "none",
};

const outcomeCardStyle: React.CSSProperties = {
  padding: 18,
  border:
    "1px solid rgba(148, 163, 184, 0.18)",
  borderRadius: 18,
  background:
    "rgba(255,255,255,0.04)",
};

const outcomeTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-start",
  gap: 16,
};

const badgeRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 7,
  flexWrap: "wrap",
};

const activeBadgeStyle: React.CSSProperties = {
  padding: "5px 9px",
  borderRadius: 999,
  background:
    "rgba(34, 197, 94, 0.14)",
  color: "#86efac",
  fontSize: 11,
  fontWeight: 800,
};

const priorityBadgeStyle: React.CSSProperties = {
  padding: "5px 9px",
  borderRadius: 999,
  background:
    "rgba(245, 158, 11, 0.14)",
  color: "#fcd34d",
  fontSize: 11,
  fontWeight: 800,
};

const outcomeTitleStyle: React.CSSProperties = {
  margin: "10px 0 0",
  fontSize: 21,
  lineHeight: 1.35,
};

const progressValueStyle: React.CSSProperties = {
  color: "#93c5fd",
  fontSize: 24,
};

const progressTrackStyle: React.CSSProperties = {
  height: 9,
  marginTop: 17,
  overflow: "hidden",
  borderRadius: 999,
  background:
    "rgba(148, 163, 184, 0.15)",
};

const progressBarStyle: React.CSSProperties = {
  display: "block",
  height: "100%",
  borderRadius: 999,
  background:
    "linear-gradient(90deg, #2563eb, #22c55e)",
  transition: "width 300ms ease",
};

const metricGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(110px, 1fr))",
  gap: 10,
  marginTop: 16,
};

const metricCardStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 14,
  background:
    "rgba(15, 23, 42, 0.48)",
};

const metricValueStyle: React.CSSProperties = {
  display: "block",
  fontSize: 20,
};

const metricLabelStyle: React.CSSProperties = {
  display: "block",
  marginTop: 4,
  color: "#94a3b8",
  fontSize: 12,
};

const nextActionStyle: React.CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 18,
  flexWrap: "wrap",
  marginTop: 14,
  padding: 18,
  border:
    "1px solid rgba(59, 130, 246, 0.28)",
  borderRadius: 18,
  background:
    "linear-gradient(135deg, rgba(37, 99, 235, 0.17), rgba(14, 165, 233, 0.07))",
};

const cardEyebrowStyle: React.CSSProperties = {
  margin: 0,
  color: "#60a5fa",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "0.12em",
};

const nextActionTitleStyle: React.CSSProperties = {
  margin: "7px 0 0",
  fontSize: 20,
};

const nextActionTextStyle: React.CSSProperties = {
  margin: "7px 0 0",
  maxWidth: 680,
  color: "#cbd5e1",
  lineHeight: 1.55,
};

const milestoneStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 11,
  color: "#94a3b8",
  fontSize: 12,
};

const nextButtonsStyle: React.CSSProperties = {
  display: "flex",
  gap: 9,
  flexWrap: "wrap",
};

const startButtonStyle: React.CSSProperties = {
  minHeight: 44,
  display: "inline-flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "0 17px",
  border: 0,
  borderRadius: 13,
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: 800,
  textDecoration: "none",
  cursor: "pointer",
};

const completeButtonStyle: React.CSSProperties = {
  minHeight: 44,
  padding: "0 17px",
  border:
    "1px solid rgba(34, 197, 94, 0.38)",
  borderRadius: 13,
  background:
    "rgba(34, 197, 94, 0.12)",
  color: "#86efac",
  fontWeight: 800,
  cursor: "pointer",
};

const queueGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(230px, 1fr))",
  gap: 12,
  marginTop: 14,
};

const queueColumnStyle: React.CSSProperties = {
  minWidth: 0,
  padding: 14,
  border:
    "1px solid rgba(148, 163, 184, 0.16)",
  borderRadius: 16,
  background:
    "rgba(255,255,255,0.025)",
};

const queueHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 10,
};

const queueCountStyle: React.CSSProperties = {
  minWidth: 25,
  padding: "3px 7px",
  borderRadius: 999,
  textAlign: "center",
  background:
    "rgba(148, 163, 184, 0.14)",
  color: "#cbd5e1",
  fontSize: 11,
};

const taskListStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  marginTop: 12,
};

const taskCardStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  padding: 11,
  borderRadius: 13,
  background:
    "rgba(15, 23, 42, 0.52)",
};

const taskTitleStyle: React.CSSProperties = {
  display: "block",
  color: "#f8fafc",
  fontSize: 13,
  lineHeight: 1.45,
};

const taskDescriptionStyle: React.CSSProperties = {
  margin: "5px 0 0",
  color: "#94a3b8",
  fontSize: 12,
  lineHeight: 1.45,
};

const queueEmptyStyle: React.CSSProperties = {
  margin: 0,
  padding: "13px 4px",
  color: "#64748b",
  fontSize: 12,
  lineHeight: 1.5,
};

const emptyStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 15,
  flexWrap: "wrap",
};

const emptyIconStyle: React.CSSProperties = {
  fontSize: 32,
};

const emptyTitleStyle: React.CSSProperties = {
  margin: "5px 0 0",
  fontSize: 20,
};

const emptyTextStyle: React.CSSProperties = {
  margin: "7px 0 0",
  maxWidth: 600,
  color: "#94a3b8",
  lineHeight: 1.55,
};

const emptyActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginLeft: "auto",
};

const primaryLinkStyle: React.CSSProperties = {
  minHeight: 42,
  display: "inline-flex",
  alignItems: "center",
  padding: "0 15px",
  borderRadius: 12,
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: 800,
  textDecoration: "none",
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 42,
  padding: "0 15px",
  border:
    "1px solid rgba(148, 163, 184, 0.28)",
  borderRadius: 12,
  background:
    "rgba(255,255,255,0.04)",
  color: "#e2e8f0",
  fontWeight: 700,
  cursor: "pointer",
};

const messageStyle: React.CSSProperties = {
  margin: "13px 0 0",
  padding: "10px 12px",
  borderRadius: 12,
  background:
    "rgba(59, 130, 246, 0.1)",
  color: "#bfdbfe",
  fontSize: 13,
  lineHeight: 1.5,
};

const loadingStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 13,
};

const pulseStyle: React.CSSProperties = {
  width: 13,
  height: 13,
  borderRadius: 999,
  background: "#3b82f6",
  boxShadow:
    "0 0 0 7px rgba(59, 130, 246, 0.12)",
};

const mutedTextStyle: React.CSSProperties = {
  margin: "5px 0 0",
  color: "#94a3b8",
  fontSize: 13,
};
