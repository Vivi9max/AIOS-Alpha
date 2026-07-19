"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  ReactNode,
} from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";

import type {
  Task,
} from "@/lib/task/types";

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

interface TasksResponse {
  success: boolean;
  tasks?: Task[];
  error?: string;
}

interface HealthItem {
  label: string;
  detail: string;
  status:
    | "healthy"
    | "warning"
    | "offline";
  href: string;
}

interface QuickAction {
  icon: string;
  title: string;
  description: string;
  href: string;
}

const initialDashboard:
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

const quickActions:
  QuickAction[] = [
  {
    icon: "💬",
    title: "Chat",
    description:
      "进入 AIOS Workspace",
    href: "/workspace",
  },

  {
    icon: "➕",
    title: "New Task",
    description:
      "创建新的执行任务",
    href: "/tasks",
  },

  {
    icon: "📁",
    title: "Projects",
    description:
      "查看项目工作空间",
    href: "/projects",
  },

  {
    icon: "🧠",
    title: "Memory",
    description:
      "管理长期记忆资料",
    href: "/memory",
  },

  {
    icon: "⚡",
    title: "Runtime",
    description:
      "查看执行运行状态",
    href: "/runtime/trace",
  },

  {
    icon: "⚙️",
    title: "Settings",
    description:
      "管理 Provider 配置",
    href: "/settings",
  },
];

function formatProvider(
  provider: string
): string {
  const labels:
    Record<string, string> = {
    deepseek: "DeepSeek",
    qwen: "Qwen",
    openai: "OpenAI",
    mock: "Mock",
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

function formatStorage(
  mode: string
): string {
  const labels:
    Record<string, string> = {
    redis: "Redis",
    memory: "Memory",
    local: "Local",
    unknown: "Unknown",
  };

  return (
    labels[
      mode.toLowerCase()
    ] ??
    mode
  );
}

function formatTime(
  timestamp:
    | number
    | null
): string {
  if (!timestamp) {
    return "尚未记录";
  }

  return new Date(
    timestamp
  ).toLocaleString();
}

function calculateProgress(
  completed: number,
  total: number
): number {
  if (total <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (completed / total) *
          100
      )
    )
  );
}

function sortTasks(
  tasks: Task[]
): Task[] {
  const order = {
    doing: 0,
    todo: 1,
    done: 2,
  };

  return [...tasks].sort(
    (first, second) => {
      const statusDifference =
        order[first.status] -
        order[second.status];

      if (
        statusDifference !== 0
      ) {
        return statusDifference;
      }

      return (
        second.updatedAt -
        first.updatedAt
      );
    }
  );
}

