import type { Locale } from "@/lib/i18n";
/**
 * C143.21.2
 *
 * AIOS Product Language Canonical Layer
 *
 * Internationalization principle:
 *
 * This is NOT a literal translation layer.
 *
 * Each locale must use language that is:
 * - natural for the target language
 * - appropriate for software / SaaS / AI product interfaces
 * - concise enough for UI
 * - semantically equivalent without forcing identical wording
 *
 * Supported product locales:
 * - English
 * - Simplified Chinese
 * - Japanese
 *
 * Technical identifiers such as AIOS, Runtime, Planner, GitHub,
 * API and Provider may remain unchanged when they function as
 * product/system identifiers.
 */
export interface ProductLanguageEntry {
  en: string;
  "zh-CN": string;
  ja: string;
}
/**
 * Canonical product terminology.
 *
 * These values are authoritative when the corresponding concept
 * appears as product UI.
 */
export const productLanguage: Record<
  string,
  ProductLanguageEntry
> = {
  runtimeOnline: {
    en: "Runtime Online",
    "zh-CN": "运行正常",
    ja: "ランタイム稼働中",
  },
  runtimeOffline: {
    en: "Runtime Offline",
    "zh-CN": "运行离线",
    ja: "ランタイム停止中",
  },
  runtimeChecking: {
    en: "Checking…",
    "zh-CN": "检查中……",
    ja: "確認中…",
  },
  runtimeDegraded: {
    en: "Degraded",
    "zh-CN": "运行降级",
    ja: "一部機能低下",
  },
  runtimeStatus: {
    en: "Runtime Status",
    "zh-CN": "运行状态",
    ja: "ランタイムの状態",
  },
  provider: {
    en: "Provider",
    "zh-CN": "模型服务",
    ja: "プロバイダー",
  },
  activeProvider: {
    en: "Active Provider",
    "zh-CN": "当前模型服务",
    ja: "現在のプロバイダー",
  },
  taskTitle: {
    en: "Task title",
    "zh-CN": "任务标题",
    ja: "タスク名",
  },
  taskDescription: {
    en: "Task description",
    "zh-CN": "任务说明",
    ja: "タスクの説明",
  },
  taskList: {
    en: "Task list",
    "zh-CN": "任务列表",
    ja: "タスク一覧",
  },
  createTask: {
    en: "Create task",
    "zh-CN": "创建任务",
    ja: "タスクを作成",
  },
  newTask: {
    en: "New task",
    "zh-CN": "新建任务",
    ja: "新しいタスク",
  },
  loading: {
    en: "Loading…",
    "zh-CN": "加载中……",
    ja: "読み込み中…",
  },
  processing: {
    en: "Processing…",
    "zh-CN": "处理中……",
    ja: "処理中…",
  },
  refreshing: {
    en: "Refreshing…",
    "zh-CN": "刷新中……",
    ja: "更新中…",
  },
  success: {
    en: "Success",
    "zh-CN": "成功",
    ja: "成功",
  },
  failed: {
    en: "Failed",
    "zh-CN": "失败",
    ja: "失敗",
  },
  error: {
    en: "Error",
    "zh-CN": "错误",
    ja: "エラー",
  },
  unknown: {
    en: "Unknown",
    "zh-CN": "未知",
    ja: "不明",
  },
  none: {
    en: "None",
    "zh-CN": "暂无",
    ja: "なし",
  },
  completed: {
    en: "Completed",
    "zh-CN": "已完成",
    ja: "完了",
  },
  active: {
    en: "Active",
    "zh-CN": "进行中",
    ja: "有効",
  },
  blocked: {
    en: "Blocked",
    "zh-CN": "受阻",
    ja: "ブロック中",
  },
  planned: {
    en: "Planned",
    "zh-CN": "已规划",
    ja: "計画済み",
  },
  archived: {
    en: "Archived",
    "zh-CN": "已归档",
    ja: "アーカイブ済み",
  },
};
export type ProductLanguageKey =
  keyof typeof productLanguage;
/**
 * Get the canonical product wording for a locale.
 */
export function productText(
  key: ProductLanguageKey,
  locale: Locale,
): string {
  return productLanguage[key][locale];
}
/**
 * Canonical corrections for legacy hard-coded UI.
 *
 * These are deliberately narrow.
 *
 * User-generated content must NEVER be passed through this map.
 */
export const legacyProductCorrections: Record<
  Locale,
  Record<string, string>
> = {
  en: {
    "Runtime Online": "Runtime Online",
    "Runtime Offline": "Runtime Offline",
    "Runtime status": "Runtime Status",
    "Runtime Status": "Runtime Status",
    "Task title": "Task title",
    "Task description": "Task description",
  },
  "zh-CN": {
    "运行在线": "运行正常",
    "运行离线": "运行离线",
    "运行状态": "运行状态",
    "任务标题": "任务标题",
    "任务说明": "任务说明",
    "服务提供方": "模型服务",
  },
  ja: {
    "ランタイム状態": "ランタイムの状態",
    "タスク标题": "タスク名",
    "プロバイダー": "プロバイダー",
  },
};
