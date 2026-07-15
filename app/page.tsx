import ChatPanel from "@/components/chat/ChatPanel";
import WorkspaceShell from "@/components/layout/WorkspaceShell";

export default function Home() {
  return (
    <WorkspaceShell>
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          margin: "0 auto",
          minHeight: "calc(100vh - 160px)",
        }}
      >
        <ChatPanel />
      </div>
    </WorkspaceShell>
  );
}