export default function DashboardPage() {
  const [
    dashboard,
    setDashboard,
  ] = useState<DashboardData>(
    initialDashboard
  );

  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadData =
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
          const [
            dashboardResponse,
            tasksResponse,
          ] = await Promise.all([
            fetch(
              "/api/dashboard/status",
              {
                cache:
                  "no-store",
              }
            ),

            fetch(
              "/api/tasks",
              {
                cache:
                  "no-store",
              }
            ),
          ]);

          const dashboardResult =
            (await dashboardResponse.json()) as DashboardData;

          const tasksResult =
            (await tasksResponse.json()) as TasksResponse;

          if (
            !dashboardResponse.ok ||
            !dashboardResult.success
          ) {
            throw new Error(
              dashboardResult.error ??
                dashboardResult
                  .provider.error ??
                "Dashboard 状态读取失败。"
            );
          }

          if (
            !tasksResponse.ok ||
            !tasksResult.success
          ) {
            throw new Error(
              tasksResult.error ??
                "任务读取失败。"
            );
          }

          setDashboard(
            dashboardResult
          );

          setTasks(
            Array.isArray(
              tasksResult.tasks
            )
              ? tasksResult.tasks
              : []
          );
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Dashboard 数据读取失败。"
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(() => {
    loadData();

    const timer =
      window.setInterval(
        () => {
          loadData(true);
        },
        15000
      );

    const handleFocus = () => {
      loadData(true);
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
  }, [loadData]);

  const orderedTasks =
    useMemo(
      () => sortTasks(tasks),
      [tasks]
    );

  const activeTasks =
    useMemo(
      () =>
        orderedTasks.filter(
          (task) =>
            task.status !==
            "done"
        ),
      [orderedTasks]
    );

  const completedTasks =
    useMemo(
      () =>
        orderedTasks.filter(
          (task) =>
            task.status ===
            "done"
        ),
      [orderedTasks]
    );

  const doingTasks =
    useMemo(
      () =>
        orderedTasks.filter(
          (task) =>
            task.status ===
            "doing"
        ),
      [orderedTasks]
    );

  const missionTask =
    doingTasks[0] ??
    activeTasks[0] ??
    null;

  const nextTask =
    doingTasks[1] ??
    activeTasks.find(
      (task) =>
        task.id !==
        missionTask?.id
    ) ??
    null;

  const taskProgress =
    calculateProgress(
      completedTasks.length,
      tasks.length
    );

  const profileProgress =
    calculateProgress(
      dashboard.profile
        .completedFields,
      dashboard.profile
        .totalFields
    );

  const providerName =
    formatProvider(
      dashboard.provider.active
    );

  const systemHealthy =
    dashboard.runtime
      .status === "online" &&
    dashboard.storage
      .healthy &&
    !dashboard.provider
      .fallbackUsed;

  const healthItems =
    useMemo<
      HealthItem[]
    >(
      () => [
        {
          label: "Brain",
          detail:
            dashboard.provider
              .success
              ? `${providerName} ready`
              : "Awaiting request",
          status:
            dashboard.provider
              .fallbackUsed
              ? "warning"
              : dashboard.provider
                  .success
                ? "healthy"
                : "warning",
          href: "/workspace",
        },

        {
          label: "Memory",
          detail: `${dashboard.memory.count} records`,
          status:
            dashboard.memory
              .count > 0
              ? "healthy"
              : "warning",
          href: "/memory",
        },

        {
          label: "Storage",
          detail: `${formatStorage(
            dashboard.storage.mode
          )} ${
            dashboard.storage
              .persistent
              ? "persistent"
              : "temporary"
          }`,
          status:
            dashboard.storage
              .healthy
              ? dashboard.storage
                  .persistent
                ? "healthy"
                : "warning"
              : "offline",
          href: "/settings",
        },

        {
          label: "Runtime",
          detail: `v${dashboard.runtime.version}`,
          status:
            dashboard.runtime
              .status ===
            "online"
              ? "healthy"
              : "offline",
          href: "/runtime/trace",
        },

        {
          label: "Provider",
          detail:
            dashboard.provider
              .fallbackUsed
              ? `Fallback from ${formatProvider(
                  dashboard
                    .provider
                    .requested
                )}`
              : providerName,
          status:
            dashboard.provider
              .fallbackUsed
              ? "warning"
              : dashboard.provider
                  .success
                ? "healthy"
                : "warning",
          href: "/settings",
        },

        {
          label: "Planner",
          detail:
            activeTasks.length >
            0
              ? `${activeTasks.length} active tasks`
              : "Ready for goal",
          status:
            activeTasks.length >
            0
              ? "healthy"
              : "warning",
          href: "/tasks",
        },
      ],
      [
        activeTasks.length,
        dashboard,
        providerName,
      ]
    );

  return (
    <WorkspaceShell>
      <main
        style={{
          width: "100%",
          maxWidth: 1180,
          margin: "0 auto",
          color: "#0f172a",
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
            marginBottom: 22,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems:
                  "center",
                gap: 9,
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                  fontSize: 12,
                  fontWeight: 850,
                  letterSpacing:
                    "0.08em",
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
                    ? "Operating"
                    : "Attention"
                }
              />
            </div>

            <h1
              style={{
                margin:
                  "8px 0 0",
                fontSize:
                  "clamp(30px, 6vw, 44px)",
                lineHeight: 1.08,
                letterSpacing:
                  "-0.04em",
              }}
            >
              Operating Center
            </h1>

            <p
              style={{
                maxWidth: 680,
                margin:
                  "11px 0 0",
                color: "#64748b",
                fontSize: 15,
                lineHeight: 1.7,
              }}
            >
              从目标、规划到执行，统一管理
              AIOS Alpha 当前工作。
            </p>
          </div>

          <button
            type="button"
            disabled={
              loading ||
              refreshing
            }
            onClick={() =>
              loadData(true)
            }
            style={{
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
                  ? 0.6
                  : 1,
            }}
          >
            {loading ||
            refreshing
              ? "同步中…"
              : "同步状态"}
          </button>
        </header>

        {error && (
          <Alert
            title="Dashboard 同步失败"
            message={error}
            tone="danger"
          />
        )}

        <section
          style={{
            marginBottom: 18,
          }}
        >
          <Panel
            emphasis
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent:
                  "space-between",
                gap: 18,
              }}
            >
              <div
                style={{
                  flex:
                    "1 1 420px",
                  minWidth: 0,
                }}
              >
                <Eyebrow>
                  Today&apos;s
                  Mission
                </Eyebrow>

                <h2
                  style={{
                    margin:
                      "9px 0 0",
                    fontSize:
                      "clamp(23px, 5vw, 34px)",
                    lineHeight: 1.25,
                    letterSpacing:
                      "-0.03em",
                    overflowWrap:
                      "anywhere",
                  }}
                >
                  {loading
                    ? "正在读取当前任务…"
                    : missionTask
                      ? missionTask.title
                      : "创建 AIOS Alpha 的下一项目标"}
                </h2>

                <p
                  style={{
                    maxWidth: 660,
                    margin:
                      "10px 0 0",
                    color: "#64748b",
                    fontSize: 14,
                    lineHeight: 1.65,
                    whiteSpace:
                      "pre-wrap",
                  }}
                >
                  {missionTask
                    ?.description ??
                    (missionTask
                      ? "当前最高优先级执行任务。"
                      : "系统已经准备完成。创建任务后，Planner 将自动生成今日使命。")}
                </p>
              </div>

              <div
                style={{
                  flex:
                    "0 1 220px",
                  minWidth: 190,
                  padding: 16,
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: 15,
                  background:
                    "#f8fafc",
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
                  Overall Progress
                </p>

                <strong
                  style={{
                    display:
                      "block",
                    marginTop: 7,
                    fontSize: 30,
                  }}
                >
                  {taskProgress}%
                </strong>

                <ProgressBar
                  value={
                    taskProgress
                  }
                />

                <p
                  style={{
                    margin:
                      "9px 0 0",
                    color: "#94a3b8",
                    fontSize: 12,
                  }}
                >
                  {
                    completedTasks.length
                  }
                  /
                  {tasks.length} tasks
                  completed
                </p>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 19,
              }}
            >
              <PrimaryLink
                href={
                  missionTask
                    ? "/tasks"
                    : "/workspace"
                }
              >
                {missionTask
                  ? "继续执行"
                  : "创建目标"}
              </PrimaryLink>

              <SecondaryLink href="/runtime/trace">
                查看 Execution
                Trace
              </SecondaryLink>
            </div>
          </Panel>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(310px, 1fr))",
            gap: 16,
            marginBottom: 18,
          }}
        >
          <Panel>
            <SectionHeader
              eyebrow="AI Planner"
              title="Current Plan"
              description="根据现有任务自动提取当前目标和下一步。"
            />

            <div
              style={{
                display: "grid",
                gap: 12,
                marginTop: 18,
              }}
            >
              <PlannerRow
                number="01"
                label="Current Goal"
                value={
                  missionTask
                    ?.title ??
                  "等待创建目标"
                }
              />

              <PlannerRow
                number="02"
                label="Next Step"
                value={
                  nextTask?.title ??
                  (missionTask
                    ? "完成当前任务并更新状态"
                    : "进入 Workspace 创建第一项任务")
                }
              />

              <PlannerRow
                number="03"
                label="Expected Result"
                value={
                  missionTask
                    ? "形成可验证的完成结果"
                    : "建立第一条执行路径"
                }
              />

              <PlannerRow
                number="04"
                label="Execution State"
                value={
                  doingTasks.length >
                  0
                    ? `${doingTasks.length} 项正在执行`
                    : activeTasks.length >
                        0
                      ? `${activeTasks.length} 项等待执行`
                      : "Planner Ready"
                }
              />
            </div>

            <div
              style={{
                marginTop: 16,
              }}
            >
              <SecondaryLink href="/tasks">
                管理完整计划
              </SecondaryLink>
            </div>
          </Panel>

          <Panel>
            <SectionHeader
              eyebrow="Execution Queue"
              title="Next Actions"
              description="进行中任务优先，其次是等待执行的任务。"
            />

            <div
              style={{
                display: "grid",
                gap: 10,
                marginTop: 18,
              }}
            >
              {loading ? (
                <EmptyState>
                  正在读取任务队列…
                </EmptyState>
              ) : orderedTasks.length ===
                0 ? (
                <EmptyState>
                  当前没有任务。
                </EmptyState>
              ) : (
                orderedTasks
                  .slice(0, 5)
                  .map(
                    (
                      task,
                      index
                    ) => (
                      <QueueItem
                        key={task.id}
                        task={task}
                        index={
                          index
                        }
                      />
                    )
                  )
              )}
            </div>

            <div
              style={{
                marginTop: 16,
              }}
            >
              <SecondaryLink href="/tasks">
                查看全部任务
              </SecondaryLink>
            </div>
          </Panel>
        </section>

        <section
          style={{
            marginBottom: 18,
          }}
        >
          <Panel>
            <SectionHeader
              eyebrow="Quick Actions"
              title="Start Work"
              description="直接进入 AIOS Alpha 的核心操作模块。"
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(145px, 1fr))",
                gap: 10,
                marginTop: 18,
              }}
            >
              {quickActions.map(
                (action) => (
                  <QuickActionCard
                    key={
                      action.href
                    }
                    action={
                      action
                    }
                  />
                )
              )}
            </div>
          </Panel>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(310px, 1fr))",
            gap: 16,
            marginBottom: 18,
          }}
        >
          <Panel>
            <SectionHeader
              eyebrow="AI Health"
              title="System Intelligence"
              description="Brain、Memory、Runtime 和 Planner 健康状态。"
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: 10,
                marginTop: 18,
              }}
            >
              {healthItems.map(
                (item) => (
                  <HealthCard
                    key={
                      item.label
                    }
                    item={item}
                  />
                )
              )}
            </div>
          </Panel>

          <Panel>
            <SectionHeader
              eyebrow="Memory Snapshot"
              title="Current Context"
              description="当前用户资料与对话记忆概览。"
            />

            <div
              style={{
                display: "grid",
                gap: 13,
                marginTop: 19,
              }}
            >
              <MetricRow
                label="Total Memory"
                value={
                  dashboard.memory
                    .count
                }
                detail="records"
              />

              <MetricRow
                label="User Messages"
                value={
                  dashboard.memory
                    .userMessages
                }
                detail="inputs"
              />

              <MetricRow
                label="AI Messages"
                value={
                  dashboard.memory
                    .assistantMessages
                }
                detail="responses"
              />

              <div
                style={{
                  paddingTop: 4,
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    gap: 12,
                    marginBottom: 7,
                    color:
                      "#475569",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  <span>
                    Profile
                    Readiness
                  </span>

                  <span>
                    {
                      profileProgress
                    }
                    %
                  </span>
                </div>

                <ProgressBar
                  value={
                    profileProgress
                  }
                />
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
              }}
            >
              <SecondaryLink href="/memory">
                打开 Memory
              </SecondaryLink>
            </div>
          </Panel>
        </section>

        <section>
          <Panel>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent:
                  "space-between",
                alignItems:
                  "flex-start",
                gap: 16,
              }}
            >
              <SectionHeader
                eyebrow="Runtime"
                title="Operating Status"
                description="AIOS Alpha 当前运行环境与同步信息。"
              />

              <StatusBadge
                healthy={
                  systemHealthy
                }
                text={
                  systemHealthy
                    ? "Healthy"
                    : "Check Required"
                }
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(170px, 1fr))",
                gap: 10,
                marginTop: 18,
              }}
            >
              <RuntimeItem
                label="Runtime"
                value={
                  dashboard.runtime
                    .status
                }
                detail={`v${dashboard.runtime.version}`}
                healthy={
                  dashboard.runtime
                    .status ===
                  "online"
                }
              />

              <RuntimeItem
                label="Provider"
                value={
                  providerName
                }
                detail={
                  dashboard.provider
                    .latencyMs !==
                  null
                    ? `${dashboard.provider.latencyMs}ms`
                    : "Ready"
                }
                healthy={
                  !dashboard.provider
                    .fallbackUsed
                }
              />

              <RuntimeItem
                label="Storage"
                value={formatStorage(
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

              <RuntimeItem
                label="Isolation"
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
              <Alert
                title="Provider Fallback Active"
                message={
                  dashboard.provider
                    .error ??
                  "系统正在使用备用 Provider。"
                }
                tone="warning"
              />
            )}

            {!dashboard.storage
              .persistent && (
              <Alert
                title="Persistent Storage Disabled"
                message="当前存储模式不是 Redis，服务重启后部分数据可能丢失。"
                tone="warning"
              />
            )}

            <footer
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent:
                  "space-between",
                gap: 10,
                marginTop: 18,
                paddingTop: 16,
                borderTop:
                  "1px solid #e2e8f0",
                color: "#94a3b8",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              <span>
                最后同步：
                {formatTime(
                  dashboard.timestamp
                )}
              </span>

              <span>
                Provider：
                {formatTime(
                  dashboard.provider
                    .lastRequestAt
                )}
              </span>
            </footer>
          </Panel>
        </section>
      </main>
    </WorkspaceShell>
  );
}

