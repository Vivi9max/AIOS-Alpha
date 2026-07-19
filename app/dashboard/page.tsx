"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
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

  feedback: {
    count: number;
  };

  identity?: {
    userId: string;
    isolated: boolean;
  };

  timestamp: number;
  error?: string;
}

interface ModuleCard {
  icon: string;
  title: string;
  description: string;
  href: string;
  badge?: string;
}

interface FocusItem {
  title: string;
  description: string;
  href: string;
  action: string;
  priority:
    | "high"
    | "medium"
    | "normal";
}

const initialData:
  DashboardData = {
  success: false,

  runtime: {
    id: "aios-alpha",
    version: "0.4",
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

  feedback: {
    count: 0,
  },

  timestamp: 0,
};

const moduleCards:
  ModuleCard[] = [
  {
    icon: "💬",
    title: "Workspace",
    description:
      "与 AIOS Brain 对话，将目标转化为可执行工作。",
    href: "/workspace",
    badge: "Core",
  },

  {
    icon: "📋",
    title: "Projects",
    description:
      "集中管理正在推进的项目、目标和执行状态。",
    href: "/projects",
  },

  {
    icon: "✅",
    title: "Tasks",
    description:
      "查看待执行任务、进行中的工作和完成记录。",
    href: "/tasks",
  },

  {
    icon: "🧠",
    title: "Memory",
    description:
      "管理长期资料、用户偏好和对话记忆。",
    href: "/memory",
  },

  {
    icon: "⚙️",
    title: "Settings",
    description:
      "配置 AI Provider、系统能力和运行环境。",
    href: "/settings",
  },

  {
    icon: "💡",
    title: "Feedback",
    description:
      "提交使用反馈，帮助 AIOS Alpha 持续演化。",
    href: "/feedback",
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
    unknown: "Unknown",
  };

  return (
    labels[
      provider.toLowerCase()
    ] ??
    provider
  );
}

function formatStorageMode(
  mode: string
): string {
  const labels:
    Record<string, string> = {
    redis: "Redis",
    memory: "Local Memory",
    local: "Local Storage",
    unknown: "Unknown",
  };

  return (
    labels[
      mode.toLowerCase()
    ] ??
    mode
  );
}

function formatTimestamp(
  timestamp:
    | number
    | null
): string {
  if (!timestamp) {
    return "尚未运行";
  }

  return new Date(
    timestamp
  ).toLocaleString();
}

function getCompletionRate(
  completed: number,
  total: number
): number {
  if (total <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round(
      (completed / total) * 100
    )
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

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadDashboard =
    useCallback(
      async (
        silent = false
      ) => {
        if (silent) {
          setRefreshing(true);
        } else {
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
              data.error ??
                data.provider
                  ?.error ??
                "Dashboard 状态读取失败。"
            );
          }

          setDashboard(data);
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Dashboard 状态读取失败。"
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
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
        15000
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

  const profileRate =
    getCompletionRate(
      dashboard.profile
        .completedFields,
      dashboard.profile
        .totalFields
    );

  const taskCompletionRate =
    getCompletionRate(
      dashboard.tasks
        .completed,
      dashboard.tasks.count
    );

  const systemHealthy =
    dashboard.runtime
      .status === "online" &&
    dashboard.storage
      .healthy;

  const focusItems =
    useMemo<
      FocusItem[]
    >(() => {
      const items:
        FocusItem[] = [];

      if (
        dashboard.tasks.active >
        0
      ) {
        items.push({
          title: `继续推进 ${dashboard.tasks.active} 项任务`,
          description:
            "优先完成已经进入执行阶段的任务，减少未完成工作堆积。",
          href: "/tasks",
          action:
            "查看任务",
          priority: "high",
        });
      }

      if (
        dashboard.profile
          .completedFields <
        dashboard.profile
          .totalFields
      ) {
        items.push({
          title:
            "完善 AIOS 长期资料",
          description:
            "补充目标、项目和偏好，让 Brain 的输出更准确。",
          href: "/memory",
          action:
            "完善资料",
          priority: "medium",
        });
      }

      if (
        !dashboard.storage
          .persistent
      ) {
        items.push({
          title:
            "启用持久化存储",
          description:
            "当前数据可能随运行环境重启而丢失，建议配置 Redis。",
          href: "/settings",
          action:
            "检查设置",
          priority: "medium",
        });
      }

      if (
        dashboard.provider
          .fallbackUsed
      ) {
        items.push({
          title:
            "检查 AI Provider",
          description:
            "当前请求使用了备用 Provider，需要检查主要模型配置。",
          href: "/settings",
          action:
            "检查 Provider",
          priority: "high",
        });
      }

      if (
        items.length === 0
      ) {
        items.push({
          title:
            "开始新的执行目标",
          description:
            "系统状态正常，可以进入 Workspace 创建下一项工作。",
          href: "/workspace",
          action:
            "进入 Workspace",
          priority: "normal",
        });
      }

      return items.slice(
        0,
        3
      );
    }, [dashboard]);

  return (
    <WorkspaceShell>
      <main
        style={{
          width: "100%",
          maxWidth: 1120,
          margin: "0 auto",
          color: "#111827",
        }}
      >
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent:
              "space-between",
            alignItems:
              "flex-start",
            gap: 18,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                flexWrap: "wrap",
                gap: 9,
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#6b7280",
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing:
                    "0.05em",
                  textTransform:
                    "uppercase",
                }}
              >
                AIOS Alpha
              </p>

              <StatusBadge
                healthy={
                  systemHealthy
                }
                text={
                  systemHealthy
                    ? "System Online"
                    : "Check Required"
                }
              />
            </div>

            <h1
              style={{
                margin:
                  "8px 0 0",
                fontSize:
                  "clamp(30px, 5vw, 42px)",
                lineHeight: 1.1,
                letterSpacing:
                  "-0.035em",
              }}
            >
              Dashboard
            </h1>

            <p
              style={{
                maxWidth: 660,
                margin:
                  "12px 0 0",
                color: "#6b7280",
                fontSize: 15,
                lineHeight: 1.7,
              }}
            >
              查看 AIOS Alpha
              当前运行状态、今日重点与核心工作入口。
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              loadDashboard(true)
            }
            disabled={
              loading ||
              refreshing
            }
            style={{
              flexShrink: 0,
              minHeight: 42,
              padding:
                "10px 15px",
              border:
                "1px solid #d1d5db",
              borderRadius: 12,
              background:
                "#ffffff",
              color: "#111827",
              fontWeight: 750,
              cursor:
                loading ||
                refreshing
                  ? "not-allowed"
                  : "pointer",
              opacity:
                loading ||
                refreshing
                  ? 0.65
                  : 1,
              boxShadow:
                "0 5px 15px rgba(15, 23, 42, 0.04)",
            }}
          >
            {loading ||
            refreshing
              ? "同步中…"
              : "同步状态"}
          </button>
        </header>

        {error && (
          <section
            style={{
              marginBottom: 18,
              padding:
                "13px 15px",
              border:
                "1px solid #fecaca",
              borderRadius: 13,
              background:
                "#fff7f7",
              color: "#b91c1c",
              fontSize: 14,
              lineHeight: 1.55,
              overflowWrap:
                "anywhere",
            }}
          >
            <strong>
              Dashboard
              暂时无法同步
            </strong>

            <div
              style={{
                marginTop: 4,
              }}
            >
              {error}
            </div>
          </section>
        )}

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <StatCard
            label="Runtime"
            value={
              loading
                ? "—"
                : dashboard.runtime
                    .status
            }
            detail={`v${dashboard.runtime.version}`}
            status={
              dashboard.runtime
                .status ===
              "online"
                ? "success"
                : "danger"
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
                .latencyMs !==
              null
                ? `${dashboard.provider.latencyMs}ms`
                : dashboard.provider
                    .fallbackUsed
                  ? "Fallback"
                  : "Ready"
            }
            status={
              dashboard.provider
                .fallbackUsed
                ? "warning"
                : dashboard.provider
                    .success
                  ? "success"
                  : "neutral"
            }
          />

          <StatCard
            label="Active Tasks"
            value={
              loading
                ? "—"
                : dashboard.tasks
                    .active
            }
            detail={`${dashboard.tasks.completed} completed`}
            status={
              dashboard.tasks
                .active > 0
                ? "primary"
                : "success"
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
            status="primary"
          />

          <StatCard
            label="Profile"
            value={
              loading
                ? "—"
                : `${profileRate}%`
            }
            detail={`${dashboard.profile.completedFields}/${dashboard.profile.totalFields} fields`}
            status={
              profileRate ===
              100
                ? "success"
                : "warning"
            }
          />

          <StatCard
            label="Feedback"
            value={
              loading
                ? "—"
                : dashboard.feedback
                    .count
            }
            detail="用户反馈"
            status="neutral"
          />
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 16,
            marginBottom: 26,
          }}
        >
          <Panel>
            <PanelHeader
              eyebrow="Focus"
              title="Today Focus"
              description="根据当前系统状态生成的优先动作。"
            />

            <div
              style={{
                display: "grid",
                gap: 10,
                marginTop: 17,
              }}
            >
              {focusItems.map(
                (item) => (
                  <FocusCard
                    key={`${item.href}-${item.title}`}
                    item={item}
                  />
                )
              )}
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              eyebrow="Execution"
              title="Progress Snapshot"
              description="查看任务、资料和系统准备程度。"
            />

            <div
              style={{
                display: "grid",
                gap: 18,
                marginTop: 20,
              }}
            >
              <ProgressRow
                label="Task Completion"
                value={
                  taskCompletionRate
                }
                detail={`${dashboard.tasks.completed}/${dashboard.tasks.count}`}
              />

              <ProgressRow
                label="Profile Readiness"
                value={
                  profileRate
                }
                detail={`${dashboard.profile.completedFields}/${dashboard.profile.totalFields}`}
              />

              <ProgressRow
                label="Persistent Storage"
                value={
                  dashboard.storage
                    .persistent
                    ? 100
                    : 25
                }
                detail={
                  dashboard.storage
                    .persistent
                    ? "Enabled"
                    : "Not enabled"
                }
              />

              <ProgressRow
                label="Provider Health"
                value={
                  dashboard.provider
                    .success
                    ? dashboard
                        .provider
                        .fallbackUsed
                      ? 65
                      : 100
                    : 20
                }
                detail={
                  dashboard.provider
                    .fallbackUsed
                    ? "Fallback active"
                    : dashboard.provider
                        .success
                      ? "Ready"
                      : "Awaiting request"
                }
              />
            </div>
          </Panel>
        </section>

        <section
          style={{
            marginBottom: 26,
          }}
        >
          <Panel>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent:
                  "space-between",
                alignItems:
                  "flex-start",
                gap: 20,
              }}
            >
              <PanelHeader
                eyebrow="Runtime"
                title="System Status"
                description="AIOS Alpha 当前运行环境与基础设施状态。"
              />

              <StatusBadge
                healthy={
                  systemHealthy
                }
                text={
                  systemHealthy
                    ? "Healthy"
                    : "Attention"
                }
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 12,
                marginTop: 20,
              }}
            >
              <SystemItem
                label="Runtime"
                value={`${dashboard.runtime.id} · v${dashboard.runtime.version}`}
                detail={
                  dashboard.runtime
                    .status
                }
                healthy={
                  dashboard.runtime
                    .status ===
                  "online"
                }
              />

              <SystemItem
                label="AI Provider"
                value={
                  activeProvider
                }
                detail={
                  dashboard.provider
                    .fallbackUsed
                    ? `Requested ${formatProvider(
                        dashboard
                          .provider
                          .requested
                      )}`
                    : "Primary provider"
                }
                healthy={
                  !dashboard.provider
                    .fallbackUsed
                }
              />

              <SystemItem
                label="Storage"
                value={formatStorageMode(
                  dashboard.storage
                    .mode
                )}
                detail={
                  dashboard.storage
                    .persistent
                    ? "Persistent"
                    : "Temporary"
                }
                healthy={
                  dashboard.storage
                    .healthy
                }
              />

              <SystemItem
                label="User Isolation"
                value={
                  dashboard.identity
                    ?.isolated
                    ? "Enabled"
                    : "Unknown"
                }
                detail="Private workspace"
                healthy={
                  dashboard.identity
                    ?.isolated ??
                  false
                }
              />
            </div>

            {dashboard.provider
              .fallbackUsed && (
              <AlertBox
                tone="warning"
                title="Provider fallback active"
                message={
                  dashboard.provider
                    .error ??
                  "主要 Provider 暂不可用，系统已切换至备用 Provider。"
                }
              />
            )}

            {!dashboard.storage
              .persistent && (
              <AlertBox
                tone="warning"
                title="Persistent storage is not enabled"
                message="当前数据可能随运行环境重启而丢失。建议在正式公开上线前配置 Redis 持久化存储。"
              />
            )}

            {dashboard.storage
              .error && (
              <AlertBox
                tone="danger"
                title="Storage error"
                message={
                  dashboard.storage
                    .error
                }
              />
            )}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent:
                  "space-between",
                gap: 10,
                marginTop: 18,
                paddingTop: 16,
                borderTop:
                  "1px solid #f1f5f9",
                color: "#94a3b8",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              <span>
                最后同步：
                {formatTimestamp(
                  dashboard.timestamp
                )}
              </span>

              <span>
                Provider
                最后请求：
                {formatTimestamp(
                  dashboard.provider
                    .lastRequestAt
                )}
              </span>
            </div>
          </Panel>
        </section>

        <section>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent:
                "space-between",
              alignItems:
                "flex-end",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing:
                    "0.08em",
                  textTransform:
                    "uppercase",
                }}
              >
                Operating Modules
              </p>

              <h2
                style={{
                  margin:
                    "6px 0 0",
                  fontSize: 23,
                  letterSpacing:
                    "-0.02em",
                }}
              >
                Workspace Modules
              </h2>
            </div>

            <Link
              href="/workspace"
              style={{
                color: "#2563eb",
                fontSize: 14,
                fontWeight: 750,
                textDecoration:
                  "none",
              }}
            >
              打开 Workspace →
            </Link>
          </div>

          <div
            style={{
              display: "grid",
              gap: 14,
              gridTemplateColumns:
                "repeat(auto-fit, minmax(230px, 1fr))",
            }}
          >
            {moduleCards.map(
              (card) => (
                <ModuleCardView
                  key={card.href}
                  card={card}
                />
              )
            )}
          </div>
        </section>
      </main>
    </WorkspaceShell>
  );
}

