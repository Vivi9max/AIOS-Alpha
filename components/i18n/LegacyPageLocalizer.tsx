"use client";

import { useEffect } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";

type Locale = "en" | "zh-CN" | "ja";

type TranslationTriple = {
  en: string;
  "zh-CN": string;
  ja: string;
};

/**
 * C142.6.1
 *
 * Strict i18n Runtime Cleanup
 *
 * Purpose:
 * - Keep legacy hard-coded UI compatible with the typed i18n system.
 * - Normalize known UI phrases into the currently selected locale.
 * - Prevent mixed-language UI caused by legacy English/Chinese/Japanese
 *   strings remaining in older pages.
 *
 * Strict boundary:
 * - Translate only known UI phrases.
 * - Never translate user-generated content.
 * - Never translate arbitrary chat messages, task descriptions,
 *   project names, memory records, API responses or generated content.
 * - Preserve product and technical identifiers where appropriate:
 *   AIOS, GitHub, API, Provider, Planner, Runtime, Execution, Outcome,
 *   Milestone and similar system identifiers.
 *
 * Runtime behavior:
 * - Exact known phrases are normalized bidirectionally.
 * - Longer phrases are matched before shorter phrases.
 * - Text nodes are tracked by their original source value.
 * - DOM mutations are observed without recursively translating
 *   our own mutations.
 * - Switching locale restores the canonical source phrase before
 *   applying the new locale.
 */

