import type { Locale } from "@/lib/i18n";

export interface RuntimeLedgerCopy {
  eyebrow: string;
  title: string;
  description: string;
  loading: string;
  refresh: string;
  total: string;
  allowed: string;
  blocked: string;
  completed: string;
  empty: string;
  allowedMark: string;
  blockedMark: string;
  mode: string;
  concurrent: string;
  error: string;
}

export const runtimeLedgerCopy: Record<
  Locale,
  RuntimeLedgerCopy
> = {
  en: {
    eyebrow: "PLANNER EVIDENCE",
    title: "Execution Ledger",
    description:
      "Every allowed, blocked and completed action has traceable evidence.",
    loading: "Syncing…",
    refresh: "Refresh evidence",
    total: "All decisions",
    allowed: "Allowed",
    blocked: "Blocked",
    completed: "Completed",
    empty:
      "No execution evidence yet. Records appear here after you create or advance a task.",
    allowedMark: "✓ Allowed",
    blockedMark: "⛔ Blocked",
    mode: "Mode",
    concurrent: "Concurrent",
    error: "Execution evidence could not be loaded.",
  },

  "zh-CN": {
    eyebrow: "PLANNER 执行证据",
    title: "执行证据账本",
    description:
      "每一次允许、阻止与完成都有可追溯证据。",
    loading: "同步中…",
    refresh: "刷新证据",
    total: "全部决策",
    allowed: "允许",
    blocked: "阻止",
    completed: "已完成",
    empty:
      "尚无执行证据。创建或推进任务后，记录会自动出现在这里。",
    allowedMark: "✓ 已允许",
    blockedMark: "⛔ 已阻止",
    mode: "模式",
    concurrent: "并行",
    error: "执行证据读取失败。",
  },

  ja: {
    eyebrow: "PLANNER 実行証拠",
    title: "実行証拠台帳",
    description:
      "許可・ブロック・完了の各判断を追跡可能な証拠として保存します。",
    loading: "同期中…",
    refresh: "証拠を更新",
    total: "全判断",
    allowed: "許可",
    blocked: "ブロック",
    completed: "完了",
    empty:
      "実行証拠はまだありません。タスクを作成または進行すると、ここに記録されます。",
    allowedMark: "✓ 許可済み",
    blockedMark: "⛔ ブロック済み",
    mode: "モード",
    concurrent: "並列",
    error: "実行証拠を読み込めませんでした。",
  },
};

export const runtimeLedgerActionLabels: Record<
  Locale,
  Record<string, string>
> = {
  en: {
    "task-create": "Create task",
    "task-start": "Start task",
    "task-complete": "Complete task",
    "task-update": "Update task",
    "task-delete": "Delete task",
    "outcome-start-next": "Start next",
    "outcome-complete-current": "Complete current",
  },

  "zh-CN": {
    "task-create": "创建任务",
    "task-start": "启动任务",
    "task-complete": "完成任务",
    "task-update": "更新任务",
    "task-delete": "删除任务",
    "outcome-start-next": "启动下一项",
    "outcome-complete-current": "完成当前项",
  },

  ja: {
    "task-create": "タスク作成",
    "task-start": "タスク開始",
    "task-complete": "タスク完了",
    "task-update": "タスク更新",
    "task-delete": "タスク削除",
    "outcome-start-next": "次を開始",
    "outcome-complete-current": "現在項目を完了",
  },
};

export function formatRuntimeLedgerAction(
  action: string,
  locale: Locale,
): string {
  return runtimeLedgerActionLabels[locale][action] ?? action;
}
