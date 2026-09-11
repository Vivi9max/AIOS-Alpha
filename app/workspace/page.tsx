"use client";

import ChatPanel from "@/components/chat/ChatPanel";
import FeedbackButton from "@/components/alpha/FeedbackButton";
import WorkspaceShell from "@/components/layout/WorkspaceShell";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

export default function WorkspacePage() {
  const { t } = useLanguage();

  return (
    <WorkspaceShell>
      <main
        style={{
          width: "100%",
          maxWidth: 920,
          margin: "0 auto",
          padding: "16px",
          boxSizing: "border-box",
        }}
      >
        <section
          style={{
            marginBottom: 16,
            padding: "18px 4px 4px",
          }}
        >
          <h1
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: 26,
              lineHeight: 1.25,
              fontWeight: 800,
            }}
          >
            AIOS
          </h1>

          <p
            style={{
              margin: "7px 0 0",
              color: "#64748b",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {t("workspace.chatDescription")}
          </p>
        </section>

        <section id="aios-chat">
          <ChatPanel />
        </section>

        <div
          id="feedback"
          style={{
            marginTop: 14,
          }}
        >
          <FeedbackButton />
        </div>
      </main>
    </WorkspaceShell>
  );
}