function Panel({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <article
      style={{
        minWidth: 0,
        padding:
          "clamp(18px, 4vw, 24px)",
        border:
          "1px solid #e5e7eb",
        borderRadius: 20,
        background:
          "#ffffff",
        boxShadow:
          "0 10px 30px rgba(15, 23, 42, 0.045)",
      }}
    >
      {children}
    </article>
  );
}

function PanelHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p
        style={{
          margin: 0,
          color: "#64748b",
          fontSize: 11,
          fontWeight: 850,
          letterSpacing:
            "0.09em",
          textTransform:
            "uppercase",
        }}
      >
        {eyebrow}
      </p>

      <h2
        style={{
          margin:
            "6px 0 0",
          fontSize: 21,
          letterSpacing:
            "-0.02em",
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin:
            "7px 0 0",
          color: "#64748b",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        {description}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  status,
}: {
  label: string;
  value: string | number;
  detail: string;
  status:
    | "success"
    | "warning"
    | "danger"
    | "primary"
    | "neutral";
}) {
  const accent:
    Record<
      typeof status,
      string
    > = {
    success: "#16a34a",
    warning: "#d97706",
    danger: "#dc2626",
    primary: "#2563eb",
    neutral: "#64748b",
  };

  return (
    <article
      style={{
        minWidth: 0,
        padding: 16,
        border:
          "1px solid #e5e7eb",
        borderRadius: 16,
        background:
          "#ffffff",
        boxShadow:
          "0 7px 22px rgba(15, 23, 42, 0.035)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "center",
          gap: 8,
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#64748b",
            fontSize: 12,
            fontWeight: 750,
          }}
        >
          {label}
        </p>

        <span
          style={{
            width: 8,
            height: 8,
            flexShrink: 0,
            borderRadius:
              "50%",
            background:
              accent[status],
          }}
        />
      </div>

      <strong
        style={{
          display: "block",
          marginTop: 9,
          color: "#0f172a",
          fontSize: 25,
          lineHeight: 1.15,
          letterSpacing:
            "-0.025em",
          overflowWrap:
            "anywhere",
          textTransform:
            label === "Runtime"
              ? "capitalize"
              : "none",
        }}
      >
        {value}
      </strong>

      <p
        style={{
          margin:
            "7px 0 0",
          color: "#94a3b8",
          fontSize: 12,
          lineHeight: 1.4,
          overflowWrap:
            "anywhere",
        }}
      >
        {detail}
      </p>
    </article>
  );
}

