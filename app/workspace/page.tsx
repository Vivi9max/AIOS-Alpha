import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MainContent from "@/components/layout/MainContent";
import ChatPanel from "@/components/chat/ChatPanel";

export default function WorkspacePage() {
  return (
    <main
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header />

      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
        }}
      >
        <Sidebar />

        <MainContent>
          <ChatPanel />
        </MainContent>
      </div>
    </main>
  );
}