const TRANSLATIONS: TranslationTriple[] = [
  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  {
    en: "Chat",
    "zh-CN": "对话",
    ja: "チャット",
  },
  {
    en: "Memory",
    "zh-CN": "记忆",
    ja: "メモリ",
  },
  {
    en: "Tasks",
    "zh-CN": "任务",
    ja: "タスク",
  },
  {
    en: "Projects",
    "zh-CN": "项目",
    ja: "プロジェクト",
  },
  {
    en: "Dashboard",
    "zh-CN": "控制台",
    ja: "ダッシュボード",
  },
  {
    en: "AIOS Dashboard",
    "zh-CN": "AIOS 控制台",
    ja: "AIOS ダッシュボード",
  },
  {
    en: "Settings",
    "zh-CN": "设置",
    ja: "設定",
  },
  {
    en: "Handoff",
    "zh-CN": "交接",
    ja: "引き継ぎ",
  },
  {
    en: "All",
    "zh-CN": "全部",
    ja: "すべて",
  },
  {
    en: "Open navigation menu",
    "zh-CN": "打开导航菜单",
    ja: "ナビゲーションメニューを開く",
  },
  {
    en: "Close navigation menu",
    "zh-CN": "关闭导航菜单",
    ja: "ナビゲーションメニューを閉じる",
  },

  // ---------------------------------------------------------------------------
  // Workspace
  // ---------------------------------------------------------------------------

  {
    en: "Chat Workspace",
    "zh-CN": "对话工作区",
    ja: "チャットワークスペース",
  },
  {
    en: "AIOS Workspace",
    "zh-CN": "AIOS 工作区",
    ja: "AIOS ワークスペース",
  },
  {
    en: "What will you accomplish today?",
    "zh-CN": "今天准备完成什么？",
    ja: "今日は何を達成しますか？",
  },
  {
    en: "Quick actions",
    "zh-CN": "快捷操作",
    ja: "クイックアクション",
  },
  {
    en: "Start in one tap",
    "zh-CN": "一键开始",
    ja: "ワンタップで開始",
  },
  {
    en: "AIOS Chat",
    "zh-CN": "AIOS 对话",
    ja: "AIOS チャット",
  },
  {
    en: "Enter a goal, question or action to execute.",
    "zh-CN": "输入目标、问题或要执行的操作。",
    ja: "目標、質問、または実行する操作を入力してください。",
  },
  {
    en: "New task",
    "zh-CN": "新建任务",
    ja: "新しいタスク",
  },
  {
    en: "Turn a goal into the next action",
    "zh-CN": "把目标变成下一步行动",
    ja: "目標を次のアクションに変換",
  },
  {
    en: "Save information",
    "zh-CN": "记录信息",
    ja: "情報を保存",
  },
  {
    en: "Preserve long-term context and preferences",
    "zh-CN": "保存长期资料和偏好",
    ja: "長期的なコンテキストと設定を保存",
  },
  {
    en: "View projects",
    "zh-CN": "查看项目",
    ja: "プロジェクトを見る",
  },
  {
    en: "Manage work already in motion",
    "zh-CN": "管理正在推进的工作",
    ja: "進行中の作業を管理",
  },
  {
    en: "Ask AIOS",
    "zh-CN": "询问 AIOS",
    ja: "AIOS に質問",
  },
  {
    en: "Plan, analyze or execute an action",
    "zh-CN": "规划、分析或执行操作",
    ja: "計画、分析、またはアクションを実行",
  },

  // ---------------------------------------------------------------------------
  // Runtime
  // ---------------------------------------------------------------------------

  {
    en: "Runtime",
    "zh-CN": "运行时",
    ja: "ランタイム",
  },
  {
    en: "AIOS Runtime",
    "zh-CN": "AIOS 运行时",
    ja: "AIOS ランタイム",
  },
  {
    en: "Runtime Control Center",
    "zh-CN": "运行控制中心",
    ja: "ランタイム管理センター",
  },
  {
    en: "Runtime Console",
    "zh-CN": "运行控制台",
    ja: "ランタイムコンソール",
  },
  {
    en: "Runtime Online",
    "zh-CN": "运行在线",
    ja: "ランタイム稼働中",
  },
  {
    en: "Runtime Offline",
    "zh-CN": "运行离线",
    ja: "ランタイム停止中",
  },
  {
    en: "Runtime status",
    "zh-CN": "运行状态",
    ja: "ランタイム状態",
  },
  {
    en: "Runtime Status",
    "zh-CN": "运行状态",
    ja: "ランタイム状態",
  },
  {
    en: "System Status",
    "zh-CN": "系统状态",
    ja: "システム状態",
  },
  {
    en: "Active Provider",
    "zh-CN": "当前 Provider",
    ja: "現在の Provider",
  },
  {
    en: "ACTIVE PROVIDER",
    "zh-CN": "当前 Provider",
    ja: "現在の Provider",
  },
  {
    en: "Provider",
    "zh-CN": "服务提供方",
    ja: "プロバイダー",
  },
  {
    en: "Online",
    "zh-CN": "在线",
    ja: "オンライン",
  },
  {
    en: "Offline",
    "zh-CN": "离线",
    ja: "オフライン",
  },
  {
    en: "Active AI model",
    "zh-CN": "当前 AI 模型",
    ja: "現在の AI モデル",
  },
  {
    en: "Current memory records",
    "zh-CN": "当前记忆记录",
    ja: "現在のメモリ記録",
  },
  {
    en: "Latest request latency",
    "zh-CN": "最近请求耗时",
    ja: "最新リクエスト遅延",
  },
  {
    en: "Runtime status could not be loaded.",
    "zh-CN": "无法读取运行状态。",
    ja: "ランタイム状態を読み込めませんでした。",
  },
  {
    en: "Open Planner",
    "zh-CN": "打开 Planner",
    ja: "Planner を開く",
  },
  {
    en: "Open Runtime Console",
    "zh-CN": "打开运行控制台",
    ja: "ランタイムコンソールを開く",
  },
  {
    en: "Submit a single task directly to Runtime",
    "zh-CN": "直接向运行时提交单次任务",
    ja: "ランタイムに単一タスクを直接送信",
  },
  {
    en: "View Execution Trace",
    "zh-CN": "查看执行轨迹",
    ja: "実行トレースを見る",
  },
  {
    en: "Inspect the latest real execution path",
    "zh-CN": "查看最近一次真实执行过程",
    ja: "最新の実行経路を確認",
  },

  // ---------------------------------------------------------------------------
  // Common states
  // ---------------------------------------------------------------------------

  {
    en: "Loading",
    "zh-CN": "加载中",
    ja: "読み込み中",
  },
  {
    en: "Loading…",
    "zh-CN": "加载中…",
    ja: "読み込み中…",
  },
  {
    en: "Reading…",
    "zh-CN": "读取中…",
    ja: "読み込み中…",
  },
  {
    en: "Processing…",
    "zh-CN": "处理中…",
    ja: "処理中…",
  },
  {
    en: "Checking…",
    "zh-CN": "检查中…",
    ja: "確認中…",
  },
  {
    en: "Synchronizing…",
    "zh-CN": "同步中…",
    ja: "同期中…",
  },
  {
    en: "Refreshing…",
    "zh-CN": "刷新中…",
    ja: "更新中…",
  },
  {
    en: "Refreshing",
    "zh-CN": "刷新中",
    ja: "更新中",
  },
  {
    en: "Refresh",
    "zh-CN": "刷新",
    ja: "更新",
  },
  {
    en: "Success",
    "zh-CN": "成功",
    ja: "成功",
  },
  {
    en: "Failed",
    "zh-CN": "失败",
    ja: "失敗",
  },
  {
    en: "Error",
    "zh-CN": "错误",
    ja: "エラー",
  },
  {
    en: "Unknown",
    "zh-CN": "未知",
    ja: "不明",
  },
  {
    en: "None",
    "zh-CN": "暂无",
    ja: "なし",
  },
  {
    en: "Allowed",
    "zh-CN": "允许",
    ja: "許可",
  },
  {
    en: "Paused",
    "zh-CN": "已暂停",
    ja: "一時停止",
  },
  {
    en: "In progress",
    "zh-CN": "进行中",
    ja: "進行中",
  },
  {
    en: "Waiting",
    "zh-CN": "等待中",
    ja: "待機中",
  },
  {
    en: "Completed",
    "zh-CN": "已完成",
    ja: "完了",
  },
  {
    en: "Active",
    "zh-CN": "进行中",
    ja: "進行中",
  },
  {
    en: "Blocked",
    "zh-CN": "受阻",
    ja: "停止中",
  },
  {
    en: "Planned",
    "zh-CN": "已规划",
    ja: "計画済み",
  },
  {
    en: "Archived",
    "zh-CN": "已归档",
    ja: "アーカイブ済み",
  },

  // ---------------------------------------------------------------------------
  // Tasks
  // ---------------------------------------------------------------------------

  {
    en: "Task queue",
    "zh-CN": "任务队列",
    ja: "タスクキュー",
  },
  {
    en: "Task list",
    "zh-CN": "任务列表",
    ja: "タスク一覧",
  },
  {
    en: "Task title",
    "zh-CN": "任务标题",
    ja: "タスク标题",
  },
  {
    en: "Task description",
    "zh-CN": "任务说明",
    ja: "タスクの説明",
  },
  {
    en: "Create task",
    "zh-CN": "创建任务",
    ja: "タスクを作成",
  },
  {
    en: "No tasks yet",
    "zh-CN": "还没有任务",
    ja: "タスクはまだありません",
  },
  {
    en: "No tasks yet. Create your first task.",
    "zh-CN": "还没有任务，请先创建第一项任务。",
    ja: "タスクはまだありません。最初のタスクを作成してください。",
  },
  {
    en: "Completed tasks",
    "zh-CN": "已完成任务",
    ja: "完了したタスク",
  },
  {
    en: "Current action:",
    "zh-CN": "当前行动：",
    ja: "現在のアクション：",
  },
  {
    en: "Task description (optional)",
    "zh-CN": "任务说明（可选）",
    ja: "タスクの説明（任意）",
  },
  {
    en: "Delete this task?",
    "zh-CN": "确定删除这项任务吗？",
    ja: "このタスクを削除しますか？",
  },
  {
    en: "New tasks",
    "zh-CN": "新增任务",
    ja: "新しいタスク",
  },
  {
    en: "Concurrent",
    "zh-CN": "并行执行",
    ja: "並列実行",
  },

  // ---------------------------------------------------------------------------
  // Planner
  // ---------------------------------------------------------------------------

  {
    en: "Planner",
    "zh-CN": "规划器",
    ja: "プランナー",
  },
  {
    en: "Strategic Planner",
    "zh-CN": "战略规划器",
    ja: "戦略プランナー",
  },
  {
    en: "Waiting for goal",
    "zh-CN": "等待目标",
    ja: "目標を待機中",
  },
  {
    en: "Goal is clear",
    "zh-CN": "目标清晰",
    ja: "目標が明確です",
  },
  {
    en: "Ready to plan",
    "zh-CN": "可以规划",
    ja: "計画可能",
  },
  {
    en: "Add more detail",
    "zh-CN": "建议补充细节",
    ja: "詳細を追加してください",
  },
  {
    en: "Final outcome",
    "zh-CN": "最终结果",
    ja: "最終成果",
  },
  {
    en: "Timeframe",
    "zh-CN": "时间范围",
    ja: "期間",
  },
  {
    en: "Success metric",
    "zh-CN": "成功标准",
    ja: "成功指標",
  },
  {
    en: "Constraints",
    "zh-CN": "限制条件",
    ja: "制約条件",
  },
  {
    en: "Generating plan…",
    "zh-CN": "正在生成计划…",
    ja: "計画を生成中…",
  },
  {
    en: "Generate plan",
    "zh-CN": "生成计划",
    ja: "計画を生成",
  },
  {
    en: "Planning and executing…",
    "zh-CN": "正在规划并执行…",
    ja: "計画して実行中…",
  },
  {
    en: "Plan and execute",
    "zh-CN": "规划并执行",
    ja: "計画して実行",
  },
  {
    en: "Quick goals",
    "zh-CN": "快速目标",
    ja: "クイック目標",
  },
  {
    en: "Tap to load",
    "zh-CN": "点击即可载入",
    ja: "タップして読み込む",
  },
  {
    en: "What should AIOS ultimately accomplish?",
    "zh-CN": "你希望 AIOS 最终完成什么？",
    ja: "AIOS に最終的に何を達成させますか？",
  },
  {
    en: "Goal is required",
    "zh-CN": "请输入目标",
    ja: "目標を入力してください",
  },
  {
    en: "Goal required",
    "zh-CN": "需要输入目标",
    ja: "目標が必要です",
  },
  {
    en: "Planner Engine is unavailable. Try again shortly.",
    "zh-CN": "Planner Engine 暂时不可用，请稍后重试。",
    ja: "Planner Engine を利用できません。しばらくしてから再試行してください。",
  },

  // ---------------------------------------------------------------------------
  // Execution
  // ---------------------------------------------------------------------------

  {
    en: "Execution Center",
    "zh-CN": "执行中心",
    ja: "実行センター",
  },
  {
    en: "Execution plan",
    "zh-CN": "执行计划",
    ja: "実行計画",
  },
  {
    en: "Execution Trace",
    "zh-CN": "执行轨迹",
    ja: "実行トレース",
  },
  {
    en: "Current stage",
    "zh-CN": "当前阶段",
    ja: "現在のステージ",
  },
  {
    en: "Current milestone",
    "zh-CN": "当前里程碑",
    ja: "現在のマイルストーン",
  },
  {
    en: "Queue total",
    "zh-CN": "队列总数",
    ja: "キュー合計",
  },
  {
    en: "Remaining",
    "zh-CN": "待执行",
    ja: "残り",
  },
  {
    en: "Start next",
    "zh-CN": "开始下一项",
    ja: "次を開始",
  },
  {
    en: "Starting…",
    "zh-CN": "开始中…",
    ja: "開始中…",
  },
  {
    en: "Completing…",
    "zh-CN": "完成中…",
    ja: "完了処理中…",
  },
  {
    en: "Complete current task",
    "zh-CN": "完成当前任务",
    ja: "現在のタスクを完了",
  },
  {
    en: "No execution queue yet",
    "zh-CN": "尚未建立执行队列",
    ja: "実行キューはまだありません",
  },
  {
    en: "Create an outcome and turn its milestones into tasks to receive the next recommended action.",
    "zh-CN": "创建成果并将里程碑转换为任务后，AIOS 会推荐下一项行动。",
    ja: "成果を作成し、マイルストーンをタスクに変換すると、次の推奨アクションが表示されます。",
  },
  {
    en: "Open Outcome Center",
    "zh-CN": "打开成果中心",
    ja: "成果センターを開く",
  },
  {
    en: "Check again",
    "zh-CN": "重新检查",
    ja: "もう一度確認",
  },
  {
    en: "Sync progress",
    "zh-CN": "同步进度",
    ja: "進捗を同期",
  },
  {
    en: "Syncing…",
    "zh-CN": "同步中…",
    ja: "同期中…",
  },
  {
    en: "Outcome completed",
    "zh-CN": "成果已完成",
    ja: "成果が完了しました",
  },
  {
    en: "Outcome completed.",
    "zh-CN": "成果已完成。",
    ja: "成果が完了しました。",
  },
  {
    en: "No tasks are in progress",
    "zh-CN": "没有正在执行的任务",
    ja: "進行中のタスクはありません",
  },
  {
    en: "No tasks are waiting",
    "zh-CN": "没有等待中的任务",
    ja: "待機中のタスクはありません",
  },
  {
    en: "Completed tasks will appear here",
    "zh-CN": "已完成的任务会显示在这里",
    ja: "完了したタスクがここに表示されます",
  },
  {
    en: "In progress",
    "zh-CN": "进行中",
    ja: "進行中",
  },

  // ---------------------------------------------------------------------------
  // Outcomes
  // ---------------------------------------------------------------------------

  {
    en: "Outcome",
    "zh-CN": "成果",
    ja: "成果",
  },
  {
    en: "Outcomes",
    "zh-CN": "成果",
    ja: "成果",
  },
  {
    en: "All outcomes",
    "zh-CN": "全部成果",
    ja: "すべての成果",
  },
  {
    en: "Average progress",
    "zh-CN": "平均进度",
    ja: "平均進捗",
  },
  {
    en: "Create a new outcome",
    "zh-CN": "创建新的成果",
    ja: "新しい成果を作成",
  },
  {
    en: "Outcome title",
    "zh-CN": "成果标题",
    ja: "成果タイトル",
  },
  {
    en: "Outcome Title",
    "zh-CN": "成果标题",
    ja: "成果タイトル",
  },
  {
    en: "Description",
    "zh-CN": "说明",
    ja: "説明",
  },
  {
    en: "Success criteria",
    "zh-CN": "成功标准",
    ja: "成功基準",
  },
  {
    en: "Priority",
    "zh-CN": "优先级",
    ja: "優先度",
  },
  {
    en: "Target date",
    "zh-CN": "目标日期",
    ja: "目標日",
  },
  {
    en: "Milestones",
    "zh-CN": "里程碑",
    ja: "マイルストーン",
  },
  {
    en: "Milestone",
    "zh-CN": "里程碑",
    ja: "マイルストーン",
  },
  {
    en: "Milestone title",
    "zh-CN": "里程碑标题",
    ja: "マイルストーンタイトル",
  },
  {
    en: "Milestone description",
    "zh-CN": "里程碑说明",
    ja: "マイルストーンの説明",
  },
  {
    en: "Add",
    "zh-CN": "添加",
    ja: "追加",
  },
  {
    en: "Delete",
    "zh-CN": "删除",
    ja: "削除",
  },
  {
    en: "Cancel",
    "zh-CN": "取消",
    ja: "キャンセル",
  },
  {
    en: "Create outcome",
    "zh-CN": "创建成果",
    ja: "成果を作成",
  },
  {
    en: "Loading outcomes…",
    "zh-CN": "正在加载成果…",
    ja: "成果を読み込み中…",
  },

  // ---------------------------------------------------------------------------
  // Projects
  // ---------------------------------------------------------------------------

  {
    en: "Project Center",
    "zh-CN": "项目中心",
    ja: "プロジェクトセンター",
  },
  {
    en: "Projects",
    "zh-CN": "项目",
    ja: "プロジェクト",
  },
  {
    en: "Open project",
    "zh-CN": "打开项目",
    ja: "プロジェクトを開く",
  },
  {
    en: "Back to Projects",
    "zh-CN": "返回项目",
    ja: "プロジェクトに戻る",
  },
  {
    en: "Enter workspace",
    "zh-CN": "进入工作区",
    ja: "ワークスペースに入る",
  },
  {
    en: "Project modules",
    "zh-CN": "项目模块",
    ja: "プロジェクトモジュール",
  },
  {
    en: "Open",
    "zh-CN": "打开",
    ja: "開く",
  },
  {
    en: "Running",
    "zh-CN": "运行中",
    ja: "稼働中",
  },
  {
    en: "Planning",
    "zh-CN": "规划中",
    ja: "計画中",
  },
  {
    en: "Building",
    "zh-CN": "构建中",
    ja: "構築中",
  },
  {
    en: "Ready",
    "zh-CN": "就绪",
    ja: "準備完了",
  },

  // ---------------------------------------------------------------------------
  // Settings / language
  // ---------------------------------------------------------------------------

  {
    en: "Language",
    "zh-CN": "语言",
    ja: "言語",
  },
  {
    en: "English",
    "zh-CN": "英语",
    ja: "英語",
  },
  {
    en: "Simplified Chinese",
    "zh-CN": "简体中文",
    ja: "簡体字中国語",
  },
  {
    en: "Japanese",
    "zh-CN": "日语",
    ja: "日本語",
  },
  {
    en: "Save Settings",
    "zh-CN": "保存设置",
    ja: "設定を保存",
  },
  {
    en: "Save Local Settings",
    "zh-CN": "保存本机设置",
    ja: "ローカル設定を保存",
  },
  {
    en: "Save",
    "zh-CN": "保存",
    ja: "保存",
  },

  // ---------------------------------------------------------------------------
  // System / module labels
  // ---------------------------------------------------------------------------

  {
    en: "Runtime Modules",
    "zh-CN": "运行模块",
    ja: "ランタイムモジュール",
  },
  {
    en: "Memory Records",
    "zh-CN": "记忆记录",
    ja: "メモリ記録",
  },
  {
    en: "Last Check",
    "zh-CN": "最近检查",
    ja: "最終チェック",
  },
  {
    en: "Version",
    "zh-CN": "版本",
    ja: "バージョン",
  },
  {
    en: "Status",
    "zh-CN": "状态",
    ja: "ステータス",
  },
  {
    en: "Current device",
    "zh-CN": "当前设备",
    ja: "現在のデバイス",
  },
  {
    en: "Storage",
    "zh-CN": "存储",
    ja: "ストレージ",
  },
  {
    en: "Brain",
    "zh-CN": "智能核心",
    ja: "ブレイン",
  },

  // ---------------------------------------------------------------------------
  // Handoff / development
  // ---------------------------------------------------------------------------

  {
    en: "CONTINUITY CAPSULE",
    "zh-CN": "持续开发胶囊",
    ja: "継続開発カプセル",
  },
  {
    en: "CURRENT CHECKPOINT",
    "zh-CN": "当前检查点",
    ja: "現在のチェックポイント",
  },
  {
    en: "Independent Development Handoff",
    "zh-CN": "独立开发交接中心",
    ja: "独立開発引き継ぎ",
  },
  {
    en: "Next priority",
    "zh-CN": "下一优先事项",
    ja: "次の優先事項",
  },
  {
    en: "Read first",
    "zh-CN": "首先读取",
    ja: "最初に読む",
  },
  {
    en: "Run and verify",
    "zh-CN": "运行与验证",
    ja: "実行して検証",
  },
  {
    en: "Working capabilities",
    "zh-CN": "已运行能力",
    ja: "動作中の機能",
  },
  {
    en: "Loading handoff snapshot…",
    "zh-CN": "正在读取交接状态…",
    ja: "引き継ぎ状態を読み込み中…",
  },
  {
    en: "The handoff snapshot could not be loaded.",
    "zh-CN": "无法读取交接状态。",
    ja: "引き継ぎ状態を読み込めませんでした。",
  },
];