function FocusCard({
  item,
}: {
  item: FocusItem;
}) {
  const priorityStyle = {
    high: {
      background:
        "#fef2f2",
      border:
        "#fecaca",
      color: "#b91c1c",
      label: "High",
    },

    medium: {
      background:
        "#fffbeb",
      border:
        "#fde68a",
      color: "#92400e",
      label: "Next",
    },

    normal: {
      background:
        "#eff6ff",
      border:
        "#bfdbfe",
      color: "#1d4ed8",
      label: "Ready",
    },
  }[item.priority];

  return (
    <Link
      href={item.href}
      style={{
        color: "inherit",
        textDecoration:
          "none",
      }}
    >
      <article
        style={{
          padding: 14,
          border:
            "1px solid #e5e7eb",
          borderRadius: 14,
          background:
            "#fafafa",
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
          }}
        >
          <div
            style={{
              minWidth: 0,
            }}
          >
            <strong
              style={{
                display: "block",
                fontSize: 15,
                lineHeight: 1.4,
              }}
            >
              {item.title}
            </strong>

            <p
              style={{
                margin:
                  "6px 0 0",
                color: "#64748b",
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              {item.description}
            </p>
          </div>

          <span
            style={{
              flexShrink: 0,
              padding:
                "4px 7px",
              border: `1px solid ${priorityStyle.border}`,
              borderRadius:
                999,
              background:
                priorityStyle.background,
              color:
                priorityStyle.color,
              fontSize: 10,
              fontWeight: 800,
              textTransform:
                "uppercase",
            }}
          >
            {
              priorityStyle.label
            }
          </span>
        </div>

        <div
          style={{
            marginTop: 11,
            color: "#2563eb",
            fontSize: 12,
            fontWeight: 750,
          }}
        >
          {item.action} →
        </div>
      </article>
    </Link>
  );
}

function ProgressRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  const normalizedValue =
    Math.min(
      100,
      Math.max(
        0,
        Math.round(value)
      )
    );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "center",
          gap: 12,
          marginBottom: 7,
        }}
      >
        <span
          style={{
            color: "#334155",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {label}
        </span>

        <span
          style={{
            color: "#64748b",
            fontSize: 12,
            whiteSpace:
              "nowrap",
          }}
        >
          {detail}
        </span>
      </div>

      <div
        style={{
          height: 8,
          overflow: "hidden",
          borderRadius: 999,
          background:
            "#e2e8f0",
        }}
      >
        <div
          style={{
            width: `${normalizedValue}%`,
            height: "100%",
            borderRadius: 999,
            background:
              normalizedValue >=
              80
                ? "#22c55e"
                : normalizedValue >=
                    45
                  ? "#3b82f6"
                  : "#f59e0b",
            transition:
              "width 240ms ease",
          }}
        />
      </div>
    </div>
  );
}

