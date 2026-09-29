"use client";

import ChatPanel from "@/components/chat/ChatPanel";
import FeedbackButton from "@/components/alpha/FeedbackButton";
import WorkspaceShell from "@/components/layout/WorkspaceShell";

export default function WorkspacePage() {
  return (
    <WorkspaceShell>
      <main
        className="aios-global-page"
        style={{
          width: "100%",
          minHeight: "calc(100vh - 72px)",
          boxSizing: "border-box",
          padding: "18px 16px 34px",
          background:
            "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 1180,
            margin: "0 auto",
          }}
        >
          <section
            style={{
              width: "100%",
              borderRadius: 24,
              overflow: "hidden",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              boxShadow:
                "0 18px 55px rgba(15, 23, 42, 0.07)",
            }}
          >
            <ChatPanel />
          </section>

          <div
            id="feedback"
            style={{
              display: "flex",
              justifyContent: "center",
              paddingTop: 12,
              opacity: 0.62,
            }}
          >
            <FeedbackButton />
          </div>
        </div>

        <style jsx global>{`
          .aios-global-page textarea {
            border-color: #dbe2ea !important;
          }

          .aios-global-page textarea:focus {
            border-color: #94a3b8 !important;
            box-shadow:
              0 0 0 3px rgba(148, 163, 184, 0.12) !important;
          }

          .aios-global-page button {
            -webkit-tap-highlight-color: transparent;
          }

          .aios-global-page section > header
            > div:first-child
            > div:last-child {
            display: none !important;
          }

          .aios-global-page section > header
            > div:nth-child(2) {
            display: none !important;
          }

          @media (max-width: 700px) {
            .aios-global-page {
              padding: 10px 8px 24px !important;
            }

            .aios-global-page section {
              border-radius: 20px !important;
            }
          }
        `}</style>
      </main>
    </WorkspaceShell>
  );
}
