export const supportedLocales = ["en", "zh-CN", "ja"] as const;

export type Locale = (typeof supportedLocales)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_STORAGE_KEY = "aios-alpha-locale";

export const localeNames: Record<Locale, string> = {
  en: "English",
  "zh-CN": "简体中文",
  ja: "日本語",
};

const messages = {
  en: {
    "nav.chat": "Chat",
    "nav.memory": "Memory",
    "nav.tasks": "Tasks",
    "nav.projects": "Projects",
    "nav.dashboard": "Dashboard",
    "nav.settings": "Settings",
    "nav.handoff": "Handoff",
    "nav.allProjects": "All",
    "nav.open": "Open navigation menu",
    "nav.close": "Close navigation menu",
    "page.workspace": "Chat Workspace",
    "page.runtime": "AIOS Runtime",
    "page.release": "Release",
    "page.default": "AIOS Workspace",
    "runtime.online": "Runtime Online",
    "runtime.offline": "Runtime Offline",
    "runtime.provider": "Provider",
    "language.label": "Language",
    "handoff.eyebrow": "CONTINUITY CAPSULE",
    "handoff.title": "Independent Development Handoff",
    "handoff.description": "Everything another developer or AI needs to resume AIOS Alpha from the repository itself.",
    "handoff.checkpoint": "CURRENT CHECKPOINT",
    "handoff.next": "Next priority",
    "handoff.readFirst": "Read first",
    "handoff.verify": "Run and verify",
    "handoff.capabilities": "Working capabilities",
    "handoff.loading": "Loading handoff snapshot…",
    "handoff.error": "The handoff snapshot could not be loaded.",
  },
  "zh-CN": {
    "nav.chat": "对话",
    "nav.memory": "记忆",
    "nav.tasks": "任务",
    "nav.projects": "项目",
    "nav.dashboard": "控制台",
    "nav.settings": "设置",
    "nav.handoff": "接续开发",
    "nav.allProjects": "全部",
    "nav.open": "打开导航菜单",
    "nav.close": "关闭导航菜单",
    "page.workspace": "对话工作区",
    "page.runtime": "AIOS 运行中心",
    "page.release": "发布中心",
    "page.default": "AIOS 工作区",
    "runtime.online": "运行正常",
    "runtime.offline": "运行离线",
    "runtime.provider": "模型服务",
    "language.label": "语言",
    "handoff.eyebrow": "持续开发胶囊",
    "handoff.title": "独立开发交接中心",
    "handoff.description": "让其他开发者或 AI 仅凭仓库即可继续推进 AIOS Alpha。",
    "handoff.checkpoint": "当前检查点",
    "handoff.next": "下一优先事项",
    "handoff.readFirst": "首先读取",
    "handoff.verify": "运行与验证",
    "handoff.capabilities": "已运行能力",
    "handoff.loading": "正在读取交接状态…",
    "handoff.error": "无法读取交接状态。",
  },
  ja: {
    "nav.chat": "チャット",
    "nav.memory": "メモリー",
    "nav.tasks": "タスク",
    "nav.projects": "プロジェクト",
    "nav.dashboard": "ダッシュボード",
    "nav.settings": "設定",
    "nav.handoff": "開発引継ぎ",
    "nav.allProjects": "すべて",
    "nav.open": "ナビゲーションを開く",
    "nav.close": "ナビゲーションを閉じる",
    "page.workspace": "チャットワークスペース",
    "page.runtime": "AIOS ランタイム",
    "page.release": "リリース",
    "page.default": "AIOS ワークスペース",
    "runtime.online": "ランタイム稼働中",
    "runtime.offline": "ランタイム停止中",
    "runtime.provider": "プロバイダー",
    "language.label": "言語",
    "handoff.eyebrow": "継続開発カプセル",
    "handoff.title": "独立開発引継ぎセンター",
    "handoff.description": "リポジトリだけで、別の開発者や AI が AIOS Alpha の開発を再開できます。",
    "handoff.checkpoint": "現在のチェックポイント",
    "handoff.next": "次の優先事項",
    "handoff.readFirst": "最初に読む",
    "handoff.verify": "実行と検証",
    "handoff.capabilities": "稼働中の機能",
    "handoff.loading": "引継ぎ情報を読み込み中…",
    "handoff.error": "引継ぎ情報を読み込めませんでした。",
  },
} as const;

export type MessageKey = keyof (typeof messages)["en"];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && supportedLocales.includes(value as Locale);
}

export function detectLocale(language?: string): Locale {
  const value = language?.toLowerCase() ?? "";
  if (value.startsWith("zh")) return "zh-CN";
  if (value.startsWith("ja")) return "ja";
  return DEFAULT_LOCALE;
}

export function translate(locale: Locale, key: MessageKey): string {
  return messages[locale][key] ?? messages[DEFAULT_LOCALE][key];
}
