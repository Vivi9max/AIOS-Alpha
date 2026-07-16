"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";

interface DashboardData {
  success: boolean;

  runtime: {
    id: string;
    version: string;
    status:
      | "online"
      | "offline";
  };

  provider: {
    configured: string;
    active: string;
    requested: string;
    fallbackUsed: boolean;
    success: boolean;
    latencyMs:
      | number
      | null;
    error:
      | string
      | null;
    lastRequestAt:
      | number
      | null;
  };

  storage: {
    mode: string;
    persistent: boolean;
    healthy: boolean;
    error:
      | string
      | null;
  };

  memory: {
    count: number;
    userMessages: number;
    assistantMessages: number;
  };

  profile: {
    completedFields: number;
    totalFields: number;
  };

  tasks: {
    count: number;
    active: number;
    completed: number;
  };

  timestamp: number;
}

const initialData:
  DashboardData = {
  success: false,

  runtime: {
    id: "aios-alpha",
    version: "0.2",
    status: "offline",
  },

  provider: {
    configured: "unknown",
    active: "unknown",
    requested: "unknown",
    fallbackUsed: false,
    success: false,
    latencyMs: null,
    error: null,
    lastRequestAt: null,
  },

  storage: {
    mode: "unknown",
    persistent: false,
    healthy: false,
    error: null,
  },

  memory: {
    count: 0,
    userMessages: 0,
    assistantMessages: 0,
  },

  profile: {
    completedFields: 0,
    totalFields: 5,
  },

  tasks: {
    count: 0,
    active: 0,
    completed: 0,
  },

  timestamp: 0,
};

const moduleCards = [
  {
    icon: "💬",
    title: "Chat",
    description:
      "与 AIOS Brain 对话并执行操作",
    href: "/workspace",
  },

  {
    icon: "🧠",
    title: "Memory",
    description:
      "查看 Profile 和对话记忆",
    href: "/memory",
  },

  {
    icon: "✅",
    title: "Tasks",
    description:
      "管理待处理和已完成任务",
    href: "/tasks",
  },

  {
    icon: "⚙️",
    title: "Settings",
    description:
      "管理 Provider 与系统能力",
    href: "/settings",
  },
];

function formatProvider(
  provider: string
): string {
  const labels:
    Record<string, string> = {
    deepseek: "DeepSeek",
    mock: "Mock",
    qwen: "Qwen",
    openai: "OpenAI",
    gemini: "Gemini",
    claude: "Claude",
  };

  return (
    labels[provider] ??
    provider
  );
}

