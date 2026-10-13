"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { usePlanner } from "@/components/planner/usePlanner";
import { APP_VERSION } from "@/lib/config/app";
import type { Task } from "@/lib/task/types";

interface DashboardData {
  success: boolean;

  runtime: {
    id: string;
    version: string;
    status: "online" | "offline";
  };

  provider: {
    configured: string;
    active: string;
    requested: string;
    fallbackUsed: boolean;
    success: boolean;
    latencyMs: number | null;
    error: string | null;
    lastRequestAt: number | null;
  };

  storage: {
    mode: string;
    persistent: boolean;
    healthy: boolean;
    error: string | null;
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

const EMPTY_DASHBOARD: DashboardData = {
  success: false,
  runtime: {
    id: "aios-alpha",
    version: APP_VERSION,
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
    totalFields: 0,
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

const COPY = {
  en: {
    eyebrow: "AIOS Alpha",
    title: "Dashboard",
    description:
      "See what matters now, what AIOS recommends next, and how execution is progressing.",
    operating: "Operating",
    attention: "Attention",
    sync: "Sync",
    syncing: "Syncing...",
    syncError: "Dashboard sync failed",
    plannerError: "Planner sync failed",

    mission: "Current Mission",
    noMission: "Create the next objective",
    noMissionDescription:
      "Create a task with a clear result so AIOS can establish the next execution path.",
    currentTask: "Current execution task",
    continue: "Continue",
    createGoal: "Create goal",
    openTasks: "Open tasks",

    progress: "Progress",
    completed: "completed",
    active: "active",
    total: "total",

    next: "Next Action",
    plannerNext:
      "Planner will determine the next action from real task state.",
    execution: "Execution",
    openExecution: "Open Execution",

    planner: "Planner",
    plannerDescription:
      "Planner converts current task state into the next execution path.",
    currentGoal: "Current Goal",
    nextStep: "Next Step",
    expectedResult: "Expected Result",
    executionState: "Execution State",
    managePlanner: "Manage Planner",

    learning: "Execution Intelligence",
    learningDescription:
      "AIOS learns from real task results instead of simulated progress.",
    health: "Health",
    confidence: "Confidence",
    completionRate: "Completion",
    velocity: "Velocity",
    stale: "Stale",
    tasksPerDay: "tasks / day",
    noData: "Waiting for real execution data",
    healthy: "Healthy",
    attentionState: "Attention",
    blocked: "Blocked",
    insufficient: "Building baseline",

    recommendation: "Recommendation",
    noRecommendation:
      "Create and complete the first real task to establish a learning baseline.",

    queue: "Execution Queue",
    queueDescription:
      "The most relevant unfinished tasks are shown here.",
    noTasks: "No active tasks.",
    doing: "Doing",
    todo: "Todo",
    done: "Done",
    viewAll: "View all tasks",

    system: "System State",
    runtime: "Runtime",
    provider: "Model",
    storage: "Storage",
    memory: "Memory",
    online: "Online",
    offline: "Offline",
    ready: "Ready",
    fallback: "Fallback",
    persistent: "Persistent",
    temporary: "Temporary",
    records: "records",

    quick: "Quick Actions",
    chat: "Chat",
    chatDescription:
      "Start with a goal, question or operation.",
    task: "New Task",
    taskDescription:
      "Turn an objective into an executable task.",
    plannerQuick: "Planner",
    plannerQuickDescription:
      "Review the current plan and next step.",
    executionQuick: "Execution",
    executionQuickDescription:
      "Run and inspect execution jobs.",

    memorySnapshot: "Memory Snapshot",
    messages: "messages",
    profile: "Profile",
    lastSync: "Last sync",
    never: "Never",
  },

  "zh-CN": {
    eyebrow: "AIOS Alpha",
    title: "工作仪表盘",
    description:
      "只显示现在真正重要的信息：当前目标、执行进度、下一步行动以及 AIOS 的学习状态。",
    operating: "运行正常",
    attention: "需要关注",
    sync: "同步",
    syncing: "同步中...",
    syncError: "Dashboard 同步失败",
    plannerError: "Planner 同步失败",

    mission: "当前任务",
    noMission: "创建下一个目标",
    noMissionDescription:
      "创建一项具有明确结果的任务，让 AIOS 建立下一条执行路径。",
    currentTask: "当前执行任务",
    continue: "继续执行",
    createGoal: "创建目标",
    openTasks: "打开任务",

    progress: "执行进度",
    completed: "已完成",
    active: "执行中",
    total: "总任务",

    next: "下一步行动",
    plannerNext:
      "Planner 将根据真实任务状态确定下一步行动。",
    execution: "执行",
    openExecution: "进入 Execution",

    planner: "Planner",
    plannerDescription:
      "Planner 根据当前真实任务状态生成下一条执行路径。",
    currentGoal: "当前目标",
    nextStep: "下一步",
    expectedResult: "预期结果",
    executionState: "执行状态",
    managePlanner: "管理 Planner",

    learning: "执行智能",
    learningDescription:
      "AIOS 从真实任务结果学习，而不是从模拟进度学习。",
    health: "健康状态",
    confidence: "置信度",
    completionRate: "完成率",
    velocity: "执行速度",
    stale: "停滞",
    tasksPerDay: "任务 / 天",
    noData: "等待真实执行数据",
    healthy: "健康",
    attentionState: "需要关注",
    blocked: "受阻",
    insufficient: "正在建立基线",

    recommendation: "下一项建议",
    noRecommendation:
      "创建并完成第一项真实任务，建立 Planner Learning 基线。",

    queue: "执行队列",
    queueDescription:
      "这里显示当前最值得继续推进的未完成任务。",
    noTasks: "当前没有活跃任务。",
    doing: "执行中",
    todo: "待执行",
    done: "已完成",
    viewAll: "查看全部任务",

    system: "系统状态",
    runtime: "Runtime",
    provider: "模型服务",
    storage: "存储",
    memory: "Memory",
    online: "在线",
    offline: "离线",
    ready: "就绪",
    fallback: "备用服务",
    persistent: "持久化",
    temporary: "临时",
    records: "条记录",

    quick: "快捷操作",
    chat: "对话",
    chatDescription:
      "从目标、问题或操作开始。",
    task: "新建任务",
    taskDescription:
      "把目标转换成可执行任务。",
    plannerQuick: "Planner",
    plannerQuickDescription:
      "查看当前计划与下一步。",
    executionQuick: "Execution",
    executionQuickDescription:
      "运行并查看执行任务。",

    memorySnapshot: "Memory 快照",
    messages: "条消息",
    profile: "Profile",
    lastSync: "最后同步",
    never: "暂无",
  },

  ja: {
    eyebrow: "AIOS Alpha",
    title: "ダッシュボード",
    description:
      "現在重要な目標、実行状況、次のアクション、AIOS の学習状態を確認します。",
    operating: "稼働中",
    attention: "要確認",
    sync: "同期",
    syncing: "同期中...",
    syncError: "Dashboard の同期に失敗しました",
    plannerError: "Planner の同期に失敗しました",

    mission: "現在のタスク",
    noMission: "次の目標を作成",
    noMissionDescription:
      "明確な結果を持つタスクを作成すると、AIOS が次の実行経路を構築します。",
    currentTask: "現在の実行タスク",
    continue: "続行",
    createGoal: "目標を作成",
    openTasks: "タスクを開く",

    progress: "進捗",
    completed: "完了",
    active: "実行中",
    total: "合計",

    next: "次のアクション",
    plannerNext:
      "Planner が実際のタスク状態から次のアクションを決定します。",
    execution: "実行",
    openExecution: "Execution を開く",

    planner: "Planner",
    plannerDescription:
      "現在のタスク状態から次の実行経路を生成します。",
    currentGoal: "現在の目標",
    nextStep: "次のステップ",
    expectedResult: "期待する結果",
    executionState: "実行状態",
    managePlanner: "Planner を管理",

    learning: "実行インテリジェンス",
    learningDescription:
      "AIOS は実際のタスク結果から学習します。",
    health: "状態",
    confidence: "信頼度",
    completionRate: "完了率",
    velocity: "実行速度",
    stale: "停滞",
    tasksPerDay: "タスク / 日",
    noData: "実際の実行データを待機中",
    healthy: "正常",
    attentionState: "要確認",
    blocked: "停止中",
    insufficient: "基準を構築中",

    recommendation: "次の推奨",
    noRecommendation:
      "最初の実タスクを完了して学習基準を作成してください。",

    queue: "実行キュー",
    queueDescription:
      "現在優先すべき未完了タスクを表示します。",
    noTasks: "アクティブなタスクはありません。",
    doing: "実行中",
    todo: "未実行",
    done: "完了",
    viewAll: "すべてのタスク",

    system: "システム状態",
    runtime: "Runtime",
    provider: "モデル",
    storage: "Storage",
    memory: "Memory",
    online: "オンライン",
    offline: "オフライン",
    ready: "準備完了",
    fallback: "Fallback",
    persistent: "永続",
    temporary: "一時",
    records: "件",

    quick: "クイックアクション",
    chat: "Chat",
    chatDescription:
      "目標、質問、操作から開始します。",
    task: "新しいタスク",
    taskDescription:
      "目標を実行可能なタスクに変換します。",
    plannerQuick: "Planner",
    plannerQuickDescription:
      "現在の計画と次のステップを確認します。",
    executionQuick: "Execution",
    executionQuickDescription:
      "実行ジョブを開始・確認します。",

    memorySnapshot: "Memory スナップショット",
    messages: "件のメッセージ",
    profile: "Profile",
    lastSync: "最終同期",
    never: "なし",
  },
} as const;

type Locale = keyof typeof COPY;

function calculateProgress(
  completed: number,
  total: number
): number {
  if (total <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round((completed / total) * 100)
    )
  );
}

function sortTasks(
  tasks: Task[]
): Task[] {
  const priority: Record<Task["status"], number> = {
    doing: 0,
    todo: 1,
    done: 2,
  };

  return [...tasks].sort((a, b) => {
    const statusDelta =
      priority[a.status] - priority[b.status];

    if (statusDelta !== 0) {
      return statusDelta;
    }

    return b.updatedAt - a.updatedAt;
  });
}

function formatTime(
  timestamp: number,
  locale: string
): string {
  if (!timestamp) {
    return "";
  }

  try {
    return new Date(timestamp).toLocaleString(
      locale,
      {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  } catch {
    return "";
  }
}

function statusColor(
  status:
    | "healthy"
    | "warning"
    | "offline"
): string {
  if (status === "healthy") {
    return "#15803d";
  }

  if (status === "warning") {
    return "#b45309";
  }

  return "#b91c1c";
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "success" | "warning" | "danger" | "neutral";
}) {
  const color =
    tone === "success"
      ? "#15803d"
      : tone === "warning"
        ? "#b45309"
        : tone === "danger"
          ? "#b91c1c"
          : "#475569";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        minHeight: 26,
        padding: "4px 9px",
        borderRadius: 999,
        border: `1px solid ${color}22`,
        background: `${color}0d`,
        color,
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
        }}
      />
      {children}
    </span>
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
    <section
      style={{
        border: emphasis
          ? "1px solid #cbd5e1"
          : "1px solid #e2e8f0",
        borderRadius: 18,
        background: "#ffffff",
        padding: 20,
        boxShadow: emphasis
          ? "0 8px 30px rgba(15,23,42,0.06)"
          : "0 3px 16px rgba(15,23,42,0.035)",
      }}
    >
      {children}
    </section>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p
        style={{
          margin: 0,
          color: "#64748b",
          fontSize: 11,
          fontWeight: 850,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </p>

      <h2
        style={{
          margin: "5px 0 0",
          color: "#0f172a",
          fontSize: 20,
          lineHeight: 1.25,
          letterSpacing: "-0.025em",
        }}
      >
        {title}
      </h2>

      {description ? (
        <p
          style={{
            margin: "7px 0 0",
            color: "#64748b",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

function ProgressBar({
  value,
}: {
  value: number;
}) {
  return (
    <div
      aria-label={`${value}%`}
      style={{
        width: "100%",
        height: 8,
        overflow: "hidden",
        borderRadius: 999,
        background: "#e2e8f0",
      }}
    >
      <div
        style={{
          width: `${value}%`,
          height: "100%",
          borderRadius: 999,
          background: "#0f172a",
          transition: "width 220ms ease",
        }}
      />
    </div>
  );
}

export default function DashboardPage() {
  const { locale } = useLanguage();
  const planner = usePlanner();

  const copy =
    COPY[
      (locale in COPY
        ? locale
        : "en") as Locale
    ];

  const {
    snapshot,
    learning,
    learningHistory,
    adaptiveStrategy,
    loading: plannerLoading,
    refreshing: plannerRefreshing,
    error: plannerError,
    refresh: refreshPlanner,
  } = planner;

  const [dashboard, setDashboard] =
    useState<DashboardData>(
      EMPTY_DASHBOARD
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
      async (silent = false) => {
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
                cache: "no-store",
              }
            ),
            fetch(
              "/api/tasks",
              {
                cache: "no-store",
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
                dashboardResult.provider?.error ??
                copy.syncError
            );
          }

          if (
            !tasksResponse.ok ||
            !tasksResult.success
          ) {
            throw new Error(
              tasksResult.error ??
                copy.syncError
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
        } catch (
          requestError
        ) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : copy.syncError
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [copy.syncError]
    );

  useEffect(() => {
    void loadData();

    const interval =
      window.setInterval(
        () => {
          void loadData(true);
        },
        15000
      );

    const handleFocus = () => {
      void loadData(true);
    };

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.clearInterval(
        interval
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
            task.status !== "done"
        ),
      [orderedTasks]
    );

  const completedTasks =
    useMemo(
      () =>
        orderedTasks.filter(
          (task) =>
            task.status === "done"
        ),
      [orderedTasks]
    );

  const doingTasks =
    useMemo(
      () =>
        orderedTasks.filter(
          (task) =>
            task.status === "doing"
        ),
      [orderedTasks]
    );

  const missionTask =
    snapshot?.mission?.id
      ? tasks.find(
          (task) =>
            task.id ===
            snapshot.mission.id
        ) ?? null
      : doingTasks[0] ??
        activeTasks[0] ??
        null;

  const nextTask =
    activeTasks.find(
      (task) =>
        task.id !==
        missionTask?.id
    ) ?? null;

  const taskProgress =
    calculateProgress(
      completedTasks.length,
      tasks.length
    );

  const learningMetrics =
    learning?.metrics ?? null;

  const learningHealth =
    learning?.health ??
    "insufficient-data";

  const learningHealthLabel =
    learningHealth === "healthy"
      ? copy.healthy
      : learningHealth === "blocked"
        ? copy.blocked
        : learningHealth === "attention"
          ? copy.attentionState
          : copy.insufficient;

  const strategyMode =
    adaptiveStrategy?.mode ??
    "baseline";

  const systemHealthy =
    dashboard.runtime.status ===
      "online" &&
    dashboard.storage.healthy &&
    dashboard.provider.success &&
    !dashboard.provider.fallbackUsed;

  const handleRefresh =
    useCallback(
      async () => {
        await Promise.all([
          loadData(true),
          refreshPlanner(
            "dashboard-manual"
          ),
        ]);
      },
      [
        loadData,
        refreshPlanner,
      ]
    );

  const lastSync =
    dashboard.timestamp
      ? formatTime(
          dashboard.timestamp,
          locale
        )
      : "";

  const providerName =
    dashboard.provider.active &&
    dashboard.provider.active !==
      "unknown"
      ? dashboard.provider.active
      : dashboard.provider.configured;

  const profileProgress =
    calculateProgress(
      dashboard.profile.completedFields,
      dashboard.profile.totalFields
    );

  const plannerBusy =
    plannerLoading ||
    plannerRefreshing;

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
            alignItems: "flex-start",
            gap: 18,
            marginBottom: 22,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 9,
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                  fontSize: 12,
                  fontWeight: 850,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {copy.eyebrow} · v{APP_VERSION}
              </p>

              <Badge
                tone={
                  systemHealthy
                    ? "success"
                    : "warning"
                }
              >
                {systemHealthy
                  ? copy.operating
                  : copy.attention}
              </Badge>
            </div>

            <h1
              style={{
                margin: "8px 0 0",
                fontSize:
                  "clamp(30px, 6vw, 44px)",
                lineHeight: 1.08,
                letterSpacing: "-0.04em",
              }}
            >
              {copy.title}
            </h1>

            <p
              style={{
                maxWidth: 720,
                margin: "10px 0 0",
                color: "#64748b",
                fontSize: 15,
                lineHeight: 1.7,
              }}
            >
              {copy.description}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void handleRefresh();
            }}
            disabled={
              loading ||
              refreshing ||
              plannerBusy
            }
            style={{
              minHeight: 42,
              padding: "10px 15px",
              border: "1px solid #cbd5e1",
              borderRadius: 12,
              background: "#ffffff",
              color: "#0f172a",
              fontWeight: 800,
              cursor:
                loading ||
                refreshing ||
                plannerBusy
                  ? "not-allowed"
                  : "pointer",
              opacity:
                loading ||
                refreshing ||
                plannerBusy
                  ? 0.55
                  : 1,
            }}
          >
            {loading ||
            refreshing ||
            plannerBusy
              ? copy.syncing
              : copy.sync}
          </button>
        </header>

        {error ? (
          <Panel>
            <Badge tone="danger">
              {copy.syncError}
            </Badge>

            <p
              style={{
                margin: "10px 0 0",
                color: "#64748b",
                lineHeight: 1.6,
              }}
            >
              {error}
            </p>
          </Panel>
        ) : null}

        {plannerError ? (
          <div
            style={{
              marginTop: error ? 12 : 0,
            }}
          >
            <Panel>
              <Badge tone="warning">
                {copy.plannerError}
              </Badge>

              <p
                style={{
                  margin: "10px 0 0",
                  color: "#64748b",
                  lineHeight: 1.6,
                }}
              >
                {plannerError}
              </p>
            </Panel>
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1.55fr) minmax(260px, 0.75fr)",
            gap: 18,
            marginTop:
              error || plannerError
                ? 18
                : 0,
          }}
        >
          <Panel emphasis>
            <SectionTitle
              eyebrow={copy.mission}
              title={
                loading
                  ? "..."
                  : missionTask?.title ??
                    snapshot?.mission?.title ??
                    copy.noMission
              }
              description={
                missionTask?.description ??
                snapshot?.mission?.description ??
                copy.noMissionDescription
              }
            />

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 10,
                marginTop: 18,
              }}
            >
              {missionTask ? (
                <Badge
                  tone={
                    missionTask.status ===
                    "doing"
                      ? "success"
                      : "neutral"
                  }
                >
                  {missionTask.status ===
                  "doing"
                    ? copy.active
                    : copy.todo}
                </Badge>
              ) : null}

              {snapshot?.mission?.priority ? (
                <Badge>
                  {snapshot.mission.priority}
                </Badge>
              ) : null}
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 20,
              }}
            >
              <Link
                href={
                  missionTask
                    ? "/execution"
                    : "/planner"
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 42,
                  padding: "9px 15px",
                  borderRadius: 12,
                  background: "#0f172a",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                {missionTask
                  ? copy.continue
                  : copy.createGoal}
              </Link>

              <Link
                href="/tasks"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 42,
                  padding: "9px 15px",
                  border:
                    "1px solid #cbd5e1",
                  borderRadius: 12,
                  background: "#ffffff",
                  color: "#0f172a",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                {copy.openTasks}
              </Link>
            </div>
          </Panel>

          <Panel>
            <SectionTitle
              eyebrow={copy.progress}
              title={`${taskProgress}%`}
            />

            <ProgressBar
              value={taskProgress}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, minmax(0, 1fr))",
                gap: 8,
                marginTop: 18,
              }}
            >
              <Metric
                value={
                  completedTasks.length
                }
                label={copy.completed}
              />

              <Metric
                value={activeTasks.length}
                label={copy.active}
              />

              <Metric
                value={tasks.length}
                label={copy.total}
              />
            </div>
          </Panel>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 18,
            marginTop: 18,
          }}
        >
          <Panel>
            <SectionTitle
              eyebrow={copy.next}
              title={
                snapshot?.plan?.nextStep ||
                nextTask?.title ||
                copy.plannerNext
              }
              description={
                snapshot?.plan?.expectedResult ||
                nextTask?.description ||
                copy.plannerNext
              }
            />

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <Link
                href="/execution"
                style={secondaryLinkStyle}
              >
                {copy.openExecution}
              </Link>

              <Link
                href="/planner"
                style={secondaryLinkStyle}
              >
                {copy.managePlanner}
              </Link>
            </div>
          </Panel>

          <Panel>
            <SectionTitle
              eyebrow={copy.learning}
              title={learningHealthLabel}
              description={
                learning?.recommendation ??
                copy.noRecommendation
              }
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <Metric
                value={
                  learning?.confidence ??
                  0
                }
                label={copy.confidence}
                suffix="%"
              />

              <Metric
                value={
                  learningMetrics?.completionRate ??
                  0
                }
                label={copy.completionRate}
                suffix="%"
              />

              <Metric
                value={
                  learningMetrics?.executionVelocity ??
                  0
                }
                label={copy.velocity}
              />
            </div>

            <div
              style={{
                marginTop: 15,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {learningMetrics ? (
                <Badge>
                  {learningMetrics.stale}{" "}
                  {copy.stale}
                </Badge>
              ) : null}

              {learningHistory?.trend ? (
                <Badge>
                  {learningHistory.trend}
                </Badge>
              ) : null}

              <Badge>
                {strategyMode}
              </Badge>
            </div>
          </Panel>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1.2fr) minmax(300px, 0.8fr)",
            gap: 18,
            marginTop: 18,
          }}
        >
          <Panel>
            <SectionTitle
              eyebrow={copy.planner}
              title={
                snapshot?.plan?.currentGoal ||
                copy.noMission
              }
              description={
                snapshot?.plan?.executionState ||
                copy.plannerDescription
              }
            />

            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >
              <InfoRow
                label={copy.currentGoal}
                value={
                  snapshot?.plan?.currentGoal ||
                  copy.noMission
                }
              />

              <InfoRow
                label={copy.nextStep}
                value={
                  snapshot?.plan?.nextStep ||
                  copy.plannerNext
                }
              />

              <InfoRow
                label={copy.expectedResult}
                value={
                  snapshot?.plan?.expectedResult ||
                  copy.plannerNext
                }
              />

              <InfoRow
                label={copy.executionState}
                value={
                  snapshot?.plan?.executionState ||
                  "idle"
                }
              />
            </div>

            <div
              style={{
                marginTop: 18,
              }}
            >
              <Link
                href="/planner"
                style={primaryLinkStyle}
              >
                {copy.managePlanner}
              </Link>
            </div>
          </Panel>

          <Panel>
            <SectionTitle
              eyebrow={copy.queue}
              title={`${activeTasks.length} ${copy.active}`}
              description={copy.queueDescription}
            />

            {activeTasks.length === 0 ? (
              <div
                style={{
                  padding: "18px 0",
                  color: "#64748b",
                  fontSize: 14,
                }}
              >
                {copy.noTasks}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 9,
                }}
              >
                {activeTasks
                  .slice(0, 5)
                  .map((task) => (
                    <Link
                      key={task.id}
                      href="/tasks"
                      style={{
                        display: "block",
                        padding: 12,
                        border:
                          "1px solid #e2e8f0",
                        borderRadius: 12,
                        background: "#f8fafc",
                        color: "#0f172a",
                        textDecoration: "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: 10,
                          alignItems:
                            "flex-start",
                        }}
                      >
                        <strong
                          style={{
                            fontSize: 13,
                            lineHeight: 1.45,
                            overflowWrap:
                              "anywhere",
                          }}
                        >
                          {task.title}
                        </strong>

                        <span
                          style={{
                            flexShrink: 0,
                            color: "#64748b",
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {task.status ===
                          "doing"
                            ? copy.doing
                            : copy.todo}
                        </span>
                      </div>

                      {task.description ? (
                        <p
                          style={{
                            margin:
                              "6px 0 0",
                            color:
                              "#64748b",
                            fontSize: 12,
                            lineHeight: 1.5,
                            display:
                              "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient:
                              "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {task.description}
                        </p>
                      ) : null}
                    </Link>
                  ))}
              </div>
            )}

            <div
              style={{
                marginTop: 14,
              }}
            >
              <Link
                href="/tasks"
                style={secondaryLinkStyle}
              >
                {copy.viewAll}
              </Link>
            </div>
          </Panel>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 18,
            marginTop: 18,
          }}
        >
          <Panel>
            <SectionTitle
              eyebrow={copy.system}
              title={
                systemHealthy
                  ? copy.operating
                  : copy.attention
              }
            />

            <div
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              <SystemRow
                label={copy.runtime}
                value={
                  dashboard.runtime.status ===
                  "online"
                    ? copy.online
                    : copy.offline
                }
                tone={
                  dashboard.runtime.status ===
                  "online"
                    ? "success"
                    : "danger"
                }
              />

              <SystemRow
                label={copy.provider}
                value={
                  dashboard.provider.fallbackUsed
                    ? `${providerName} · ${copy.fallback}`
                    : dashboard.provider.success
                      ? `${providerName} · ${copy.ready}`
                      : copy.attention
                }
                tone={
                  dashboard.provider.fallbackUsed
                    ? "warning"
                    : dashboard.provider.success
                      ? "success"
                      : "danger"
                }
              />

              <SystemRow
                label={copy.storage}
                value={
                  dashboard.storage.persistent
                    ? `${dashboard.storage.mode} · ${copy.persistent}`
                    : `${dashboard.storage.mode} · ${copy.temporary}`
                }
                tone={
                  dashboard.storage.healthy
                    ? "success"
                    : "warning"
                }
              />

              <SystemRow
                label={copy.memory}
                value={`${dashboard.memory.count} ${copy.records}`}
                tone="neutral"
              />
            </div>

            <p
              style={{
                margin: "15px 0 0",
                color: "#94a3b8",
                fontSize: 11,
              }}
            >
              {copy.lastSync}:{" "}
              {lastSync || copy.never}
            </p>
          </Panel>

          <Panel>
            <SectionTitle
              eyebrow={copy.memorySnapshot}
              title={`${dashboard.memory.count} ${copy.records}`}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <Metric
                value={
                  dashboard.memory.userMessages
                }
                label={copy.chat}
              />

              <Metric
                value={
                  dashboard.memory.assistantMessages
                }
                label={copy.execution}
              />
            </div>

            <div
              style={{
                marginTop: 15,
                padding: 12,
                border:
                  "1px solid #e2e8f0",
                borderRadius: 12,
                background: "#f8fafc",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  gap: 10,
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    color: "#64748b",
                  }}
                >
                  {copy.profile}
                </span>

                <strong>
                  {profileProgress}%
                </strong>
              </div>

              <div
                style={{
                  marginTop: 8,
                }}
              >
                <ProgressBar
                  value={
                    profileProgress
                  }
                />
              </div>
            </div>
          </Panel>
        </div>

        <Panel>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-start",
              justifyContent:
                "space-between",
              gap: 16,
            }}
          >
            <div>
              <SectionTitle
                eyebrow={copy.quick}
                title={copy.quick}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <QuickLink
              href="/chat"
              title={copy.chat}
              description={
                copy.chatDescription
              }
            />

            <QuickLink
              href="/tasks"
              title={copy.task}
              description={
                copy.taskDescription
              }
            />

            <QuickLink
              href="/planner"
              title={copy.plannerQuick}
              description={
                copy.plannerQuickDescription
              }
            />

            <QuickLink
              href="/execution"
              title={copy.executionQuick}
              description={
                copy.executionQuickDescription
              }
            />
          </div>
        </Panel>

        <footer
          style={{
            padding:
              "22px 0 32px",
            color: "#94a3b8",
            fontSize: 11,
            textAlign: "center",
          }}
        >
          AIOS Alpha · v{APP_VERSION}
        </footer>

        <style jsx>{`
          @media (max-width: 900px) {
            main > div {
              grid-template-columns: 1fr !important;
            }

            main > div > section {
              min-width: 0;
            }
          }

          @media (max-width: 640px) {
            main {
              padding: 0 14px;
            }
          }
        `}</style>
      </main>
    </WorkspaceShell>
  );
}

