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
import { MODULE_ICONS } from "@/lib/ui/module-icons";
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

interface HealthItem {
  label: string;
  detail: string;
  status: "healthy" | "warning" | "offline";
  href: string;
}

interface QuickAction {
  icon: string;
  title: string;
  description: string;
  href: string;
}

const COPY = {
  en: {
    operating: "Operating",
    attention: "Attention",
    title: "Operating Center",
    description:
      "Manage goals, planning, execution and system state from one place.",
    sync: "Sync status",
    syncing: "Syncing…",

    dashboardSyncError: "Dashboard sync failed",
    plannerSyncError: "Planner Learning sync failed",

    mission: "Today's Mission",
    loadingMission: "Loading current task…",
    defaultMission: "Create the next AIOS Alpha objective",
    missionDescription:
      "Create a task and Planner will use it to establish the next execution path.",
    currentPriority:
      "Current highest-priority execution task.",

    progress: "Overall Progress",
    completed: "completed",
    continue: "Continue",
    createGoal: "Create goal",
    executionTrace: "View Execution Trace",

    learningEyebrow: "Planner Learning",
    learningTitle: "Execution Intelligence",
    learningDescription:
      "Learning signals from real task results help identify progress, stagnation and the next optimization direction.",
    learning: "Learning",
    healthy: "Healthy",
    blocked: "Blocked",
    attentionStatus: "Attention",

    completion: "Completion",
    velocity: "Velocity",
    stale: "Stale",
    confidence: "Confidence",
    tasksPerDay: "tasks / day",
    over24Hours: "over 24 hours",
    learningQuality: "learning quality",
    tasksLabel: "tasks",

    trend: "Learning Trend",
    historicalSamples: "historical samples",
    baseline: "Collecting Baseline",
    improving: "Improving",
    stable: "Stable",
    declining: "Declining",
    vsPrevious: "vs previous cycle",
    lowerBetter: "lower is better",

    recommendation: "Next Recommendation",
    defaultRecommendation:
      "Create and advance the first real task so Planner can begin learning from execution results.",
    analyzing: "Analyzing execution data…",
    waitingInsight: "Waiting for learning insights.",
    learningUpdated: "Learning updated:",

    runtimeEyebrow: "Adaptive Runtime",
    runtimeTitle: "Execution Control",
    runtimeDescription:
      "Convert Planner learning into the execution policy for the current cycle.",
    primaryAction: "Primary Action",
    defaultPrimaryAction:
      "Create a task with a clear completion criterion and establish the first execution baseline.",
    waitingRuntime:
      "Planner is waiting for real task data.",
    parallelLimit: "Parallel Limit",
    maximumActive: "maximum active tasks",
    newTasks: "New Tasks",
    allowed: "Allowed",
    paused: "Paused",
    controlledByRuntime: "controlled by Runtime",
    runtimeMode: "Runtime Mode",
    adaptiveExecution: "adaptive execution",
    executeStrategy: "Execute current strategy",
    viewEvidence: "View runtime evidence",

    planEyebrow: "AI Planner",
    planTitle: "Current Plan",
    planDescription:
      "Current goal and next action extracted from active tasks.",
    currentGoal: "Current Goal",
    nextStep: "Next Step",
    expectedResult: "Expected Result",
    executionState: "Execution State",
    waitingGoal: "Waiting for goal",
    completeCurrent:
      "Complete the current task and update its status",
    firstTask:
      "Enter Workspace and create the first task",
    verifiable:
      "Produce a verifiable completion result",
    firstPath: "Establish the first execution path",
    inProgress: "in progress",
    waitingExecution: "waiting for execution",
    plannerReady: "Planner Ready",
    managePlan: "Manage full plan",

    queueEyebrow: "Execution Queue",
    queueTitle: "Next Actions",
    queueDescription:
      "Tasks in progress are prioritized, followed by waiting tasks.",
    loadingQueue: "Loading task queue…",
    noTasks: "No tasks yet.",
    viewAllTasks: "View all tasks",
    doing: "Doing",
    todo: "Todo",
    done: "Done",

    quickEyebrow: "Quick Actions",
    quickTitle: "Start Work",
    quickDescription:
      "Enter AIOS Alpha's core working modules.",
    chat: "Chat",
    chatDescription: "Enter a goal, question or action.",
    newTask: "New Task",
    newTaskDescription:
      "Turn a goal into an executable task.",
    projects: "Projects",
    projectsDescription:
      "Manage active project workspaces.",
    memory: "Memory",
    memoryDescription:
      "Manage long-term context and information.",
    runtime: "Runtime",
    runtimeDescription:
      "Inspect execution state and evidence.",
    settings: "Settings",
    settingsDescription:
      "Manage provider and system settings.",

    healthEyebrow: "AI Health",
    healthTitle: "System Intelligence",
    healthDescription:
      "Current Brain, Memory, Runtime, Storage and Planner state.",
    brain: "Brain",
    memoryHealth: "Memory",
    storage: "Storage",
    provider: "Provider",
    planner: "Planner",
    ready: "Ready",
    awaitingRequest: "Awaiting request",
    records: "records",
    persistent: "persistent",
    temporary: "temporary",
    activeTasks: "active tasks",
    readyForGoal: "Ready for goal",
    fallbackFrom: "Fallback from",

    contextEyebrow: "Memory Snapshot",
    contextTitle: "Current Context",
    contextDescription:
      "Current profile and conversation memory overview.",
    totalMemory: "Total Memory",
    userMessages: "User Messages",
    aiMessages: "AI Messages",
    inputs: "inputs",
    responses: "responses",
    profileReadiness: "Profile Readiness",
    openMemory: "Open Memory",

    statusEyebrow: "Runtime",
    statusTitle: "Operating Status",
    statusDescription:
      "Current runtime environment and synchronization state.",
    online: "Online",
    offline: "Offline",
    checkRequired: "Check Required",
    persistentStorageDisabled:
      "Persistent Storage Disabled",
    persistentStorageWarning:
      "The current storage mode is not Redis. Some data may be lost after a service restart.",
    providerFallback: "Provider Fallback Active",
    lastSync: "Last sync:",
    providerLastRequest: "Provider:",
    privateWorkspace: "Private workspace",
    isolationEnabled: "Enabled",
    isolationUnknown: "Unknown",
    noRecord: "Not recorded",
    runtimeReady: "Ready",
  },

  "zh-CN": {
    operating: "运行正常",
    attention: "需要关注",
    title: "运行中心",
    description:
      "统一管理目标、规划、执行以及 AIOS 当前系统状态。",
    sync: "同步状态",
    syncing: "同步中…",

    dashboardSyncError: "Dashboard 同步失败",
    plannerSyncError: "Planner Learning 同步失败",

    mission: "今日使命",
    loadingMission: "正在读取当前任务……",
    defaultMission: "创建 AIOS Alpha 的下一项目标",
    missionDescription:
      "创建任务后，Planner 将根据真实执行情况建立下一条执行路径。",
    currentPriority: "当前最高优先级执行任务。",

    progress: "总体进度",
    completed: "已完成",
    continue: "继续执行",
    createGoal: "创建目标",
    executionTrace: "查看 Execution Trace",

    learningEyebrow: "Planner Learning",
    learningTitle: "执行智能",
    learningDescription:
      "根据真实任务结果识别进展、停滞以及下一轮优化方向。",
    learning: "学习中",
    healthy: "健康",
    blocked: "受阻",
    attentionStatus: "需要关注",

    completion: "完成率",
    velocity: "执行速度",
    stale: "停滞任务",
    confidence: "置信度",
    tasksPerDay: "任务 / 天",
    over24Hours: "超过 24 小时",
    learningQuality: "学习质量",
    tasksLabel: "任务",

    trend: "学习趋势",
    historicalSamples: "历史样本",
    baseline: "正在建立基线",
    improving: "改善中",
    stable: "稳定",
    declining: "下降",

    vsPrevious: "相较上一周期",
    lowerBetter: "越低越好",

    recommendation: "下一项建议",
    defaultRecommendation:
      "创建并推进第一项真实任务，让 Planner 从实际执行结果开始学习。",
    analyzing: "正在分析执行数据……",
    waitingInsight: "等待形成学习洞察。",
    learningUpdated: "Learning 更新：",

    runtimeEyebrow: "Adaptive Runtime",
    runtimeTitle: "执行控制",
    runtimeDescription:
      "将 Planner 的学习结果转换为当前周期的执行策略。",
    primaryAction: "主要行动",
    defaultPrimaryAction:
      "创建一项具有明确完成标准的任务，建立首个执行基线。",
    waitingRuntime:
      "Planner 正在等待真实任务数据。",
    parallelLimit: "并行上限",
    maximumActive: "最大同时执行任务数",
    newTasks: "新增任务",
    allowed: "允许",
    paused: "已暂停",
    controlledByRuntime: "由 Runtime 控制",
    runtimeMode: "运行模式",
    adaptiveExecution: "自适应执行",
    executeStrategy: "执行当前策略",
    viewEvidence: "查看运行证据",

    planEyebrow: "AI Planner",
    planTitle: "当前计划",
    planDescription:
      "根据当前任务自动提取目标与下一步行动。",
    currentGoal: "当前目标",
    nextStep: "下一步",
    expectedResult: "预期结果",
    executionState: "执行状态",
    waitingGoal: "等待创建目标",
    completeCurrent:
      "完成当前任务并更新状态",
    firstTask:
      "进入 Workspace 创建第一项任务",
    verifiable:
      "形成可验证的完成结果",
    firstPath: "建立第一条执行路径",
    inProgress: "项正在执行",
    waitingExecution: "项等待执行",
    plannerReady: "Planner 已就绪",
    managePlan: "管理完整计划",

    queueEyebrow: "Execution Queue",
    queueTitle: "下一步行动",
    queueDescription:
      "优先显示正在执行的任务，其次显示等待执行的任务。",
    loadingQueue: "正在读取任务队列……",
    noTasks: "当前没有任务。",
    viewAllTasks: "查看全部任务",
    doing: "执行中",
    todo: "待执行",
    done: "已完成",

    quickEyebrow: "快捷操作",
    quickTitle: "开始工作",
    quickDescription:
      "直接进入 AIOS Alpha 核心工作模块。",
    chat: "对话",
    chatDescription: "输入目标、问题或要执行的操作。",
    newTask: "新建任务",
    newTaskDescription:
      "把目标转换成可执行任务。",
    projects: "项目",
    projectsDescription:
      "管理正在推进的项目工作空间。",
    memory: "记忆",
    memoryDescription:
      "管理长期上下文和资料。",
    runtime: "Runtime",
    runtimeDescription:
      "查看执行状态与运行证据。",
    settings: "设置",
    settingsDescription:
      "管理模型服务和系统设置。",

    healthEyebrow: "AI 健康状态",
    healthTitle: "系统智能",
    healthDescription:
      "查看 Brain、Memory、Runtime、Storage 和 Planner 当前状态。",
    brain: "Brain",
    memoryHealth: "Memory",
    storage: "Storage",
    provider: "Provider",
    planner: "Planner",
    ready: "就绪",
    awaitingRequest: "等待请求",
    records: "条记录",
    persistent: "持久化",
    temporary: "临时",
    activeTasks: "项活跃任务",
    readyForGoal: "等待目标",
    fallbackFrom: "备用来源",

    contextEyebrow: "Memory Snapshot",
    contextTitle: "当前上下文",
    contextDescription:
      "当前用户资料与对话记忆概览。",
    totalMemory: "全部记忆",
    userMessages: "用户消息",
    aiMessages: "AI 消息",
    inputs: "输入",
    responses: "回复",
    profileReadiness: "Profile 完整度",
    openMemory: "打开 Memory",

    statusEyebrow: "Runtime",
    statusTitle: "运行状态",
    statusDescription:
      "查看 AIOS 当前运行环境与同步状态。",
    online: "在线",
    offline: "离线",
    checkRequired: "需要检查",
    persistentStorageDisabled:
      "持久化存储未启用",
    persistentStorageWarning:
      "当前存储模式不是 Redis，服务重启后部分数据可能丢失。",
    providerFallback: "Provider 正在使用备用服务",
    lastSync: "最后同步：",
    providerLastRequest: "Provider：",
    privateWorkspace: "私有工作区",
    isolationEnabled: "已启用",
    isolationUnknown: "未知",
    noRecord: "尚未记录",
    runtimeReady: "就绪",
  },

  ja: {
    operating: "稼働中",
    attention: "要確認",
    title: "運用センター",
    description:
      "目標、計画、実行、AIOS の現在状態を一か所で管理します。",
    sync: "状態を同期",
    syncing: "同期中…",

    dashboardSyncError: "Dashboard の同期に失敗しました",
    plannerSyncError:
      "Planner Learning の同期に失敗しました",

    mission: "今日のミッション",
    loadingMission: "現在のタスクを読み込み中…",
    defaultMission:
      "AIOS Alpha の次の目標を作成",
    missionDescription:
      "タスクを作成すると、Planner が実際の実行結果から次の実行経路を作成します。",
    currentPriority:
      "現在最も優先度の高い実行タスクです。",

    progress: "全体の進捗",
    completed: "完了",
    continue: "続行",
    createGoal: "目標を作成",
    executionTrace: "Execution Trace を表示",

    learningEyebrow: "Planner Learning",
    learningTitle: "実行インテリジェンス",
    learningDescription:
      "実際のタスク結果から進捗、停滞、次の改善方向を判断します。",
    learning: "学習中",
    healthy: "正常",
    blocked: "停止中",
    attentionStatus: "要確認",

    completion: "完了率",
    velocity: "実行速度",
    stale: "停滞タスク",
    confidence: "信頼度",
    tasksPerDay: "タスク / 日",
    over24Hours: "24時間以上",
    learningQuality: "学習品質",
    tasksLabel: "タスク",

    trend: "学習トレンド",
    historicalSamples: "過去サンプル",
    baseline: "ベースライン収集中",
    improving: "改善中",
    stable: "安定",
    declining: "低下",

    vsPrevious: "前サイクル比",
    lowerBetter: "低いほど良い",

    recommendation: "次の推奨事項",
    defaultRecommendation:
      "最初の実タスクを作成して進め、Planner が実行結果から学習できる状態を作ります。",
    analyzing: "実行データを分析中…",
    waitingInsight: "学習インサイトを待っています。",
    learningUpdated: "Learning 更新：",

    runtimeEyebrow: "Adaptive Runtime",
    runtimeTitle: "実行コントロール",
    runtimeDescription:
      "Planner の学習結果を現在の実行ポリシーへ反映します。",
    primaryAction: "主要アクション",
    defaultPrimaryAction:
      "明確な完了条件を持つタスクを作成し、最初の実行ベースラインを確立します。",
    waitingRuntime:
      "Planner は実際のタスクデータを待っています。",
    parallelLimit: "並列上限",
    maximumActive: "最大アクティブタスク数",
    newTasks: "新規タスク",
    allowed: "許可",
    paused: "一時停止",
    controlledByRuntime: "Runtime により制御",
    runtimeMode: "実行モード",
    adaptiveExecution: "適応型実行",
    executeStrategy: "現在の戦略を実行",
    viewEvidence: "実行証拠を表示",

    planEyebrow: "AI Planner",
    planTitle: "現在の計画",
    planDescription:
      "現在のタスクから目標と次のアクションを自動抽出します。",
    currentGoal: "現在の目標",
    nextStep: "次のステップ",
    expectedResult: "期待する結果",
    executionState: "実行状態",
    waitingGoal: "目標を待っています",
    completeCurrent:
      "現在のタスクを完了して状態を更新",
    firstTask:
      "Workspace から最初のタスクを作成",
    verifiable:
      "検証可能な完了結果を作成",
    firstPath: "最初の実行経路を確立",
    inProgress: "件が実行中",
    waitingExecution: "件が実行待ち",
    plannerReady: "Planner 準備完了",
    managePlan: "計画を管理",

    queueEyebrow: "Execution Queue",
    queueTitle: "次のアクション",
    queueDescription:
      "実行中のタスクを優先し、その後に待機中のタスクを表示します。",
    loadingQueue: "タスクキューを読み込み中…",
    noTasks: "タスクはまだありません。",
    viewAllTasks: "すべてのタスクを表示",
    doing: "実行中",
    todo: "待機中",
    done: "完了",

    quickEyebrow: "クイックアクション",
    quickTitle: "作業を開始",
    quickDescription:
      "AIOS Alpha の主要ワークモジュールへ移動します。",
    chat: "チャット",
    chatDescription:
      "目標、質問、実行したい操作を入力します。",
    newTask: "新規タスク",
    newTaskDescription:
      "目標を実行可能なタスクへ変換します。",
    projects: "プロジェクト",
    projectsDescription:
      "進行中のプロジェクトワークスペースを管理します。",
    memory: "メモリー",
    memoryDescription:
      "長期コンテキストと情報を管理します。",
    runtime: "Runtime",
    runtimeDescription:
      "実行状態と証拠を確認します。",
    settings: "設定",
    settingsDescription:
      "Provider とシステム設定を管理します。",

    healthEyebrow: "AI ヘルス",
    healthTitle: "システムインテリジェンス",
    healthDescription:
      "Brain、Memory、Runtime、Storage、Planner の現在状態。",
    brain: "Brain",
    memoryHealth: "Memory",
    storage: "Storage",
    provider: "Provider",
    planner: "Planner",
    ready: "準備完了",
    awaitingRequest: "リクエスト待ち",
    records: "件",
    persistent: "永続",
    temporary: "一時",
    activeTasks: "件のアクティブタスク",
    readyForGoal: "目標待ち",
    fallbackFrom: "Fallback 元",

    contextEyebrow: "Memory Snapshot",
    contextTitle: "現在のコンテキスト",
    contextDescription:
      "現在のプロフィールと会話メモリーの概要。",
    totalMemory: "総メモリー",
    userMessages: "ユーザーメッセージ",
    aiMessages: "AI メッセージ",
    inputs: "入力",
    responses: "応答",
    profileReadiness: "プロフィール完成度",
    openMemory: "Memory を開く",

    statusEyebrow: "Runtime",
    statusTitle: "稼働状態",
    statusDescription:
      "AIOS の現在の実行環境と同期状態。",
    online: "オンライン",
    offline: "オフライン",
    checkRequired: "確認が必要",
    persistentStorageDisabled:
      "永続ストレージが無効です",
    persistentStorageWarning:
      "現在のストレージモードは Redis ではありません。サービス再起動後に一部データが失われる可能性があります。",
    providerFallback:
      "Provider フォールバックが有効です",
    lastSync: "最終同期：",
    providerLastRequest: "Provider：",
    privateWorkspace: "プライベートワークスペース",
    isolationEnabled: "有効",
    isolationUnknown: "不明",
    noRecord: "未記録",
    runtimeReady: "準備完了",
  },
} as const;