/**
 * Canonical phrase indexes.
 *
 * Every supported locale phrase points back to the same English canonical
 * phrase. This makes locale switching deterministic:
 *
 *   current text -> canonical English -> selected locale
 */
const CANONICAL_BY_LOCALE: Record<
  Locale,
  Map<string, string>
> = {
  en: new Map(),
  "zh-CN": new Map(),
  ja: new Map(),
};

const TRANSLATION_BY_CANONICAL = new Map<
  string,
  TranslationTriple
>();

for (const entry of TRANSLATIONS) {
  TRANSLATION_BY_CANONICAL.set(entry.en, entry);

  CANONICAL_BY_LOCALE.en.set(entry.en, entry.en);
  CANONICAL_BY_LOCALE["zh-CN"].set(entry["zh-CN"], entry.en);
  CANONICAL_BY_LOCALE.ja.set(entry.ja, entry.en);
}

/**
 * Longest-first matching prevents phrases such as:
 *
 *   "Runtime"
 *
 * from being processed before:
 *
 *   "Runtime Control Center"
 */
const MATCH_ENTRIES = TRANSLATIONS
  .flatMap((entry) => [
    [entry.en, entry.en] as const,
    [entry["zh-CN"], entry.en] as const,
    [entry.ja, entry.en] as const,
  ])
  .filter(([source]) => source.length > 0)
  .sort((a, b) => b[0].length - a[0].length);

