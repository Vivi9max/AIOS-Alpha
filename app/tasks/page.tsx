"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";
import { useLanguage } from "@/components/i18n/LanguageProvider";

import type {
  Task,
  TaskStatus,
} from "@/lib/task/types";

import {
  requestPlannerRefresh,
} from "@/lib/planner/events";

import type {
  PlannerTaskControl,
} from "@/lib/planner/execution-control";

interface TasksResponse {
  success: boolean;
  tasks?: Task[];
  control?:
    PlannerTaskControl |
    null;
  code?: string;
  action?: string;
  error?: string;
}

export default function TasksPage() {
  const { t } = useLanguage();
  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [
    control,
    setControl,
  ] = useState<
    PlannerTaskControl |
    null
  >(null);

  const [title, setTitle] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadTasks =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const response =
            await fetch(
              "/api/tasks",
              {
                cache:
                  "no-store",
              }
            );

          const data =
            (await response.json()) as TasksResponse;

          if (
            data.control
          ) {
            setControl(
              data.control
            );
          }

          if (
            !response.ok ||
            !data.success
          ) {
            throw new Error(
              data.error ??
                "Tasks loading failed."
            );
          }

          setTasks(
            Array.isArray(
              data.tasks
            )
              ? data.tasks
              : []
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "任务读取失败。"
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  async function handleCreateTask() {
    const cleanTitle =
      title.trim();

    if (
      !cleanTitle ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/tasks",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              title:
                cleanTitle,

              description,
            }),
          }
        );

      const data =
        (await response.json()) as
          TasksResponse;

      if (
        data.control
      ) {
        setControl(
          data.control
        );
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ??
            "Task creation failed."
        );
      }

      setTitle(
        ""
      );

      setDescription(
        ""
      );

      await loadTasks();

      requestPlannerRefresh(
        "task-created"
      );
    } catch (
      createError
    ) {
      setError(
        createError instanceof
          Error
          ? createError.message
          : "任务创建失败。"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(
    id: string,
    status: TaskStatus
  ) {
    setSaving(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/tasks",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              id,
              status,
            }),
          }
        );

      const data =
        (await response.json()) as
          TasksResponse;

      if (
        data.control
      ) {
        setControl(
          data.control
        );
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ??
            "Task update failed."
        );
      }

      await loadTasks();

      requestPlannerRefresh(
        status ===
          "done"
          ? "task-completed"
          : "task-updated"
      );
    } catch (
      updateError
    ) {
      setError(
        updateError instanceof
          Error
          ? updateError.message
          : "任务更新失败。"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTask(
    id: string
  ) {
    const confirmed =
      window.confirm(
        t("tasks.deleteConfirm")
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/tasks?id=${encodeURIComponent(
            id
          )}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ??
            "Task deletion failed."
        );
      }

      await loadTasks();

      requestPlannerRefresh(
        "task-deleted"
      );
    } catch {
      setError(
        "任务删除失败。"
      );
    } finally {
      setSaving(false);
    }
  }

  const canCreateTask =
    control?.canCreateTask ??
    !loading;

  const canStartTask =
    control?.canStartTask ??
    true;

  const modeLabel =
    control
      ? {
          baseline:
            "Baseline",

          accelerate:
            "Accelerate",

          focus:
            "Focus",

          recover:
            "Recover",
        }[control.mode]
      : "Syncing";

  const modeHealthy =
    control?.mode ===
      "baseline" ||
    control?.mode ===
      "accelerate";

  return (
    <WorkspaceShell>
      <div
        style={{
          width: "100%",
          maxWidth: 760,
          margin: "0 auto",
          color: "#111827",
        }}
      >
        <header
          style={{
            marginBottom: 24,
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#6b7280",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            AIOS Alpha
          </p>

          <h1
            style={{
              margin: "6px 0 0",
              fontSize: 30,
            }}
          >
            {t("tasks.title")}
          </h1>

          <p
            style={{
              margin: "10px 0 0",
              color: "#6b7280",
              lineHeight: 1.6,
            }}
          >
            {t("tasks.description")}
          </p>
        </header>

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: 16,
              padding: 13,
              border:
                "1px solid #fecaca",
              borderRadius: 10,
              background:
                "#fff7f7",
              color: "#b91c1c",
            }}
          >
            {error}
          </div>
        )}

        <section
          style={{
            padding: 18,
            marginBottom: 20,
            border: `1px solid ${
              modeHealthy
                ? "#bfdbfe"
                : "#fde68a"
            }`,
            borderRadius: 16,
            background:
              modeHealthy
                ? "#eff6ff"
                : "#fffbeb",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems:
                "flex-start",
              justifyContent:
                "space-between",
              gap: 12,
            }}
          >
            <div
              style={{
                minWidth: 0,
                flex: "1 1 320px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: modeHealthy
                    ? "#1d4ed8"
                    : "#92400e",
                  fontSize: 11,
                  fontWeight: 850,
                  letterSpacing:
                    "0.08em",
                  textTransform:
                    "uppercase",
                }}
              >
                {t("tasks.guard")}
              </p>

              <h2
                style={{
                  margin: "7px 0 0",
                  fontSize: 19,
                  lineHeight: 1.35,
                }}
              >
                {control?.title ??
                  t("tasks.syncTitle")}
              </h2>

              <p
                style={{
                  margin: "7px 0 0",
                  color: "#475569",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                {control?.reason ??
                  t("tasks.syncReason")}
              </p>
            </div>

            <span
              style={{
                flexShrink: 0,
                padding: "6px 10px",
                border: `1px solid ${
                  modeHealthy
                    ? "#93c5fd"
                    : "#fcd34d"
                }`,
                borderRadius: 999,
                background:
                  "rgba(255,255,255,0.75)",
                color: modeHealthy
                  ? "#1d4ed8"
                  : "#92400e",
                fontSize: 11,
                fontWeight: 850,
              }}
            >
              {modeLabel}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(135px, 1fr))",
              gap: 10,
              marginTop: 15,
            }}
          >
            <ControlMetric
              label={t("tasks.concurrent")}
              value={
                control
                  ? `${control.doingCount} / ${control.maxConcurrentTasks}`
                  : "—"
              }
            />

            <ControlMetric
              label={t("tasks.queue")}
              value={
                control
                  ? `${control.queuedCount} 待处理`
                  : "—"
              }
            />

            <ControlMetric
              label={t("tasks.newTask")}
              value={
                canCreateTask
                  ? t("tasks.allowed")
                  : t("tasks.paused")
              }
            />
          </div>

          {control && (
            <p
              style={{
                margin: "14px 0 0",
                paddingTop: 13,
                borderTop:
                  "1px solid rgba(148, 163, 184, 0.28)",
                color: "#334155",
                fontSize: 13,
                fontWeight: 700,
                lineHeight: 1.55,
              }}
            >
              {t("tasks.currentAction")}
              {control.primaryAction}
            </p>
          )}
        </section>

        <section
          style={{
            padding: 18,
            marginBottom: 20,
            background: "#ffffff",
            border:
              "1px solid #e5e7eb",
            borderRadius: 16,
          }}
        >
          {!canCreateTask &&
            control && (
              <div
                style={{
                  marginBottom: 12,
                  padding: 12,
                  border:
                    "1px solid #fde68a",
                  borderRadius: 10,
                  background:
                    "#fffbeb",
                  color: "#92400e",
                  fontSize: 12,
                  lineHeight: 1.55,
                }}
              >
                Planner 已暂停新增任务。
                {control.primaryAction}
              </div>
            )}

          <input
            aria-label={t("tasks.titleLabel")}
            value={title}
            disabled={
              saving ||
              loading ||
              !canCreateTask
            }
            onChange={(event) =>
              setTitle(
                event.target.value
              )
            }
            placeholder={t("tasks.titleLabel")}
            style={{
              width: "100%",
              boxSizing:
                "border-box",
              padding: "13px 14px",
              border:
                "1px solid #d1d5db",
              borderRadius: 10,
              fontSize: 16,
            }}
          />

          <textarea
            aria-label={t("tasks.descriptionLabel")}
            value={description}
            disabled={
              saving ||
              loading ||
              !canCreateTask
            }
            onChange={(event) =>
              setDescription(
                event.target.value
              )
            }
            placeholder={t("tasks.descriptionLabel")}
            rows={3}
            style={{
              width: "100%",
              boxSizing:
                "border-box",
              marginTop: 12,
              padding: "13px 14px",
              border:
                "1px solid #d1d5db",
              borderRadius: 10,
              fontSize: 15,
              resize: "vertical",
            }}
          />

          <button
            type="button"
            onClick={
              handleCreateTask
            }
            disabled={
              !title.trim() ||
              saving ||
              loading ||
              !canCreateTask
            }
            style={{
              width: "100%",
              marginTop: 12,
              padding: "13px 16px",
              border: 0,
              borderRadius: 10,
              background:
                title.trim() &&
                !saving &&
                !loading &&
                canCreateTask
                  ? "#111827"
                  : "#d1d5db",
              color: "#ffffff",
              fontWeight: 700,
            }}
          >
            {saving
              ? t("tasks.processing")
              : !canCreateTask
                ? "Planner 已暂停新增任务"
                : t("tasks.create")}
          </button>
        </section>

        <section>
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 19,
              }}
            >
              {t("tasks.list")}
            </h2>

            <span
              style={{
                color: "#6b7280",
              }}
            >
              {tasks.length} 项
            </span>
          </div>

          {loading ? (
            <div
              style={{
                padding: 30,
                textAlign:
                  "center",
                color: "#64748b",
              }}
            >
              {t("tasks.loading")}
            </div>
          ) : tasks.length === 0 ? (
            <div
              style={{
                padding:
                  "36px 18px",
                background:
                  "#ffffff",
                border:
                  "1px dashed #cbd5e1",
                borderRadius: 16,
                textAlign: "center",
                color: "#64748b",
              }}
            >
              {t("tasks.empty")}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >
              {tasks.map(
                (task) => (
                  <article
                    key={task.id}
                    style={{
                      padding: 16,
                      background:
                        "#ffffff",
                      border:
                        "1px solid #e5e7eb",
                      borderRadius:
                        14,
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        textDecoration:
                          task.status ===
                          "done"
                            ? "line-through"
                            : "none",
                      }}
                    >
                      {task.title}
                    </h3>

                    {task.description && (
                      <p
                        style={{
                          color:
                            "#6b7280",
                          whiteSpace:
                            "pre-wrap",
                        }}
                      >
                        {
                          task.description
                        }
                      </p>
                    )}

                    <div
                      style={{
                        display: "flex",
                        flexWrap:
                          "wrap",
                        gap: 8,
                        marginTop: 14,
                      }}
                    >
                      <select
                        aria-label={`${task.title} 状态`}
                        value={
                          task.status
                        }
                        disabled={saving}
                        onChange={(
                          event
                        ) =>
                          handleStatusChange(
                            task.id,
                            event.target
                              .value as TaskStatus
                          )
                        }
                      >
                        <option value="todo">
                          待处理
                        </option>

                        <option
                          value="doing"
                          disabled={
                            task.status !==
                              "doing" &&
                            !canStartTask
                          }
                        >
                          进行中
                        </option>

                        <option value="done">
                          已完成
                        </option>
                      </select>

                      {task.status !==
                        "done" && (
                        <button
                          type="button"
                          disabled={
                            saving
                          }
                          onClick={() =>
                            handleStatusChange(
                              task.id,
                              "done"
                            )
                          }
                        >
                          完成任务
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={
                          saving
                        }
                        onClick={() =>
                          handleDeleteTask(
                            task.id
                          )
                        }
                      >
                        删除
                      </button>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}

function ControlMetric({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div
      style={{
        padding: 11,
        border:
          "1px solid rgba(148, 163, 184, 0.28)",
        borderRadius: 11,
        background:
          "rgba(255,255,255,0.68)",
      }}
    >
      <span
        style={{
          display: "block",
          color: "#64748b",
          fontSize: 10,
          fontWeight: 750,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: 5,
          color: "#0f172a",
          fontSize: 14,
        }}
      >
        {value}
      </strong>
    </div>
  );
}