function SystemItem({
  label,
  value,
  detail,
  healthy,
}: {
  label: string;
  value: string;
  detail: string;
  healthy: boolean;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: 14,
        border:
          "1px solid #e5e7eb",
        borderRadius: 14,
        background:
          "#f8fafc",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems:
            "center",
          gap: 7,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            flexShrink: 0,
            borderRadius:
              "50%",
            background: healthy
              ? "#22c55e"
              : "#f59e0b",
          }}
        />

        <span
          style={{
            color: "#64748b",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {label}
        </span>
      </div>

      <strong
        style={{
          display: "block",
          marginTop: 8,
          color: "#0f172a",
          fontSize: 15,
          lineHeight: 1.4,
          overflowWrap:
            "anywhere",
        }}
      >
        {value}
      </strong>

      <p
        style={{
          margin:
            "5px 0 0",
          color: "#94a3b8",
          fontSize: 12,
          lineHeight: 1.4,
          overflowWrap:
            "anywhere",
          textTransform:
            label === "Runtime"
              ? "capitalize"
              : "none",
        }}
      >
        {detail}
      </p>
    </div>
  );
}

function AlertBox({
  tone,
  title,
  message,
}: {
  tone:
    | "warning"
    | "danger";
  title: string;
  message: string;
}) {
  const palette =
    tone === "danger"
      ? {
          border:
            "#fecaca",
          background:
            "#fff7f7",
          title:
            "#b91c1c",
          text: "#991b1b",
        }
      : {
          border:
            "#fde68a",
          background:
            "#fffbeb",
          title:
            "#92400e",
          text: "#78350f",
        };

  return (
    <div
      style={{
        marginTop: 14,
        padding:
          "12px 13px",
        border: `1px solid ${palette.border}`,
        borderRadius: 12,
        background:
          palette.background,
      }}
    >
      <strong
        style={{
          display: "block",
          color:
            palette.title,
          fontSize: 13,
        }}
      >
        {title}
      </strong>

      <p
        style={{
          margin:
            "5px 0 0",
          color: palette.text,
          fontSize: 12,
          lineHeight: 1.55,
          overflowWrap:
            "anywhere",
        }}
      >
        {message}
      </p>
    </div>
  );
}

