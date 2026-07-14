"use client";

import { useEffect, useState } from "react";

import type {
  Task,
  TaskStatus,
} from "@/lib/task";

import {
  completeTask,
  createTask,
  deleteTask,
  listTasks,
  updateTask,
} from "@/lib/task";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");

  function refreshTasks() {
    setTasks(listTasks());
  }

  useEffect(() => {
    refreshTasks();
  }, []);

  function handleCreateTask() {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      return;
    }

    createTask(cleanTitle, description);

    setTitle("");
    setDescription("");
    refreshTasks();
  }

  function handleStatusChange(
    task: Task,
    status: TaskStatus
  ) {
    updateTask(task.id, {
      status,
    });

    refreshTasks();
  }

  function handleCompleteTask(id: string) {
    completeTask(id);
    refreshTasks();
  }

  function handleDeleteTask(id: string) {
    deleteTask(id);
    refreshTasks();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f6f7fb",
        padding: "24px 16px 48px",
        color: "#111827",
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
              lineHeight: 1.2,
            }}
          >
            Tasks
          </h1>

          <p
            style={{
              margin: "10px 0 0",
              color: "#6b7280",
              lineHeight: 1.6,
            }}
          >
            创建、更新并完成你的工作任务。
          </p>
        </header>

        <section
          style={{
            padding: 18,
            marginBottom: 20,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            boxShadow:
              "0 8px 24px rgba(15, 23, 42, 0.05)",
          }}
        >
          <input
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleCreateTask();
              }
            }}
            placeholder="任务标题"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "13px 14px",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              fontSize: 16,
              outline: "none",
            }}
          />

          <textarea
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            placeholder="任务说明（可选）"
            rows={3}
            style={{
              width: "100%",
              boxSizing: "border-box",
              marginTop: 12,
              padding: "13px 14px",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              fontSize: 15,
              lineHeight: 1.5,
              resize: "vertical",
              outline: "none",
            }}
          />

          <button
            type="button"
            onClick={handleCreateTask}
            disabled={!title.trim()}
            style={{
              width: "100%",
              marginTop: 12,
              padding: "13px 16px",
              border: 0,
              borderRadius: 10,
              background: title.trim()
                ? "#111827"
                : "#d1d5db",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 700,
              cursor: title.trim()
                ? "pointer"
                : "not-allowed",
            }}
          >
            创建任务
          </button>
        </section>

        <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
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
              任务列表
            </h2>

            <span
              style={{
                color: "#6b7280",
                fontSize: 14,
              }}
            >
              {tasks.length} 项
            </span>
          </div>

          {tasks.length === 0 ? (
            <div
              style={{
                padding: "36px 18px",
                background: "#ffffff",
                border: "1px dashed #cbd5e1",
                borderRadius: 16,
                textAlign: "center",
                color: "#64748b",
              }}
            >
              还没有任务，先创建第一项任务。
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >
              {tasks.map((task) => (
                <article
                  key={task.id}
                  style={{
                    padding: 16,
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 14,
                    opacity:
                      task.status === "done"
                        ? 0.72
                        : 1,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      justifyContent:
                        "space-between",
                      alignItems: "flex-start",
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
                          fontSize: 17,
                          lineHeight: 1.4,
                          textDecoration:
                            task.status === "done"
                              ? "line-through"
                              : "none",
                        }}
                      >
                        {task.title}
                      </h3>

                      {task.description && (
                        <p
                          style={{
                            margin: "8px 0 0",
                            color: "#6b7280",
                            lineHeight: 1.55,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {task.description}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteTask(task.id)
                      }
                      aria-label="删除任务"
                      style={{
                        padding: "6px 9px",
                        border:
                          "1px solid #fecaca",
                        borderRadius: 8,
                        background: "#fff7f7",
                        color: "#b91c1c",
                        cursor: "pointer",
                      }}
                    >
                      删除
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 14,
                    }}
                  >
                    <select
                      value={task.status}
                      onChange={(event) =>
                        handleStatusChange(
                          task,
                          event.target
                            .value as TaskStatus
                        )
                      }
                      style={{
                        padding: "9px 10px",
                        border:
                          "1px solid #d1d5db",
                        borderRadius: 8,
                        background: "#ffffff",
                      }}
                    >
                      <option value="todo">
                        待处理
                      </option>

                      <option value="doing">
                        进行中
                      </option>

                      <option value="done">
                        已完成
                      </option>
                    </select>

                    {task.status !== "done" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleCompleteTask(
                            task.id
                          )
                        }
                        style={{
                          padding: "9px 12px",
                          border: 0,
                          borderRadius: 8,
                          background: "#dcfce7",
                          color: "#166534",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        完成任务
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}