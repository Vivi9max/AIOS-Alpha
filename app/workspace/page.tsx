"use client";

import ChatPanel from "@/components/chat/ChatPanel";
import InviteBanner from "@/components/alpha/InviteBanner";
import FeedbackButton from "@/components/alpha/FeedbackButton";
import WorkspaceOverview from "@/components/workspace/WorkspaceOverview";
import WorkspaceShell from "@/components/layout/WorkspaceShell";
import { useLanguage } from "@/components/i18n/LanguageProvider";

export default function WorkspacePage() {
  const { t } = useLanguage();
  return (
    <WorkspaceShell>
      <main
        style={{
          width:
            "100%",

          maxWidth:
            960,

          margin:
            "0 auto",

          padding:
            "20px",

          boxSizing:
            "border-box",
        }}
      >
        <div
          style={{
            marginBottom:
              18,
          }}
        >
          <InviteBanner />
        </div>

        <WorkspaceOverview />

        <section
          id="aios-chat"
          style={{
            marginTop:
              22,
          }}
        >
          <div
            style={{
              marginBottom:
                10,
            }}
          >
            <h2
              style={{
                margin:
                  0,

                color:
                  "#0f172a",

                fontSize:
                  18,
              }}
            >
              {t("workspace.chatTitle")}
            </h2>

            <p
              style={{
                margin:
                  "5px 0 0",

                color:
                  "#64748b",

                fontSize:
                  13,
              }}
            >
              {t("workspace.chatDescription")}
            </p>
          </div>

          <ChatPanel />
        </section>

        <div
          id="feedback"
        >
          <FeedbackButton />
        </div>
      </main>
    </WorkspaceShell>
  );
}
