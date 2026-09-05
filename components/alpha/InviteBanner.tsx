"use client";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

import type {
  Locale,
} from "@/lib/i18n";

type InviteBannerCopy = {
  title: string;
  description: string;
};

const inviteBannerCopy: Record<
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

export default function InviteBanner() {
  const {
    locale,
  } = useLanguage();

  const copy =
    inviteBannerCopy[locale];

  return (
    <section
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "14px 16px",
        borderRadius: 14,
        background:
          "linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)",
        border:
          "1px solid #bfdbfe",
        boxShadow:
          "0 8px 24px rgba(37, 99, 235, 0.06)",
      }}
      aria-label={copy.title}
    >
      <div
        style={{
          flexShrink: 0,
          width: 38,
          height: 38,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 12,
          background: "#dbeafe",
          fontSize: 20,
        }}
        aria-hidden="true"
      >
        🚀
      </div>

      <div>
        <div
          style={{
            color: "#0f172a",
            fontSize: 15,
            fontWeight: 800,
          }}
        >
          {copy.title}
        </div>

        <div
          style={{
            marginTop: 4,
            color: "#475569",
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          {copy.description}
        </div>
      </div>
    </section>
  );
}
