import type { Locale } from "@/lib/i18n";

export interface RuntimeStatusCopy {
  checking: string;
  online: string;
  degraded: string;
  offline: string;
  provider: string;
  unavailable: string;
}

export const runtimeStatusCopy: Record<
  Locale,
  RuntimeStatusCopy
> = {
  en: {
    checking: "Checking…",
    online: "Runtime Online",
    degraded: "Degraded",
    offline: "Runtime Offline",
    provider: "Provider",
    unavailable: "Runtime unavailable.",
  },

  "zh-CN": {
    checking: "检查中……",
    online: "运行正常",
    degraded: "运行降级",
    offline: "运行离线",
    provider: "模型服务",
    unavailable: "运行时暂时不可用。",
  },

  ja: {
    checking: "確認中…",
    online: "ランタイム稼働中",
    degraded: "一部機能低下",
    offline: "ランタイム停止中",
    provider: "モデルプロバイダー",
    unavailable: "ランタイムを利用できません。",
  },
};