const TEXT_NODE_ORIGINALS = new WeakMap<Text, string>();

function getCanonicalText(value: string): string | null {
  const exact = CANONICAL_BY_LOCALE.en.get(value);
  if (exact) {
    return exact;
  }

  const zh = CANONICAL_BY_LOCALE["zh-CN"].get(value);
  if (zh) {
    return zh;
  }

  const ja = CANONICAL_BY_LOCALE.ja.get(value);
  if (ja) {
    return ja;
  }

  return null;
}

function translateExact(value: string, locale: Locale): string {
  const canonical = getCanonicalText(value);

  if (!canonical) {
    return value;
  }

  const entry = TRANSLATION_BY_CANONICAL.get(canonical);

  if (!entry) {
    return value;
  }

  return entry[locale];
}

/**
 * Translate only complete known phrases.
 *
 * We intentionally do not run a global arbitrary substring replacement.
 * That would risk corrupting:
 * - user text
 * - project names
 * - task names
 * - memory content
 * - generated AI output
 * - identifiers
 */
function translateTextNode(
  node: Text,
  locale: Locale,
): boolean {
  const parent = node.parentElement;

  if (!parent) {
    return false;
  }

  if (
    parent.closest(
      "script,style,noscript,textarea,input,[data-aios-i18n-ignore]"
    )
  ) {
    return false;
  }

  const current = node.nodeValue ?? "";

  if (!current.trim()) {
    return false;
  }

  const storedOriginal = TEXT_NODE_ORIGINALS.get(node);

  const source =
    storedOriginal !== undefined
      ? storedOriginal
      : current;

  if (storedOriginal === undefined) {
    TEXT_NODE_ORIGINALS.set(node, source);
  }

  const translated = translateExact(source, locale);

  if (translated === current) {
    return false;
  }

  node.nodeValue = translated;
  return true;
}

