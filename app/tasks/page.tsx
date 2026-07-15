"use client";

import { useEffect, useState } from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";

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
  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [title, setTitle] =
    useState("");

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

    createTask(
      cleanTitle,
      description
    );

    setTitle("");
    setDescription("");
    refreshTasks();
  }

  function handleStatusChange(
    id: string,
    status: TaskStatus
  ) {
    updateTask(id, {
      status,
    });

    refreshTasks();
  }

  function handleCompleteTask(
    id: string
  ) {
    completeTask(id);
    refreshTasks();
  }

  function handleDeleteTask(
    id: string
  ) {
    deleteTask(id);
    refreshTasks();
  }

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
            border:
              "1px solid #e5e7eb",
            borderRadius: 16,
          }}
        >
          <input
            value={title}
            onChange={(event) =>
              setTitle(
                event.target.value
              )
            }
            placeholder="任务标题"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "13px 14px",
              border:
                "1px solid #d1d5db",
              borderRadius: 10,
              fontSize: 16,
            }}
          />

          <textarea
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value
              )
            }
            placeholder="任务说明（可选）"
            rows={3}
            style={{
              width: "100%",
              boxSizing: "border-box",
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
              fontWeight: 700,
            }}
          >
            创建任务
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
              任务列表
            </h2>

            <span
              style={{
                color: "#6b7280",
              }}
            >
              {tasks.length} 项
            </span>
          </div>

          {tasks.length === 0 ? (
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
                    background:
                      "#ffffff",
                    border:
                      "1px solid #e5e7eb",
                    borderRadius: 14,
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
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 14,
                    }}
                  >
                    <select
                      value={task.status}
                      onChange={(event) =>
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

                      <option value="doing">
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
                        onClick={() =>
                          handleCompleteTask(
                            task.id
                          )
                        }
                      >
                        完成任务
                      </button>
                    )}

                    <button
                      type="button"
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
              ))}
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}