"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";
import { listTasks } from "@/lib/task";

interface RuntimeStatus {
  success: boolean;
  runtime: string;
  version: string;
  status: "online" | "offline";
  provider: string;
  memoryCount: number;
  timestamp: number;
}

interface DashboardStats {
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

const initialRuntime: RuntimeStatus = {
  success: false,
  runtime: "aios-alpha",
  version: "0.2",
  status: "offline",
  provider: "unknown",
  memoryCount: 0,
  timestamp: 0,
};

export default function DashboardPage() {
  const [runtime, setRuntime] =
    useState<RuntimeStatus>(
      initialRuntime
    );

  const [stats, setStats] =
    useState<DashboardStats>({
      tasks: 0,
      completedTasks: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadDashboard = useCallback(
    async () => {
      setLoading(true);
      setError("");

      const tasks = listTasks();

      setStats({
        tasks: tasks.length,
        completedTasks: tasks.filter(
          (task) =>
            task.status === "done"
        ).length,
      });

      try {
        const response = await fetch(
          "/api/runtime/status",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Runtime status unavailable."
          );
        }

        const data =
          (await response.json()) as RuntimeStatus;

        setRuntime(data);
      } catch {
        setRuntime(initialRuntime);
        setError(
          "Runtime 状态读取失败。"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <WorkspaceShell>
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          margin: "0 auto",
          color: "#111827",
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

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: "12px 14px",
              border:
                "1px solid #fecaca",
              borderRadius: 12,
              background: "#fff7f7",
              color: "#b91c1c",
            }}
          >
            {error}
          </div>
        )}

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
            label="Runtime"
            value={
              loading
                ? "—"
                : runtime.status
            }
            detail={runtime.runtime}
            online={
              runtime.status ===
              "online"
            }
          />

          <StatCard
            label="Provider"
            value={
              loading
                ? "—"
                : runtime.provider
            }
            detail="当前 AI Provider"
          />

          <StatCard
            label="Memory"
            value={
              loading
                ? "—"
                : runtime.memoryCount
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
            label="Version"
            value={`v${runtime.version}`}
            detail="AIOS Runtime"
          />
        </section>

        <section
          style={{
            marginBottom: 26,
            padding: 18,
            border:
              "1px solid #e5e7eb",
            borderRadius: 16,
            background: "#ffffff",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 19,
                }}
              >
                Runtime Controller
              </h2>

              <p
                style={{
                  margin: "7px 0 0",
                  color: "#6b7280",
                  fontSize: 14,
                }}
              >
                最后检查：
                {runtime.timestamp
                  ? new Date(
                      runtime.timestamp
                    ).toLocaleString()
                  : "尚未连接"}
              </p>
            </div>

            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              style={{
                padding: "10px 13px",
                border:
                  "1px solid #d1d5db",
                borderRadius: 10,
                background: "#ffffff",
                color: "#111827",
                fontWeight: 700,
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
                opacity: loading
                  ? 0.6
                  : 1,
              }}
            >
              {loading
                ? "刷新中…"
                : "刷新状态"}
            </button>
          </div>
        </section>

        <section>
          <h2
            style={{
              margin: "0 0 13px",
              fontSize: 20,
            }}
          >
            Workspace Modules
          </h2>

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
                      {card.description}
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
    </WorkspaceShell>
  );
}

function StatCard({
  label,
  value,
  detail,
  online = false,
}: {
  label: string;
  value: string | number;
  detail: string;
  online?: boolean;
}) {
  return (
    <article
      style={{
        padding: 17,
        border:
          "1px solid #e5e7eb",
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
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 7,
          fontSize: 27,
          textTransform:
            "capitalize",
        }}
      >
        {online && (
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background:
                "#22c55e",
            }}
          />
        )}

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