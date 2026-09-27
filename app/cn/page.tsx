import AIOSCNChatPanel from "@/components/chat/AIOSCNChatPanel";
import WorkspaceShell from "@/components/layout/WorkspaceShell";

export const dynamic =
  "force-dynamic";

export default function CNPage() {
  return (
    <WorkspaceShell>
      <main
        style={{
          width:
            "100%",
          maxWidth:
            980,
          margin:
            "0 auto",
          padding:
            "8px 8px 32px",
          boxSizing:
            "border-box",
        }}
      >
        <AIOSCNChatPanel />
      </main>
    </WorkspaceShell>
  );
}
