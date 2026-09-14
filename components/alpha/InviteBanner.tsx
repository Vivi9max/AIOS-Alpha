"use client";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

import {
  inviteBannerCopy,
} from "@/lib/i18n/invite-banner";

import type {
  InviteBannerCopy,
} from "@/lib/i18n/invite-banner";

function InviteBannerContent({
  copy,
}: {
  copy: InviteBannerCopy;
}) {
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

export default function InviteBanner() {
  const { locale } =
    useLanguage();

  const copy =
    inviteBannerCopy[locale];

  return (
    <InviteBannerContent
      key={locale}
      copy={copy}
    />
  );
}