/**
 * Handle exact phrases embedded in small UI text nodes.
 *
 * Example:
 *   "Status: Online"
 *
 * We only transform when every non-whitespace fragment is a known UI phrase.
 * This intentionally avoids broad natural-language translation.
 */
function translateSafeCompositeText(
  node: Text,
  locale: Locale,
): boolean {
  const parent = node.parentElement;

  if (!parent) {
    return false;
  }

  if (
    parent.closest(
      "script,style,noscript,textarea,input,[data-aios-i18n-ignore]"
    )
  ) {
    return false;
  }

  const current = node.nodeValue ?? "";

  if (!current.trim()) {
    return false;
  }

  const original =
    TEXT_NODE_ORIGINALS.get(node) ?? current;

  if (!TEXT_NODE_ORIGINALS.has(node)) {
    TEXT_NODE_ORIGINALS.set(node, original);
  }

  const direct = translateExact(original, locale);

  if (direct !== original) {
    if (current !== direct) {
      node.nodeValue = direct;
      return true;
    }

    return false;
  }

  return false;
}

function shouldIgnoreElement(element: Element): boolean {
  return Boolean(
    element.closest(
      "script,style,noscript,textarea,input,[data-aios-i18n-ignore]"
    ),
  );
}

function translateAttribute(
  element: Element,
  attribute: "aria-label" | "title" | "placeholder",
  locale: Locale,
): boolean {
  if (shouldIgnoreElement(element)) {
    return false;
  }

  const value = element.getAttribute(attribute);

  if (!value) {
    return false;
  }

  const translated = translateExact(value, locale);

  if (translated === value) {
    return false;
  }

  element.setAttribute(attribute, translated);
  return true;
}