function Panel({
  children,
  emphasis = false,
}: {
  children: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <article
      style={{
        minWidth: 0,
        padding:
          "clamp(18px, 4vw, 24px)",
        border: emphasis
          ? "1px solid #c7d2fe"
          : "1px solid #e2e8f0",
        borderRadius: 20,
        background: emphasis
          ? "linear-gradient(135deg, #ffffff 0%, #f8faff 100%)"
          : "#ffffff",
        boxShadow:
          "0 10px 30px rgba(15, 23, 42, 0.045)",
      }}
    >
      {children}
    </article>
  );
}

function Eyebrow({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <p
      style={{
        margin: 0,
        color: "#4f46e5",
        fontSize: 11,
        fontWeight: 850,
        letterSpacing:
          "0.1em",
        textTransform:
          "uppercase",
      }}
    >
      {children}
    </p>
  );
}

function SectionHeader({
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
      <Eyebrow>
        {eyebrow}
      </Eyebrow>

      <h2
        style={{
          margin:
            "6px 0 0",
          fontSize: 21,
          letterSpacing:
            "-0.025em",
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin:
            "7px 0 0",
          color: "#64748b",
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        {description}
      </p>
    </div>
  );
}

function PlannerRow({
  number,
  label,
  value,
}: {
  number: string;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: 13,
        border:
          "1px solid #e2e8f0",
        borderRadius: 14,
        background:
          "#f8fafc",
      }}
    >
      <span
        style={{
          display:
            "inline-flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          width: 30,
          height: 30,
          flexShrink: 0,
          borderRadius: 9,
          background:
            "#e0e7ff",
          color: "#4338ca",
          fontSize: 11,
          fontWeight: 850,
        }}
      >
        {number}
      </span>

      <div
        style={{
          minWidth: 0,
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#64748b",
            fontSize: 11,
            fontWeight: 750,
          }}
        >
          {label}
        </p>

        <strong
          style={{
            display: "block",
            marginTop: 4,
            color: "#0f172a",
            fontSize: 14,
            lineHeight: 1.45,
            overflowWrap:
              "anywhere",
          }}
        >
          {value}
        </strong>
      </div>
    </div>
  );
}

