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
  },
  "zh-CN": {
    "nav.chat": "对话",
    "nav.memory": "记忆",
    "nav.tasks": "任务",
    "nav.projects": "项目",
    "nav.dashboard": "控制台",
    "nav.settings": "设置",
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
  },
  ja: {
    "nav.chat": "チャット",
    "nav.memory": "メモリー",
    "nav.tasks": "タスク",
    "nav.projects": "プロジェクト",
    "nav.dashboard": "ダッシュボード",
    "nav.settings": "設定",
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
