"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { listTasks } from "@/lib/task";

interface MemoryRecord {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface DashboardStats {
  memory: number;
  tasks: number;
  completedTasks: number;
}

const moduleCards = [
  {
    title: "💬 Chat",
    description: "与 AIOS Brain 对话",
    href: "/workspace",
  },
  {
    title: "🧠 Memory",
    description: "查看和管理对话记忆",
    href: "/memory",
  },
  {
    title: "✅ Tasks",
    description: "创建和完成工作任务",
    href: "/tasks",
  },
  {
    title: "⚙️ Settings",
    description: "管理模型与系统配置",
    href: "/settings",
  },
];

export default function DashboardPage() {
  const [stats, setStats] =
    useState<DashboardStats>({
      memory: 0,
      tasks: 0,
      completedTasks: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const loadDashboard = useCallback(
    async () => {
      setLoading(true);

      const tasks = listTasks();

      let memory: MemoryRecord[] = [];

      try {
        const response = await fetch(
          "/api/memory",
          {
            cache: "no-store",
          }
        );

        if (response.ok) {
          const data =
            await response.json();

          memory = Array.isArray(
            data.items
          )
            ? data.items
            : [];
        }
      } catch {
        memory = [];
      }

      setStats({
        memory: memory.length,
        tasks: tasks.length,
        completedTasks: tasks.filter(
          (task) =>
            task.status === "done"
        ).length,
      });

      setLoading(false);
    },
    []
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "#f6f7fb",
      }}
    >
      <Header />

      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
        }}
      >
        <Sidebar />

        <main
          style={{
            flex: 1,
            padding: "32px 18px 48px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 960,
              margin: "0 auto",
            }}
          >
            <header
              style={{
                marginBottom: 26,
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#6b7280",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                AIOS Alpha
              </p>

              <h1
                style={{
                  margin: "7px 0 0",
                  fontSize: 34,
                  lineHeight: 1.2,
                }}
              >
                Dashboard
              </h1>

              <p
                style={{
                  margin: "10px 0 0",
                  color: "#6b7280",
                  lineHeight: 1.6,
                }}
              >
                Brain、Memory 和 Tasks
                的统一运行入口。
              </p>
            </header>

            <section
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
                marginBottom: 26,
              }}
            >
              <StatCard
                label="Memory"
                value={
                  loading
                    ? "—"
                    : stats.memory
                }
                detail="保存的对话记录"
              />

              <StatCard
                label="Tasks"
                value={
                  loading
                    ? "—"
                    : stats.tasks
                }
                detail="全部任务"
              />

              <StatCard
                label="Completed"
                value={
                  loading
                    ? "—"
                    : stats.completedTasks
                }
                detail="已完成任务"
              />

              <StatCard
                label="Provider"
                value="Mock"
                detail="当前 AI Provider"
              />
            </section>

            <section>
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 13,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 20,
                  }}
                >
                  Workspace Modules
                </h2>

                <button
                  type="button"
                  onClick={loadDashboard}
                  style={{
                    padding: "8px 11px",
                    border:
                      "1px solid #d1d5db",
                    borderRadius: 9,
                    background: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  刷新状态
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 14,
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                }}
              >
                {moduleCards.map(
                  (card) => (
                    <Link
                      key={card.href}
                      href={card.href}
                      style={{
                        color: "inherit",
                        textDecoration:
                          "none",
                      }}
                    >
                      <article
                        style={{
                          height: "100%",
                          boxSizing:
                            "border-box",
                          padding: 20,
                          border:
                            "1px solid #e5e7eb",
                          borderRadius: 16,
                          background:
                            "#ffffff",
                          boxShadow:
                            "0 8px 24px rgba(15, 23, 42, 0.04)",
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            fontSize: 19,
                          }}
                        >
                          {card.title}
                        </h3>

                        <p
                          style={{
                            margin:
                              "10px 0 18px",
                            color:
                              "#6b7280",
                            lineHeight: 1.55,
                          }}
                        >
                          {
                            card.description
                          }
                        </p>

                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                          }}
                        >
                          打开模块 →
                        </span>
                      </article>
                    </Link>
                  )
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <article
      style={{
        padding: 17,
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        background: "#ffffff",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#6b7280",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {label}
      </p>

      <strong
        style={{
          display: "block",
          marginTop: 7,
          fontSize: 28,
        }}
      >
        {value}
      </strong>

      <p
        style={{
          margin: "6px 0 0",
          color: "#9ca3af",
          fontSize: 12,
        }}
      >
        {detail}
      </p>
    </article>
  );
}