function QueueItem({
  task,
  index,
}: {
  task: Task;
  index: number;
}) {
  const statusConfig = {
    doing: {
      label: "Doing",
      background:
        "#eff6ff",
      color: "#1d4ed8",
      border:
        "#bfdbfe",
    },

    todo: {
      label: "Todo",
      background:
        "#fffbeb",
      color: "#92400e",
      border:
        "#fde68a",
    },

    done: {
      label: "Done",
      background:
        "#f0fdf4",
      color: "#15803d",
      border:
        "#bbf7d0",
    },
  }[task.status];

  return (
    <Link
      href="/tasks"
      style={{
        color: "inherit",
        textDecoration:
          "none",
      }}
    >
      <article
        style={{
          display: "flex",
          alignItems:
            "flex-start",
          gap: 11,
          padding: 13,
          border:
            "1px solid #e2e8f0",
          borderRadius: 14,
          background:
            "#ffffff",
        }}
      >
        <span
          style={{
            display:
              "inline-flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            width: 27,
            height: 27,
            flexShrink: 0,
            borderRadius: 8,
            background:
              "#f1f5f9",
            color: "#475569",
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          {index + 1}
        </span>

        <div
          style={{
            minWidth: 0,
            flex: 1,
          }}
        >
          <strong
            style={{
              display: "block",
              fontSize: 14,
              lineHeight: 1.4,
              overflowWrap:
                "anywhere",
              textDecoration:
                task.status ===
                "done"
                  ? "line-through"
                  : "none",
            }}
          >
            {task.title}
          </strong>

          {task.description && (
            <p
              style={{
                margin:
                  "5px 0 0",
                color: "#64748b",
                fontSize: 12,
                lineHeight: 1.45,
                overflow: "hidden",
                display:
                  "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient:
                  "vertical",
              }}
            >
              {task.description}
            </p>
          )}
        </div>

        <span
          style={{
            flexShrink: 0,
            padding:
              "4px 7px",
            border: `1px solid ${statusConfig.border}`,
            borderRadius: 999,
            background:
              statusConfig.background,
            color:
              statusConfig.color,
            fontSize: 9,
            fontWeight: 850,
            textTransform:
              "uppercase",
          }}
        >
          {statusConfig.label}
        </span>
      </article>
    </Link>
  );
}

function QuickActionCard({
  action,
}: {
  action: QuickAction;
}) {
  return (
    <Link
      href={action.href}
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
          padding: 14,
          border:
            "1px solid #e2e8f0",
          borderRadius: 14,
          background:
            "#f8fafc",
        }}
      >
        <span
          style={{
            display:
              "inline-flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            width: 34,
            height: 34,
            borderRadius: 10,
            background:
              "#ffffff",
            fontSize: 17,
          }}
        >
          {action.icon}
        </span>

        <strong
          style={{
            display: "block",
            marginTop: 10,
            fontSize: 14,
          }}
        >
          {action.title}
        </strong>

        <p
          style={{
            margin:
              "5px 0 0",
            color: "#64748b",
            fontSize: 11,
            lineHeight: 1.45,
          }}
        >
          {action.description}
        </p>
      </article>
    </Link>
  );
}

