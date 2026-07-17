import ChatPanel from "@/components/chat/ChatPanel";
import InviteBanner from "@/components/alpha/InviteBanner";
import FeedbackButton from "@/components/alpha/FeedbackButton";
import WorkspaceShell from "@/components/layout/WorkspaceShell";

export default function WorkspacePage() {
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

        <ChatPanel />

        <FeedbackButton />
      </main>
    </WorkspaceShell>
  );
}