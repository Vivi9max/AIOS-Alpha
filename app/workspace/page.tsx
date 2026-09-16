"use client";

import ChatPanel from "@/components/chat/ChatPanel";
import FeedbackButton from "@/components/alpha/FeedbackButton";
import WorkspaceShell from "@/components/layout/WorkspaceShell";

export default function WorkspacePage() {
  return (
    <WorkspaceShell>
      <main
        style={{
          width: "100%",
          maxWidth: 980,
          margin: "0 auto",
          padding:
            "8px 8px 32px",
          boxSizing:
            "border-box",
        }}
      >
        <ChatPanel />

        <div
          id="feedback"
          style={{
            marginTop: 10,
            textAlign:
              "center",
            opacity: 0.7,
          }}
        >
          <FeedbackButton />
        </div>
      </main>
    </WorkspaceShell>
  );
}