function HealthCard({
  item,
}: {
  item: HealthItem;
}) {
  const palette = {
    healthy: {
      dot: "#22c55e",
      background:
        "#f0fdf4",
      border:
        "#bbf7d0",
    },

    warning: {
      dot: "#f59e0b",
      background:
        "#fffbeb",
      border:
        "#fde68a",
    },

    offline: {
      dot: "#ef4444",
      background:
        "#fef2f2",
      border:
        "#fecaca",
    },
  }[item.status];

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
          height: "100%",
          boxSizing:
            "border-box",
          padding: 13,
          border: `1px solid ${palette.border}`,
          borderRadius: 14,
          background:
            palette.background,
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
              background:
                palette.dot,
            }}
          />

          <strong
            style={{
              fontSize: 13,
            }}
          >
            {item.label}
          </strong>
        </div>

        <p
          style={{
            margin:
              "7px 0 0",
            color: "#64748b",
            fontSize: 11,
            lineHeight: 1.45,
            overflowWrap:
              "anywhere",
          }}
        >
          {item.detail}
        </p>
      </article>
    </Link>
  );
}

function MetricRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent:
          "space-between",
        alignItems:
          "center",
        gap: 14,
        paddingBottom: 12,
        borderBottom:
          "1px solid #f1f5f9",
      }}
    >
      <span
        style={{
          color: "#475569",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {label}
      </span>

      <div
        style={{
          textAlign: "right",
        }}
      >
        <strong
          style={{
            fontSize: 18,
          }}
        >
          {value}
        </strong>

        <span
          style={{
            marginLeft: 5,
            color: "#94a3b8",
            fontSize: 10,
          }}
        >
          {detail}
        </span>
      </div>
    </div>
  );
}

