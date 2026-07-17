import ChatPanel from "@/components/chat/ChatPanel";
import InviteBanner from "@/components/alpha/InviteBanner";
import FeedbackButton from "@/components/alpha/FeedbackButton";
import WorkspaceOverview from "@/components/workspace/WorkspaceOverview";
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
              AIOS 对话
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
              输入目标、问题或要执行的操作。
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