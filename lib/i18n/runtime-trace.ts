import type { Locale } from "@/lib/i18n";

export interface RuntimeTraceCopy {
  backToRuntime: string;
  eyebrow: string;
  title: string;
  description: string;
  refreshing: string;
  refresh: string;
  loading: string;
  completed: string;
  failed: string;
  running: string;
  waiting: string;
  status: string;
  progress: string;
  duration: string;
  provider: string;
  current: string;
  request: string;
  done: string;
  executionOverview: string;
  noRequestPreview: string;
  executionProgress: string;
  started: string;
  completedLabel: string;
  capabilities: string;
  currentStep: string;
  executionCompleted: string;
  runtime: string;
  recentExecutionCompleted: string;
  waitingForCapability: string;
  executionQueue: string;
  queueDescription: string;
  noCapabilityRecords: string;
  executionTimeline: string;
  timelineDescription: string;
  executionSummary: string;
  events: string;
  fallback: string;
  used: string;
  notUsed: string;
  finished: string;
  rawTrace: string;
  collapse: string;
  expand: string;
  plan: string;
  planId: string;
  startedAt: string;
  completedAt: string;
  noDuration: string;
  capabilityRecorded: string;
  executionStarted: string;
  runtimeReceivedRequest: string;
  completedIn: string;
  allOperationsFinished: string;
  runtimeStopped: string;
  emptyTitle: string;
  emptyDescription: string;
  openPlanner: string;
  executionTraceReadFailed: string;
  statusRunning: string;
  statusCompleted: string;
  statusFailed: string;
  statusWaiting: string;
  progressAttention: string;
  progressCompleted: string;
  progressFinishing: string;
  progressExecuting: string;
  progressPreparing: string;
}

export const runtimeTraceCopy: Record<
  Locale,
  RuntimeTraceCopy
