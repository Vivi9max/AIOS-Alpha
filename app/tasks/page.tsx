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
    | PlannerTaskControl
    | null;
  code?: string;
  action?: string;
  error?: string;
}

const statusOrder: TaskStatus[] = [
  "todo",
  "doing",
  "done",
];

export default function TasksPage() {
  const { t } = useLanguage();

  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [
    control,
    setControl,
  ] = useState<
    PlannerTaskControl | null
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
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            "/api/tasks",
            {
              cache:
                "no-store",
            },
          );

        const data =
          (await response.json()) as TasksResponse;

        if (data.control) {
          setControl(
            data.control,
          );
        }

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ??
              "Tasks loading failed.",
          );
        }

        setTasks(
          Array.isArray(
            data.tasks,
          )
            ? data.tasks
            : [],
        );
      } catch (
        loadError
      ) {
        setError(
          loadError instanceof
            Error
            ? loadError.message
            : "任务读取失败。",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadTasks();
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
              description:
                description.trim(),
            }),
          },
        );

      const data =
        (await response.json()) as TasksResponse;

      if (data.control) {
        setControl(
          data.control,
        );
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ??
            "Task creation failed.",
        );
      }

      setTitle("");
      setDescription("");

      await loadTasks();

      requestPlannerRefresh(
        "task-created",
      );
    } catch (
      createError
    ) {
      setError(
        createError instanceof
          Error
          ? createError.message
          : "任务创建失败。",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(
    id: string,
    status: TaskStatus,
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
          },
        );

      const data =
        (await response.json()) as TasksResponse;

      if (data.control) {
        setControl(
          data.control,
        );
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ??
            "Task update failed.",
        );
      }

      await loadTasks();

      requestPlannerRefresh(
        status === "done"
          ? "task-completed"
          : "task-updated",
      );
    } catch (
      updateError
    ) {
      setError(
        updateError instanceof
          Error
          ? updateError.message
          : "任务更新失败。",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTask(
    id: string,
  ) {
    const confirmed =
      window.confirm(
        t("tasks.deleteConfirm"),
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
            id,
          )}`,
          {
            method: "DELETE",
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ??
            "Task deletion failed.",
        );
      }

      await loadTasks();

      requestPlannerRefresh(
        "task-deleted",
      );
    } catch {
      setError(
        "任务删除失败。",
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

  const todoCount =
    tasks.filter(
      (task) =>
        task.status ===
        "todo",
    ).length;

  const doingCount =
    tasks.filter(
      (task) =>
        task.status ===
        "doing",
    ).length;

  const doneCount =
    tasks.filter(
      (task) =>
        task.status ===
        "done",
    ).length;

  return (
    <WorkspaceShell>
      <main
        style={{
          width: "100%",
          maxWidth: 900,
          margin: "0 auto",
          padding:
            "22px 12px 42px",
          boxSizing:
            "border-box",
          color: "#111827",
        }}
      >
        <header
          style={{
            marginBottom: 20,
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
              gap: 14,
              flexWrap:
                "wrap",
            }}
          >
            <div
              style={{
                minWidth: 0,
              }}
            >
              <p
                style={{
                  margin: 0,
                  color:
                    "#6b7280",
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing:
                    "0.10em",
                  textTransform:
                    "uppercase",
                }}
              >
                AIOS Workspace
              </p>

              <h1
                style={{
                  margin:
                    "6px 0 0",
                  fontSize:
                    "clamp(26px, 6vw, 34px)",
                  lineHeight: 1.1,
                  letterSpacing:
                    "-0.03em",
                }}
              >
                {t(
                  "tasks.title",
                )}
              </h1>

              <p
                style={{
                  margin:
                    "8px 0 0",
                  color:
                    "#6b7280",
                  fontSize: 13,
                  lineHeight: 1.55,
                  maxWidth: 620,
                }}
              >
                {t(
                  "tasks.description",
                )}
              </p>
            </div>

            <div
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap: 7,
                padding:
                  "8px 11px",
                borderRadius:
                  999,
                background:
                  modeHealthy
                    ? "#ecfdf5"
                    : "#fffbeb",
                color:
                  modeHealthy
                    ? "#047857"
                    : "#92400e",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius:
                    "50%",
                  background:
                    modeHealthy
                      ? "#22c55e"
                      : "#f59e0b",
                }}
              />

              {modeLabel}
            </div>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: 14,
              padding:
                "11px 13px",
              border:
                "1px solid #fecaca",
              borderRadius: 12,
              background:
                "#fff7f7",
              color:
                "#b91c1c",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        <section
          style={{
            padding: 17,
            marginBottom: 14,
            border:
              "1px solid #e5e7eb",
            borderRadius: 17,
            background:
              "#ffffff",
            boxShadow:
              "0 8px 28px rgba(15,23,42,0.05)",
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
              gap: 14,
              flexWrap:
                "wrap",
            }}
          >
            <div
              style={{
                minWidth: 0,
                flex:
                  "1 1 360px",
              }}
            >
              <div
                style={{
                  color:
                    "#6b7280",
                  fontSize: 10,
                  fontWeight: 850,
                  letterSpacing:
                    "0.10em",
                }}
              >
                PLANNER CONTROL
              </div>

              <h2
                style={{
                  margin:
                    "6px 0 0",
                  fontSize: 20,
                  lineHeight: 1.3,
                }}
              >
                {control?.title ??
                  t(
                    "tasks.syncTitle",
                  )}
              </h2>

              <p
                style={{
                  margin:
                    "7px 0 0",
                  color:
                    "#64748b",
                  fontSize: 12,
                  lineHeight: 1.55,
                }}
              >
                {control?.reason ??
                  t(
                    "tasks.syncReason",
                  )}
              </p>
            </div>

            <span
              style={{
                flexShrink: 0,
                padding:
                  "6px 10px",
                border:
                  "1px solid #e5e7eb",
                borderRadius:
                  999,
                background:
                  "#f8fafc",
                color:
                  "#475569",
                fontSize: 11,
                fontWeight: 850,
              }}
            >
              {modeLabel}
            </span>
          </div>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(135px, 1fr))",
              gap: 9,
              marginTop: 15,
            }}
          >
            <ControlMetric
              label={t(
                "tasks.concurrent",
              )}
              value={
                control
                  ? `${control.doingCount} / ${control.maxConcurrentTasks}`
                  : "—"
              }
            />

            <ControlMetric
              label="Todo"
              value={String(
                todoCount,
              )}
            />

            <ControlMetric
              label="Doing"
              value={String(
                doingCount,
              )}
            />

            <ControlMetric
              label="Done"
              value={String(
                doneCount,
              )}
            />
          </div>

          {control && (
            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                gap: 10,
                marginTop: 14,
                paddingTop: 13,
                borderTop:
                  "1px solid #eef2f7",
                flexWrap:
                  "wrap",
              }}
            >
              <span
                style={{
                  color:
                    "#64748b",
                  fontSize: 11,
                }}
              >
                {t(
                  "tasks.currentAction",
                )}
              </span>

              <strong
                style={{
                  color:
                    "#111827",
                  fontSize: 12,
                }}
              >
                {control.primaryAction}
              </strong>
            </div>
          )}
        </section>

        <section
          style={{
            padding: 17,
            marginBottom: 18,
            border:
              "1px solid #e5e7eb",
            borderRadius: 17,
            background:
              "#ffffff",
            boxShadow:
              "0 8px 28px rgba(15,23,42,0.05)",
          }}
        >
          <div
            style={{
              marginBottom: 12,
            }}
          >
            <div
              style={{
                color:
                  "#6b7280",
                fontSize: 10,
                fontWeight: 850,
                letterSpacing:
                  "0.10em",
              }}
            >
              NEW OUTCOME
            </div>

            <h2
              style={{
                margin:
                  "6px 0 0",
                fontSize: 18,
              }}
            >
              Create a task
            </h2>
          </div>

          {!canCreateTask &&
            control && (
              <div
                style={{
                  marginBottom: 12,
                  padding:
                    "10px 12px",
                  border:
                    "1px solid #fde68a",
                  borderRadius: 10,
                  background:
                    "#fffbeb",
                  color:
                    "#92400e",
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                Planner 已暂停新增任务。
                {" "}
                {control.primaryAction}
              </div>
            )}

          <input
            aria-label={t(
              "tasks.titleLabel",
            )}
            value={title}
            disabled={
              saving ||
              loading ||
              !canCreateTask
            }
            onChange={(
              event,
            ) =>
              setTitle(
                event.target
                  .value,
              )
            }
            placeholder={t(
              "tasks.titleLabel",
            )}
            style={{
              width: "100%",
              boxSizing:
                "border-box",
              minHeight: 46,
              padding:
                "12px 14px",
              border:
                "1px solid #d1d5db",
              borderRadius: 11,
              outline: "none",
              fontSize: 15,
            }}
          />

          <textarea
            aria-label={t(
              "tasks.descriptionLabel",
            )}
            value={
              description
            }
            disabled={
              saving ||
              loading ||
              !canCreateTask
            }
            onChange={(
              event,
            ) =>
              setDescription(
                event.target
                  .value,
              )
            }
            placeholder={t(
              "tasks.descriptionLabel",
            )}
            rows={3}
            style={{
              width: "100%",
              boxSizing:
                "border-box",
              marginTop: 10,
              padding:
                "12px 14px",
              border:
                "1px solid #d1d5db",
              borderRadius: 11,
              outline: "none",
              fontSize: 14,
              lineHeight: 1.5,
              resize:
                "vertical",
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
              minHeight: 44,
              marginTop: 10,
              padding:
                "0 16px",
              border: 0,
              borderRadius: 11,
              background:
                title.trim() &&
                !saving &&
                !loading &&
                canCreateTask
                  ? "#111827"
                  : "#d1d5db",
              color:
                "#ffffff",
              fontSize: 13,
              fontWeight: 800,
              cursor:
                title.trim() &&
                !saving &&
                !loading &&
                canCreateTask
                  ? "pointer"
                  : "not-allowed",
            }}
          >
            {saving
              ? t(
                  "tasks.processing",
                )
              : !canCreateTask
                ? "Planner 已暂停新增任务"
                : t(
                    "tasks.create",
                  )}
          </button>
        </section>

        <section>
          <div
            style={{
              display:
                "flex",
              alignItems:
                "flex-end",
              justifyContent:
                "space-between",
              gap: 12,
              marginBottom: 12,
              flexWrap:
                "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color:
                    "#6b7280",
                  fontSize: 10,
                  fontWeight: 850,
                  letterSpacing:
                    "0.10em",
                }}
              >
                TASK STATE
              </div>

              <h2
                style={{
                  margin:
                    "5px 0 0",
                  fontSize: 19,
                }}
              >
                {t(
                  "tasks.list",
                )}
              </h2>
            </div>

            <span
              style={{
                color:
                  "#64748b",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {tasks.length} 项
            </span>
          </div>

          {loading ? (
            <div
              style={{
                padding: 36,
                border:
                  "1px solid #e5e7eb",
                borderRadius: 16,
                background:
                  "#ffffff",
                textAlign:
                  "center",
                color:
                  "#64748b",
              }}
            >
              {t(
                "tasks.loading",
              )}
            </div>
          ) : tasks.length ===
            0 ? (
            <div
              style={{
                padding:
                  "42px 18px",
                border:
                  "1px dashed #cbd5e1",
                borderRadius: 16,
                background:
                  "#ffffff",
                textAlign:
                  "center",
                color:
                  "#64748b",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 750,
                  color:
                    "#334155",
                }}
              >
                {t(
                  "tasks.empty",
                )}
              </div>

              <p
                style={{
                  margin:
                    "7px 0 0",
                  fontSize: 12,
                }}
              >
                {t(
                  "tasks.emptyHint",
                )}
              </p>
            </div>
          ) : (
            <div
              style={{
                display:
                  "grid",
                gap: 10,
              }}
            >
              {tasks.map(
                (task) => (
                  <TaskCard
                    key={
                      task.id
                    }
                    task={
                      task
                    }
                    saving={
                      saving
                    }
                    canStartTask={
                      canStartTask
                    }
                    onStatusChange={
                      handleStatusChange
                    }
                    onDelete={
                      handleDeleteTask
                    }
                  />
                ),
              )}
            </div>
          )}
        </section>
      </main>
    </WorkspaceShell>
  );
}

function TaskCard({
  task,
  saving,
  canStartTask,
  onStatusChange,
  onDelete,
}: {
  task: Task;
  saving: boolean;
  canStartTask: boolean;
  onStatusChange: (
    id: string,
    status: TaskStatus,
  ) => void;
  onDelete: (
    id: string,
  ) => void;
}) {
  const statusLabel =
    task.status ===
    "done"
      ? "已完成"
      : task.status ===
          "doing"
        ? "进行中"
        : "待处理";

  const statusBackground =
    task.status ===
    "done"
      ? "#ecfdf5"
      : task.status ===
          "doing"
        ? "#eff6ff"
        : "#f8fafc";

  const statusColor =
    task.status ===
    "done"
      ? "#047857"
      : task.status ===
          "doing"
        ? "#1d4ed8"
        : "#475569";

  return (
    <article
      style={{
        padding: 15,
        border:
          "1px solid #e5e7eb",
        borderRadius: 15,
        background:
          "#ffffff",
        boxShadow:
          "0 5px 18px rgba(15,23,42,0.035)",
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
          gap: 12,
        }}
      >
        <div
          style={{
            minWidth: 0,
            flex: 1,
          }}
        >
          <h3
            style={{
              margin: 0,
              color:
                "#111827",
              fontSize: 15,
              lineHeight: 1.45,
              textDecoration:
                task.status ===
                "done"
                  ? "line-through"
                  : "none",
              overflowWrap:
                "anywhere",
            }}
          >
            {task.title}
          </h3>

          {task.description && (
            <p
              style={{
                margin:
                  "7px 0 0",
                color:
                  "#64748b",
                fontSize: 12,
                lineHeight: 1.55,
                whiteSpace:
                  "pre-wrap",
              }}
            >
              {
                task.description
              }
            </p>
          )}
        </div>

        <span
          style={{
            flexShrink: 0,
            padding:
              "5px 9px",
            borderRadius:
              999,
            background:
              statusBackground,
            color:
              statusColor,
            fontSize: 10,
            fontWeight: 850,
          }}
        >
          {statusLabel}
        </span>
      </div>

      <div
        style={{
          display:
            "flex",
          alignItems:
            "center",
          gap: 8,
          marginTop: 13,
          paddingTop: 12,
          borderTop:
            "1px solid #f1f5f9",
          flexWrap:
            "wrap",
        }}
      >
        <select
          aria-label={`${task.title} 状态`}
          value={
            task.status
          }
          disabled={saving}
          onChange={(
            event,
          ) =>
            onStatusChange(
              task.id,
              event.target
                .value as TaskStatus,
            )
          }
          style={{
            minHeight: 34,
            padding:
              "0 9px",
            border:
              "1px solid #d1d5db",
            borderRadius: 8,
            background:
              "#ffffff",
            color:
              "#334155",
            fontSize: 12,
          }}
        >
          {statusOrder.map(
            (status) => (
              <option
                key={status}
                value={
                  status
                }
                disabled={
                  status ===
                    "doing" &&
                  task.status !==
                    "doing" &&
                  !canStartTask
                }
              >
                {status ===
                "todo"
                  ? "待处理"
                  : status ===
                      "doing"
                    ? "进行中"
                    : "已完成"}
              </option>
            ),
          )}
        </select>

        {task.status !==
          "done" && (
          <button
            type="button"
            disabled={
              saving
            }
            onClick={() =>
              onStatusChange(
                task.id,
                "done",
              )
            }
            style={{
              minHeight: 34,
              padding:
                "0 11px",
              border:
                "1px solid #d1d5db",
              borderRadius: 8,
              background:
                "#ffffff",
              color:
                "#334155",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            完成
          </button>
        )}

        <button
          type="button"
          disabled={
            saving
          }
          onClick={() =>
            onDelete(
              task.id,
            )
          }
          style={{
            minHeight: 34,
            padding:
              "0 11px",
            marginLeft:
              "auto",
            border:
              "1px solid #e5e7eb",
            borderRadius: 8,
            background:
              "#ffffff",
            color:
              "#64748b",
            fontSize: 12,
          }}
        >
          删除
        </button>
      </div>
    </article>
  );
}

function ControlMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: 11,
        border:
          "1px solid #e5e7eb",
        borderRadius: 11,
        background:
          "#f8fafc",
      }}
    >
      <span
        style={{
          display:
            "block",
          color:
            "#64748b",
          fontSize: 10,
          fontWeight: 750,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          display:
            "block",
          marginTop: 5,
          color:
            "#0f172a",
          fontSize: 14,
        }}
      >
        {value}
      </strong>
    </div>
  );
}