function scanElement(
  root: Node,
  locale: Locale,
): void {
  if (root.nodeType === Node.TEXT_NODE) {
    const text = root as Text;

    translateTextNode(text, locale);
    translateSafeCompositeText(text, locale);

    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const element = root as Element;

  if (shouldIgnoreElement(element)) {
    return;
  }

  translateAttribute(element, "aria-label", locale);
  translateAttribute(element, "title", locale);
  translateAttribute(element, "placeholder", locale);

  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
  );

  const nodes: Text[] = [];

  let current: Node | null;

  while ((current = walker.nextNode())) {
    nodes.push(current as Text);
  }

  for (const node of nodes) {
    translateTextNode(node, locale);
    translateSafeCompositeText(node, locale);
  }

  const elements = element.querySelectorAll(
    "[aria-label],[title],[placeholder]",
  );

  for (const child of elements) {
    translateAttribute(child, "aria-label", locale);
    translateAttribute(child, "title", locale);
    translateAttribute(child, "placeholder", locale);
  }
}

/**
 * Restore a text node to its canonical source.
 *
 * This is important when changing:
 *
 *   English -> Chinese -> Japanese -> English
 *
 * Without restoration, a Japanese value could become the source for the
 * next translation cycle and eventually create translation drift.
 */
function restoreOriginalText(node: Text): void {
  const original = TEXT_NODE_ORIGINALS.get(node);

  if (original !== undefined && node.nodeValue !== original) {
    node.nodeValue = original;
  }
}