> = {
  en: {
    backToRuntime: "← Back to Runtime",
    eyebrow: "AIOS RUNTIME",
    title: "Execution Trace",
    description:
      "Inspect the latest request status, capability queue, timeline and runtime result.",
    refreshing: "Refreshing…",
    refresh: "Refresh trace",
    loading: "Loading Execution Trace…",
    completed: "Execution completed",
    failed: "Execution failed",
    running: "Execution in progress",
    waiting: "Waiting",
    status: "Status",
    progress: "Progress",
    duration: "Duration",
    provider: "Provider",
    current: "Current",
    request: "Request",
    done: "Completed",
    executionOverview: "EXECUTION OVERVIEW",
    noRequestPreview: "No request preview available.",
    executionProgress: "EXECUTION PROGRESS",
    started: "Started",
    completedLabel: "Completed",
    capabilities: "capabilities",
    currentStep: "CURRENT STEP",
    executionCompleted: "Execution Completed",
    runtime: "Runtime",
    recentExecutionCompleted:
      "The latest execution has completed.",
    waitingForCapability:
      "Waiting for a new capability execution record.",
    executionQueue: "Execution Queue",
    queueDescription:
      "Capabilities invoked by this request in execution order.",
    noCapabilityRecords:
      "No independent capability calls were recorded for this execution.",
    executionTimeline: "Execution Timeline",
    timelineDescription:
      "Key execution nodes produced by the latest run.",
    executionSummary: "EXECUTION SUMMARY",
    events: "Events",
    fallback: "Fallback",
    used: "Used",
    notUsed: "Not used",
    finished: "Finished",
    rawTrace: "Raw Trace",
    collapse: "Collapse ↑",
    expand: "Expand ↓",
    plan: "Plan",
    planId: "Plan ID",
    startedAt: "Started",
    completedAt: "Completed",
    noDuration: "No duration recorded",
    capabilityRecorded:
      "Capability execution recorded.",
    executionStarted: "Execution Started",
    runtimeReceivedRequest:
      "Runtime received a new request.",
    completedIn: "Completed in",
    allOperationsFinished:
      "All recorded runtime operations finished.",
    runtimeStopped:
      "The runtime stopped before successful completion.",
    emptyTitle: "No execution record",
    emptyDescription:
      "Run a goal from Planner first. Execution Overview, Queue, Timeline and the complete runtime record will appear here.",
    openPlanner: "Open Planner →",
    executionTraceReadFailed:
      "Failed to read Execution Trace.",
    statusRunning: "Running",
    statusCompleted: "Completed",
    statusFailed: "Failed",
    statusWaiting: "Waiting",
    progressAttention: "Needs attention",
    progressCompleted: "Completed",
    progressFinishing: "Finishing",
    progressExecuting: "Executing",
    progressPreparing: "Preparing",
  },

  "zh-CN": {
    backToRuntime: "← 返回 Runtime",
    eyebrow: "AIOS RUNTIME",
    title: "执行记录",
    description:
      "查看最近一次请求的执行状态、能力队列、时间线和运行结果。",
    refreshing: "刷新中…",
    refresh: "刷新记录",
    loading: "正在读取执行记录…",
    completed: "执行完成",
    failed: "执行失败",
    running: "执行处理中",
    waiting: "等待中",
    status: "状态",
    progress: "进度",
    duration: "耗时",
    provider: "模型服务",
    current: "当前能力",
    request: "请求",
    done: "已完成",
    executionOverview: "执行概览",
    noRequestPreview: "暂无请求内容预览。",
    executionProgress: "执行进度",
    started: "开始",
    completedLabel: "完成",
    capabilities: "个能力",
    currentStep: "当前步骤",
    executionCompleted: "执行完成",
    runtime: "Runtime",
    recentExecutionCompleted:
      "最近一次执行已经完成。",
    waitingForCapability:
      "正在等待新的能力执行记录。",
    executionQueue: "执行队列",
    queueDescription:
      "按照执行顺序显示本次请求调用的能力。",
    noCapabilityRecords:
      "本次执行没有独立能力调用记录。",
    executionTimeline: "执行时间线",
    timelineDescription:
      "显示最近一次运行产生的关键执行节点。",
    executionSummary: "执行摘要",
    events: "事件",
    fallback: "备用路径",
    used: "已使用",
    notUsed: "未使用",
    finished: "结束",
    rawTrace: "原始记录",
    collapse: "收起 ↑",
    expand: "展开 ↓",
    plan: "计划",
    planId: "计划 ID",
    startedAt: "开始时间",
    completedAt: "完成时间",
    noDuration: "没有记录耗时",
    capabilityRecorded: "能力执行已记录。",
    executionStarted: "执行开始",
    runtimeReceivedRequest:
      "Runtime 已收到新的请求。",
    completedIn: "完成耗时",
    allOperationsFinished:
      "所有已记录的 Runtime 操作均已完成。",
    runtimeStopped:
      "Runtime 在成功完成之前停止。",
    emptyTitle: "暂无执行记录",
    emptyDescription:
      "前往 Planner 执行一个目标后，这里会显示执行概览、队列、时间线和完整运行记录。",
    openPlanner: "打开 Planner →",
    executionTraceReadFailed:
      "读取执行记录失败。",
    statusRunning: "运行中",
    statusCompleted: "已完成",
    statusFailed: "失败",
    statusWaiting: "等待中",
    progressAttention: "需要处理",
    progressCompleted: "已完成",
    progressFinishing: "即将完成",
    progressExecuting: "执行中",
    progressPreparing: "准备中",
  },

  ja: {
    backToRuntime: "← Runtime に戻る",
    eyebrow: "AIOS RUNTIME",
    title: "実行トレース",
    description:
      "最新リクエストの実行状態、能力キュー、タイムライン、実行結果を確認します。",
    refreshing: "更新中…",
    refresh: "記録を更新",
    loading: "実行トレースを読み込み中…",
    completed: "実行完了",
    failed: "実行失敗",
    running: "実行中",
    waiting: "待機中",
    status: "状態",
    progress: "進捗",
    duration: "所要時間",
    provider: "プロバイダー",
    current: "現在",
    request: "リクエスト",
    done: "完了",
    executionOverview: "実行概要",
    noRequestPreview: "リクエストのプレビューはありません。",
    executionProgress: "実行進捗",
    started: "開始",
    completedLabel: "完了",
    capabilities: "能力",
    currentStep: "現在のステップ",
    executionCompleted: "実行完了",
    runtime: "Runtime",
    recentExecutionCompleted:
      "最新の実行は完了しました。",
    waitingForCapability:
      "新しい能力実行記録を待っています。",
    executionQueue: "実行キュー",
    queueDescription:
      "このリクエストで呼び出された能力を実行順に表示します。",
    noCapabilityRecords:
      "今回の実行には独立した能力呼び出し記録がありません。",
    executionTimeline: "実行タイムライン",
    timelineDescription:
      "最新の実行で生成された主要な実行ノードを表示します。",
    executionSummary: "実行サマリー",
    events: "イベント",
    fallback: "フォールバック",
    used: "使用済み",
    notUsed: "未使用",
    finished: "終了",
    rawTrace: "Raw Trace",
    collapse: "閉じる ↑",
    expand: "開く ↓",
    plan: "プラン",
    planId: "プラン ID",
    startedAt: "開始",
    completedAt: "完了",
    noDuration: "所要時間の記録なし",
    capabilityRecorded:
      "能力の実行が記録されています。",
    executionStarted: "実行開始",
    runtimeReceivedRequest:
      "Runtime が新しいリクエストを受信しました。",
    completedIn: "完了時間",
    allOperationsFinished:
      "記録された Runtime 操作はすべて完了しました。",
    runtimeStopped:
      "Runtime は正常完了前に停止しました。",
    emptyTitle: "実行記録はありません",
    emptyDescription:
      "まず Planner から目標を実行してください。実行概要、キュー、タイムライン、完全な Runtime 記録がここに表示されます。",
    openPlanner: "Planner を開く →",
    executionTraceReadFailed:
      "実行トレースの読み込みに失敗しました。",
    statusRunning: "実行中",
    statusCompleted: "完了",
    statusFailed: "失敗",
    statusWaiting: "待機中",
    progressAttention: "確認が必要",
    progressCompleted: "完了",
    progressFinishing: "完了間近",
    progressExecuting: "実行中",
    progressPreparing: "準備中",
  },
};
