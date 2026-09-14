import type { Locale } from "@/lib/i18n";

export interface CanvasCopy {
  placeholder: string;
  run: string;
  running: string;
  runtimeUnavailable: string;
  brain: string;
}

export const canvasCopy: Record<
  Locale,
  CanvasCopy
> = {
  en: {
    placeholder:
      "What do you want to move forward today?",
    run: "▶ Run AIOS",
    running:
      "AIOS is running…",
    runtimeUnavailable:
      "AIOS Runtime is temporarily unavailable.",
    brain: "AIOS Brain",
  },

  "zh-CN": {
    placeholder:
      "今天，你想推进什么？",
    run: "▶ 运行 AIOS",
    running:
      "AIOS 正在运行…",
    runtimeUnavailable:
      "AIOS Runtime 暂时不可用。",
    brain: "AIOS Brain",
  },

  ja: {
    placeholder:
      "今日は何を前に進めたいですか？",
    run: "▶ AIOS を実行",
    running:
      "AIOS を実行しています…",
    runtimeUnavailable:
      "AIOS Runtime は一時的に利用できません。",
    brain: "AIOS Brain",
  },
};
