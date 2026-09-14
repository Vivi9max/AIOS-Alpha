import type { Locale } from "@/lib/i18n";

export interface InviteBannerCopy {
  title: string;
  description: string;
}

export const inviteBannerCopy: Record<
  Locale,
  InviteBannerCopy
> = {
  en: {
    title: "Welcome to AIOS Alpha",
    description:
      "You’re using the first closed Alpha release of AIOS. Your tasks, memory and profile are stored separately in your workspace.",
  },

  "zh-CN": {
    title: "欢迎来到 AIOS Alpha",
    description:
      "你正在使用 AIOS 首个封闭 Alpha 版本。你的任务、记忆和个人资料都会独立存储在你的工作区中。",
  },

  ja: {
    title: "AIOS Alpha へようこそ",
    description:
      "AIOS の初回クローズド Alpha 版をご利用いただいています。タスク、メモリー、プロフィールはワークスペースごとに分けて保存されます。",
  },
};
