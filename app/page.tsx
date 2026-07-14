import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import ChatPanel from "@/components/chat/ChatPanel";

export default function Home() {
  return (
    <main className="h-screen flex bg-gray-100 overflow-hidden">

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <section className="flex flex-1 flex-col">

        <Header />

        <div className="flex-1 overflow-hidden p-4">
          <ChatPanel />
        </div>

      </section>

    </main>
  );
}