function ModuleCardView({
  card,
}: {
  card: ModuleCard;
}) {
  return (
    <Link
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
          padding: 19,
          border:
            "1px solid #e5e7eb",
          borderRadius: 17,
          background:
            "#ffffff",
          boxShadow:
            "0 8px 24px rgba(15, 23, 42, 0.04)",
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
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display:
                "inline-flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              width: 38,
              height: 38,
              borderRadius: 12,
              background:
                "#f1f5f9",
              fontSize: 19,
            }}
          >
            {card.icon}
          </span>

          {card.badge && (
            <span
              style={{
                padding:
                  "4px 8px",
                border:
                  "1px solid #bfdbfe",
                borderRadius:
                  999,
                background:
                  "#eff6ff",
                color:
                  "#1d4ed8",
                fontSize: 10,
                fontWeight: 800,
                textTransform:
                  "uppercase",
              }}
            >
              {card.badge}
            </span>
          )}
        </div>

        <h3
          style={{
            margin:
              "14px 0 0",
            fontSize: 18,
            letterSpacing:
              "-0.015em",
          }}
        >
          {card.title}
        </h3>

        <p
          style={{
            margin:
              "8px 0 18px",
            color: "#64748b",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          {card.description}
        </p>

        <span
          style={{
            color: "#2563eb",
            fontSize: 13,
            fontWeight: 750,
          }}
        >
          打开模块 →
        </span>
      </article>
    </Link>
  );
}

function StatusBadge({
  healthy,
  text,
}: {
  healthy: boolean;
  text: string;
}) {
  return (
    <span
      style={{
        display:
          "inline-flex",
        alignItems:
          "center",
        gap: 6,
        padding:
          "5px 9px",
        border: `1px solid ${
          healthy
            ? "#bbf7d0"
            : "#fde68a"
        }`,
        borderRadius: 999,
        background: healthy
          ? "#f0fdf4"
          : "#fffbeb",
        color: healthy
          ? "#15803d"
          : "#92400e",
        fontSize: 11,
        fontWeight: 800,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius:
            "50%",
          background: healthy
            ? "#22c55e"
            : "#f59e0b",
        }}
      />

      {text}
    </span>
  );
}