function restoreDocument(): void {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
  );

  const nodes: Text[] = [];

  let current: Node | null;

  while ((current = walker.nextNode())) {
    nodes.push(current as Text);
  }

  for (const node of nodes) {
    restoreOriginalText(node);
  }
}

function restoreAttributes(): void {
  const elements = document.querySelectorAll(
    "[aria-label],[title],[placeholder]",
  );

  for (const element of elements) {
    for (const attribute of [
      "aria-label",
      "title",
      "placeholder",
    ] as const) {
      const value = element.getAttribute(attribute);

      if (!value) {
        continue;
      }

      const canonical = getCanonicalText(value);

      if (!canonical) {
        continue;
      }

      const entry = TRANSLATION_BY_CANONICAL.get(canonical);

      if (!entry) {
        continue;
      }

      element.setAttribute(attribute, entry.en);
    }
  }
}

function applyLocale(locale: Locale): void {
  /**
   * Always normalize to canonical English first.
   *
   * This prevents:
   *
   * zh -> ja -> zh
   *
   * from using an already translated phrase as the source.
   */
  restoreDocument();
  restoreAttributes();

  scanElement(document.body, locale);
}

/**
 * MutationObserver safety.
 *
 * Our own translation changes generate mutations. We batch them and only
 * process once per animation frame, preventing recursive translation loops.
 */