function Metric({
  value,
  label,
  suffix,
}: {
  value: number;
  label: string;
  suffix?: string;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: 12,
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        background: "#f8fafc",
      }}
    >
      <strong
        style={{
          display: "block",
          color: "#0f172a",
          fontSize: 20,
          lineHeight: 1.1,
        }}
      >
        {value}
        {suffix ?? ""}
      </strong>

      <span
        style={{
          display: "block",
          marginTop: 5,
          color: "#64748b",
          fontSize: 11,
          lineHeight: 1.4,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "110px minmax(0, 1fr)",
        gap: 12,
        paddingBottom: 11,
        borderBottom:
          "1px solid #f1f5f9",
      }}
    >
      <span
        style={{
          color: "#64748b",
          fontSize: 12,
          fontWeight: 750,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          color: "#0f172a",
          fontSize: 13,
          lineHeight: 1.5,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function SystemRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone:
    | "success"
    | "warning"
    | "danger"
    | "neutral";
}) {
  const color =
    tone === "success"
      ? "#15803d"
      : tone === "warning"
        ? "#b45309"
        : tone === "danger"
          ? "#b91c1c"
          : "#475569";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent:
          "space-between",
        gap: 12,
        padding:
          "10px 0",
        borderBottom:
          "1px solid #f1f5f9",
      }}
    >
      <span
        style={{
          color: "#64748b",
          fontSize: 13,
        }}
      >
        {label}
      </span>

      <span
        style={{
          color,
          fontSize: 12,
          fontWeight: 800,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        minWidth: 0,
        padding: 14,
        border:
          "1px solid #e2e8f0",
        borderRadius: 14,
        background: "#ffffff",
        color: "#0f172a",
        textDecoration: "none",
      }}
    >
      <strong
        style={{
          display: "block",
          fontSize: 13,
          lineHeight: 1.35,
        }}
      >
        {title}
      </strong>

      <span
        style={{
          display: "block",
          marginTop: 6,
          color: "#64748b",
          fontSize: 11,
          lineHeight: 1.5,
        }}
      >
        {description}
      </span>
    </Link>
  );
}

const primaryLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 40,
  padding: "8px 13px",
  borderRadius: 11,
  background: "#0f172a",
  color: "#ffffff",
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 800,
} as const;

const secondaryLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 40,
  padding: "8px 13px",
  border: "1px solid #cbd5e1",
  borderRadius: 11,
  background: "#ffffff",
  color: "#0f172a",
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 800,
} as const;