export default function DashboardPage() {
  const [
    dashboard,
    setDashboard,
  ] = useState<DashboardData>(
    initialData
  );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadDashboard =
    useCallback(
      async (
        silent = false
      ) => {
        if (!silent) {
          setLoading(true);
        }

        setError("");

        try {
          const response =
            await fetch(
              "/api/dashboard/status",
              {
                cache:
                  "no-store",
              }
            );

          const data =
            (await response.json()) as DashboardData;

          if (
            !response.ok ||
            !data.success
          ) {
            throw new Error(
              data.provider
                ?.error ??
                "Dashboard loading failed."
            );
          }

          setDashboard(
            data
          );
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Dashboard 状态读取失败。"
          );
        } finally {
          if (!silent) {
            setLoading(false);
          }
        }
      },
      []
    );

  useEffect(() => {
    loadDashboard();

    const timer =
      window.setInterval(
        () => {
          loadDashboard(true);
        },
        10000
      );

    const handleFocus = () => {
      loadDashboard(true);
    };

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.clearInterval(
        timer
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [loadDashboard]);

  const activeProvider =
    formatProvider(
      dashboard.provider.active
    );

  return (
    <WorkspaceShell>
      <main
        style={{
          width: "100%",
          maxWidth: 960,
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
              fontWeight: 700,
            }}
          >
            AIOS Alpha
          </p>

          <h1
            style={{
              margin:
                "7px 0 0",
              fontSize: 34,
              lineHeight: 1.15,
            }}
          >
            Dashboard
          </h1>

          <p
            style={{
              margin:
                "10px 0 0",
              color: "#6b7280",
              lineHeight: 1.6,
            }}
          >
            Chat、Memory、Tasks
            和 Runtime 的统一状态。
          </p>
        </header>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding:
                "12px 14px",
              border:
                "1px solid #fecaca",
              borderRadius: 12,
              background:
                "#fff7f7",
              color: "#b91c1c",
              overflowWrap:
                "anywhere",
            }}
          >
            {error}
          </div>
        )}

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <StatCard
            label="Runtime"
            value={
              loading
                ? "—"
                : dashboard
                    .runtime
                    .status
            }
            detail={
              dashboard.runtime.id
            }
            online={
              dashboard.runtime
                .status ===
              "online"
            }
          />

          <StatCard
            label="Provider"
            value={
              loading
                ? "—"
                : activeProvider
            }
            detail={
              dashboard.provider
                .fallbackUsed
                ? `Fallback from ${formatProvider(
                    dashboard
                      .provider
                      .requested
                  )}`
                : dashboard.provider
                    .latencyMs !==
                  null
                  ? `${dashboard.provider.latencyMs}ms`
                  : "Ready"
            }
          />

          <StatCard
            label="Memory"
            value={
              loading
                ? "—"
                : dashboard.memory
                    .count
            }
            detail="对话记录"
          />

          <StatCard
            label="Profile"
            value={
              loading
                ? "—"
                : `${dashboard.profile.completedFields}/${dashboard.profile.totalFields}`
            }
            detail="长期资料"
          />

          <StatCard
            label="Tasks"
            value={
              loading
                ? "—"
                : dashboard.tasks
                    .count
            }
            detail={`${dashboard.tasks.active} 项待完成`}
          />

          <StatCard
            label="Completed"
            value={
              loading
                ? "—"
                : dashboard.tasks
                    .completed
            }
            detail="已完成任务"
          />
        </section>

        <section
          style={{
            marginBottom: 24,
            padding: 18,
            border:
              "1px solid #e5e7eb",
            borderRadius: 16,
            background:
              "#ffffff",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap: 14,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 19,
                }}
              >
                System Status
              </h2>

              <p
                style={{
                  margin:
                    "7px 0 0",
                  color: "#6b7280",
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                Storage：{" "}
                <strong>
                  {dashboard.storage
                    .mode ===
                  "redis"
                    ? "Redis Persistent"
                    : dashboard.storage
                        .mode}
                </strong>
                <br />
                最后同步：{" "}
                {dashboard.timestamp
                  ? new Date(
                      dashboard.timestamp
                    ).toLocaleString()
                  : "尚未同步"}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                loadDashboard()
              }
              disabled={loading}
              style={{
                flexShrink: 0,
                padding:
                  "10px 13px",
                border:
                  "1px solid #d1d5db",
                borderRadius: 10,
                background:
                  "#ffffff",
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
                ? "同步中…"
                : "立即同步"}
            </button>
          </div>

          {!dashboard.storage
            .persistent && (
            <div
              style={{
                marginTop: 14,
                padding:
                  "11px 12px",
                border:
                  "1px solid #fde68a",
                borderRadius: 10,
                background:
                  "#fffbeb",
                color: "#92400e",
                fontSize: 13,
              }}
            >
              当前数据尚未启用持久化存储。
            </div>
          )}

          {dashboard.provider
            .fallbackUsed && (
            <div
              style={{
                marginTop: 14,
                padding:
                  "11px 12px",
                border:
                  "1px solid #fed7aa",
                borderRadius: 10,
                background:
                  "#fff7ed",
                color: "#9a3412",
                fontSize: 13,
                overflowWrap:
                  "anywhere",
              }}
            >
              Provider 已回退：
              {dashboard.provider
                .error ??
                "未知错误"}
            </div>
          )}
        </section>

        <section>
          <h2
            style={{
              margin:
                "0 0 13px",
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
                    color:
                      "inherit",
                    textDecoration:
                      "none",
                  }}
                >
                  <article
                    style={{
                      height:
                        "100%",
                      boxSizing:
                        "border-box",
                      padding: 19,
                      border:
                        "1px solid #e5e7eb",
                      borderRadius:
                        16,
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
                      {card.icon}{" "}
                      {card.title}
                    </h3>

                    <p
                      style={{
                        margin:
                          "10px 0 18px",
                        color:
                          "#6b7280",
                        lineHeight:
                          1.55,
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
      </main>
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
        minWidth: 0,
        padding: 16,
        border:
          "1px solid #e5e7eb",
        borderRadius: 14,
        background:
          "#ffffff",
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
          alignItems:
            "center",
          gap: 8,
          marginTop: 7,
          fontSize: 26,
          lineHeight: 1.15,
          overflowWrap:
            "anywhere",
          textTransform:
            label === "Runtime"
              ? "capitalize"
              : "none",
        }}
      >
        {online && (
          <span
            style={{
              width: 9,
              height: 9,
              flexShrink: 0,
              borderRadius:
                "50%",
              background:
                "#22c55e",
            }}
          />
        )}

        {value}
      </strong>

      <p
        style={{
          margin:
            "7px 0 0",
          color: "#9ca3af",
          fontSize: 12,
          lineHeight: 1.4,
        }}
      >
        {detail}
      </p>
    </article>
  );
}