function providerLabel(
  provider: string
): string {
  const labels: Record<string, string> = {
    deepseek: "DeepSeek",
    qwen: "Qwen",
    openai: "OpenAI",
    mock: "Mock",
    gemini: "Gemini",
    claude: "Claude",
    unknown: "Unknown",
  };

  return (
    labels[provider.toLowerCase()] ??
    provider
  );
}

function storageLabel(
  storage: string
): string {
  const labels: Record<string, string> = {
    redis: "Redis",
    memory: "Memory",
    local: "Local",
    unknown: "Unknown",
  };

  return (
    labels[storage.toLowerCase()] ??
    storage
  );
}

function formatTime(
  timestamp: number | null,
  locale: "en" | "zh-CN" | "ja",
  fallback: string
): string {
  if (!timestamp) {
    return fallback;
  }

  return new Intl.DateTimeFormat(
    locale === "zh-CN"
      ? "zh-CN"
      : locale === "ja"
        ? "ja-JP"
        : "en-US",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(new Date(timestamp));
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
        (completed / total) * 100
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
      const difference =
        order[first.status] -
        order[second.status];

      if (difference !== 0) {
        return difference;
      }

      return (
        second.updatedAt -
        first.updatedAt
      );
    }
  );
}

export default function DashboardPage() {
  const { locale } = useLanguage();
  const copy = COPY[locale];

  const {
    learning,
    learningHistory,
    adaptiveStrategy,
    loading: plannerLoading,
    refreshing: plannerRefreshing,
    error: plannerError,
    generatedAt: plannerGeneratedAt,
    refresh: refreshPlanner,
  } = usePlanner();

  const [dashboard, setDashboard] =
    useState<DashboardData>({
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
    });

  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadData = useCallback(
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
              dashboardResult.provider.error ??
              copy.dashboardSyncError
          );
        }

        if (
          !tasksResponse.ok ||
          !tasksResult.success
        ) {
          throw new Error(
            tasksResult.error ??
              copy.dashboardSyncError
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
            : copy.dashboardSyncError
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [copy.dashboardSyncError]
  );

  useEffect(() => {
    void loadData();

    const timer =
      window.setInterval(() => {
        void loadData(true);
      }, 15000);

    const handleFocus = () => {
      void loadData(true);
    };

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.clearInterval(timer);
      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [loadData]);

  const orderedTasks = useMemo(
    () => sortTasks(tasks),
    [tasks]
  );

  const activeTasks = useMemo(
    () =>
      orderedTasks.filter(
        (task) =>
          task.status !== "done"
      ),
    [orderedTasks]
  );

  const completedTasks = useMemo(
    () =>
      orderedTasks.filter(
        (task) =>
          task.status === "done"
      ),
    [orderedTasks]
  );

  const doingTasks = useMemo(
    () =>
      orderedTasks.filter(
        (task) =>
          task.status === "doing"
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
        task.id !== missionTask?.id
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
    providerLabel(
      dashboard.provider.active
    );

  const learningMetrics =
    learning?.metrics ?? null;

  const plannerBusy =
    plannerLoading ||
    plannerRefreshing;

  const learningHealth =
    learning?.health ??
    "insufficient-data";

  const learningHealthLabel =
    learningHealth === "healthy"
      ? copy.healthy
      : learningHealth === "blocked"
        ? copy.blocked
        : learningHealth ===
            "attention"
          ? copy.attentionStatus
          : copy.learning;

  const learningTrend =
    learningHistory?.trend ??
    "insufficient-data";

  const learningTrendLabel =
    learningTrend === "improving"
      ? copy.improving
      : learningTrend === "stable"
        ? copy.stable
        : learningTrend ===
            "declining"
          ? copy.declining
          : copy.baseline;

  const strategyMode =
    adaptiveStrategy?.mode ??
    "baseline";

  const strategyModeLabel =
    strategyMode === "accelerate"
      ? "Accelerate"
      : strategyMode === "focus"
        ? "Focus"
        : strategyMode === "recover"
          ? "Recover"
          : "Baseline";

  const strategyHealthy =
    strategyMode === "baseline" ||
    strategyMode === "accelerate";

  const systemHealthy =
    dashboard.runtime.status ===
      "online" &&
    dashboard.storage.healthy &&
    !dashboard.provider
      .fallbackUsed;

  const healthItems =
    useMemo<HealthItem[]>(
      () => [
        {
          label: copy.brain,
          detail:
            dashboard.provider
              .success
              ? `${providerName} · ${copy.ready}`
              : copy.awaitingRequest,
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
          label: copy.memoryHealth,
          detail: `${dashboard.memory.count} ${copy.records}`,
          status:
            dashboard.memory.count > 0
              ? "healthy"
              : "warning",
          href: "/memory",
        },
        {
          label: copy.storage,
          detail: `${storageLabel(
            dashboard.storage.mode
          )} ${
            dashboard.storage
              .persistent
              ? copy.persistent
              : copy.temporary
          }`,
          status:
            dashboard.storage.healthy
              ? dashboard.storage
                  .persistent
                ? "healthy"
                : "warning"
              : "offline",
          href: "/settings",
        },
        {
          label: copy.runtime,
          detail: `v${APP_VERSION}`,
          status:
            dashboard.runtime.status ===
            "online"
              ? "healthy"
              : "offline",
          href: "/runtime/trace",
        },
        {
          label: copy.provider,
          detail:
            dashboard.provider
              .fallbackUsed
              ? `${copy.fallbackFrom} ${providerLabel(
                  dashboard.provider
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
          label: copy.planner,
          detail:
            activeTasks.length > 0
              ? `${activeTasks.length} ${copy.activeTasks}`
              : copy.readyForGoal,
          status:
            activeTasks.length > 0
              ? "healthy"
              : "warning",
          href: "/tasks",
        },
      ],
      [
        activeTasks.length,
        copy,
        dashboard,
        providerName,
      ]
    );

  const handleRefresh =
    useCallback(async () => {
      await Promise.all([
        loadData(true),
        refreshPlanner(
          "dashboard-manual"
        ),
      ]);
    }, [
      loadData,
      refreshPlanner,
    ]);

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
                  letterSpacing:
                    "0.08em",
                  textTransform:
                    "uppercase",
                }}
              >
                AIOS Alpha · v
                {APP_VERSION}
              </p>

              <StatusBadge
                healthy={systemHealthy}
                text={
                  systemHealthy
                    ? copy.operating
                    : copy.attention
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
              {copy.title}
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
              {copy.description}
            </p>
          </div>

          <button
            type="button"
            disabled={
              loading ||
              refreshing ||
              plannerBusy
            }
            onClick={() => {
              void handleRefresh();
            }}
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
                refreshing ||
                plannerBusy
                  ? "not-allowed"
                  : "pointer",
              opacity:
                loading ||
                refreshing ||
                plannerBusy
                  ? 0.6
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

        {error && (
          <Alert
            title={
              copy.dashboardSyncError
            }
            message={error}
            tone="danger"
          />
        )}

        {plannerError && (
          <Alert
            title={
              copy.plannerSyncError
            }
            message={plannerError}
            tone="warning"
          />
        )}

        <section
          style={{
            marginBottom: 18,
          }}
        >
          <Panel emphasis>
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
                  {copy.mission}
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
                    ? copy.loadingMission
                    : missionTask
                      ? missionTask.title
                      : copy.defaultMission}
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
                      ? copy.currentPriority
                      : copy.missionDescription)}
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
                  {copy.progress}
                </p>

                <strong
                  style={{
                    display: "block",
                    marginTop: 7,
                    fontSize: 30,
                  }}
                >
                  {taskProgress}%
                </strong>

                <ProgressBar
                  value={taskProgress}
                />

                <p
                  style={{
                    margin:
                      "9px 0 0",
                    color: "#94a3b8",
                    fontSize: 12,
                  }}
                >
                  {completedTasks.length}/
                  {tasks.length}{" "}
                  {copy.completed}
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
                  ? copy.continue
                  : copy.createGoal}
              </PrimaryLink>

              <SecondaryLink
                href="/runtime/trace"
              >
                {copy.executionTrace}
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
              eyebrow={
                copy.learningEyebrow
              }
              title={
                copy.learningTitle
              }
              description={
                copy.learningDescription
              }
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 10,
                marginTop: 18,
              }}
            >
              <LearningMetric
                label={copy.completion}
                value={`${learningMetrics?.completionRate ?? 0}%`}
                detail={`${learningMetrics?.completed ?? 0}/${learningMetrics?.total ?? 0} ${copy.tasksLabel}`}
              />

              <LearningMetric
                label={copy.velocity}
                value={`${learningMetrics?.executionVelocity ?? 0}`}
                detail={copy.tasksPerDay}
              />

              <LearningMetric
                label={copy.stale}
                value={`${learningMetrics?.stale ?? 0}`}
                detail={copy.over24Hours}
                warning={
                  (learningMetrics?.stale ??
                    0) > 0
                }
              />

              <LearningMetric
                label={copy.confidence}
                value={`${learning?.confidence ?? 0}%`}
                detail={
                  copy.learningQuality
                }
              />
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 15,
                border:
                  "1px solid #e2e8f0",
                borderRadius: 15,
                background:
                  "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems:
                    "center",
                  justifyContent:
                    "space-between",
                  gap: 10,
                }}
              >
                <div>
                  <Eyebrow>
                    {copy.trend}
                  </Eyebrow>

                  <p
                    style={{
                      margin:
                        "6px 0 0",
                      color:
                        "#64748b",
                      fontSize: 12,
                    }}
                  >
                    {learningHistory
                      ? `${learningHistory.sampleCount} ${copy.historicalSamples}`
                      : copy.baseline}
                  </p>
                </div>

                <StatusBadge
                  healthy={
                    learningTrend ===
                      "improving" ||
                    learningTrend ===
                      "stable"
                  }
                  text={
                    learningTrendLabel
                  }
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(145px, 1fr))",
                  gap: 10,
                  marginTop: 13,
                }}
              >
                <LearningMetric
                  label="Completion Δ"
                  value={`${(learningHistory?.completionRateChange ?? 0) > 0 ? "+" : ""}${learningHistory?.completionRateChange ?? 0}%`}
                  detail={
                    copy.vsPrevious
                  }
                  warning={
                    (learningHistory?.completionRateChange ??
                      0) < 0
                  }
                />

                <LearningMetric
                  label="Velocity Δ"
                  value={`${(learningHistory?.velocityChange ?? 0) > 0 ? "+" : ""}${learningHistory?.velocityChange ?? 0}`}
                  detail={
                    copy.tasksPerDay
                  }
                  warning={
                    (learningHistory?.velocityChange ??
                      0) < 0
                  }
                />

                <LearningMetric
                  label="Stale Δ"
                  value={`${(learningHistory?.staleChange ?? 0) > 0 ? "+" : ""}${learningHistory?.staleChange ?? 0}`}
                  detail={
                    copy.lowerBetter
                  }
                  warning={
                    (learningHistory?.staleChange ??
                      0) > 0
                  }
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 12,
                marginTop: 14,
              }}
            >
              <div
                style={{
                  padding: 15,
                  border:
                    "1px solid #c7d2fe",
                  borderRadius: 15,
                  background:
                    "#f8faff",
                }}
              >
                <Eyebrow>
                  {copy.recommendation}
                </Eyebrow>

                <strong
                  style={{
                    display:
                      "block",
                    marginTop: 8,
                    fontSize: 14,
                    lineHeight: 1.55,
                  }}
                >
                  {learning?.recommendation ??
                    copy.defaultRecommendation}
                </strong>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 9,
                }}
              >
                {plannerBusy ? (
                  <EmptyState>
                    {copy.analyzing}
                  </EmptyState>
                ) : learning
                    ?.insights?.length ? (
                  learning.insights
                    .slice(0, 2)
                    .map(
                      (insight) => (
                        <LearningInsight
                          key={
                            insight.id
                          }
                          title={
                            insight.title
                          }
                          action={
                            insight.action
                          }
                          warning={
                            insight.severity ===
                              "warning" ||
                            insight.severity ===
                              "critical"
                          }
                        />
                      )
                    )
                ) : (
                  <EmptyState>
                    {copy.waitingInsight}
                  </EmptyState>
                )}
              </div>
            </div>

            <footer
              style={{
                marginTop: 14,
                color: "#94a3b8",
                fontSize: 11,
              }}
            >
              {copy.learningUpdated}{" "}
              {formatTime(
                plannerGeneratedAt,
                locale,
                copy.noRecord
              )}
            </footer>
          </Panel>
        </section>

        <section
          style={{
            marginBottom: 18,
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
                gap: 14,
              }}
            >
              <SectionHeader
                eyebrow={
                  copy.runtimeEyebrow
                }
                title={
                  copy.runtimeTitle
                }
                description={
                  copy.runtimeDescription
                }
              />

              <StatusBadge
                healthy={
                  strategyHealthy
                }
                text={
                  strategyModeLabel
                }
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 10,
                marginTop: 18,
              }}
            >
              <LearningMetric
                label={
                  copy.parallelLimit
                }
                value={`${adaptiveStrategy?.maxConcurrentTasks ?? 1}`}
                detail={
                  copy.maximumActive
                }
              />

              <LearningMetric
                label={
                  copy.newTasks
                }
                value={
                  adaptiveStrategy
                    ?.allowNewTasks
                    ? copy.allowed
                    : copy.paused
                }
                detail={
                  copy.controlledByRuntime
                }
                warning={
                  adaptiveStrategy
                    ? !adaptiveStrategy.allowNewTasks
                    : false
                }
              />

              <LearningMetric
                label={
                  copy.runtimeMode
                }
                value={
                  strategyModeLabel
                }
                detail={
                  copy.adaptiveExecution
                }
                warning={
                  strategyMode ===
                  "recover"
                }
              />
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 16,
                border:
                  strategyMode ===
                  "recover"
                    ? "1px solid #fecaca"
                    : "1px solid #c7d2fe",
                borderRadius: 15,
                background:
                  strategyMode ===
                  "recover"
                    ? "#fff7f7"
                    : "#f8faff",
              }}
            >
              <Eyebrow>
                {copy.primaryAction}
              </Eyebrow>

              <strong
                style={{
                  display:
                    "block",
                  marginTop: 8,
                  fontSize: 15,
                  lineHeight: 1.6,
                }}
              >
                {adaptiveStrategy
                  ?.primaryAction ??
                  copy.defaultPrimaryAction}
              </strong>

              <p
                style={{
                  margin:
                    "8px 0 0",
                  color: "#64748b",
                  fontSize: 12,
                  lineHeight: 1.55,
                }}
              >
                {adaptiveStrategy
                  ?.reason ??
                  copy.waitingRuntime}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 15,
              }}
            >
              <PrimaryLink href="/tasks">
                {copy.executeStrategy}
              </PrimaryLink>

              <SecondaryLink
                href="/runtime/trace"
              >
                {copy.viewEvidence}
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
              eyebrow={copy.planEyebrow}
              title={copy.planTitle}
              description={
                copy.planDescription
              }
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
                label={
                  copy.currentGoal
                }
                value={
                  missionTask?.title ??
                  copy.waitingGoal
                }
              />

              <PlannerRow
                number="02"
                label={copy.nextStep}
                value={
                  nextTask?.title ??
                  (missionTask
                    ? copy.completeCurrent
                    : copy.firstTask)
                }
              />

              <PlannerRow
                number="03"
                label={
                  copy.expectedResult
                }
                value={
                  missionTask
                    ? copy.verifiable
                    : copy.firstPath
                }
              />

              <PlannerRow
                number="04"
                label={
                  copy.executionState
                }
                value={
                  doingTasks.length >
                  0
                    ? `${doingTasks.length} ${copy.inProgress}`
                    : activeTasks.length >
                        0
                      ? `${activeTasks.length} ${copy.waitingExecution}`
                      : copy.plannerReady
                }
              />
            </div>

            <div
              style={{
                marginTop: 16,
              }}
            >
              <SecondaryLink href="/tasks">
                {copy.managePlan}
              </SecondaryLink>
            </div>
          </Panel>

          <Panel>
            <SectionHeader
              eyebrow={
                copy.queueEyebrow
              }
              title={copy.queueTitle}
              description={
                copy.queueDescription
              }
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
                  {copy.loadingQueue}
                </EmptyState>
              ) : orderedTasks.length ===
                0 ? (
                <EmptyState>
                  {copy.noTasks}
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
                        index={index}
                        locale={
                          locale
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
                {copy.viewAllTasks}
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
              eyebrow={
                copy.quickEyebrow
              }
              title={
                copy.quickTitle
              }
              description={
                copy.quickDescription
              }
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
              {[
                {
                  icon: "💬",
                  title: copy.chat,
                  description:
                    copy.chatDescription,
                  href: "/workspace",
                },
                {
                  icon: "➕",
                  title: copy.newTask,
                  description:
                    copy.newTaskDescription,
                  href: "/tasks",
                },
                {
                  icon: "📁",
                  title: copy.projects,
                  description:
                    copy.projectsDescription,
                  href: "/projects",
                },
                {
                  icon:
                    MODULE_ICONS.memory,
                  title: copy.memory,
                  description:
                    copy.memoryDescription,
                  href: "/memory",
                },
                {
                  icon: "⚡",
                  title: copy.runtime,
                  description:
                    copy.runtimeDescription,
                  href: "/runtime/trace",
                },
                {
                  icon: "⚙️",
                  title: copy.settings,
                  description:
                    copy.settingsDescription,
                  href: "/settings",
                },
              ].map((action) => (
                <QuickActionCard
                  key={action.href}
                  action={action}
                />
              ))}
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
              eyebrow={
                copy.healthEyebrow
              }
              title={
                copy.healthTitle
              }
              description={
                copy.healthDescription
              }
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
                    key={item.label}
                    item={item}
                  />
                )
              )}
            </div>
          </Panel>

          <Panel>
            <SectionHeader
              eyebrow={
                copy.contextEyebrow
              }
              title={
                copy.contextTitle
              }
              description={
                copy.contextDescription
              }
            />

            <div
              style={{
                display: "grid",
                gap: 13,
                marginTop: 19,
              }}
            >
              <MetricRow
                label={
                  copy.totalMemory
                }
                value={
                  dashboard.memory
                    .count
                }
                detail={
                  copy.records
                }
              />

              <MetricRow
                label={
                  copy.userMessages
                }
                value={
                  dashboard.memory
                    .userMessages
                }
                detail={copy.inputs}
              />

              <MetricRow
                label={
                  copy.aiMessages
                }
                value={
                  dashboard.memory
                    .assistantMessages
                }
                detail={
                  copy.responses
                }
              />

              <div>
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
                    {
                      copy.profileReadiness
                    }
                  </span>

                  <span>
                    {profileProgress}%
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
                {copy.openMemory}
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
                eyebrow={
                  copy.statusEyebrow
                }
                title={
                  copy.statusTitle
                }
                description={
                  copy.statusDescription
                }
              />

              <StatusBadge
                healthy={
                  systemHealthy
                }
                text={
                  systemHealthy
                    ? copy.healthy
                    : copy.checkRequired
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
                label={
                  copy.runtime
                }
                value={
                  dashboard.runtime
                    .status ===
                  "online"
                    ? copy.online
                    : copy.offline
                }
                detail={`v${APP_VERSION}`}
                healthy={
                  dashboard.runtime
                    .status ===
                  "online"
                }
              />

              <RuntimeItem
                label={
                  copy.provider
                }
                value={
                  providerName
                }
                detail={
                  dashboard.provider
                    .latencyMs !==
                  null
                    ? `${dashboard.provider.latencyMs}ms`
                    : copy.runtimeReady
                }
                healthy={
                  !dashboard.provider
                    .fallbackUsed
                }
              />

              <RuntimeItem
                label={
                  copy.storage
                }
                value={storageLabel(
                  dashboard.storage
                    .mode
                )}
                detail={
                  dashboard.storage
                    .persistent
                    ? copy.persistent
                    : copy.temporary
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
                    ? copy.isolationEnabled
                    : copy.isolationUnknown
                }
                detail={
                  copy.privateWorkspace
                }
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
                title={
                  copy.providerFallback
                }
                message={
                  dashboard.provider
                    .error ??
                  copy.providerFallback
                }
                tone="warning"
              />
            )}

            {!dashboard.storage
              .persistent && (
              <Alert
                title={
                  copy.persistentStorageDisabled
                }
                message={
                  copy.persistentStorageWarning
                }
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
                {copy.lastSync}{" "}
                {formatTime(
                  dashboard.timestamp,
                  locale,
                  copy.noRecord
                )}
              </span>

              <span>
                {copy.providerLastRequest}{" "}
                {formatTime(
                  dashboard.provider
                    .lastRequestAt,
                  locale,
                  copy.noRecord
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
        gap: 7,
        padding:
          "5px 9px",
        border:
          `1px solid ${
            healthy
              ? "#bbf7d0"
              : "#fde68a"
          }`,
        borderRadius:
          999,
        background:
          healthy
            ? "#f0fdf4"
            : "#fffbeb",
        color:
          healthy
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
          background:
            healthy
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
  tone: "danger" | "warning";
}) {
  const danger =
    tone === "danger";

  return (
    <div
      style={{
        marginTop: 14,
        padding: 14,
        border:
          `1px solid ${
            danger
              ? "#fecaca"
              : "#fde68a"
          }`,
        borderRadius: 14,
        background:
          danger
            ? "#fff7f7"
            : "#fffbeb",
        color:
          danger
            ? "#b91c1c"
            : "#92400e",
      }}
    >
      <strong
        style={{
          display: "block",
          fontSize: 13,
        }}
      >
        {title}
      </strong>

      <p
        style={{
          margin:
            "5px 0 0",
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        {message}
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

function LearningMetric({
  label,
  value,
  detail,
  warning = false,
}: {
  label: string;
  value: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <div
      style={{
        padding: 14,
        border:
          `1px solid ${
            warning
              ? "#fde68a"
              : "#e2e8f0"
          }`,
        borderRadius: 14,
        background:
          warning
            ? "#fffbeb"
            : "#f8fafc",
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
          display:
            "block",
          marginTop: 6,
          color:
            warning
              ? "#92400e"
              : "#0f172a",
          fontSize: 24,
        }}
      >
        {value}
      </strong>

      <span
        style={{
          display:
            "block",
          marginTop: 3,
          color: "#94a3b8",
          fontSize: 10,
        }}
      >
        {detail}
      </span>
    </div>
  );
}

function LearningInsight({
  title,
  action,
  warning,
}: {
  title: string;
  action: string;
  warning: boolean;
}) {
  return (
    <div
      style={{
        padding: 12,
        border:
          `1px solid ${
            warning
              ? "#fde68a"
              : "#dbeafe"
          }`,
        borderRadius: 13,
        background:
          warning
            ? "#fffbeb"
            : "#eff6ff",
      }}
    >
      <strong
        style={{
          display:
            "block",
          color:
            warning
              ? "#92400e"
              : "#1e40af",
          fontSize: 12,
          lineHeight: 1.45,
        }}
      >
        {title}
      </strong>

      <p
        style={{
          margin:
            "5px 0 0",
          color:
            warning
              ? "#78350f"
              : "#1e3a8a",
          fontSize: 11,
          lineHeight: 1.5,
        }}
      >
        {action}
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
            display:
              "block",
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
  locale,
}: {
  task: Task;
  index: number;
  locale: "en" | "zh-CN" | "ja";
}) {
  const labels = {
    en: {
      doing: "Doing",
      todo: "Todo",
      done: "Done",
    },
    "zh-CN": {
      doing: "执行中",
      todo: "待执行",
      done: "已完成",
    },
    ja: {
      doing: "実行中",
      todo: "待機中",
      done: "完了",
    },
  }[locale];

  const statusConfig = {
    doing: {
      label: labels.doing,
      background: "#eff6ff",
      color: "#1d4ed8",
      border: "#bfdbfe",
    },
    todo: {
      label: labels.todo,
      background: "#fffbeb",
      color: "#92400e",
      border: "#fde68a",
    },
    done: {
      label: labels.done,
      background: "#f0fdf4",
      color: "#15803d",
      border: "#bbf7d0",
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
              display:
                "block",
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
            border:
              `1px solid ${statusConfig.border}`,
            borderRadius: 999,
            background:
              statusConfig.background,
            color:
              statusConfig.color,
            fontSize: 9,
            fontWeight: 850,
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
            display:
              "block",
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
      background: "#f0fdf4",
      border: "#bbf7d0",
    },
    warning: {
      dot: "#f59e0b",
      background: "#fffbeb",
      border: "#fde68a",
    },
    offline: {
      dot: "#ef4444",
      background: "#fef2f2",
      border: "#fecaca",
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
          border:
            `1px solid ${palette.border}`,
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
          textAlign:
            "right",
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
            background:
              healthy
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
          display:
            "block",
          marginTop: 8,
          fontSize: 14,
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

function EmptyState({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      style={{
        padding: 18,
        border:
          "1px dashed #d1d5db",
        borderRadius: 14,
        color: "#64748b",
        textAlign: "center",
        fontSize: 12,
      }}
    >
      {children}
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
        color:
          "#ffffff",
        fontSize: 13,
        fontWeight: 750,
        textDecoration:
          "none",
      }}
    >
      {children}
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
        minHeight: 40,
        padding:
          "9px 14px",
        border:
          "1px solid #d1d5db",
        borderRadius: 11,
        background:
          "#ffffff",
        color:
          "#111827",
        fontSize: 13,
        fontWeight: 700,
        textDecoration:
          "none",
      }}
    >
      {children}
    </Link>
  );
}