function RuntimeItem({
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
        padding: 13,
        border:
          "1px solid #e2e8f0",
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
            fontSize: 11,
            fontWeight: 750,
          }}
        >
          {label}
        </span>
      </div>

      <strong
        style={{
          display: "block",
          marginTop: 8,
          fontSize: 14,
          lineHeight: 1.4,
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
            "4px 0 0",
          color: "#94a3b8",
          fontSize: 11,
          overflowWrap:
            "anywhere",
        }}
      >
        {detail}
      </p>
    </div>
  );
}

function ProgressBar({
  value,
}: {
  value: number;
}) {
  const progress =
    Math.min(
      100,
      Math.max(0, value)
    );

  return (
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
          width: `${progress}%`,
          height: "100%",
          borderRadius: 999,
          background:
            progress >= 80
              ? "#22c55e"
              : progress >= 40
                ? "#4f46e5"
                : "#f59e0b",
          transition:
            "width 220ms ease",
        }}
      />
    </div>
  );
}

function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        display:
          "inline-flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        minHeight: 40,
        padding:
          "9px 14px",
        borderRadius: 11,
        background:
          "#111827",
        color: "#ffffff",
        fontSize: 13,
        fontWeight: 750,
        textDecoration:
          "none",
      }}
    >
      {children} →
    </Link>
  );
}

function SecondaryLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        display:
          "inline-flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        minHeight: 38,
        padding:
          "8px 12px",
        border:
          "1px solid #d1d5db",
        borderRadius: 10,
        background:
          "#ffffff",
        color: "#334155",
        fontSize: 12,
        fontWeight: 750,
        textDecoration:
          "none",
      }}
    >
      {children} →
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
        fontSize: 10,
        fontWeight: 850,
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

function Alert({
  title,
  message,
  tone,
}: {
  title: string;
  message: string;
  tone:
    | "warning"
    | "danger";
}) {
  const palette =
    tone === "danger"
      ? {
          border:
            "#fecaca",
          background:
            "#fef2f2",
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
        padding: 13,
        border: `1px solid ${palette.border}`,
        borderRadius: 13,
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

function EmptyState({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      style={{
        padding:
          "28px 16px",
        border:
          "1px dashed #cbd5e1",
        borderRadius: 14,
        color: "#64748b",
        fontSize: 13,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}