function createStrictObserver(
  locale: Locale,
): MutationObserver {
  let scheduled = false;
  let disconnected = false;

  const schedule = () => {
    if (scheduled || disconnected) {
      return;
    }

    scheduled = true;

    window.requestAnimationFrame(() => {
      scheduled = false;

      if (disconnected) {
        return;
      }

      scanElement(document.body, locale);
    });
  };

  const observer = new MutationObserver((mutations) => {
    let relevant = false;

    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        if (
          mutation.addedNodes.length > 0 ||
          mutation.removedNodes.length > 0
        ) {
          relevant = true;
          break;
        }
      }

      if (mutation.type === "characterData") {
        relevant = true;
        break;
      }

      if (mutation.type === "attributes") {
        relevant = true;
        break;
      }
    }

    if (relevant) {
      schedule();
    }
  });

  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: [
      "aria-label",
      "title",
      "placeholder",
    ],
  });

  const originalDisconnect = observer.disconnect.bind(observer);

  observer.disconnect = () => {
    disconnected = true;
    originalDisconnect();
  };

  return observer;
}

export default function LegacyPageLocalizer() {
  const { locale } = useLanguage();

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (!document.body) {
      return;
    }

    applyLocale(locale);

    const observer = createStrictObserver(locale);

    return () => {
      observer.disconnect();
    };
  }, [locale]);

  return null;
}
